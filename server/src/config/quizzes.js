/**
 * The quiz catalogue. Each entry is a recipe; services/layout.js turns it into
 * the list of steps for one attempt.
 *
 *   kind        which result is built (services/results.js):
 *                 general | ability  right/wrong steps -> score + percentile
 *                 style              "what would you do" -> a style description
 *                 mindset            agree/disagree -> level, main driver, tips
 *   selfView    agree/disagree statements asked first; the answers set the
 *               starting difficulty. Only for quizzes with right/wrong steps.
 *   questions   bank questions per category. A category the bank can't fill
 *               gives fewer steps, never an error.
 *   statements  statements per set (content/statements.js), picked at random.
 *   digits      number-sequence memory tasks. `immediate` are asked straight
 *               away; `delayed` have `gap` other steps before the question.
 *   words       words to memorize. `show` / `ask` are positions in the quiz
 *               (0 = start, 1 = end); `ask` is a range, the point is random.
 *               Each word comes with its own look-alikes, so two words can be
 *               in play at once without the questions getting mixed up.
 *   info        in-between screens, placed by share of questions answered.
 *
 * Right/wrong steps are adaptive: two correct answers in a row raise the
 * difficulty, a wrong one lowers it (services/attempts.js).
 */

export const GROUPS = [
  {
    id: 'ability',
    title: 'Thinking skills',
    blurb: 'Right-or-wrong questions. You get a score and a percentile.',
  },
  {
    id: 'style',
    title: 'Your style',
    blurb: 'No wrong answers. You get a description of how you tend to work.',
  },
  {
    id: 'mindset',
    title: 'Student mindset',
    blurb: 'Agree-or-disagree statements. You get a level, what is behind it, and tips.',
  },
];

const mindset = (id, title, blurb) => ({
  id,
  group: 'mindset',
  kind: 'mindset',
  title,
  blurb,
  trait: id,
  statements: { [id]: 12 },
  info: [{ variant: 'progress', at: 0.65 }],
});

export const QUIZZES = [
  {
    id: 'general',
    group: 'general',
    kind: 'general',
    title: 'General quiz',
    blurb: 'Everything in one sitting: reasoning, memory, strategy, your style and your study mindset.',
    scoreLabel: 'Your estimated IQ',
    selfView: ['self-puzzles', 'self-patterns', 'self-rotate', 'self-juggle'],
    questions: { pattern: 2, matrix: 4, spatial: 2, series: 5, logic: 5, strategy: 3, rootcause: 3 },
    statements: {
      confidence: 2,
      procrastination: 2,
      stress: 2,
      career: 2,
      risk: 1,
      pace: 1,
      basis: 1,
      approach: 3,
    },
    digits: { immediate: 2, delayed: 2, gap: 2 },
    words: [{ show: 0, ask: [0.35, 0.8] }],
    info: [
      { variant: 'speed', at: 0.25 },
      { variant: 'profile', at: 0.55 },
      { variant: 'progress', at: 0.88 },
    ],
  },

  {
    id: 'logic',
    group: 'ability',
    kind: 'ability',
    title: 'Logic & Reasoning',
    blurb: 'Patterns, number series, shapes, odd one out and deduction.',
    scoreLabel: 'Your estimated IQ',
    selfView: ['self-puzzles', 'self-patterns', 'self-rotate'],
    questions: { pattern: 2, matrix: 4, spatial: 2, series: 8, logic: 8 },
    info: [{ variant: 'speed', at: 0.5 }],
  },
  {
    id: 'memory',
    group: 'ability',
    kind: 'ability',
    title: 'Memory & Focus',
    blurb: 'Memorize words and number sequences, then recall them, sometimes after other questions.',
    scoreLabel: 'Your memory score',
    selfView: ['self-number', 'self-track', 'self-focus'],
    // The bank questions are what you have to do between seeing a sequence and being asked about it.
    questions: { series: 2, logic: 2 },
    digits: { immediate: 5, delayed: 4, gap: 1 },
    // The two words overlap on purpose: the second is shown before the first is asked about.
    words: [
      { show: 0, ask: [0.6, 0.7] },
      { show: 0.3, ask: [0.92, 1] },
    ],
    info: [{ variant: 'speed', at: 0.5 }],
  },
  {
    id: 'strategy',
    group: 'ability',
    kind: 'ability',
    title: 'Strategic Thinking',
    blurb: 'Planning ahead, weighing short term against long term, and preparing for what could go wrong.',
    scoreLabel: 'Your strategy score',
    selfView: ['self-ahead', 'self-backup', 'self-later'],
    questions: { strategy: 10 },
    info: [{ variant: 'speed', at: 0.5 }],
  },
  {
    id: 'rootcause',
    group: 'ability',
    kind: 'ability',
    title: 'Root Cause Analysis',
    blurb: 'Telling a symptom from its cause, a cause from a coincidence, and a patch from a fix.',
    scoreLabel: 'Your analysis score',
    selfView: ['self-why', 'self-coincidence', 'self-source'],
    questions: { rootcause: 10 },
    info: [{ variant: 'speed', at: 0.5 }],
  },

  {
    id: 'decision',
    group: 'style',
    kind: 'style',
    title: 'Decision-Making Style',
    blurb: 'Bold or careful, quick or deliberate, head or heart.',
    dimensions: ['risk', 'pace', 'basis'],
    statements: { risk: 4, pace: 4, basis: 4 },
    info: [{ variant: 'progress', at: 0.6 }],
  },
  {
    id: 'approach',
    group: 'style',
    kind: 'style',
    title: 'Problem-Solving Style',
    blurb: 'Do you try things out, read up first, ask for help, or break the problem into steps?',
    dimensions: ['approach'],
    statements: { approach: 10 },
    info: [{ variant: 'progress', at: 0.6 }],
  },

  mindset('confidence', 'Confidence & Self-Belief', 'Fear of failure, self-doubt and holding back.'),
  mindset('procrastination', 'Procrastination & Discipline', 'Getting started, distractions, consistency and focus.'),
  mindset('stress', 'Academic Stress', 'Exam anxiety, pressure, burnout and workload.'),
  mindset('career', 'Career Confusion', 'Too many options, too little exposure, fear of a wrong choice, or pressure.'),
];

const BY_ID = new Map(QUIZZES.map((q) => [q.id, q]));

export const quizById = (id) => BY_ID.get(id);
