import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const childId = 'numbers-task-child';
async function open(page: Page, marking: Record<string, unknown>) {
 await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
 await page.addInitScript(({ childId, marking }) => {
  localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, profiles: [{ id: childId, name: '认数任务体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: childId, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0 } }));
  localStorage.setItem(`sfz-math-flow-v4:${childId}:#/math-course/numbers`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked: 1, actionDone: true, knowledgeDone: false }));
  localStorage.setItem(`sfz-math-task-v1:${childId}:numbers`, JSON.stringify({ 'numbers-primary': { number: 5, trace: 0, completed: { 1: true, 2: true, 3: true, 4: true, 5: true }, abacusCount: 5 }, 'completed-action-tasks-v1': [0], 'numbers-marking-practice': marking }));
 }, { childId, marking });
 await page.goto('/#/math-course/numbers', { waitUntil: 'domcontentloaded' });
 await expect(page.getByRole('heading', { level: 1 })).toHaveText('1～5 的认识');
}
const phases = (page: Page) => page.getByRole('navigation', { name: '本课学习步骤' });
const snapshot = (page: Page) => page.evaluate(childId => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${childId}:numbers`)!), childId);

test('认数任务二只核验圈选、实物连线和排序，错误不能跳过，删除题目的历史数据保留', async ({ page }) => {
 const history = { dotLinks: { 2: 2 }, selectedDotNumber: 3 };
 await open(page, { circled: '', objectLinks: {}, sequence: [], ...history });
 const task = page.getByRole('region', { name: '1到5圈和连线练习', exact: true });
 await expect(task).toBeVisible();
 await expect(task.getByRole('group', { name: '点子和数字连线' })).toHaveCount(0);
 await task.getByRole('button', { name: '青椒，4 个', exact: true }).click();
 for (const number of [1, 2, 3, 4, 5]) await task.locator('.mt-number-order-task').getByRole('button', { name: String(number), exact: true }).click();
 const matching = task.getByRole('group', { name: '数字和实物连线', exact: true });
 await matching.getByRole('button', { name: '数字 1', exact: true }).click();
 await matching.getByRole('button', { name: '3 个小鸟', exact: true }).click();
 await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
 await task.getByRole('button', { name: '豌豆，5 个', exact: true }).click();
 await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
 for (const [number, label] of [[1, '1 个小羊'], [2, '2 个蜜蜂'], [3, '3 个小鸟'], [4, '4 个熊猫'], [5, '5 个公鸡']] as const) {
  await matching.getByRole('button', { name: `数字 ${number}`, exact: true }).click();
  await matching.getByRole('button', { name: label, exact: true }).click();
 }
 await expect(phases(page).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
 const saved = await snapshot(page);
 expect(saved['completed-action-tasks-v1']).toEqual([0, 1]);
 expect(saved['numbers-marking-practice'].dotLinks).toEqual(history.dotLinks);
 expect(saved['numbers-marking-practice'].selectedDotNumber).toBe(history.selectedDotNumber);
});

test('旧实物连线与排序已完成时，无需已删除的点子连线即可自动进入说理由', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await open(page, { circled: 'peas', linked: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, sequence: [1, 2, 3, 4, 5], dotLinks: {} });
 await expect(phases(page).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
 const saved = await snapshot(page);
 expect(saved['completed-action-tasks-v1']).toEqual([0, 1]);
 expect(saved['numbers-marking-practice'].dotLinks).toEqual({});
});
