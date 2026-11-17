const BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }

  /** The attempt no longer exists or has timed out - the only way on is a new test. */
  get sessionLost() {
    return this.status === 401 || this.status === 404 || this.status === 410;
  }
}

async function call(path, { method = 'GET', token, body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.');
  }

  if (res.ok) return await res.json();

  let parsed;
  try {
    parsed = await res.json();
  } catch {
    // non-JSON error (proxy, gateway)
  }
  throw new ApiError(
    res.status,
    parsed?.error?.code ?? 'unknown',
    parsed?.error?.message ?? 'Something went wrong. Please try again.',
  );
}

export const api = {
  testInfo: () => call('/test'),
  start: () => call('/attempts', { method: 'POST' }),
  state: (s) => call(`/attempts/${s.attemptId}`, { token: s.token }),
  answer: (s, body) => call(`/attempts/${s.attemptId}/answers`, { method: 'POST', token: s.token, body }),
  result: (s) => call(`/attempts/${s.attemptId}/result`, { token: s.token }),
};
