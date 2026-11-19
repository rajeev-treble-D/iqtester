import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import { Brand } from '../components/Brand';
import { MindsetResult } from '../components/results/MindsetResult';
import { ScoreResult } from '../components/results/ScoreResult';
import { StyleResult } from '../components/results/StyleResult';
import { clearSession, loadSession, saveLevel } from '../lib/session';
import { useStartQuiz } from '../lib/start';

export function Result() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { start, starting, error: startError } = useStartQuiz();

  useEffect(() => {
    const session = loadSession(quizId);
    if (!session) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    setResult(null);
    api
      .result(session)
      .then((value) => {
        if (cancelled) return;
        // Later quizzes start at the difficulty reached here.
        if (value.kind === 'general') saveLevel(value.level);
        setResult(value);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'attempt_not_completed') navigate(`/quiz/${quizId}`, { replace: true });
        else if (err instanceof ApiError && err.sessionLost) {
          clearSession(quizId);
          navigate('/', { replace: true });
        } else setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, quizId]);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__row">
          <Link className="brand-link" to="/" aria-label="All quizzes">
            <Brand />
          </Link>
          {result && <span className="meta">{result.title}</span>}
        </div>
      </header>

      <main className="result">
        {(error || startError) && (
          <p className="notice notice--error" role="alert">
            {error ?? startError}
          </p>
        )}
        {!result && !error && (
          <p className="status" role="status">
            Working out your result...
          </p>
        )}
        {result && (
          <>
            {result.kind === 'style' ? (
              <StyleResult result={result} />
            ) : result.kind === 'mindset' ? (
              <MindsetResult result={result} />
            ) : (
              <ScoreResult result={result} onStart={start} starting={starting} />
            )}

            <div className="hero__actions">
              <Link className="button button--primary" to="/">
                All quizzes
              </Link>
              <button
                className="button"
                type="button"
                onClick={() => start({ id: quizId, group: result.kind })}
                disabled={starting !== null}
              >
                {starting === quizId ? 'Starting...' : 'Take it again'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
