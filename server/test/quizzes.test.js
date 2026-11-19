import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { GROUPS, QUIZZES } from '../src/config/quizzes.js';
import { DIMENSIONS, STATEMENTS, TRAITS, statementByKey } from '../src/content/statements.js';
import { SEED_QUESTIONS } from '../src/seed/questions.js';
import { buildLayout, isAnswerable } from '../src/services/layout.js';
import { digitTask, wordTask } from '../src/services/memory.js';
import { indexBank } from '../src/services/questionBank.js';

const bank = indexBank(SEED_QUESTIONS.map((q) => ({ ...q, _id: new Types.ObjectId() })));
const quiz = (id) => QUIZZES.find((q) => q.id === id);
const count = (steps, test) => steps.filter(test).length;

describe('statements', () => {
  it('have unique keys and readable lengths', () => {
    expect(new Set(STATEMENTS.map((s) => s.key)).size).toBe(STATEMENTS.length);
    for (const s of STATEMENTS) {
      expect(s.text.length, s.key).toBeGreaterThan(10);
      expect(s.text.length, s.key).toBeLessThanOrEqual(200);
    }
  });

  it('agree/disagree statements belong to a known trait and facet', () => {
    for (const s of STATEMENTS.filter((x) => x.kind === 'likert' && x.set !== 'self')) {
      expect(TRAITS[s.set]?.facets[s.facet], s.key).toBeDefined();
    }
  });

  it('every facet has a statement worded each way round', () => {
    for (const [trait, { facets }] of Object.entries(TRAITS)) {
      for (const facet of Object.keys(facets)) {
        const own = STATEMENTS.filter((s) => s.set === trait && s.facet === facet);
        expect(own.some((s) => s.reverse), `${trait}/${facet}`).toBe(true);
        expect(own.some((s) => !s.reverse), `${trait}/${facet}`).toBe(true);
      }
    }
  });

  it('style statements offer exactly the options of their dimension', () => {
    for (const s of STATEMENTS.filter((x) => x.kind === 'choice')) {
      expect(s.options.map((o) => o.id).sort(), s.key).toEqual(Object.keys(DIMENSIONS[s.set].options).sort());
    }
  });
});

describe('quiz catalogue', () => {
  it('has unique ids in known groups', () => {
    expect(new Set(QUIZZES.map((q) => q.id)).size).toBe(QUIZZES.length);
    const groups = new Set(['general', ...GROUPS.map((g) => g.id)]);
    for (const q of QUIZZES) expect(groups.has(q.group), q.id).toBe(true);
  });

  it('only asks for statements that exist', () => {
    for (const q of QUIZZES) {
      for (const key of q.selfView ?? []) expect(statementByKey(key)?.set, `${q.id}: ${key}`).toBe('self');
      for (const [set, wanted] of Object.entries(q.statements ?? {})) {
        expect(count(STATEMENTS, (s) => s.set === set), `${q.id}: ${set}`).toBeGreaterThanOrEqual(wanted);
      }
      for (const id of q.dimensions ?? []) expect(DIMENSIONS[id], `${q.id}: ${id}`).toBeDefined();
      if (q.trait) expect(TRAITS[q.trait], q.id).toBeDefined();
    }
  });

  it('can be filled completely from the seed bank', () => {
    for (const q of QUIZZES) {
      for (const [category, wanted] of Object.entries(q.questions ?? {})) {
        expect(bank.byCategory.get(category)?.length ?? 0, `${q.id}: ${category}`).toBeGreaterThanOrEqual(wanted);
      }
    }
  });
});

