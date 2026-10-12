import { expect, test } from '@playwright/test';
import { drawInk, writeLetter } from './screen-writing-helpers';

for (const [id, letters] of [
  ['pinyin-a-o-e', ['a', 'o', 'e']],
  ['pinyin-i-u-v', ['i', 'u', 'ü']],
  ['pinyin-j-q-x', ['j', 'q', 'x']],
  ['pinyin-g-k-h', ['g', 'k', 'h']],
  ['pinyin-y-w', ['y', 'w']],
] as const) {
  test(`${id} 拼音修正占格后逐笔书写通过，范字和提示一致`, async ({ page }) => {
    const child = 'pinyin-grid-writing';
    await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
    await page.addInitScript(({ child, id }) => {
      localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
        lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false,
        profiles: [{ id: child, name: '拼音练写', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }],
        activeChildId: child, records: [], mastery: {}, lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {},
        parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
      } }));
      localStorage.setItem(`sfz-chinese-flow-v1:${child}:${id}`, JSON.stringify({ phase: 2, unlocked: 2 }));
    }, { child, id });
    await page.goto(`/#/chinese-course/${id}`);
    await page.getByRole('tab', { name: '屏幕书写', exact: true }).click();
    const writing = page.getByRole('tabpanel', { name: '屏幕书写', exact: true });
    for (const letter of letters) {
      await writing.locator('.en-screen-letter-tabs').getByRole('button', { name: letter, exact: true }).click();
      const pad = writing.locator('.screen-letter-pad');
      if (letter === 'i') {
        // An independently specified stroke in the upper grid must not count as i's middle-grid body.
        await drawInk(page, pad, [{ x: 106, y: 24 }, { x: 106, y: 46 }, { x: 106, y: 68 }]);
        await expect(writing.getByRole('status')).toContainText('第 1 笔还需要调整');
        await expect(writing.getByText('自己写 · 0/2 笔', { exact: true })).toBeVisible();
      }
      await writeLetter(page, writing, letter);
      const reference = await writing.locator('.writing-reference-stroke').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
      expect(await pad.locator('.writing-trace-hint').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).toEqual(reference);
      const observation = page.locator(`.ct-pinyin-guide-letters [data-letter="${letter}"]`).first();
      expect(await observation.locator('path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).toEqual(reference);
    }
    const saved = await page.evaluate(({ child, id }) => JSON.parse(localStorage.getItem(`sfz-chinese-practice-v1:${child}:${id}:pinyinScreenWriting`) ?? '[]'), { child, id });
    expect(saved).toEqual(expect.arrayContaining([...letters]));
    await expect(page.getByRole('tab', { name: '屏幕书写', exact: true })).toHaveClass(/done/);
  });
}
