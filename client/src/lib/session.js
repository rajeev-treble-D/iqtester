/**
 * One attempt per quiz - its id and secret token - kept in localStorage so a
 * refresh or an accidentally closed tab resumes the same quiz. A token only
 * unlocks that one anonymous attempt.
 */

const KEY = 'iq.sessions.v2';
const LEVEL_KEY = 'iq.level.v1';

const valid = (value) => value && typeof value.attemptId === 'string' && typeof value.token === 'string';

/** Every stored attempt, by quiz id. */
export function loadSessions() {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const out = {};
    for (const [quizId, value] of Object.entries(all ?? {})) {
      if (valid(value)) out[quizId] = { attemptId: value.attemptId, token: value.token };
    }
    return out;
  } catch {
    return {};
  }
}

export const loadSession = (quizId) => loadSessions()[quizId] ?? null;

function store(sessions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    // Storage blocked (private mode): the quiz still works, it just can't resume.
  }
}

export function saveSession(quizId, session) {
  store({ ...loadSessions(), [quizId]: session });
}

export function clearSession(quizId) {
  const { [quizId]: _removed, ...rest } = loadSessions();
  store(rest);
}

/**
 * The difficulty level reached in the General quiz. Later quizzes start
 * there instead of asking you to rate yourself again.
 */
export function loadLevel() {
  try {
    const level = Number(localStorage.getItem(LEVEL_KEY));
    return Number.isInteger(level) && level >= 1 && level <= 5 ? level : null;
  } catch {
    return null;
  }
}

export function saveLevel(level) {
  try {
    localStorage.setItem(LEVEL_KEY, String(level));
  } catch {
    // nothing to do
  }
}
