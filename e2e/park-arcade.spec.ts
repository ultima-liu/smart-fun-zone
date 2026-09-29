import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const id = 'gomoku-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
        profiles: [{ id, name: '小棋手', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() }],
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

test('空中乐园五子棋可以落子、等待电脑回应并悔棋', async ({ page }) => {
  await page.goto('/#/lobby');

  const categories = page.getByRole('tablist', { name: '游戏分类' });
  await expect(categories.getByRole('tab')).toHaveCount(5);
  await expect(categories.getByRole('tab', { name: /棋类/ })).toHaveAttribute('aria-selected', 'true');
  await categories.getByRole('tab', { name: /牌类/ }).click();
  await expect(page.getByText('牌类游戏正在精心打磨')).toBeVisible();
  await categories.getByRole('tab', { name: /棋类/ }).click();

  await expect(page.getByRole('heading', { name: '星河五子棋' })).toBeVisible();
  const gomokuCard = page.getByRole('article').filter({ hasText: '星河五子棋' });
  await gomokuCard.getByRole('button', { name: '开始对弈' }).click();
  const board = page.getByRole('grid', { name: '十五路五子棋棋盘' });
  await expect(board).toBeVisible();
  await expect(board.getByRole('gridcell')).toHaveCount(225);

  await board.getByRole('gridcell', { name: '第 8 行，第 8 列，空位' }).click();
  await expect(board.locator('.gomoku-cell.black')).toHaveCount(1);
  await expect(page.getByText('泡泡棋士正在思考…')).toBeVisible();
  await expect(board.locator('.gomoku-cell.white')).toHaveCount(1, { timeout: 3_000 });
  await expect(page.getByText('小棋手，轮到你落子')).toBeVisible();

  await page.getByRole('button', { name: '悔一回合' }).click();
  await expect(board.locator('.gomoku-cell.black')).toHaveCount(0);
  await expect(board.locator('.gomoku-cell.white')).toHaveCount(0);

  await page.getByRole('button', { name: '高手' }).click();
  await expect(page.getByRole('button', { name: '高手' })).toHaveAttribute('aria-pressed', 'true');
  await expect(board.locator('.gomoku-cell.black')).toHaveCount(0);
});

test('棋类中的中国象棋支持合法走子、电脑回应和悔棋', async ({ page }) => {
  await page.goto('/#/lobby');

  const xiangqiCard = page.getByRole('article').filter({ hasText: '云台中国象棋' });
  await expect(xiangqiCard).toBeVisible();
  await xiangqiCard.getByRole('button', { name: '开始对弈' }).click();

  const board = page.getByRole('grid', { name: '中国象棋棋盘' });
  await expect(board).toBeVisible();
  await expect(board.getByRole('gridcell')).toHaveCount(90);

  await board.getByRole('gridcell', { name: '红方 兵卒，第 7 行第 1 路' }).click();
  await expect(board.locator('.xiangqi-cell.target')).toHaveCount(1);
  await board.getByRole('gridcell', { name: '第 6 行第 1 路，空位' }).click();
  await expect(page.getByText('泡泡棋手正在运筹…')).toBeVisible();
  await expect(board.locator('.xiangqi-cell.black.last')).toHaveCount(1, { timeout: 4_000 });
  await expect(page.getByText('小棋手，轮到红方行棋')).toBeVisible();

  await page.getByRole('button', { name: '悔一回合' }).click();
  await expect(board.getByRole('gridcell', { name: '红方 兵卒，第 7 行第 1 路' })).toBeVisible();
  await expect(board.getByRole('gridcell', { name: '第 6 行第 1 路，空位' })).toBeVisible();

  const difficulty = page.getByRole('group', { name: '选择象棋难度' });
  await difficulty.getByRole('button', { name: '大师' }).click();
  await expect(difficulty.getByRole('button', { name: '大师' })).toHaveAttribute('aria-pressed', 'true');
});
