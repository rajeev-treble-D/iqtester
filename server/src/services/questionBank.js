import mongoose from 'mongoose';

import { cryptoRng } from '../lib/random.js';
import { Question } from '../models/Question.js';

/**
 * In-process cache of the active question bank.
 *
 * Questions change rarely and are read on every request, so each API instance
 * keeps them in memory and refreshes on a short TTL. That leaves one small
 * MongoDB read (the attempt) per request and lets instances scale out without
 * any shared cache.
 */

const TTL_MS = 60_000;

let bank = null;
let loading = null;

async function loadBank() {
  const questions = await Question.find({ status: 'active' }).lean();
  return indexBank(questions);
}

/** Exported for tests, which build a bank without a database. */
export function indexBank(questions) {
  const byId = new Map();
  const byCategory = new Map();
  for (const q of questions) {
    byId.set(String(q._id), q);
    const list = byCategory.get(q.category);
    if (list) list.push(q);
    else byCategory.set(q.category, [q]);
  }
  return { loadedAt: Date.now(), byId, byCategory };
}

export async function getBank() {
  if (bank && Date.now() - bank.loadedAt < TTL_MS) return bank;
  // Collapse concurrent refreshes into a single query.
  loading ??= loadBank()
    .then((fresh) => (bank = fresh))
    .finally(() => (loading = null));
  return loading;
}

export function invalidateBank() {
  bank = null;
}

/**
 * A random question of this category that the attempt hasn't seen, as close
 * to `level` as the bank allows. Undefined when the category is used up.
 */
export function pickQuestion(source, category, level, usedIds, rng = cryptoRng) {
  const unused = (source.byCategory.get(category) ?? []).filter((q) => !usedIds.has(String(q._id)));
  if (unused.length === 0) return undefined;
  const nearest = Math.min(...unused.map((q) => Math.abs(q.difficulty - level)));
  const candidates = unused.filter((q) => Math.abs(q.difficulty - level) === nearest);
  return candidates[rng(candidates.length)];
}

/** Look questions up by id: cache first, database for anything retired since. */
export async function getQuestionsByIds(ids) {
  const current = await getBank();
  const found = new Map();
  const missing = [];
  for (const id of ids) {
    const hit = current.byId.get(String(id));
    if (hit) found.set(String(id), hit);
    else missing.push(id);
  }
  if (missing.length > 0) {
    // `trusted` because sanitizeFilter is on globally; these ids come from our own data.
    const docs = await Question.find({ _id: mongoose.trusted({ $in: missing }) }).lean();
    for (const doc of docs) found.set(String(doc._id), doc);
  }
  return found;
}

/**
 * The only shape of a question that leaves the server: no key, no ids, no
 * answer, no difficulty data - just what to draw, with options in the
 * attempt's own order.
 */
export function toPublicQuestion(question, order) {
  const byId = new Map(question.options.map((o) => [o.id, o.content]));
  return {
    category: question.category,
    prompt: question.prompt,
    options: order.map((id) => {
      const content = byId.get(id);
      if (!content) throw new Error(`question ${question.key} has no option "${id}"`);
      return content;
    }),
  };
}
