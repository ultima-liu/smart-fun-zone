import { test, expect } from '@playwright/test';
import { ENGLISH_G3_AUDIO_CATALOG } from '../src/content/englishG3Audio';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('original-audio-seeded')) return;
    const child = 'original-audio-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
      lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false,
      profiles: [{ id: child, name: '原声体验', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }], activeChildId: child,
      mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
    }}));
    for (const id of ['animals-opening', 'friends-a', 'numbers-letters', 'guest-act']) {
      localStorage.setItem(`sfz-english-g3a-flow-v6:${child}:${id}`, JSON.stringify({ phase: 1, unlocked: 1 }));
    }
    sessionStorage.setItem('original-audio-seeded', '1');
  });
});

test('动物歌曲实际加载播放，播放不会完成教材任务', async ({ page }) => {
  await page.goto('/#/english-course/animals-opening');
  await expect(page.locator('.boot-splash')).toBeHidden({ timeout: 20000 });
  await page.getByRole('tab', { name: /歌曲原声/ }).click();
  const audio = page.locator('.en-song-task:visible audio');
  await expect(audio).toHaveAttribute('src', '/assets/english-textbook/audio/animals-opening-song.mp3');
  await expect(audio).toHaveAttribute('preload', 'none');
  await audio.evaluate((element: HTMLAudioElement) => element.load());
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.duration)).toBeGreaterThan(40);
  expect(await audio.evaluate((element: HTMLAudioElement) => element.duration)).toBeLessThan(42);
  await audio.evaluate((element: HTMLAudioElement) => element.play());
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await audio.evaluate((element: HTMLAudioElement) => element.pause());
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('sfz-english-g3a-flow-v6:original-audio-child:animals-opening')!));
  expect(progress.seen).toEqual([]);
  expect(progress.sourceActivityDone).toBe(false);
  expect(progress.stars).toBe(0);
});

test('课文直接显示原声播放器，数字单元可切换首音与末音录音', async ({ page }) => {
  await page.goto('/#/english-course/friends-a');
  await expect(page.locator('.boot-splash')).toBeHidden({ timeout: 20000 });
  let player = page.getByRole('group', { name: 'Let’s talk教材原声' });
  await expect(player).toBeVisible();
  await expect(player.locator('audio')).toHaveAttribute('src', '/assets/english-textbook/audio/friends-a-talk.mp3');
  await page.goto('/#/english-course/numbers-letters');
  await page.getByRole('tab', { name: /声音与拼读/ }).click();
  player = page.getByRole('group', { name: '教材辨音教材原声' });
  await expect(player).toBeVisible();
  await expect(player.locator('audio')).toHaveAttribute('src', '/assets/english-textbook/audio/numbers-letters-first-sound.mp3');
  await player.getByLabel('选择录音').selectOption('1');
  await expect(player.locator('audio')).toHaveAttribute('src', '/assets/english-textbook/audio/numbers-letters-last-sound.mp3');
  await expect(player.getByRole('button', { name: '原声听后任务' })).toHaveCount(0);
  await page.screenshot({ path: 'tmp/english-original-audio/phonics-original-pad.png', animations: 'disabled' });
});

test('官方 74 段完整录音均能访问，没有漏用预览片段', async ({ request }) => {
  expect(ENGLISH_G3_AUDIO_CATALOG).toHaveLength(74);
  for (const clip of ENGLISH_G3_AUDIO_CATALOG) {
    const response = await request.get(clip.src, { headers: { Range: 'bytes=0-1023' } });
    expect(response.status(), clip.key).toBe(206);
    expect(response.headers()['content-type'], clip.key).toMatch(/audio\/mpeg/);
    expect((await response.body()).length, clip.key).toBe(1024);
  }
});
