import { expect, test, type Page } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-02T12:00:00Z') });
  await page.addInitScript(() => {
    const id = 'junqi-child';
    Math.random = () => .5;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: {
      lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
      profiles: [{ id, name: '小指挥官', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: id, records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
      wrongs: {}, points: { [id]: 25 }, pointLog: { [id]: [] }, customTasks: {}, taskStates: {},
      ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {},
      bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
      expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
    }, version: 6 }));
  });
});
async function openArmy(page: Page) {
  await page.goto('/#/lobby');
  await page.getByRole('article').filter({ hasText: '星阵军棋' }).getByRole('button', { name: '进入军棋' }).click();
  const game = page.locator('.jq-game');
  await expect(game.getByRole('heading', { name: '星阵军棋' })).toBeVisible();
  await page.clock.pauseAt(new Date('2026-10-02T12:00:10Z'));
  return game;
}
async function armyRecords(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.records.filter((r: { gameId: string }) => r.gameId === 'sky-junqi'));
}

test('军棋背景音乐默认播放，没有开关，暂停和退出停止，继续恢复', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    const probe = { context: null as AudioContext | null, analyser: null as AnalyserNode | null, notes: 0 };
    (window as unknown as { armyAudioProbe: typeof probe }).armyAudioProbe = probe;
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
        const createOscillator = this.createOscillator.bind(this);
        this.createOscillator = () => {
          const oscillator = createOscillator(), start = oscillator.start.bind(oscillator);
          oscillator.start = (time) => { probe.notes++; start(time); };
          return oscillator;
        };
      }
    };
  });
  const audio = () => page.evaluate(() => {
    const probe = (window as unknown as { armyAudioProbe: { context: AudioContext | null; analyser: AnalyserNode | null; notes: number } }).armyAudioProbe;
    const buffer = new Float32Array(2048);
    probe.analyser?.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, sample) => sum + sample * sample, 0) / buffer.length);
    return { rms, notes: probe.notes, state: probe.context?.state ?? 'none' };
  });
  const game = await openArmy(page);
  await expect(game.getByRole('button', { name: /声音|Mute|Unmute/ })).toHaveCount(0);
  await page.clock.runFor(400);
  await expect.poll(async () => (await audio()).rms, { timeout: 5000 }).toBeGreaterThan(.0001);
  expect((await audio()).state).toBe('running');
  await game.getByRole('button', { name: '开始对弈', exact: true }).click();
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  const pausedNotes = (await audio()).notes;
  await page.clock.runFor(3000);
  await expect.poll(async () => (await audio()).rms, { timeout: 3000 }).toBeLessThan(.00002);
  expect((await audio()).notes).toBe(pausedNotes);
  await game.getByRole('button', { name: '继续对弈' }).click();
  await page.clock.runFor(400);
  await expect.poll(async () => (await audio()).rms, { timeout: 5000 }).toBeGreaterThan(.0001);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.clock.runFor(1000);
  await expect.poll(async () => (await audio()).rms, { timeout: 3000 }).toBeLessThan(.00002);
  await expect(game.locator('.jq-overlay')).toContainText('棋桌休息一下');
  await game.getByRole('button', { name: '继续对弈' }).click();
  await page.clock.runFor(400);
  await expect.poll(async () => (await audio()).rms, { timeout: 5000 }).toBeGreaterThan(.0001);
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await page.clock.runFor(1000);
  await expect.poll(async () => (await audio()).rms, { timeout: 3000 }).toBeLessThan(.00002);
  const exitedNotes = (await audio()).notes;
  await page.clock.runFor(10_000);
  expect((await audio()).notes).toBe(exitedNotes);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.sound)).toBe(false);
});

test('布阵可交换棋子，拒绝军旗出营，换阵后保持 50 枚棋子', async ({ page }) => {
  const game = await openArmy(page), cells = game.getByRole('gridcell');
  await expect(cells).toHaveCount(60);
  await expect(game.locator('.jq-piece')).toHaveCount(50);
  await cells.nth(56).click();
  await cells.nth(30).click();
  await expect(game.locator('.jq-message')).toContainText('这两枚不能交换');
  await expect(cells.nth(56)).toContainText('军旗');
  await cells.nth(56).click();
  await cells.nth(30).click();
  await cells.nth(31).click();
  await expect(cells.nth(30)).toContainText('连长');
  await expect(cells.nth(31)).toContainText('排长');
  await game.getByRole('button', { name: '换一套布阵' }).click();
  await expect(game.locator('.jq-piece')).toHaveCount(50);
  await expect(game.locator('.jq-cell.camp .jq-piece')).toHaveCount(0);
  await expect(game.locator('.jq-cell.hq.red.kind-flag')).toHaveCount(1);
  expect(await armyRecords(page)).toHaveLength(0);
});

