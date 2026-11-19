import { z } from 'zod';

/**
 * Wire contract between the API and the web client.
 *
 * Steps are sent without any stable identifier: the client only knows
 * "step N of this attempt" and "option position K". The mapping back to real
 * question / option ids lives on the server, per attempt.
 *
 * The response shapes below are documentation (JSDoc); only request bodies
 * are validated at runtime.
 */

/**
 * One quiz in the catalogue (GET /quizzes).
 * @typedef {object} QuizInfo
 * @property {string} id
 * @property {'general' | 'ability' | 'style' | 'mindset'} group
 * @property {string} title
 * @property {string} blurb
 * @property {number} questions How many steps need an answer, with the current bank.
 * @property {number} minutes
 */

/**
 * What the browser shows for one step. Options are `{ kind: 'text' | 'figure', ... }`
 * in this attempt's display order; answer by position.
 * @typedef {(
 *   { kind: 'question', category: string, prompt: object, options: object[] } |
 *   { kind: 'statement', scale: 'likert' | 'choice', text: string, options: object[] } |
 *   { kind: 'memorize', variant: 'word', word: string } |
 *   { kind: 'memorize', variant: 'digits', digits: number[] | null, showMs: number, remainingMs: number } |
 *   { kind: 'recall', text: string, options: object[] } |
 *   { kind: 'info', variant: 'speed', percent: number | null } |
 *   { kind: 'info', variant: 'profile', axes: { id: string, label: string, value: number | null }[] } |
 *   { kind: 'info', variant: 'progress', percent: number, left: number }
 * )} PublicStep
 */

/**
 * @typedef {object} AttemptState
 * @property {string} attemptId
 * @property {string} quizId
 * @property {'in_progress' | 'completed'} status
 * @property {number} index Zero-based index of the step to do next.
 * @property {number} total Number of steps, including memorize and in-between screens.
 * @property {number} number Which question this is, counting only steps that need an answer (1-based).
 * @property {number} count How many steps need an answer.
 * @property {string} startedAt
 * @property {string} serverNow Server clock at response time, so the client timer can't drift or be faked.
 * @property {PublicStep | null} step
 */

/**
 * Response to starting an attempt: the state plus the secret for this attempt.
 * The token is shown once; send it as `Authorization: Bearer`.
 * @typedef {AttemptState & { token: string }} StartAttemptResponse
 */

/** Body of POST /attempts. */
export const startRequestSchema = z.strictObject({
  quizId: z.string().regex(/^[a-z]{2,24}$/),
  /** Starting difficulty carried over from an earlier General quiz; skips the self-rating questions. */
  level: z.number().int().min(1).max(5).optional(),
});

/** Body of POST /attempts/:id/answers. `choice` is left out for memorize and in-between screens. */
export const answerRequestSchema = z.strictObject({
  index: z.number().int().min(0).max(199),
  choice: z.number().int().min(0).max(7).optional(),
});

/**
 * GET /attempts/:id/result. The shape depends on `kind`:
 *   ability - score, percentile, correct, total, areas[]
 *   general - everything in ability, plus profile[], mindset[], styles[], recommend[], level
 *   style   - headline, summary, dimensions[]
 *   mindset - concern, band, headline, summary, facets[], support
 * Every result also has attemptId, quizId, title, durationMs and completedAt.
 * See server/src/services/results.js.
 * @typedef {object} AttemptResult
 */

/**
 * Every error response has this body.
 * @typedef {object} ApiErrorBody
 * @property {{ code: string, message: string, details?: unknown }} error
 */
