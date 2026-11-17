import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './lib/db.js';
import { logger } from './lib/logger.js';

// The built web client (npm run build), if there is one. Serving it from here
// lets the whole app run as a single service; without it this is an API only.
const webDir = fileURLToPath(new URL('../../client/dist', import.meta.url));
const serveWeb = existsSync(path.join(webDir, 'index.html'));

async function main() {
  await connectDb();
  const server = createApp({ webDir: serveWeb ? webDir : undefined }).listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV, web: serveWeb }, 'api listening');
  });

  // Graceful shutdown: stop taking new connections, let in-flight requests
  // finish, then close the database. Lets deploys roll without dropped answers.
  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'shutting down');
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(() => {
      void disconnectDb().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
