import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'sn-child', name: '小追星手', avatar: '🐍', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'sn-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
      wrongs: {}, points: {}, pointLog: {}, customTasks: {}, taskStates: {},
      ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {},
      bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
      expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {},
      showBadges: {}, badges: {},
    },
    version: 6,
  }));
`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(SEED_STATE(false));
});

async function openSnake(page: import('@playwright/test').Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: '敏捷' }).click();
  await page.getByRole('button', { name: '开始追星' }).click();
  await expect(page.locator('#sn-title')).toBeVisible();
  return page.locator('.sn-overlay');
}

const headPos = async (page: import('@playwright/test').Page) => {
  const head = page.locator('.sn-seg.head');
  return {
    x: Number(await head.getAttribute('data-x')),
    y: Number(await head.getAttribute('data-y')),
  };
};

for (const delay of [0, 200]) {
  test(`转向按下立即响应并平滑过渡，直行等待 ${delay}ms，连按逐格执行且禁止掉头`, async ({ page }) => {
    await page.clock.install();
    const overlay = await openSnake(page);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 500)));
    await overlay.getByRole('button', { name: '开始游戏' }).click();
    await page.clock.runFor(delay);
    const before = await headPos(page);
    const head = page.locator('.sn-seg.head');
    await page.keyboard.press('ArrowLeft'); // 当前向右，禁止反向。
    expect(await headPos(page)).toEqual(before);
    await page.keyboard.down('ArrowDown');
    // 不推进游戏时钟，也不松键：逻辑立即响应，短动画随后到达目标格。
    expect(await headPos(page)).toEqual({ x: before.x, y: before.y + 1 });
    await expect(head).toHaveClass(/d-down/);
    await expect.poll(() => head.evaluate((el) => {
      const body = el.getBoundingClientRect(), field = el.parentElement!.getBoundingClientRect();
      return {
        x: Math.round(((body.x + body.width / 2 - field.x) / field.width * 15 - 0.5) * 100) / 100,
        y: Math.round(((body.y + body.height / 2 - field.y) / field.height * 15 - 0.5) * 100) / 100,
      };
    })).toEqual({ x: before.x, y: before.y + 1 });
    await page.keyboard.up('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    expect(await headPos(page)).toEqual({ x: before.x, y: before.y + 1 });
    await page.clock.runFor(16);
    expect(await headPos(page)).toEqual({ x: before.x - 1, y: before.y + 1 });
    await expect(head).toHaveClass(/d-left/);
    await page.clock.runFor(80);
    expect(await headPos(page)).toEqual({ x: before.x - 1, y: before.y + 1 }); // 直行恢复等级速度。
  });
}

test('Pad 方向盘按下和棋盘滑动都在松手前转向', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.clock.install();
  const overlay = await openSnake(page);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 500)));
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  const down = page.getByRole('button', { name: '向下转' });
  await down.scrollIntoViewIfNeeded();
  const button = (await down.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: button.x + button.width / 2, y: button.y + button.height / 2, id: 1 }],
  });
  expect(await headPos(page)).toEqual({ x: 7, y: 8 });
  await page.clock.runFor(16);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const board = page.locator('.sn-board');
  await board.scrollIntoViewIfNeeded();
  const field = (await board.boundingBox())!;
  const x = field.x + field.width / 2, y = field.y + field.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 40, y, id: 2 }] });
  expect(await headPos(page)).toEqual({ x: 6, y: 8 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.keyboard.press('p');
  await page.keyboard.press('ArrowUp');
  await page.clock.runFor(300);
  expect(await headPos(page)).toEqual({ x: 6, y: 8 });
  await page.keyboard.press('p');
  await page.clock.runFor(200);
  await expect(page.locator('.sn-seg.head')).toHaveClass(/d-left/);
});

test('小蛇游戏支持开始、键盘转向与冲刺', async ({ page }) => {
  const overlay = await openSnake(page);

  // 待开始覆盖层：说明 + 开始按钮，棋盘上只有小蛇和星果
  const board = page.locator('.sn-board');
  await expect(page.getByText('准备追星')).toBeVisible();
  await expect(board.locator('.sn-seg')).toHaveCount(3);
  await expect(board.locator('.sn-food')).toHaveCount(1);

  // 开始后小蛇向右滑行，状态卡显示 0 分
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('准备追星')).toHaveCount(0);
  await expect(page.locator('.sn-score-row b')).toHaveText('0');
  const start = await headPos(page);
  expect(start.x).toBeGreaterThanOrEqual(7);

  await page.waitForTimeout(600);
  const moved = await headPos(page);
  expect(moved.x).toBeGreaterThan(start.x); // 默认向右移动

  // 转向：按 ↓ 后蛇头开始向下走
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(700);
  const turned = await headPos(page);
  expect(turned.y).toBeGreaterThan(moved.y);

  // 冲刺：按住空格速度加倍，并在短时间内显著前进（每格 +1 分）
  const scoreOf = async () => Number((await page.locator('.sn-score-row b').textContent()) ?? '0');
  await page.keyboard.down('Space');
  await page.waitForTimeout(320);
  await page.keyboard.up('Space');
  const boosted = await headPos(page);
  expect(boosted.y).toBeGreaterThan(turned.y + 1);
  expect(await scoreOf()).toBeGreaterThan(0);

  // 方向盘按钮可用（触屏操作入口）
  await expect(page.locator('.sn-dpad button')).toHaveCount(4);
});

test('小蛇游戏可暂停继续，后台标签自动暂停', async ({ page }) => {
  const overlay = await openSnake(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  await page.keyboard.press('p');
  await expect(page.getByText('暂停中')).toBeVisible();
  await expect(overlay.getByRole('button', { name: '继续 (P)' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('暂停中')).toHaveCount(0);

  // visibilitychange 模拟切后台
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('暂停中')).toBeVisible();
});

test('撞墙结束对局并写入游玩记录', async ({ page }) => {
  const overlay = await openSnake(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  // 保持向右，撞上云壁后结束（默认「认真」Lv.3，约 190ms/格）
  const over = page.locator('.sn-overlay.over');
  for (let i = 0; i < 40 && (await over.count()) === 0; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
  }
  await expect(over).toBeVisible();
  await expect(over.getByText('本局结束！')).toBeVisible();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-snake');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(2); // 默认「认真」难度
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 再来一局重新开局并可继续操作
  await over.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('.sn-board .sn-seg.head')).toBeVisible();
  await expect(page.locator('.sn-score-row b')).toHaveText('0');
});
