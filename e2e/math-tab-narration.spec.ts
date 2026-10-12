import { test, expect, type Page } from '@playwright/test';
import { mathCoreQuestions, mathQuestions } from '../src/content/mathTeaching';

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const child = 'math-narration-child';
async function open(page: Page, lesson: string, phase: number) {
 const reads: string[] = [];
 await page.route('**/api/**', route => {
  if (route.request().url().includes('/volc-tts/')) {
   reads.push(route.request().postDataJSON().req_params.text);
   return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"code":20000000}\n\n' });
  }
  return route.fulfill({ json: { ok: true, ttsConfigured: true } });
 });
 await page.addInitScript(({ child, lesson, phase }) => {
  (window as unknown as { __VOLC_TTS_ENABLED__: boolean }).__VOLC_TTS_ENABLED__ = true;
  localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: { lang: 'zh', theme: 'light', sound: true, voiceOn: true, musicOn: false, profiles: [{ id: child, name: '朗读体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0 } }));
  localStorage.setItem(`sfz-math-flow-v4:${child}:#/math-course/${lesson}`, JSON.stringify({ contentVersion: 4, phase, unlocked: 4, actionDone: false, knowledgeDone: phase >= 3 }));
  localStorage.setItem(`sfz-math-assessment-v1:${child}:${lesson}:checkpoint`, JSON.stringify({ version: 1, variant: 0, index: 0, levels: [], replacement: 0, supported: false }));
 }, { child, lesson, phase });
 await page.goto(`/#/math-course/${lesson}`, { waitUntil: 'domcontentloaded' });
 await expect(page.locator('.boot-splash')).toBeHidden();
 // A direct URL has no prior audio activation; the first ordinary page gesture starts the current task.
 await page.getByLabel('本课公共提示').click({ position: { x: 15, y: 15 } });
 await expect.poll(() => reads.length).toBe(1);
 return reads;
}

test('进入教材任务及最内层任务卡各读一次，重播保留当前卡，输入不重读', async ({ page }) => {
 const reads = await open(page, 'eleven-twenty', 1);
 const tasks = page.getByRole('tablist', { name: '本阶段任务' });
 await tasks.getByRole('tab', { name: /教材任务 2/ }).click();
 await expect.poll(() => reads.length).toBe(2);
 await page.locator('.math-task-board-tabs:visible').first().getByRole('button', { name: /11到20读写板/ }).click();
 await expect.poll(() => reads.length).toBe(3);
 expect(reads[2]).toContain('1 个十和 1 个一');
 expect(reads[2]).not.toContain('1 个十和 3 个一');
 const choices = page.locator('.math-task-board-tabs:visible').last().getByRole('button');
 await choices.nth(1).click();
 await expect.poll(() => reads.length).toBe(4);
 const current = reads[3];
 expect(current).toContain('1 个十和 3 个一');
 expect(current).not.toContain('1 个十和 1 个一');
 expect(current).toContain('填写要求');
 const input = page.locator('.math-flow-main input:visible').first();
 await input.fill('19');
 await page.waitForTimeout(600);
 expect(reads).toHaveLength(4);
 await page.getByRole('button', { name: '再听一遍题目和答案选项', exact: true }).click();
 await expect.poll(() => reads.length).toBe(5);
 expect(reads[4]).toBe(current);
 await choices.nth(0).click();
 await expect.poll(() => reads.length).toBe(6);
 expect(reads[5]).not.toBe(current);
 await expect(page.locator('.math-task-board-tabs:visible').last().getByRole('button').nth(0)).toHaveAttribute('aria-pressed', 'true');
});

test('检测自动读题目和全部选项，填空读填写要求；提示不触发重读', async ({ page }) => {
 const reads = await open(page, 'compare', 3);
 const questions = mathCoreQuestions(mathQuestions('compare', 0)).slice(0, 2);
 expect(reads[0]).toContain(questions[0].prompt);
 for (const option of questions[0].options!) expect(reads[0]).toContain(option);
 await page.getByRole('button', { name: '给我一点提示', exact: true }).click();
 await page.waitForTimeout(600); expect(reads).toHaveLength(1);
 await page.locator('.math-assessment').getByRole('button', { name: questions[0].answer, exact: true }).click();
 await page.getByRole('button', { name: '下一题 →', exact: true }).click();
 await expect.poll(() => reads.length).toBe(2);
 expect(reads[1]).toContain(questions[1].prompt);
});

test('填空题只读要求，不包含正确答案或已填写内容，Web 内容保持完整', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 const reads = await open(page, 'plus-nine', 3);
 expect(reads[0]).toContain('填写要求：写出你的答案');
 expect(reads[0]).not.toContain('答案是');
 await page.getByLabel('独立答案', { exact: true }).fill('99');
 await page.waitForTimeout(600); expect(reads).toHaveLength(1);
 await page.getByRole('button', { name: '再听一遍题目和答案选项', exact: true }).click();
 await expect.poll(() => reads.length).toBe(2);
 expect(reads[1]).toBe(reads[0]); expect(reads[1]).not.toContain('99');
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
});
