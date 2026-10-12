import { expect, test, type Page } from '@playwright/test';

test.use({ hasTouch: true, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-02T12:00:00Z') });
  await page.addInitScript(() => {
    const id = 'bomber-child';
    Math.random = () => .5;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: {
      lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
      profiles: [{ id, name: '小探险家', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: id, records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
      wrongs: {}, points: { [id]: 25 }, pointLog: { [id]: [] }, customTasks: {}, taskStates: {},
      ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {},
      bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
      expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
    }, version: 6 }));
  });
});
async function openBomber(page: Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: /敏捷/ }).click();
  await page.getByRole('article').filter({ hasText: '星岛炸弹人' }).getByRole('button', { name: '开始炸弹冒险' }).click();
  const game = page.locator('.bm-game');
  await expect(game.getByRole('heading', { name: '星岛炸弹人' })).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
  await game.scrollIntoViewIfNeeded();
  return game;
}
async function bomberRecords(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.records.filter((r: { gameId: string }) => r.gameId === 'sky-bomber'));
}

test('炸弹人背景音乐默认播放，没有开关，暂停和退出停止，继续恢复', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    const probe = { context: null as AudioContext | null, analyser: null as AnalyserNode | null, notes: 0 };
    (window as unknown as { bomberAudioProbe: typeof probe }).bomberAudioProbe = probe;
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super();
        probe.context = this;
        const analyser = this.createAnalyser();
        analyser.fftSize = 2048;
        analyser.connect(this.destination);
        probe.analyser = analyser;
        const createGain = this.createGain.bind(this);
        this.createGain = () => {
          const gain = createGain(), connect = gain.connect.bind(gain);
          gain.connect = ((destination: AudioNode) => connect(destination === this.destination ? analyser : destination)) as GainNode['connect'];
          return gain;
        };
        const createOscillator = this.createBufferSource.bind(this);
        this.createBufferSource = () => {
          const oscillator = createOscillator(), start = oscillator.start.bind(oscillator);
          oscillator.start = (time) => { probe.notes++; start(time); };
          return oscillator;
        };
      }
    };
  });
  const audio = () => page.evaluate(() => {
    const probe = (window as unknown as { bomberAudioProbe: { context: AudioContext | null; analyser: AnalyserNode | null; notes: number } }).bomberAudioProbe;
    const buffer = new Float32Array(2048);
    probe.analyser?.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, sample) => sum + sample * sample, 0) / buffer.length);
    return { rms: probe.context?.state === 'closed' ? 0 : rms, notes: probe.notes, state: probe.context?.state ?? 'none' };
  });
  const game = await openBomber(page);
  await expect(game.getByRole('button', { name: /声音|Mute|Unmute/ })).toHaveCount(0);
  await page.clock.runFor(400);
  await expect.poll(async () => (await audio()).rms, { timeout: 5000 }).toBeGreaterThan(.0001);
  expect((await audio()).state).toBe('running');
  await game.getByRole('button', { name: '开始探险', exact: true }).click();
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  const pausedNotes = (await audio()).notes;
  await page.clock.runFor(3000);
  await expect.poll(async () => (await audio()).rms, { timeout: 3000 }).toBeLessThan(.00002);
  expect((await audio()).notes).toBe(pausedNotes);
  await game.getByRole('button', { name: '继续探险' }).click();
  await page.clock.runFor(400);
  await expect.poll(async () => (await audio()).rms, { timeout: 5000 }).toBeGreaterThan(.0001);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.clock.runFor(1000);
  await expect.poll(async () => (await audio()).rms, { timeout: 3000 }).toBeLessThan(.00002);
  await expect(game.locator('.bm-overlay')).toContainText('小岛等你回来');
  await game.getByRole('button', { name: '继续探险' }).click();
  await page.clock.runFor(400);
  await expect.poll(async () => (await audio()).rms, { timeout: 5000 }).toBeGreaterThan(.0001);
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await page.clock.runFor(1000);
  await expect.poll(async () => (await audio()).rms, { timeout: 3000 }).toBeLessThan(.00002);
  expect((await audio()).state).toBe('closed');
  const exitedNotes = (await audio()).notes;
  await page.clock.runFor(10_000);
  expect((await audio()).notes).toBe(exitedNotes);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.sound)).toBe(false);
});

