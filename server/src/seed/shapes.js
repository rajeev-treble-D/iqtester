/**
 * Small drawing toolkit for authoring visual questions in code.
 *
 * Everything here runs at authoring time and produces plain figure data
 * (see src/schemas/figure.js). Rotations and mirror images are computed here,
 * so the stored figure is just absolute geometry and the browser renderer
 * stays trivial.
 */

const round = (n) => Math.round(n * 100) / 100;

/** A standard 100 x 100 cell. */
export const fig = (...shapes) => ({ w: 100, h: 100, shapes });

export const circle = (cx, cy, r, s = {}) => ({ t: 'circle', cx, cy, r, ...s });
export const dot = (cx, cy, r = 5) => circle(cx, cy, r, { fill: 'solid', sw: 0 });
export const square = (cx, cy, half, s = {}) => ({
  t: 'rect',
  x: cx - half,
  y: cy - half,
  w: half * 2,
  h: half * 2,
  ...s,
});
export const ngon = (n, cx, cy, r, s = {}) => ({
  t: 'ngon',
  n,
  cx,
  cy,
  r,
  ...s,
});
export const tri = (cx, cy, r, s = {}) => ngon(3, cx, cy, r, s);
export const line = (x1, y1, x2, y2, sw) => ({
  t: 'line',
  x1,
  y1,
  x2,
  y2,
  ...(sw === undefined ? {} : { sw }),
});
export const poly = (pts, s = {}) => ({ t: 'poly', pts, ...s });

export const figureOption = (figure) => ({ kind: 'figure', figure });
export const textOption = (text) => ({ kind: 'text', text: String(text) });

/* ---------------------------------------------------------------- transforms */

/** Mirror and/or rotate shapes around `origin` (default: centre of a 100 x 100 cell). */
export function transform(shapes, { flip = false, rot = 0 }, origin = [50, 50]) {
  const [ox, oy] = origin;
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const move = ([x, y]) => {
    const dx = (flip ? -1 : 1) * (x - ox);
    const dy = y - oy;
    return [round(ox + dx * cos - dy * sin), round(oy + dx * sin + dy * cos)];
  };
  const turn = (own = 0) => (((flip ? -own : own) + rot) % 360 + 360) % 360;

  return shapes.map((s) => {
    switch (s.t) {
      case 'circle': {
        const [cx, cy] = move([s.cx, s.cy]);
        return { ...s, cx, cy };
      }
      case 'ngon':
      case 'star': {
        const [cx, cy] = move([s.cx, s.cy]);
        return { ...s, cx, cy, rot: turn(s.rot) };
      }
      case 'line': {
        const [x1, y1] = move([s.x1, s.y1]);
        const [x2, y2] = move([s.x2, s.y2]);
        return { ...s, x1, y1, x2, y2 };
      }
      case 'poly':
        return { ...s, pts: s.pts.map(move) };
      case 'rect': {
        // A turned rectangle is easiest to express as its four corners.
        const corners = [
          [s.x, s.y],
          [s.x + s.w, s.y],
          [s.x + s.w, s.y + s.h],
          [s.x, s.y + s.h],
        ];
        const own = transform([{ t: 'poly', pts: corners, closed: true }], { rot: s.rot ?? 0 }, [
          s.x + s.w / 2,
          s.y + s.h / 2,
        ])[0];
        return {
          t: 'poly',
          pts: own.pts.map(move),
          closed: true,
          ...(s.fill ? { fill: s.fill } : {}),
          ...(s.sw === undefined ? {} : { sw: s.sw }),
        };
      }
    }
  });
}

/* ---------------------------------------------------------------- block shapes */

/**
 * A figure made of unit squares (tetromino, pentomino...), centred in a
 * 100 x 100 cell. `rot` is in quarter turns clockwise; `flip` mirrors first.
 */
export function blocks(cells, { rot = 0, flip = false, unit = 20 } = {}) {
  let pts = cells.map(([x, y]) => [flip ? -x : x, y]);
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) {
    pts = pts.map(([x, y]) => [-y, x]);
  }
  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const cols = Math.max(...pts.map((p) => p[0])) - minX + 1;
  const rows = Math.max(...pts.map((p) => p[1])) - minY + 1;
  const left = (100 - cols * unit) / 2;
  const top = (100 - rows * unit) / 2;
  return fig(
    ...pts.map(
      ([x, y]) => ({
        t: 'rect',
        x: left + (x - minX) * unit,
        y: top + (y - minY) * unit,
        w: unit,
        h: unit,
        fill: 'tint',
        sw: 2.5,
      }),
    ),
  );
}

/* ---------------------------------------------------------------- pattern pieces */

function bounds(s) {
  switch (s.t) {
    case 'circle':
    case 'ngon':
    case 'star':
      return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    case 'rect':
      return { x: s.x, y: s.y, w: s.w, h: s.h };
    case 'line':
      return {
        x: Math.min(s.x1, s.x2),
        y: Math.min(s.y1, s.y2),
        w: Math.abs(s.x2 - s.x1) || 0.01,
        h: Math.abs(s.y2 - s.y1) || 0.01,
      };
    case 'poly': {
      const xs = s.pts.map((p) => p[0]);
      const ys = s.pts.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x || 0.01, h: Math.max(...ys) - y || 0.01 };
    }
  }
}

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** A window onto a larger pattern: what you would see through `rect`. */
export function windowOf(shapes, rect) {
  return {
    w: rect.w,
    h: rect.h,
    vx: rect.x,
    vy: rect.y,
    shapes: shapes.filter((s) => overlaps(bounds(s), rect)),
  };
}

/**
 * Remove whatever lies under the cut-out, so the pattern sent to the browser
 * really is missing that piece (straight lines are trimmed at the edge).
 */
export function cutOut(shapes, hole) {
  const inside = (x, y) => x > hole.x && x < hole.x + hole.w && y > hole.y && y < hole.y + hole.h;
  return shapes.flatMap((s) => {
    if (s.t === 'circle' && s.fill === 'solid') return inside(s.cx, s.cy) ? [] : [s];
    if (s.t !== 'line') return [s];

    // Liang-Barsky: find the part of the segment inside the hole, keep the rest.
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    let t0 = 0;
    let t1 = 1;
    const edges = [
      [-dx, s.x1 - hole.x],
      [dx, hole.x + hole.w - s.x1],
      [-dy, s.y1 - hole.y],
      [dy, hole.y + hole.h - s.y1],
    ];
    for (const [p, q] of edges) {
      if (p === 0) {
        if (q < 0) return [s];
        continue;
      }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
    if (t0 >= t1) return [s];
    const at = (t) => [round(s.x1 + dx * t), round(s.y1 + dy * t)];
    const parts = [];
    if (t0 > 0) parts.push({ ...s, x2: at(t0)[0], y2: at(t0)[1] });
    if (t1 < 1) parts.push({ ...s, x1: at(t1)[0], y1: at(t1)[1] });
    return parts;
  });
}
