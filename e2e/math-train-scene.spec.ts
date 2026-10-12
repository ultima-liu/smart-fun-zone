import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const child = 'train-scene-child';
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
    if (sessionStorage.getItem('train-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: { lang: 'zh', theme: 'light', sound: true, voiceOn: true, musicOn: false, profiles: [{ id: child, name: '数序体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false } }));
    localStorage.setItem(`sfz-math-flow-v4:${child}:#/math-course/order-twenty`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked: 2, actionDone: complete, knowledgeDone: false }));
    localStorage.setItem(taskKey, JSON.stringify({ 'primary-manipulative': { step: 6, removed: [], selected: null, sorted: {}, pickedModel: null }, 'completed-action-tasks-v1': [0], ...(complete ? { 'twenty-number-rail': 11, 'twenty-number-near': '10', 'twenty-number-near-eighteen': '20' } : {}) }));
    sessionStorage.setItem('train-seeded', '1');
  }, { child, taskKey, complete });
  await page.goto('/#/math-course/order-twenty');
  await expect(page.locator('.boot-splash')).toBeHidden();
  await page.getByRole('tab', { name: /教材任务 2/ }).click();
  await expect(train(page)).toBeVisible();
  return reads;
}
const train = (page: Page) => page.getByRole('region', { name: '10到20的火车车厢', exact: true });
const subcard = (page: Page) => train(page).locator('.math-exercise-cards > article:visible');
const returnToTrain = async (page: Page) => {
  await page.getByRole('tab', { name: /教材任务 2/ }).click();
  await page.locator('.math-lesson-activity-panel:visible > .whole-stage .mt-action-station > .math-task-board-deck > nav').getByRole('button', { name: /10到20的火车车厢/ }).click();
};
async function finishTrain(page: Page) {
  for (let number = 10; number <= 20; number++) await subcard(page).getByRole('button', { name: `${number}号车厢`, exact: true }).click();
  await expect(subcard(page)).toContainText('小熊在 12 号');
  await subcard(page).getByRole('button', { name: '10号车厢', exact: true }).click();
  await expect(subcard(page)).toContainText('小熊在 18 号');
  await subcard(page).getByRole('button', { name: '20号车厢', exact: true }).click();
}

test('火车编号操作与语音一致，错误点击不推进，距离题有完整车厢图', async ({ page }) => {
  const reads = await open(page);
  await expect.poll(() => reads.some(text => text.includes('请从10号车厢开始'))).toBe(true);
  expect(reads.find(text => text.includes('请从10号车厢开始'))).not.toContain('答案选项');
  await subcard(page).getByRole('button', { name: '13号车厢', exact: true }).click();
  await expect(subcard(page).getByRole('status')).toContainText('已点亮 0');
  await subcard(page).getByRole('button', { name: '10号车厢', exact: true }).click();
  await page.reload(); await page.getByRole('tab', { name: /教材任务 2/ }).click();
  await expect(subcard(page).getByRole('status')).toContainText('已点亮 1');
  for (let number = 11; number <= 20; number++) await subcard(page).getByRole('button', { name: `${number}号车厢`, exact: true }).click();
  await expect(subcard(page)).toContainText('小熊在 12 号');
  await expect(subcard(page).locator('.mt-train-carriage')).toHaveCount(11);
  await expect(subcard(page).locator('.mt-train-carriage.marked')).toContainText('12');
  await expect.poll(() => reads.some(text => text.includes('小熊在12号车厢') && text.includes('哪边走的步数少'))).toBe(true);
  await page.screenshot({ path: 'tmp/math-number-order/train-1024.png' });
  await subcard(page).getByRole('button', { name: '20号车厢', exact: true }).click();
  await expect(subcard(page)).toContainText('小熊在 12 号');
  await subcard(page).getByRole('button', { name: '10号车厢', exact: true }).click();
  await expect(subcard(page)).toContainText('小熊在 18 号');
  await subcard(page).getByRole('button', { name: '20号车厢', exact: true }).click();
  await expect(train(page)).toBeHidden();
  await expect(page.getByRole('heading', { name: '14 的前一个和后一个数是？', exact: true })).toBeVisible();
  await returnToTrain(page);
  await train(page).getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(subcard(page).getByRole('status')).toContainText('已点亮 0');
  await finishTrain(page);
  await expect(train(page)).toBeHidden();
  await expect(page.getByRole('heading', { name: '14 的前一个和后一个数是？', exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)['twenty-number-rail'], taskKey)).toBe(11);
});

test('旧版完成进度可恢复与重做，Pad 深色大屏等距排布没有溢出', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, true); await returnToTrain(page);
  await page.evaluate(() => { const stored = JSON.parse(localStorage.getItem('smart-fun-zone')!); stored.state.theme = 'dark'; localStorage.setItem('smart-fun-zone', JSON.stringify(stored)); });
  await page.reload(); await returnToTrain(page);
  await train(page).getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(subcard(page).getByRole('status')).toContainText('已点亮 0');
  const positions = await subcard(page).locator('.mt-train-carriage').evaluateAll(cars => cars.map(car => car.getBoundingClientRect().left));
  const gaps = positions.slice(1).map((x, i) => x - positions[i]);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  await page.screenshot({ path: 'tmp/math-number-order/train-dark-1280.png' });
  await page.reload(); await returnToTrain(page);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)['twenty-number-rail'], taskKey)).toBe(11);
  await train(page).getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(subcard(page).getByRole('status')).toContainText('已点亮 0');
});

test('最后一张连续任务重做完成后进入说理由，不循环回第一题', async ({ page }) => {
  await open(page, true);
  await page.evaluate(key => {
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    snapshot['mission-index'] = 2;
    localStorage.setItem(key, JSON.stringify(snapshot));
  }, taskKey);
  await page.reload();
  await returnToTrain(page);
  const deck = page.locator('.math-lesson-activity-panel:visible .mt-action-station > .math-task-board-deck');
  await deck.locator(':scope > nav').getByRole('button', { name: /14 的前一个和后一个数是/ }).click();
  await deck.getByRole('button', { name: '再做一次', exact: true }).click();
  await deck.getByRole('button', { name: '13 和 15', exact: true }).click();
  await deck.getByRole('button', { name: '14', exact: true }).click();
  await expect(page.getByRole('navigation', { name: '本课学习步骤' }).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
});
