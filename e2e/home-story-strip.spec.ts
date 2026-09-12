import { test, expect } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

test('首页新手引导任务条位于中栏卷星上方且不重叠', async ({ page }) => {
  const childId = 'story-layout-child';
  await page.goto('/#/');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.evaluate((id) => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: true, musicOn: true, voiceOn: true,
        profiles: [{ id, name: '测试小卷', avatarId: 'girl', age: 5, createdAt: Date.now() }],
        activeChildId: id, records: [], mastery: {}, lessonProgress: {}, charBag: {},
        storyDone: { [id]: [] }, storyPulse: null, wrongs: {}, points: { [id]: 0 }, pointLog: { [id]: [] },
        customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {},
        taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {},
        archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
      },
      version: 0,
    }));
  }, childId);
  await page.reload();
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });

  const strip = page.locator('.home-center > .story-strip');
  const planet = page.locator('.home-center > .hero-planet-zone');
  const lootPrompt = page.locator('.loot-prompt');
  await expect(strip).toBeVisible();
  await expect(planet).toBeVisible();
  await expect(lootPrompt).toBeVisible();
  await expect(page.locator('.home-dash > .story-strip')).toHaveCount(0);

  const [stripBox, planetBox] = await Promise.all([strip.boundingBox(), planet.boundingBox()]);
  expect(stripBox).not.toBeNull();
  expect(planetBox).not.toBeNull();
  expect((stripBox?.y ?? 0) + (stripBox?.height ?? 0)).toBeLessThanOrEqual(planetBox?.y ?? 0);
  expect((await lootPrompt.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(208);
});
