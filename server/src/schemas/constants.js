/**
 * Plain constants with no dependencies.
 *
 * The web client keeps its own copy of the area labels (client/src/lib/brand.js);
 * change both when adding a category.
 */

/** Kinds of right/wrong question stored in the bank. */
export const CATEGORIES = ['pattern', 'matrix', 'series', 'spatial', 'logic', 'strategy', 'rootcause'];

/** What a result can report on: the bank's categories plus the generated memory tasks. */
export const AREAS = [...CATEGORIES, 'memory'];

export const DIFFICULTIES = [1, 2, 3, 4, 5];

export const FILLS = ['none', 'solid', 'tint', 'hatch'];

/**
 * One screen of a quiz:
 *   question  - right/wrong item from the bank
 *   statement - no right answer: agree/disagree, or "what would you do"
 *   memorize  - something to remember (nothing to answer)
 *   recall    - right/wrong question about what was memorized
 *   info      - an in-between screen (pace, profile so far, questions left)
 */
export const STEP_KINDS = ['question', 'statement', 'memorize', 'recall', 'info'];
