/**
 * The current attempt's id and secret token, kept in localStorage so a
 * refresh or an accidentally closed tab resumes the same test. The token only
 * unlocks this one anonymous attempt.
 */

const KEY = 'iq.attempt.v1';

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value.attemptId === 'string' && typeof value.token === 'string'
      ? { attemptId: value.attemptId, token: value.token }
      : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage blocked (private mode): the test still works, it just can't resume.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
