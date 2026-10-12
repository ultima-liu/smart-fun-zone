import { expect, test, type Page } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-02T12:00:00Z') });
  await page.addInitScript(() => {
    const id = 'mole-child';
    Math.random = () => .5;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: {
      lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
      profiles: [{ id, name: '花园小玩家', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: id, records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
      wrongs: {}, points: { [id]: 25 }, pointLog: { [id]: [] }, customTasks: {}, taskStates: {},
      ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {},
      bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
      expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
    }, version: 6 }));
  });
});

async function openMeadow(page: Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: /敏捷/ }).click();
  await page.getByRole('article').filter({ hasText: '花园打地鼠' }).getByRole('button', { name: '去打地鼠' }).click();
  const game = page.locator('.wm-game');
  await expect(game.getByRole('heading', { name: '花园打地鼠' })).toBeVisible();
  await page.clock.pauseAt(new Date('2026-10-02T12:00:10Z'));
  await game.scrollIntoViewIfNeeded();
  return game;
}

async function startMeadow(page: Page) {
  await page.locator('.wm-game').getByRole('button', { name: '开始打地鼠' }).click();
  await page.clock.runFor(3120);
  await expect(page.locator('.wm-overlay')).toHaveCount(0);
}

async function records(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.records.filter((r: { gameId: string }) => r.gameId === 'sky-mole'));
}

test('Web 点按与数字键命中，暂停冻结时间和角色，返回后不结算弃局', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const game = await openMeadow(page);
  await expect(game.locator('.wm-hole')).toHaveCount(9);
  await startMeadow(page);
  await expect(game.getByRole('button', { name: '高手', exact: true })).toBeDisabled();
  await game.locator('.wm-hole[data-kind="mole"]').first().click();
  await expect(game.getByTestId('mole-score')).toHaveText('010');
  await page.clock.runFor(850);
  const next = await game.locator('.wm-hole[data-kind="mole"]').first().getAttribute('aria-label');
  await page.keyboard.press(next!.match(/地洞 (\d)/)![1]);
  await expect(game.getByTestId('mole-score')).toHaveText('020');
  await page.keyboard.press('p');
  await expect(game.getByRole('heading', { name: '花园休息一下' })).toBeVisible();
  const time = await game.getByTestId('mole-time').textContent();
  const visitors = await game.locator('.wm-hole').evaluateAll((holes) => holes.map((hole) => hole.getAttribute('data-kind')));
  await page.clock.runFor(5000);
  await expect(game.getByTestId('mole-time')).toHaveText(time!);
  expect(await game.locator('.wm-hole').evaluateAll((holes) => holes.map((hole) => hole.getAttribute('data-kind')))).toEqual(visitors);
  await game.getByRole('button', { name: '继续游戏' }).click();
  await page.clock.runFor(1050);
  expect(await game.getByTestId('mole-time').textContent()).not.toBe(time);
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await page.clock.runFor(70_000);
  expect(await records(page)).toHaveLength(0);
  await expect(page.locator('.wm-game')).toHaveCount(0);
});

test('金鼠奖励与兔子扣分，并自动暂停', async ({ page }) => {
  const game = await openMeadow(page);
  await startMeadow(page);
  await game.locator('.wm-hole[data-kind="mole"]').click();
  await page.evaluate(() => { Math.random = () => .99; });
  await page.clock.runFor(850);
  await game.locator('.wm-hole[data-kind="gold"]').click();
  await expect(game.getByTestId('mole-score')).toHaveText('040');
  await page.evaluate(() => { Math.random = () => 0; });
  await page.clock.runFor(850);
  await game.locator('.wm-hole[data-kind="rabbit"]').click();
  await expect(game.getByTestId('mole-score')).toHaveText('020');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(game.getByRole('heading', { name: '花园休息一下' })).toBeVisible();
  const time = await game.getByTestId('mole-time').textContent();
  await page.clock.runFor(60_000);
  await expect(game.getByTestId('mole-time')).toHaveText(time!);
  expect(await records(page)).toHaveLength(0);
});

test('完整对局只写一次记录，重开不改变货币或课程星', async ({ page }) => {
  const game = await openMeadow(page);
  await game.getByRole('button', { name: '认真', exact: true }).click();
  await startMeadow(page);
  await game.locator('.wm-hole[data-kind="mole"]').click();
  await page.clock.runFor(60_000);
  await expect(game.getByRole('heading', { name: '快乐收获完成！' })).toBeVisible();
  expect(await records(page)).toMatchObject([{ gameId: 'sky-mole', level: 2, stars: 0, correct: 0, total: 1, durationSec: 60 }]);
  await page.clock.runFor(10_000);
  expect(await records(page)).toHaveLength(1);
  const economy = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('smart-fun-zone')!).state;
    return { points: state.points['mole-child'], mastery: state.mastery };
  });
  expect(economy).toEqual({ points: 25, mastery: {} });
  await game.getByRole('button', { name: '再来一局' }).click();
  await expect(game.getByTestId('mole-score')).toHaveText('000');
  expect(await records(page)).toHaveLength(1);
});

test('倒数可暂停与重开，计时从新的一局开始', async ({ page }) => {
  const game = await openMeadow(page);
  await game.getByRole('button', { name: '开始打地鼠' }).click();
  await page.clock.runFor(1040);
  await page.keyboard.press('Escape');
  await page.clock.runFor(5000);
  await game.getByRole('button', { name: '继续游戏' }).click();
  await page.clock.runFor(2000);
  await expect(game.locator('.wm-overlay')).toHaveCount(0);
  await page.keyboard.press('p');
  await game.getByRole('button', { name: '重新开局' }).click();
  await expect(game.locator('.wm-count b')).toHaveText('3');
  await expect(game.getByTestId('mole-time')).toHaveText('60s');
  expect(await records(page)).toHaveLength(0);
});

test.describe('Pad 触屏与响应式布局', () => {
  test.use({ hasTouch: true });
  for (const viewport of [{ width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    test(`${viewport.width}×${viewport.height} 直接触摸可得分且无横向溢出`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const game = await openMeadow(page);
      await game.screenshot({ path: testInfo.outputPath('meadow-ready.png') });
      await startMeadow(page);
      await game.locator('.wm-hole[data-kind="mole"]').tap();
      await expect(game.getByTestId('mole-score')).toHaveText('010');
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      expect(layout.scroll).toBeLessThanOrEqual(layout.width);
      const hole = await game.locator('.wm-hole').first().boundingBox();
      expect(hole!.width).toBeGreaterThanOrEqual(44);
      expect(hole!.height).toBeGreaterThanOrEqual(44);
      await game.screenshot({ path: testInfo.outputPath('meadow-playing.png') });
    });
  }
});
