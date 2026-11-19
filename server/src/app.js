import express from 'express';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { apiLimiter, corsPolicy, noStore, securityHeaders } from './middleware/security.js';
import { webClient } from './middleware/webClient.js';
import { attemptsRouter } from './routes/attempts.js';
import { quizzesRouter } from './routes/quizzes.js';

export function createApp({ webDir } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : randomUUID()),
      autoLogging: { ignore: (req) => req.url === '/healthz' || req.url === '/readyz' },
    }),
  );
  app.use(securityHeaders);

  // Probes for the load balancer / orchestrator - no auth, no rate limit.
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/readyz', (_req, res) => {
    const ready = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
  });

  app.use('/api', corsPolicy, noStore, apiLimiter, express.json({ limit: '10kb' }));
  app.use('/api/v1/quizzes', quizzesRouter);
  app.use('/api/v1/attempts', attemptsRouter);

  if (webDir) {
    // An unknown API path is a JSON 404, never the web page.
    app.use('/api', notFoundHandler);
    app.use(webClient(webDir));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
