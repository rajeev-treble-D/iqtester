import { Router } from 'express';

import { GROUPS, QUIZZES } from '../config/quizzes.js';
import { buildLayout, isAnswerable } from '../services/layout.js';
import { getBank } from '../services/questionBank.js';

export const quizzesRouter = Router();

/** Rough time per step, in seconds: reading a question takes longer than rating a statement. */
const SECONDS = { question: 35, recall: 20, statement: 10 };

/** The catalogue for the home page: every quiz with its length in the current bank. */
quizzesRouter.get('/', async (_req, res) => {
  const bank = await getBank();
  const quizzes = QUIZZES.map((quiz) => {
    const { id, group, title, blurb } = quiz;
    const steps = buildLayout(quiz, bank).filter(isAnswerable);
    const seconds = steps.reduce((sum, step) => sum + SECONDS[step.kind], 0);
    return { id, group, title, blurb, questions: steps.length, minutes: Math.max(1, Math.round(seconds / 60)) };
  });
  res.json({ groups: GROUPS, quizzes });
});
