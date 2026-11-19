import { Schema, model } from 'mongoose';
import { CATEGORIES, STEP_KINDS } from '../schemas/index.js';

/** One step of a quiz. Which fields are used depends on `kind` (see STEP_KINDS). */
const stepSchema = new Schema(
  {
    kind: { type: String, enum: STEP_KINDS, required: true },

    // question: the category is fixed when the quiz is laid out; the actual
    // question is picked when the step is served, at the current difficulty.
    category: { type: String, enum: CATEGORIES },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },

    // statement: key into content/statements.js
    ref: { type: String },

    // question, "what would you do" statement: option ids in display order
    order: { type: [String], default: undefined },

    // memorize / recall: 'word' | 'digits'.  info: 'speed' | 'profile' | 'progress'
    variant: { type: String },
    // memorize <-> recall: index of the other half
    pair: { type: Number },
    // memorize, recall, info: content generated when the step is served
    data: { type: Schema.Types.Mixed },

    /** Position of the chosen option in display order. */
    choice: { type: Number, default: null },
    /** question, recall: whether the choice was right. */
    correct: { type: Boolean, default: null },
    /** The bank had no question left for this step. */
    skipped: { type: Boolean },
    servedAt: { type: Date, default: null },
    answeredAt: { type: Date, default: null },
  },
  { _id: false, minimize: false },
);

const attemptSchema = new Schema(
  {
    quizId: { type: String, required: true },
    tokenHash: { type: String, required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    currentIndex: { type: Number, default: 0, min: 0 },
    /** Current difficulty (1-5) for right/wrong steps, and correct answers in a row at that level. */
    level: { type: Number, default: 2, min: 1, max: 5 },
    streak: { type: Number, default: 0, min: 0 },
    items: { type: [stepSchema], required: true },
    /** Time from start to the pace screen; other attempts are compared against it. */
    speedCheckMs: { type: Number },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    purgeAt: { type: Date },
    /** Built once, when the last step is answered (services/results.js). */
    result: { type: Schema.Types.Mixed },
  },
  { minimize: false },
);

// TTL index: abandoned attempts clean themselves up. Completed attempts have
// `purgeAt` removed, so they are kept.
attemptSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
// "How many people reached the pace screen slower than this?"
attemptSchema.index({ quizId: 1, speedCheckMs: 1 });

export const Attempt = model('Attempt', attemptSchema);
