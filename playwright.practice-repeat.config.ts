import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'course-repeat-practice.spec.ts', workers: 1,
  timeout: 40_000, reporter: 'list', outputDir: 'tmp/course-repeat/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5199', headless: true, locale: 'zh-CN',
    viewport: { width: 1024, height: 768 },
    launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199', reuseExistingServer: false, timeout: 60_000,
  },
});
