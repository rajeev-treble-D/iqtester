import { quizById } from '../config/quizzes.js';
import { DIMENSIONS, TRAITS, statementByKey } from '../content/statements.js';
import { AREAS } from '../schemas/index.js';
import { MAX_LEVEL, MIN_LEVEL } from './difficulty.js';
import { estimateTheta, iqToPercentile, normalCdf, thetaToIq } from './scoring.js';

/**
 * Builds the result of a finished attempt. What it contains depends on the
 * quiz kind:
 *
 *   ability  score (IQ scale) + percentile + per-area breakdown
 *   general  the same, plus a profile across thinking skills and mindset,
 *            a style snapshot and which quizzes to take next
 *   style    which option of each dimension was picked most
 *   mindset  how strong the difficulty is, and which facet drives it
 *
 * The wording is stored with the numbers, so a result always reads the way it
 * did when the person first saw it.
 */

const percent = (fraction) => Math.round(fraction * 100);
const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

/* ------------------------------------------------------------ collecting answers */

/** Every answered right/wrong step, with the parameters scoring needs. */
export function scoredResponses(items, questions) {
  const responses = [];
  for (const item of items) {
    if (item.correct === null || item.correct === undefined) continue;
    if (item.kind === 'question') {
      const question = questions.get(String(item.questionId));
      if (question) responses.push({ area: question.category, ...question.irt, correct: item.correct });
    } else if (item.kind === 'recall' && item.data?.irt) {
      responses.push({ area: 'memory', ...item.data.irt, correct: item.correct });
    }
  }
  return responses;
}

/** Answered statements with their content, skipping any that no longer exist. */
function answeredStatements(items) {
  return items.flatMap((item) => {
    if (item.kind !== 'statement' || item.choice === null) return [];
    const statement = statementByKey(item.ref);
    return statement ? [{ item, statement }] : [];
  });
}

/** Agreement with an agree/disagree statement: 0 (strongly disagree) to 4 (strongly agree). */
export const agreement = (item) => 4 - item.choice;

/** Self-rating answers so far, as agreement values. */
export function selfRatings(items) {
  return answeredStatements(items)
    .filter(({ statement }) => statement.set === 'self')
    .map(({ item }) => agreement(item));
}

/**
 * How strongly each mindset difficulty shows, 0-100, overall and per facet.
 * @returns {Map<string, { concern: number, facets: Map<string, number> }>}
 */
export function traitConcerns(items) {
  const byTrait = new Map();
  for (const { item, statement } of answeredStatements(items)) {
    if (statement.kind !== 'likert' || !TRAITS[statement.set]) continue;
    const value = (statement.reverse ? 4 - agreement(item) : agreement(item)) / 4;
    const trait = byTrait.get(statement.set) ?? { all: [], facets: new Map() };
    trait.all.push(value);
    trait.facets.set(statement.facet, [...(trait.facets.get(statement.facet) ?? []), value]);
    byTrait.set(statement.set, trait);
  }
  return new Map(
    [...byTrait].map(([trait, { all, facets }]) => [
      trait,
      { concern: percent(mean(all)), facets: new Map([...facets].map(([f, values]) => [f, percent(mean(values))])) },
    ]),
  );
}

/** How often each option of each style dimension was picked. */
function styleTallies(items) {
  const byDimension = new Map();
  for (const { item, statement } of answeredStatements(items)) {
    if (statement.kind !== 'choice') continue;
    const picked = item.order?.[item.choice];
    if (!picked) continue;
    const tally = byDimension.get(statement.set) ?? new Map();
    tally.set(picked, (tally.get(picked) ?? 0) + 1);
    byDimension.set(statement.set, tally);
  }
  return byDimension;
}

/* ------------------------------------------------------------ ability */

/**
 * Standing in one group of areas, 0-100: the share of people expected to do
 * worse. Uses the same ability estimate as the overall score, so a hard item
 * answered correctly counts for more - plain "percent correct" would say
 * little here, because the quiz keeps adjusting the difficulty to the person.
 */
