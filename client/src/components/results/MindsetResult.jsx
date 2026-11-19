import { Bar } from '../Charts';

const BAND_LABEL = { low: 'Low', moderate: 'Moderate', high: 'High' };

/** Result of an agree/disagree quiz: how strongly the difficulty shows, what is behind it, and where to start. */
export function MindsetResult({ result }) {
  const [first, second] = result.facets;
  // With little showing overall there is nothing to "fix": one pointer is enough.
  const tips = result.band === 'low' ? [first] : [first, second];

  return (
    <>
      <section className="score" aria-labelledby="mindset-title">
        <p className="eyebrow" id="mindset-title">
          {result.label}
        </p>
        <p className="score__headline">{result.headline}</p>
        <p className="lede">{result.summary}</p>
        <div className="meter" data-band={result.band}>
          <div className="meter__track" aria-hidden="true">
            <div className="meter__fill" style={{ width: `${result.concern}%` }} />
          </div>
          <div className="meter__scale" aria-hidden="true">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
          <p className="visually-hidden">
            {BAND_LABEL[result.band]}: {result.concern} out of 100.
          </p>
        </div>
      </section>

      {result.support && (
        <p className="notice notice--care" role="note">
          {result.support}
        </p>
      )}

      <section className="panel" aria-labelledby="behind">
        <h2 id="behind">What is behind it</h2>
        <ul className="bars">
          {result.facets.map((facet, i) => (
            <li key={facet.id}>
              <span className="bars__name">
                {facet.label}
                {i === 0 && facet.concern > 0 && <span className="tag">Highest</span>}
              </span>
              <Bar value={facet.concern} tone={result.band === 'low' ? undefined : 'warm'} />
              <span className="bars__value">{facet.concern}</span>
            </li>
          ))}
        </ul>
        <p className="panel__note">Each bar runs from 0 (does not show at all) to 100 (shows very strongly).</p>
      </section>

      <section className="panel" aria-labelledby="start">
        <h2 id="start">Where to start</h2>
        <dl className="tips">
          {tips.map((facet) => (
            <div key={facet.id}>
              <dt>{facet.label}</dt>
              <dd>{facet.tip}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="fineprint">
        This is a tool for reflecting on your own answers, not a diagnosis. How you feel can change from week to week.
      </p>
    </>
  );
}
