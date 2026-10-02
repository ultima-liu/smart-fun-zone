import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'hrd-child', name: '小谋士', avatar: '🏯', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'hrd-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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

async function openKlotski(page: import('@playwright/test').Page) {
  await page.goto('/#/lobby');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.getByRole('tab', { name: '益智' }).click();
  await page.getByRole('button', { name: '开始破阵' }).click();
  await expect(page.locator('#hrd-title')).toBeVisible();
  return page.locator('.hrd-overlay');
}

test('华容道支持选块滑动、连滑计一步与出城结算', async ({ page }) => {
  const overlay = await openKlotski(page);

  await expect(page.getByText('第1阵 · 让开小道')).toBeVisible();
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('第1阵 · 让开小道')).toHaveCount(0);
  await expect(page.locator('.hrd-piece')).toHaveCount(9);
  await expect(page.locator('.hrd-piece.cao')).toHaveCount(1);

  // 两兵让路：兵一左滑、兵二右滑（各计一步）
  await page.locator('.hrd-piece.s').first().click();
  await page.keyboard.press('a');
  await page.locator('.hrd-piece.s').nth(1).click();
  await page.keyboard.press('d');
  await expect(page.locator('.hrd-move-row b')).toHaveText('2');

  // 曹操连滑三格到星门：同块同向只计一步
  await page.locator('.hrd-piece.cao').click();
  await expect(page.locator('.hrd-piece.cao')).toHaveClass(/sel/);
  await page.keyboard.press('s');
  await page.keyboard.press('s');
  await page.keyboard.press('s');
  await expect(page.locator('.hrd-piece.cao')).toHaveClass(/escape/);

  const over = page.locator('.hrd-overlay.over');
  await expect(over).toBeVisible({ timeout: 5_000 });
  await expect(over.getByText('曹操出城啦！')).toBeVisible();
  await expect(page.locator('.hrd-final')).toContainText('3');

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-klotski');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(1);
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 下一阵：切换到「近在眼前」
  await over.getByRole('button', { name: /下一阵/ }).click();
  await expect(page.locator('.hrd-status-box')).toContainText('第2阵');
});

test('华容道支持拖拽滑动、撤销与换阵重开', async ({ page }) => {
  const overlay = await openKlotski(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  // 指针拖拽兵一左滑一格
  const soldier = page.locator('.hrd-piece.s').first();
  const box = await soldier.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 - 42, box!.y + box!.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.hrd-move-row b')).toHaveText('1');

  // 撤销：步数归零
  await page.keyboard.press('z');
  await expect(page.locator('.hrd-move-row b')).toHaveText('0');

  // 换阵到经典「横刀立马」：10 块重排
  await page.getByRole('button', { name: '第6阵 横刀立马，最少 90 步' }).click();
  await expect(page.locator('.hrd-status-box')).toContainText('第6阵');
  await expect(page.locator('.hrd-piece')).toHaveCount(10);
  await expect(page.locator('.hrd-piece.cao')).toHaveCount(1);

  // 重开按钮恢复初始布阵（先把兵三右移一步再重开）
  await page.locator('.hrd-piece.s').nth(2).click();
  await page.keyboard.press('d');
  await page.getByRole('button', { name: '重开本阵' }).click();
  await expect(page.locator('.hrd-move-row b')).toHaveText('0');
});
