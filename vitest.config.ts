import { defineConfig } from 'vitest/config';

// A dedicated config, separate from vite.config.ts — the engine/storage
// tests here are plain Node, no DOM/React needed, so this stays minimal
// rather than pulling in the app's full plugin set (react, tailwind, PWA).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // The storage tests boot the whole app several times over a fake
    // IndexedDB (bootReplay, leaveSync, repeatWeek); 5 s is too tight when
    // the suite shares the machine with other runs.
    testTimeout: 30_000,
    // De beforeEach van die tests start de hele app (migraties) en kreeg onder drukte de standaard 10 s te krap
    // (horizonPlan.test.ts).
    hookTimeout: 120_000,
  },
});
