import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const id = 'gold-miner-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
        profiles: [{ id, name: '寻金小星', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
        activeChildId: id, records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
        wrongs: {}, points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, taskStates: {},
        ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {},
        bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
        expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {},
        showBadges: {}, badges: {},
      },
      version: 6,
    }));
  });
});

test('益智分类可以进入黄金矿工、放钩并暂停恢复', async ({ page }) => {
  await page.goto('/#/lobby');

  await page.getByRole('tab', { name: /益智/ }).click();
  const card = page.getByRole('article').filter({ hasText: '云端黄金矿工' });
  await expect(card.getByRole('heading', { name: '云端黄金矿工' })).toBeVisible();
  await expect(card).toContainText('五层寻宝');
  await card.getByRole('button', { name: '开始寻金' }).click();

  const game = page.locator('.gm-expedition');
  await expect(game.getByRole('heading', { name: '云端黄金矿工' })).toBeVisible();
  await expect(game.getByRole('button', { name: '开始寻金' })).toBeVisible();
  await game.getByRole('button', { name: '开始寻金' }).click();

  const drop = game.getByRole('button', { name: /放下飞爪/ });
  await expect(drop).toBeEnabled();
  await drop.click();
  await expect(drop).toBeDisabled();
  await expect(game).toContainText('采矿中');

  await game.getByRole('button', { name: 'Ⅱ 暂停' }).click();
  await expect(game.getByText('矿车暂时停靠')).toBeVisible();
  await game.getByRole('button', { name: '继续采矿' }).click();
  await expect(game.getByRole('button', { name: 'Ⅱ 暂停' })).toBeVisible();
});

test('过关后可以在洛奇商店购买道具并带入下一层', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Math.random = () => .5;
  });
  await page.goto('/#/lobby');

  await page.getByRole('tab', { name: /益智/ }).click();
  await page.getByRole('article').filter({ hasText: '云端黄金矿工' }).getByRole('button', { name: '开始寻金' }).click();

  const game = page.locator('.gm-expedition');
  await game.getByRole('button', { name: '轻松' }).click();
  await game.getByRole('button', { name: '开始寻金' }).click();

  // 固定矿藏位于正下方：等待摆钩转正后放下，抓到一颗 $600 星钻即可达标。
  await page.clock.runFor(770);
  await game.getByRole('button', { name: /放下飞爪/ }).click();
  await page.clock.runFor(2_400);
  await expect(game).toContainText('$600');

  await page.clock.runFor(70_000);
  await expect(game.getByText('洛奇的云矿补给店')).toBeVisible();
  await expect(game.getByText('可用收获')).toBeVisible();

  const hourglass = game.getByRole('button', { name: /时光沙漏/ });
  await hourglass.click();
  await expect(hourglass).toContainText('已购买');
  await expect(game).toContainText('$290');

  await game.getByRole('button', { name: /装车，深入下一层/ }).click();
  await expect(game).toContainText('第 2 / 5 层');
  await expect(game).toContainText('⌛ +15s');
});
