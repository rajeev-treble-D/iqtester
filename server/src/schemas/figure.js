import { z } from 'zod';
import { FILLS } from './constants.js';

/**
 * Figure spec: a small, declarative description of a drawing.
 *
 * Visual questions are stored as data (not image files) and rendered to SVG by
 * the client. That keeps the question bank tiny, crisp at any size, themeable,
 * and lets us generate item variants in code. The renderer only ever maps these
 * fields to SVG attributes - no markup from the database is injected.
 */

const coord = z.number().min(-2000).max(2000);
const size = z.number().positive().max(2000);
const angle = z.number().min(-360).max(360);

const style = {
  /** Interior fill. Defaults to `none`. */
  fill: z.enum(FILLS).optional(),
  /** Stroke width in figure units. Defaults to 3; 0 hides the outline. */
  sw: z.number().min(0).max(24).optional(),
};

export const shapeSchema = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('circle'), cx: coord, cy: coord, r: size, ...style }),
  /** Axis-aligned rectangle; `rot` rotates it around its own centre. */
  z.strictObject({
    t: z.literal('rect'),
    x: coord,
    y: coord,
    w: size,
    h: size,
    rot: angle.optional(),
    ...style,
  }),
  /** Regular polygon with `n` sides; at rot 0 one vertex points straight up. */
  z.strictObject({
    t: z.literal('ngon'),
    cx: coord,
    cy: coord,
    r: size,
    n: z.number().int().min(3).max(12),
    rot: angle.optional(),
    ...style,
  }),
  z.strictObject({
    t: z.literal('star'),
    cx: coord,
    cy: coord,
    r: size,
    n: z.number().int().min(4).max(10),
    rot: angle.optional(),
    ...style,
  }),
  z.strictObject({
    t: z.literal('line'),
    x1: coord,
    y1: coord,
    x2: coord,
    y2: coord,
    sw: style.sw,
  }),
  /** Free polygon / polyline in absolute figure coordinates. */
  z.strictObject({
    t: z.literal('poly'),
    pts: z
      .array(z.tuple([coord, coord]))
      .min(2)
      .max(64),
    closed: z.boolean().optional(),
    ...style,
  }),
]);

export const rectSchema = z.strictObject({ x: coord, y: coord, w: size, h: size });

export const figureSchema = z.strictObject({
  /** Width / height of the drawing area (SVG viewBox size). */
  w: size,
  h: size,
  /** Optional viewBox origin, used to show a window onto a larger pattern. */
  vx: coord.optional(),
  vy: coord.optional(),
  shapes: z.array(shapeSchema).max(400),
});
