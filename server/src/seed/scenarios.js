import { textOption as t } from './shapes.js';

/**
 * Scenario questions for the Strategic Thinking and Root Cause Analysis
 * quizzes: a short situation, one question, four options.
 *
 * Same authoring rule as the rest of the bank: exactly one defensible answer.
 * Where a number decides it, the working is in a comment above the item. The
 * first option listed is the correct one (build() in questions.js rotates ids).
 */

const scenario = (category) => (key, difficulty, text, body, answer, wrong) => ({
  key,
  category,
  difficulty,
  prompt: { kind: 'text', text, body },
  options: [t(answer), ...wrong.map(t)],
});

/* ------------------------------------------------------------ strategic thinking */

const strategy = scenario('strategy');

export const STRATEGY = [
  strategy(
    'strategy-revision-plan',
    1,
    'Which plan is the strongest?',
    'You have a test in five days and four chapters to revise.',
    'Revise one chapter a day and keep the last day for practice',
    [
      'Revise everything the night before so it stays fresh',
      'Start with the easiest chapter and see how far you get',
      'Wait until you feel ready to begin',
    ],
  ),
  strategy(
    'strategy-hike-rain',
    1,
    'What is the best way to prepare?',
    'You are going on a day hike. The forecast gives an even chance of rain.',
    'Pack a light raincoat and go',
    [
      'Take nothing extra, since half the time it will stay dry',
      'Cancel, since any chance of rain is too much',
      'Carry a heavy tent in case you have to stay overnight',
    ],
  ),
  strategy(
    'strategy-roof-or-sale',
    2,
    'Which choice is stronger in the long run?',
    'A shop owner has enough savings for one thing: a sale that brings a one-time rush of customers, or repairing a leaking roof that keeps damaging stock.',
    'Repair the roof, because the damage will keep costing money',
    [
      'Run the sale, because money now is certain',
      'Split the savings, so that neither job gets finished',
      'Wait until the roof fails completely',
    ],
  ),
  strategy(
    'strategy-first-step',
    2,
    'What should the team do first?',
    'Your team has four weeks to deliver a project.',
    'Agree on the goal and split the work into tasks with dates',
    [
      'Start building straight away to save time',
      'Design the cover page of the final report',
      'Wait a week to see who is free',
    ],
  ),
  strategy(
    'strategy-backup-hall',
    2,
    'Which backup plan protects the event best against bad weather?',
    'You are organising an outdoor event for 200 people.',
    'Reserve a covered hall nearby that you can switch to',
    ['Print extra posters', 'Order twice as much food', 'Start the event one hour earlier'],
  ),
  // End of round 1: B = 100. Round 2: 200. Round 3: 300, level with A. Round 4: 400, ahead.
  strategy(
    'strategy-upgrade-payback',
    3,
    'From the end of which round is upgrade B ahead of upgrade A?',
    'In a strategy game you can buy one upgrade. Upgrade A gives 300 coins at once. Upgrade B gives 100 coins at the end of every round.',
    'Round 4',
    ['Round 2', 'Round 3', 'It is never ahead'],
  ),
  // 8:00 bus: arrives 8:30, or 8:40 if late; platform by 8:45 at worst. Safe.
  // 8:20 bus: arrives 8:50, or 9:00 if late; platform at 9:05. Not safe.
  strategy(
    'strategy-latest-bus',
    3,
    'Which is the latest bus you can take and be sure of catching the train?',
    'Your train leaves at 9:00. Buses to the station leave at 7:40, 8:00, 8:20 and 8:40 and take 30 minutes, but a bus is sometimes 10 minutes late. From the bus stop you need 5 minutes to reach the platform.',
    'The 8:00 bus',
    ['The 7:40 bus', 'The 8:20 bus', 'The 8:40 bus'],
  ),
  // X: half of 50 = 25 a year on average. Y: 30 every year. Y is ahead by 5.
  strategy(
    'strategy-crop-average',
    3,
    'Over many years, which crop earns more on average?',
    'A farmer can plant one crop. Crop X earns 50 in a normal year and nothing in a dry year. Crop Y earns 30 in any year. One year in two is dry.',
    'Crop Y, by 5 a year',
    ['Crop X, by 20 a year', 'Crop X, by 5 a year', 'They earn the same'],
  ),
  // A (2 days), then B (3) and C (1) side by side until day 5, then D (2): 7 days.
  strategy(
    'strategy-task-order',
    4,
    'What is the shortest time in which everything can be finished?',
    'A project has four tasks. A takes 2 days. B takes 3 days and C takes 1 day; both can only start once A is done. D takes 2 days and can only start once B and C are done. Two people are available, so two tasks can run at the same time.',
    '7 days',
    ['5 days', '6 days', '8 days'],
  ),
  strategy(
    'strategy-sunk-cost',
    4,
    'What is the best decision, and why?',
    'You have spent three months on a project. It needs three more months and should then earn 50. A different project would take the same three months and should earn 80. You can only do one.',
    'Switch: the months already spent are gone either way, so compare only what lies ahead',
    [
      'Continue: otherwise three months of work are wasted',
      'Continue: six months of work must be worth more than three',
      'Switch: a new project is always more motivating',
    ],
  ),
  // Leave the other player a multiple of 4. From 10, take 2 to leave 8.
  strategy(
    'strategy-sticks',
    5,
    'How many sticks should you take first to be sure of winning?',
    'Two players take turns removing 1, 2 or 3 sticks from a pile. Whoever takes the last stick wins. There are 10 sticks and you go first.',
    '2 sticks',
    ['1 stick', '3 sticks', 'No first move makes a win certain'],
  ),
  // Only B can never exceed 50. Averages (A 45, C 41.25, B 45) are a distraction.
  strategy(
    'strategy-route-limit',
    5,
    'Which route should you take?',
    'You must arrive within 50 minutes; being later than that is not acceptable. Route A takes 30 minutes, or 90 in a traffic jam. Route B always takes 45. Route C takes 35, or 60 in a jam. There is a jam on one day in four, and you cannot know in advance.',
    'Route B, the only one that can never break the limit',
    [
      'Route A, the fastest on a normal day',
      'Route C, the lowest average time',
      'A or C, since a jam is unlikely',
    ],
  ),
];

