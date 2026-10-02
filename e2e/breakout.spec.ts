import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'bk-child', name: '小弹星手', avatar: '⛵', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'bk-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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

async function openBreakout(page: import('@playwright/test').Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: '敏捷' }).click();
  await page.getByRole('button', { name: '开始弹星' }).click();
  await expect(page.locator('#bk-title')).toBeVisible();
  return page.locator('.bk-overlay');
}

const ballPos = async (page: import('@playwright/test').Page) => {
  const ball = page.locator('.bk-ball');
  return {
    x: await ball.getAttribute('data-x'),
    y: await ball.getAttribute('data-y'),
  };
};

const paddleX = async (page: import('@playwright/test').Page) =>
  (await page.locator('.bk-paddle').getAttribute('data-x')) ?? '';

test('弹星游戏支持开始、发射星弹与键盘驾驶云舟', async ({ page }) => {
  const overlay = await openBreakout(page);

  // 待开始覆盖层：说明 + 开始按钮，棋盘上摆满星砖（第 1 关 4×8），星辉砖保底 2 块
  const board = page.locator('.bk-board');
  await expect(page.getByText('准备弹星')).toBeVisible();
  await expect(board.locator('.bk-brick')).toHaveCount(32);
  const powerBricks = await board.locator('.bk-brick.power').count();
  expect(powerBricks).toBeGreaterThanOrEqual(2);
  await expect(board.locator('.bk-ball')).toHaveCount(1);
  await expect(board.locator('.bk-paddle')).toHaveCount(1);

  // 开始后星弹停在云舟上，默认「认真」3 点云力
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('准备弹星')).toHaveCount(0);
  await expect(page.locator('.bk-lives-row u.on')).toHaveCount(3);
  const stuck = await ballPos(page);
  expect(Number(stuck.x)).toBeGreaterThan(0);

  // 空格发射后星弹开始飞行
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const flying = await ballPos(page);
  expect(flying.y !== stuck.y || flying.x !== stuck.x).toBe(true);

  // 键盘驾驶云舟向左
  const padBefore = await paddleX(page);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowLeft');
  const padAfter = await paddleX(page);
  expect(Number(padAfter)).toBeLessThan(Number(padBefore));

  // 触屏操作入口（左右移动 + 发射）
  await expect(page.locator('.bk-move button')).toHaveCount(2);
  await expect(page.locator('.bk-launch-btn')).toBeVisible();
});

test('弹星游戏可暂停继续，暂停时星弹静止，后台标签自动暂停', async ({ page }) => {
  const overlay = await openBreakout(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);

  await page.keyboard.press('p');
  await expect(page.getByText('暂停中')).toBeVisible();
  const pausedAt = await ballPos(page);
  await page.waitForTimeout(400);
  const stillAt = await ballPos(page);
  expect(`${stillAt.x},${stillAt.y}`).toBe(`${pausedAt.x},${pausedAt.y}`);

  await page.keyboard.press('Escape');
  await expect(page.getByText('暂停中')).toHaveCount(0);

  // visibilitychange 模拟切后台
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('暂停中')).toBeVisible();
});

test('星弹坠海耗尽云力结束对局并写入游玩记录', async ({ page }) => {
  test.setTimeout(150_000);
  const overlay = await openBreakout(page);

  // 选择「高手」难度：2 点云力，最快打空；点完立即移开焦点，避免空格/回车再次触发按钮
  await page.locator('.bk-difficulty button', { hasText: '高手' }).click();
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
  await expect(page.locator('.bk-lives-row u.on')).toHaveCount(2);

  // 持续把云舟往远离星弹的方向开，让星弹尽快坠海；每次回到云舟后重新发射
  const over = page.locator('.bk-overlay.over');
  for (let i = 0; i < 100 && (await over.count()) === 0; i++) {
    await page.keyboard.press('ArrowUp');
    // 星弹坠海与结束的瞬间元素会短暂消失，读不到就进入下一轮检查
    let bx = 45;
    try {
      bx = Number((await page.locator('.bk-ball').first().getAttribute('data-x', { timeout: 800 })) ?? '45');
    } catch {
      continue;
    }
    const px = Number((await paddleX(page)) || '45');
    await page.keyboard.down(bx >= px ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(200);
  }
  await expect(over).toBeVisible();
  await expect(over.getByText('本局结束！')).toBeVisible();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-breakout');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(3); // 「高手」难度
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 再来一局重新开局：星弹回到云舟、分数清零
  await over.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('.bk-board .bk-ball')).toHaveCount(1);
  await expect(page.locator('.bk-score-row b')).toHaveText('0');
});
