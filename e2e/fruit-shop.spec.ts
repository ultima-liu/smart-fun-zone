import { expect, test, type Page } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test.use({ launchOptions: { executablePath: CHROME } });

test.beforeEach(async ({ page }) => {
  const childId = 'fruit-shop-child';
  await page.addInitScript((id) => {
    const completedAddition = location.hash.includes('/math-course/add-within-5') || location.hash.includes('/review');
    const completedLessons = ['campus', 'playground', 'classroom-discover', 'numbers', 'compare', 'ordinal'];
    if (completedAddition) completedLessons.push('compose', 'add-within-5');
    if (location.hash.includes('/math-course/solid-shapes')) completedLessons.push('solid-shapes');
    const seededMastery = Object.fromEntries(completedLessons.map((lessonId) => [`math-lab-${lessonId}`, { stars: 3, gold: true, updatedAt: Date.now() }]));
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: true, voiceOn: false,
        profiles: [{ id, name: '水果店长', avatar: '🐰', ageBand: 'g1', createdAt: Date.now() }], activeChildId: id,
        records: [], mastery: { [id]: seededMastery }, lessonProgress: {}, dailyCheckin: {}, charBag: {}, storyDone: { [id]: ['p1'] }, storyRewardClaimed: {}, storyUpdatedAt: {}, storyPulse: null,
        wrongs: {}, points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
      }, version: 4,
    }));
    localStorage.removeItem(`sfz-fruit-shop-v1:${id}`);
    if (location.hash.includes('/review')) {
      localStorage.setItem(`sfz-review-plan-v1:${id}`, JSON.stringify([{
        id: 'math:add-within-5', subject: 'math', lessonId: 'add-within-5', title: '1～5 的加法',
        focus: '把两部分合起来', route: '/math-course/add-within-5', learnedAt: Date.now(), completedDays: [],
      }]));
    } else localStorage.removeItem(`sfz-review-plan-v1:${id}`);
  }, childId);
});

async function completeCurrentRound(page: Page, independently = false) {
  const calculation = page.locator('.fs-number-options');
  const comparison = page.locator('.fs-compare');
  if (await calculation.isVisible()) {
    if (independently) {
      const tenFrame = page.locator('.fs-ten-frame');
      let answer: number;
      if (await tenFrame.isVisible()) {
        answer = 10 - await tenFrame.locator('i.filled').count();
      } else {
        const groups = page.locator('.fs-calc-story span');
        const first = await groups.nth(0).locator('i').count();
        const second = await groups.nth(1).locator('i').count();
        answer = (await page.locator('.fs-calc-story > b').textContent()) === '−' ? first - second : first + second;
      }
      await calculation.getByRole('button', { name: `答案 ${answer}`, exact: true }).click();
      await expect(page.locator('.fs-next')).toBeVisible();
      return;
    }
    const options = calculation.getByRole('button');
    for (let index = 0; index < await options.count(); index += 1) {
      await options.nth(index).click();
      if (await page.locator('.fs-next').isVisible()) return;
    }
  } else if (await comparison.isVisible()) {
    const options = comparison.getByRole('button');
    for (let index = 0; index < await options.count(); index += 1) {
      await options.nth(index).click();
      if (await page.locator('.fs-next').isVisible()) return;
    }
  } else {
    const orders = page.locator('.fs-order');
    for (let index = 0; index < await orders.count(); index += 1) {
      const order = orders.nth(index);
      const label = await order.getAttribute('aria-label') ?? '';
      const match = label.match(/目标 (\d+) 个，现在 (\d+) 个/);
      if (!match) throw new Error(`无法读取订单数量：${label}`);
      await order.click();
      for (let count = Number(match[2]); count < Number(match[1]); count += 1) await page.getByRole('button', { name: /拿一个/ }).first().click();
    }
    await page.getByRole('button', { name: '请兔兔店长检查' }).click();
  }
  await expect(page.locator('.fs-next')).toBeVisible();
}

test('从适合的数学课进入专属水果店，完成三张订单并保存奖励', async ({ page }) => {
  await page.goto('/#/math-course/add-within-5');
  await page.getByRole('button', { name: '去水果店试一试 →' }).click();
  await expect(page.getByRole('heading', { name: '小卷水果店' })).toBeVisible();
  await expect(page.getByText('《1～5 的加法》的小卷水果店')).toBeVisible();

  for (let round = 0; round < 3; round++) {
    await expect(page.getByRole('region', { name: '把两部分合起来订单' })).toBeVisible();
    await completeCurrentRound(page, true);
    await page.getByRole('button', { name: round === 2 ? '一起去野餐 →' : '接待下一位 →' }).click();
  }

  await expect(page.getByRole('heading', { name: '客人们都吃上水果啦！' })).toBeVisible();
  await expect(page.getByText('新贴纸已经放进收藏册')).toBeVisible();
  const stored = await page.evaluate(() => ({
    app: JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state,
    progress: JSON.parse(localStorage.getItem('sfz-fruit-shop-v1:fruit-shop-child') ?? '{}'),
  }));
  expect(stored.app.points['fruit-shop-child']).toBe(3);
  expect(stored.app.records).toHaveLength(1);
  expect(stored.app.records[0]).toMatchObject({ gameId: 'fruit-shop', stars: 3, correct: 3, total: 3 });
  expect(stored.progress.sessions[0]).toMatchObject({ hints: 0, independentRounds: 3 });
  expect(stored.progress.stickers).toHaveLength(1);
});

