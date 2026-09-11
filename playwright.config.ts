import { defineConfig } from '@playwright/test';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)
) {
  throw new Error('Browser tests require TEST_DATABASE_URL on localhost');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.pw.ts',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://localhost:3119',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: 'bun run next dev -p 3119',
    url: 'http://localhost:3119/en',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: 'polycord-isolated-audit-secret',
      POLYCORD_ANALYTICS_DISABLED: 'true',
      POLYCORD_PREMIUM_USER_IDS: '',
    },
  },
});
