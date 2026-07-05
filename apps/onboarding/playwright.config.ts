import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Each test gets a fresh, isolated browser context (so a fresh
 * localStorage — no vault from a previous test bleeds in), and the dev server
 * is started automatically against the REAL app + REAL wallet-core crypto
 * (scrypt/derivation run for real — these are genuine end-to-end tests, not
 * mocked).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
