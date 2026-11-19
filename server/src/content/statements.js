/**
 * Statements: steps with no right answer.
 *
 *   likert - "Strongly agree ... Strongly disagree". Used for the self-rating
 *            that sets the starting difficulty (set `self`) and for the student
 *            mindset quizzes (set = trait, facet = what is behind it).
 *   choice - "what would you do": each option stands for one style.
 *
 * Mindset statements describe the difficulty, so agreeing means more of it.
 * `reverse` marks the ones worded the other way round; a few per facet stop
 * people from agreeing with everything without reading.
 *
 * Keys are stored on attempts - never rename or reuse one. Delete a statement
 * and in-flight attempts simply leave it out of the result.
 */

export const LIKERT = ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'];

const likert = (set, facet, rows) =>
  rows.map(([key, text, reverse = false]) => ({ key, kind: 'likert', set, facet, text, reverse }));

const choice = (set, rows) =>
  rows.map(([key, text, options]) => ({
    key,
    kind: 'choice',
    set,
    text,
    options: Object.entries(options).map(([id, optionText]) => ({ id, text: optionText })),
  }));

/* ------------------------------------------------------------ self-rating */

const SELF = likert('self', null, [
  ['self-puzzles', 'I enjoy puzzles and brain teasers.'],
  ['self-patterns', 'I usually spot the pattern in a set of numbers or shapes quickly.'],
  ['self-rotate', 'I can picture how an object would look if it were turned around.'],
  ['self-juggle', 'I find it easy to keep several things in my head at once.'],
  ['self-number', 'I can remember a phone number after seeing it once.'],
  ['self-track', 'I rarely lose track of what I was about to do.'],
  ['self-focus', 'I can stay on one task without my mind wandering.'],
  ['self-ahead', 'I usually think a few steps ahead before I act.'],
  ['self-backup', 'I often have a backup plan in case something goes wrong.'],
  ['self-later', "I find it easy to see how today's choices affect things later."],
  ['self-why', 'When something goes wrong, I like to find out exactly why.'],
  ['self-coincidence', 'I can usually tell a real cause from a coincidence.'],
  ['self-source', 'I would rather fix the source of a problem than patch it quickly.'],
]);

/* ------------------------------------------------------------ student mindset */

const CONFIDENCE = [
  ...likert('confidence', 'fear', [
    ['conf-fear-avoid', 'I avoid trying things when I think I might fail.'],
    ['conf-fear-result', 'One bad result makes me feel I am not good enough.'],
    ['conf-fear-learn', 'I can treat a mistake as something to learn from.', true],
  ]),
  ...likert('confidence', 'doubt', [
    ['conf-doubt-prepared', 'I doubt my abilities even when I am well prepared.'],
    ['conf-doubt-luck', 'When I do well, I feel it was mostly luck.'],
    ['conf-doubt-trust', 'I trust myself to handle new challenges.', true],
  ]),
  ...likert('confidence', 'hesitation', [
    ['conf-hes-quiet', 'I stay quiet in class or in groups even when I know the answer.'],
    ['conf-hes-goals', 'I hold back from going after goals that really matter to me.'],
    ['conf-hes-share', 'I am comfortable sharing my ideas with others.', true],
  ]),
  ...likert('confidence', 'comparison', [
    ['conf-comp-capable', 'I often feel that others are more capable than I am.'],
    ['conf-comp-success', 'Seeing others succeed makes me feel worse about myself.'],
    ['conf-comp-own', 'I measure my progress against my own past, not against other people.', true],
  ]),
];

