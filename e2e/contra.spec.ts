import { expect, test, type Page } from '@playwright/test';

test.use({
  hasTouch: true,
  launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
});
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
  await page.addInitScript(() => {
    const id = 'contra-child';
    localStorage.setItem(
      'smart-fun-zone',
      JSON.stringify({
        state: {
          lang: 'zh',
          theme: 'dark',
          sound: false,
          voiceOn: false,
          profiles: [{ id, name: '小战士', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
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
async function openContra(page: Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: /敏捷/ }).click();
  await page
    .getByRole('article')
    .filter({ hasText: '魂斗罗 · 一代' })
    .getByRole('button', { name: '进入魂斗罗' })
    .click();
  const game = page.locator('.contra-game');
  await expect(game.getByRole('heading', { name: '魂斗罗 · 一代', exact: true })).toBeVisible();
  await expect(game.locator('canvas')).toHaveAttribute('data-art-loaded', '41');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
  return game;
}
const records = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('smart-fun-zone')!).state.records.filter(
      (r: { gameId: string }) => r.gameId === 'sky-contra',
    ),
  );

test('Web movement, shooting, jumping, prone and pause; exiting never settles an abandoned mission', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const game = await openContra(page),
    canvas = game.locator('canvas');
  await game.screenshot({ path: 'docs/assets/contra/verification/web-ready.png' });
  await game.getByRole('button', { name: '开始行动' }).click();
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('j');
  await page.clock.runFor(500);
  expect(Number(await canvas.getAttribute('data-player-x'))).toBeGreaterThan(80);
  expect(Number(await canvas.getAttribute('data-player-x'))).toBeLessThan(92);
  expect(Number(await canvas.getAttribute('data-bullets'))).toBeGreaterThan(0);
  await page.keyboard.down('k');
  await page.clock.runFor(350);
  expect(Number(await canvas.getAttribute('data-player-y'))).toBeLessThan(160);
  await page.keyboard.up('k');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('j');
  await page.clock.runFor(900);
  await page.keyboard.down('ArrowDown');
  await page.clock.runFor(120);
  await expect(canvas).toHaveAttribute('data-prone', 'true');
  await page.keyboard.up('ArrowDown');
  await game.screenshot({ path: 'docs/assets/contra/verification/web-battle.png' });
  await page.keyboard.press('p');
  await expect(canvas).toHaveAttribute('data-phase', 'paused');
  const x = await canvas.getAttribute('data-player-x');
  await page.clock.runFor(3000);
  await expect(canvas).toHaveAttribute('data-player-x', x!);
  await game.locator('.contra-overlay').getByRole('button', { name: '继续战斗' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(canvas).toHaveAttribute('data-phase', 'paused');
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  expect(await records(page)).toHaveLength(0);
});

test('the redesigned base opens its door after real prone shots and advances through all six rooms', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1100 });
  const game = await openContra(page),
    canvas = game.locator('canvas');
  await game.getByRole('button', { name: /02 基地一/ }).click();
  await game.getByRole('button', { name: '开始行动' }).click();
  const advance = game.getByRole('button', { name: '前进 · 下一间' });
  await expect(advance).toBeDisabled();
  await page.keyboard.down('ArrowUp');
  await page.clock.runFor(200);
  await page.keyboard.up('ArrowUp');
  await expect(canvas).toHaveAttribute('data-room', '1');
  for (let room = 1; room <= 6; room++) {
    await expect(canvas).toHaveAttribute('data-room', String(room));
    await page.keyboard.down('ArrowDown');
    await page.keyboard.down('j');
    if (room === 1) {
      await page.clock.runFor(600);
      await expect(canvas).toHaveAttribute('data-prone', 'true');
      await game.screenshot({ path: 'docs/assets/contra/verification/base-combat-web.png' });
    }
    await page.clock.runFor(4500);
    await page.keyboard.up('j');
    await page.keyboard.up('ArrowDown');
    await expect(canvas).toHaveAttribute('data-core-hp', '0');
    await expect(canvas).toHaveAttribute('data-base-phase', 'open');
    await expect(canvas).toHaveAttribute('data-door', '100');
    await expect(advance).toBeEnabled();
    await expect(game.getByTestId('contra-lives-0')).toHaveText('♥♥♥');
    if (room === 1)
      await game.screenshot({ path: 'docs/assets/contra/verification/base-open-web.png' });
    if (room % 2) await advance.click();
    else await page.keyboard.down('ArrowUp');
    await page.clock.runFor(1100);
    await page.keyboard.up('ArrowUp');
  }
  await expect(canvas).toHaveAttribute('data-room', '7');
  await expect(canvas).toHaveAttribute('data-base-phase', 'boss');
  await expect(game.locator('.contra-player strong')).toHaveText('006000');
  await expect(canvas).toHaveAttribute('data-phase', 'playing');
  await game.screenshot({ path: 'docs/assets/contra/verification/base-boss-web.png' });
  await page.keyboard.down('ArrowDown');
  await page.keyboard.down('j');
  await page.clock.runFor(6000);
  await expect(canvas).toHaveAttribute('data-boss-hp', '64');
  await page.keyboard.down('ArrowLeft');
  await page.clock.runFor(500);
  await page.keyboard.up('ArrowLeft');
  await page.clock.runFor(6000);
  await expect(canvas).toHaveAttribute('data-boss-hp', '32');
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(1000);
  await page.keyboard.up('ArrowRight');
  await page.clock.runFor(6000);
  await page.keyboard.up('j');
  await page.keyboard.up('ArrowDown');
  await expect(canvas).toHaveAttribute('data-boss-hp', '0');
  await expect(canvas).toHaveAttribute('data-phase', 'clear');
  await expect(game.locator('.contra-player strong')).toHaveText('014000');
  await game.screenshot({ path: 'docs/assets/contra/verification/base-cleared-web.png' });
  await game.locator('.contra-overlay').getByRole('button', { name: '进入下一关' }).click();
  await expect(canvas).toHaveAttribute('data-stage', '3');
  await expect(canvas).toHaveAttribute('data-phase', 'playing');
  expect(await records(page)).toHaveLength(0);
});

test('base prone dodges real incoming fire after spawn protection expires', async ({ page }) => {
  const game = await openContra(page),
    canvas = game.locator('canvas');
  await game.getByRole('button', { name: /02 基地一/ }).click();
  await game.getByRole('button', { name: '开始行动' }).click();
  await page.keyboard.down('ArrowDown');
  await page.clock.runFor(30000);
  await expect(canvas).toHaveAttribute('data-prone', 'true');
  await expect(canvas).toHaveAttribute('data-base-phase', 'combat');
  await expect(game.getByTestId('contra-lives-0')).toHaveText('♥♥♥');
  expect(Number(await canvas.getAttribute('data-bullets'))).toBeGreaterThan(0);
  await page.keyboard.up('ArrowDown');
  await page.clock.runFor(2000);
  await expect(game.getByTestId('contra-lives-0')).toHaveText('♥♥');
});

test('Pad base can shoot prone with two fingers and use the opened-door Advance button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const game = await openContra(page),
    canvas = game.locator('canvas');
  await game.getByRole('button', { name: /02 基地一/ }).click();
  await game.getByRole('button', { name: '开始行动' }).click();
  await game.locator('.contra-controllers').scrollIntoViewIfNeeded();
  const buttons = [
    game.getByRole('button', { name: '1P 俯卧 / 潜水', exact: true }),
    game.getByRole('button', { name: '1P 射击', exact: true }),
  ];
  const boxes = await Promise.all(buttons.map((b) => b.boundingBox()));
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: boxes.map((b, i) => ({
      x: b!.x + b!.width / 2,
      y: b!.y + b!.height / 2,
      id: i + 1,
    })),
  });
  await page.clock.runFor(700);
  await expect(canvas).toHaveAttribute('data-prone', 'true');
  await game.screenshot({ path: 'docs/assets/contra/verification/base-combat-pad.png' });
  await page.clock.runFor(3000);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(canvas).toHaveAttribute('data-base-phase', 'open');
  const advance = game.getByRole('button', { name: '前进 · 下一间' });
  expect(await advance.evaluate((b) => b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(
    44,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await game.screenshot({ path: 'docs/assets/contra/verification/base-open-pad.png' });
  await advance.tap();
  await page.clock.runFor(1100);
  await expect(canvas).toHaveAttribute('data-room', '2');
  await expect(canvas).toHaveAttribute('data-base-phase', 'combat');
  await expect(advance).toBeDisabled();
  await expect(game.getByTestId('contra-lives-0')).toHaveText('♥♥♥');
  await client.detach();
});

test('loss records once, restarting does not award currency or course stars', async ({ page }) => {
  const game = await openContra(page),
    canvas = game.locator('canvas');
  await game.getByRole('button', { name: /02 基地一/ }).click();
  await game.getByRole('button', { name: '开始行动' }).click();
  await page.clock.runFor(45000);
  await expect(canvas).toHaveAttribute('data-phase', 'over');
  expect(await records(page)).toMatchObject([{ level: 1, correct: 0, total: 1, stars: 0 }]);
  await page.clock.runFor(10000);
  expect(await records(page)).toHaveLength(1);
  await game.getByRole('button', { name: '再来一局' }).click();
  await expect(canvas).toHaveAttribute('data-phase', 'ready');
  expect(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('smart-fun-zone')!).state;
      return { points: s.points['contra-child'], mastery: s.mastery };
    }),
  ).toEqual({ points: 25, mastery: {} });
});

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test(`multi-touch co-op and responsive layout ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const game = await openContra(page),
      canvas = game.locator('canvas');
    await game.getByRole('button', { name: '双人并肩' }).click();
    await game.screenshot({ path: `docs/assets/contra/verification/ready-${viewport.width}.png` });
    await game.getByRole('button', { name: '开始行动' }).click();
    await game.locator('.contra-controllers').scrollIntoViewIfNeeded();
    const right = game.getByRole('button', { name: '1P 向右', exact: true }),
      fire = game.getByRole('button', { name: '1P 射击', exact: true }),
      jump = game.getByRole('button', { name: '2P 跳跃', exact: true });
    const boxes = await Promise.all([right, fire, jump].map((button) => button.boundingBox()));
    const points = boxes.map((r, i) => ({
      x: r!.x + r!.width / 2,
      y: r!.y + r!.height / 2,
      id: i + 1,
    }));
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await page.clock.runFor(350);
    expect(Number(await canvas.getAttribute('data-player-x'))).toBeGreaterThan(55);
    expect(Number(await canvas.getAttribute('data-p2-y'))).toBeLessThan(160);
    expect(Number(await canvas.getAttribute('data-bullets'))).toBeGreaterThan(0);
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await page.clock.runFor(100);
    const x = await canvas.getAttribute('data-player-x');
    await page.clock.runFor(200);
    await expect(canvas).toHaveAttribute('data-player-x', x!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await right.evaluate((b) => b.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
    await game.screenshot({ path: `docs/assets/contra/verification/battle-${viewport.width}.png` });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await game.screenshot({ path: `docs/assets/contra/verification/light-${viewport.width}.png` });
    await client.detach();
  });
}

test('eleven original FC recordings decode, audio obeys mute, pause and exit', async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { starts: 0, stops: 0, loops: 0 };
    (window as unknown as { contraAudioProbe: typeof probe }).contraAudioProbe = probe;
    const start = AudioBufferSourceNode.prototype.start,
      stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args) {
      probe.starts++;
      if (this.loop) probe.loops++;
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      probe.stops++;
      return stop.apply(this, args);
    };
  });
  const game = await openContra(page);
  const tracks = await page.evaluate(async () => {
    const response = await fetch('/assets/games/contra/audio/sources.json'),
      manifest = await response.json();
    const context = new OfflineAudioContext(1, 22050, 22050);
    return Promise.all(
      Object.values(
        manifest.tracks as Record<
          string,
          { file: string; loop: { start: number; end: number } | null }
        >,
      ).map(async (track) => {
        const response = await fetch('/assets/games/contra/audio/' + track.file);
        if (!response.ok) throw new Error(track.file);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        const energy = buffer.getChannelData(0).reduce((sum, value) => sum + value * value, 0);
        return {
          duration: buffer.duration,
          energy,
          validLoop:
            !track.loop || (track.loop.end < buffer.duration && track.loop.end > track.loop.start),
        };
      }),
    );
  });
  expect(tracks).toHaveLength(11);
  expect(tracks.every((t) => t.duration > 1 && t.energy > 0 && t.validLoop)).toBe(true);
  await game.getByRole('button', { name: '声音关闭' }).click();
  await game.getByRole('button', { name: '开始行动' }).click();
  const read = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            contraAudioProbe: { starts: number; stops: number; loops: number };
          }
        ).contraAudioProbe,
    );
  await expect.poll(async () => (await read()).loops).toBe(1);
  await game.getByRole('button', { name: '声音开启' }).click();
  const muted = await read();
  expect(muted.stops).toBeGreaterThan(0);
  await page.clock.runFor(500);
  expect((await read()).starts).toBe(muted.starts);
  await game.getByRole('button', { name: '声音关闭' }).click();
  await expect.poll(async () => (await read()).loops).toBe(2);
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  const paused = await read();
  await page.clock.runFor(500);
  expect((await read()).starts).toBe(paused.starts);
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  expect((await read()).starts).toBe(paused.starts);
});

for (const touch of [false, true]) {
  test(`jungle swimming and diving through real ${touch ? 'Pad touch' : 'Web keyboard'} controls`, async ({
    page,
  }) => {
    await page.setViewportSize(
      touch ? { width: 1024, height: 768 } : { width: 1440, height: 1100 },
    );
    const game = await openContra(page),
      canvas = game.locator('canvas');
    await game.getByRole('button', { name: '开始行动' }).click();
    const client = touch ? await page.context().newCDPSession(page) : null;
    if (client) {
      await game.locator('.contra-controllers').scrollIntoViewIfNeeded();
      const boxes = await Promise.all(
        ['1P 向右', '1P 射击'].map((name) =>
          game.getByRole('button', { name, exact: true }).boundingBox(),
        ),
      );
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: boxes.map((b, i) => ({
          x: b!.x + b!.width / 2,
          y: b!.y + b!.height / 2,
          id: i + 1,
        })),
      });
    } else {
      await page.keyboard.down('ArrowRight');
      await page.keyboard.down('j');
    }
    await page.clock.runFor(6000);
    if (client)
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else {
      await page.keyboard.up('ArrowRight');
      await page.keyboard.up('j');
    }
    await page.clock.runFor(1700);
    await expect(canvas).toHaveAttribute('data-swimming', 'true');
    await page.clock.runFor(100);
    const x = Number(await canvas.getAttribute('data-player-x'));
    if (client) {
      const b = (await game
        .getByRole('button', { name: '1P 俯卧 / 潜水', exact: true })
        .boundingBox())!;
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 3 }],
      });
    } else await page.keyboard.down('ArrowDown');
    await page.clock.runFor(800);
    await expect(canvas).toHaveAttribute('data-diving', 'true');
    await expect(canvas).toHaveAttribute('data-player-y', '214');
    expect(Number(await canvas.getAttribute('data-player-x'))).toBe(x);
    await game.screenshot({
      path: `docs/assets/contra/verification/diving-${touch ? 'pad' : 'web'}.png`,
    });
    if (client)
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.keyboard.up('ArrowDown');
    await page.clock.runFor(120);
    await expect(canvas).toHaveAttribute('data-diving', 'false');
    await expect(canvas).toHaveAttribute('data-swimming', 'true');
    await game.screenshot({
      path: `docs/assets/contra/verification/swimming-${touch ? 'pad' : 'web'}.png`,
    });
    if (client) {
      const b = (await game.getByRole('button', { name: '1P 向右', exact: true }).boundingBox())!;
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 4 }],
      });
    } else await page.keyboard.down('ArrowRight');
    await page.clock.runFor(7100);
    await expect(canvas).toHaveAttribute('data-swimming', 'true');
    expect(Number(await canvas.getAttribute('data-player-x'))).toBeGreaterThanOrEqual(1000);
    expect(Number(await canvas.getAttribute('data-player-x'))).toBeLessThan(1024);
    await expect(canvas).toHaveAttribute('data-player-y', '214');
    if (client) {
      const boxes = await Promise.all(
        ['1P 向右', '1P 跳跃'].map((name) =>
          game.getByRole('button', { name, exact: true }).boundingBox(),
        ),
      );
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: boxes.map((b, i) => ({
          x: b!.x + b!.width / 2,
          y: b!.y + b!.height / 2,
          id: i + 4,
        })),
      });
    } else await page.keyboard.down('k');
    await page.clock.runFor(850);
    await expect(canvas).toHaveAttribute('data-swimming', 'false');
    await expect(canvas).toHaveAttribute('data-grounded', 'true');
    expect(Number(await canvas.getAttribute('data-player-x'))).toBeGreaterThan(1024);
    await expect(canvas).toHaveAttribute('data-player-y', '160');
    if (client)
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else {
      await page.keyboard.up('k');
      await page.keyboard.up('ArrowRight');
    }
    await game.screenshot({
      path: `docs/assets/contra/verification/shore-exit-${touch ? 'pad' : 'web'}.png`,
    });
    await client?.detach();
  });
}

test('real enemy hits play audible original hit and kill samples over the music', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const dataPaths = new WeakMap<ArrayBuffer, string>(),
      bufferPaths = new WeakMap<AudioBuffer, string>();
    const probe: { file: string; peak: number; loop: boolean }[] = [];
    (window as unknown as { contraImpactProbe: typeof probe }).contraImpactProbe = probe;
    const read = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = async function () {
      const data = await read.call(this);
      dataPaths.set(data, this.url);
      return data;
    };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (data, ...callbacks) {
      const pending = decode.call(this, data, ...callbacks);
      void pending.then((buffer) => bufferPaths.set(buffer, dataPaths.get(data) ?? ''));
      return pending;
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      let peak = 0;
      const wave = this.buffer?.getChannelData(0);
      if (wave) for (let i = 0; i < wave.length; i += 16) peak = Math.max(peak, Math.abs(wave[i]));
      probe.push({
        file: this.buffer ? (bufferPaths.get(this.buffer) ?? '') : '',
        peak,
        loop: this.loop,
      });
      return start.apply(this, args);
    };
  });
  const game = await openContra(page);
  const decoded = await page.evaluate(async () => {
    const manifest = await (await fetch('/assets/games/contra/audio/effects-sources.json')).json();
    const context = new OfflineAudioContext(1, 44100, 44100);
    return Promise.all(
      Object.values(manifest.effects as Record<string, { file: string }>).map(async (t) => {
        const buffer = await context.decodeAudioData(
          await (await fetch('/assets/games/contra/audio/' + t.file)).arrayBuffer(),
        );
        const wave = buffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < wave.length; i += 8) peak = Math.max(peak, Math.abs(wave[i]));
        return { file: t.file, duration: buffer.duration, peak };
      }),
    );
  });
  expect(decoded).toHaveLength(15);
  expect(decoded.every((t) => t.duration > 0.05 && t.peak > 0.02)).toBe(true);
  await game.getByRole('button', { name: '声音关闭' }).click();
  await game.getByRole('button', { name: '开始行动' }).click();
  const read = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            contraImpactProbe: { file: string; peak: number; loop: boolean }[];
          }
        ).contraImpactProbe,
    );
  await expect.poll(async () => (await read()).filter((s) => s.loop).length).toBe(1);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('j');
  await page.clock.runFor(6000);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('j');
  await expect
    .poll(
      async () =>
        (await read()).filter((s) => s.file.includes('sfx-hit-fc') && s.peak > 0.02).length,
    )
    .toBeGreaterThan(0);
  expect((await read()).some((s) => s.file.includes('sfx-kill-fc') && s.peak > 0.02)).toBe(true);
  expect((await read()).filter((s) => s.loop)).toHaveLength(1);
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  const count = (await read()).length;
  await page.clock.runFor(1000);
  expect((await read()).length).toBe(count);
});
