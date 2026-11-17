import { CATEGORIES } from '../schemas/index.js';
import { BLUEPRINT } from '../config/blueprint.js';
import { env } from '../config/env.js';
import { HttpError, badRequest, conflict, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { hashToken, newToken, shuffle } from '../lib/random.js';
import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { getBank, getQuestionsByIds, selectForAttempt, toPublicQuestion } from './questionBank.js';
import { estimateTheta, iqToPercentile, thetaToIq } from './scoring.js';

export async function startAttempt() {
  const questions = selectForAttempt(await getBank(), BLUEPRINT);
  if (questions.length === 0) {
    throw new HttpError(503, 'bank_empty', 'The test is not available right now.');
  }

  const now = new Date();
  const token = newToken();
  const created = await Attempt.create({
    tokenHash: hashToken(token),
    status: 'in_progress',
    currentIndex: 0,
    items: questions.map((q, i) => ({
      questionId: q._id,
      // Each attempt sees the options in its own random order.
      order: shuffle(q.options.map((o) => o.id)),
      choiceId: null,
      servedAt: i === 0 ? now : null,
      answeredAt: null,
    })),
    startedAt: now,
    expiresAt: new Date(now.getTime() + env.ATTEMPT_MAX_MINUTES * 60_000),
    completedAt: null,
    purgeAt: new Date(now.getTime() + env.ATTEMPT_PURGE_DAYS * 86_400_000),
  });
  return { attempt: created.toObject(), token };
}

export async function buildState(attempt) {
  const total = attempt.items.length;
  const index = Math.min(attempt.currentIndex, total);
  const item = attempt.status === 'in_progress' ? attempt.items[index] : undefined;

  let question = null;
  if (item) {
    const doc = (await getQuestionsByIds([item.questionId])).get(String(item.questionId));
    if (!doc) throw new Error(`attempt ${String(attempt._id)} references a missing question`);
    question = toPublicQuestion(doc, item.order);
  }

  return {
    attemptId: String(attempt._id),
    status: attempt.status,
    index,
    total,
    startedAt: attempt.startedAt.toISOString(),
    serverNow: new Date().toISOString(),
    question,
  };
}

/**
 * Record the answer to the current question and move on.
 *
 * The update is a single atomic compare-and-set on `currentIndex`, so double
 * clicks, retries and parallel tabs can never record two answers for one
 * question or skip ahead - whichever request arrives second gets a 409.
 */
export async function submitAnswer(attempt, index, choice) {
  if (attempt.status !== 'in_progress') {
    throw conflict('attempt_completed', 'This test is already finished.');
  }
  const item = attempt.items[index];
  if (index !== attempt.currentIndex || !item) {
    throw conflict('out_of_sequence', 'That is not the current question.', { index: attempt.currentIndex });
  }
  const choiceId = item.order[choice];
  if (choiceId === undefined) {
    throw badRequest('That answer option does not exist.');
  }

  const now = new Date();
  const set = {
    [`items.${index}.choiceId`]: choiceId,
    [`items.${index}.answeredAt`]: now,
  };
  if (index + 1 < attempt.items.length) {
    set[`items.${index + 1}.servedAt`] = now;
  }

  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress', currentIndex: index },
    { $set: set, $inc: { currentIndex: 1 } },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) {
    throw conflict('out_of_sequence', 'That question was already answered.');
  }

  return updated.currentIndex >= updated.items.length ? finalize(updated) : updated;
}

/** Score a fully answered attempt. Safe to call more than once. */
export async function finalize(attempt) {
  const questions = await getQuestionsByIds(attempt.items.map((i) => i.questionId));

  const responses = [];
  const tally = new Map();
  const statUpdates = [];
  let lastAnswer = attempt.startedAt;

  for (const item of attempt.items) {
    const question = questions.get(String(item.questionId));
    if (!question) continue; // deleted from the bank mid-test; leave it unscored
    const correct = item.choiceId === question.answerId;
    responses.push({ ...question.irt, correct });
    statUpdates.push({ id: question._id, correct });

    const score = tally.get(question.category) ?? { category: question.category, correct: 0, total: 0 };
    score.total++;
    if (correct) score.correct++;
    tally.set(question.category, score);

    if (item.answeredAt && item.answeredAt > lastAnswer) lastAnswer = item.answeredAt;
  }

  const theta = estimateTheta(responses);
  const iq = thetaToIq(theta);
  const result = {
    iq,
    percentile: iqToPercentile(iq),
    theta: Math.round(theta * 1000) / 1000,
    correct: responses.filter((r) => r.correct).length,
    total: responses.length,
    durationMs: lastAnswer.getTime() - attempt.startedAt.getTime(),
    categories: CATEGORIES.flatMap((c) => tally.get(c) ?? []),
  };

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
  Question.bulkWrite(
    statUpdates.map(({ id, correct }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $inc: { 'stats.shown': 1, 'stats.correct': correct ? 1 : 0 } },
      },
    })),
    { ordered: false },
  ).catch((err) => logger.warn({ err }, 'failed to update question stats'));

  return updated;
}

export async function getResult(attempt) {
  let current = attempt;
  // Recover an attempt whose last answer was stored but never scored (crash between the two writes).
  if (current.status === 'in_progress' && current.currentIndex >= current.items.length) {
    current = await finalize(current);
  }
  if (current.status !== 'completed' || !current.result || !current.completedAt) {
    throw conflict('attempt_not_completed', 'Finish the test to see your result.');
  }
  const { iq, percentile, correct, total, durationMs, categories } = current.result;
  return {
    attemptId: String(current._id),
    iq,
    percentile,
    correct,
    total,
    durationMs,
    completedAt: current.completedAt.toISOString(),
    categories: categories.map(({ category, correct: c, total: t }) => ({ category, correct: c, total: t })),
  };
}
