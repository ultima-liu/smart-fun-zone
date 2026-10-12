import { expect, test } from '@playwright/test';

test('四声小汽车演示能切换单韵母，观察完成后推进，手动回来仍能演示', async ({ page }) => {
  const child = 'tone-demo';
  await page.route('**/api/**', route => route.fulfill({ json: { ok: true, ttsConfigured: false } }));
  await page.addInitScript(({ child }) => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
      lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false,
      profiles: [{ id: child, name: '声调学习', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child,
      records: [], mastery: {}, lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
    } }));
    localStorage.setItem(`sfz-chinese-flow-v1:${child}:pinyin-a-o-e`, JSON.stringify({ phase: 2, unlocked: 2 }));
  }, { child });
  await page.goto('/#/chinese-course/pinyin-a-o-e');
  await page.getByRole('tab', { name: '声调与拼读', exact: true }).click();
  const demo = page.locator('.ct-tone-demo');
  await expect(demo.locator('.ct-tone-road-grid > button')).toHaveCount(4);
  await demo.getByRole('button', { name: 'á，二声往上扬', exact: true }).click();
  await expect(demo.locator('.is-moving')).toHaveCount(1);
  await demo.getByRole('button', { name: 'o', exact: true }).click();
  await expect(demo.locator('.is-moving')).toHaveCount(0);
  await demo.getByRole('button', { name: 'ǒ，三声先降再升', exact: true }).click();
  await demo.getByRole('button', { name: 'e', exact: true }).click();
  await demo.getByRole('button', { name: 'è，四声往下降', exact: true }).click();
  await expect(page.getByRole('tab', { name: '口型示范', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: '声调与拼读', exact: true }).click();
  await demo.getByRole('button', { name: 'e', exact: true }).click();
  await demo.getByRole('button', { name: 'ē，一声平平走', exact: true }).click();
  await expect(page.getByRole('tab', { name: '声调与拼读', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.waitForTimeout(500);
  await expect(demo).toBeVisible();
  await page.getByRole('tab', { name: '教材补充', exact: true }).click();
  await expect(demo.locator('.is-moving')).toHaveCount(0);
});
