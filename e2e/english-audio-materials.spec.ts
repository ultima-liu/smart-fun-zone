import { test, expect } from '@playwright/test';
import catalog from '../src/content/englishG3AudioCatalog.json' with { type: 'json' };
import { ENGLISH_G3_WORD_LISTS } from '../src/content/englishG3WordLists';
import { ENGLISH_G3_SONGS, ENGLISH_G3_FINGER_FAMILY } from '../src/content/englishG3Appendix';

test.use({ viewport: { width: 1024, height: 768 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript((lessonIds: string[]) => {
    const id = 'audio-material-audit';
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: { lang: 'zh', theme: 'light', sound: false, musicOn: false, voiceOn: false, profiles: [{ id, name: '原声核对', avatarId: 'boy', age: 8, createdAt: Date.now() }], activeChildId: id, records: [], mastery: {}, lessonProgress: {}, points: { [id]: 0 }, dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false }, version: 0 }));
    for (const lessonId of lessonIds) localStorage.setItem(`sfz-english-g3a-flow-v6:${id}:${lessonId}`, JSON.stringify({ phase: 1, unlocked: 1 }));
  }, catalog.flatMap(c => c.lessonIds));
});

async function checkViewport(page: import('@playwright/test').Page) {
  const problems = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')].filter(el => {
    if (!el.getClientRects().length || el.closest('[hidden]')) return false;
    const style = getComputedStyle(el);
    return ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1)
      || ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1);
  }).map(el => `${el.tagName}.${el.className}`));
  expect(problems).toEqual([]);
  const boxes = await page.locator('.en-recorded-material').evaluateAll(items => items.map(item => item.getBoundingClientRect().bottom));
  expect(boxes.length).toBeGreaterThan(0);
  for (const bottom of boxes) expect(bottom).toBeLessThanOrEqual(769);
}

