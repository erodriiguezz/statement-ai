// End-to-end tests for the Test step (scripts/sdlc/test.sh) and CI runtime checks.
// Assumes the local stack is already up (test.sh starts it); web on :3100.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: '.claude/artifacts/playwright.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  outputDir: '.claude/artifacts/playwright',
});