const PROCRASTINATION = [
  ...likert('procrastination', 'starting', [
    ['proc-start-deadline', 'I put off starting tasks until the deadline is close.'],
    ['proc-start-heavy', 'Big tasks feel so heavy that I delay beginning them.'],
    ['proc-start-early', 'I usually start my work well before it is due.', true],
  ]),
  ...likert('procrastination', 'distraction', [
    ['proc-dist-phone', 'I pick up my phone without meaning to while I study.'],
    ['proc-dist-feeds', 'I lose a lot of study time to social media, videos or games.'],
    ['proc-dist-block', 'I can keep distractions away when I need to concentrate.', true],
  ]),
  ...likert('procrastination', 'consistency', [
    ['proc-cons-bursts', 'I study hard for a few days and then stop for a long time.'],
    ['proc-cons-routine', 'I find it hard to stick to a routine for more than a week.'],
    ['proc-cons-schedule', 'I follow my study schedule on most days.', true],
  ]),
  ...likert('procrastination', 'planning', [
    ['proc-plan-aimless', 'I often start studying without deciding what I want to finish.'],
    ['proc-plan-wander', 'My mind wanders after a few minutes of study.'],
    ['proc-plan-steps', 'I break my work into small steps and finish them one by one.', true],
  ]),
];

const STRESS = [
  ...likert('stress', 'exams', [
    ['stress-exam-blank', 'My mind goes blank in exams even when I have prepared.'],
    ['stress-exam-nervous', 'I feel very nervous in the days before a test.'],
    ['stress-exam-calm', 'I stay fairly calm during exams.', true],
  ]),
  ...likert('stress', 'pressure', [
    ['stress-press-disappoint', 'I worry about disappointing my parents or teachers with my marks.'],
    ['stress-press-top', 'I feel that anything less than a top result is a failure.'],
    ['stress-press-fair', 'The expectations placed on me feel fair and manageable.', true],
  ]),
  ...likert('stress', 'burnout', [
    ['stress-burn-tired', 'I feel tired of studying even after I have rested.'],
    ['stress-burn-interest', 'I have lost interest in subjects I used to enjoy.'],
    ['stress-burn-energy', 'I still have energy for hobbies and friends after studying.', true],
  ]),
  ...likert('stress', 'workload', [
    ['stress-load-time', 'I never seem to have enough time to finish my schoolwork.'],
    ['stress-load-sleep', 'My study workload cuts into my sleep.'],
    ['stress-load-keepup', 'I can keep up with my studies without feeling overloaded.', true],
  ]),
];

const CAREER = [
  ...likert('career', 'options', [
    ['career-opt-many', 'So many careers interest me that I cannot choose one.'],
    ['career-opt-change', 'I keep changing my mind about what I want to do.'],
    ['career-opt-narrow', 'I have narrowed my choices down to one or two clear options.', true],
  ]),
  ...likert('career', 'exposure', [
    ['career-exp-daily', 'I do not know what people in most careers actually do each day.'],
    ['career-exp-nobody', 'I have never talked to someone who works in a field I am considering.'],
    ['career-exp-explored', 'I have explored my options through reading, courses or talking to people.', true],
  ]),
  ...likert('career', 'fear', [
    ['career-fear-ruin', 'I am afraid that choosing the wrong career will ruin my future.'],
    ['career-fear-delay', 'I delay career decisions because I fear regretting them.'],
    ['career-fear-switch', 'I believe I can change direction later if my first choice does not work out.', true],
  ]),
  ...likert('career', 'pressure', [
    ['career-press-family', 'My family expects me to follow a career I am not sure about.'],
    ['career-press-safe', 'I feel pushed toward "safe" careers that do not interest me.'],
    ['career-press-support', 'The people around me support the career direction I choose.', true],
  ]),
];

/**
 * Wording of a mindset result. `strength` names the opposite end of the scale
 * for the General quiz profile (low stress is shown as high "Calm").
 * bands: [headline, summary]; facets: [label, tip].
 */
