import { gone, notFound, unauthorized } from '../lib/errors.js';
import { hashToken, safeEqual } from '../lib/random.js';
import { Attempt } from '../models/Attempt.js';

const OBJECT_ID = /^[a-f0-9]{24}$/;
const BEARER = /^Bearer ([A-Za-z0-9_-]{32,128})$/;

/**
 * Loads the attempt named in the URL and checks the caller holds its token.
 * A wrong token and an unknown id are indistinguishable (both 404), so ids
 * can't be probed.
 */
export const requireAttempt = async (req, res, next) => {
  const token = BEARER.exec(req.get('authorization') ?? '')?.[1];
  if (!token) throw unauthorized();

  const id = req.params.id;
  if (typeof id !== 'string' || !OBJECT_ID.test(id)) throw notFound('Attempt');

  const attempt = await Attempt.findById(id).lean();
  if (!attempt || !safeEqual(attempt.tokenHash, hashToken(token))) throw notFound('Attempt');

  if (attempt.status === 'in_progress' && attempt.expiresAt.getTime() < Date.now()) {
    throw gone('attempt_expired', 'This test session has expired. Please start a new test.');
  }

  res.locals.attempt = attempt;
  next();
};

export const attemptOf = (res) => res.locals.attempt;