test('完成数学课后进入匹配的水果店订单，并能返回原课程', async ({ page }) => {
  await page.goto('/#/math-course/add-within-5');

  await expect(page.getByRole('region', { name: '本课生活小剧场' })).toContainText('把两部分合起来');
  await page.getByRole('button', { name: '去水果店试一试 →' }).click();
  await expect(page.getByText('《1～5 的加法》的小卷水果店')).toBeVisible();
  await expect(page.getByRole('region', { name: '把两部分合起来订单' })).toBeVisible();
  const firstOrder = await page.locator('.fs-coach p').textContent();

  await page.getByRole('button', { name: '返回' }).click();
  await expect(page).toHaveURL(/#\/math-course\/add-within-5$/);
  await page.getByRole('button', { name: '去水果店试一试 →' }).click();
  await expect(page.locator('.fs-coach p')).toHaveText(firstOrder ?? '');
});

test('今日复习把到期数学课匹配成水果店首单', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/review');
  const practice = page.getByRole('region', { name: '今日情境实践' });
  await expect(practice).toContainText('《1～5 的加法》');
  await expect(practice).toContainText('把两部分合起来');
  await practice.getByRole('button', { name: '开始实践 →' }).click();
  await expect(page.getByText('当天回顾')).toBeVisible();
  await expect(page.getByRole('region', { name: '把两部分合起来订单' })).toBeVisible();
});

test('连续两单需要帮助后，第三单先进入小老师模式', async ({ page }) => {
  await page.goto('/#/math-practice/fruit-shop?unit=一');
  for (let round = 0; round < 2; round += 1) {
    await page.getByRole('button', { name: '💡 给我一点提示' }).click();
    await completeCurrentRound(page);
    await page.locator('.fs-next').click();
  }
  const teacher = page.getByRole('region', { name: '小老师模式' });
  await expect(teacher).toContainText('请你当小老师');
  await teacher.getByRole('button').first().click();
  await expect(teacher).toContainText('兔兔店长学会第一步啦');
});

test('立体图形课程使用形状修理铺，不再套用水果店', async ({ page }) => {
  await page.goto('/#/math-course/solid-shapes');
  await expect(page.getByRole('heading', { name: '认识立体图形', level: 1 })).toBeVisible();
  const practice = page.getByRole('region', { name: '本课生活小剧场' });
  await expect(practice).toContainText('小卷形状修理铺');
  await practice.getByRole('button', { name: '去修理铺试一试 →' }).click();
  await expect(page.getByRole('heading', { name: '小卷形状修理铺' })).toBeVisible();
  for (let task = 0; task < 3; task += 1) {
    await page.getByRole('region', { name: '小卷形状修理铺任务' }).locator('div').getByRole('button').first().click();
    await page.getByRole('button', { name: task === 2 ? '完成小剧场 →' : '继续下一步 →' }).click();
  }
  await expect(page.getByRole('heading', { name: '修理任务完成啦！' })).toBeVisible();
});

test('未完成立体图形课程也能看到修理铺预告，目录课卡标明开放条件', async ({ page }) => {
  await page.goto('/#/math-course/solid-building');
  const preview = page.getByRole('region', { name: '本课生活小剧场' });
  await expect(preview).toContainText('《立体图形的拼搭》· 小卷形状修理铺');
  await expect(preview).toContainText('完成课程后开放');
  await expect(preview.getByRole('button', { name: '完成本课后开放' })).toBeDisabled();

  await page.goto('/#/subject/math');
  await page.getByRole('button', { name: /认识立体图形，已完成 0\/3 课/ }).click();
  await expect(page.locator('.ct-lesson-grid .mc-life-scene-tag')).toHaveCount(3);
  await expect(page.locator('.ct-lesson-grid')).toContainText('生活小剧场 · 小卷形状修理铺');
});

test('校园观察课程使用动物野餐，不再套用水果店', async ({ page }) => {
  await page.goto('/#/math-course/campus');
  const practice = page.getByRole('region', { name: '本课生活小剧场' });
  await expect(practice).toContainText('小卷动物野餐');
  await practice.getByRole('button', { name: '去准备野餐 →' }).click();
  await expect(page.getByRole('heading', { name: '小卷动物野餐' })).toBeVisible();

  const task = page.getByRole('region', { name: '小卷动物野餐任务' });
  await expect(page.getByRole('img', { name: '野餐垫旁边整齐放着四个杯子' })).toBeVisible();
  await expect(page.locator('.mls-artboard span')).toHaveCount(4);
  await task.getByRole('button', { name: '4' }).click();
  await page.getByRole('button', { name: '继续下一步 →' }).click();
  await expect(page.getByRole('img', { name: '一张带格纹、布边和流苏的长方形野餐垫' })).toBeVisible();
  await expect(page.locator('.mls-mat')).toBeVisible();
  await task.getByRole('button', { name: '长方形' }).click();
  await page.getByRole('button', { name: '继续下一步 →' }).click();
  await expect(page.getByRole('img', { name: '果篮位于格纹野餐垫的右边' })).toBeVisible();
  await expect(page.locator('.mls-mat-position .mls-basket')).toBeVisible();
  await task.getByRole('button', { name: '右边' }).click();
  await page.getByRole('button', { name: '完成小剧场 →' }).click();
  await expect(page.getByRole('heading', { name: '野餐准备好啦！' })).toBeVisible();
});