test('点选和键盘行棋，电脑回应后可悔一整回合，提示标出落点', async ({ page }) => {
  const game = await openArmy(page), cells = game.getByRole('gridcell');
  await game.getByRole('button', { name: '开始对弈', exact: true }).click();
  await expect(game.getByRole('button', { name: '参谋', exact: true })).toBeDisabled();
  await page.keyboard.press('Enter'); // Initial focus: red engineer, row 7 column 3
  await expect(cells.nth(32)).toHaveAttribute('aria-selected', 'true');
  await expect(cells.nth(36)).toHaveClass(/target/);
  await cells.nth(36).click();
  await expect(cells.nth(36)).toContainText('工兵');
  await expect(game.getByRole('status')).toContainText('电脑正在调兵');
  await page.clock.runFor(1000);
  await expect(game.getByRole('status')).toContainText('轮到红方行棋');
  await expect(game.locator('.jq-status')).toContainText('2');
  await game.getByRole('button', { name: '悔一回合' }).click();
  await expect(cells.nth(32)).toContainText('工兵');
  await expect(cells.nth(36)).not.toContainText('工兵');
  await expect(game.locator('.jq-piece')).toHaveCount(50);
  await game.getByRole('button', { name: '行棋提示' }).click();
  await expect(game.locator('.jq-cell.suggested')).toHaveCount(1);
  await expect(game.locator('.jq-cell.selected')).toHaveCount(1);
});

test('同级交战双方移除，暂停冻结电脑和时长，自动暂停与退出清理', async ({ page }) => {
  const game = await openArmy(page), cells = game.getByRole('gridcell');
  await game.getByRole('button', { name: '开始对弈', exact: true }).click();
  await cells.nth(32).click();
  await cells.nth(27).click();
  await expect(game.locator('.jq-piece')).toHaveCount(48);
  await expect(game.locator('.jq-casualties small')).toHaveCount(2);
  await game.getByRole('button', { name: '暂停', exact: true }).click();
  const time = await game.getByTestId('junqi-time').textContent();
  const board = await cells.allTextContents();
  await page.clock.runFor(5000);
  await expect(game.getByTestId('junqi-time')).toHaveText(time!);
  expect(await cells.allTextContents()).toEqual(board);
  await game.getByRole('button', { name: '继续对弈' }).click();
  await page.clock.runFor(2000);
  await expect(game.getByRole('status')).toContainText('轮到红方行棋');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(game.locator('.jq-overlay')).toContainText('棋桌休息一下');
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await page.clock.runFor(10_000);
  expect(await armyRecords(page)).toHaveLength(0);
});

test('确认认输只结算一次，重开保留货币与课程星', async ({ page }) => {
  const game = await openArmy(page);
  await game.getByRole('button', { name: '棋手', exact: true }).click();
  await game.getByRole('button', { name: '开始对弈', exact: true }).click();
  await page.clock.runFor(4500);
  await game.getByRole('button', { name: '认输', exact: true }).click();
  await expect(game.locator('.jq-overlay')).toContainText('结束这盘对弈');
  expect(await armyRecords(page)).toHaveLength(0);
  await game.getByRole('button', { name: '确认认输' }).click();
  await expect(game.locator('.jq-overlay')).toContainText('下一盘加油');
  expect(await armyRecords(page)).toMatchObject([{ gameId: 'sky-junqi', level: 2, stars: 0, correct: 0, total: 1 }]);
  const record = (await armyRecords(page))[0];
  expect(record.durationSec).toBeGreaterThanOrEqual(4);
  expect(record.durationSec).toBeLessThanOrEqual(5);
  await page.clock.runFor(10_000);
  expect(await armyRecords(page)).toHaveLength(1);
  const economy = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('smart-fun-zone')!).state;
    return { points: state.points['junqi-child'], mastery: state.mastery };
  });
  expect(economy).toEqual({ points: 25, mastery: {} });
  await game.getByRole('button', { name: '再来一局' }).click();
  await expect(game.getByRole('status')).toContainText('布阵中');
  await expect(game.getByTestId('junqi-time')).toHaveText('0:00');
  await expect(game.locator('.jq-piece')).toHaveCount(50);
  expect(await armyRecords(page)).toHaveLength(1);
});

test.describe('Pad 触屏', () => {
  test.use({ hasTouch: true });
  for (const viewport of [{ width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    test(`${viewport.width}×${viewport.height} 沙盘无横向溢出，可触摸入营`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const game = await openArmy(page), cells = game.getByRole('gridcell');
      await game.screenshot({ path: testInfo.outputPath('junqi-deployment.png') });
      await game.getByRole('button', { name: '开始对弈', exact: true }).tap();
      await cells.nth(32).tap();
      await cells.nth(36).tap();
      await expect(cells.nth(36)).toContainText('工兵');
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      expect(layout.scroll).toBeLessThanOrEqual(layout.width);
      const cell = await cells.nth(32).boundingBox();
      expect(cell!.width).toBeGreaterThanOrEqual(44);
      expect(cell!.height).toBeGreaterThanOrEqual(44);
      await game.screenshot({ path: testInfo.outputPath('junqi-playing.png') });
    });
  }
});
