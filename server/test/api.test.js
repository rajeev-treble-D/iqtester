import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { Attempt } from '../src/models/Attempt.js';
import { Question } from '../src/models/Question.js';
import { seedQuestions } from '../src/seed/seedQuestions.js';
import { invalidateBank } from '../src/services/questionBank.js';

/**
 * End-to-end API tests against a real MongoDB (a throwaway database).
 * Set MONGODB_URI_TEST to point somewhere else; skipped if nothing answers.
 */
const uri = process.env.MONGODB_URI_TEST ?? 'mongodb://127.0.0.1:27017/iqtest_test';

let available = true;
try {
  await connectDb(uri);
} catch {
  available = false;
  console.warn(`MongoDB not reachable at ${uri} - skipping API tests.`);
}

const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe.skipIf(!available)('attempt API', () => {
  beforeAll(async () => {
    await mongoose.connection.dropDatabase();
    invalidateBank();
    await seedQuestions();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });

  async function start() {
    const res = await request(app).post('/api/v1/attempts').expect(201);
    return res.body;
  }

  it('answers probes', async () => {
    await request(app).get('/healthz').expect(200);
    await request(app).get('/readyz').expect(200);
  });

  it('starts an attempt without leaking answers', async () => {
    const res = await request(app).post('/api/v1/attempts').expect(201);
    const body = res.body;
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.index).toBe(0);
    expect(body.total).toBeGreaterThan(0);
    expect(body.question?.options.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(body)).not.toMatch(/answerId|"irt"|"key"|tokenHash/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    const stored = await Attempt.findById(body.attemptId).lean();
    expect(stored?.tokenHash).not.toContain(body.token);
  });

  it('runs a whole test and scores a perfect sheet above an empty one', async () => {
    const run = async (answerCorrectly) => {
      const started = await start();
      let state = started;
      while (state.status === 'in_progress') {
        const stored = await Attempt.findById(started.attemptId).lean();
        const item = stored?.items[state.index];
        const question = await Question.findById(item?.questionId).lean();
        const right = item?.order.indexOf(question?.answerId ?? '') ?? 0;
        const choice = answerCorrectly ? right : (right + 1) % (item?.order.length ?? 1);
        const res = await request(app)
          .post(`/api/v1/attempts/${started.attemptId}/answers`)
          .set(auth(started.token))
          .send({ index: state.index, choice })
          .expect(200);
        state = res.body;
      }
      expect(state.question).toBeNull();
      expect(state.index).toBe(state.total);
      const res = await request(app)
        .get(`/api/v1/attempts/${started.attemptId}/result`)
        .set(auth(started.token))
        .expect(200);
      return res.body;
    };

    const perfect = await run(true);
    const empty = await run(false);

    expect(perfect.correct).toBe(perfect.total);
    expect(empty.correct).toBe(0);
    expect(perfect.iq).toBeGreaterThan(115);
    expect(empty.iq).toBeLessThan(85);
    expect(perfect.percentile).toBeGreaterThan(empty.percentile);
    expect(perfect.categories.reduce((n, c) => n + c.total, 0)).toBe(perfect.total);
    expect(JSON.stringify(perfect)).not.toMatch(/theta|answerId/);

    const done = await Attempt.findById(perfect.attemptId).lean();
    expect(done?.status).toBe('completed');
    expect(done?.purgeAt).toBeUndefined();
  });

  it('rejects missing or wrong credentials without revealing the attempt', async () => {
    const a = await start();
    const b = await start();
    await request(app).get(`/api/v1/attempts/${a.attemptId}`).expect(401);
    await request(app).get(`/api/v1/attempts/${a.attemptId}`).set(auth(b.token)).expect(404);
    await request(app).get('/api/v1/attempts/not-an-id').set(auth(a.token)).expect(404);
    await request(app).get(`/api/v1/attempts/${a.attemptId}`).set(auth(a.token)).expect(200);
  });

  it('accepts each answer exactly once, in order', async () => {
    const a = await start();
    const url = `/api/v1/attempts/${a.attemptId}/answers`;

    await request(app).post(url).set(auth(a.token)).send({ index: 1, choice: 0 }).expect(409);

    // Two identical requests racing: one wins, one is told it's out of sequence.
    const [r1, r2] = await Promise.all([
      request(app).post(url).set(auth(a.token)).send({ index: 0, choice: 0 }),
      request(app).post(url).set(auth(a.token)).send({ index: 0, choice: 1 }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);

    const state = (await request(app).get(`/api/v1/attempts/${a.attemptId}`).set(auth(a.token)).expect(200)).body;
    expect(state.index).toBe(1);

    const early = await request(app).get(`/api/v1/attempts/${a.attemptId}/result`).set(auth(a.token)).expect(409);
    expect(early.body.error.code).toBe('attempt_not_completed');
  });

  it('validates request bodies', async () => {
    const a = await start();
    const url = `/api/v1/attempts/${a.attemptId}/answers`;
    await request(app).post(url).set(auth(a.token)).send({ index: 0 }).expect(400);
    await request(app).post(url).set(auth(a.token)).send({ index: 0, choice: 99 }).expect(400);
    await request(app)
      .post(url)
      .set(auth(a.token))
      .send({ index: 0, choice: { $gt: -1 } })
      .expect(400);
    await request(app).post(url).set(auth(a.token)).send({ index: 0, choice: 0, extra: true }).expect(400);
    await request(app).post(url).set(auth(a.token)).set('Content-Type', 'application/json').send('{broken').expect(400);
    // An option position that doesn't exist for this question.
    await request(app).post(url).set(auth(a.token)).send({ index: 0, choice: 7 }).expect(400);
  });

  it('refuses expired attempts', async () => {
    const a = await start();
    await Attempt.updateOne({ _id: a.attemptId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).get(`/api/v1/attempts/${a.attemptId}`).set(auth(a.token)).expect(410);
    expect(res.body.error.code).toBe('attempt_expired');
  });

  it('returns JSON 404s for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
