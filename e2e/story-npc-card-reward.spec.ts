import { test, expect } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

test('完成 NPC 对话后在任务条领取对应图鉴卡', async ({ page }) => {
  const childId = 'story-card-child';
  await page.goto('/#/');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.evaluate((id) => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', profiles: [{ id, name: '测试小卷', avatarId: 'girl', age: 5, createdAt: Date.now() }],
        activeChildId: id, storyDone: { [id]: [] }, points: { [id]: 0 }, pointLog: { [id]: [] },
        archivedCards: {}, cardRewardClaimed: {},
      },
      version: 1,
    }));
  }, childId);
  await page.reload();
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.goto('/#/profile');

  const dialog = page.locator('.sd-bubble-card');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.locator('.sd-reward-card')).toContainText('总指挥官·铁砣');
  for (let i = 0; i < 4; i++) await page.locator('.sd-next').click();
  await expect(page.locator('.story-strip')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.story-strip .ss-action-pill')).toContainText('领取');
  await page.locator('.story-strip').click();
  await expect(page.locator('.reward-burst')).toContainText('图鉴卡「总指挥官·铁砣」');
  await page.waitForFunction((id) => {
    const raw = localStorage.getItem('smart-fun-zone');
    return !!raw && JSON.parse(raw)?.state?.archivedCards?.[id]?.includes('npc-tie-tuo');
  }, childId, { timeout: 10_000 });
});
