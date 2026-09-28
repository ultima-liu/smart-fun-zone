import { expect, test } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test.use({ launchOptions: { executablePath: CHROME } });

test.beforeEach(async ({ page }) => {
  const childId = 'park-arcade-child';
  await page.addInitScript((id) => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: true, voiceOn: false,
        profiles: [{ id, name: '小小游乐师', avatar: '🦊', ageBand: 'g1', createdAt: Date.now() }], activeChildId: id,
        records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {}, storyDone: { [id]: ['p1', 'c1-1', 'c1-2'] }, storyRewardClaimed: {}, storyUpdatedAt: {}, storyPulse: null,
        wrongs: {}, points: { [id]: 0 }, gameCoins: {}, pointLog: { [id]: [] }, customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
      },
      version: 4,
    }));
  }, childId);
});

test('乐园街机：进入乐园 → 开一局泡泡打打 → 结算掉乐园币并记录最高分', async ({ page }) => {
  await page.goto('/#/lobby');
  await expect(page.getByRole('heading', { name: '空中乐园' })).toBeVisible();
  // 7 个游乐设施卡片，未玩过显示 NEW
  await expect(page.locator('.park-attraction-card')).toHaveCount(7);
  await expect(page.locator('.park-attraction-card .game-new')).toHaveCount(7);

  // ?t=8 缩短一局时长（e2e 专用）；先出现玩法说明卡，念完规则点「开始玩」才开局
  await page.goto('/#/game/bubble-pop?t=8');
  await expect(page.getByRole('heading', { name: '泡泡打打' })).toBeVisible();
  await expect(page.getByText('怎么玩')).toBeVisible();
  await expect(page.locator('.arcade-intro-rules li')).toHaveCount(3);
  await expect(page.getByText('一局 8 秒')).toBeVisible();
  await page.getByRole('button', { name: /开始玩/ }).click();
  await expect(page.locator('.pop-field')).toBeVisible();
  await expect(page.locator('.arcade-hud')).toBeVisible();
  // 等 8 秒一局自然结束，出现结算
  await expect(page.getByText('太棒了！')).toBeVisible({ timeout: 20_000 });
  const coins = await page.locator('.arcade-coins').textContent();
  await expect(coins).toMatch(/🪙 \+\d+ 乐园币/);

  // 结算回到乐园：NEW 徽标消失、乐园币余额入账
  await page.getByRole('button', { name: '空中乐园' }).click();
  await expect(page.getByRole('heading', { name: '空中乐园' })).toBeVisible();
  await expect(page.locator('.park-attraction-card .game-new')).toHaveCount(6);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state);
  expect(stored.records).toHaveLength(1);
  expect(stored.records[0]).toMatchObject({ childId: 'park-arcade-child', gameId: 'bubble-pop', stars: 0 });
  expect(typeof stored.records[0].score).toBe('number');
  expect(stored.gameCoins['park-arcade-child']).toBeGreaterThan(0);
});