test('炸弹爆炸播放完整原版 DMC 采样，爆裂后仍有衰减声音', async ({ page }) => {
  await page.addInitScript(() => {
    const stored = JSON.parse(localStorage.getItem('smart-fun-zone')!);
    stored.state.sound = true;
    localStorage.setItem('smart-fun-zone', JSON.stringify(stored));
    const NativeAudioContext = window.AudioContext;
    const played: { duration: number; rate: number; bodyRms: number; tailRms: number; loop: boolean }[] = [];
    (window as unknown as { bomberBlastProbe: typeof played }).bomberBlastProbe = played;
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super();
        const createSource = this.createBufferSource.bind(this);
        this.createBufferSource = () => {
          const source = createSource(), start = source.start.bind(source);
          source.start = (when) => {
            const buffer = source.buffer;
            if (buffer) {
              const samples = buffer.getChannelData(0);
              const rms = (from: number, to: number) => {
                const segment = samples.subarray(Math.floor(from * buffer.sampleRate), Math.floor(to * buffer.sampleRate));
                return Math.sqrt(segment.reduce((sum, v) => sum + v * v, 0) / segment.length);
              };
              played.push({ duration: buffer.duration, rate: source.playbackRate.value, bodyRms: rms(.05, .15), tailRms: rms(.9, 1.1), loop: source.loop });
            }
            start(when);
          };
          return source;
        };
      }
    };
  });
  const game = await openBomber(page), board = game.locator('canvas');
  await game.getByRole('button', { name: '开始探险', exact: true }).click();
  await page.keyboard.press('d');
  await page.keyboard.press('Space');
  await expect(board).toHaveAttribute('data-bombs', '1');
  await page.clock.runFor(220);
  await page.keyboard.press('a');
  await page.clock.runFor(220);
  await page.keyboard.press('s');
  await page.clock.runFor(2900);
  await expect(board).toHaveAttribute('data-bombs', '0');
  await expect(board).toHaveAttribute('data-phase', 'playing');
  const blasts = () => page.evaluate(() => (window as unknown as {
    bomberBlastProbe: { duration: number; rate: number; bodyRms: number; tailRms: number; loop: boolean }[];
  }).bomberBlastProbe.filter(b => b.duration > 1.38 && b.duration < 1.41));
  await expect.poll(async () => (await blasts()).length).toBe(1);
  const blast = (await blasts())[0];
  expect(blast.rate).toBe(1);
  expect(blast.loop).toBe(false);
  expect(blast.bodyRms).toBeGreaterThan(.05);
  expect(blast.tailRms).toBeGreaterThan(.005);
});

test('键盘移动、炸开木箱、拾取首关火力道具，炸弹限制及暂停冻结', async ({ page }) => {
  const game = await openBomber(page), board = game.locator('canvas');
  await expect(game.getByTestId('bm-time')).toHaveText('6:40');
  await game.getByRole('button', { name: '开始探险', exact: true }).click();
  await page.keyboard.press('d');
  await expect(board).toHaveAttribute('data-player-x', '2');
  await page.keyboard.press('Space');
  await expect(board).toHaveAttribute('data-bombs', '1');
  await page.keyboard.press('Space');
  await expect(board).toHaveAttribute('data-bombs', '1');
  await page.clock.runFor(220);
  await page.keyboard.press('a');
  await page.clock.runFor(220);
  await page.keyboard.press('s');
  await expect(board).toHaveAttribute('data-player-y', '2');
  await page.keyboard.press('p');
  const time = await game.getByTestId('bm-time').textContent();
  await page.clock.runFor(6000);
  await expect(board).toHaveAttribute('data-bombs', '1');
  await expect(game.getByTestId('bm-time')).toHaveText(time!);
  await expect(game.getByRole('button', { name: '经典', exact: true })).toBeDisabled();
  await game.getByRole('button', { name: '继续探险' }).click();
  await page.clock.runFor(3400);
  await expect(board).toHaveAttribute('data-bombs', '0');
  await expect(game.getByTestId('bm-score')).toHaveText('0');
  for (const key of ['w', 'd', 'd']) { await page.keyboard.press(key); await page.clock.runFor(220); }
  await expect(board).toHaveAttribute('data-player-x', '3');
  await expect(game.locator('.bm-equipment').getByText('2 格', { exact: true })).toBeVisible();
  await expect(game.getByRole('button', { name: /遥控引爆/ })).toBeDisabled();
  await expect(game.locator('.bm-guide')).toBeVisible();
  await expect(game.getByTestId('bm-score')).toHaveText('1,000');
  expect(await bomberRecords(page)).toHaveLength(0);
  await game.screenshot({ path: '/tmp/bomber-desktop.png' });
});

