export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'IQ Test';

/** Names of the skills a result reports on. Mirrors AREAS in server/src/schemas/constants.js. */
export const AREA_LABELS = {
  pattern: 'Pattern recognition',
  matrix: 'Abstract reasoning',
  series: 'Numerical reasoning',
  spatial: 'Spatial reasoning',
  logic: 'Logical reasoning',
  strategy: 'Strategic thinking',
  rootcause: 'Root cause analysis',
  memory: 'Memory',
};
