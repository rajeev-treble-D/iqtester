import { STATEMENTS, statementByKey } from '../content/statements.js';
import { cryptoRng, shuffle } from '../lib/random.js';

/** Steps the test taker has to answer (the rest are just "continue"). */
export const isAnswerable = (step) =>
  !step.skipped && (step.kind === 'question' || step.kind === 'statement' || step.kind === 'recall');

const times = (n, make) => Array.from({ length: Math.max(0, n) }, make);

/**
 * Turn a quiz recipe (config/quizzes.js) into the ordered steps of one attempt.
 *
 * The self-rating comes first. Everything else is mixed: each kind of step is
 * spread evenly over the whole quiz with a little randomness, so the quiz never
 * feels like one block after another and no two attempts have the same order.
 *
 * Bank questions are only given a category here. The question itself is
 * chosen when the step is served, at the difficulty reached by then.
 *
 * `level` is a starting difficulty carried over from an earlier General quiz;
 * with it there is nothing to self-rate.
 */
export function buildLayout(quiz, bank, { rng = cryptoRng, level } = {}) {
  const statement = (s) =>
    s.kind === 'choice'
      ? { kind: 'statement', ref: s.key, order: shuffle(s.options.map((o) => o.id), rng) }
      : { kind: 'statement', ref: s.key };

  const intro = level ? [] : (quiz.selfView ?? []).flatMap((key) => statementByKey(key) ?? []).map(statement);

  // A unit is one or more steps that stay together. Units within a group keep their order.
  let memoryId = 0;
  const memory = (variant, delayed = false) => {
    const id = ++memoryId;
    return {
      memory: true,
      delayed,
      steps: [
        { kind: 'memorize', variant, memoryId: id },
        { kind: 'recall', variant, memoryId: id },
      ],
    };
  };

  const groups = [];
  for (const [category, wanted] of Object.entries(quiz.questions ?? {})) {
    const available = bank.byCategory.get(category)?.length ?? 0;
    groups.push(times(Math.min(wanted, available), () => ({ steps: [{ kind: 'question', category }] })));
  }
  for (const [set, wanted] of Object.entries(quiz.statements ?? {})) {
    const picked = shuffle(STATEMENTS.filter((s) => s.set === set), rng).slice(0, wanted);
    groups.push(picked.map((s) => ({ steps: [statement(s)] })));
  }
  groups.push([
    ...times(quiz.digits?.immediate ?? 0, () => memory('digits')),
    ...times(quiz.digits?.delayed ?? 0, () => memory('digits', true)),
  ]);

  const jitter = () => rng(1000) / 1000;
  const units = groups.flatMap((group) => group.map((unit, i) => ({ ...unit, at: (i + jitter()) / group.length })));

  // Words: seen at one point, asked about much later.
  for (const { show, ask } of quiz.words ?? []) {
    const [word, recall] = memory('word').steps;
    units.push({ memory: true, steps: [word], at: show - 0.001 });
    units.push({ memory: true, steps: [recall], at: ask[0] + jitter() * (ask[1] - ask[0]) });
  }
  units.sort((a, b) => a.at - b.at);

  // Delayed recall: pull the next ordinary steps in between seeing and being asked.
  const body = [];
  while (units.length > 0) {
    const unit = units.shift();
    if (!unit.delayed) {
      body.push(...unit.steps);
      continue;
    }
    const between = [];
    for (let i = 0; i < units.length && between.length < (quiz.digits?.gap ?? 2); ) {
      if (units[i].memory) i++;
      else between.push(...units.splice(i, 1)[0].steps);
    }
    body.push(unit.steps[0], ...between, unit.steps[1]);
  }

  const steps = [...intro, ...body];

  // In-between screens, by share of questions answered. Never between a
  // sequence and its question, and never two in a row.
  const count = steps.filter(isAnswerable).length;
  for (const info of [...(quiz.info ?? [])].sort((a, b) => a.at - b.at)) {
    const target = Math.round(info.at * count);
    let answered = 0;
    let open = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (i > 0 && answered >= target && open === 0 && steps[i - 1].kind !== 'info') {
        steps.splice(i, 0, { kind: 'info', variant: info.variant });
        break;
      }
      if (isAnswerable(step)) answered++;
      if (step.variant === 'digits') open += step.kind === 'memorize' ? 1 : -1;
    }
  }

  // Link the two halves of each memory task by their final positions.
  const halves = new Map();
  steps.forEach((step, i) => {
    if (step.memoryId) halves.set(step.memoryId, [...(halves.get(step.memoryId) ?? []), i]);
  });
  return steps.map(({ memoryId, ...step }, i) => ({
    ...step,
    ...(memoryId ? { pair: halves.get(memoryId).find((k) => k !== i) } : {}),
    choice: null,
    correct: null,
    servedAt: null,
    answeredAt: null,
  }));
}
