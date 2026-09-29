import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const id = 'mission-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
        profiles: [{ id, name: '任务体验生', avatar: '🐰', ageBand: 'g1', createdAt: Date.now() }], activeChildId: id,
        records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {}, wrongs: {},
        points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, taskStates: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {},
        storeOverrides: {}, taskOverrides: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
        expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
      },
      version: 6,
    }));
  });
});

test('首页保留卷星主体并从旁边的通讯进入航行舱', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.juan-star')).toBeVisible();
  await expect(page.getByRole('region', { name: '当前任务通讯' })).toBeVisible();
  await expect(page.locator('.home-mission-orbit')).toContainText('今天想先学哪门课');
  await expect(page.locator('.pass-card')).toHaveCount(0);
  await expect(page.locator('.task-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /打开航行舱/ }).click();
  await page.getByRole('button', { name: /语文/ }).click();
  await expect(page.getByRole('dialog', { name: '我的航行舱' })).toContainText('语文');
  await page.getByRole('button', { name: '关闭航行舱' }).click();
  await expect(page.locator('.home-mission-orbit')).toContainText('语文');
  await expect(page.locator('.bottom-nav')).toBeVisible();
});

test('专项挑战按第一次作答结算并只发一次奖励', async ({ page }) => {
  await page.goto('/#/task/challenge:math:within-five');
  const answers = [1, 0, 1, 1, 1, 1];
  for (let index = 0; index < answers.length; index += 1) {
    await page.locator('.mission-options button').nth(answers[index]).click();
    await page.getByRole('button', { name: index === answers.length - 1 ? '完成任务' : '下一关 →' }).click();
  }
  await expect(page.getByRole('heading', { name: '任务完成！' })).toBeVisible();
  await expect(page.getByText('卷卷豆 +15')).toBeVisible();
  const ledger = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state.pointLog['mission-child']);
  expect(ledger.filter((entry: { id: string }) => entry.id === 'mission:challenge:math:within-five')).toHaveLength(1);
});
