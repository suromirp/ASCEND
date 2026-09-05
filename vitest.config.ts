import { defineConfig } from 'vitest/config';

// A dedicated config, separate from vite.config.ts — the engine/storage
// tests here are plain Node, no DOM/React needed, so this stays minimal
// rather than pulling in the app's full plugin set (react, tailwind, PWA).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
