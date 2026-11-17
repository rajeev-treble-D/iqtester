export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'IQ Test';

/** Question categories in display order. Mirrors the server's list (server/src/schemas/constants.js). */
export const CATEGORIES = ['pattern', 'matrix', 'series', 'spatial', 'logic'];

export const CATEGORY_LABELS = {
  pattern: { name: 'Pattern recognition', blurb: 'Spot what continues a visual pattern.' },
  matrix: { name: 'Abstract reasoning', blurb: 'Work out the rule that links a grid of figures.' },
  series: { name: 'Numerical reasoning', blurb: 'Find the rule behind a sequence of numbers.' },
  spatial: { name: 'Spatial reasoning', blurb: 'Turn and compare shapes in your head.' },
  logic: { name: 'Logical reasoning', blurb: 'Draw the conclusion that has to follow.' },
};
