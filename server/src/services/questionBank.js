import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';
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

const slotKey = (s) => `${s.category}:${s.difficulty}`;

async function loadBank() {
  const questions = await Question.find({ status: 'active' }).lean();
  const byId = new Map();
  const bySlot = new Map();
  for (const q of questions) {
    byId.set(String(q._id), q);
    const key = slotKey(q);
    const list = bySlot.get(key);
    if (list) list.push(q);
    else bySlot.set(key, [q]);
  }
  return { loadedAt: Date.now(), byId, bySlot };
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
 * Fill each blueprint slot with a random unused question of that category and
 * difficulty. Slots the bank can't fill are skipped, so a partially built bank
 * still produces a (shorter) test.
 */
export function selectForAttempt(source, blueprint, rng = cryptoRng, { quiet = false } = {}) {
  const used = new Set();
  const selected = [];
  let unfilled = 0;

  for (const slot of blueprint) {
    const candidates = (source.bySlot.get(slotKey(slot)) ?? []).filter((q) => !used.has(String(q._id)));
    const choice = candidates[rng(Math.max(candidates.length, 1))];
    if (!choice) {
      unfilled++;
      continue;
    }
    used.add(String(choice._id));
    selected.push(choice);
  }

  if (unfilled > 0 && !quiet) {
    logger.warn({ unfilled, slots: blueprint.length }, 'question bank cannot fill every blueprint slot');
  }
  return selected;
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
