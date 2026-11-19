import {
  blocks,
  circle,
  cutOut,
  dot,
  fig,
  figureOption as f,
  line,
  poly,
  square,
  textOption as t,
  transform,
  tri,
  windowOf,
} from './shapes.js';
import { ROOT_CAUSE, STRATEGY } from './scenarios.js';

/**
 * Starter question bank: original items, at least one per question type and
 * render mode, so the whole flow can be exercised end to end. Number series
 * and logic have about three items per difficulty level; the visual
 * categories are still thin. Scenario questions live in scenarios.js.
 *
 * Authoring rule: every item must have exactly one defensible answer. If a
 * second reading of the rule leads to another option, fix the item.
 */

const LETTERS = 'abcdefgh';

function build({ key, category, difficulty, prompt, options }) {
  // Option ids are rotated by a hash of the key, so "a" isn't always correct
  // and ids stay stable across re-seeds (in-flight attempts reference them).
  const shift = [...key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % options.length;
  const idAt = (i) => LETTERS[(i + shift) % options.length];
  return {
    key,
    category,
    difficulty,
    prompt,
    options: options.map((content, i) => ({ id: idAt(i), content })),
    answerId: idAt(0),
    irt: {
      a: 1.1,
      b: (difficulty - 3) * 0.9,
      c: Math.round((1 / options.length) * 1000) / 1000,
    },
  };
}

/* ------------------------------------------------------------ number series */

const series = (key, difficulty, body, answer, wrong) => ({
  key,
  category: 'series',
  difficulty,
  prompt: { kind: 'text', text: 'Which number replaces the question mark?', body },
  options: [t(answer), ...wrong.map(t)],
});

const SERIES = [
  // +3 each step
  series('series-add-3', 1, '2,  5,  8,  11,  ?,  17', 14, [12, 13, 15, 16]),
  // doubles each step
  series('series-double', 2, '3,  6,  12,  24,  ?,  96', 48, [36, 42, 60, 72]),
  // alternating +3, -2
  series('series-up3-down2', 3, '7,  10,  8,  11,  9,  12,  ?', 10, [8, 11, 13, 14]),
  // gaps double: +1, +2, +4, +8, +16
  series('series-gaps-double', 4, '2,  3,  5,  9,  17,  ?', 33, [25, 31, 34, 35]),
  // n squared times (n + 1)
  series('series-square-times-next', 5, '2,  12,  36,  80,  150,  ?', 252, [210, 232, 245, 294]),

  // +5 each step
  series('series-add-5', 1, '5,  10,  15,  20,  ?,  30', 25, [22, 24, 26, 35]),
  // -2 each step
  series('series-minus-2', 1, '20,  18,  16,  14,  ?,  10', 12, [8, 11, 13, 15]),
  // square numbers
  series('series-squares', 2, '1,  4,  9,  16,  ?,  36', 25, [20, 24, 27, 30]),
  // divided by 3 each step
  series('series-third', 2, '243,  81,  27,  9,  ?', 3, [1, 2, 6, 18]),
  // each number is the sum of the two before it
  series('series-sum-of-two', 3, '2,  3,  5,  8,  13,  ?', 21, [18, 19, 20, 23]),
  // gaps grow by one: +1, +2, +3, +4, +5
  series('series-growing-gaps', 3, '3,  4,  6,  9,  13,  ?', 18, [16, 17, 19, 20]),
  // two series interleaved: 2, 4, 6, 8 and 20, 17, 14, 11
  series('series-interleaved', 4, '2,  20,  4,  17,  6,  14,  8,  ?', 11, [10, 12, 13, 16]),
  // n times (n + 1): gaps of 4, 6, 8, 10, 12
  series('series-n-times-next', 4, '2,  6,  12,  20,  30,  ?', 42, [36, 40, 44, 56]),
  // n to the power n
  series('series-n-to-n', 5, '1,  4,  27,  256,  ?', 3125, [625, 1024, 2500, 3025]),
  // gaps are 1, 3, 7, 15, 31: each gap is double the last, plus one
  series('series-gaps-double-plus-one', 5, '1,  2,  5,  12,  27,  ?', 58, [48, 54, 56, 60]),
];

/* ------------------------------------------------------------ verbal logic */

const logic = (key, difficulty, text, body, answer, wrong) => ({
  key,
  category: 'logic',
  difficulty,
  prompt: body ? { kind: 'text', text, body } : { kind: 'text', text },
  options: [t(answer), ...wrong.map(t)],
});

const LOGIC = [
  logic('logic-analogy-glove', 1, 'Glove is to hand as sock is to ...', undefined, 'Foot', ['Shoe', 'Leg', 'Wool', 'Toe']),
  logic(
    'logic-order-race',
    2,
    'Who finished third?',
    'Mia finished before Leo. Sam finished after Leo. Kai finished after Mia but before Leo.',
    'Leo',
    ['Mia', 'Kai', 'Sam', 'It cannot be known'],
  ),
  logic('logic-odd-material', 2, 'Which one does not belong with the others?', undefined, 'Granite', [
    'Copper',
    'Iron',
    'Silver',
    'Zinc',
  ]),
  logic(
    'logic-syllogism-glims',
    3,
    'Which statement must be true?',
    'All glims are tars. No tars are voxes.',
    'No glims are voxes',
    ['Some glims are voxes', 'All tars are glims', 'Some voxes are tars', 'All voxes are glims'],
  ),

  // the only vegetable among fruits
  logic('logic-odd-vegetable', 1, 'Which one does not belong with the others?', undefined, 'Carrot', [
    'Apple',
    'Banana',
    'Mango',
    'Grape',
  ]),
  logic('logic-analogy-hive', 1, 'Bird is to nest as bee is to ...', undefined, 'Hive', [
    'Honey',
    'Flower',
    'Wing',
    'Sting',
  ]),
  logic(
    'logic-clubs',
    2,
    'Which statement must be true?',
    'Every student in the art club is also in the music club. Riya is in the art club.',
    'Riya is in the music club',
    [
      'Riya is not in the music club',
      'Everyone in the music club is in the art club',
      'Riya is in the art club only',
      'It cannot be known',
    ],
  ),
  // Dev > Asha > Bela > Chitra
  logic(
    'logic-tallest',
    3,
    'Who is the tallest?',
    'Asha is taller than Bela. Chitra is shorter than Bela. Dev is taller than Asha.',
    'Dev',
    ['Asha', 'Bela', 'Chitra', 'It cannot be known'],
  ),
  // 21 = 3 x 7; the others are prime. All are odd and have two digits.
  logic('logic-odd-number', 3, 'Which number does not belong with the others?', undefined, '21', [
    '13',
    '17',
    '19',
    '23',
  ]),
  // every letter moves one place forward in the alphabet
  logic(
    'logic-letter-code',
    3,
    'In the same code, how is DOG written?',
    'In a certain code, CAT is written as DBU.',
    'EPH',
    ['EPG', 'CNF', 'EOH', 'DPH'],
  ),
  logic(
    'logic-match-rain',
    4,
    'Which conclusion follows?',
    'If it rains, the match is cancelled. The match was not cancelled.',
    'It did not rain',
    ['It rained', 'It may or may not have rained', 'The match was moved to another day', 'The match was cancelled later'],
  ),
  // P R Q S T: R sits next to P, and T cannot be next to Q, so T takes the end.
  logic(
    'logic-row-of-five',
    4,
    'Who sits immediately to the right of Q?',
    'Five friends sit in a row. P sits at the left end and Q in the middle. R sits next to P. T does not sit next to Q. The fifth friend is S.',
    'S',
    ['R', 'T', 'P', 'It cannot be known'],
  ),
  // chess -> cricket, and cricket rules out tennis, so a tennis player plays neither.
  logic(
    'logic-chess-cricket',
    4,
    'Which statement must be true?',
    'In one class, everyone who plays chess also plays cricket. Nobody who plays cricket plays tennis. Meera plays tennis.',
    'Meera does not play chess',
    ['Meera plays chess', 'Meera plays cricket', 'Meera plays chess but not cricket', 'It cannot be known'],
  ),
  // Ali is not first, Bina is right behind Ali, Dia is fourth: Chen, Ali, Bina, Dia.
  logic(
    'logic-race-order',
    4,
    'Who finished second?',
    'Four runners finished a race. Ali was not first. Bina finished immediately after Ali. Chen finished before Ali. Dia finished last.',
    'Ali',
    ['Bina', 'Chen', 'Dia', 'It cannot be known'],
  ),
  // Prize in 1: labels 1 and 2 true. In 3: labels 2 and 3 true. In 2: only label 3 true.
  logic(
    'logic-three-boxes',
    5,
    'Where is the prize?',
    'One of three boxes holds a prize. Box 1 is labelled "The prize is in this box". Box 2 is labelled "The prize is not in this box". Box 3 is labelled "The prize is not in Box 1". Exactly one label is true.',
    'Box 2',
    ['Box 1', 'Box 3', 'It cannot be known'],
  ),
  // If C were truthful, A would be lying, making B truthful - but C said B lies. So C lies,
  // B (who says so) is truthful, and A (who says B lies) is lying.
  logic(
    'logic-who-lies',
    5,
    'Who is telling the truth?',
    'A says: "B is lying." B says: "C is lying." C says: "A and B are both lying." Each of them is either lying or telling the truth.',
    'Only B',
    ['Only A', 'Only C', 'A and C', 'B and C'],
  ),
];

/* ------------------------------------------------------------ pattern completion */

const CANVAS = { w: 300, h: 200 };

function pattern(key, difficulty, shapes, hole, wrong) {
  return {
    key,
    category: 'pattern',
    difficulty,
    prompt: {
      kind: 'pattern',
      text: 'Which piece completes the pattern?',
      figure: { ...CANVAS, shapes: cutOut(shapes, hole) },
      hole,
    },
    options: [f(windowOf(shapes, hole)), ...wrong.map(f)],
  };
}

const piece = (w, h, shapes) => ({ w, h, shapes });

function grid(count, make) {
  const out = [];
  for (let row = 0; row < count[1]; row++) for (let col = 0; col < count[0]; col++) out.push(make(col, row));
  return out;
}

// Square lattice of dots, 20 apart.
const dotLattice = grid([15, 10], (c, r) => dot(10 + c * 20, 10 + r * 20, 3.5));
const dotHole = { x: 180, y: 100, w: 80, h: 60 };

// Concentric rings around the middle of the canvas.
const rings = (step, count) =>
  Array.from({ length: count }, (_, i) => circle(150, 100, step * (i + 1) - 2, { sw: 2 }));
const ringHole = { x: 196, y: 110, w: 80, h: 60 };

const PATTERN = [
  pattern('pattern-dot-lattice', 1, dotLattice, dotHole, [
    // twice as dense
    piece(80, 60, grid([8, 6], (c, r) => dot(5 + c * 10, 5 + r * 10, 2.5))),
    // every other row shifted sideways
    piece(80, 60, grid([4, 3], (c, r) => dot((r % 2 ? 20 : 10) + c * 20, 10 + r * 20, 3.5)).filter((s) => s.t !== 'circle' || s.cx < 80)),
    // right spacing, dots too large
    piece(80, 60, grid([4, 3], (c, r) => dot(10 + c * 20, 10 + r * 20, 6.5))),
    // lines instead of dots
    piece(80, 60, [
      ...[10, 30, 50, 70].map((x) => line(x, 0, x, 60, 2)),
      ...[10, 30, 50].map((y) => line(0, y, 80, y, 2)),
    ]),
    // too sparse
    piece(80, 60, grid([3, 2], (c, r) => dot(13.33 + c * 26.67, 15 + r * 30, 3.5))),
  ]),
  pattern('pattern-rings', 2, rings(14, 14), ringHole, [
    // same rings seen from the other side of the centre
    windowOf(rings(14, 14), { ...ringHole, x: CANVAS.w - ringHole.x - ringHole.w }),
    windowOf(rings(14, 14), { ...ringHole, y: CANVAS.h - ringHole.y - ringHole.h }),
    // rings packed twice as tightly
    windowOf(rings(7, 28), ringHole),
    // the centre of the pattern
    windowOf(rings(14, 14), { ...ringHole, x: 110, y: 70 }),
    // straight lines at the right spacing
    piece(80, 60, Array.from({ length: 12 }, (_, i) => line(-70 + i * 20, 70, i * 20, -10, 2))),
  ]),
];

/* ------------------------------------------------------------ matrices */

const matrix = (key, difficulty, cols, cells, options) => ({
  key,
  category: 'matrix',
  difficulty,
  prompt: { kind: 'matrix', text: 'Which figure belongs in the empty box?', cols, cells },
  options,
});

// Two figures with no mirror symmetry, so "turned" and "flipped" can't be confused.
const hook = [poly([[36, 20], [36, 76], [66, 76]], { sw: 5 }), dot(66, 76, 7)];
const pennant = [line(40, 84, 40, 18, 4), poly([[40, 18], [74, 30], [40, 42]], { closed: true, fill: 'solid' })];
const turned = (shapes, rot, flip = false) => fig(...transform(shapes, { rot, flip }));

// 1, 2 or 3 copies of a shape in a row.

const circles = (cx, cy, fill) => circle(cx, cy, 11, { fill });
const squares = (cx, cy, fill) => square(cx, cy, 10, { fill });
const triangles = (cx, cy, fill) => tri(cx, cy + 3, 13, { fill });
const row = (make, count, fill) => {
  const xs = { 1: [50], 2: [36, 64], 3: [22, 50, 78], 4: [14, 38, 62, 86] }[count];
  return fig(...xs.map((x) => make(x, 50, fill)));
};

// Strokes that can be switched on or off inside a cell.
const STROKES = {
  top: line(24, 24, 76, 24, 4),
  bottom: line(24, 76, 76, 76, 4),
  left: line(24, 24, 24, 76, 4),
  right: line(76, 24, 76, 76, 4),
  slash: line(24, 24, 76, 76, 4),
  dot: dot(50, 50, 7),
};
const strokes = (...names) => fig(...names.map((n) => STROKES[n]));

const MATRIX = [
  // Left to right: the outline gets filled in.
  matrix(
    'matrix-fill-in',
    1,
    2,
    [fig(circle(50, 50, 26)), fig(circle(50, 50, 26, { fill: 'solid' })), fig(tri(50, 56, 32)), null],
    [
      f(fig(tri(50, 56, 32, { fill: 'solid' }))),
      f(fig(tri(50, 56, 32))),
      f(fig(tri(50, 56, 32, { fill: 'tint' }))),
      f(fig(circle(50, 50, 26, { fill: 'solid' }))),
      f(fig(square(50, 50, 24, { fill: 'solid' }))),
      f(fig(circle(50, 50, 26))),
    ],
  ),
  // Left to right: a quarter turn clockwise.
  matrix(
    'matrix-quarter-turn',
    2,
    2,
    [turned(hook, 0), turned(hook, 90), turned(pennant, 0), null],
    [
      f(turned(pennant, 90)),
      f(turned(pennant, 270)),
      f(turned(pennant, 180)),
      f(turned(pennant, 0)),
      f(turned(pennant, 90, true)),
      f(turned(pennant, 270, true)),
    ],
  ),
  // Rows: shape. Columns: count. Shading: each appears once per row and column.
  matrix(
    'matrix-shape-count-shade',
    3,
    3,
    [
      row(circles, 1, 'none'), row(circles, 2, 'tint'), row(circles, 3, 'solid'),
      row(squares, 1, 'tint'), row(squares, 2, 'solid'), row(squares, 3, 'none'),
      row(triangles, 1, 'solid'), row(triangles, 2, 'none'), null,
    ],
    [
      f(row(triangles, 3, 'tint')),
      f(row(triangles, 3, 'solid')),
      f(row(triangles, 3, 'none')),
      f(row(triangles, 2, 'tint')),
      f(row(squares, 3, 'tint')),
      f(row(triangles, 4, 'tint')),
    ],
  ),
  // Third column = first two overlaid, with anything they share removed.
  matrix(
    'matrix-overlay-cancel',
    4,
    3,
    [
      strokes('top', 'left'), strokes('left', 'bottom'), strokes('top', 'bottom'),
      strokes('right', 'slash'), strokes('slash', 'dot'), strokes('right', 'dot'),
      strokes('top', 'right', 'dot'), strokes('right', 'bottom'), null,
    ],
    [
      f(strokes('top', 'dot', 'bottom')),
      f(strokes('top', 'right', 'dot', 'bottom')),
      f(strokes('right')),
      f(strokes('top', 'bottom')),
      f(strokes('top', 'right', 'dot')),
      f(strokes('left', 'dot', 'bottom')),
    ],
  ),
];

/* ------------------------------------------------------------ spatial */

const L_SHAPE = [[0, 0], [0, 1], [0, 2], [1, 2]];
const F_SHAPE = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
const S_SHAPE = [[1, 0], [2, 0], [1, 1], [0, 2], [1, 2]];

const SPATIAL = [
  {
    key: 'spatial-odd-turn',
    category: 'spatial',
    difficulty: 2,
    prompt: { kind: 'text', text: 'Four of these are the same shape, only turned. Which one is different?' },
    options: [
      f(blocks(L_SHAPE, { rot: 1, flip: true })),
      f(blocks(L_SHAPE, { rot: 0 })),
      f(blocks(L_SHAPE, { rot: 1 })),
      f(blocks(L_SHAPE, { rot: 2 })),
      f(blocks(L_SHAPE, { rot: 3 })),
    ],
  },
  {
    key: 'spatial-turned-not-flipped',
    category: 'spatial',
    difficulty: 3,
    prompt: {
      kind: 'figure',
      text: 'Which option is this exact shape, turned but not flipped over?',
      figure: blocks(F_SHAPE),
    },
    options: [
      f(blocks(F_SHAPE, { rot: 3 })),
      f(blocks(F_SHAPE, { rot: 0, flip: true })),
      f(blocks(F_SHAPE, { rot: 1, flip: true })),
      f(blocks(F_SHAPE, { rot: 2, flip: true })),
      f(blocks(F_SHAPE, { rot: 3, flip: true })),
      f(blocks(S_SHAPE, { rot: 1 })),
    ],
  },
];

export const SEED_QUESTIONS = [
  ...PATTERN,
  ...MATRIX,
  ...SERIES,
  ...SPATIAL,
  ...LOGIC,
  ...STRATEGY,
  ...ROOT_CAUSE,
].map(build);
