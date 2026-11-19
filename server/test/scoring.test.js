import { describe, expect, it } from 'vitest';
import { nextLevel, startLevel } from '../src/services/difficulty.js';
import { estimateTheta, iqToPercentile, normalCdf, thetaToIq } from '../src/services/scoring.js';

/** Difficulty levels of a 40-item answer sheet, easiest first. */
const LEVELS = [
  ...Array(8).fill(1),
  ...Array(11).fill(2),
  ...Array(11).fill(3),
  ...Array(7).fill(4),
  ...Array(3).fill(5),
];

/** A full-length answer sheet: the easiest `correct` items right, the rest wrong. */
function sheet(correct) {
  return LEVELS.map((difficulty, i) => ({
    a: 1.1,
    b: (difficulty - 3) * 0.9,
    c: i % 2 ? 0.2 : 1 / 6,
    correct: i < correct,
  }));
}
const iqFor = (correct) => thetaToIq(estimateTheta(sheet(correct)));

describe('scoring', () => {
  it('rises with every additional correct answer', () => {
    const scores = Array.from({ length: 41 }, (_, n) => estimateTheta(sheet(n)));
    for (let n = 1; n < scores.length; n++) {
      expect(scores[n]).toBeGreaterThan(scores[n - 1]);
    }
  });

  it('spans a sensible IQ range', () => {
    expect(iqFor(0)).toBeLessThan(75);
    expect(iqFor(40)).toBeGreaterThan(130);
    expect(iqFor(0)).toBeGreaterThanOrEqual(55);
    expect(iqFor(40)).toBeLessThanOrEqual(145);
  });

  it('rewards hard items more than easy ones', () => {
    const base = sheet(20);
    const easyMiss = base.map((r, i) => (i === 0 ? { ...r, correct: false } : r));
    const hardHit = easyMiss.map((r, i) => (i === 39 ? { ...r, correct: true } : r));
    // Same number correct, but one sheet swapped an easy item for the hardest one.
    expect(estimateTheta(hardHit)).toBeGreaterThan(estimateTheta(base) - 0.5);
    expect(estimateTheta(hardHit)).toBeGreaterThan(estimateTheta(easyMiss));
  });

  it('returns the population mean for an empty sheet', () => {
    expect(estimateTheta([])).toBeCloseTo(0, 6);
    expect(thetaToIq(0)).toBe(100);
  });

  it('maps IQ to percentiles on the normal curve', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(iqToPercentile(100)).toBe(50);
    expect(iqToPercentile(115)).toBe(84);
    expect(iqToPercentile(130)).toBe(98);
    expect(iqToPercentile(55)).toBe(1);
    expect(iqToPercentile(145)).toBe(99);
  });
});

describe('difficulty', () => {
  it('starts from the self-rating, but never at the top level', () => {
    expect(startLevel([])).toBe(2);
    expect(startLevel([0, 0, 0])).toBe(1);
    expect(startLevel([2, 2, 2])).toBe(2);
    expect(startLevel([3, 3, 4])).toBe(3);
    expect(startLevel([4, 4, 4])).toBe(4);
  });

  it('goes up after two correct answers in a row and down after one wrong', () => {
    let state = { level: 2, streak: 0 };
    state = nextLevel(state, true);
    expect(state).toEqual({ level: 2, streak: 1 });
    state = nextLevel(state, true);
    expect(state).toEqual({ level: 3, streak: 0 });
    state = nextLevel(nextLevel(state, true), false);
    expect(state).toEqual({ level: 2, streak: 0 });
  });

  it('stays within levels 1 to 5', () => {
    expect(nextLevel({ level: 1, streak: 0 }, false).level).toBe(1);
    expect(nextLevel({ level: 5, streak: 1 }, true).level).toBe(5);
  });
});
