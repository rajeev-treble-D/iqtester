import { Schema, model } from 'mongoose';
import { CATEGORIES } from '../schemas/index.js';

export const QUESTION_STATUSES = ['draft', 'active', 'retired'];

const questionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, immutable: true },
    category: { type: String, required: true, enum: CATEGORIES },
    difficulty: { type: Number, required: true, min: 1, max: 5 },
    // Prompt / option content are nested unions validated by the zod schema
    // (src/schemas/question.js) before every write (seed script, future admin API).
    prompt: { type: Schema.Types.Mixed, required: true },
    options: {
      type: [
        new Schema(
          { id: { type: String, required: true }, content: { type: Schema.Types.Mixed, required: true } },
          { _id: false },
        ),
      ],
      required: true,
    },
    answerId: { type: String, required: true },
    irt: {
      a: { type: Number, required: true },
      b: { type: Number, required: true },
      c: { type: Number, required: true },
    },
    status: { type: String, enum: QUESTION_STATUSES, default: 'active' },
    version: { type: Number, default: 1 },
    stats: {
      shown: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
    },
  },
  { timestamps: true, minimize: false },
);

questionSchema.index({ status: 1, category: 1, difficulty: 1 });

export const Question = model('Question', questionSchema);
