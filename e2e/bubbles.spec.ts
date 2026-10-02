import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

// 固定 Math.random，让棋盘布阵与发泡序列可复现（对局策略固定时结局确定）
const SEED_RANDOM = `
  (() => {
    let s = 20260930 >>> 0;
    Math.random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
`;

const SEED_STATE = `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
      profiles: [{ id: 'bb-child', name: '小泡泡龙', avatar: '🐳', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'bb-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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
  await page.addInitScript(SEED_RANDOM);
  await page.addInitScript(SEED_STATE);
});

async function openBubbles(page: import('@playwright/test').Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: '消除' }).click();
  await page.getByRole('button', { name: '开始吹泡' }).click();
  await expect(page.locator('#bb-title')).toBeVisible();
  return page.locator('.bb-overlay');
}

const gridBubbles = (page: import('@playwright/test').Page) =>
  page.locator('.bb-board > .bb-bubble:not(.bb-loader):not(.bb-proj)');

const scoreOf = async (page: import('@playwright/test').Page) =>
  Number((await page.locator('.bb-score-row b').textContent()) ?? '0');

test('泡泡龙支持开始、键盘瞄准、发射粘附与换泡', async ({ page }) => {
  const overlay = await openBubbles(page);
  const board = page.locator('.bb-board');

  // 待开始覆盖层：说明 + 开始按钮，初始云阵已布好
  await expect(page.getByText('准备吹泡')).toBeVisible();
  const initial = await gridBubbles(page).count();
  expect(initial).toBeGreaterThan(30);

  // 开始后炮台默认竖直向上（90° → rotate(-90deg)），左右键瞄准
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('准备吹泡')).toHaveCount(0);
  const aimWrap = board.locator('.bb-aim-wrap');
  await expect(aimWrap).toHaveAttribute('style', /rotate\(-90deg\)/);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(aimWrap).toHaveAttribute('style', /rotate\(-98deg\)/);

  // 发射：泡泡飞出并粘附到云阵（或触发消散，分数变化）
  const before = await gridBubbles(page).count();
  const scoreBefore = await scoreOf(page);
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  const after = await gridBubbles(page).count();
  expect(after !== before || (await scoreOf(page)) !== scoreBefore).toBeTruthy();

  // 换泡泡：当前与下一颗的颜色互换
  const ammoColors = await page.locator('.bb-ammo-hold .bb-bubble').evaluateAll((els) => els.map((el) => el.className));
  await page.keyboard.press('x');
  const swapped = await page.locator('.bb-ammo-hold .bb-bubble').evaluateAll((els) => els.map((el) => el.className));
  expect(swapped[0]).toContain(ammoColors[1]!.split(' ')[1]!);
  expect(swapped[1]).toContain(ammoColors[0]!.split(' ')[1]!);
});

test('同色三连泡泡会消散加分', async ({ page }) => {
  const overlay = await openBubbles(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  // 垂直向上连续发射（种子固定，布阵与泡泡序列确定），迟早凑成三连
  let popped = false;
  for (let i = 0; i < 30 && !popped; i++) {
    if (await page.locator('.bb-overlay.clear').count()) {
      await page.waitForTimeout(3400); // 通关面板自动进入下一云层
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(520);
    popped = (await scoreOf(page)) > 0;
  }
  expect(popped).toBeTruthy();
  await expect(page.locator('.bb-stats span', { hasText: '消泡' })).toContainText(/[1-9]/);
});

test('泡泡龙可暂停继续，后台标签自动暂停', async ({ page }) => {
  const overlay = await openBubbles(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  await page.keyboard.press('p');
  await expect(page.getByText('暂停中')).toBeVisible();
  await expect(overlay.getByRole('button', { name: '继续 (P)' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('暂停中')).toHaveCount(0);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('暂停中')).toBeVisible();
});

test('泡泡漫过警戒线结束对局并写入游玩记录', async ({ page }) => {
  const overlay = await openBubbles(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  const over = page.locator('.bb-overlay.over');
  for (let i = 0; i < 70 && (await over.count()) === 0; i++) {
    if (await page.locator('.bb-overlay.clear').count()) {
      await page.waitForTimeout(3400);
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(430);
  }
  await expect(over).toBeVisible();
  await expect(over.getByText('泡泡漫过警戒线！')).toBeVisible();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-bubbles');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(2); // 默认「认真」浓度
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 再来一局重新开局，云阵重新布好
  await over.getByRole('button', { name: '再来一局' }).click();
  await expect(page.getByText('准备吹泡')).toHaveCount(0);
  expect(await gridBubbles(page).count()).toBeGreaterThan(30);
});
