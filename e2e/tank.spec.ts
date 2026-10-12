import { expect, test, type Page } from '@playwright/test';

test.use({
  launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
});
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T04:00:00Z') });
  await page.addInitScript(() => {
    const id = 'tank-child';
    Math.random = () => 0.5;
    localStorage.setItem(
      'smart-fun-zone',
      JSON.stringify({
        state: {
          lang: 'zh',
          theme: 'dark',
          sound: false,
          voiceOn: false,
          profiles: [
            { id, name: '基地守护者', avatar: '🐼', ageBand: 'g3', createdAt: Date.now() },
          ],
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
async function openTank(page: Page) {
  await page.goto('/#/lobby');
  await page.getByRole('tab', { name: /敏捷/ }).click();
  await page
    .getByRole('article')
    .filter({ hasText: '坦克大战' })
    .getByRole('button', { name: '进入坦克大战' })
    .click();
  const game = page.locator('.tank-game');
  await expect(game.getByRole('heading', { name: '坦克大战', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 500));
  return game;
}
async function tankRecords(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('smart-fun-zone')!).state.records.filter(
      (r: { gameId: string }) => r.gameId === 'sky-tank',
    ),
  );
}
test('solo starts with three lives, supports pause, friendly HQ destruction and exactly one result', async ({
  page,
}) => {
  const game = await openTank(page);
  await game.getByRole('button', { name: '开始守护' }).click();
  await expect(game.locator('.tank-stage-banner')).toBeVisible();
  await page.clock.runFor(4400);
  await expect(game.locator('.tank-stage-banner')).not.toBeVisible();
  const field = game.locator('.tank-field');
  const before = await field.getAttribute('data-player-y');
  await page.keyboard.down('ArrowUp');
  await page.clock.runFor(250);
  await page.keyboard.up('ArrowUp');
  expect(Number(await field.getAttribute('data-player-y'))).toBeLessThan(Number(before));
  await page.keyboard.press('p');
  await expect(game.getByRole('heading', { name: '战斗暂停' })).toBeVisible();
  const atPause = await field.getAttribute('data-player-y');
  await page.clock.runFor(1000);
  expect(await field.getAttribute('data-player-y')).toBe(atPause);
  await game.getByRole('button', { name: '继续战斗', exact: true }).last().click();
  await page.keyboard.down('s');
  await page.clock.runFor(350);
  await page.keyboard.up('s');
  // Deliberately shoot the original brick enclosure, then our shared HQ.
  await page.keyboard.down('d');
  await page.keyboard.down('j');
  await page.clock.runFor(1300);
  await page.keyboard.up('d');
  await page.keyboard.up('j');
  await expect(game.getByRole('heading', { name: '基地被摧毁' })).toBeVisible();
  expect(await tankRecords(page)).toHaveLength(1);
  await page.clock.runFor(3000);
  expect(await tankRecords(page)).toHaveLength(1);
  const record = (await tankRecords(page))[0];
  expect(record.stars).toBe(0);
  expect(record.correct).toBe(0);
  expect(record.level).toBe(1);
  await game.getByRole('button', { name: '再战一次' }).click();
  await expect(game.locator('.tank-field')).toHaveAttribute('data-status', 'playing');
  expect(await tankRecords(page)).toHaveLength(1);
  await game.getByRole('button', { name: '返回游戏列表' }).click();
  await expect(game).not.toBeVisible();
  expect(await tankRecords(page)).toHaveLength(1);
});
test('Pad co-op accepts simultaneous held direction/fire pointers and pauses on lost focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const game = await openTank(page);
  await game.getByRole('button', { name: '双人合作' }).click();
  await game.getByRole('button', { name: '开始守护' }).click();
  await page.clock.runFor(4400);
  await expect(game.locator('.tank-player-panel')).toHaveCount(2);
  await expect(game.locator('.tank-controller')).toHaveCount(2);
  const up = game.getByRole('button', { name: '1P 向上' }),
    fire = game.getByRole('button', { name: '1P 开炮 A' });
  const y = Number(await game.locator('.tank-field').getAttribute('data-player-y'));
  await game.locator('.tank-controller').first().scrollIntoViewIfNeeded();
  const a = (await up.boundingBox())!,
    b = (await fire.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: a.x + a.width / 2, y: a.y + a.height / 2, id: 11 },
      { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 12 },
    ],
  });
  await page.clock.runFor(300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  expect(Number(await game.locator('.tank-field').getAttribute('data-player-y'))).toBeLessThan(y);
  await page.keyboard.down('ArrowUp');
  await page.clock.runFor(150);
  await page.keyboard.up('ArrowUp');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(game.getByRole('heading', { name: '战斗暂停' })).toBeVisible();
  expect(await tankRecords(page)).toHaveLength(0);
});
test('construction paints and persists a custom map; all 35 campaign stages remain selectable', async ({
  page,
}) => {
  const game = await openTank(page);
  await expect(game.getByRole('combobox', { name: '选择关卡' }).locator('option')).toHaveCount(36);
  await game.getByRole('button', { name: '设计我的战场 →' }).click();
  const editor = game.getByRole('grid', { name: '自定义战场' });
  await expect(editor.getByRole('gridcell')).toHaveCount(169);
  await game.locator('.tank-brushes').getByRole('button', { name: '水域' }).click();
  await editor.getByRole('gridcell').nth(30).click();
  await game.getByRole('button', { name: '保存并使用战场' }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('sky-tank-construction-v1')!)[30]),
  ).toBe(3);
  await game.getByRole('button', { name: '开始守护' }).click();
  await page.clock.runFor(4400);
  await expect(game.locator('.tank-mission-label')).toContainText('CONSTRUCTION');
  await expect(game.locator('.tank-field')).toHaveAttribute('data-status', 'playing');
  await page.clock.resume();
  await page.reload();
  await page.getByRole('tab', { name: /敏捷/ }).click();
  await page.getByRole('button', { name: '进入坦克大战' }).click();
  await page.locator('.tank-game').getByRole('button', { name: '设计我的战场 →' }).click();
  await expect(page.getByRole('gridcell').nth(30)).toHaveAttribute('aria-label', '地块 31: 水域');
});
test('original recordings all decode; movement is distinct from hits, explosions and power-ups', async ({
  page,
}) => {
  await openTank(page);
  const results = await page.evaluate(async () => {
    const context = new AudioContext();
    const source = await fetch('/assets/games/tank/audio/sources.json').then((r) => r.json());
    const data = await Promise.all(
      Object.entries(source.tracks as Record<string, { file: string }>).map(
        async ([name, track]) => {
          const response = await fetch(`/assets/games/tank/audio/${track.file}`);
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          const samples = buffer.getChannelData(0);
          let energy = 0;
          for (const v of samples) energy += v * v;
          return { name, duration: buffer.duration, rms: Math.sqrt(energy / samples.length) };
        },
      ),
    );
    await context.close();
    return data;
  });
  expect(results).toHaveLength(18);
  for (const result of results) {
    expect(result.duration).toBeGreaterThan(0.01);
    expect(result.rms).toBeGreaterThan(0.002);
  }
  expect(results.find((r) => r.name === 'idle')?.rms).not.toBe(
    results.find((r) => r.name === 'move')?.rms,
  );
});
