import { CATEGORIES, questionSchema } from '../src/schemas/index.js';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { indexBank, pickQuestion, toPublicQuestion } from '../src/services/questionBank.js';
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

  it('cover every category', () => {
    expect(new Set(SEED_QUESTIONS.map((q) => q.category))).toEqual(new Set(CATEGORIES));
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

  it('picks the question nearest to the current level', () => {
    const bank = indexBank(docs);
    for (const level of [1, 2, 3, 4, 5]) {
      expect(pickQuestion(bank, 'series', level, new Set()).difficulty).toBe(level);
    }
    // No spatial question at level 5: the closest one there is.
    expect(pickQuestion(bank, 'spatial', 5, new Set()).difficulty).toBe(3);
  });

  it('never repeats a question, and stops when the category is used up', () => {
    const bank = indexBank(docs);
    const used = new Set();
    const total = docs.filter((q) => q.category === 'logic').length;
    for (let i = 0; i < total; i++) {
      const q = pickQuestion(bank, 'logic', 3, used);
      expect(q.category).toBe('logic');
      expect(used.has(String(q._id))).toBe(false);
      used.add(String(q._id));
    }
    expect(pickQuestion(bank, 'logic', 3, used)).toBeUndefined();
    expect(pickQuestion(bank, 'no-such-category', 3, new Set())).toBeUndefined();
  });

  it('varies the selection when several questions fit', () => {
    const bank = indexBank(docs);
    const seen = new Set();
    for (let i = 0; i < 60; i++) seen.add(String(pickQuestion(bank, 'series', 2, new Set())._id));
    expect(seen.size).toBe(docs.filter((q) => q.category === 'series' && q.difficulty === 2).length);
  });
});
