import { questionSchema } from '../src/schemas/index.js';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { BLUEPRINT } from '../src/config/blueprint.js';

import { selectForAttempt, toPublicQuestion } from '../src/services/questionBank.js';
import { SEED_QUESTIONS } from '../src/seed/questions.js';

const docs = SEED_QUESTIONS.map((q) => ({
  ...q,
  _id: new Types.ObjectId(),
  status: 'active',
  version: 1,
  stats: { shown: 0, correct: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
}));

function bankOf(questions) {
  const bank = { loadedAt: Date.now(), byId: new Map(), bySlot: new Map() };
  for (const q of questions) {
    bank.byId.set(String(q._id), q);
    const key = `${q.category}:${q.difficulty}`;
    bank.bySlot.set(key, [...(bank.bySlot.get(key) ?? []), q]);
  }
  return bank;
}

describe('seed questions', () => {
  it.each(SEED_QUESTIONS.map((q) => [q.key, q]))('%s is valid', (_key, q) => {
    expect(questionSchema.safeParse(q).error).toBeUndefined();
  });

  it('have unique keys', () => {
    expect(new Set(SEED_QUESTIONS.map((q) => q.key)).size).toBe(SEED_QUESTIONS.length);
  });

  it('do not give the correct answer a predictable id', () => {
    expect(new Set(SEED_QUESTIONS.map((q) => q.answerId)).size).toBeGreaterThan(2);
  });

  it('have no two identical options', () => {
    for (const q of SEED_QUESTIONS) {
      const rendered = q.options.map((o) => JSON.stringify(o.content));
      expect(new Set(rendered).size, q.key).toBe(rendered.length);
    }
  });
});

describe('question bank', () => {
  it('never exposes answers or identifiers in the public view', () => {
    for (const q of docs) {
      const order = q.options.map((o) => o.id).reverse();
      const pub = toPublicQuestion(q, order);
      expect(Object.keys(pub).sort()).toEqual(['category', 'options', 'prompt']);
      const wire = JSON.stringify(pub);
      expect(wire).not.toContain('answerId');
      expect(wire).not.toContain(q.key);
      expect(wire).not.toContain(String(q._id));
      expect(wire).not.toContain('"irt"');
      // Options follow the attempt's order, not the stored order.
      expect(pub.options[0]).toEqual(q.options.at(-1)?.content);
    }
  });

  it('fills blueprint slots without repeating a question', () => {
    const picked = selectForAttempt(bankOf(docs), BLUEPRINT);
    expect(picked.length).toBeGreaterThan(0);
    expect(new Set(picked.map((q) => String(q._id))).size).toBe(picked.length);
    const levels = picked.map((q) => q.difficulty);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });

  it('varies the selection when a slot has several candidates', () => {
    const twin = { ...docs[0], _id: new Types.ObjectId(), key: 'twin' };
    const bank = bankOf([docs[0], twin]);
    const slot = [{ category: twin.category, difficulty: twin.difficulty }];
    const seen = new Set();
    for (let i = 0; i < 40; i++) seen.add(String(selectForAttempt(bank, slot)[0]?._id));
    expect(seen.size).toBe(2);
  });
});
