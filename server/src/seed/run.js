import { connectDb, disconnectDb } from '../lib/db.js';
import { bankCoverage, seedQuestions } from './seedQuestions.js';

// CLI entry point: `npm run seed`
try {
  await connectDb();
  const { upserted, total } = await seedQuestions();
  console.log(`Seeded ${total} questions (${upserted} new). ${bankCoverage()}.`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