const standing = (responses) => percent(normalCdf(estimateTheta(responses)));

function abilityPart(items, questions) {
  const responses = scoredResponses(items, questions);
  const theta = estimateTheta(responses);
  const score = thetaToIq(theta);
  return {
    score,
    percentile: iqToPercentile(score),
    theta: Math.round(theta * 1000) / 1000,
    correct: responses.filter((r) => r.correct).length,
    total: responses.length,
    areas: AREAS.flatMap((area) => {
      const own = responses.filter((r) => r.area === area);
      if (own.length === 0) return [];
      return { area, correct: own.filter((r) => r.correct).length, total: own.length, level: standing(own) };
    }),
  };
}

/* ------------------------------------------------------------ general: profile */

const SKILL_AXES = [
  { id: 'reasoning', label: 'Reasoning', areas: ['pattern', 'matrix', 'series', 'spatial', 'logic'], quizId: 'logic' },
  { id: 'memory', label: 'Memory', areas: ['memory'], quizId: 'memory' },
  { id: 'strategy', label: 'Strategy', areas: ['strategy', 'rootcause'], quizId: 'strategy' },
];
const MINDSET_AXES = ['confidence', 'procrastination', 'stress', 'career'];

/**
 * The profile across thinking skills and study mindset, each 0-100 where
 * higher is better. `value` is null for an axis with no answers yet, which is
 * how the mid-quiz profile screen shows what is still to come.
 */
export function profileAxes(items, questions) {
  const responses = scoredResponses(items, questions);
  const concerns = traitConcerns(items);
  return [
    ...SKILL_AXES.map(({ id, label, areas }) => {
      const own = responses.filter((r) => areas.includes(r.area));
      return { id, label, value: own.length ? standing(own) : null };
    }),
    ...MINDSET_AXES.map((trait) => ({
      id: trait,
      label: TRAITS[trait].strength,
      value: concerns.has(trait) ? 100 - concerns.get(trait).concern : null,
    })),
  ];
}

const band = (concern) => (concern < 35 ? 'low' : concern < 65 ? 'moderate' : 'high');

/** Up to three quizzes worth taking next, most useful first. */
function recommendations(profile) {
  const known = profile.filter((axis) => axis.value !== null);
  const lowest = (ids) => known.filter((axis) => ids.includes(axis.id)).sort((a, b) => a.value - b.value)[0];
  const out = [];

  const mindset = lowest(MINDSET_AXES);
  if (mindset && mindset.value <= 50) {
    out.push({
      quizId: mindset.id,
      reason: `Your answers point to ${TRAITS[mindset.id].label.toLowerCase()} as the first thing to look at.`,
    });
  }
  const skill = lowest(SKILL_AXES.map((axis) => axis.id));
  if (skill) {
    out.push({
      quizId: SKILL_AXES.find((axis) => axis.id === skill.id).quizId,
      reason: `${skill.label} was your lowest thinking skill here. The full quiz gives a more reliable reading.`,
    });
  }
  out.push({
    quizId: 'decision',
    reason: 'A few questions only hint at your style. The full quiz gives a clearer picture.',
  });
  return out.flatMap(({ quizId, reason }) => {
    const quiz = quizById(quizId);
    return quiz ? [{ quizId, title: quiz.title, group: quiz.group, reason }] : [];
  });
}

/* ------------------------------------------------------------ style */

function dimensionResult(id, tally = new Map()) {
  const meta = DIMENSIONS[id];
  const total = [...tally.values()].reduce((sum, n) => sum + n, 0);
  const options = Object.entries(meta.options).map(([optionId, [label, text, tip]]) => {
    const count = tally.get(optionId) ?? 0;
    return { id: optionId, label, text, tip, count, share: total ? percent(count / total) : 0 };
  });
  const best = Math.max(...options.map((o) => o.count));
  const leaders = options.filter((o) => o.count === best && best > 0);
  // A tie has no leader: with two options that means "balanced".
  return { id, label: meta.label, total, options, top: leaders.length === 1 ? leaders[0].id : null };
}

