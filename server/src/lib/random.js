import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** Random integer in [0, n) from the OS CSPRNG. */

export const cryptoRng = (n) => randomInt(n);

/** Fisher-Yates shuffle; returns a new array. */
export function shuffle(items, rng = cryptoRng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick(items, rng = cryptoRng) {
  return items.length ? items[rng(items.length)] : undefined;
}

/** 256-bit bearer secret for one attempt. */
export const newToken = () => randomBytes(32).toString('base64url');

/** We store only the hash, so a database leak doesn't expose usable tokens. */
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
