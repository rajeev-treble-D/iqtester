/**
 * Difficulty of right/wrong steps, on the bank's 1-5 scale.
 *
 * The self-rating only decides where a quiz starts. From then on the answers
 * decide: two correct in a row move one level up, one wrong answer moves one
 * level down. That settles around the level where someone gets roughly 70%
 * right, whatever they said about themselves.
 */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
export const DEFAULT_LEVEL = 2;

/**
 * Starting level from agree/disagree answers, each 0 (strongly disagree) to
 * 4 (strongly agree). Never starts at the top: level 5 has to be earned.
 */
export function startLevel(agreements) {
  if (agreements.length === 0) return DEFAULT_LEVEL;
  const mean = agreements.reduce((sum, a) => sum + a, 0) / agreements.length;
  return Math.min(MAX_LEVEL - 1, Math.max(MIN_LEVEL, Math.round(mean)));
}

/** Level and streak after one right/wrong answer. */
export function nextLevel({ level, streak }, correct) {
  if (!correct) return { level: Math.max(MIN_LEVEL, level - 1), streak: 0 };
  if (streak + 1 < 2) return { level, streak: streak + 1 };
  return { level: Math.min(MAX_LEVEL, level + 1), streak: 0 };
}
