import { expect, test } from '@playwright/test';

test.use({
  launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'smart-fun-zone',
      JSON.stringify({
        state: {
          lang: 'zh',
          theme: 'dark',
          sound: false,
          voiceOn: false,
          profiles: [
            {
              id: 'fish-child',
              name: '小鱼探险家',
              avatar: '🐟',
              ageBand: 'g3',
              createdAt: Date.now(),
            },
          ],
          activeChildId: 'fish-child',
          records: [],
          mastery: {},
          lessonProgress: {},
          dailyCheckin: {},
          charBag: {},
          wrongs: {},
          points: {},
          pointLog: {},
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

test('大鱼吃小鱼可进入、游动、冲刺、暂停及继续', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: '敏捷' }).click();
  await expect(page.getByRole('heading', { name: '大鱼吃小鱼' })).toBeVisible();
  await page.getByRole('button', { name: '开始潜游' }).click();
  await expect(page.locator('.ff-board canvas')).toBeVisible();
  await page.getByRole('button', { name: '轻松' }).click();
  await expect(page.getByRole('button', { name: '轻松' })).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: /开始潜游/ })
    .last()
    .click();
  const canvas = page.locator('.ff-board canvas');
  await expect(page.getByText('本局挑战 · 每项 +40 分')).toBeVisible();
  await expect(canvas).toHaveAttribute('data-player-x', /\d/);
  expect(Number(await canvas.getAttribute('data-fish-count'))).toBeLessThanOrEqual(9);
  const before = Number(await canvas.getAttribute('data-player-x'));
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowRight');
  const after = Number(await canvas.getAttribute('data-player-x'));
  expect(after).toBeGreaterThan(before + 20);

  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('Space');
  await expect(page.locator('.ff-meter.energy')).toContainText('%');
  await page.keyboard.press('p');
  await expect(page.getByRole('heading', { name: '已暂停' })).toBeVisible();
  const pausedAt = await canvas.getAttribute('data-player-y');
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute('data-player-y')).toBe(pausedAt);
  await page
    .locator('.ff-overlay')
    .getByRole('button', { name: /继续潜游/ })
    .click();
  await expect(page.getByRole('heading', { name: '已暂停' })).toHaveCount(0);

  await page.getByRole('button', { name: '♪ 音乐关' }).click();
  await expect(page.getByRole('button', { name: '♫ 音乐开' })).toBeVisible();
  await expect(page.getByRole('button', { name: '向左游' })).toBeVisible();
  await expect(page.getByRole('button', { name: '冲刺 ✦' })).toBeVisible();
  await page.getByRole('button', { name: 'Ⅱ 暂停' }).click();
  await expect(page.getByRole('heading', { name: '已暂停' })).toBeVisible();
});

test('pad 尺寸下海域和操作区完整显示，指针可带动小鱼', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: '敏捷' }).click();
  await page.getByRole('button', { name: '开始潜游' }).click();
  await page
    .locator('.ff-overlay')
    .getByRole('button', { name: /开始潜游/ })
    .click();

  const board = page.locator('.ff-board');
  const consoleBox = page.locator('.ff-console');
  const boardRect = await board.boundingBox();
  const consoleRect = await consoleBox.boundingBox();
  expect(boardRect).toBeTruthy();
  expect(consoleRect).toBeTruthy();
  expect(boardRect!.x + boardRect!.width).toBeLessThanOrEqual(820);
  expect(consoleRect!.y).toBeGreaterThan(boardRect!.y + boardRect!.height);
  await expect(page.getByRole('button', { name: '向右游' })).toBeVisible();

  const canvas = board.locator('canvas');
  await expect(canvas).toHaveAttribute('data-player-x', /\d/);
  const before = Number(await canvas.getAttribute('data-player-x'));
  await page.mouse.move(
    boardRect!.x + boardRect!.width * 0.84,
    boardRect!.y + boardRect!.height * 0.53,
  );
  await page.waitForTimeout(350);
  expect(Number(await canvas.getAttribute('data-player-x'))).toBeGreaterThan(before + 20);
});

test('一局中会出现鱼群与金鱼事件', async ({ page }) => {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: '敏捷' }).click();
  await page.getByRole('button', { name: '开始潜游' }).click();
  await page.getByRole('button', { name: '轻松' }).click();
  await page
    .locator('.ff-overlay')
    .getByRole('button', { name: /开始潜游/ })
    .click();

  const canvas = page.locator('.ff-board canvas');
  await expect(page.locator('.ff-next')).toContainText('鱼群');
  await expect(page.locator('.ff-next')).toContainText('金鱼');
  await expect(canvas).toHaveAttribute('data-school-count', '1', { timeout: 8000 });
  expect(Number(await canvas.getAttribute('data-fish-count'))).toBeLessThanOrEqual(22);
  await expect(canvas).toHaveAttribute('data-gold-count', '1', { timeout: 13000 });
});
