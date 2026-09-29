import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'lk-child', name: '小配对员', avatar: '🐧', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'lk-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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

// 在页面里重建棋盘，用与游戏相同的「直线 / 一弯 / 两弯」规则独立求出一对可连方块，
// 作为整盘可解性的人肉预言机；云岩视为阻挡。返回 gridcell 的 DOM 序号。
const makeFindPair = (rows: number, cols: number) => `(() => {
  const cells = [...document.querySelectorAll('.lk-board [role=gridcell]')];
  const grid = Array.from({ length: ${rows + 2} }, () => Array(${cols + 2}).fill(null));
  const tiles = [];
  cells.forEach((el, index) => {
    if ((el.className + '').includes('lk-wall')) {
      const w = (el.getAttribute('aria-label') ?? '').match(/第 (\\d+) 行第 (\\d+) 列/);
      if (w) grid[+w[1]][+w[2]] = '__wall';
      return;
    }
    if (el.tagName !== 'BUTTON') return;
    const m = (el.getAttribute('aria-label') ?? '').match(/第 (\\d+) 行第 (\\d+) 列，(.+?)(?:，|$)/);
    if (!m) return;
    grid[+m[1]][+m[2]] = m[3];
    tiles.push({ index, r: +m[1], c: +m[2], sym: m[3] });
  });
  const free = (r, c) => r === 0 || c === 0 || r === ${rows + 1} || c === ${cols + 1} || grid[r][c] === null;
  const clear = (a, b) => {
    if (a[0] === b[0]) { const [c1, c2] = a[1] < b[1] ? [a[1], b[1]] : [b[1], a[1]]; for (let c = c1 + 1; c < c2; c++) if (!free(a[0], c)) return false; return true; }
    if (a[1] === b[1]) { const [r1, r2] = a[0] < b[0] ? [a[0], b[0]] : [b[0], a[0]]; for (let r = r1 + 1; r < r2; r++) if (!free(r, a[1])) return false; return true; }
    return false;
  };
  const link = (a, b) => clear(a, b)
    || [[a[0], b[1]], [b[0], a[1]]].some((k) => free(k[0], k[1]) && clear(a, k) && clear(k, b))
    || [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => {
      let r = a[0] + dr, c = a[1] + dc;
      while (r >= 0 && c >= 0 && r <= ${rows + 1} && c <= ${cols + 1} && free(r, c)) {
        const mid = [r, c];
        if (mid[0] === b[0] || mid[1] === b[1]) { if (clear(mid, b)) return true; }
        else if ([[mid[0], b[1]], [b[0], mid[1]]].some((k) => free(k[0], k[1]) && clear(mid, k) && clear(k, b))) return true;
        r += dr; c += dc;
      }
      return false;
    });
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
    if (tiles[i].sym === tiles[j].sym && link([tiles[i].r, tiles[i].c], [tiles[j].r, tiles[j].c])) return [tiles[i].index, tiles[j].index];
  }
  return null;
})()`;

const openLianliankan = async (page: import('@playwright/test').Page) => {
  await page.goto('/#/lobby');
  await page.getByRole('tablist', { name: '游戏分类' }).getByRole('tab', { name: '消除' }).click();
  await page.getByRole('article').filter({ hasText: '云径连连看' }).getByRole('button', { name: '开始配对' }).click();
};

