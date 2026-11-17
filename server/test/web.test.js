import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

/**
 * The API process can also serve the built web client (single-service
 * deployment). A stand-in build is enough here, and no database is needed.
 */
const dir = mkdtempSync(path.join(tmpdir(), 'iq-web-'));
mkdirSync(path.join(dir, 'assets'));
writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>IQ Test</title><div id="root"></div>');
writeFileSync(path.join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log("app")');

const app = createApp({ webDir: dir });

describe('web client', () => {
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves the page at the root and on client-side routes', async () => {
    for (const url of ['/', '/test', '/result', '/anything/else']) {
      const res = await request(app).get(url).expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<div id="root">');
      // The page must be revalidated so a new deploy is picked up at once.
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('serves assets, caching fingerprinted ones for good', async () => {
    const script = await request(app).get('/assets/index-abc123.js').expect(200);
    expect(script.headers['content-type']).toMatch(/javascript/);
    expect(script.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    const icon = await request(app).get('/favicon.svg').expect(200);
    expect(icon.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('lets the page run its own code and call its own API, nothing else', async () => {
    const page = await request(app).get('/').expect(200);
    const policy = page.headers['content-security-policy'];
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain('unsafe-inline');
    expect(page.headers['x-content-type-options']).toBe('nosniff');
  });

  it('keeps 404s as JSON for the API, missing files and non-page requests', async () => {
    const api = await request(app).get('/api/v1/nope').expect(404);
    expect(api.body.error.code).toBe('not_found');
    expect(api.headers['content-security-policy']).toContain("default-src 'none'");

    const missing = await request(app).get('/assets/missing.js').expect(404);
    expect(missing.body.error.code).toBe('not_found');

    await request(app).post('/test').expect(404);
    await request(app).get('/test').set('Accept', 'application/json').expect(404);
  });

  it('does not expose files outside the build', async () => {
    await request(app).get('/..%2f..%2fpackage.json').expect(404);
    await request(app).get('/assets/..%2f..%2fpackage.json').expect(404);
  });

  it('still answers probes', async () => {
    await request(app).get('/healthz').expect(200);
  });

  it('serves no pages when there is no client build', async () => {
    const apiOnly = createApp();
    const res = await request(apiOnly).get('/').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
