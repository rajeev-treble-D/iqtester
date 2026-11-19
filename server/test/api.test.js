import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { QUIZZES } from '../src/config/quizzes.js';
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

/** Nothing that identifies a question or gives away an answer may reach the browser. */
const SECRETS = /answerId|"irt"|"key"|tokenHash|questionId|"answer"|"ref"|"theta"/;

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

  async function start(quizId = 'logic', extra = {}) {
    const res = await request(app)
      .post('/api/v1/attempts')
      .send({ quizId, ...extra })
      .expect(201);
    return res.body;
  }

  const answer = (a, body) => request(app).post(`/api/v1/attempts/${a.attemptId}/answers`).set(auth(a.token)).send(body);

  /**
   * Take a whole quiz. `choose(item, right)` returns the option position for a
   * step that needs an answer; `right` is the correct position where there is one.
   */
  async function run(quizId, choose, extra) {
    const started = await start(quizId, extra);
    let state = started;
    const seen = [];
    while (state.status === 'in_progress') {
      expect(JSON.stringify(state)).not.toMatch(SECRETS);
      seen.push(state.step);
      const stored = await Attempt.findById(started.attemptId).lean();
      const item = stored.items[state.index];

      let choice;
      if (item.kind === 'question') {
        const question = await Question.findById(item.questionId).lean();
        choice = choose(item, item.order.indexOf(question.answerId), item.order.length);
      } else if (item.kind === 'recall') {
        choice = choose(item, item.data.answer, item.data.options.length);
      } else if (item.kind === 'statement') {
        choice = choose(item, undefined, state.step.options.length);
      }
      state = (await answer(started, { index: state.index, choice }).expect(200)).body;
    }
    expect(state.step).toBeNull();
    expect(state.index).toBe(state.total);
    const res = await request(app)
      .get(`/api/v1/attempts/${started.attemptId}/result`)
      .set(auth(started.token))
      .expect(200);
    expect(JSON.stringify(res.body)).not.toMatch(SECRETS);
    return { result: res.body, seen, attempt: await Attempt.findById(started.attemptId).lean() };
  }

  const allRight = (_item, right) => right ?? 0;
  const allWrong = (_item, right, n) => (right === undefined ? n - 1 : (right + 1) % n);

  it('answers probes', async () => {
    await request(app).get('/healthz').expect(200);
    await request(app).get('/readyz').expect(200);
  });

  it('lists the quizzes with their length', async () => {
    const { body } = await request(app).get('/api/v1/quizzes').expect(200);
    expect(body.quizzes.map((q) => q.id)).toEqual(QUIZZES.map((q) => q.id));
    expect(body.quizzes.find((q) => q.id === 'general').questions).toBe(47);
    for (const q of body.quizzes) {
      expect(q.questions, q.id).toBeGreaterThanOrEqual(10);
      expect(q.minutes, q.id).toBeGreaterThan(0);
    }
    expect(body.groups.map((g) => g.id)).toEqual(['ability', 'style', 'mindset']);
  });

  it('starts an attempt without leaking answers', async () => {
    const res = await request(app).post('/api/v1/attempts').send({ quizId: 'logic' }).expect(201);
    const body = res.body;
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.quizId).toBe('logic');
    expect(body.index).toBe(0);
    expect(body.number).toBe(1);
    expect(body.count).toBeGreaterThan(0);
    expect(body.step).toMatchObject({ kind: 'statement', scale: 'likert' });
    expect(body.step.options).toHaveLength(5);
    expect(JSON.stringify(body)).not.toMatch(SECRETS);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    const stored = await Attempt.findById(body.attemptId).lean();
    expect(stored?.tokenHash).not.toContain(body.token);
  });

  it('refuses unknown quizzes and malformed start requests', async () => {
    await request(app).post('/api/v1/attempts').send({ quizId: 'nope' }).expect(404);
    await request(app).post('/api/v1/attempts').send({}).expect(400);
    await request(app).post('/api/v1/attempts').send({ quizId: 'logic', level: 9 }).expect(400);
    await request(app)
      .post('/api/v1/attempts')
      .send({ quizId: { $ne: '' } })
      .expect(400);
  });

  it('runs the general quiz and scores a perfect sheet above an empty one', async () => {
    const perfect = await run('general', allRight);
    const empty = await run('general', allWrong);

    // Every kind of step turns up.
    const kinds = new Set(perfect.seen.map((s) => s.kind + (s.variant ? `:${s.variant}` : '')));
    for (const kind of [
      'question',
      'statement',
      'recall',
      'memorize:word',
      'memorize:digits',
      'info:speed',
      'info:profile',
      'info:progress',
    ]) {
      expect(kinds, kind).toContain(kind);
    }

    const a = perfect.result;
    const b = empty.result;
    expect(a.kind).toBe('general');
    expect(a.correct).toBe(a.total);
    expect(a.total).toBe(29);
    expect(b.correct).toBe(0);
    expect(a.score).toBeGreaterThan(115);
    expect(b.score).toBeLessThan(85);
    expect(a.percentile).toBeGreaterThan(b.percentile);
    expect(a.areas.reduce((n, area) => n + area.total, 0)).toBe(a.total);
    expect(a.areas.map((area) => area.area)).toContain('memory');
    expect(a.profile.map((axis) => axis.id)).toEqual([
      'reasoning',
      'memory',
      'strategy',
      'confidence',
      'procrastination',
      'stress',
      'career',
    ]);
    for (const axis of a.profile) expect(axis.value).toBeGreaterThanOrEqual(0);
    expect(a.mindset).toHaveLength(4);
    expect(a.styles).toHaveLength(4);
    expect(a.recommend.length).toBeGreaterThanOrEqual(2);
    expect(a.level).toBe(4);
    expect(b.level).toBe(1);

    // The quiz got harder for the one and easier for the other.
    expect(perfect.attempt.level).toBe(5);
    expect(empty.attempt.level).toBe(1);

    // Screens in the middle of the quiz report real numbers.
    const profile = perfect.seen.find((s) => s.variant === 'profile');
    expect(profile.axes).toHaveLength(7);
    const progress = perfect.seen.find((s) => s.variant === 'progress');
    expect(progress.left).toBeGreaterThan(0);
    expect(progress.percent).toBeGreaterThan(70);
    // Too few people have taken it for a pace comparison.
    expect(perfect.seen.find((s) => s.variant === 'speed').percent).toBeNull();

    expect(perfect.attempt.status).toBe('completed');
    expect(perfect.attempt.purgeAt).toBeUndefined();
    const used = perfect.attempt.items.flatMap((item) => (item.questionId ? String(item.questionId) : []));
    expect(new Set(used).size).toBe(used.length);
  });

  it('sets the starting difficulty from the self-rating', async () => {
    for (const [choice, level] of [
      [0, 4], // strongly agree with everything
      [2, 2], // neutral
      [4, 1], // strongly disagree
    ]) {
      const a = await start('strategy');
      for (const index of [0, 1, 2]) await answer(a, { index, choice }).expect(200);
      const stored = await Attempt.findById(a.attemptId).lean();
      expect(stored.level).toBe(level);
      const first = await Question.findById(stored.items[3].questionId).lean();
      expect(Math.abs(first.difficulty - level)).toBeLessThanOrEqual(1);
    }
  });

  it('skips the self-rating when a starting level is given', async () => {
    const a = await start('strategy', { level: 3 });
    expect(a.step.kind).toBe('question');
    expect(a.count).toBe(10);
    const stored = await Attempt.findById(a.attemptId).lean();
    expect(stored.level).toBe(3);
    expect((await Question.findById(stored.items[0].questionId).lean()).difficulty).toBe(3);
  });

  it('compares pace with earlier attempts once there are enough of them', async () => {
    // Everyone before took ten hours to reach the pace screen.
    await Attempt.collection.insertMany(
      Array.from({ length: env.PACE_MIN_SAMPLE }, () => ({ quizId: 'rootcause', speedCheckMs: 36_000_000 })),
    );
    const { seen, result } = await run('rootcause', allRight);
    expect(seen.find((s) => s.variant === 'speed').percent).toBe(99);
    expect(result.kind).toBe('ability');
    expect(result.areas).toEqual([{ area: 'rootcause', correct: 10, total: 10, level: expect.any(Number) }]);
    await Attempt.collection.deleteMany({ tokenHash: { $exists: false } });
  });

  it('shows a number sequence only for its time on screen', async () => {
    const a = await start('memory', { level: 2 });
    let state = a;
    while (!(state.step.kind === 'memorize' && state.step.variant === 'digits')) {
      state = (await answer(a, { index: state.index, choice: state.step.options ? 0 : undefined }).expect(200)).body;
    }
    expect(state.step.digits.length).toBeGreaterThanOrEqual(4);
    expect(state.step.remainingMs).toBeGreaterThan(0);

    // Reload after the time is up: the digits are gone.
    await Attempt.updateOne(
      { _id: a.attemptId },
      { $set: { [`items.${state.index}.servedAt`]: new Date(Date.now() - 60_000) } },
    );
    const late = (await request(app).get(`/api/v1/attempts/${a.attemptId}`).set(auth(a.token)).expect(200)).body;
    expect(late.step).toMatchObject({ kind: 'memorize', variant: 'digits', digits: null, remainingMs: 0 });

    const next = (await answer(a, { index: state.index }).expect(200)).body;
    expect(JSON.stringify(next)).not.toMatch(SECRETS);
  });

  it('describes a style from the options picked', async () => {
    const { result, attempt } = await run('decision', () => 0);
    expect(result.kind).toBe('style');
    expect(result.dimensions.map((d) => d.id)).toEqual(['risk', 'pace', 'basis']);
    for (const d of result.dimensions) {
      expect(d.total).toBe(4);
      expect(d.options.reduce((n, o) => n + o.count, 0)).toBe(4);
    }
    expect(result.headline.split(' · ')).toHaveLength(3);
    expect(attempt.items.some((item) => item.correct !== null)).toBe(false);

    const types = await run('approach', () => 0);
    expect(types.result.dimensions[0].options).toHaveLength(4);
    expect(types.result.headline.length).toBeGreaterThan(3);
  });

  it('reads a mindset level from agree/disagree answers', async () => {
    // Agreeing with everything: 8 statements describe the difficulty, 4 are reversed.
    const agree = await run('stress', () => 0);
    expect(agree.result).toMatchObject({ kind: 'mindset', trait: 'stress', concern: 67, band: 'high' });
    expect(agree.result.support).toMatch(/counsellor/);
    expect(agree.result.facets).toHaveLength(4);
    for (const facet of agree.result.facets) expect(facet.tip.length).toBeGreaterThan(20);

    const disagree = await run('stress', () => 4);
    expect(disagree.result).toMatchObject({ concern: 33, band: 'low', support: null });

    // Answering as someone with no difficulty at all: disagree, except with the reversed statements.
    const { STATEMENTS } = await import('../src/content/statements.js');
    const reversed = new Set(STATEMENTS.filter((s) => s.reverse).map((s) => s.key));
    const calm = await run('career', (item) => (reversed.has(item.ref) ? 0 : 4));
    expect(calm.result).toMatchObject({ trait: 'career', concern: 0, band: 'low' });
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

    await answer(a, { index: 1, choice: 0 }).expect(409);

    // Two identical requests racing: one wins, one is told it's out of sequence.
    const [r1, r2] = await Promise.all([answer(a, { index: 0, choice: 0 }), answer(a, { index: 0, choice: 1 })]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);

    const state = (await request(app).get(`/api/v1/attempts/${a.attemptId}`).set(auth(a.token)).expect(200)).body;
    expect(state.index).toBe(1);
    expect(state.number).toBe(2);

    const early = await request(app).get(`/api/v1/attempts/${a.attemptId}/result`).set(auth(a.token)).expect(409);
    expect(early.body.error.code).toBe('attempt_not_completed');
  });

  it('validates request bodies', async () => {
    const a = await start();
    // The first step needs an answer.
    await answer(a, { index: 0 }).expect(400);
    await answer(a, { index: 0, choice: 99 }).expect(400);
    await answer(a, { index: 0, choice: { $gt: -1 } }).expect(400);
    await answer(a, { index: 0, choice: 0, extra: true }).expect(400);
    await request(app)
      .post(`/api/v1/attempts/${a.attemptId}/answers`)
      .set(auth(a.token))
      .set('Content-Type', 'application/json')
      .send('{broken')
      .expect(400);
    // An option position that doesn't exist for this step (agree/disagree has five).
    await answer(a, { index: 0, choice: 5 }).expect(400);
    // None of that moved the attempt on.
    expect((await Attempt.findById(a.attemptId).lean()).currentIndex).toBe(0);
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
