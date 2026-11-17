import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { Brand } from '../components/Brand';
import { CATEGORIES, CATEGORY_LABELS } from '../lib/brand';
import { clearSession, loadSession, saveSession } from '../lib/session';

export function Landing() {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .testInfo()
      .then((value) => !cancelled && setInfo(value))
      .catch(() => undefined); // the page still works without the numbers

    const session = loadSession();
    if (session) {
      api
        .state(session)
        .then((state) => !cancelled && setPrevious(state))
        .catch((err) => {
          if (err instanceof ApiError && err.sessionLost) clearSession();
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const { attemptId, token } = await api.start();
      saveSession({ attemptId, token });
      navigate('/test');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setStarting(false);
    }
  }

  const inProgress = previous?.status === 'in_progress';

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__row">
          <Brand />
        </div>
      </header>

      <main className="landing">
        <section className="hero">
          <p className="eyebrow">Reasoning test</p>
          <h1>See how you reason with patterns, numbers and shapes.</h1>
          <p className="lede">
            {info ? `${info.questions} questions, about ${info.estimatedMinutes} minutes.` : 'A short test.'} No
            sign-up. Questions start easy and get harder.
          </p>

          {inProgress && previous ? (
            <div className="hero__actions">
              <button className="button button--primary" type="button" onClick={() => navigate('/test')}>
                Continue at question {previous.index + 1} of {previous.total}
              </button>
              <button className="button" type="button" onClick={start} disabled={starting}>
                Start over
              </button>
            </div>
          ) : (
            <div className="hero__actions">
              <button className="button button--primary" type="button" onClick={start} disabled={starting}>
                {starting ? 'Starting...' : 'Start the test'}
              </button>
              {previous?.status === 'completed' && (
                <button className="button" type="button" onClick={() => navigate('/result')}>
                  View your last result
                </button>
              )}
            </div>
          )}
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="panel" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ul className="rules">
            <li>One question at a time. Pick an answer to move on.</li>
            <li>You can't go back, and every question needs an answer. If you're unsure, take your best guess.</li>
            <li>There's no time limit per question. Your total time is shown but doesn't change your score.</li>
            <li>Closed the tab by accident? Come back on this device and continue where you left off.</li>
          </ul>
        </section>

        <section className="panel" aria-labelledby="what">
          <h2 id="what">What it measures</h2>
          <dl className="skills">
            {CATEGORIES.map((category) => (
              <div key={category}>
                <dt>{CATEGORY_LABELS[category].name}</dt>
                <dd>{CATEGORY_LABELS[category].blurb}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
