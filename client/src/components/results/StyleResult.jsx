import { Bar } from '../Charts';

/** One dimension with two ends, e.g. bold - careful: a single bar split between them. */
function Lean({ dimension }) {
  const [left, right] = dimension.options;
  const top = dimension.options.find((o) => o.id === dimension.top);
  return (
    <section className="panel" aria-label={dimension.label}>
      <h2>{dimension.label}</h2>
      <div className="lean">
        <span className="lean__end" data-top={left.id === dimension.top || undefined}>
          {left.label} <small>{left.count}</small>
        </span>
        <span className="lean__track" aria-hidden="true">
          <span className="lean__fill" style={{ width: `${dimension.total ? left.share : 50}%` }} />
        </span>
        <span className="lean__end" data-top={right.id === dimension.top || undefined}>
          <small>{right.count}</small> {right.label}
        </span>
      </div>
      {top ? (
        <>
          <p>{top.text}</p>
          <p className="panel__note">
            <strong>Watch for:</strong> {top.tip}
          </p>
        </>
      ) : (
        <p>You went each way equally often, so this depends on the situation for you.</p>
      )}
    </section>
  );
}

/** One dimension with several types: a bar per type, most picked first. */
function Types({ dimension }) {
  const ranked = [...dimension.options].sort((a, b) => b.count - a.count);
  return (
    <>
      <section className="panel" aria-label={dimension.label}>
        <h2>How often you chose each approach</h2>
        <ul className="bars">
          {ranked.map((o) => (
            <li key={o.id}>
              <span className="bars__name">{o.label}</span>
              <Bar value={o.share} />
              <span className="bars__value">
                {o.count} of {dimension.total}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel" aria-label="What the approaches mean">
        <h2>What they mean</h2>
        <dl className="tips">
          {ranked
            .filter((o) => o.count > 0)
            .map((o) => (
              <div key={o.id}>
                <dt>{o.label}</dt>
                <dd>
                  {o.text} <span className="tips__watch">Watch for: {o.tip}</span>
                </dd>
              </div>
            ))}
        </dl>
      </section>
    </>
  );
}

export function StyleResult({ result }) {
  return (
    <>
      <section className="score" aria-labelledby="style-title">
        <p className="eyebrow" id="style-title">
          {result.title}
        </p>
        <p className="score__headline">{result.headline}</p>
        <p className="lede">{result.summary}</p>
      </section>

      {result.dimensions.map((dimension) =>
        dimension.options.length === 2 ? (
          <Lean dimension={dimension} key={dimension.id} />
        ) : (
          <Types dimension={dimension} key={dimension.id} />
        ),
      )}

      <p className="fineprint">
        There are no right or wrong styles. This describes how you answered today, and most people change with the
        situation.
      </p>
    </>
  );
}