for (const unit of ['friends', 'families', 'animals', 'plants', 'colours', 'numbers', 'revision', 'alphabet']) {
test(`${unit} 原声各栏目并排显示对应完整教材材料，播放器各自对应且没有滚动条`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const groups = new Map<string, typeof catalog>();
  for (const clip of catalog.filter(c => unit === 'alphabet' ? c.key === 'alphabet' : c.key.startsWith(`${unit}-`))) { const id = clip.lessonIds[0]; groups.set(id, [...(groups.get(id) ?? []), clip]); }
  for (const [id, clips] of groups) {
    await page.goto(id.startsWith('appendix-') ? `/#/english-course/appendix?unit=${id.replace('appendix-', '')}` : `/#/english-course/${id}`);
    const columns = page.locator('.en-recorded-columns:visible');
    await expect(columns).toBeVisible({ timeout: 30_000 });
    await expect(columns.locator('.en-recorded-material')).toHaveCount(clips.length);
    for (let index = 0; index < clips.length; index++) {
      const clip = clips[index];
      const material = columns.locator(`[data-recording-key="${clip.key}"]`);
      await expect(material).toHaveAttribute('data-recording-key', clip.key);
      await expect(material.locator('audio')).toHaveAttribute('src', clip.src);
      const response = await page.request.get(clip.src, { headers: { Range: 'bytes=0-31' }, timeout: 15_000 });
      expect(response.status(), clip.key).toBe(206);
      expect((await response.body()).length, clip.key).toBe(32);
      await response.dispose();
      await checkViewport(page);
      if (clip.slot === 'wordlist') {
        const words = ENGLISH_G3_WORD_LISTS[clip.key.replace('-words', '')];
        await expect(material.locator('.en-recorded-word-list > button')).toHaveCount(words.length);
        for (const [word, meaning] of words) { await expect(material.getByText(word, { exact: true })).toBeVisible(); await expect(material.getByText(meaning, { exact: true })).toBeVisible(); }
      } else if (clip.key === 'alphabet') await expect(material.locator('.en-recorded-alphabet > button')).toHaveCount(26);
      const lyrics = clip.key.endsWith('-opening-song') ? ENGLISH_G3_SONGS[unit] : clip.key === 'families-a-finger-song' ? ENGLISH_G3_FINGER_FAMILY : undefined;
      if (lyrics) {
        const displayed: string[] = [];
        const verses = material.getByRole('button', { name: /第 \d+ 段歌词/ });
        const count = await verses.count();
        for (let at = 0; at < Math.max(1, count); at++) {
          if (count) await verses.nth(at).click();
          displayed.push(...await material.locator('.en-recorded-song .en-recorded-lyric').allTextContents());
          const clipped = await material.locator('.en-recorded-song p').evaluateAll(lines => lines.some(line => { const row = line.getBoundingClientRect(); const text = line.querySelector('.en-recorded-lyric')!.getBoundingClientRect(); return text.height > row.height + 1; }));
          expect(clipped, clip.key).toBe(false);
          await expect(material.locator('audio')).toHaveAttribute('src', clip.src);
          await checkViewport(page);
        }
        expect(displayed, clip.key).toEqual(lyrics);
        if (unit === 'plants') await page.screenshot({ path: 'docs/assets/english-audio-song-1024.png' });
      }
      if (['wordlist','first-sound','last-sound'].includes(clip.slot) || clip.key === 'alphabet' || clip.key.endsWith('-opening-song') || clip.key.endsWith('-letters-sounds') || clip.key === 'families-a-finger-song') await material.getByRole('button', { name: '查看原书页', exact: true }).click();
      for (let frame = 0; frame < clip.material.length; frame++) {
        const source = clip.material[frame];
        if (clip.material.length > 1) await material.getByRole('button', { name: clips.length > 1 ? `第${frame + 1}页` : `${source.label} · P${source.page}`, exact: true }).click();
        await expect(material.locator('figure img')).toHaveAttribute('src', source.src);
        await expect.poll(() => material.locator('figure img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        await checkViewport(page);
      }
      await expect(page.getByRole('button', { name: '原声听后任务', exact: true })).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
  if (unit === 'alphabet') await page.screenshot({ path: 'docs/assets/english-audio-alphabet-1024.png' });
});
}

test('自编拼读没有混入首音题录音，原书辨音题仍可进入，单元词汇可从目录进入附录', async ({ page }) => {
  await page.goto('/#/english-course/friends-letters');
  const material = page.locator('[data-recording-key="friends-letters-first-sound"]:visible');
  await expect(material).toHaveAttribute('data-recording-key', 'friends-letters-first-sound');
  await expect(material.getByLabel('教材首音辨音题').locator('button')).toHaveCount(12);
  await expect(material.getByLabel('教材首音辨音题').locator('button').first()).toBeDisabled();
  await material.getByRole('button', { name: '播放Unit 1 A Listen and circle the first sound.教材原声', exact: true }).click();
  const quiz = material.getByLabel('教材首音辨音题');
  await expect(quiz.locator('button').first()).toBeEnabled();
  await quiz.locator('section').nth(0).getByRole('button', { name: 'b', exact: true }).click();
  await expect(quiz.locator('section').nth(0).getByRole('status')).toHaveText('再听听这个声音');
  for (const [index, answer] of ['d','c','b','a'].entries()) await quiz.locator('section').nth(index).getByRole('button', { name: answer, exact: true }).click();
  await expect(quiz).toContainText('都选对了');
  await material.getByRole('button', { name: '暂停Unit 1 A Listen and circle the first sound.教材原声', exact: true }).click();
  await quiz.locator('section').nth(0).getByRole('button', { name: 'b', exact: true }).click();
  await expect(quiz.locator('section').nth(0).getByRole('status')).toHaveText('再听听这个声音');
  await page.screenshot({ path: 'docs/assets/english-audio-first-sound-1024.png' });
  await page.getByRole('tab', { name: /互动练习/ }).click();
  await page.getByRole('tab', { name: /声音与拼读/ }).click();
  await expect(page.locator('audio:visible')).toHaveCount(0);
  await page.goto('/#/subject/english?unit=animals');
  await page.getByRole('button', { name: '教材附录：词汇与字母表 →' }).click();
  await expect(page.getByLabel('完整单元词汇表')).toContainText('red panda');
  await expect(page.locator('.en-recorded-material audio')).toHaveAttribute('src', '/assets/english-textbook/audio/animals-words.mp3');
});

test('附录卡片可重复点读，中英分声，字母读名字且点读暂停整册原声', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as typeof window & { __VOLC_TTS_ENABLED__: boolean; __appendixReads: { text: string; speaker: string }[] };
    w.__VOLC_TTS_ENABLED__ = true;
    w.__appendixReads = [];
    w.Audio = class {
      onended: (() => void) | null = null;
      stopped = false;
      constructor(public src: string) {}
      async play() {
        const payload = await fetch(this.src).then(response => response.json());
        if (this.stopped) return;
        w.__appendixReads.push(payload);
        setTimeout(() => { if (!this.stopped) this.onended?.(); }, 0);
      }
      pause() { this.stopped = true; }
    } as unknown as typeof Audio;
    const stored = JSON.parse(localStorage.getItem('smart-fun-zone')!);
    stored.state.sound = true; stored.state.voiceOn = true;
    localStorage.setItem('smart-fun-zone', JSON.stringify(stored));
  });
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/volc-tts/')) {
      const params = route.request().postDataJSON().req_params;
      const data = Buffer.from(JSON.stringify({ text: params.text, speaker: params.speaker })).toString('base64');
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ code: 0, data })}\n\n` });
    }
    return route.fulfill({ json: { ok: true, ttsConfigured: true } });
  });
  const reads = () => page.evaluate(() => (window as unknown as { __appendixReads: { text: string; speaker: string }[] }).__appendixReads);
  for (const [unit, words] of Object.entries(ENGLISH_G3_WORD_LISTS)) {
    await page.goto(`/#/english-course/appendix?unit=${unit}`);
    const list = page.getByLabel('完整单元词汇表');
    await expect(list.getByRole('button')).toHaveCount(words.length);
    const [word, meaning] = words[0];
    const previous = (await reads()).length;
    await list.getByRole('button', { name: `点读 ${word}，${meaning}`, exact: true }).click();
    await expect.poll(async () => (await reads()).length).toBe(previous + 2);
    const spoken = (await reads()).slice(previous);
    expect(spoken[0].text).toContain(word);
    expect(spoken[1].text).toContain(meaning);
    expect(spoken[0].speaker).not.toBe(spoken[1].speaker);
    await checkViewport(page);
  }
  const word = page.getByLabel('完整单元词汇表').getByRole('button').first();
  const previous = (await reads()).length;
  await page.getByRole('button', { name: '播放Words in each unit Unit 6教材原声', exact: true }).click();
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(false);
  await word.click();
  await expect.poll(async () => (await reads()).length).toBe(previous + 2);
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  await word.click();
  await expect.poll(async () => (await reads()).length).toBe(previous + 4);
  await page.getByRole('button', { name: 'Aa–Zz 字母表', exact: true }).click();
  const alphabet = page.getByLabel('完整字母表');
  await expect(alphabet.getByRole('button')).toHaveCount(26);
  for (const letter of ['A', 'Z']) {
    const previous = (await reads()).length;
    await alphabet.getByRole('button', { name: `点读字母 ${letter}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await reads()).length).toBe(previous + 1);
    expect((await reads()).at(-1)!.text).toBe(`Letter ${letter}.`);
  }
  await checkViewport(page);
  await expect(page.getByRole('button', { name: '点读字母 Z', exact: true })).toBeVisible();
});
