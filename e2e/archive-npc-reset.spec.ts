import { test, expect } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

test('旧档案迁移后卷星人卡牌恢复未点亮，其他套系保留', async ({ page }) => {
  const childId = 'npc-reset-child';
  await page.goto('/#/');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.evaluate((id) => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', profiles: [{ id, name: '测试小卷', avatarId: 'girl', age: 5, createdAt: Date.now() }],
        activeChildId: id,
        archivedCards: { [id]: ['npc-a-guang', 'npc-jing-jing', 'mon-mist'] },
        cardRewardClaimed: { [id]: ['npc'] },
      },
      version: 0,
    }));
  }, childId);
  await page.reload();
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.goto('/#/archive');
  await expect(page.locator('.archive-page')).toBeVisible({ timeout: 20_000 });

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state);
  expect(stored.archivedCards[childId]).toEqual(['mon-mist']);
  expect(stored.cardRewardClaimed[childId]).toEqual([]);
  await expect(page.locator('.filter-tier').first().getByRole('tab', { name: /卷星人 0\/6/ })).toBeVisible();
});
