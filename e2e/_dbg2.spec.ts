import { expect, test } from '@playwright/test';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test.use({ launchOptions: { executablePath: CHROME } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const childId = 'chinese-textbook-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: true, musicOn: false, voiceOn: true,
        profiles: [{ id: childId, name: '语文体验生', avatarId: 'boy', age: 6, createdAt: Date.now() }],
        activeChildId: childId, records: [], mastery: {}, lessonProgress: {}, charBag: {},
        storyDone: { [childId]: ['p1'] }, storyPulse: null, wrongs: {}, points: { [childId]: 0 }, pointLog: { [childId]: [] },
        customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
      },
      version: 0,
    }));
  });
});
test('debug catalog narrate', async ({ page }) => {
  page.on('console', (m) => { const t = m.text(); if (t.includes('[narrate]')) console.log('>>', t); });
  await page.goto('/#/');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.evaluate(() => { location.hash = '#/subject/chinese'; });
  await expect(page.locator('.ct-catalog')).toBeVisible();
  await page.waitForTimeout(1800);
  await page.locator('.ct-lesson-entry').first().click();
  await page.waitForTimeout(1500);
});