describe('quiz layout', () => {
  // Layouts are random, so check each rule over many of them.
  const layouts = QUIZZES.flatMap((q) => Array.from({ length: 25 }, () => [q, buildLayout(q, bank)]));

  it('the general quiz has 47 questions and three in-between screens', () => {
    const steps = buildLayout(quiz('general'), bank);
    expect(count(steps, isAnswerable)).toBe(47);
    expect(steps.filter((s) => s.kind === 'info').map((s) => s.variant)).toEqual(['speed', 'profile', 'progress']);
    expect(count(steps, (s) => s.kind === 'recall')).toBe(5);
  });

  it('opens with the self-rating, unless a starting level is given', () => {
    for (const [q, steps] of layouts) {
      const keys = q.selfView ?? [];
      expect(steps.slice(0, keys.length).map((s) => s.ref)).toEqual(keys);
    }
    const steps = buildLayout(quiz('strategy'), bank, { level: 3 });
    expect(steps.some((s) => statementByKey(s.ref)?.set === 'self')).toBe(false);
    expect(count(steps, (s) => s.kind === 'question')).toBe(10);
  });

  it('never repeats a statement', () => {
    for (const [q, steps] of layouts) {
      const refs = steps.flatMap((s) => s.ref ?? []);
      expect(new Set(refs).size, q.id).toBe(refs.length);
    }
  });

  it('links every memory task to its question, which comes later', () => {
    for (const [q, steps] of layouts) {
      steps.forEach((step, i) => {
        if (step.kind !== 'memorize') return;
        const recall = steps[step.pair];
        expect(recall?.kind, q.id).toBe('recall');
        expect(recall.pair, q.id).toBe(i);
        expect(recall.variant, q.id).toBe(step.variant);
        expect(step.pair, q.id).toBeGreaterThan(i);
      });
      expect(count(steps, (s) => s.kind === 'memorize')).toBe(count(steps, (s) => s.kind === 'recall'));
    }
  });

  it('keeps a number sequence and its question free of other memory tasks and screens', () => {
    for (const [q, steps] of layouts) {
      steps.forEach((step, i) => {
        if (step.kind !== 'memorize' || step.variant !== 'digits') return;
        const between = steps.slice(i + 1, step.pair);
        expect(between.length, q.id).toBeLessThanOrEqual(q.digits.gap);
        for (const s of between) expect(['question', 'statement'], q.id).toContain(s.kind);
      });
    }
  });

  it('asks for a word well after showing it', () => {
    for (const [q, steps] of layouts) {
      steps.forEach((step, i) => {
        if (step.kind !== 'memorize' || step.variant !== 'word') return;
        expect(count(steps.slice(i, step.pair), isAnswerable), q.id).toBeGreaterThanOrEqual(6);
      });
    }
  });

  it('never puts an in-between screen first, last, or next to another', () => {
    for (const [q, steps] of layouts) {
      expect(steps[0].kind, q.id).not.toBe('info');
      expect(steps.at(-1).kind, q.id).not.toBe('info');
      steps.forEach((step, i) => {
        if (step.kind === 'info') expect(steps[i + 1].kind, q.id).not.toBe('info');
      });
      expect(count(steps, (s) => s.kind === 'info'), q.id).toBe(q.info.length);
    }
  });

  it('mixes the general quiz instead of running it in blocks', () => {
    for (const [q, steps] of layouts.filter(([x]) => x.id === 'general')) {
      const kinds = steps.slice(q.selfView.length).filter(isAnswerable).map((s) => s.category ?? s.kind);
      let run = 1;
      let longest = 1;
      for (let i = 1; i < kinds.length; i++) {
        run = kinds[i] === kinds[i - 1] ? run + 1 : 1;
        longest = Math.max(longest, run);
      }
      expect(longest).toBeLessThanOrEqual(5);
    }
  });
});

describe('memory tasks', () => {
  it('give one right answer among different options, at every level', () => {
    for (let round = 0; round < 40; round++) {
      for (const level of [1, 2, 3, 4, 5]) {
        const { show, ask } = digitTask(level);
        expect(new Set(show.digits).size).toBe(show.digits.length);
        expect(show.digits.length).toBe(level + 3);
        expect(new Set(ask.options).size).toBe(ask.options.length);
        expect(ask.options.length).toBeGreaterThanOrEqual(4);
        expect(ask.answer).toBeGreaterThanOrEqual(0);

        const right = ask.options[ask.answer];
        const position = /the (\d)\w\w digit/.exec(ask.text)?.[1];
        if (position) expect(right).toBe(String(show.digits[position - 1]));
        else if (ask.text.includes('reverse')) expect(right).toBe([...show.digits].reverse().join(' '));
        else expect(right).toBe(show.digits.join(' '));
      }
    }
  });

  it('use a different word each time within an attempt', () => {
    const first = wordTask();
    expect(first.ask.options[first.ask.answer]).toBe(first.show.word);
    expect(first.ask.options).toHaveLength(5);
    for (let i = 0; i < 30; i++) {
      expect(wordTask([first.show.word]).ask.options).not.toContain(first.show.word);
    }
  });
});
