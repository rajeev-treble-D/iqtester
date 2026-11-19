import { Router } from 'express';
import { answerRequestSchema, startRequestSchema } from '../schemas/index.js';
import { parse } from '../lib/errors.js';
import { attemptOf, requireAttempt } from '../middleware/attemptAuth.js';
import { createAttemptLimiter } from '../middleware/security.js';
import { buildState, getResult, startAttempt, submitAnswer } from '../services/attempts.js';

export const attemptsRouter = Router();

/** Start a quiz. Returns the first step and the attempt's secret token. */
attemptsRouter.post('/', createAttemptLimiter, async (req, res) => {
  const { attempt, token } = await startAttempt(parse(startRequestSchema, req.body));
  const body = { ...(await buildState(attempt)), token };
  res.status(201).json(body);
});

/** Where am I? Used to resume after a refresh or dropped connection. */
attemptsRouter.get('/:id', requireAttempt, async (_req, res) => {
  const body = await buildState(attemptOf(res));
  res.json(body);
});

/** Answer the current step (or continue past a screen with nothing to answer); responds with the next one. */
attemptsRouter.post('/:id/answers', requireAttempt, async (req, res) => {
  const { index, choice } = parse(answerRequestSchema, req.body);
  const updated = await submitAnswer(attemptOf(res), index, choice);
  const body = await buildState(updated);
  res.json(body);
});

attemptsRouter.get('/:id/result', requireAttempt, async (_req, res) => {
  const body = await getResult(attemptOf(res));
  res.json(body);
});
