import { describe, expect, it } from 'vitest';
import { BLUEPRINT } from '../src/config/blueprint.js';
import { estimateTheta, iqToPercentile, normalCdf, thetaToIq } from '../src/services/scoring.js';

/** A full-length answer sheet: the easiest `correct` items right, the rest wrong. */
function sheet(correct) {
  return BLUEPRINT.map((slot, i) => ({
    a: 1.1,
    b: (slot.difficulty - 3) * 0.9,
    c: slot.category === 'series' || slot.category === 'logic' ? 0.2 : 1 / 6,
    correct: i < correct,
  }));
}
const iqFor = (correct) => thetaToIq(estimateTheta(sheet(correct)));

describe('scoring', () => {
  it('blueprint has 40 slots in non-decreasing difficulty', () => {
    expect(BLUEPRINT).toHaveLength(40);
    const levels = BLUEPRINT.map((s) => s.difficulty);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });

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
