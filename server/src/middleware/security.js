import cors from 'cors';

import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { env } from '../config/env.js';

/** Standard hardening headers. The API only ever returns JSON. */
export const securityHeaders = helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'same-site' },
});

/**
 * Policy for the web pages, when this process also serves the client: the page
 * may load its own scripts, styles and images and call its own API - nothing else.
 */
export const webContentPolicy = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
});

/** Only our own web origins may call the API from a browser. */
export const corsPolicy = cors({
  origin: env.corsOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

/** Questions and results are per-person - never let a proxy or browser cache them. */
export const noStore = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

const tooMany = {
  error: { code: 'rate_limited', message: 'Too many requests. Please slow down and try again shortly.' },
};

const limiter = (windowMs, limit) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, res) => {
      res.status(429).json(tooMany);
    },
    // NOTE: counters are per process. When running more than one API instance,
    // plug in a shared store (rate-limit-redis) here.
  });

/** Blanket limit for the whole API. */
export const apiLimiter = limiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX);

/** Starting tests is the expensive, abusable operation - limit it much harder. */
export const createAttemptLimiter = limiter(60 * 60 * 1000, env.ATTEMPT_CREATE_LIMIT_PER_HOUR);
