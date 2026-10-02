import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'ms-child', name: '小排雷员', avatar: '⛏', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'ms-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
      wrongs: {}, points: {}, pointLog: {}, customTasks: {}, taskStates: {},
      ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {},
      bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
      expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {},
      showBadges: {}, badges: {},
    },
    version: 6,
  }));
`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(SEED_STATE(false));
});

async function openMines(page: import('@playwright/test').Page) {
  await page.goto('/#/lobby');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.getByRole('tab', { name: '益智' }).click();
  await page.getByRole('button', { name: '开始排雷' }).click();
  await expect(page.locator('#ms-title')).toBeVisible();
  return page.locator('.ms-overlay');
}

test('扫雷支持开始翻格与插旗模式切换', async ({ page }) => {
  const overlay = await openMines(page);

  // 待开始覆盖层 + 默认「认真」10×10 棋盘
  await expect(page.getByText('准备排雷')).toBeVisible();
  await expect(page.locator('.ms-cell')).toHaveCount(100);

  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('准备排雷')).toHaveCount(0);

  // 翻开第一格（必定安全）：出现已翻开格，计时开始
  await page.locator('.ms-cell').first().click();
  await expect(page.locator('.ms-cell.open').first()).toBeVisible();
  await page.waitForTimeout(1400);
  const timeText = await page.locator('.ms-stats span').first().locator('b').textContent();
  expect(timeText).not.toBe('0:00');

  // 插旗模式：点未翻开的格子插旗，再点取消
  await page.getByRole('button', { name: '插旗模式' }).click();
  await expect(page.getByRole('button', { name: '插旗模式' })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.ms-cell:not(.open)').first().click();
  await expect(page.locator('.ms-cell.flag').first()).toBeVisible();
  await page.locator('.ms-cell.flag').first().click();
  await expect(page.locator('.ms-cell.flag')).toHaveCount(0);

  // 切回挖开模式
  await page.getByRole('button', { name: '挖开模式' }).click();
  await expect(page.getByRole('button', { name: '插旗模式' })).toHaveAttribute('aria-pressed', 'false');
});

test('排雷提示自动插旗且每局一次，右键可插旗', async ({ page }) => {
  const overlay = await openMines(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  // 未翻开首格前提示会引导，翻开后再用
  await page.getByRole('button', { name: '排雷提示' }).click();
  await expect(page.getByText('先翻开一格，我再帮你标雷')).toBeVisible();
  await page.locator('.ms-cell').first().click();
  await expect(page.locator('.ms-cell.open').first()).toBeVisible();

  await page.getByRole('button', { name: '排雷提示' }).click();
  await expect(page.locator('.ms-cell.flag')).toHaveCount(1);
  await expect(page.getByText('小提示：这一格埋着星雷 ⚑')).toBeVisible();
  await expect(page.getByRole('button', { name: '排雷提示' })).toBeDisabled();

  // 右键也可插旗
  await page.locator('.ms-cell:not(.open):not(.flag)').first().click({ button: 'right' });
  await expect(page.locator('.ms-cell.flag')).toHaveCount(2);
});

test('结束对局写入游玩记录并可再来一局', async ({ page }) => {
  test.setTimeout(120_000);
  const overlay = await openMines(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  // 一直翻格直到踩雷或全部翻开（胜负均会结束本局）
  const over = page.locator('.ms-overlay.over');
  for (let i = 0; i < 95 && (await over.count()) === 0; i++) {
    const hidden = page.locator('.ms-cell:not(.open):not(.flag)');
    if ((await hidden.count()) === 0) break;
    await hidden.first().click();
  }
  await expect(over).toBeVisible();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-mines');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(2); // 默认「认真」难度
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 再来一局重置棋盘
  await over.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('.ms-cell.open')).toHaveCount(0);
  await expect(page.locator('.ms-cell.flag')).toHaveCount(0);
  await expect(page.locator('.ms-cell')).toHaveCount(100);
});
