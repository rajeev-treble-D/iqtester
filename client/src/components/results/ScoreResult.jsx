import { AREA_LABELS } from '../../lib/brand';
import { formatClock } from '../../lib/time';
import { Bar, Radar } from '../Charts';

const LOW = 55;
const HIGH = 145;

function band(score) {
  if (score >= 130) return 'Very high';
  if (score >= 120) return 'High';
  if (score >= 110) return 'Above average';
  if (score >= 90) return 'Average';
  if (score >= 80) return 'Below average';
  return 'Well below average';
}

/** The normal distribution of scores (mean 100, SD 15), with a marker at this result. */
function Curve({ score }) {
  const W = 560;
  const H = 150;
  const x = (s) => ((s - LOW) / (HIGH - LOW)) * W;
  const y = (s) => H - 22 - Math.exp(-0.5 * ((s - 100) / 15) ** 2) * (H - 40);
  const points = [];
  for (let s = LOW; s <= HIGH; s += 1) points.push(`${x(s).toFixed(1)},${y(s).toFixed(1)}`);
  const shaded = points.filter((_, i) => LOW + i <= score);
  const marker = Math.min(HIGH, Math.max(LOW, score));

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

/**
 * Result of a quiz with right/wrong answers: a score on the IQ scale, the
 * percentile and a breakdown by skill. The General quiz adds a profile, a
 * mindset and style snapshot, and what to take next.
 */
export function ScoreResult({ result, onStart, starting }) {
  const general = result.kind === 'general';
  return (
    <>
      <section className="score" aria-labelledby="score-title">
        <p className="eyebrow" id="score-title">
          {result.scoreLabel}
        </p>
        <p className="score__value">{result.score}</p>
        <p className="score__band">{band(result.score)}</p>
        <Curve score={result.score} />
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

      {general && (
        <section className="panel" aria-labelledby="profile">
          <h2 id="profile">Your profile</h2>
          <Radar axes={result.profile} />
          <p className="panel__note">
            Further out is stronger. The three thinking skills come from your answers; the other four from how you
            rated your own study habits.
          </p>
        </section>
      )}

      <section className="panel" aria-labelledby="breakdown">
        <h2 id="breakdown">By skill</h2>
        <ul className="bars">
          {result.areas.map(({ area, correct, total, level }) => (
            <li key={area}>
              <span className="bars__name">{AREA_LABELS[area] ?? area}</span>
              <Bar value={level} />
              <span className="bars__value">
                {correct} of {total}
              </span>
            </li>
          ))}
        </ul>
        <p className="panel__note">
          The bar is your standing in that skill, not the share you got right: the quiz gave you harder questions when
          you answered correctly, and those count for more.
        </p>
      </section>

      {general && result.mindset.length > 0 && (
        <section className="panel" aria-labelledby="mindset">
          <h2 id="mindset">Study mindset</h2>
          <dl className="pairs">
            {result.mindset.map((m) => (
              <div key={m.trait}>
                <dt>{m.label}</dt>
                <dd data-band={m.band}>{m.headline}</dd>
              </div>
            ))}
          </dl>
          <p className="panel__note">A first impression from two statements each. The full quizzes are more reliable.</p>
        </section>
      )}

      {general && result.styles.length > 0 && (
        <section className="panel" aria-labelledby="styles">
          <h2 id="styles">Style snapshot</h2>
          <dl className="pairs">
            {result.styles.map((s) => (
              <div key={s.id}>
                <dt>{s.label}</dt>
                <dd>{s.lean ?? 'No clear lean yet'}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {general && result.recommend.length > 0 && (
        <section className="panel" aria-labelledby="next">
          <h2 id="next">What to take next</h2>
          <ul className="next">
            {result.recommend.map((r) => (
              <li key={r.quizId}>
                <div>
                  <strong>{r.title}</strong>
                  <p>{r.reason}</p>
                </div>
                <button
                  className="button"
                  type="button"
                  onClick={() => onStart({ id: r.quizId, group: r.group })}
                  disabled={starting !== null}
                >
                  {starting === r.quizId ? 'Starting...' : 'Start'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="fineprint">
        This score is an estimate for your own interest, not a clinical assessment. A short online quiz can vary by
        several points from one sitting to the next.
      </p>
    </>
  );
}