/* ------------------------------------------------------------ root cause analysis */

const rootCause = scenario('rootcause');

export const ROOT_CAUSE = [
  rootCause(
    'rootcause-dry-plant',
    1,
    'What is the most likely cause?',
    'A plant on your desk is wilting. Its soil is dry and hard.',
    'It has not been watered enough',
    ['It has been watered too much', 'Its pot is too large', 'It was moved to the desk last month'],
  ),
  rootCause(
    'rootcause-torch',
    1,
    'What was the cause?',
    'Your torch will not switch on. It worked yesterday. With new batteries it works again.',
    'The old batteries had run out',
    ['The bulb was broken', 'The switch was faulty', 'The torch was too cold'],
  ),
  rootCause(
    'rootcause-wet-floor',
    2,
    'What actually fixes the problem?',
    'The floor near a sink is wet every morning. Someone mops it every day.',
    'Find the leak and repair it',
    ['Mop twice a day', 'Put a mat over the wet patch', 'Use a stronger floor cleaner'],
  ),
  rootCause(
    'rootcause-always-late',
    2,
    'What is the most likely underlying cause?',
    'A student is late for school most days. The reason is different each time: a missed bus, lost shoes, a forgotten bag.',
    'They get ready too late, so any small problem makes them late',
    ['The bus driver leaves early', 'School starts too early for everyone', 'Their shoes are the wrong size'],
  ),
  rootCause(
    'rootcause-ice-cream',
    2,
    'What best explains this?',
    'In one town, ice cream sales and cases of sunburn rise in the same months.',
    'Hot, sunny weather raises both',
    [
      'Eating ice cream causes sunburn',
      'Sunburn makes people buy ice cream',
      'The town counts its sunburn cases wrongly',
    ],
  ),
  rootCause(
    'rootcause-five-whys',
    3,
    'Which fix deals with the root cause?',
    'A delivery van keeps breaking down. The engine overheats because the coolant is low. The coolant is low because a hose leaks. The hose leaks because it was never replaced on time. It was never replaced because nobody keeps a maintenance checklist.',
    'Start a maintenance checklist and follow it',
    [
      'Top up the coolant every morning',
      'Replace the hose and change nothing else',
      'Tell the driver to drive more slowly',
    ],
  ),
  rootCause(
    'rootcause-flat-cake',
    3,
    'What is the best way to find the cause?',
    'Your cake came out flat. You had changed two things from the recipe: a new brand of flour and a lower oven temperature.',
    'Bake again with only one of the two changes undone',
    [
      'Undo both changes and blame the flour',
      'Bake the same way again and hope for a better result',
      'Add more sugar next time',
    ],
  ),
  // Flickers in socket A with either bulb; steady in socket B with either bulb.
  rootCause(
    'rootcause-lamp-socket',
    3,
    'What is causing the flicker?',
    'A lamp flickers. Bulb 1 flickers in socket A and is steady in socket B. Bulb 2 flickers in socket A and is steady in socket B.',
    'Socket A',
    ['Bulb 1', 'Bulb 2', 'Socket B'],
  ),
  rootCause(
    'rootcause-top-ten',
    4,
    'Why does this not show that twelve hours of study causes top results?',
    'A coaching centre advertises: "Our ten top students all studied twelve hours a day."',
    'It says nothing about the students who studied twelve hours and did not reach the top',
    [
      'Twelve hours is too long to measure accurately',
      'Studying has no effect on results',
      'Ten students cannot all study the same number of hours',
    ],
  ),
  rootCause(
    'rootcause-tutors',
    4,
    'What should be checked before deciding that tutors lower scores?',
    'A survey finds that students who have a tutor score lower, on average, than students who do not.',
    'Whether the students who hire tutors were already struggling',
    [
      'Whether tutors teach the wrong syllabus on purpose',
      'Whether the survey asked too many students',
      'Whether tutors charge too much',
    ],
  ),
  rootCause(
    'rootcause-wider-road',
    4,
    'What is the most likely underlying cause?',
    'A city widens a busy road to cut traffic. A year later the jams are as bad as before, and more cars use the road each day than ever.',
    'The faster road drew in extra drivers until it filled up again',
    [
      'The road was built from poor materials',
      'Drivers have become slower',
      'The number of cars in the city has fallen',
    ],
  ),
  // A: 2% of 1,000 = 20 a day. B: 10% of 100 = 10 a day.
  rootCause(
    'rootcause-defects',
    4,
    'Which machine adds more defective parts to the daily total?',
    'Machine A makes 1,000 parts a day, of which 2% are defective. Machine B makes 100 parts a day, of which 10% are defective.',
    'Machine A',
    ['Machine B', 'Both add the same number', 'It cannot be worked out from this'],
  ),
  // Jams only when paper X and a humid day come together.
  rootCause(
    'rootcause-printer',
    5,
    'What causes the jams?',
    'A printer sometimes jams. Records show: paper X on a humid day, jam. Paper X on a dry day, no jam. Paper Y on a humid day, no jam. Paper Y on a dry day, no jam.',
    'Paper X and humidity together; neither alone is enough',
    ['Paper X on its own', 'Humidity on its own', 'Paper Y'],
  ),
  rootCause(
    'rootcause-coach',
    5,
    'What is the more likely explanation?',
    'A coach praises players after their best games and scolds them after their worst. After praise they usually play worse the next time; after a scolding, better. He decides that scolding works and praise does harm.',
    'Very good and very bad games are unusual, so the next one tends to be nearer average whatever he says',
    [
      'Players enjoy being scolded',
      'Praise makes players forget their training',
      'The players swap positions after every game',
    ],
  ),
];
