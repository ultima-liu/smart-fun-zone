import { expect, test, type Page } from '@playwright/test';

const child = 'english-discovery-child';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(child => {
    if (sessionStorage.getItem('discovery-seeded')) return;
    sessionStorage.setItem('discovery-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false,
      profiles: [{ id: child, name: '观察体验生', ageBand: 'g3', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, records: [], mastery: {}, lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false } }));
    localStorage.setItem(`sfz-english-g3a-flow-v6:${child}:numbers-project`, JSON.stringify({ phase: 4, unlocked: 4, stars: 3, seen: ['line-0'] }));
  }, child);
});
async function switchLesson(page: Page, id: string) {
  if (!page.url().includes('/#/english-course/')) await page.goto(`/#/english-course/${id}`);
  else await page.evaluate(id => { window.location.hash = `/english-course/${id}`; }, id);
  await expect(page.locator('.en-observe-panel')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.boot-splash')).toBeHidden();
}
test('同单元切换课文时，观察题、引导问题和图片同步变成当前课内容', async ({ page }) => {
  await switchLesson(page, 'friends-opening');
  await expect(page.locator('.en-observe-panel h3')).toHaveText('How do we make friends?');
  await page.locator('.en-observe-panel button').filter({ hasText: 'Are the children friends?' }).click();
  await expect(page.locator('.en-phase-nav button').nth(1)).toHaveClass(/active/);
  await switchLesson(page, 'friends-a');
  await expect(page.locator('.en-observe-panel h3')).toHaveText('How do Mike and Wu Binbin greet each other?');
  await expect(page.locator('.en-observe-panel img')).toHaveAttribute('src', '/assets/english-textbook/pages/p004.webp');
  await expect(page.locator('.en-observe-panel .en-quiz-options button')).toHaveText(['How do they tell each other their names?', 'How do they reply to “Nice to meet you”?']);
  await expect(page.locator('.en-phase-nav button').nth(1)).toBeDisabled();
  await switchLesson(page, 'friends-letters');
  await expect(page.locator('.en-observe-panel h3')).toContainText('Aa, Bb, Cc and Dd');
  await switchLesson(page, 'friends-b');
  await expect(page.locator('.en-observe-panel h3')).toHaveText('How can Sarah help Chen Jie?');
});
test('项目和复习课使用对应画面，重做观察不撤销已完成进度', async ({ page }) => {
  await switchLesson(page, 'plants-project');
  await expect(page.locator('.en-observe-panel h3')).toContainText('paper garden');
  await expect(page.locator('.en-observe-panel img')).toHaveAttribute('src', '/assets/english-textbook/pages/p047.webp');
  await page.screenshot({ path: 'tmp/course-ai/english-discovery-project.png' });
  await page.evaluate(() => { window.location.hash = '/english-course/numbers-project'; });
  await expect(page.locator('.en-phase-nav button').nth(4)).toHaveClass(/active/);
  await page.locator('.en-phase-nav button').nth(0).click();
  await expect(page.locator('.en-observe-panel h3')).toContainText('birthday card');
  await expect(page.locator('.en-observe-panel img')).toHaveAttribute('src', '/assets/english-textbook/pages/p071.webp');
  await page.locator('.en-observe-panel .en-quiz-options button').first().click();
  await expect(page.locator('.en-phase-nav button').nth(1)).toHaveClass(/active/);
  const saved = await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-english-g3a-flow-v6:${child}:numbers-project`)!), child);
  expect(saved).toMatchObject({ unlocked: 4, stars: 3 });
  await switchLesson(page, 'guest-observe');
  await expect(page.locator('.en-observe-panel h3')).toContainText('when they arrive');
  await switchLesson(page, 'guest-act');
  await expect(page.locator('.en-observe-panel h3')).toContainText('play politely');
});
