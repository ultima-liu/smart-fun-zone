import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce', launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test('健康检查较慢时仍播报欢迎语，切换页面与 NPC 点读可继续播放', async ({ page }) => {
  await page.addInitScript(() => {
    const id = 'voice-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        profiles: [{ id, name: '小星', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
        activeChildId: id, lang: 'zh', theme: 'dark', sound: true, voiceOn: true,
        buddyOpen: false, buddyWakeOn: false, dailyLimitMin: 0,
      }, version: 6,
    }));
    const w = window as unknown as { voicePlayCount: number };
    w.voicePlayCount = 0;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.startsWith('blob:')) w.voicePlayCount++;
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {};
  });
  const spoken: string[] = [];
  await page.route('**/api/health', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ json: { ok: true, ttsConfigured: true } });
  });
  await page.route('**/api/volc-tts/**', async (route) => {
    const body = route.request().postDataJSON() as { req_params: { text: string } };
    spoken.push(body.req_params.text);
    await route.fulfill({ contentType: 'text/event-stream', body: 'data: {"code":0,"data":"SUQz"}\n\ndata: {"code":20000000}\n\n' });
  });
  const playCount = () => page.evaluate(() => (window as unknown as { voicePlayCount: number }).voicePlayCount);
  await page.goto('/#/map');
  await expect.poll(() => spoken.some((text) => text.includes('知识的星光'))).toBe(true);
  await expect.poll(playCount).toBeGreaterThan(0);
  const schoolCount = await playCount();
  await page.getByRole('navigation', { name: 'main navigation' }).getByRole('link', { name: '乐园', exact: true }).click();
  await expect.poll(() => spoken.some((text) => text.includes('欢迎来到空中乐园'))).toBe(true);
  await expect.poll(playCount).toBeGreaterThan(schoolCount);
  const lobbyCount = await playCount();
  await page.getByRole('button', { name: '乐园主泡泡', exact: true }).click({ force: true });
  await expect.poll(playCount).toBeGreaterThan(lobbyCount);
});
