import { defineConfig } from '@playwright/test';
import base from './playwright.practice-repeat.config';
export default defineConfig({ ...base, testMatch: ['course-ai-confirmation.spec.ts', 'course-repeat-practice.spec.ts', 'english-discovery.spec.ts'], outputDir:'tmp/course-ai/test-results' });
