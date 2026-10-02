import { expect, test, type Page } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
      profiles: [{ id: 'sl-child', name: '小接龙师', avatar: '♠', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'sl-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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
  await page.addInitScript(SEED_STATE);
});

async function openSolitaire(page: Page) {
  await page.goto('/#/lobby');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.getByRole('tab', { name: '牌类' }).click();
  await page.getByRole('button', { name: '开始接龙' }).click();
  await expect(page.locator('#sl-title')).toBeVisible();
  return page.locator('.sl-overlay');
}

const stockCount = (page: Page) => page.locator('.sl-stock-count');

test('经典发牌、翻牌堆循环与撤销', async ({ page }) => {
  const overlay = await openSolitaire(page);

  // 待开始覆盖层 + 经典 Klondike 发牌：7 列共 28 张（7 张亮面），牌堆 24 张
  await expect(page.getByText('准备发牌')).toBeVisible();
  await expect(page.locator('.sl-tab-card')).toHaveCount(28);
  await expect(page.locator('.sl-tab-card.up')).toHaveCount(7);
  await expect(page.locator('.sl-tableau .sl-card-btn')).toHaveCount(7);

  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('准备发牌')).toHaveCount(0);
  await expect(stockCount(page)).toHaveText('24');

  // 轻松档一次翻 1 张：弃牌堆出现 1 张亮牌，牌堆 23
  await page.locator('.sl-stock').click();
  await expect(stockCount(page)).toHaveText('23');
  await expect(page.locator('.sl-wastezone .sl-card.up')).toHaveCount(1);

  // 撤销翻牌：牌堆回到 24，弃牌堆清空
  await page.getByRole('button', { name: '撤销 (U)' }).click();
  await expect(stockCount(page)).toHaveText('24');
  await expect(page.locator('.sl-wastezone .sl-card.up')).toHaveCount(0);

  // 把 24 张全部翻出：牌堆变空显示重翻 ↻，弃牌堆最多显示 3 张
  for (let i = 0; i < 24; i++) await page.locator('.sl-stock').click();
  await expect(page.locator('.sl-recycle')).toBeVisible();
  await expect(page.locator('.sl-wastezone .sl-card.up')).toHaveCount(3);

  // 点空的牌堆：弃牌堆翻回牌堆（轻松档无限重翻）
  await page.locator('.sl-stock').click();
  await expect(stockCount(page)).toHaveText('24');
  await expect(page.locator('.sl-wastezone .sl-card.up')).toHaveCount(0);
});

test('选中亮面牌与接龙提示每局一次', async ({ page }) => {
  const overlay = await openSolitaire(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  // 点一张牌桌顶牌：进入选中（金边），再点一次取消选中
  const firstTop = page.locator('.sl-tableau .sl-card-btn').first();
  await firstTop.click();
  await expect(page.locator('.sl-tab-card.sl-sel').first()).toBeVisible();
  await firstTop.click();
  await expect(page.locator('.sl-tab-card.sl-sel')).toHaveCount(0);

  // 提示：高亮源与目标，每局一次
  await page.getByRole('button', { name: '接龙提示' }).click();
  await expect(page.locator('.sl-hinting').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '接龙提示' })).toBeDisabled();
  await page.waitForTimeout(2100);
  await expect(page.locator('.sl-hinting')).toHaveCount(0);

  // 已收星牌进度条可见且从 0 开始
  await expect(page.locator('.sl-collect-row b')).toContainText('0');
});
