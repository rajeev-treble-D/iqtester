import { Schema, model } from 'mongoose';
import { CATEGORIES } from '../schemas/index.js';

const itemSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    order: { type: [String], required: true },
    choiceId: { type: String, default: null },
    servedAt: { type: Date, default: null },
    answeredAt: { type: Date, default: null },
  },
  { _id: false },
);

const resultSchema = new Schema(
  {
    iq: { type: Number, required: true },
    percentile: { type: Number, required: true },
    theta: { type: Number, required: true },
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    categories: [
      new Schema(
        {
          category: { type: String, enum: CATEGORIES, required: true },
          correct: { type: Number, required: true },
          total: { type: Number, required: true },
        },
        { _id: false },
      ),
    ],
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    currentIndex: { type: Number, default: 0, min: 0 },
    items: { type: [itemSchema], required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    purgeAt: { type: Date },
    result: { type: resultSchema },
  },
  { minimize: false },
);

// TTL index: abandoned attempts clean themselves up. Completed attempts have
// `purgeAt` removed, so they are kept.
attemptSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const Attempt = model('Attempt', attemptSchema);
