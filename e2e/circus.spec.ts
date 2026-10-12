import { expect, test, type Page } from '@playwright/test';

test.use({
  hasTouch: true,
  launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
});
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
  await page.addInitScript(() => {
    const id = 'circus-child';
    localStorage.setItem(
      'smart-fun-zone',
      JSON.stringify({
        state: {
          lang: 'zh',
          theme: 'dark',
          sound: false,
          voiceOn: false,
          profiles: [{ id, name: '小演员', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
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
async function openCircus(page: Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: /敏捷/ }).click();
  await page
    .getByRole('article')
    .filter({ hasText: '马戏团' })
    .getByRole('button', { name: '进入马戏团' })
    .click();
  const game = page.locator('.cc-game');
  await expect(game.getByRole('heading', { name: '马戏团', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
  return game;
}
const records = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('smart-fun-zone')!).state.records.filter(
      (r: { gameId: string }) => r.gameId === 'sky-circus',
    ),
  );

test('五节目、A/B 选择，键盘移动与跳跃，暂停和切后台冻结', async ({ page }) => {
  const game = await openCircus(page),
    board = game.locator('canvas');
  await expect(game.locator('.cc-act-list li')).toHaveCount(5);
  await expect(game.getByTestId('cc-lives')).toHaveText('3');
  await game.getByRole('button', { name: 'GAME B' }).click();
  await expect(game.getByRole('button', { name: 'GAME B' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await game.getByRole('button', { name: 'GAME A' }).click();
  await game.getByRole('button', { name: '开始表演', exact: true }).click();
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('Space');
  await page.clock.runFor(300);
  await page.keyboard.up('ArrowRight');
  expect(Number(await board.getAttribute('data-player-x'))).toBeGreaterThan(48);
  expect(Number(await board.getAttribute('data-player-y'))).toBeLessThan(150);
  await page.keyboard.press('p');
  await expect(board).toHaveAttribute('data-phase', 'paused');
  const x = await board.getAttribute('data-player-x'),
    bonus = await game.getByTestId('cc-bonus').textContent();
  await page.clock.runFor(5000);
  await expect(board).toHaveAttribute('data-player-x', x!);
  await expect(game.getByTestId('cc-bonus')).toHaveText(bonus!);
  await expect(game.getByRole('button', { name: 'GAME B' })).toBeDisabled();
  await game.getByRole('button', { name: '继续表演', exact: true }).click();
  await page.clock.runFor(650);
  await expect(board).toHaveAttribute('data-grounded', 'true');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(board).toHaveAttribute('data-phase', 'paused');
  await game.getByRole('button', { name: '继续表演', exact: true }).click();
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(800);
  await page.keyboard.up('ArrowRight');
  expect(Number(await board.getAttribute('data-player-x'))).toBeGreaterThan(Number(x));
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await expect(game).toHaveCount(0);
  expect(await records(page)).toHaveLength(0);
});

test('骑狮实际钻过首个火圈，卷轴、奖励和生命反馈', async ({ page }) => {
  const game = await openCircus(page),
    board = game.locator('canvas');
  await game.getByRole('button', { name: '开始表演', exact: true }).click();
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(2100);
  await page.keyboard.press('Space');
  await page.clock.runFor(650);
  await page.keyboard.up('ArrowRight');
  await expect(board).toHaveAttribute('data-phase', 'playing');
  await expect(game.getByTestId('cc-score')).toHaveText('000100');
  expect(Number(await board.getAttribute('data-camera-x'))).toBeGreaterThan(100);
  await page.keyboard.press('p');
  await game.screenshot({ path: '/tmp/circus-desktop.png' });
});

test('生命耗尽只记录一次，重开与退出不额外结算或发币', async ({ page }) => {
  const game = await openCircus(page),
    board = game.locator('canvas');
  await game.getByRole('button', { name: '开始表演', exact: true }).click();
  for (let hit = 0; hit < 3; hit++) {
    await page.keyboard.down('ArrowRight');
    await page.clock.runFor(3000);
    await page.keyboard.up('ArrowRight');
    if (hit < 2) {
      await expect(board).toHaveAttribute('data-phase', 'hit');
      await game.getByRole('button', { name: '重试本关' }).click();
    }
  }
  await expect(board).toHaveAttribute('data-phase', 'over');
  await expect(game.getByTestId('cc-lives')).toHaveText('0');
  const saved = await records(page);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ level: 1, stars: 0, correct: 0, total: 1 });
  expect(saved[0].durationSec).toBeGreaterThan(6);
  await page.clock.runFor(3000);
  expect(await records(page)).toHaveLength(1);
  await game.getByRole('button', { name: '再来一局' }).click();
  await expect(game.getByTestId('cc-lives')).toHaveText('3');
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  expect(await records(page)).toHaveLength(1);
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('smart-fun-zone')!).state,
  );
  expect(stored.points['circus-child']).toBe(25);
  expect(stored.mastery).toEqual({});
});

test('所有节目可进入：踩球会坠落、骑马自动前进、秋千可以松手', async ({ page }) => {
  const game = await openCircus(page),
    board = game.locator('canvas'),
    select = game.getByLabel('起始节目');
  for (const stage of [2, 3, 4, 5]) {
    await select.selectOption(String(stage));
    await expect(board).toHaveAttribute('data-stage', String(stage));
    await game.getByRole('button', { name: '开始表演', exact: true }).click();
    if (stage === 3) {
      await page.keyboard.down('ArrowRight');
      await page.clock.runFor(900);
      await page.keyboard.up('ArrowRight');
      await expect(board).toHaveAttribute('data-phase', 'hit');
    } else if (stage === 4) {
      await page.clock.runFor(500);
      expect(Number(await board.getAttribute('data-player-x'))).toBeGreaterThan(70);
    } else if (stage === 5) {
      await expect(board).toHaveAttribute('data-support', '0');
      await page.clock.runFor(300);
      await page.keyboard.press('k');
      await expect(board).toHaveAttribute('data-support', 'none');
      await expect(board).toHaveAttribute('data-phase', 'playing');
    }
    await game.getByRole('button', { name: '重新开始', exact: true }).click();
  }
  expect(await records(page)).toHaveLength(0);
});

for (const viewport of [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`Pad 同时触控方向和跳跃，释放后停止，无横向溢出 ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const game = await openCircus(page),
      board = game.locator('canvas');
    await game.getByRole('button', { name: '开始表演', exact: true }).click();
    const right = game.getByRole('button', { name: '向右移动' }),
      jump = game.getByRole('button', { name: 'A 小跳 / 松手' });
    await right.scrollIntoViewIfNeeded();
    const r = (await right.boundingBox())!,
      j = (await jump.boundingBox())!,
      session = await page.context().newCDPSession(page);
    const direction = { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 };
    const action = { x: j.x + j.width / 2, y: j.y + j.height / 2, id: 2 };
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [direction],
    });
    await page.clock.runFor(150);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [direction, action],
    });
    await page.clock.runFor(300);
    expect(Number(await board.getAttribute('data-player-x'))).toBeGreaterThan(65);
    expect(Number(await board.getAttribute('data-player-y'))).toBeLessThan(150);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.clock.runFor(150);
    const x = await board.getAttribute('data-player-x');
    await page.clock.runFor(200);
    await expect(board).toHaveAttribute('data-player-x', x!);
    expect(await game.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await game.screenshot({ path: `/tmp/circus-pad-${viewport.width}.png` });
    await session.detach();
    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    await expect(game.getByRole('heading', { name: '马戏团', exact: true })).toBeVisible();
    await game.screenshot({ path: `/tmp/circus-light-${viewport.width}.png` });
  });
}

test('FC 原版三首音乐按五关分配，声音开关、暂停、后台和退出停止播放', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    const probe = {
      started: 0,
      active: 0,
      clips: [] as { loop: boolean; period: number; rms: number }[],
    };
    (window as unknown as { circusAudioProbe: typeof probe }).circusAudioProbe = probe;
    window.AudioContext = class extends NativeAudio {
      constructor() {
        super();
        const create = this.createBufferSource.bind(this);
        this.createBufferSource = () => {
          const source = create(),
            start = source.start.bind(source),
            stop = source.stop.bind(source);
          let active = false;
          source.start = (...args: Parameters<typeof source.start>) => {
            active = true;
            probe.started++;
            probe.active++;
            const pcm = source.buffer!.getChannelData(0);
            let power = 0;
            for (let i = 0; i < pcm.length; i += 53) power += pcm[i] ** 2;
            probe.clips.push({
              loop: source.loop,
              period: source.loopEnd - source.loopStart,
              rms: Math.sqrt(power / Math.ceil(pcm.length / 53)),
            });
            return start(...args);
          };
          source.stop = (...args: Parameters<typeof source.stop>) => {
            if (active) probe.active--;
            active = false;
            return stop(...args);
          };
          return source;
        };
      }
    };
  });
  const requested: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/circus/audio/') && request.url().endsWith('.mp3'))
      requested.push(request.url().split('/').pop()!);
  });
  const game = await openCircus(page),
    board = game.locator('canvas');
  const probe = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            circusAudioProbe: {
              started: number;
              active: number;
              clips: { loop: boolean; period: number; rms: number }[];
            };
          }
        ).circusAudioProbe,
    );
  await game.getByRole('button', { name: '开始表演', exact: true }).click();
  await page.clock.runFor(200);
  expect((await probe()).started).toBe(0);
  await game.getByRole('button', { name: '声音：关' }).click();
  await expect.poll(async () => (await probe()).active).toBe(1);
  expect(requested).toEqual(['lion-horse.mp3']);
  const first = (await probe()).clips[0];
  expect(first.loop).toBe(true);
  expect(first.rms).toBeGreaterThan(0.05);
  expect(first.period).toBeCloseTo(22.363, 2);
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  const paused = (await probe()).started;
  expect((await probe()).active).toBe(0);
  await page.clock.runFor(3000);
  expect((await probe()).started).toBe(paused);
  await game.getByRole('button', { name: '继续表演', exact: true }).click();
  await expect.poll(async () => (await probe()).active).toBe(1);
  expect((await probe()).started).toBe(paused + 1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(board).toHaveAttribute('data-phase', 'paused');
  expect((await probe()).active).toBe(0);
  await page.clock.runFor(3000);
  expect((await probe()).started).toBe(paused + 1);
  await game.getByRole('button', { name: '继续表演', exact: true }).click();
  await expect.poll(async () => (await probe()).active).toBe(1);
  await game.getByRole('button', { name: '声音：开' }).click();
  await expect.poll(async () => (await probe()).active).toBe(0);
  await game.getByRole('button', { name: '声音：关' }).click();
  await expect.poll(async () => (await probe()).active).toBe(1);
  for (const [stage, file, period] of [
    [2, 'wire-balls.mp3', 29.818],
    [3, 'wire-balls.mp3', 29.818],
    [4, 'lion-horse.mp3', 22.363],
    [5, 'trapeze.mp3', 25.558],
  ] as const) {
    await game.getByRole('button', { name: '重新开始', exact: true }).click();
    expect((await probe()).active).toBe(0);
    await game.getByLabel('起始节目').selectOption(String(stage));
    await game.getByRole('button', { name: '开始表演', exact: true }).click();
    await expect.poll(async () => (await probe()).active).toBe(1);
    const clip = (await probe()).clips.at(-1)!;
    expect(clip.rms).toBeGreaterThan(0.05);
    expect(clip.period).toBeCloseTo(period, 2);
    expect(requested).toContain(file);
  }
  // Each original audio file is decoded once, including shared themes and resumed playback.
  expect(requested.sort()).toEqual(['lion-horse.mp3', 'trapeze.mp3', 'wire-balls.mp3']);
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  expect((await probe()).active).toBe(0);
  const exited = (await probe()).started;
  await page.clock.runFor(5000);
  expect((await probe()).started).toBe(exited);
});

test('音乐仍在加载时暂停，加载完成保持静音，继续后才播放', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route('**/assets/circus/audio/lion-horse.mp3', async (route) => {
    requested = true;
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    (window as unknown as { circusStarted: number }).circusStarted = 0;
    window.AudioContext = class extends NativeAudio {
      constructor() {
        super();
        const decode = this.decodeAudioData.bind(this);
        this.decodeAudioData = (...args: Parameters<typeof this.decodeAudioData>) =>
          decode(...args).then((buffer) => {
            (window as unknown as { circusDecoded: boolean }).circusDecoded = true;
            return buffer;
          });
      }
      createBufferSource() {
        const source = super.createBufferSource(),
          start = source.start.bind(source);
        source.start = (...args: Parameters<typeof source.start>) => {
          (window as unknown as { circusStarted: number }).circusStarted++;
          return start(...args);
        };
        return source;
      }
    };
  });
  const game = await openCircus(page);
  await game.getByRole('button', { name: '声音：关' }).click();
  await game.getByRole('button', { name: '开始表演', exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  release();
  await expect
    .poll(async () =>
      page.evaluate(() => (window as unknown as { circusDecoded: boolean }).circusDecoded),
    )
    .toBe(true);
  await page.clock.runFor(3000);
  expect(
    await page.evaluate(() => (window as unknown as { circusStarted: number }).circusStarted),
  ).toBe(0);
  await game.getByRole('button', { name: '继续表演', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(() => (window as unknown as { circusStarted: number }).circusStarted),
    )
    .toBe(1);
});
