/**
 * Scoring: item response theory (3-parameter logistic model).
 *
 * Every question carries three numbers: how hard it is (b), how well it
 * separates stronger from weaker test takers (a) and the chance of guessing it
 * (c). From the pattern of right/wrong answers we estimate the test taker's
 * ability `theta` on a standard scale (mean 0, SD 1), then map it to the
 * familiar IQ scale (mean 100, SD 15).
 *
 * Unlike "count correct answers", this stays comparable when two people
 * receive different questions from the bank, and getting a hard item right
 * counts for more than an easy one.
 *
 * The item parameters start as authored estimates. Once real attempts
 * accumulate they must be recalibrated from the response data - until then
 * the score is an estimate, not a normed measurement.
 */

export const IQ_MEAN = 100;
export const IQ_SD = 15;
export const IQ_MIN = 55;
export const IQ_MAX = 145;

const THETA_MIN = -4;
const THETA_MAX = 4;
const THETA_STEP = 0.1;

/** Probability that someone of ability `theta` answers the item correctly. */
export function probabilityCorrect(theta, item) {
  return item.c + (1 - item.c) / (1 + Math.exp(-item.a * (theta - item.b)));
}

/**
 * Expected a-posteriori ability estimate with a standard normal prior,
 * integrated numerically over a fixed grid. Always defined - including for
 * all-correct and all-wrong answer sheets, where maximum likelihood diverges.
 */
export function estimateTheta(responses) {
  let weightSum = 0;
  let thetaSum = 0;
  const steps = Math.round((THETA_MAX - THETA_MIN) / THETA_STEP);

  for (let i = 0; i <= steps; i++) {
    const theta = THETA_MIN + i * THETA_STEP;
    let logLikelihood = -0.5 * theta * theta; // log of the N(0,1) prior, up to a constant
    for (const r of responses) {
      const p = probabilityCorrect(theta, r);
      logLikelihood += Math.log(r.correct ? p : 1 - p);
    }
    const weight = Math.exp(logLikelihood);
    weightSum += weight;
    thetaSum += theta * weight;
  }
  return weightSum > 0 ? thetaSum / weightSum : 0;
}

export function thetaToIq(theta) {
  const iq = Math.round(IQ_MEAN + IQ_SD * theta);
  return Math.min(IQ_MAX, Math.max(IQ_MIN, iq));
}

/** Percent of the population expected to score below this IQ (1-99). */
export function iqToPercentile(iq) {
  const p = Math.round(100 * normalCdf((iq - IQ_MEAN) / IQ_SD));
  return Math.min(99, Math.max(1, p));
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}
