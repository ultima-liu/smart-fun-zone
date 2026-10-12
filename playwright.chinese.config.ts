import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** 语文修改使用独立开发服务，避免复用用户正在看的旧预览包。 */
export default defineConfig({
  ...base,
  testMatch: 'chinese-textbook.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5185' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5185 --strictPort',
    url: 'http://127.0.0.1:5185',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
