import { expect, test } from '@playwright/test';
import { HULU_CARDS } from '../src/content/huluCards';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

for (const [name, width, height, theme] of [['web', 1440, 1000, 'dark'], ['pad', 820, 1180, 'light'], ['pad-landscape', 1180, 820, 'dark']] as const) {
  test(`葫芦娃：人物详情、筛选与一次性奖励 · ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(({ ids, theme }) => {
      if (localStorage.getItem('smart-fun-zone')) return;
      localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
        lang: 'zh', theme, voiceOn: false, sound: false,
        profiles: [{ id: 'hulu-kid', name: '葫芦小伙伴', avatarId: 'girl', age: 6, createdAt: Date.now() }], activeChildId: 'hulu-kid',
        points: { 'hulu-kid': 100 }, pointLog: { 'hulu-kid': [] }, archivedCards: { 'hulu-kid': ids }, cardRewardClaimed: {},
      } }));
    }, { ids: HULU_CARDS.map((card) => card.id), theme });
    await page.goto('/#/archive');
    const series = page.locator('.filter-tier').first();
    await series.getByRole('tab', { name: /葫芦娃/ }).click();
    await expect(page.locator('.hulu-collection-hero')).toContainText('七色葫芦山');
    await expect(page.locator('.gallery-shelf .hulu-card')).toHaveCount(11);
    await expect(page.locator('.hulu-progress progress')).toHaveAttribute('value', '11');
    const hrefs = await page.locator('.hulu-character-art').evaluateAll((images) => images.map((image) => image.getAttribute('href')!));
    expect(new Set(hrefs).size).toBe(11);
    for (const href of hrefs) expect((await page.request.get(href)).ok()).toBe(true);
    await page.locator('.hulu-card[title="四娃"]').press('Enter');
    await expect(page.locator('.hulu-preview .hulu-lore')).toContainText('喷吐火焰');
    await page.screenshot({ path: `e2e/__screenshots__/hulu-detail-${name}.png` });
    await page.getByRole('button', { name: '翻转卡片' }).click();
    await expect(page.locator('.preview-card')).toHaveClass(/flipped/);
    await page.locator('.card-preview-close').click();
    await page.locator('.filter-tier').nth(1).getByRole('tab', { name: /SP/ }).click();
    await expect(page.locator('.gallery-shelf .hulu-card')).toHaveCount(1);
    await expect(page.locator('.gallery-shelf')).toContainText('七娃');
    await page.locator('.filter-tier').nth(1).getByRole('tab', { name: /全部/ }).click();
    await page.locator('.set-reward').getByRole('button', { name: '领取', exact: true }).click();
    await expect(page.locator('.set-reward')).toContainText('已领取');
    await expect(page.locator('.set-reward').getByRole('button', { name: '已领', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.points['hulu-kid'])).toBe(600);
    await page.locator('.hulu-collection-hero').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `e2e/__screenshots__/hulu-${name}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await series.getByRole('tab', { name: /卷星人/ }).click();
    await expect(page.locator('.hulu-collection-hero')).toHaveCount(0);
    await expect(page.locator('.gallery-shelf .ccard')).toHaveCount(6);
    await series.getByRole('tab', { name: /葫芦娃/ }).click();
    await page.reload();
    await series.getByRole('tab', { name: /葫芦娃/ }).click();
    await expect(page.locator('.set-reward')).toContainText('已领取');
    expect(errors).toEqual([]);
  });
}

test('葫芦娃：未收集可预览，不能领取奖励；游客可浏览', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.addInitScript(() => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
      lang: 'zh', voiceOn: false, sound: false,
      profiles: [{ id: 'hulu-new', name: '新伙伴', age: 6, avatarId: 'girl', createdAt: Date.now() }], activeChildId: 'hulu-new',
      archivedCards: {}, cardRewardClaimed: {},
    } }));
  });
  await page.goto('/#/archive');
  await page.locator('.filter-tier').first().getByRole('tab', { name: /葫芦娃/ }).click();
  await expect(page.locator('.hulu-progress progress')).toHaveAttribute('value', '0');
  await expect(page.locator('.gallery-shelf .hulu-card.unlit')).toHaveCount(11);
  await expect(page.locator('.set-reward').getByRole('button', { name: '未集齐' })).toBeDisabled();
  await page.locator('.hulu-card[title="七娃"]').press('Space');
  await expect(page.locator('.hulu-preview .hulu-lore')).toContainText('宝葫芦');
  await expect(page.locator('.hulu-preview .cpr-locked')).toHaveText('尚未解锁');
  await page.locator('.card-preview-close').click();
  await page.evaluate(() => localStorage.clear());
  // 页面初始化脚本只属于原页面，新页使用清空后的真实游客状态。
  const guest = await page.context().newPage();
  await guest.goto('/#/archive');
  await guest.getByRole('button', { name: /葫芦娃/ }).click();
  await expect(guest.locator('.archive-guest-preview .hulu-card')).toHaveCount(11);
  await expect(guest.locator('.hulu-collection-hero')).toContainText('七色葫芦山');
  expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
