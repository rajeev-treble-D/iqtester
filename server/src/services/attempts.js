import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { quizById } from '../config/quizzes.js';
import { LIKERT, statementByKey } from '../content/statements.js';
import { HttpError, badRequest, conflict, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { hashToken, newToken, shuffle } from '../lib/random.js';
import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { DEFAULT_LEVEL, nextLevel, startLevel } from './difficulty.js';
import { buildLayout, isAnswerable } from './layout.js';
import { digitTask, wordTask } from './memory.js';
import { getBank, getQuestionsByIds, pickQuestion, toPublicQuestion } from './questionBank.js';
import { buildResult, profileAxes, selfRatings } from './results.js';

const text = (value) => ({ kind: 'text', text: value });

const questionIds = (items) => items.flatMap((item) => item.questionId ?? []);

/* ------------------------------------------------------------ serving steps */

/**
 * A working copy of an attempt. Steps are changed here first; `changes()`
 * then gives the one `$set` that stores everything at once.
 */
function draftOf(attempt) {
  const draft = { ...attempt, items: attempt.items.map((item) => ({ ...item })) };
  const touched = new Set();
  return {
    draft,
    touch(index) {
      touched.add(index);
      return draft.items[index];
    },
    changes() {
      const set = { level: draft.level, streak: draft.streak };
      if (draft.speedCheckMs !== undefined) set.speedCheckMs = draft.speedCheckMs;
      for (const index of touched) set[`items.${index}`] = draft.items[index];
      return set;
    },
  };
}

/** Share of earlier test takers who took longer to reach the pace screen, or null while there are too few. */
async function fasterThan(quizId, elapsedMs) {
  // `trusted`: sanitizeFilter is on globally, and these operators are ours.
  const [reached, slower] = await Promise.all([
    Attempt.countDocuments({ quizId, speedCheckMs: mongoose.trusted({ $gte: 0 }) }),
    Attempt.countDocuments({ quizId, speedCheckMs: mongoose.trusted({ $gt: elapsedMs }) }),
  ]);
  if (reached < env.PACE_MIN_SAMPLE) return null;
  return Math.min(99, Math.max(1, Math.round((100 * slower) / reached)));
}

/**
 * Get step `index` ready to be shown: choose the question, generate the
 * memory task, work out what an in-between screen says. Returns false when
 * the step can't be served (the bank has no question left for it).
 */
async function serve(work, index, now) {
  const { draft } = work;
  const step = work.touch(index);

  if (step.kind === 'question') {
    const used = new Set(questionIds(draft.items).map(String));
    const question = pickQuestion(await getBank(), step.category, draft.level, used);
    if (!question) {
      step.skipped = true;
      return false;
    }
    step.questionId = question._id;
    // Each attempt sees the options in its own random order.
    step.order = shuffle(question.options.map((o) => o.id));
  }

  if (step.kind === 'memorize') {
    const usedWords = draft.items.flatMap((item) => item.data?.word ?? []);
    const task = step.variant === 'word' ? wordTask(usedWords) : digitTask(draft.level);
    step.data = task.show;
    work.touch(step.pair).data = task.ask;
  }

  if (step.kind === 'info') {
    if (step.variant === 'speed') {
      const elapsedMs = now.getTime() - draft.startedAt.getTime();
      step.data = { percent: await fasterThan(draft.quizId, elapsedMs) };
      draft.speedCheckMs = elapsedMs;
    } else if (step.variant === 'profile') {
      const questions = await getQuestionsByIds(questionIds(draft.items));
      step.data = { axes: profileAxes(draft.items, questions) };
    } else {
      const count = draft.items.filter(isAnswerable).length;
      const left = draft.items.slice(index).filter(isAnswerable).length;
      step.data = { percent: count ? Math.round((100 * (count - left)) / count) : 0, left };
    }
  }

  step.servedAt = now;
  return true;
}

/** Serve the first step from `from` that can be served; returns its index (= items.length when none is left). */
async function serveNext(work, from, now) {
  let index = from;
  while (index < work.draft.items.length && !(await serve(work, index, now))) index++;
  return index;
}

/* ------------------------------------------------------------ start */

export async function startAttempt({ quizId, level }) {
  const quiz = quizById(quizId);
  if (!quiz) throw notFound('Quiz');

  const now = new Date();
  const work = draftOf({
    quizId,
    level: level ?? DEFAULT_LEVEL,
    streak: 0,
    items: buildLayout(quiz, await getBank(), { level }),
    startedAt: now,
  });
  const currentIndex = await serveNext(work, 0, now);
  if (currentIndex >= work.draft.items.length) {
    throw new HttpError(503, 'bank_empty', 'This quiz is not available right now.');
  }

  const token = newToken();
  const created = await Attempt.create({
    ...work.draft,
    tokenHash: hashToken(token),
    status: 'in_progress',
    currentIndex,
    expiresAt: new Date(now.getTime() + env.ATTEMPT_MAX_MINUTES * 60_000),
    completedAt: null,
    purgeAt: new Date(now.getTime() + env.ATTEMPT_PURGE_DAYS * 86_400_000),
  });
  return { attempt: created.toObject(), token };
}

/* ------------------------------------------------------------ state */

/**
 * The only shape of a step that leaves the server: what to draw, with options
 * in the attempt's own order. No keys, ids, answers or scoring data.
 */
async function toPublicStep(step) {
  switch (step.kind) {
    case 'question': {
      const doc = (await getQuestionsByIds([step.questionId])).get(String(step.questionId));
      if (!doc) throw new Error(`step references missing question ${String(step.questionId)}`);
      return { kind: 'question', ...toPublicQuestion(doc, step.order) };
    }
    case 'statement': {
      const statement = statementByKey(step.ref);
      if (!statement) throw new Error(`step references missing statement "${step.ref}"`);
      if (statement.kind === 'likert') {
        return { kind: 'statement', scale: 'likert', text: statement.text, options: LIKERT.map(text) };
      }
      const byId = new Map(statement.options.map((o) => [o.id, o.text]));
      return { kind: 'statement', scale: 'choice', text: statement.text, options: step.order.map((id) => text(byId.get(id))) };
    }
    case 'memorize': {
      if (step.variant === 'word') return { kind: 'memorize', variant: 'word', word: step.data.word };
      // The sequence is on screen for a fixed time counted from when it was
      // first served, so reloading the page doesn't buy a second look.
      const remainingMs = Math.max(0, step.data.showMs - (Date.now() - step.servedAt.getTime()));
      return {
        kind: 'memorize',
        variant: 'digits',
        digits: remainingMs > 0 ? step.data.digits : null,
        showMs: step.data.showMs,
        remainingMs,
      };
    }
    case 'recall':
      return { kind: 'recall', text: step.data.text, options: step.data.options.map(text) };
    case 'info':
      return { kind: 'info', variant: step.variant, ...step.data };
    default:
      throw new Error(`unknown step kind "${step.kind}"`);
  }
}

export async function buildState(attempt) {
  const total = attempt.items.length;
  const index = Math.min(attempt.currentIndex, total);
  const step = attempt.status === 'in_progress' ? attempt.items[index] : undefined;
  const before = attempt.items.slice(0, index).filter(isAnswerable).length;
  const count = attempt.items.filter(isAnswerable).length;

  return {
    attemptId: String(attempt._id),
    quizId: attempt.quizId,
    status: attempt.status,
    index,
    total,
    // On a memorize or in-between screen this is the question that comes next.
    number: Math.min(before + 1, count),
    count,
    startedAt: attempt.startedAt.toISOString(),
    serverNow: new Date().toISOString(),
    step: step ? await toPublicStep(step) : null,
  };
}

/* ------------------------------------------------------------ answering */

/**
 * Record the answer to the current step (or just "continue" on a memorize or
 * in-between screen), get the next step ready, and move on.
 *
 * Everything is stored in a single atomic compare-and-set on `currentIndex`,
 * so double clicks, retries and parallel tabs can never record two answers for
 * one step or skip ahead - whichever request arrives second gets a 409.
 */
export async function submitAnswer(attempt, index, choice) {
  if (attempt.status !== 'in_progress') {
    throw conflict('attempt_completed', 'This quiz is already finished.');
  }
  if (index !== attempt.currentIndex || !attempt.items[index]) {
    throw conflict('out_of_sequence', 'That is not the current question.', { index: attempt.currentIndex });
  }

  const now = new Date();
  const work = draftOf(attempt);
  const { draft } = work;
  const step = work.touch(index);
  step.answeredAt = now;

  if (isAnswerable(step)) {
    const optionCount =
      step.kind === 'recall'
        ? step.data.options.length
        : (step.order?.length ?? LIKERT.length); // an agree/disagree statement has no order of its own
    if (choice === undefined || choice >= optionCount) {
      throw badRequest('That answer option does not exist.');
    }
    step.choice = choice;

    if (step.kind === 'question') {
      const question = (await getQuestionsByIds([step.questionId])).get(String(step.questionId));
      // Deleted from the bank mid-quiz: leave it unscored.
      step.correct = question ? step.order[choice] === question.answerId : null;
    } else if (step.kind === 'recall') {
      step.correct = choice === step.data.answer;
    }

    if (step.correct !== null) {
      Object.assign(draft, nextLevel(draft, step.correct));
    } else if (statementByKey(step.ref)?.set === 'self') {
      // Still in the self-rating: it decides where the difficulty starts.
      draft.level = startLevel(selfRatings(draft.items));
    }
  }

  const nextIndex = await serveNext(work, index + 1, now);

  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress', currentIndex: index },
    { $set: { ...work.changes(), currentIndex: nextIndex } },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) {
    throw conflict('out_of_sequence', 'That question was already answered.');
  }

  return updated.currentIndex >= updated.items.length ? finalize(updated) : updated;
}