test('消除类连连看支持提示配对、消除方块与难度切换', async ({ page }) => {
  await openLianliankan(page);

  const categories = page.getByRole('tablist', { name: '游戏分类' });
  const board = page.getByRole('grid', { name: '6 行 8 列连连看棋盘' });
  await expect(board).toBeVisible();
  await expect(board.getByRole('gridcell')).toHaveCount(48);

  // 提示高亮一对可连方块，点掉它们即完成一次消除（先记下标签，避免高亮 4.2s 自动消失的竞态）
  await page.getByRole('button', { name: '提示' }).click();
  const hints = board.locator('.lk-tile.hint');
  await expect(hints).toHaveCount(2);
  const hintLabels = await hints.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label') ?? ''));
  await board.locator(`[aria-label="${hintLabels[0]}"]`).click();
  await board.locator(`[aria-label="${hintLabels[1]}"]`).click();
  await expect(board.locator('.lk-tile')).toHaveCount(46);
  await expect(page.getByText('剩余 23 对')).toBeVisible();
  await expect(board.locator('.lk-tile.hint')).toHaveCount(0);

  // 图案不同的两块不会被消除，选区移动到第二块
  const labels = await board.locator('.lk-tile').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label') ?? ''),
  );
  const symbolOf = (label: string) => label.split('，')[1] ?? '';
  let first = -1;
  let second = -1;
  for (let i = 0; i < labels.length && second < 0; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (symbolOf(labels[i]) && symbolOf(labels[i]) !== symbolOf(labels[j])) {
        first = i;
        second = j;
        break;
      }
    }
  }
  const tiles = board.locator('.lk-tile');
  await tiles.nth(first).click();
  await tiles.nth(second).click();
  await expect(tiles).toHaveCount(46);
  await expect(tiles.nth(second)).toHaveClass(/selected/);

  // 手动重排不改变剩余方块数量
  await page.getByRole('button', { name: '重排' }).click();
  await expect(board.locator('.lk-tile')).toHaveCount(46);

  // 切换到轻松棋盘开启新一局
  const sizes = page.getByRole('group', { name: '选择棋盘' });
  await sizes.getByRole('button', { name: '轻松' }).click();
  await expect(sizes.getByRole('button', { name: '轻松' })).toHaveAttribute('aria-pressed', 'true');
  const easyBoard = page.getByRole('grid', { name: '5 行 6 列连连看棋盘' });
  await expect(easyBoard).toBeVisible();
  await expect(easyBoard.getByRole('gridcell')).toHaveCount(30);

  // 切换分类会收起当前游戏
  await categories.getByRole('tab', { name: '益智' }).click();
  await expect(page.getByText('益智游戏正在精心打磨')).toBeVisible();
  await expect(page.getByRole('grid', { name: '5 行 6 列连连看棋盘' })).toHaveCount(0);
});

test('连连看可以完整通关并写入游玩记录', async ({ page }) => {
  await openLianliankan(page);
  const board = page.getByRole('grid', { name: '6 行 8 列连连看棋盘' });
  await expect(board).toBeVisible();

  const cell = board.locator('[role=gridcell]');
  const findPair = makeFindPair(6, 8);
  for (let round = 0; round < 26; round++) {
    const tilesNow = await board.locator('.lk-tile').count();
    if (tilesNow === 0) break;
    const pair = await page.evaluate(findPair);
    expect(pair, `第 ${round} 轮应存在可连对（剩余 ${tilesNow} 块），棋局不应死局`).not.toBeNull();
    await cell.nth(pair[0]).click();
    await cell.nth(pair[1]).click();
    await expect(board.locator('.lk-tile')).toHaveCount(tilesNow - 2, { timeout: 4000 });
  }
  await expect(board.locator('.lk-tile')).toHaveCount(0);

  await expect(board.locator('.lk-result-ribbon')).toBeVisible();
  await expect(page.getByText('云径全部点亮，通关！')).toBeVisible();
  await expect(page.getByText('剩余 0 对')).toBeVisible();

  const record = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}');
    return (raw.state?.records ?? []).find((r) => r.gameId === 'sky-lianliankan') ?? null;
  });
  expect(record).not.toBeNull();
  expect(record.level).toBe(2);
  expect(record.stars).toBe(0);
  expect(record.correct).toBe(1);
  expect(record.durationSec).toBeGreaterThan(0);
});

test('闯关模式从第 1 关递增并按通关解锁', async ({ page }) => {
  await openLianliankan(page);

  // 切到闯关模式：默认从第 1 关开始（教学关 4×4、无云岩、无限时）
  const modes = page.getByRole('group', { name: '选择模式' });
  await modes.getByRole('button', { name: '闯关挑战' }).click();
  const board = page.getByRole('grid', { name: '4 行 4 列连连看棋盘' });
  await expect(board).toBeVisible();
  await expect(board.locator('.lk-tile')).toHaveCount(16);
  await expect(board.locator('.lk-wall')).toHaveCount(0);
  await expect(page.locator('.lk-timebar')).toHaveCount(0);
  await expect(page.getByText('闯关 · 第 1 关')).toBeVisible();

  // 清空第 1 关：星级缎带 + 记录 + 解锁第 2 关
  const cell = board.locator('[role=gridcell]');
  const findPair = makeFindPair(4, 4);
  for (let round = 0; round < 10; round++) {
    const tilesNow = await board.locator('.lk-tile').count();
    if (tilesNow === 0) break;
    const pair = await page.evaluate(findPair);
    expect(pair, `第 ${round} 轮应存在可连对`).not.toBeNull();
    await cell.nth(pair[0]).click();
    await cell.nth(pair[1]).click();
    await expect(board.locator('.lk-tile')).toHaveCount(tilesNow - 2, { timeout: 4000 });
  }
  await expect(board.locator('.lk-result-ribbon')).toBeVisible();
  await expect(board.locator('.lk-ribbon-stars i')).toHaveCount(3);
  await expect(page.getByText('第 1 关通过！')).toBeVisible();

  const record = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}');
    return (raw.state?.records ?? []).find((r) => r.gameId === 'sky-lianliankan-levels' && r.level === 1) ?? null;
  });
  expect(record).not.toBeNull();
  expect(record.correct).toBe(1);
  expect(record.stars).toBeGreaterThanOrEqual(2);

  // 通关后约 3 秒自动进入第 2 关（4×5），未通关的第 3 关保持锁定
  const board2 = page.getByRole('grid', { name: '4 行 5 列连连看棋盘' });
  await expect(board2).toBeVisible({ timeout: 6000 });
  await expect(board2.locator('.lk-tile')).toHaveCount(20);
  await expect(page.getByText('闯关 · 第 2 关')).toBeVisible();
  const levelGroup = page.getByRole('group', { name: '选择关卡' });
  await expect(levelGroup.getByRole('button', { name: '第 2 关' })).toHaveAttribute('aria-pressed', 'true');
  await expect(levelGroup.getByRole('button', { name: '第 3 关' })).toBeDisabled();
});

