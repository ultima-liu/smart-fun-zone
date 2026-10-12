import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1024, height: 768 } });
const child = 'number-order-child';
const taskKey = `sfz-math-task-v1:${child}:order-twenty`;
async function open(page: Page, complete = false) {
  const reads: string[] = [];
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/volc-tts/')) {
      reads.push(route.request().postDataJSON().req_params.text);
      return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"code":20000000}\n\n' });
    }
    return route.fulfill({ json: { ok: true, ttsConfigured: true } });
  });
  await page.addInitScript(({ child, taskKey, complete }) => {
    (window as unknown as { __VOLC_TTS_ENABLED__: boolean }).__VOLC_TTS_ENABLED__ = true;
    if (sessionStorage.getItem('order-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: { lang: 'zh', theme: 'light', sound: true, voiceOn: true, musicOn: false, profiles: [{ id: child, name: '数序体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false } }));
    localStorage.setItem(`sfz-math-flow-v4:${child}:#/math-course/order-twenty`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked: 2, actionDone: complete, knowledgeDone: false }));
    if (complete) localStorage.setItem(taskKey, JSON.stringify({ 'primary-manipulative': { step: 6, removed: [], selected: null, sorted: {}, pickedModel: null }, 'completed-action-tasks-v1': [0] }));
    sessionStorage.setItem('order-seeded', '1');
  }, { child, taskKey, complete });
  await page.goto('/#/math-course/order-twenty');
  await expect(page.locator('.boot-splash')).toBeHidden();
  await page.getByRole('tab', { name: /教材任务 1/ }).click();
  await expect.poll(() => reads.length).toBeGreaterThan(0);
  return reads;
}
const orderTool = (page: Page) => page.getByLabel('数字顺序练习', { exact: true });
const labels = (page: Page) => orderTool(page).getByRole('group', { name: '数字卡片', exact: true }).getByRole('button');

test('顺序点击只读要求，卡片真正打乱；首次完成后回看可多次重做', async ({ page }) => {
  const reads = await open(page);
  await expect.poll(() => reads.some(text => text.includes('按顺序点亮'))).toBe(true);
  expect(reads.find(text => text.includes('按顺序点亮'))).not.toContain('答案选项');
  const first = await labels(page).allTextContents();
  expect(first).not.toEqual(['10', '11', '12', '13', '14', '15']);
  expect(first).not.toEqual(['15', '14', '13', '12', '11', '10']);
  await orderTool(page).getByRole('button', { name: '15', exact: true }).click();
  await expect(orderTool(page).getByRole('status')).toContainText('已排 0');
  for (let n = 10; n <= 15; n++) await orderTool(page).getByRole('button', { name: String(n), exact: true }).click();
  const task = page.getByRole('tab', { name: /教材任务 1/ });
  await expect(task).toHaveClass(/done/);
  await expect(page.getByRole('tab', { name: /教材任务 2/ })).toHaveAttribute('aria-selected', 'true');
  await task.click();
  await expect(orderTool(page).getByRole('button', { name: /再做一次$/ })).toBeEnabled();
  for (let round = 0; round < 2; round++) {
    const before = await labels(page).allTextContents();
    await orderTool(page).getByRole('button', { name: /再做一次$/ }).click();
    expect(await labels(page).allTextContents()).not.toEqual(before);
    expect(await labels(page).evaluateAll(buttons => buttons.every(b => !(b as HTMLButtonElement).disabled))).toBe(true);
    for (let n = 10; n <= 15; n++) await orderTool(page).getByRole('button', { name: String(n), exact: true }).click();
    await expect(orderTool(page).getByRole('status')).toContainText('顺序完成');
  }
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)['primary-manipulative'].step, taskKey)).toBe(6);
  await expect(task).toHaveClass(/done/);
  await page.screenshot({ path: 'tmp/math-number-order/完成可重做.png' });
});

test('历史完成恢复后可重做，刷新保留完成记录且没有页面溢出', async ({ page }) => {
  await open(page, true);
  await orderTool(page).getByRole('button', { name: /再做一次$/ }).click();
  await orderTool(page).getByRole('button', { name: '10', exact: true }).click();
  await expect(orderTool(page).getByRole('status')).toContainText('已排 1');
  await page.reload();
  await page.getByRole('tab', { name: /教材任务 1/ }).click();
  await expect(orderTool(page).getByRole('status')).toContainText('顺序完成');
  await orderTool(page).getByRole('button', { name: /再做一次$/ }).click();
  await expect(orderTool(page).getByRole('button', { name: '10', exact: true })).toBeEnabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)['primary-manipulative'].step, taskKey)).toBe(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
});