/** Build the result of a fully answered attempt. Safe to call more than once. */
export async function finalize(attempt) {
  const quiz = quizById(attempt.quizId);
  if (!quiz) throw notFound('Quiz');
  const questions = await getQuestionsByIds(questionIds(attempt.items));

  let lastAnswer = attempt.startedAt;
  for (const item of attempt.items) {
    if (item.answeredAt && item.answeredAt > lastAnswer) lastAnswer = item.answeredAt;
  }
  const result = buildResult(quiz, attempt, questions, lastAnswer.getTime() - attempt.startedAt.getTime());

  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress' },
    { $set: { status: 'completed', completedAt: lastAnswer, result }, $unset: { purgeAt: 1 } },
    { returnDocument: 'after' },
  ).lean();

  if (!updated) {
    // Another request finalized it first - return what that one stored.
    const existing = await Attempt.findById(attempt._id).lean();
    if (!existing) throw notFound('Attempt');
    return existing;
  }

  // Per-question counters feed later difficulty calibration. Best effort:
  // a failure here must not cost the test taker their result.
  const statUpdates = attempt.items.filter((item) => item.kind === 'question' && typeof item.correct === 'boolean');
  if (statUpdates.length > 0) {
    Question.bulkWrite(
      statUpdates.map((item) => ({
        updateOne: {
          filter: { _id: item.questionId },
          update: { $inc: { 'stats.shown': 1, 'stats.correct': item.correct ? 1 : 0 } },
        },
      })),
      { ordered: false },
    ).catch((err) => logger.warn({ err }, 'failed to update question stats'));
  }

  return updated;
}

export async function getResult(attempt) {
  let current = attempt;
  // Recover an attempt whose last answer was stored but never scored (crash between the two writes).
  if (current.status === 'in_progress' && current.currentIndex >= current.items.length) {
    current = await finalize(current);
  }
  if (current.status !== 'completed' || !current.result || !current.completedAt) {
    throw conflict('attempt_not_completed', 'Finish the quiz to see your result.');
  }
  // The raw ability estimate stays on the server.
  const { theta: _theta, ...result } = current.result;
  return { attemptId: String(current._id), completedAt: current.completedAt.toISOString(), ...result };
}
