import { useId } from 'react';

/**
 * Renders a figure spec as SVG.
 *
 * Every value from the API is mapped to an SVG attribute through React - no
 * markup is ever injected - so question data can't carry script into the page.
 * Colours come from CSS variables, which is why figures follow the theme.
 */

const DEFAULT_STROKE = 3;

function vertices(cx, cy, r, n, rot = 0, innerRatio) {
  const count = innerRatio === undefined ? n : n * 2;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const radius = innerRatio !== undefined && i % 2 === 1 ? r * innerRatio : r;
    const angle = ((rot - 90) * Math.PI) / 180 + (i * 2 * Math.PI) / count;
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function paint(fill, hatchId) {
  switch (fill) {
    case 'solid':
      return 'currentColor';
    case 'tint':
      return 'var(--fig-tint)';
    case 'hatch':
      return `url(#${hatchId})`;
    default:
      return 'none';
  }
}

function ShapeEl({ shape: s, hatchId }) {
  const stroke = {
    stroke: 'currentColor',
    strokeWidth: s.sw ?? DEFAULT_STROKE,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  };

  switch (s.t) {
    case 'circle':
      return <circle cx={s.cx} cy={s.cy} r={s.r} fill={paint(s.fill, hatchId)} {...stroke} />;
    case 'rect':
      return (
        <rect
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          transform={s.rot ? `rotate(${s.rot} ${s.x + s.w / 2} ${s.y + s.h / 2})` : undefined}
          fill={paint(s.fill, hatchId)}
          {...stroke}
        />
      );
    case 'ngon':
      return <polygon points={vertices(s.cx, s.cy, s.r, s.n, s.rot)} fill={paint(s.fill, hatchId)} {...stroke} />;
    case 'star':
      return <polygon points={vertices(s.cx, s.cy, s.r, s.n, s.rot, 0.45)} fill={paint(s.fill, hatchId)} {...stroke} />;
    case 'line':
      return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...stroke} />;
    case 'poly': {
      const points = s.pts.map(([x, y]) => `${x},${y}`).join(' ');
      return s.closed ? (
        <polygon points={points} fill={paint(s.fill, hatchId)} {...stroke} />
      ) : (
        <polyline points={points} fill={paint(s.fill, hatchId)} {...stroke} />
      );
    }
  }
}

export function FigureSvg({ figure, className, children }) {
  const hatchId = useId();
  const usesHatch = figure.shapes.some((s) => 'fill' in s && s.fill === 'hatch');
  return (
    <svg
      className={className}
      viewBox={`${figure.vx ?? 0} ${figure.vy ?? 0} ${figure.w} ${figure.h}`}
      aria-hidden="true"
      focusable="false"
    >
      {usesHatch && (
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="2" />
          </pattern>
        </defs>
      )}
      {figure.shapes.map((shape, i) => (
        <ShapeEl key={i} shape={shape} hatchId={hatchId} />
      ))}
      {children}
    </svg>
  );
}
