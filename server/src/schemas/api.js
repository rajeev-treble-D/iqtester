import { z } from 'zod';

/**
 * Wire contract between the API and the web client.
 *
 * Questions are sent without any stable identifier: the client only knows
 * "question N of this attempt" and "option position K". The mapping back to
 * real question / option ids lives on the server, per attempt.
 *
 * The response shapes below are documentation (JSDoc); only request bodies
 * are validated at runtime.
 */

/**
 * A question as the browser sees it.
 * @typedef {object} PublicQuestion
 * @property {string} category One of CATEGORIES.
 * @property {object} prompt What the question shows (see promptSchema).
 * @property {object[]} options Options in this attempt's display order; answer by position.
 */

/**
 * What the landing page needs to describe the test before it starts.
 * @typedef {object} TestInfo
 * @property {number} questions
 * @property {number} estimatedMinutes
 */

/**
 * @typedef {object} AttemptState
 * @property {string} attemptId
 * @property {'in_progress' | 'completed'} status
 * @property {number} index Zero-based index of the question to answer next (= answered count).
 * @property {number} total
 * @property {string} startedAt
 * @property {string} serverNow Server clock at response time, so the client timer can't drift or be faked.
 * @property {PublicQuestion | null} question
 */

/**
 * Response to starting an attempt: the state plus the secret for this attempt.
 * The token is shown once; send it as `Authorization: Bearer`.
 * @typedef {AttemptState & { token: string }} StartAttemptResponse
 */

/** Body of POST /attempts/:id/answers. */
export const answerRequestSchema = z.strictObject({
  index: z.number().int().min(0).max(199),
  choice: z.number().int().min(0).max(7),
});

/**
 * @typedef {object} CategoryScore
 * @property {string} category
 * @property {number} correct
 * @property {number} total
 */

/**
 * @typedef {object} AttemptResult
 * @property {string} attemptId
 * @property {number} iq
 * @property {number} percentile Share of the population expected to score lower, 1-99.
 * @property {number} correct
 * @property {number} total
 * @property {number} durationMs
 * @property {string} completedAt
 * @property {CategoryScore[]} categories
 */

/**
 * Every error response has this body.
 * @typedef {object} ApiErrorBody
 * @property {{ code: string, message: string, details?: unknown }} error
 */
