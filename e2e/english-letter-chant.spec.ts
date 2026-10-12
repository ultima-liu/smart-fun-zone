import { test, expect } from '@playwright/test';
import { ENGLISH_G3_PHONICS_CHANTS } from '../src/content/englishG3Appendix';
import { getEnglishG3Unit } from '../src/content/englishGrade3Upper';

// Includes playback from cached TTS, so replay cannot silently read the transcript.
test('字母歌谣同页保留录音两个部分，自动播报及重播只读操作提示', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    const child = 'letter-chant-child';
    w.__VOLC_TTS_ENABLED__ = true;
    w.__chantReads = [];
    w.Audio = function (src: string) {
      const audio: any = {};
      audio.play = async () => {
        w.__chantReads.push(await fetch(src).then(r => r.json()));
        setTimeout(() => audio.onended?.(new Event('ended')), 0);
      };
      audio.pause = () => {};
      return audio;
    };
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
      lang: 'zh', theme: 'light', sound: true, voiceOn: true, musicOn: false,
      profiles: [{ id: child, name: '歌谣体验生', ageBand: 'g3', avatar: '🐼', createdAt: Date.now() }], activeChildId: child,
      records: [], mastery: {}, lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
    }}));
    for (const unit of ['friends', 'families', 'animals', 'plants', 'colours', 'numbers']) {
      const key = `sfz-english-g3a-flow-v6:${child}:${unit}-letters`;
      localStorage.setItem(key, JSON.stringify({ phase: 1, unlocked: 4 }));
      localStorage.setItem(`${key}:1:tab:认字母|声音与拼读|规范书写|字母歌谣`, '3');
      // Old second-part selection must no longer split or hide the recording text.
      localStorage.setItem(`${key}:1:tab:字母歌谣|词中声音歌谣`, '1');
    }
  });
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/volc-tts/')) {
      const params = route.request().postDataJSON().req_params;
      const data = Buffer.from(JSON.stringify({ text: params.text, speaker: params.speaker })).toString('base64');
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ code: 0, data })}\n\n` });
    }
    return route.fulfill({ json: { ok: true, ttsConfigured: true } });
  });
  const prompt = '点击播放教材原声，边听边看字母歌谣和词中声音歌谣。这是同一段录音的两个部分。';
  for (const unit of ['friends', 'families', 'animals', 'plants', 'colours', 'numbers']) {
    await page.goto(`/#/english-course/${unit}-letters`);
    await expect(page.locator('.boot-splash')).toBeHidden({ timeout: 20000 });
    const panel = page.locator('.en-letter-chant:visible');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /词中声音歌谣/ })).toHaveCount(0);
    await expect(panel.locator('.en-letter-chant-part').nth(0).locator('p')).toHaveText(ENGLISH_G3_PHONICS_CHANTS[unit].alphabet);
    await expect(panel.locator('.en-letter-chant-part').nth(1).locator('p')).toHaveText(ENGLISH_G3_PHONICS_CHANTS[unit].examples);
    await expect(panel.locator('audio')).toHaveCount(1);
    await expect(panel.locator('audio')).toHaveAttribute('src', `/assets/english-textbook/audio/${unit}-letters-sounds.mp3`);
    await panel.locator('h3').click();
    const reads = () => page.evaluate(() => (window as any).__chantReads as { text: string; speaker: string }[]);
    await expect.poll(async () => (await reads()).length).toBeGreaterThan(0);
    const initial = await reads();
    expect(initial.every(r => r.text === prompt && r.speaker.includes('zh_'))).toBe(true);
    await page.getByRole('button', { name: /再听一遍/ }).click();
    await expect.poll(async () => (await reads()).length).toBeGreaterThan(initial.length);
    expect((await reads()).every(r => r.text === prompt)).toBe(true);
    if (unit === 'friends') {
      const word = getEnglishG3Unit(unit)!.letters.decode[0];
      await panel.locator('.en-letter-chant-decode button').first().click();
      await expect.poll(async () => (await reads()).at(-1)?.text).toBe(word);
      const count = (await reads()).length;
      await panel.locator('audio').dispatchEvent('play');
      await page.waitForTimeout(400);
      expect((await reads()).length).toBe(count);
      await page.reload();
      await expect(page.locator('.en-letter-chant:visible')).toBeVisible();
    }
  }
});
