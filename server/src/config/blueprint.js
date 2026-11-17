const slots = (difficulty, ...categories) =>
  categories.map((category) => ({ category, difficulty }));

/**
 * The shape of one test: 40 slots, easiest first, categories interleaved so
 * no two neighbours test the same skill. Each attempt fills every slot with a
 * random active question of that category + difficulty, so two people (or one
 * person retaking) get different questions once the bank has several per slot.
 *
 *   pattern 6 | matrix 12 | series 8 | spatial 7 | logic 7
 *   level 1: 8 | level 2: 11 | level 3: 11 | level 4: 7 | level 5: 3
 */
export const BLUEPRINT = [
  ...slots(1, 'pattern', 'series', 'pattern', 'logic', 'pattern', 'matrix', 'series', 'pattern'),
  ...slots(2, 'matrix', 'series', 'pattern', 'spatial', 'logic', 'matrix', 'series', 'pattern', 'spatial', 'matrix', 'logic'),
  ...slots(3, 'matrix', 'series', 'spatial', 'logic', 'matrix', 'spatial', 'series', 'matrix', 'logic', 'spatial', 'matrix'),
  ...slots(4, 'matrix', 'spatial', 'series', 'matrix', 'logic', 'spatial', 'matrix'),
  ...slots(5, 'series', 'logic', 'matrix'),
];
