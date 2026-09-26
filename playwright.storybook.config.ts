import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './.storybook',
  testMatch: '*.pw.ts',
  fullyParallel: true,
  use: {
    baseURL: 'http://storybook.test',
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
});