test('闯关第 20 关可完整通关（大棋盘+云岩+远置摆牌）', async ({ page }) => {
  await page.addInitScript(`
    ${SEED_STATE(false).replace('records: []', "records: [{ id: 'seed-l19', childId: 'lk-child', gameId: 'sky-lianliankan-levels', level: 19, stars: 3, correct: 1, total: 1, durationSec: 150, playedAt: 1 }]")}
  `);
  await openLianliankan(page);

  await page.getByRole('group', { name: '选择模式' }).getByRole('button', { name: '闯关挑战' }).click();
  const board = page.getByRole('grid', { name: '10 行 12 列连连看棋盘' });
  await expect(board).toBeVisible();
  await expect(board.locator('.lk-wall')).toHaveCount(18);
  await expect(board.locator('.lk-tile')).toHaveCount(102);

  const cell = board.locator('[role=gridcell]');
  const findPair = makeFindPair(10, 12);
  for (let round = 0; round < 55; round++) {
    const tilesNow = await board.locator('.lk-tile').count();
    if (tilesNow === 0) break;
    const pair = await page.evaluate(findPair);
    expect(pair, `第 ${round} 轮应存在可连对（剩余 ${tilesNow} 块），残局不应死局`).not.toBeNull();
    await cell.nth(pair[0]).click();
    await cell.nth(pair[1]).click();
    await expect(board.locator('.lk-tile')).toHaveCount(tilesNow - 2, { timeout: 4000 });
  }
  await expect(board.locator('.lk-result-ribbon')).toBeVisible();
  await expect(page.getByText('全部 20 关点亮！')).toBeVisible();

  // 末关通关后停留庆祝，不自动跳转
  await page.waitForTimeout(3800);
  await expect(board.locator('.lk-result-ribbon')).toBeVisible();
  await expect(page.getByText('全部 20 关点亮！')).toBeVisible();

  const record = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}');
    return (raw.state?.records ?? []).find((r) => r.gameId === 'sky-lianliankan-levels' && r.level === 20) ?? null;
  });
  expect(record).not.toBeNull();
  expect(record.correct).toBe(1);
  expect(record.stars).toBeGreaterThanOrEqual(1);
});

test('闯关高关卡棋盘更大、云岩更多且时间紧凑', async ({ page }) => {
  await page.addInitScript(`
    ${SEED_STATE(false).replace('records: []', "records: [{ id: 'seed-l8', childId: 'lk-child', gameId: 'sky-lianliankan-levels', level: 8, stars: 2, correct: 1, total: 1, durationSec: 120, playedAt: Date.now() - 60000 }]")}
  `);
  await openLianliankan(page);

  // 已通关 8 关：切到闯关模式直接从第 9 关继续（7×10 大棋盘、6 个云岩、紧凑倒计时）
  await page.getByRole('group', { name: '选择模式' }).getByRole('button', { name: '闯关挑战' }).click();
  const board = page.getByRole('grid', { name: '7 行 10 列连连看棋盘' });
  await expect(board).toBeVisible();
  await expect(page.getByText('闯关 · 第 9 关')).toBeVisible();
  await expect(board.locator('.lk-wall')).toHaveCount(6);
  await expect(board.locator('.lk-tile')).toHaveCount(64);
  await expect(page.getByRole('timer', { name: '剩余时间' })).toBeVisible();

  // 云岩不可点（渲染为非按钮格），且关卡 10 仍锁定
  const levelGroup = page.getByRole('group', { name: '选择关卡' });
  await expect(levelGroup.getByRole('button', { name: '第 9 关' })).toHaveAttribute('aria-pressed', 'true');
  await expect(levelGroup.getByRole('button', { name: '第 10 关' })).toBeDisabled();
});