export const TRAITS = {
  confidence: {
    label: 'Confidence',
    strength: 'Confidence',
    bands: {
      low: ['Steady confidence', 'You mostly trust your abilities and can take a setback without losing belief in yourself.'],
      moderate: ['Mixed confidence', 'You believe in yourself in some situations and doubt yourself in others.'],
      high: [
        'Low confidence right now',
        'Self-doubt is getting in the way of things you want to do. This is common, and it changes with practice.',
      ],
    },
    facets: {
      fear: [
        'Fear of failure',
        'Pick one small task this week where failing costs little, and do it. Write down what you learned, whatever the result.',
      ],
      doubt: [
        'Self-doubt',
        'Keep a list of things you have done well and the effort behind each. Read it before a hard task.',
      ],
      hesitation: [
        'Holding back',
        'Set a small target: speak once in each class or meeting. Prepare your first sentence in advance.',
      ],
      comparison: [
        'Comparing yourself with others',
        'Compare this month with your own last month. Cut down the time you spend on feeds that leave you feeling behind.',
      ],
    },
  },
  procrastination: {
    label: 'Procrastination',
    strength: 'Discipline',
    bands: {
      low: ['Strong discipline', 'You usually start on time and keep going.'],
      moderate: ['On and off', 'You get things done, but delay and distraction cost you time.'],
      high: ['Procrastination is costing you', 'Delay and distraction get in the way of your work most weeks.'],
    },
    facets: {
      starting: [
        'Getting started',
        'Commit to five minutes only. Starting is the hard part, and most people carry on once they have begun.',
      ],
      distraction: [
        'Distractions',
        'Put your phone in another room while you study, and close every tab you do not need.',
      ],
      consistency: [
        'Consistency',
        'Fix one short study slot at the same time every day. A small slot you keep beats a big one you skip.',
      ],
      planning: [
        'Planning and focus',
        'Before each session, write down the one thing you will finish. Split anything large into steps of 25 minutes or less.',
      ],
    },
  },
  stress: {
    label: 'Academic stress',
    strength: 'Calm',
    bands: {
      low: ['Low stress', 'Your studies feel manageable right now.'],
      moderate: ['Moderate stress', 'Some parts of your studies are weighing on you.'],
      high: ['High stress', 'Your studies are putting a lot of pressure on you right now.'],
    },
    support:
      'If this has felt heavy for a while, talk to a counsellor, a teacher or someone you trust. You do not have to handle it alone.',
    facets: {
      exams: [
        'Exam anxiety',
        'Practise with a timer under exam conditions. In the exam, begin with a question you can do, and breathe slowly for a minute if your mind goes blank.',
      ],
      pressure: [
        'Pressure and expectations',
        'Talk with your parents or teachers about what is realistic for you. Agree on a goal about effort and progress, not only rank.',
      ],
      burnout: [
        'Burnout',
        'Plan real breaks: sleep, movement and one thing you enjoy each day. Rest is part of studying, not time taken from it.',
      ],
      workload: [
        'Workload and time',
        'List everything that is due, mark what truly matters this week, and ask a teacher for help with what does not fit.',
      ],
    },
  },
  career: {
    label: 'Career confusion',
    strength: 'Career clarity',
    bands: {
      low: ['Clear direction', 'You have a fair idea of where you want to go.'],
      moderate: ['Some confusion', 'You have ideas, but a few things are stopping you from deciding.'],
      high: [
        'Very unsure',
        'Choosing a career feels hard right now. That is normal at this stage, and there are clear next steps.',
      ],
    },
    facets: {
      options: [
        'Too many options',
        'Write down what your top choices have in common. Rank them on two things only: your interest and the daily work.',
      ],
      exposure: [
        'Not enough exposure',
        'Talk to two people who work in a field you are considering, or watch a day-in-the-life video for each option.',
      ],
      fear: [
        'Fear of the wrong choice',
        'Most careers allow a change later. Choose the next step, such as a subject or a course, not the next forty years.',
      ],
      pressure: [
        'Pressure from others',
        'Show your family what you have learned about the path you prefer: the jobs, the pay and the route in. Facts make the talk easier.',
      ],
    },
  },
};

