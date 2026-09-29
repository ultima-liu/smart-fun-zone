import { expect, test } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test.use({ launchOptions: { executablePath: CHROME } });

test('全新浏览器可从欢迎页本机试玩水果店', async ({ page }) => {
  await page.goto('/#/');
  const invite = page.getByRole('button', { name: /本机试玩：兔兔水果店重新开张/ });
  await expect(invite).toBeVisible();
  await invite.click();
  await expect(page.getByRole('region', { name: '水果店重新开张' })).toBeVisible();
  await expect(page.getByRole('button', { name: '红苹果招牌' })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state);
  expect(state.activeChildId).toBe('local-fruit-shop-demo');
});