test('受伤、失败只记录一次，重新探险与中途退出不额外结算', async ({ page }) => {
  const game = await openBomber(page), board = game.locator('canvas');
  await game.getByRole('button', { name: '开始探险', exact: true }).click();
  for (let hit = 0; hit < 3; hit++) {
    await page.keyboard.press('Space');
    await page.clock.runFor(2900);
    if (hit < 2) {
      await expect(board).toHaveAttribute('data-phase', 'retry');
      await game.getByRole('button', { name: '重试本关' }).click();
    }
  }
  await expect(board).toHaveAttribute('data-phase', 'over');
  await expect(game.getByTestId('bm-lives')).toHaveAttribute('aria-label', '剩余 0 条生命');
  let records = await bomberRecords(page);
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ level: 2, stars: 0, correct: 0, total: 1 });
  expect(records[0].durationSec).toBeGreaterThanOrEqual(6);
  await page.clock.runFor(5000);
  expect(await bomberRecords(page)).toHaveLength(1);
  await game.getByRole('button', { name: '续关探险' }).click();
  await expect(game.getByTestId('bm-lives')).toHaveAttribute('aria-label', '剩余 3 条生命');
  await page.keyboard.press('Space');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(board).toHaveAttribute('data-phase', 'paused');
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await expect(game).toHaveCount(0);
  await page.clock.runFor(6000);
  records = await bomberRecords(page);
  expect(records).toHaveLength(1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state);
  expect(stored.points['bomber-child']).toBe(25);
  expect(stored.mastery).toEqual({});
});

test('沿首行炸砖探索，火力升级后宽屏镜头横向跟随', async ({ page }) => {
  test.setTimeout(120_000);
  // Deterministic maze with an explorable first row; keep real enemy movement and keyboard inputs.
  await page.addInitScript(() => { Math.random = () => .704; });
  const game = await openBomber(page), board = game.locator('canvas');
  await game.getByRole('button', { name: '开始探险', exact: true }).click();
  const step = async (key: string) => { await page.keyboard.press(key); await page.clock.runFor(240); };
  for (let action = 0; action < 100; action++) {
    const x = Number(await board.getAttribute('data-player-x'));
    if (x >= 13) break;
    await step('ArrowRight');
    if (Number(await board.getAttribute('data-player-x')) > x) continue;
    await page.keyboard.press('Space');
    await expect(board).toHaveAttribute('data-bombs', '1');
    // The spawn column always has a safe corner; use actual movement to find blocked bricks.
    for (let back = x; back > 1; back--) await step('ArrowLeft');
    await step('ArrowDown');
    await page.clock.runFor(3400);
    await step('ArrowUp');
    await expect(board).toHaveAttribute('data-phase', 'playing');
  }
  expect(Number(await board.getAttribute('data-player-x'))).toBeGreaterThanOrEqual(13);
  expect(Number(await board.getAttribute('data-camera-x'))).toBeGreaterThan(0);
  await expect(game.locator('.bm-equipment').getByText('2 格', { exact: true })).toBeVisible();
  await page.keyboard.press('p');
  await game.screenshot({ path: '/tmp/bomber-fc-scrolling.png' });
});

for (const viewport of [{ width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
  test('Pad 触控长按移动、放弹与布局 ' + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    const game = await openBomber(page), board = game.locator('canvas');
    await game.getByRole('button', { name: '开始探险', exact: true }).click();
    const right = game.getByRole('button', { name: '向右移动' });
    await right.scrollIntoViewIfNeeded();
    const bounds = (await right.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.clock.runFor(350);
    await page.mouse.up();
    await expect(board).toHaveAttribute('data-player-x', '2');
    await game.getByRole('button', { name: /放炸弹/ }).tap();
    await expect(board).toHaveAttribute('data-bombs', '1');
    await page.clock.runFor(200);
    await expect(board).toHaveAttribute('data-player-x', '2');
    const sizing = await game.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const buttons = [...element.querySelectorAll<HTMLButtonElement>('.bm-controls button')].map((button) => { const r = button.getBoundingClientRect(); return { width: r.width, height: r.height }; });
      return { left: bounds.left, right: bounds.right, width: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth, buttons };
    });
    expect(sizing.overflow).toBe(false);
    expect(sizing.left).toBeGreaterThanOrEqual(0);
    expect(sizing.right).toBeLessThanOrEqual(sizing.width);
    expect(sizing.buttons.every((button) => button.width >= 44 && button.height >= 44)).toBe(true);
    await game.screenshot({ path: '/tmp/bomber-pad-' + viewport.width + '.png' });
  });
}
