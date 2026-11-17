import { questionSchema } from '../schemas/index.js';
import { z } from 'zod';
import { BLUEPRINT } from '../config/blueprint.js';

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

export function blueprintCoverage() {
  const have = new Map();
  for (const q of SEED_QUESTIONS) {
    const k = `${q.category}:${q.difficulty}`;
    have.set(k, (have.get(k) ?? 0) + 1);
  }
  const need = new Map();
  for (const s of BLUEPRINT) {
    const k = `${s.category}:${s.difficulty}`;
    need.set(k, (need.get(k) ?? 0) + 1);
  }
  let filled = 0;
  for (const [k, n] of need) filled += Math.min(n, have.get(k) ?? 0);
  return `${filled} of ${BLUEPRINT.length} blueprint slots can be filled`;
}
