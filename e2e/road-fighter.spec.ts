import { expect, test, type Page } from '@playwright/test';

test.use({
  launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
});
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T04:00:00Z') });
  await page.addInitScript(() => {
    const id = 'road-child';
    Math.random = () => 0.5;
    localStorage.setItem(
      'smart-fun-zone',
      JSON.stringify({
        state: {
          lang: 'zh',
          theme: 'dark',
          sound: false,
          voiceOn: false,
          profiles: [
            { id, name: '公路小车手', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() },
          ],
          activeChildId: id,
          records: [],
          mastery: {},
          lessonProgress: {},
          dailyCheckin: {},
          charBag: {},
          wrongs: {},
          points: { [id]: 25 },
          pointLog: { [id]: [] },
          customTasks: {},
          taskStates: {},
          ownedItems: {},
          equipped: {},
          avatarColor: {},
          avatarHair: {},
          storeOverrides: {},
          taskOverrides: {},
          bonusMin: {},
          parentPin: '1234',
          dailyLimitMin: 0,
          buddyOpen: false,
          buddyWakeOn: false,
          expeditionLastAt: {},
          materials: {},
          shipLevel: {},
          archivedCards: {},
          cardRewardClaimed: {},
          showBadges: {},
          badges: {},
        },
        version: 6,
      }),
    );
  });
});
async function openRace(page: Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: /敏捷/ }).click();
  await page
    .getByRole('article')
    .filter({ hasText: '火箭车' })
    .getByRole('button', { name: '驾驶火箭车' })
    .click();
  const game = page.locator('.rf-game');
  await expect(game.getByRole('heading', { name: '火箭车 1985' })).toBeVisible();
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000));
  await game.scrollIntoViewIfNeeded();
  return game;
}
async function records(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('smart-fun-zone')!).state.records.filter(
      (r: { gameId: string }) => r.gameId === 'sky-road-fighter',
    ),
  );
}

test('Web 双档油门、转向、松手滑行与暂停冻结，返回不结算弃局', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const game = await openRace(page),
    track = game.locator('canvas');
  await game.getByRole('button', { name: '开始比赛' }).click();
  await expect(game.getByRole('button', { name: /GAME B/ })).toBeDisabled();
  await page.keyboard.down('z');
  await page.clock.runFor(900);
  await expect(game.getByTestId('rf-speed')).toHaveText('196');
  await page.keyboard.up('z');
  await page.keyboard.down('x');
  await page.clock.runFor(1000);
  await expect(game.getByTestId('rf-speed')).toHaveText('400');
  const x = Number(await track.getAttribute('data-player-x'));
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(220);
  await page.keyboard.up('ArrowRight');
  expect(Number(await track.getAttribute('data-player-x'))).toBeGreaterThan(x + 20);
  await page.keyboard.up('x');
  await page.clock.runFor(400);
  expect(Number(await game.getByTestId('rf-speed').textContent())).toBeLessThan(400);
  await game.screenshot({ path: 'tmp/road-fighter/desktop.png' });
  await page.keyboard.press('p');
  await expect(track).toHaveAttribute('data-phase', 'paused');
  const distance = await track.getAttribute('data-distance'),
    fuel = await game.getByTestId('rf-fuel').textContent();
  await page.clock.runFor(5000);
  await expect(track).toHaveAttribute('data-distance', distance!);
  await expect(game.getByTestId('rf-fuel')).toHaveText(fuel!);
  await game.getByRole('button', { name: '继续比赛' }).click();
  await page.clock.runFor(300);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(track).toHaveAttribute('data-phase', 'paused');
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await expect(game).toHaveCount(0);
  expect(await records(page)).toHaveLength(0);
});

test('燃油耗尽只结算一次，重开与模式切换不奖励课程星或货币', async ({ page }) => {
  test.setTimeout(90_000);
  const game = await openRace(page);
  await game.getByRole('button', { name: /GAME B/ }).click();
  await game.getByRole('button', { name: '开始比赛' }).click();
  await page.clock.runFor(112000);
  await expect(game.locator('canvas')).toHaveAttribute('data-phase', 'over');
  expect(await records(page)).toMatchObject([
    { level: 2, stars: 0, correct: 0, total: 1, durationSec: 111 },
  ]);
  await page.clock.runFor(10000);
  expect(await records(page)).toHaveLength(1);
  await game.getByRole('button', { name: '再来一局' }).click();
  await expect(game.getByTestId('rf-fuel')).toHaveText('100/ 100');
  await expect(game.locator('canvas')).toHaveAttribute('data-phase', 'ready');
  expect(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('smart-fun-zone')!).state;
      return { points: s.points['road-child'], mastery: s.mastery };
    }),
  ).toEqual({ points: 25, mastery: {} });
});

for (const viewport of [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`触屏 ${viewport.width}×${viewport.height} 多点转向与油门，取消释放、深浅主题与画面`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const game = await openRace(page);
    await game.getByRole('button', { name: '开始比赛' }).click();
    await game.locator('.rf-controller').scrollIntoViewIfNeeded();
    const right = await game.getByRole('button', { name: '向右转向' }).boundingBox(),
      high = await game.getByRole('button', { name: 'A 高速油门' }).boundingBox();
    const client = await page.context().newCDPSession(page);
    const points = [right!, high!].map((r, i) => ({
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      id: i + 1,
    }));
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await page.clock.runFor(220);
    expect(Number(await game.locator('canvas').getAttribute('data-player-x'))).toBeGreaterThan(250);
    expect(Number(await game.getByTestId('rf-speed').textContent())).toBeGreaterThan(35);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [points[0]] });
    await page.clock.runFor(1900);
    await expect(game.getByTestId('rf-speed')).toHaveText('400');
    const x = await game.locator('canvas').getAttribute('data-player-x');
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await page.clock.runFor(300);
    await expect(game.locator('canvas')).toHaveAttribute('data-player-x', x!);
    expect(Number(await game.getByTestId('rf-speed').textContent())).toBeLessThan(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await game.screenshot({ path: `tmp/road-fighter/dark-${viewport.width}.png` });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await game.screenshot({ path: `tmp/road-fighter/light-${viewport.width}.png` });
    await game.getByRole('button', { name: '暂停', exact: true }).click();
    await client.detach();
  });
}

