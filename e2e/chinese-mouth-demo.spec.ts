import { expect, test } from '@playwright/test';

for (const view of [{ width: 1024, height: 768, theme: 'light' }, { width: 1180, height: 820, theme: 'dark' }]) {
  test(`a/o/e口型真实展示、完成推进和返回重播 ${view.width}×${view.height}`, async ({ page }) => {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.route('**/api/**', route => route.fulfill({ json: { ok: true, ttsConfigured: false } }));
    await page.addInitScript(({ theme }) => {
      localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
        lang: 'zh', theme, sound: false, voiceOn: false, musicOn: false,
        profiles: [{ id: 'mouth-demo', name: '口型学习', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: 'mouth-demo',
        records: [], mastery: {}, lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
      } }));
      localStorage.setItem('sfz-chinese-flow-v1:mouth-demo:pinyin-a-o-e', JSON.stringify({ phase: 2, unlocked: 2 }));
      localStorage.setItem('sfz-chinese-practice-v1:mouth-demo:pinyin-a-o-e:pinyinStep', '2');
    }, { theme: view.theme });
    await page.goto('/#/chinese-course/pinyin-a-o-e');
    const tab = page.getByRole('tab', { name: '口型示范', exact: true });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.boot-splash')).toHaveClass(/exit/);
    await expect(page.locator('.boot-splash')).toBeHidden();
    const demo = page.locator('.ct-mouth-demo');
    await expect(demo.locator('svg[role="img"]')).toHaveCount(3);
    await expect(demo).not.toContainText('已读词');
    await page.screenshot({ path: `docs/assets/chinese-mouth-demo/${view.theme}.png` });
    const layout = await demo.evaluate(element => {
      const panel = element.closest('.ct-pinyin-panel')!;
      return [...element.querySelectorAll('button')].map(button => {
        const rect = button.getBoundingClientRect(); const frame = panel.getBoundingClientRect();
        return { within: rect.left >= frame.left && rect.right <= frame.right + 1 && rect.top >= frame.top && rect.bottom <= frame.bottom + 1, readable: rect.width >= 170 && rect.height >= 260 };
      });
    });
    expect(layout.every(card => card.within && card.readable)).toBe(true);
    const a = demo.getByRole('button', { name: '看 a 的口型，听发音', exact: true, includeHidden: true });
    await a.click(); await expect(a).toHaveClass(/is-demonstrating/);
    await page.getByRole('tab', { name: '规律验证', exact: true }).click();
    await expect(a).not.toHaveClass(/is-demonstrating/);
    await tab.click(); await expect(a).not.toHaveClass(/seen/);
    for (const vowel of ['a', 'o', 'e']) {
      const card = demo.getByRole('button', { name: `看 ${vowel} 的口型，听发音`, exact: true });
      await card.click(); await expect(card).toHaveClass(/is-demonstrating/);
      // The mouth changes from closed to the intended vowel shape.
      await expect.poll(() => card.locator('.ct-mouth-lips').evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
      await expect(card).toHaveClass(/seen/);
    }
    await expect(page.getByRole('tab', { name: '规律验证', exact: true })).toHaveAttribute('aria-selected', 'true');
    await tab.click(); await expect(demo).toBeVisible();
    await a.click(); await expect(a).toHaveClass(/is-demonstrating/); await expect(a).not.toHaveClass(/is-demonstrating/);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  });
}
