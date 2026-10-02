import { expect, test, type Page } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

const SEED_STATE = (sound = false) => `
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: 'dark', sound: ${sound}, voiceOn: false,
      profiles: [{ id: 'mm-child', name: '小翻牌手', avatar: '🎴', ageBand: 'g3', createdAt: Date.now() }],
      activeChildId: 'mm-child', records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
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

async function openMemory(page: Page) {
  await page.goto('/#/lobby');
  await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
  await page.getByRole('tab', { name: '牌类' }).click();
  await page.getByRole('button', { name: '开始翻牌' }).click();
  await expect(page.locator('#mm-title')).toBeVisible();
  return page.locator('.mm-overlay');
}

/** 等两张翻开的牌判定完成：配对成功 → done 定格；失败 → 820ms 后翻回背面。返回是否配对成功 */
async function settlePair(page: Page, cells: ReturnType<Page['locator']>, a: number, b: number): Promise<boolean> {
  for (let t = 0; t < 45; t++) {
    const ca = (await cells.nth(a).getAttribute('class')) ?? '';
    const cb = (await cells.nth(b).getAttribute('class')) ?? '';
    if (ca.includes('done') && cb.includes('done')) return true;
    if (!ca.includes('up') && !cb.includes('up')) return false;
    await page.waitForTimeout(100);
  }
  throw new Error(`配对判定超时：${a} / ${b}`);
}

/** 用「记住翻过牌面」的策略完整通关，不依赖随机种子 */
async function solveBoard(page: Page) {
  const cells = page.locator('.mm-cell');
  const total = await cells.count();
  const known = new Map<string, number>(); // 图案名 → 已见过且未配对的格子下标

  const classAt = async (i: number) => (await cells.nth(i).getAttribute('class')) ?? '';
  const faceAt = async (i: number) => {
    const label = (await cells.nth(i).getAttribute('aria-label')) ?? '';
    return label.split('，')[2] ?? '';
  };

  while ((await page.locator('.mm-cell.done').count()) < total) {
    const seenIdx = new Set(known.values());
    // 优先翻一张还没见过的牌；全见过后再翻已见过的（搭档一定在 known 里）
    let a = -1;
    let aSeen = false;
    for (let i = 0; i < total; i++) {
      if ((await classAt(i)).includes('done')) continue;
      if (!seenIdx.has(i)) { a = i; break; }
      if (a < 0) { a = i; aSeen = true; }
    }
    if (a < 0) break;
    if (aSeen) seenIdx.clear(); // 全部都见过：直接走配对分支

    // 翻开 a；若记过同图案的另一张，直接翻它配对
    await cells.nth(a).click();
    await expect(cells.nth(a)).toHaveClass(/up|done/);
    const faceA = await faceAt(a);
    const partner = known.get(faceA);
    if (partner !== undefined && partner !== a && !(await classAt(partner)).includes('done')) {
      await cells.nth(partner).click();
      const matched = await settlePair(page, cells, a, partner);
      known.delete(faceA);
      if (!matched) throw new Error('记错牌面：同图案未配对成功');
      continue;
    }

    // 没记过搭档：翻下一张未配对的牌就地尝试
    let b = -1;
    for (let j = 0; j < total; j++) {
      if (j === a || (await classAt(j)).includes('done')) continue;
      if (seenIdx.has(j)) continue;
      b = j; break;
    }
    if (b < 0) throw new Error('找不到第二张可翻的牌');
    await cells.nth(b).click();
    const matched = await settlePair(page, cells, a, b);
    if (!matched) {
      known.set(faceA, a);
      known.set(await faceAt(b), b);
    }
  }
  await expect(page.locator('.mm-cell.done')).toHaveCount(total);
}

test('记忆提示亮相一对且每局只用一次', async ({ page }) => {
  const overlay = await openMemory(page);

  // 待开始覆盖层 + 默认「认真」6×4 棋盘
  await expect(page.getByText('准备翻牌')).toBeVisible();
  await expect(page.locator('.mm-cell')).toHaveCount(24);

  await overlay.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByText('准备翻牌')).toHaveCount(0);

  // 提示：金光亮相两张相同的牌，1.5 秒后翻回
  await page.getByRole('button', { name: '记忆提示' }).click();
  await expect(page.locator('.mm-cell.peek')).toHaveCount(2);
  await expect(page.getByText('看好了：这两张是一对！')).toBeVisible();
  await expect(page.getByRole('button', { name: '记忆提示' })).toBeDisabled();
  await page.waitForTimeout(1700);
  await expect(page.locator('.mm-cell.peek')).toHaveCount(0);

  // 翻开第一张牌：进入已翻开状态，计时开始
  await page.locator('.mm-cell').first().click();
  await expect(page.locator('.mm-cell.up').first()).toBeVisible();
  await page.waitForTimeout(1400);
  const timeText = await page.locator('.mm-stats span').first().locator('b').textContent();
  expect(timeText).not.toBe('0:00');
});

test('翻牌配对可完整通关并写入游玩记录', async ({ page }) => {
  test.setTimeout(180_000);
  const overlay = await openMemory(page);
  await overlay.getByRole('button', { name: '开始游戏' }).click();

  await solveBoard(page);
  await expect(page.getByText('全部配对！')).toBeVisible();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    return raw ? (JSON.parse(raw).state.records as Array<{ gameId: string; level: number; correct: number; durationSec: number }>) : [];
  });
  const record = stored.find((r) => r.gameId === 'sky-memory');
  expect(record).toBeTruthy();
  expect(record!.level).toBe(2); // 默认「认真」难度
  expect(record!.correct).toBe(1);
  expect(record!.durationSec).toBeGreaterThanOrEqual(1);

  // 再来一局重置棋盘
  await page.locator('.mm-overlay.over').getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('.mm-cell.done')).toHaveCount(0);
  await expect(page.locator('.mm-cell.up')).toHaveCount(0);
  await expect(page.locator('.mm-cell')).toHaveCount(24);
});
