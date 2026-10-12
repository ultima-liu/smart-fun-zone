import { defineConfig } from '@playwright/test';
import base from './playwright.english.config';
export default defineConfig({ ...base, testMatch: /english-audio-materials\.spec\.ts/, outputDir: './tmp/english-audio-audit/e2e', timeout: 180_000 });
