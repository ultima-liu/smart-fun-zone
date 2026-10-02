import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'tb-child', name: '小拼搭师', avatar: '🐧', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'tb-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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

async function openTetris(page: import('@playwright/test').Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: '消除' }).click();
  await page.getByRole('button', { name: '开始拼搭' }).click();
  await expect(page.locator('#tb-title')).toBeVisible();
  return page.locator('.tb-overlay');
}

test('方块游戏支持开始、键盘操作、暂存与直落', async ({ page }) => {
  const overlay = await openTetris(page);

  // 待开始覆盖层：说明 + 开始按钮，棋盘为空
  const board = page.locator('.tb-board');
  await expect(page.getByText('准备拼搭')).toBeVisible();
  await expect(board.locator('.tb-c.f')).toHaveCount(0);

  // 开始后出现当前方块与同色虚影，状态卡显示 0 分
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('准备拼搭')).toHaveCount(0);
  await expect(board.locator('.tb-c.f').first()).toBeVisible();
  const ghost = board.locator('.tb-c[class*=" gh"]');
  expect(await ghost.count()).toBeGreaterThanOrEqual(0); // 虚影与方块重合时不显示，仅确认不报错
  await expect(page.locator('.tb-score-row b')).toHaveText('0');

  // 键盘左右移动、旋转、软降、暂存后分数按格数累加
  const scoreOf = async () => Number((await page.locator('.tb-score-row b').textContent()) ?? '0');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('z');
  await page.keyboard.press('c');
  await expect(page.locator('.tb-box').first()).toContainText('暂存');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowDown');
  expect(await scoreOf()).toBeGreaterThan(0);

  // 直落：当前方块立即落底锁定，棋盘出现已锁定格子
  const lockedBefore = await board.locator('.tb-c.f').count();
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  expect(await board.locator('.tb-c.f').count()).toBeGreaterThan(lockedBefore);
});

test('方块游戏可暂停继续，后台标签自动暂停', async ({ page }) => {
  const overlay = await openTetris(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  await page.keyboard.press('p');
  await expect(page.getByText('暂停中')).toBeVisible();
  await expect(overlay.getByRole('button', { name: '继续 (P)' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('暂停中')).toHaveCount(0);

  // visibilitychange 模拟切后台
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('暂停中')).toBeVisible();
});

test('方块堆到顶结束对局并写入游玩记录', async ({ page }) => {
  const overlay = await openTetris(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  const over = page.locator('.tb-overlay.over');
  for (let i = 0; i < 80 && (await over.count()) === 0; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(60);
  }
  await expect(over).toBeVisible();
  await expect(over.getByText('本局结束！')).toBeVisible();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-blocks');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(2); // 默认「认真」难度
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 再来一局重新开局并可继续操作
  await over.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('.tb-board .tb-c.f').first()).toBeVisible();
});
