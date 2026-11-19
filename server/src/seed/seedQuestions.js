import { questionSchema } from '../schemas/index.js';
import { z } from 'zod';
import { QUIZZES } from '../config/quizzes.js';

import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { SEED_QUESTIONS } from './questions.js';

/**
 * Upserts the authored question bank and builds indexes. Idempotent: run it
 * on every deploy. Existing questions keep their answer statistics; questions
 * removed from the source are left alone (retire them explicitly instead).
 */
export async function seedQuestions() {
  const questions = SEED_QUESTIONS.map((q) => {
    const result = questionSchema.safeParse(q);
    if (!result.success) {
      throw new Error(`Seed question "${q.key}" is invalid:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
  });

  const keys = new Set(questions.map((q) => q.key));
  if (keys.size !== questions.length) throw new Error('Seed questions contain duplicate keys.');

  await Promise.all([Question.syncIndexes(), Attempt.syncIndexes()]);

  const outcome = await Question.bulkWrite(
    questions.map(({ key, ...content }) => ({
      updateOne: {
        filter: { key },
        update: {
          $set: content,
          $setOnInsert: { status: 'active', version: 1, stats: { shown: 0, correct: 0 } },
        },
        upsert: true,
      },
    })),
  );
  return { upserted: outcome.upsertedCount, total: questions.length };
}

/** For the seed log: which quizzes ask for more questions of a category than the bank has. */
export function bankCoverage() {
  const have = new Map();
  for (const q of SEED_QUESTIONS) have.set(q.category, (have.get(q.category) ?? 0) + 1);

  const short = QUIZZES.flatMap((quiz) =>
    Object.entries(quiz.questions ?? {})
      .filter(([category, wanted]) => (have.get(category) ?? 0) < wanted)
      .map(([category, wanted]) => `${quiz.id} wants ${wanted} ${category}, bank has ${have.get(category) ?? 0}`),
  );
  return short.length ? `Short of questions: ${short.join('; ')}` : 'Every quiz can be filled';
}