function stylePart(quiz, items) {
  const tallies = styleTallies(items);
  const dimensions = quiz.dimensions.map((id) => dimensionResult(id, tallies.get(id)));
  const leanOf = (d) => d.options.find((o) => o.id === d.top);

  if (dimensions.length === 1) {
    // One dimension with several types: name the leading one, or the leading two on a tie.
    const [only] = dimensions;
    const ranked = [...only.options].sort((a, b) => b.count - a.count);
    const lead = leanOf(only);
    return {
      headline: lead ? lead.label : `${ranked[0].label} and ${ranked[1].label}`,
      summary: lead ? lead.text : `You switch between two approaches. ${ranked[0].text} ${ranked[1].text}`,
      dimensions,
    };
  }
  return {
    headline: dimensions.map((d) => leanOf(d)?.label ?? 'Balanced').join(' · '),
    summary: dimensions
      .map((d) => leanOf(d)?.text ?? `On ${d.label.toLowerCase()} you go either way, depending on the situation.`)
      .join(' '),
    dimensions,
  };
}

/* ------------------------------------------------------------ mindset */

function mindsetPart(quiz, items) {
  const meta = TRAITS[quiz.trait];
  const scores = traitConcerns(items).get(quiz.trait) ?? { concern: 0, facets: new Map() };
  const level = band(scores.concern);
  const [headline, summary] = meta.bands[level];
  return {
    trait: quiz.trait,
    label: meta.label,
    concern: scores.concern,
    band: level,
    headline,
    summary,
    facets: Object.entries(meta.facets)
      .map(([id, [label, tip]]) => ({ id, label, tip, concern: scores.facets.get(id) ?? 0 }))
      .sort((a, b) => b.concern - a.concern),
    support: level === 'high' ? (meta.support ?? null) : null,
  };
}

/* ------------------------------------------------------------ putting it together */

export function buildResult(quiz, attempt, questions, durationMs) {
  const base = { kind: quiz.kind, quizId: quiz.id, title: quiz.title, durationMs };
  const { items } = attempt;

  switch (quiz.kind) {
    case 'ability':
      return { ...base, scoreLabel: quiz.scoreLabel, ...abilityPart(items, questions) };

    case 'general': {
      const ability = abilityPart(items, questions);
      const profile = profileAxes(items, questions);
      const concerns = traitConcerns(items);
      const tallies = styleTallies(items);
      return {
        ...base,
        scoreLabel: quiz.scoreLabel,
        ...ability,
        profile,
        mindset: MINDSET_AXES.flatMap((trait) => {
          const scores = concerns.get(trait);
          if (!scores) return [];
          const level = band(scores.concern);
          return { trait, label: TRAITS[trait].label, concern: scores.concern, band: level, headline: TRAITS[trait].bands[level][0] };
        }),
        styles: Object.keys(DIMENSIONS).flatMap((id) => {
          if (!tallies.has(id)) return [];
          const d = dimensionResult(id, tallies.get(id));
          return { id, label: d.label, lean: d.options.find((o) => o.id === d.top)?.label ?? null };
        }),
        recommend: recommendations(profile),
        // Where a later quiz should start (see startLevel in difficulty.js for the cap).
        level: Math.min(MAX_LEVEL - 1, Math.max(MIN_LEVEL, Math.round(ability.theta / 0.9 + 3))),
      };
    }

    case 'style':
      return { ...base, ...stylePart(quiz, items) };

    case 'mindset':
      return { ...base, ...mindsetPart(quiz, items) };

    default:
      throw new Error(`quiz ${quiz.id} has unknown kind "${quiz.kind}"`);
  }
}
