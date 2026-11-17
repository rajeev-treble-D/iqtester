import { z } from 'zod';
import { CATEGORIES } from './constants.js';
import { figureSchema, rectSchema } from './figure.js';

/** What an answer option shows. */
export const contentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('text'), text: z.string().min(1).max(200) }),
  z.strictObject({ kind: z.literal('figure'), figure: figureSchema }),
]);

const instruction = z.string().min(1).max(200);

/** What the question itself shows. Every kind carries a one-line instruction. */
export const promptSchema = z.discriminatedUnion('kind', [
  /** Text only: number series, verbal logic. `body` holds the series / premises. */
  z.strictObject({
    kind: z.literal('text'),
    text: instruction,
    body: z.string().min(1).max(600).optional(),
  }),
  /** Grid of figures with exactly one missing cell (`null`). A 1-row grid is a sequence. */
  z.strictObject({
    kind: z.literal('matrix'),
    text: instruction,
    cols: z.number().int().min(2).max(6),
    cells: z.array(figureSchema.nullable()).min(3).max(25),
  }),
  /** A continuous pattern with a piece cut out. */
  z.strictObject({
    kind: z.literal('pattern'),
    text: instruction,
    figure: figureSchema,
    hole: rectSchema,
  }),
  /** A single reference figure (mental rotation, mirror, assembly...). */
  z.strictObject({ kind: z.literal('figure'), text: instruction, figure: figureSchema }),
]);

export const irtSchema = z.strictObject({
  /** Discrimination: how sharply the item separates ability levels. */
  a: z.number().min(0.2).max(3),
  /** Difficulty on the ability (theta) scale; 0 = average test taker. */
  b: z.number().min(-4).max(4),
  /** Guessing floor, normally 1 / number of options. */
  c: z.number().min(0).max(0.5),
});

export const optionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]{1,8}$/),
  content: contentSchema,
});

/** A question as authored and stored. `answerId` must never reach the browser. */
export const questionSchema = z
  .strictObject({
    key: z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/),
    category: z.enum(CATEGORIES),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    prompt: promptSchema,
    options: z.array(optionSchema).min(3).max(8),
    answerId: z.string(),
    irt: irtSchema,
  })
  .superRefine((q, ctx) => {
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'option ids must be unique', path: ['options'] });
    }
    if (!ids.includes(q.answerId)) {
      ctx.addIssue({ code: 'custom', message: 'answerId must match an option id', path: ['answerId'] });
    }
    if (q.prompt.kind === 'matrix') {
      const missing = q.prompt.cells.filter((c) => c === null).length;
      if (missing !== 1) {
        ctx.addIssue({ code: 'custom', message: 'matrix needs exactly one missing cell', path: ['prompt', 'cells'] });
      }
      if (q.prompt.cells.length % q.prompt.cols !== 0) {
        ctx.addIssue({ code: 'custom', message: 'matrix cells must fill whole rows', path: ['prompt', 'cells'] });
      }
    }
  });
