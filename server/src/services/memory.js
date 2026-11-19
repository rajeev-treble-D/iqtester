import { cryptoRng, pick, shuffle } from '../lib/random.js';

/**
 * Memory tasks are generated, not stored in the bank: every attempt gets its
 * own word or digits. A task has two halves: `show` goes to the memorize
 * step, `ask` to the recall step (question, options, position of the right
 * option, and the scoring parameters).
 */

/** Words that look and sound alike, so recognising the right one takes real recall. */
const WORD_SETS = [
  ['Lantern', 'Lattice', 'Ladder', 'Lagoon', 'Laurel'],
  ['Compass', 'Canvas', 'Candle', 'Cactus', 'Castle'],
  ['Harbor', 'Hammer', 'Hollow', 'Harvest', 'Helmet'],
  ['Marble', 'Meadow', 'Magnet', 'Mirror', 'Mantle'],
  ['Pebble', 'Pillar', 'Planet', 'Pocket', 'Parcel'],
  ['Signal', 'Silver', 'Saddle', 'Spiral', 'Summit'],
  ['Thunder', 'Timber', 'Tunnel', 'Temple', 'Ticket'],
  ['Garnet', 'Garden', 'Gallery', 'Gravel', 'Glacier'],
];

/** Sequence length and time on screen, by difficulty level. */
const DIGIT_SPEC = {
  1: { length: 4, showMs: 5000 },
  2: { length: 5, showMs: 5000 },
  3: { length: 6, showMs: 6000 },
  4: { length: 7, showMs: 6000 },
  5: { length: 8, showMs: 7000 },
};

/** How the sequence is asked about, by difficulty level. */
const DIGIT_FORMS = {
  1: ['position'],
  2: ['position'],
  3: ['position', 'sequence'],
  4: ['sequence', 'reverse'],
  5: ['reverse'],
};

/** Same scale as the bank: level 3 is an average item. */
const irt = (level, optionCount) => ({
  a: 1,
  b: (level - 3) * 0.9,
  c: Math.round((1 / optionCount) * 1000) / 1000,
});

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const spaced = (digits) => digits.join(' ');

function ask(text, right, wrong, level, rng) {
  const options = shuffle([right, ...wrong], rng);
  return { text, options, answer: options.indexOf(right), irt: irt(level, options.length) };
}

/** One word to remember; the wrong options are its look-alikes. */
export function wordTask(usedWords = [], rng = cryptoRng) {
  const fresh = WORD_SETS.filter((set) => !set.some((w) => usedWords.includes(w)));
  const set = pick(fresh.length ? fresh : WORD_SETS, rng);
  const word = pick(set, rng);
  return {
    show: { word },
    ask: ask(
      'Which of these words were you asked to memorize?',
      word,
      set.filter((w) => w !== word),
      2,
      rng,
    ),
  };
}

/** A sequence of different digits, shown for a few seconds. */
export function digitTask(level, rng = cryptoRng) {
  const { length, showMs } = DIGIT_SPEC[level] ?? DIGIT_SPEC[3];
  const pool = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  const digits = pool.slice(0, length);
  const unused = pool.slice(length);
  const form = pick(DIGIT_FORMS[level] ?? DIGIT_FORMS[3], rng);

  // Near misses: two neighbours swapped, one digit replaced, the two ends swapped.
  const swapped = (list, i) => list.map((d, k) => (k === i ? list[i + 1] : k === i + 1 ? list[i] : d));
  const replaced = (list, i) => list.map((d, k) => (k === i ? unused[0] : d));
  const ends = (list) => [list.at(-1), ...list.slice(1, -1), list[0]];
  const at = 1 + rng(length - 2); // never an end, so `ends` always gives a different sequence

  if (form === 'position') {
    const index = rng(length);
    const others = shuffle(digits.filter((_, k) => k !== index), rng).slice(0, 2);
    return {
      show: { digits, showMs },
      ask: ask(
        `What was the ${ORDINALS[index]} digit?`,
        String(digits[index]),
        [...others, ...unused.slice(0, 2)].map(String),
        level,
        rng,
      ),
    };
  }

  const target = form === 'reverse' ? [...digits].reverse() : digits;
  const wrong = [swapped(target, at - 1), replaced(target, at), form === 'reverse' ? digits : ends(target)];
  return {
    show: { digits, showMs },
    ask: ask(
      form === 'reverse' ? 'Which shows the sequence in reverse order?' : 'Which sequence did you see?',
      spaced(target),
      wrong.map(spaced),
      level,
      rng,
    ),
  };
}