/* ------------------------------------------------------------ styles */

const RISK = choice('risk', [
  [
    'risk-contest',
    'You can enter a contest with a big prize and tough odds, or a smaller one you would probably win.',
    { bold: 'The big one. The chance is worth it.', careful: 'The smaller one. A likely win is better.' },
  ],
  [
    'risk-topic',
    'You are choosing a topic for a project.',
    { bold: 'Something new that might not work.', careful: 'Something I know I can do well.' },
  ],
  [
    'risk-venture',
    'A friend asks you to start a small business alongside your studies.',
    { bold: 'Join in and learn as I go.', careful: 'Wait until I understand the risks.' },
  ],
  [
    'risk-double',
    'In a quiz game you can keep your points or risk them to double.',
    { bold: 'Risk them to double.', careful: 'Keep them.' },
  ],
]);

const PACE = choice('pace', [
  [
    'pace-elective',
    'You must pick an elective and the form closes tomorrow.',
    { quick: 'Choose now from what I already know.', deliberate: 'Spend the evening comparing every option.' },
  ],
  [
    'pace-phone',
    'You are buying a phone.',
    { quick: 'Pick a good one quickly and move on.', deliberate: 'Compare reviews and prices for several days.' },
  ],
  [
    'pace-team',
    'Your team asks which idea to go with.',
    { quick: 'Give my choice straight away.', deliberate: 'Ask for time to think it over.' },
  ],
  [
    'pace-mistake',
    'You find a mistake in your plan the night before a presentation.',
    { quick: 'Decide on a fix at once and get on with it.', deliberate: 'List the possible fixes and weigh them first.' },
  ],
]);

const BASIS = choice('basis', [
  [
    'basis-college',
    'Two colleges accept you. One ranks higher; the other felt right when you visited.',
    { head: 'The one with the better ranking.', heart: 'The one that felt right.' },
  ],
  [
    'basis-subject',
    'You are choosing between two subjects.',
    { head: 'The one with better prospects on paper.', heart: 'The one I enjoy more.' },
  ],
  [
    'basis-advice',
    'A friend asks for your help with a hard choice.',
    { head: 'Help them list the pros and cons.', heart: 'Ask what their gut tells them.' },
  ],
  [
    'basis-teammate',
    'You need to pick a teammate for a project.',
    { head: 'The person with the strongest skills.', heart: 'The person I trust and get along with.' },
  ],
]);

