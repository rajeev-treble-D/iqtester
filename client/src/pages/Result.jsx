import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import { Brand } from '../components/Brand';
import { CATEGORY_LABELS } from '../lib/brand';
import { clearSession, loadSession } from '../lib/session';
import { formatClock } from '../lib/time';

const IQ_LOW = 55;
const IQ_HIGH = 145;

function band(iq) {
  if (iq >= 130) return 'Very high';
  if (iq >= 120) return 'High';
  if (iq >= 110) return 'Above average';
  if (iq >= 90) return 'Average';
  if (iq >= 80) return 'Below average';
  return 'Well below average';
}

/** The normal distribution of IQ scores, with a marker at this result. */
function Curve({ iq }) {
  const W = 560;
  const H = 150;
  const x = (score) => ((score - IQ_LOW) / (IQ_HIGH - IQ_LOW)) * W;
  const y = (score) => H - 22 - Math.exp(-0.5 * ((score - 100) / 15) ** 2) * (H - 40);
  const points = [];
  for (let score = IQ_LOW; score <= IQ_HIGH; score += 1) points.push(`${x(score).toFixed(1)},${y(score).toFixed(1)}`);
  const shaded = points.filter((_, i) => IQ_LOW + i <= iq);
  const marker = Math.min(IQ_HIGH, Math.max(IQ_LOW, iq));

  return (
    <svg className="curve" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polygon className="curve__below" points={`0,${H - 22} ${shaded.join(' ')} ${x(marker).toFixed(1)},${H - 22}`} />
      <polyline className="curve__line" points={points.join(' ')} />
      <line className="curve__axis" x1="0" y1={H - 22} x2={W} y2={H - 22} />
      <line className="curve__marker" x1={x(marker)} y1={y(marker) - 8} x2={x(marker)} y2={H - 22} />
      <circle className="curve__dot" cx={x(marker)} cy={y(marker)} r="5" />
      {[70, 85, 100, 115, 130].map((tick) => (
        <text className="curve__tick" key={tick} x={x(tick)} y={H - 5} textAnchor="middle">
          {tick}
        </text>
      ))}
    </svg>
  );
}

export function Result() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    api
      .result(session)
      .then((value) => !cancelled && setResult(value))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'attempt_not_completed') navigate('/test', { replace: true });
        else if (err instanceof ApiError && err.sessionLost) {
          clearSession();
          navigate('/', { replace: true });
        } else setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__row">
          <Brand />
        </div>
      </header>

      <main className="result">
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        {!result && !error && (
          <p className="status" role="status">
            Scoring your answers...
          </p>
        )}
        {result && (
          <>
            <section className="score" aria-labelledby="score-title">
              <p className="eyebrow" id="score-title">
                Your estimated IQ
              </p>
              <p className="score__value">{result.iq}</p>
              <p className="score__band">{band(result.iq)}</p>
              <Curve iq={result.iq} />
              <p className="lede">
                You scored higher than about <strong>{result.percentile}%</strong> of people.
              </p>
              <dl className="facts">
                <div>
                  <dt>Correct answers</dt>
                  <dd>
                    {result.correct} of {result.total}
                  </dd>
                </div>
                <div>
                  <dt>Time taken</dt>
                  <dd>{formatClock(result.durationMs)}</dd>
                </div>
              </dl>
            </section>

            <section className="panel" aria-labelledby="breakdown">
              <h2 id="breakdown">By skill</h2>
              <ul className="bars">
                {result.categories.map(({ category, correct, total }) => (
                  <li key={category}>
                    <span className="bars__name">{CATEGORY_LABELS[category].name}</span>
                    <span className="bars__track" aria-hidden="true">
                      <span className="bars__fill" style={{ width: `${total ? (correct / total) * 100 : 0}%` }} />
                    </span>
                    <span className="bars__value">
                      {correct} of {total}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="fineprint">
              This score is an estimate for your own interest, not a clinical assessment. A short online test can vary
              by several points from one sitting to the next.
            </p>

            <div className="hero__actions">
              <Link className="button" to="/" onClick={clearSession}>
                Take the test again
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
