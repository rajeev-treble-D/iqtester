import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import { Brand } from '../components/Brand';
import { OPTION_KEYS, Options } from '../components/Options';
import { PromptView } from '../components/PromptView';
import { clearSession, loadSession } from '../lib/session';
import { formatClock, useElapsed } from '../lib/time';

const ready = (state) => ({
  phase: 'ready',
  state,
  clockOffset: new Date(state.serverNow).getTime() - Date.now(),
});

/** Long enough to see which option you picked before the next question appears. */
const FEEDBACK_MS = 220;

export function Test() {
  const navigate = useNavigate();
  const [session] = useState(loadSession);
  const [view, setView] = useState({ phase: 'loading' });
  const [selected, setSelected] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const busy = useRef(false);

  const accept = useCallback(
    (state) => {
      if (state.status === 'completed') navigate('/result', { replace: true });
      else setView(ready(state));
    },
    [navigate],
  );

  const fail = useCallback((err) => {
    if (err instanceof ApiError && err.sessionLost) {
      clearSession();
      setView({ phase: 'lost', message: err.status === 410 ? err.message : 'This test session could not be found.' });
    } else {
      setView({ phase: 'error', message: err instanceof ApiError ? err.message : 'Something went wrong.' });
    }
  }, []);

  const load = useCallback(() => {
    if (!session) return;
    setView({ phase: 'loading' });
    api.state(session).then(accept).catch(fail);
  }, [session, accept, fail]);

  useEffect(() => {
    if (!session) navigate('/', { replace: true });
    else load();
  }, [session, load, navigate]);

  const choose = useCallback(
    async (choice) => {
      if (!session || view.phase !== 'ready' || busy.current) return;
      busy.current = true;
      setSelected(choice);
      setSaveError(null);
      try {
        const [next] = await Promise.all([
          api.answer(session, { index: view.state.index, choice }),
          new Promise((resolve) => setTimeout(resolve, FEEDBACK_MS)),
        ]);
        accept(next);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          // The server is ahead of this tab (retry after a dropped response,
          // or the test is open twice). Catch up with what it has.
          await api.state(session).then(accept).catch(fail);
        } else if (err instanceof ApiError && err.sessionLost) {
          fail(err);
        } else {
          // Keep the question on screen so the answer can simply be picked again.
          setSaveError(err instanceof ApiError ? err.message : 'Your answer could not be saved. Please try again.');
        }
      } finally {
        busy.current = false;
        setSelected(null);
      }
    },
    [session, view, accept, fail],
  );

  // Keyboard: A-H or 1-8 pick an option.
  const optionCount = view.phase === 'ready' ? (view.state.question?.options.length ?? 0) : 0;
  useEffect(() => {
    if (optionCount === 0) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const key = e.key.toUpperCase();
      const byLetter = OPTION_KEYS.indexOf(key);
      const index = byLetter >= 0 ? byLetter : /^[1-8]$/.test(key) ? Number(key) - 1 : -1;
      if (index >= 0 && index < optionCount) {
        e.preventDefault();
        void choose(index);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [optionCount, choose]);

  if (view.phase === 'loading') {
    return (
      <Shell>
        <p className="status" role="status">
          Loading your test...
        </p>
      </Shell>
    );
  }

  if (view.phase === 'lost' || view.phase === 'error') {
    return (
      <Shell>
        <div className="status" role="alert">
          <h1>{view.phase === 'lost' ? 'This test has ended' : "We couldn't load your test"}</h1>
          <p>{view.message}</p>
          {view.phase === 'lost' ? (
            <Link className="button button--primary" to="/">
              Start a new test
            </Link>
          ) : (
            <button className="button button--primary" type="button" onClick={load}>
              Try again
            </button>
          )}
        </div>
      </Shell>
    );
  }

  const { state, clockOffset } = view;
  const question = state.question;
  if (!question) return null; // completed: `accept` is already navigating to the result

  const visual = question.prompt.kind !== 'text';

  return (
    <Shell
      meta={<Progress index={state.index} total={state.total} startedAt={state.startedAt} clockOffset={clockOffset} />}
      progress={state.index / state.total}
    >
      {/* Re-keyed per question so each one animates in and focus/scroll reset. */}
      <main className={`stage ${visual ? 'stage--split' : 'stage--stack'}`} key={state.index}>
        <section className="question">
          <h1 className="question__text">{question.prompt.text}</h1>
          {question.prompt.kind === 'text' ? (
            question.prompt.body && (
              <p className="question__body" data-long={question.prompt.body.length > 44 || undefined}>
                {question.prompt.body}
              </p>
            )
          ) : (
            <PromptView prompt={question.prompt} />
          )}
        </section>

        <section className="answers">
          {visual && <h2 className="answers__title">Choose your answer</h2>}
          <Options
            options={question.options}
            selected={selected}
            disabled={selected !== null}
            onSelect={(c) => void choose(c)}
            pieces={question.prompt.kind === 'pattern'}
          />
          {saveError && (
            <p className="notice notice--error" role="alert">
              {saveError}
            </p>
          )}
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children, meta, progress }) {
  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__row">
          <Brand />
          {meta}
        </div>
        {progress !== undefined && (
          <div className="progress" aria-hidden="true">
            <div className="progress__bar" style={{ transform: `scaleX(${progress})` }} />
          </div>
        )}
      </header>
      {children}
    </div>
  );
}

function Progress({ index, total, startedAt, clockOffset }) {
  const elapsed = useElapsed(new Date(startedAt).getTime(), clockOffset);
  return (
    <div className="meta">
      <span className="meta__count" aria-live="polite">
        <span className="visually-hidden">Question </span>
        <strong>{index + 1}</strong> of {total}
      </span>
      <span className="meta__clock" role="timer" aria-label="Time elapsed">
        {formatClock(elapsed)}
      </span>
    </div>
  );
}
