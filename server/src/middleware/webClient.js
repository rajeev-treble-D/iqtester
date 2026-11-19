import express, { Router } from 'express';
import path from 'node:path';
import { webContentPolicy } from './security.js';

/**
 * Serves the built web client (client/dist) from the API process, so the
 * whole app can run as one service on one origin. Mount it after the API routes.
 */
export function webClient(dir) {
  const root = path.resolve(dir);
  const router = Router();

  router.use(webContentPolicy);

  router.use(
    express.static(root, {
      index: false,
      setHeaders: (res, file) => {
        // Vite fingerprints everything under /assets, so those never change.
        const fingerprinted = path.relative(root, file).split(path.sep)[0] === 'assets';
        res.setHeader(
          'Cache-Control',
          fingerprinted
            ? 'public, max-age=31536000, immutable'
            : file.endsWith('.html')
              ? 'no-cache'
              : 'public, max-age=3600',
        );
      },
    }),
  );

  // Client-side routes (/quiz/general, /quiz/general/result...) are all the same page. A path with a
  // file extension is a missing asset, which must stay a 404.
  router.use((req, res, next) => {
    const wantsPage =
      (req.method === 'GET' || req.method === 'HEAD') && path.extname(req.path) === '' && Boolean(req.accepts('html'));
    if (!wantsPage) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root });
  });

  return router;
}
