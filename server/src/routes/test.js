import { Router } from 'express';

import { BLUEPRINT } from '../config/blueprint.js';
import { cryptoRng } from '../lib/random.js';
import { getBank, selectForAttempt } from '../services/questionBank.js';

export const testRouter = Router();

/** Public facts about the test, for the landing page. */
testRouter.get('/', async (_req, res) => {
  const questions = selectForAttempt(await getBank(), BLUEPRINT, cryptoRng, { quiet: true }).length;
  const body = { questions, estimatedMinutes: Math.max(1, Math.round(questions * 0.5)) };
  res.json(body);
});
