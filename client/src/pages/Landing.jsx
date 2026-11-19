import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import { Brand } from '../components/Brand';
import { clearSession, loadLevel, loadSessions } from '../lib/session';
import { useStartQuiz } from '../lib/start';

const length = (quiz) => `${quiz.questions} questions, about ${quiz.minutes} min`;

/** The home page: the General quiz up front, then every other quiz by group. */
export function Landing() {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState(null);
  const [loadError, setLoadError] = useState(null);
  // Where the visitor stands in each quiz they have started on this device.
  const [progress, setProgress] = useState({});
  const { start, starting, error } = useStartQuiz();

  useEffect(() => {
    let cancelled = false;
    api
      .quizzes()
      .then((value) => !cancelled && setCatalogue(value))
      .catch((err) => !cancelled && setLoadError(err instanceof ApiError ? err.message : 'Something went wrong.'));

    for (const [quizId, session] of Object.entries(loadSessions())) {
      api
        .state(session)
        .then((state) => !cancelled && setProgress((all) => ({ ...all, [quizId]: state })))
        .catch((err) => {
          if (err instanceof ApiError && err.sessionLost) clearSession(quizId);
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const actions = (quiz, primaryLabel) => {
    const state = progress[quiz.id];
    const busy = starting !== null;
    if (state?.status === 'in_progress') {
      return (
        <>
          <button className="button button--primary" type="button" onClick={() => navigate(`/quiz/${quiz.id}`)}>
            Continue at question {state.number} of {state.count}
          </button>
          <button className="button" type="button" onClick={() => start(quiz)} disabled={busy}>
            Start over
          </button>
        </>
      );
    }
    if (state?.status === 'completed') {
      return (
        <>
          <button className="button button--primary" type="button" onClick={() => navigate(`/quiz/${quiz.id}/result`)}>
            View your result
          </button>
          <button className="button" type="button" onClick={() => start(quiz)} disabled={busy}>
            Take it again
          </button>
        </>
      );
    }
    return (
      <button className="button button--primary" type="button" onClick={() => start(quiz)} disabled={busy}>
        {starting === quiz.id ? 'Starting...' : primaryLabel}
      </button>
    );
  };

  const general = catalogue?.quizzes.find((quiz) => quiz.group === 'general');
  const knownLevel = loadLevel() !== null;

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__row">
          <Brand />
        </div>
      </header>

      <main className="landing landing--wide">
        <section className="hero">
          <p className="eyebrow">Start here</p>
          <h1>See how you think, remember and decide.</h1>
          <p className="lede">
            {general
              ? `The General quiz covers everything in one sitting: ${length(general)}.`
              : 'The General quiz covers everything in one sitting.'}{' '}
            No sign-up. Afterwards it suggests which of the shorter quizzes to take next.
          </p>
          {general && <div className="hero__actions">{actions(general, 'Start the General quiz')}</div>}
          {(error || loadError) && (
            <p className="notice notice--error" role="alert">
              {error ?? loadError}
            </p>
          )}
        </section>

        {!catalogue && !loadError && (
          <p className="status" role="status">
            Loading quizzes...
          </p>
        )}

        {catalogue?.groups.map((group) => (
          <section className="group" key={group.id} aria-labelledby={`group-${group.id}`}>
            <div className="group__head">
              <h2 id={`group-${group.id}`}>{group.title}</h2>
              <p>
                {group.blurb}
                {group.id === 'ability' && knownLevel && ' Difficulty starts from your General quiz result.'}
              </p>
            </div>
            <div className="cards">
              {catalogue.quizzes
                .filter((quiz) => quiz.group === group.id)
                .map((quiz) => (
                  <article className="card" key={quiz.id} data-done={progress[quiz.id]?.status === 'completed' || undefined}>
                    <h3>{quiz.title}</h3>
                    <p className="card__blurb">{quiz.blurb}</p>
                    <p className="card__meta">{length(quiz)}</p>
                    <div className="card__actions">{actions(quiz, 'Start')}</div>
                  </article>
                ))}
            </div>
          </section>
        ))}

        <section className="panel" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ul className="rules">
            <li>One question at a time. Pick an answer to move on. You can't go back.</li>
            <li>
              Quizzes with right and wrong answers first ask how you rate yourself. That sets the starting difficulty;
              after that, questions get harder when you answer correctly and easier when you don't.
            </li>
            <li>
              Now and then you are shown a word or a number sequence to remember. You will be asked about it later.
            </li>
            <li>Your time is shown but doesn't change your score.</li>
            <li>Closed the tab by accident? Come back on this device and continue where you left off.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
