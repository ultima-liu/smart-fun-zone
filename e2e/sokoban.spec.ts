import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'sk-child', name: '小搬运工', avatar: '📦', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'sk-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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

async function openSokoban(page: import('@playwright/test').Page) {
  await page.goto('/#/lobby');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.getByRole('tab', { name: '益智' }).click();
  await page.getByRole('button', { name: '开始运箱' }).click();
  await expect(page.locator('#sk-title')).toBeVisible();
  return page.locator('.sk-overlay');
}

/** 第 1 关（星光初运）最优走法：站位右推三格、绕下、上推两格入盘 */
async function solveLevel1(page: import('@playwright/test').Page) {
  await page.keyboard.press('d'); // (5,1) → (5,2)
  await page.keyboard.press('w'); // → (4,2) 站到星箱左侧
  await page.keyboard.press('d');
  await page.keyboard.press('d');
  await page.keyboard.press('d'); // 星箱 (4,3) → (4,6)
  await page.keyboard.press('s'); // 绕到星箱下方
  await page.keyboard.press('d');
  await page.keyboard.press('w'); // 上推两格入盘
  await page.keyboard.press('w');
}

test('推箱子支持移动、撤销与完整通关记录', async ({ page }) => {
  const overlay = await openSokoban(page);

  await expect(page.getByText('第1关 · 星光初运')).toBeVisible();
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('第1关 · 星光初运')).toHaveCount(0);
  await expect(page.locator('.sk-box')).toHaveCount(1);
  await expect(page.locator('.sk-hero')).toHaveCount(1);

  // 移动两步：步数随动
  await page.keyboard.press('d');
  await page.keyboard.press('d');
  await expect(page.locator('.sk-stats span').nth(1).locator('b')).toHaveText('2');

  // 撤销一步：步数回退
  await page.keyboard.press('z');
  await expect(page.locator('.sk-stats span').nth(1).locator('b')).toHaveText('1');

  // 走完最优路径通关
  await page.keyboard.press('z'); // 回到起点
  await solveLevel1(page);

  const over = page.locator('.sk-overlay.over');
  await expect(over).toBeVisible({ timeout: 5_000 });
  await expect(over.getByText('本关完成！')).toBeVisible();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-sokoban');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(1);
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 下一关：棋盘尺寸随第 2 关变化，覆盖层收起
  await over.getByRole('button', { name: /下一关/ }).click();
  await expect(page.locator('.sk-status-box')).toContainText('第2关');
  await expect(page.locator('.sk-grid')).toHaveCount(1);
  await expect(page.locator('.sk-box')).toHaveCount(1);
});

test('推箱子难度分档与关卡切换', async ({ page }) => {
  const overlay = await openSokoban(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  // 切到「高手」分档：直接开第 9 关（4 箱）
  await page.getByRole('button', { name: '高手：第9-12关' }).click();
  await expect(page.locator('.sk-status-box')).toContainText('第9关');
  await expect(page.locator('.sk-box')).toHaveCount(4);

  // 关卡芯片切到第 12 关
  await page.getByRole('button', { name: '第12关 总仓大考' }).click();
  await expect(page.locator('.sk-status-box')).toContainText('第12关');
  await expect(page.locator('.sk-level-chips button.active')).toHaveCount(1);

  // 触屏方向盘可移动小星使
  await page.getByRole('button', { name: '向右移动' }).click();
  await expect(page.locator('.sk-stats span').nth(1).locator('b')).not.toHaveText('0');
});
