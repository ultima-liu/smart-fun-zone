import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const childId = 'math-subtask-child';
async function open(page: Page, snapshot: Record<string, unknown> = {}, lessonId = 'eleven-twenty', unlocked = 1) {
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(({ childId, lessonId, snapshot, unlocked }) => {
    if (sessionStorage.getItem('subtask-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, profiles: [{ id: childId, name: '子任务体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: childId, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0 } }));
    localStorage.setItem(`sfz-math-flow-v4:${childId}:#/math-course/${lessonId}`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked, actionDone: true, knowledgeDone: false }));
    localStorage.setItem(`sfz-math-task-v1:${childId}:${lessonId}`, JSON.stringify({ 'completed-action-tasks-v1': [0], ...snapshot }));
    sessionStorage.setItem('subtask-seeded', '1');
  }, { childId, lessonId, snapshot, unlocked });
  await page.goto(`/#/math-course/${lessonId}`);
  await expect(taskTwo(page)).toHaveAttribute('aria-selected', 'true');
}
const phases = (page: Page) => page.getByRole('navigation', { name: '本课学习步骤' });
const taskTwo = (page: Page) => page.getByRole('tablist', { name: '本阶段任务' }).getByRole('tab', { name: /教材任务 2/ });
const rootDeck = (page: Page) => page.locator('.math-lesson-activity-panel:visible > .whole-stage > .whole-scene > .mt-action-station > .math-task-board-deck');
async function finishPlace(page: Page, ones = 5) {
  const place = page.locator('.mt-place-task');
  for (let i = 1; i <= 10; i++) await place.getByRole('button', { name: `第 ${i} 根小棒`, exact: true }).click();
  await place.getByRole('button', { name: '捆成 1 个十', exact: true }).click();
  for (let i = 0; i < ones; i++) await place.locator('.mt-ones-row button:not(.on)').first().click();
}

test('捆成一个十后显示十根小棒组成的一捆，回看保留结果', async ({ page }) => {
  await open(page, {}, 'ten-again');
  await finishPlace(page, 0);
  const place = page.locator('.mt-place-task');
  await expect(place.getByRole('img', { name: '1 捆小棒，共 10 根，表示 1 个十', exact: true })).toBeVisible();
  await expect(place.locator('.mt-bundled-sticks [data-math-bundle="10"] rect')).toHaveCount(10);
  await expect(place.locator('.mt-stick-row')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '10 里面的 1 和 0 分别表示什么？', exact: true })).toBeVisible();
  await rootDeck(page).getByRole('button', { name: /把 10 根小棒捆成 1 捆/ }).click();
  await expect(place.locator('.mt-bundled-sticks')).toBeVisible();
  await page.reload();
  await expect(place.locator('.mt-bundled-sticks')).toBeVisible();
});

test('已完成的捆十任务明确点击再做一次才重置，重做完成仍显示一捆', async ({ page }) => {
  const saved = { counted: 10, bundled: true, ones: 0 };
  await open(page, { 'place-value': saved }, 'ten-again');
  const place = page.locator('.mt-place-task');
  await expect(place.locator('.mt-bundled-sticks')).toBeVisible();
  await place.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(place.locator('.mt-stick-row button')).toHaveCount(10);
  await finishPlace(page, 0);
  await expect(page.getByRole('heading', { name: '10 里面的 1 和 0 分别表示什么？', exact: true })).toBeVisible();
  await rootDeck(page).getByRole('button', { name: /把 10 根小棒捆成 1 捆/ }).click();
  await expect(place.locator('.mt-bundled-sticks')).toBeVisible();
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${id}:ten-again`) ?? '{}')['place-value'], childId)).toEqual(saved);
});

test('11～20 教材任务二逐个完成三张子任务卡，最后一题前不能跳到说理由', async ({ page }) => {
  test.setTimeout(65_000);
  await open(page);
  await expect(rootDeck(page)).toHaveAttribute('data-count', '3');
  await finishPlace(page);
  await expect(taskTwo(page)).not.toHaveClass(/done/);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  const writing = page.getByRole('region', { name: '11到20读写板', exact: true });
  await expect(writing).toBeVisible();
  for (const number of [11, 13, 16, 18, 20]) await writing.getByLabel(`写数字 ${number}`, { exact: true }).fill(String(number));
  await writing.getByRole('button', { name: '2个十', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 个十和 8 个一是？', exact: true })).toBeVisible();
  await expect(taskTwo(page)).not.toHaveClass(/done/);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await rootDeck(page).getByRole('button', { name: '18', exact: true }).click();
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await rootDeck(page).getByRole('button', { name: '2 个十', exact: true }).click();
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
});

test('旧总完成勾选不能跳过未完成子任务，刷新后仍按实际作答恢复', async ({ page }) => {
  await open(page, { 'completed-action-tasks-v1': [0, 1], 'place-value': { counted: 10, bundled: true, ones: 5 } });
  await expect(taskTwo(page)).not.toHaveClass(/done/);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await rootDeck(page).getByRole('button', { name: /11到20读写板/ }).click();
  await page.getByLabel('写数字 11', { exact: true }).fill('11');
  await page.reload();
  await expect(taskTwo(page)).not.toHaveClass(/done/);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await rootDeck(page).getByRole('button', { name: /11到20读写板/ }).click();
  await expect(page.getByLabel('写数字 11', { exact: true })).toHaveValue('11');
  await expect(rootDeck(page).locator(':scope > nav > button.done')).toHaveCount(1);
});

test('同类十和一教材任务也必须完成后面的连续练习', async ({ page }) => {
  await open(page, {}, 'ten-again');
  await expect(rootDeck(page)).toHaveAttribute('data-count', '2');
  await finishPlace(page, 0);
  await expect(taskTwo(page)).not.toHaveClass(/done/);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await expect(page.getByRole('heading', { name: '10 里面的 1 和 0 分别表示什么？', exact: true })).toBeVisible();
  await rootDeck(page).getByRole('button', { name: '1 个十和 0 个一', exact: true }).click();
  await rootDeck(page).getByRole('button', { name: '13', exact: true }).click();
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
});

test('全部子任务已有真实完成记录时，手动回看和刷新不会误当新完成而跳走', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, { 'completed-action-tasks-v1': [0, 1], 'place-value': { counted: 10, bundled: true, ones: 5 }, 'teen-writing-board': { 11: '11', 13: '13', 16: '16', 18: '18', 20: '20' }, 'teen-twenty-composition': '2个十', 'mission-index': 2 }, 'eleven-twenty', 2);
  await expect(taskTwo(page)).toHaveClass(/done/);
  await page.waitForTimeout(1400);
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
  await phases(page).getByRole('button', { name: /说理由/ }).click();
  await phases(page).getByRole('button', { name: /动手试/ }).click();
  await page.reload();
  await expect(taskTwo(page)).toHaveClass(/done/);
  await page.waitForTimeout(1400);
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
});
