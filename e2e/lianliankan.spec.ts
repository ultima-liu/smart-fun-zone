import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const id = 'lk-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
        profiles: [{ id, name: '小配对员', avatar: '🐧', ageBand: 'g3', createdAt: Date.now() }],
        activeChildId: id, records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
        wrongs: {}, points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, taskStates: {},
        ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {},
        bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
        expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {},
        showBadges: {}, badges: {},
      },
      version: 6,
    }));
  });
});

test('消除类连连看支持提示配对、消除方块与难度切换', async ({ page }) => {
  await page.goto('/#/lobby');

  const categories = page.getByRole('tablist', { name: '游戏分类' });
  await categories.getByRole('tab', { name: '消除' }).click();

  const card = page.getByRole('article').filter({ hasText: '云径连连看' });
  await expect(page.getByRole('heading', { name: '云径连连看' })).toBeVisible();
  await card.getByRole('button', { name: '开始配对' }).click();

  const board = page.getByRole('grid', { name: '6 行 8 列连连看棋盘' });
  await expect(board).toBeVisible();
  await expect(board.getByRole('gridcell')).toHaveCount(48);

  // 提示高亮一对可连方块，点掉它们即完成一次消除
  await page.getByRole('button', { name: '提示' }).click();
  const hints = board.locator('.lk-tile.hint');
  await expect(hints).toHaveCount(2);
  await hints.nth(0).click();
  await hints.nth(1).click();
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

// 在页面里重建棋盘，用与游戏相同的「直线 / 一弯 / 两弯」规则独立求出一对可连方块，
// 作为整盘可解性的人肉预言机；返回 gridcell 的 DOM 序号。
const FIND_PAIR = `(() => {
  const cells = [...document.querySelectorAll('.lk-board [role=gridcell]')];
  const rows = 6, cols = 8;
  const grid = Array.from({ length: rows + 2 }, () => Array(cols + 2).fill(null));
  const tiles = [];
  cells.forEach((el, index) => {
    if (el.tagName !== 'BUTTON') return;
    const m = (el.getAttribute('aria-label') ?? '').match(/第 (\\d+) 行第 (\\d+) 列，(.+?)(?:，|$)/);
    if (!m) return;
    grid[+m[1]][+m[2]] = m[3];
    tiles.push({ index, r: +m[1], c: +m[2], sym: m[3] });
  });
  const free = (r, c) => r === 0 || c === 0 || r === rows + 1 || c === cols + 1 || grid[r][c] === null;
  const clear = (a, b) => {
    if (a[0] === b[0]) { const [c1, c2] = a[1] < b[1] ? [a[1], b[1]] : [b[1], a[1]]; for (let c = c1 + 1; c < c2; c++) if (!free(a[0], c)) return false; return true; }
    if (a[1] === b[1]) { const [r1, r2] = a[0] < b[0] ? [a[0], b[0]] : [b[0], a[0]]; for (let r = r1 + 1; r < r2; r++) if (!free(r, a[1])) return false; return true; }
    return false;
  };
  const link = (a, b) => clear(a, b)
    || [[a[0], b[1]], [b[0], a[1]]].some((k) => free(k[0], k[1]) && clear(a, k) && clear(k, b))
    || [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => {
      let r = a[0] + dr, c = a[1] + dc;
      while (r >= 0 && c >= 0 && r <= rows + 1 && c <= cols + 1 && free(r, c)) {
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

test('连连看可以完整通关并写入游玩记录', async ({ page }) => {
  await page.goto('/#/lobby');
  await page.getByRole('tablist', { name: '游戏分类' }).getByRole('tab', { name: '消除' }).click();
  await page.getByRole('article').filter({ hasText: '云径连连看' }).getByRole('button', { name: '开始配对' }).click();
  const board = page.getByRole('grid', { name: '6 行 8 列连连看棋盘' });
  await expect(board).toBeVisible();

  const cell = board.locator('[role=gridcell]');
  for (let round = 0; round < 26; round++) {
    const tilesNow = await board.locator('.lk-tile').count();
    if (tilesNow === 0) break;
    const pair = await page.evaluate(FIND_PAIR);
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
