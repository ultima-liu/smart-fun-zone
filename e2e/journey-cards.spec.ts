import { expect, test } from '@playwright/test';
import { JOURNEY_CARDS } from '../src/content/journeyCards';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

for (const [name, width, height, theme] of [['web', 1440, 1000, 'dark'], ['pad', 820, 1180, 'light']] as const) {
  test(`西游记套系：筛选、详情与集齐奖励 · ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(({ ids, theme }) => {
      localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
        lang: 'zh', theme, voiceOn: false, sound: false,
        profiles: [{ id: 'journey-kid', name: '西行小读者', avatarId: 'girl', age: 6, createdAt: Date.now() }], activeChildId: 'journey-kid',
        points: { 'journey-kid': 100 }, pointLog: { 'journey-kid': [] }, archivedCards: { 'journey-kid': ids }, cardRewardClaimed: {},
      } }));
    }, { ids: JOURNEY_CARDS.map((card) => card.id), theme });
    await page.goto('/#/archive');
    const series = page.locator('.filter-tier').first();
    await series.getByRole('tab', { name: /西游记/ }).click();
    await expect(page.locator('.journey-collection-hero')).toContainText('西行绘卷');
    await expect(page.locator('.journey-card')).toHaveCount(10);
    const hrefs = await page.locator('.journey-character-art').evaluateAll((images) => images.map((image) => image.getAttribute('href')!));
    expect(new Set(hrefs).size).toBe(10);
    for (const href of hrefs) expect((await page.request.get(href)).ok()).toBe(true);
    await page.locator('.journey-card').first().press('Enter');
    await expect(page.locator('.journey-preview .journey-lore')).toContainText('如意金箍棒');
    await expect(page.locator('.journey-lore a')).toHaveAttribute('href', /第014回/);
    await page.screenshot({ path: `e2e/__screenshots__/journey-detail-${name}.png` });
    await page.getByRole('button', { name: '翻转卡片' }).click();
    await expect(page.locator('.preview-card')).toHaveClass(/flipped/);
    await page.locator('.card-preview-close').click();
    await page.locator('.filter-tier').nth(1).getByRole('tab', { name: /SP/ }).click();
    await expect(page.locator('.journey-card')).toHaveCount(2);
    await page.locator('.filter-tier').nth(1).getByRole('tab', { name: /全部/ }).click();
    await page.locator('.set-reward').getByRole('button', { name: '领取', exact: true }).click();
    await expect(page.locator('.set-reward')).toContainText('已领取');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.points['journey-kid'])).toBe(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.locator('.journey-collection-hero').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `e2e/__screenshots__/journey-${name}.png`, fullPage: true });
    await series.getByRole('tab', { name: /卷星人/ }).click();
    await expect(page.locator('.ccard')).toHaveCount(6);
    await expect(page.locator('.journey-portrait')).toHaveCount(0);
  });
}
