import { defineConfig } from 'vitest/config';

// Vitest runs unit tests under src/. Playwright e2e specs under e2e/
// run via `yarn e2e` and use the playwright runner; keep them apart.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
    environment: 'node',
  },
});
