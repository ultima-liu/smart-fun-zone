import { expect, test, type Page } from '@playwright/test';
import { CHINESE_TEXTBOOK_STUDY } from '../src/content/chineseTextbookStudy';
import { aiWav } from './course-ai-helpers';
import { drawInk } from './screen-writing-helpers';
import { readFile } from 'node:fs/promises';
import type { Locator } from '@playwright/test';

const gardenIds = ['garden-1', 'garden-5', 'garden-6', 'garden-7', 'garden-8'];
const child = 'garden-basics-child';
test.use({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
async function openGarden(page: Page, id: string, resumeWriting = false) {
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/volc-tts/')) return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ code: 0, data: aiWav.toString('base64') })}\n\ndata: {"code":20000000}\n\n` });
    return route.fulfill({ json: { ok: true, ttsConfigured: true } });
  });
  await page.addInitScript(({ child, id, resumeWriting }) => {
    HTMLMediaElement.prototype.play = function () { setTimeout(() => this.dispatchEvent(new Event('ended')), 30); return Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () {};
    if (sessionStorage.getItem('garden-seeded')) return;
    sessionStorage.setItem('garden-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: { lang: 'zh', theme: 'light', sound: true, voiceOn: true, musicOn: false, profiles: [{ id: child, name: '园地练习', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, records: [], mastery: {}, lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false } }));
    localStorage.setItem(`sfz-chinese-flow-v1:${child}:${id}`, JSON.stringify({ phase: 2, unlocked: 2 }));
    if (id === 'garden-1') localStorage.setItem(`sfz-chinese-practice-v1:${child}:${id}:lesson:recognitionTargets:0`, JSON.stringify(['六', '七', '八']));
    if (resumeWriting) {
      localStorage.setItem(`sfz-chinese-practice-v1:${child}:${id}:lesson:paper-writing-numbers:writingIndex:0`, '3');
      localStorage.setItem(`sfz-chinese-practice-v1:${child}:${id}:lesson:paper-writing:writingIndex:0`, '4');
      localStorage.setItem(`sfz-chinese-practice-v1:${child}:${id}:writingPracticed`, 'true');
    }
  }, { child, id, resumeWriting });
  await page.goto(`/#/chinese-course/${id}`);
  await expect(page.locator('.boot-splash')).toBeHidden();
}

for (const id of gardenIds) test(`${id} 用四项认写任务替代词语积累，范写与笔顺资源可用`, async ({ page }) => {
  await openGarden(page, id);
  const deck = page.locator('.ct-textbook-study');
  await expect(deck.getByRole('tab')).toHaveText([/会认的字/, /认字抽查/, /写字观察/, /实际书写/, /知识桥/]);
  await expect(deck.getByRole('tab', { name: '词语积累', exact: true })).toHaveCount(0);
  const pack = CHINESE_TEXTBOOK_STUDY[id];
  await expect(deck.locator('.ct-recognize-grid button b')).toHaveText(pack.recognize!.map(item => item.char));
  await deck.getByRole('tab', { name: '写字观察', exact: true }).click();
  await expect(deck.locator('.ct-writing-grid button b')).toHaveText(pack.writing!.map(item => item.char));
  await deck.getByRole('tab', { name: '实际书写', exact: true }).click();
  await expect(deck.locator('.screen-hanzi-pad svg path').first()).toBeAttached();
  await expect(deck.locator('.ct-writing-demo-grid svg path').first()).toBeAttached();
  for (const item of pack.writing!) {
    const response = await page.request.get(`/assets/chinese-textbook/strokes/${encodeURIComponent(item.char)}.json`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.strokes.length).toBeGreaterThan(0);
    expect(data.strokes).toHaveLength(data.medians.length);
  }
});

// Preserve median corners while interpolating each segment for mouse input.
async function writeCharacter(page: Page, scope: Locator, char: string) {
  const pad = scope.locator('.screen-hanzi-pad svg');
  await expect(pad.locator('path').first()).toBeAttached();
  const data = JSON.parse(await readFile(`public/assets/chinese-textbook/strokes/${char}.json`, 'utf8')) as { medians: number[][][] };
  for (const [index, median] of data.medians.entries()) {
    const points = median.flatMap((point, i) => i === 0 ? [point] : Array.from({ length: 12 }, (_unused, n) => point.map((value, k) => median[i - 1][k] + (value - median[i - 1][k]) * (n + 1) / 12)));
    await drawInk(page, pad, points.map(([x, y]) => ({ x: 20 + x * 260 / 1024, y: 300 - (124 * 260 / 1024 + 20) - y * 260 / 1024 })), 300, 300);
    if (index < data.medians.length - 1) await expect(scope.getByText(`已写对 ${index + 1} 笔`, { exact: false })).toBeVisible();
  }
  // Completion changes the current character; the final character saves the full count.
  await expect(scope).toBeHidden();
}

test('园地一认字和观察完成、旧四字完成不跳过九、断点书写九和十通过后自动推进，先完成知识桥不会跳过认写，完成页可回看', async ({ page }) => {
  test.setTimeout(90_000);
  await openGarden(page, 'garden-1', true);
  const deck = page.locator('.ct-textbook-study');
  await deck.getByRole('tab', { name: '知识桥', exact: true }).click();
  await deck.locator('.ct-ktrail-check').getByRole('button', { name: '撇', exact: true }).click();
  await expect(page.locator('.ct-phase-nav').getByRole('button', { name: /教材练习/ })).toHaveAttribute('aria-current', 'step');
  await deck.getByRole('tab', { name: '会认的字', exact: true }).click();
  for (const char of ['六', '七', '八', '九', '十']) await deck.locator('.ct-recognize-grid button').filter({ has: page.locator('b', { hasText: new RegExp(`^${char}$`) }) }).click();
  await expect(deck.getByRole('tab', { name: '认字抽查', exact: true })).toHaveAttribute('aria-selected', 'true');
  const check = deck.getByRole('region', { name: '脱离拼音认字检查', exact: true });
  for (const char of ['六', '七', '八']) {
    await check.getByRole('button', { name: '听词语', exact: true }).click();
    await expect(check.getByRole('button', { name: char, exact: true })).toBeEnabled();
    await check.getByRole('button', { name: char, exact: true }).click();
  }
  await expect(deck.getByRole('tab', { name: '写字观察', exact: true })).toHaveAttribute('aria-selected', 'true');
  for (const char of ['六', '七', '八', '九', '十']) await deck.locator('.ct-writing-grid button').filter({ has: page.locator('b', { hasText: new RegExp(`^${char}$`) }) }).click();
  await expect(deck.getByRole('tab', { name: '实际书写', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ct-phase-nav').getByRole('button', { name: /真实表达/ })).toBeDisabled();
  for (const char of ['九', '十']) {
    const writing = deck.getByLabel(`屏幕书写 ${char}`, { exact: true });
    await expect(writing).toBeVisible();
    await writeCharacter(page, writing, char);
  }
  await expect(page.locator('.ct-phase-nav').getByRole('button', { name: /真实表达/ })).toHaveAttribute('aria-current', 'step');
  await page.locator('.ct-phase-nav').getByRole('button', { name: /教材练习/ }).click();
  await deck.getByRole('tab', { name: '会认的字', exact: true }).click();
  await page.waitForTimeout(1300);
  await expect(deck.getByRole('tab', { name: '会认的字', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ct-phase-nav').getByRole('button', { name: /教材练习/ })).toHaveAttribute('aria-current', 'step');
});
