import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const port = process.env.ENGLISH_E2E_PORT ?? '5186';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  testMatch: /english-(?:textbook|teaching)\.spec\.ts/,
  workers: 1,
  timeout: 90_000,
  outputDir: './tmp/english-test-results',
  use: { ...base.use, baseURL, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
