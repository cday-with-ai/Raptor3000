import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for raptor3000 E2E smoke tests.
 *
 * The tests assume a dev server is already running on :5173 (start it
 * with `yarn dev` from the repo root). We don't auto-start it here
 * because the dev server outlives the test run — the user tends to
 * keep it up and drive it manually.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
