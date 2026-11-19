/**
 * A radar chart of 0-100 values. An axis whose value is null is drawn hollow
 * at the midpoint: something not measured yet.
 */
export function Radar({ axes }) {
  const W = 380;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R = 104;
  const n = axes.length;

  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const at = (i, share) => [cx + Math.cos(angle(i)) * R * share, cy + Math.sin(angle(i)) * R * share];
  const ring = (share) => axes.map((_, i) => at(i, share).map((v) => v.toFixed(1)).join(',')).join(' ');
  const share = (axis) => (axis.value === null ? 0.5 : Math.max(0.06, axis.value / 100));

  return (
    <svg
      className="radar"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={axes
        .map((a) => `${a.label}: ${a.value === null ? 'not measured yet' : `${a.value} out of 100`}`)
        .join('. ')}
    >
      {[1 / 3, 2 / 3, 1].map((s) => (
        <polygon className="radar__ring" key={s} points={ring(s)} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = at(i, 1);
        return <line className="radar__spoke" key={i} x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <polygon
        className="radar__shape"
        points={axes.map((a, i) => at(i, share(a)).map((v) => v.toFixed(1)).join(',')).join(' ')}
      />
      {axes.map((a, i) => {
        const [x, y] = at(i, share(a));
        return <circle className={a.value === null ? 'radar__dot radar__dot--open' : 'radar__dot'} key={a.id} cx={x} cy={y} r="5" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = at(i, 1.16);
        const cos = Math.cos(angle(i));
        return (
          <text
            className="radar__label"
            key={a.id}
            x={x}
            y={y}
            textAnchor={Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end'}
            dominantBaseline="central"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

/** A half-circle gauge for a 0-100 value, with the number in the middle. */
export function Gauge({ value, startLabel, endLabel }) {
  const W = 260;
  const R = 104;
  const cx = W / 2;
  const cy = 122;
  const share = Math.min(1, Math.max(0, value / 100));
  const length = Math.PI * R;
  const arc = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;

  return (
    <svg className="gauge" viewBox={`0 0 ${W} 150`} aria-hidden="true">
      <path className="gauge__track" d={arc} />
      <path className="gauge__fill" d={arc} strokeDasharray={`${(share * length).toFixed(1)} ${length.toFixed(1)}`} />
      <text className="gauge__value" x={cx} y={cy - 18} textAnchor="middle">
        {value}
        <tspan className="gauge__unit">%</tspan>
      </text>
      {startLabel && (
        <text className="gauge__end" x={cx - R} y={cy + 22} textAnchor="middle">
          {startLabel}
        </text>
      )}
      {endLabel && (
        <text className="gauge__end" x={cx + R} y={cy + 22} textAnchor="middle">
          {endLabel}
        </text>
      )}
    </svg>
  );
}

/** A horizontal bar for a 0-100 value. */
export function Bar({ value, tone }) {
  return (
    <span className="bars__track" aria-hidden="true">
      <span className="bars__fill" data-tone={tone} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}