const APPROACH = choice('approach', [
  [
    'app-newapp',
    'A new app you need for class is confusing.',
    {
      experimenter: 'Tap around and try things until it works.',
      researcher: 'Look up a guide or tutorial first.',
      collaborator: 'Ask a classmate who already uses it.',
      planner: 'Go through its features one section at a time.',
    },
  ],
  [
    'app-maths',
    'You get a maths problem unlike any you have seen.',
    {
      experimenter: 'Try different methods and see what happens.',
      researcher: 'Find a similar solved example.',
      collaborator: 'Talk it through with a friend or teacher.',
      planner: 'Split it into smaller parts and solve each one.',
    },
  ],
  [
    'app-behind',
    'Your group project is behind schedule.',
    {
      experimenter: 'Start on whichever task is nearest.',
      researcher: 'Check exactly what is delayed and why.',
      collaborator: 'Call the group together to talk.',
      planner: 'Divide the remaining work again with new dates.',
    },
  ],
  [
    'app-assemble',
    'You have to assemble a model and the instructions are unclear.',
    {
      experimenter: 'Start fitting pieces together.',
      researcher: 'Search for a video of someone building it.',
      collaborator: 'Get someone to help.',
      planner: 'Sort all the pieces and work out the order first.',
    },
  ],
  [
    'app-exam',
    'You have a month to prepare for an important exam.',
    {
      experimenter: 'Begin with practice papers and adjust as I go.',
      researcher: 'Find out how top scorers prepared.',
      collaborator: 'Join a study group.',
      planner: 'Make a week-by-week timetable.',
    },
  ],
  [
    'app-experiment',
    'Your science experiment gives a strange result.',
    {
      experimenter: 'Repeat it with small changes.',
      researcher: 'Read about what could cause it.',
      collaborator: 'Ask my teacher or lab partner.',
      planner: 'Check each step of the procedure in order.',
    },
  ],
  [
    'app-skill',
    'You want to learn a new skill, such as editing videos.',
    {
      experimenter: 'Open the software and start making something.',
      researcher: 'Watch a full beginner course first.',
      collaborator: 'Learn with a friend who knows it.',
      planner: 'Set a small goal for each week.',
    },
  ],
  [
    'app-lost',
    'You are lost in a part of town you do not know.',
    {
      experimenter: 'Walk in the direction that seems right.',
      researcher: 'Check a map.',
      collaborator: 'Ask someone nearby.',
      planner: 'Go back to the last place I recognised.',
    },
  ],
  [
    'app-essay',
    'Your essay feels weak but you are not sure why.',
    {
      experimenter: 'Rewrite parts and see what reads better.',
      researcher: 'Read strong essays to compare.',
      collaborator: 'Ask someone to read it and comment.',
      planner: 'Check structure, argument and language one at a time.',
    },
  ],
  [
    'app-club',
    'A club you run is losing members.',
    {
      experimenter: 'Try a new kind of event next week.',
      researcher: 'Run a short survey to find out why.',
      collaborator: 'Meet the remaining members to discuss it.',
      planner: 'List the possible causes and tackle them in order.',
    },
  ],
]);

/** Wording of a style result. options: [label, what it means, what to watch for]. */
export const DIMENSIONS = {
  risk: {
    label: 'Risk',
    options: {
      bold: ['Bold', 'You will take a chance for a bigger reward.', 'Check the worst case before you commit.'],
      careful: ['Careful', 'You prefer a sure result to a gamble.', 'Some chances are worth taking. Ask what you lose by not trying.'],
    },
  },
  pace: {
    label: 'Pace',
    options: {
      quick: ['Quick', 'You decide fast and adjust later.', 'For choices that are hard to undo, sleep on it once.'],
      deliberate: [
        'Deliberate',
        'You compare your options before deciding.',
        'Set a deadline for deciding, so that comparing does not turn into delay.',
      ],
    },
  },
  basis: {
    label: 'Basis',
    options: {
      head: ['Head-led', 'You rely on facts and reasons.', 'Ask how you would feel living with the choice, not only what the numbers say.'],
      heart: ['Heart-led', 'You rely on feelings and values.', 'Write down the facts as well, and see if they agree with your gut.'],
    },
  },
  approach: {
    label: 'Approach',
    options: {
      experimenter: [
        'Experimenter',
        'You learn by doing. You try something, see what happens and adjust.',
        'When a mistake would be costly, spend a few minutes planning first.',
      ],
      researcher: [
        'Researcher',
        'You look for information before you act.',
        'Set a limit on reading time, then try something.',
      ],
      collaborator: [
        'Collaborator',
        'You solve problems by talking them through with people.',
        'Try the problem alone for ten minutes first. It makes the conversation better.',
      ],
      planner: [
        'Planner',
        'You break a problem into steps and work through them in order.',
        'Leave room to change the plan when something unexpected turns up.',
      ],
    },
  },
};

export const STATEMENTS = [
  ...SELF,
  ...CONFIDENCE,
  ...PROCRASTINATION,
  ...STRESS,
  ...CAREER,
  ...RISK,
  ...PACE,
  ...BASIS,
  ...APPROACH,
];

const BY_KEY = new Map(STATEMENTS.map((s) => [s.key, s]));

export const statementByKey = (key) => BY_KEY.get(key);
