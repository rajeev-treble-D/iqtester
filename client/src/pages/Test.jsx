import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import { Brand } from '../components/Brand';
import { InfoScreen } from '../components/InfoScreen';
import { Memorize } from '../components/Memorize';
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
  const { quizId } = useParams();
  const session = useMemo(() => loadSession(quizId), [quizId]);
  const [view, setView] = useState({ phase: 'loading' });
  const [selected, setSelected] = useState(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const busy = useRef(false);

  const accept = useCallback(
    (state) => {
      if (state.status === 'completed') navigate(`/quiz/${quizId}/result`, { replace: true });
      else setView(ready(state));
    },
    [navigate, quizId],
  );

  const fail = useCallback(
    (err) => {
      if (err instanceof ApiError && err.sessionLost) {
        clearSession(quizId);
        setView({ phase: 'lost', message: err.status === 410 ? err.message : 'This quiz session could not be found.' });
      } else {
        setView({ phase: 'error', message: err instanceof ApiError ? err.message : 'Something went wrong.' });
      }
    },
    [quizId],
  );

  const load = useCallback(() => {
    if (!session) return;
    setView({ phase: 'loading' });
    api.state(session).then(accept).catch(fail);
  }, [session, accept, fail]);

  useEffect(() => {
    if (!session) navigate('/', { replace: true });
    else load();
  }, [session, load, navigate]);

  /** Send the answer to the current step, or just move on when `choice` is left out. */
  const submit = useCallback(
    async (choice) => {
      if (!session || view.phase !== 'ready' || busy.current) return;
      busy.current = true;
      setPending(true);
      setSelected(choice ?? null);
      setSaveError(null);
      try {
        const [next] = await Promise.all([
          api.answer(session, choice === undefined ? { index: view.state.index } : { index: view.state.index, choice }),
          new Promise((resolve) => setTimeout(resolve, choice === undefined ? 0 : FEEDBACK_MS)),
        ]);
        accept(next);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          // The server is ahead of this tab (retry after a dropped response,
          // or the quiz is open twice). Catch up with what it has.
          await api.state(session).then(accept).catch(fail);
        } else if (err instanceof ApiError && err.sessionLost) {
          fail(err);
        } else {
          // Keep the step on screen so it can simply be tried again.
          setSaveError(err instanceof ApiError ? err.message : 'That could not be saved. Please try again.');
        }
      } finally {
        busy.current = false;
        setPending(false);
        setSelected(null);
      }
    },
    [session, view, accept, fail],
  );

  // Keyboard: A-H or 1-8 pick an option.
  const optionCount = view.phase === 'ready' ? (view.state.step?.options?.length ?? 0) : 0;
  useEffect(() => {
    if (optionCount === 0) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const key = e.key.toUpperCase();
      const byLetter = OPTION_KEYS.indexOf(key);
      const index = byLetter >= 0 ? byLetter : /^[1-8]$/.test(key) ? Number(key) - 1 : -1;
      if (index >= 0 && index < optionCount) {
        e.preventDefault();
        void submit(index);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [optionCount, submit]);

  if (view.phase === 'loading') {
    return (
      <Shell>
        <p className="status" role="status">
          Loading your quiz...
        </p>
      </Shell>
    );
  }

  if (view.phase === 'lost' || view.phase === 'error') {
    return (
      <Shell>
        <div className="status" role="alert">
          <h1>{view.phase === 'lost' ? 'This quiz has ended' : "We couldn't load your quiz"}</h1>
          <p>{view.message}</p>
          {view.phase === 'lost' ? (
            <Link className="button button--primary" to="/">
              Back to all quizzes
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
  const step = state.step;
  if (!step) return null; // completed: `accept` is already navigating to the result

  const error = saveError && (
    <p className="notice notice--error" role="alert">
      {saveError}
    </p>
  );
  const options = (extra) => (
    <Options
      options={step.options}
      selected={selected}
      disabled={pending}
      onSelect={(choice) => void submit(choice)}
      {...extra}
    />
  );

  let stage;
  if (step.kind === 'question') {
    const visual = step.prompt.kind !== 'text';
    stage = (
      <main className={`stage ${visual ? 'stage--split' : 'stage--stack'}`} key={state.index}>
        <section className="question">
          <h1 className="question__text">{step.prompt.text}</h1>
          {step.prompt.kind === 'text' ? (
            step.prompt.body && (
              <p className="question__body" data-long={step.prompt.body.length > 44 || undefined}>
                {step.prompt.body}
              </p>
            )
          ) : (
            <PromptView prompt={step.prompt} />
          )}
        </section>
        <section className="answers">
          {visual && <h2 className="answers__title">Choose your answer</h2>}
          {options({ pieces: step.prompt.kind === 'pattern' })}
          {error}
        </section>
      </main>
    );
  } else if (step.kind === 'statement' || step.kind === 'recall') {
    stage = (
      <main className="stage stage--stack" key={state.index}>
        <section className="question">
          {step.scale === 'likert' && <p className="eyebrow">How much do you agree?</p>}
          {step.scale === 'choice' && <p className="eyebrow">What would you do?</p>}
          {step.kind === 'recall' && <p className="eyebrow">Memory</p>}
          <h1 className="question__text">{step.text}</h1>
        </section>
        <section className="answers">
          {options({ scale: step.scale })}
          {error}
        </section>
      </main>
    );
  } else {
    stage = (
      <main className="stage stage--stack screen" key={state.index}>
        {step.kind === 'memorize' ? (
          <Memorize step={step} busy={pending} failed={Boolean(saveError)} onDone={() => void submit()} />
        ) : (
          <InfoScreen step={step} busy={pending} onContinue={() => void submit()} />
        )}
        {error}
      </main>
    );
  }

  return (
    <Shell
      meta={<Progress number={state.number} count={state.count} startedAt={state.startedAt} clockOffset={clockOffset} />}
      progress={state.index / state.total}
    >
      {/* Re-keyed per step so each one animates in and focus/scroll reset. */}
      {stage}
    </Shell>
  );
}

function Shell({ children, meta, progress }) {
  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__row">
          <Link className="brand-link" to="/" aria-label="All quizzes">
            <Brand />
          </Link>
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

function Progress({ number, count, startedAt, clockOffset }) {
  const elapsed = useElapsed(new Date(startedAt).getTime(), clockOffset);
  return (
    <div className="meta">
      <span className="meta__count" aria-live="polite">
        <span className="visually-hidden">Question </span>
        <strong>{number}</strong> of {count}
      </span>
      <span className="meta__clock" role="timer" aria-label="Time elapsed">
        {formatClock(elapsed)}
      </span>
    </div>
  );
}
