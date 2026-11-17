import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    include: ['test/**/*.test.js'],
    // Integration tests share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