test('低油量警报与发动机分开，正常油量不报警，耗尽停止警报', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const voices: { kind: string; stopped: boolean; source: AudioBufferSourceNode }[] = [];
    (window as unknown as { roadFuelProbe: typeof voices }).roadFuelProbe = voices;
    const start = AudioBufferSourceNode.prototype.start, stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.loop && this.buffer) {
        const samples = this.buffer.getChannelData(0);
        let crossings = 0;
        for (let i = 1; i < samples.length; i++) if (samples[i - 1] * samples[i] < 0) crossings++;
        // Verify the actual waveform, rather than trusting an asset filename.
        voices.push({ kind: crossings / 2 / this.buffer.duration > 600 ? 'warning' : 'engine', stopped: false, source: this });
      }
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      const voice = voices.find(v => v.source === this);
      if (voice) voice.stopped = true;
      return stop.apply(this, args);
    };
  });
  const game = await openRace(page);
  await game.getByRole('button', { name: '声音关闭' }).click();
  await game.getByRole('button', { name: '开始比赛' }).click();
  const read = () => page.evaluate(() => (window as unknown as {
    roadFuelProbe: { kind: string; stopped: boolean; source: AudioBufferSourceNode }[];
  }).roadFuelProbe.map(v => ({ kind: v.kind, stopped: v.stopped, rate: v.source.playbackRate.value })));
  await expect.poll(async () => (await read()).length).toBe(1);
  expect((await read())[0].kind).toBe('engine');
  // Wait at the start using real fuel consumption; no injected game state or disabled traffic.
  await page.clock.runFor(90_000);
  expect((await read()).filter(v => v.kind === 'warning')).toHaveLength(0);
  await page.clock.runFor(12_000);
  await expect.poll(async () => (await read()).filter(v => v.kind === 'warning').length).toBe(1);
  const warning = (await read()).find(v => v.kind === 'warning')!;
  expect(warning.stopped).toBe(false);
  expect(warning.rate).toBe(1);
  await page.clock.runFor(12_000);
  expect((await read()).find(v => v.kind === 'warning')!.stopped).toBe(true);
});

test('原版声音跟随全局开关，暂停和返回停止短曲及引擎', async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { starts: 0, stops: 0, loops: 0, synthesized: 0 };
    (window as unknown as { roadAudioProbe: typeof probe }).roadAudioProbe = probe;
    const start = AudioBufferSourceNode.prototype.start,
      stop = AudioBufferSourceNode.prototype.stop,
      oscillatorStart = OscillatorNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      probe.starts++;
      if (this.loop) probe.loops++;
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      probe.stops++;
      return stop.apply(this, args);
    };
    OscillatorNode.prototype.start = function (...args) {
      probe.synthesized++;
      return oscillatorStart.apply(this, args);
    };
  });
  const game = await openRace(page);
  const recordings = await page.evaluate(async () => {
    const response = await fetch('/assets/games/road-fighter/audio/manifest.json');
    const manifest = await response.json();
    const context = new OfflineAudioContext(1, 22050, 22050);
    return Promise.all(
      Object.values(manifest.tracks as Record<string, { file: string }>).map(async ({ file }) => {
        const response = await fetch(`/assets/games/road-fighter/audio/${file}`);
        if (!response.ok) throw new Error(`Missing audio: ${file}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        const energy = buffer.getChannelData(0).reduce((sum, sample) => sum + sample * sample, 0);
        return { file, duration: buffer.duration, energy };
      }),
    );
  });
  expect(recordings).toHaveLength(9);
  expect(recordings.every((r) => r.duration > 0.1 && r.energy > 0)).toBe(true);
  await game.getByRole('button', { name: '声音关闭' }).click();
  await game.getByRole('button', { name: '开始比赛' }).click();
  await page.clock.runFor(500);
  const read = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            roadAudioProbe: { starts: number; stops: number; loops: number; synthesized: number };
          }
        ).roadAudioProbe,
    );
  await expect.poll(async () => (await read()).starts).toBe(2);
  expect((await read()).loops).toBe(1);
  expect((await read()).synthesized).toBe(0);
  await game.getByRole('button', { name: '声音开启' }).click();
  const stopped = await read();
  await page.clock.runFor(500);
  expect((await read()).starts).toBe(stopped.starts);
  expect(stopped.stops).toBeGreaterThan(0);
  await game.getByRole('button', { name: '声音关闭' }).click();
  await expect.poll(async () => (await read()).starts).toBe(stopped.starts + 1);
  await page.clock.runFor(500);
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  const paused = await read();
  await page.clock.runFor(500);
  expect((await read()).starts).toBe(paused.starts);
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  const closed = await read();
  await page.clock.runFor(500);
  expect((await read()).starts).toBe(closed.starts);
});
