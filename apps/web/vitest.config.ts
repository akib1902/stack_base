import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    // Each jsdom environment costs seconds to build, so with every file running
    // in its own worker the first render can exceed the default 5 s timeout on
    // a busy machine. The tests are still ordinary renders; only the ceiling
    // moves.
    testTimeout: 15_000,
  },
});
