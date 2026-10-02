import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test.beforeEach(async ({ page }) => {
  const now = new Date();
  const weekday = Math.min(5, Math.max(1, now.getDay()));
  await page.route('**/api/config/store', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, storeOverrides: {}, taskOverrides: {}, courseSchedule: [{ id: `g1:weekday:${weekday}`, grade: 'g1', weekday, subjects: ['math'] }] }),
  }));
  await page.addInitScript(() => {
    if (localStorage.getItem('smart-fun-zone')) return;
    const id = 'mission-child';
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekday = Math.min(5, Math.max(1, now.getDay()));
    const mailId = `${day}:math:playground`;
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
        profiles: [{ id, name: '任务体验生', avatar: '🐰', ageBand: 'g1', createdAt: Date.now() }], activeChildId: id,
        records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {}, wrongs: {},
        points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, taskStates: { [id]: { version: 1, updatedAt: Date.now(), initializedAt: Date.now(), completed: {}, lessonCompletedAt: { 'math:playground': Date.now() }, courseMails: { [mailId]: { date: day, subject: 'math', lessonId: 'playground', reward: 8, startedAt: Date.now() - 1000, completedAt: Date.now(), result: '2 星' } }, dismissedOn: {}, visitorShown: [] } }, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {},
        storeOverrides: {}, taskOverrides: {}, courseSchedule: [{ id: `g1:weekday:${weekday}`, grade: 'g1', weekday, subjects: ['math'] }], bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
        expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
      },
      version: 8,
    }));
  });
});

test('课程表邮件完成后等待领奖，领取后进入已完成', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.juan-star')).toBeVisible();
  await expect(page.locator('.star-mailbox')).toContainText('1 封当前来信');
  await page.locator('.star-mailbox').click();
  const dialog = page.getByRole('dialog', { name: '当前来信' });
  await expect(dialog).toContainText('数学 · 在操场上玩一玩');
  await expect(dialog).toContainText('已完成 · 待领奖');
  await expect(dialog).toContainText('完成奖励 🪙 8');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state.points['mission-child'])).toBe(0);
  await page.getByRole('button', { name: '领取 🪙 8' }).click();
  await expect(page.getByRole('dialog', { name: '已完成' })).toContainText('数学 · 在操场上玩一玩');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state);
  expect(saved.points['mission-child']).toBe(8);
  expect(saved.pointLog['mission-child'].filter((entry: { id: string }) => entry.id.startsWith('course-mail-reward:'))).toHaveLength(1);
});

test('收件站左侧展示全部任务并在右侧切换详情', async ({ page }) => {
  await page.goto('/#/');
  await page.evaluate(() => {
    const raw = localStorage.getItem('smart-fun-zone');
    if (!raw) return;
    const saved = JSON.parse(raw);
    const id = 'mission-child';
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    saved.state.taskStates[id].courseMails[`${day}:chinese:heaven-earth-human`] = {
      date: day, subject: 'chinese', lessonId: 'heaven-earth-human', reward: 8,
    };
    localStorage.setItem('smart-fun-zone', JSON.stringify(saved));
  });
  await page.reload();
  await page.locator('.star-mailbox').click();
  const list = page.locator('.inbox-entry-list');
  const detail = page.locator('.inbox-entry-detail');
  await expect(list.locator(':scope > button')).toHaveCount(2);
  await expect(list).toContainText('数学 · 在操场上玩一玩');
  await expect(list).toContainText('语文 · 天地人');

  await list.locator(':scope > button').filter({ hasText: '语文 · 天地人' }).click();
  await expect(detail.getByRole('heading', { name: '语文 · 天地人' })).toBeVisible();
  await expect(detail.getByRole('button', { name: '开始上课' })).toBeVisible();
  await list.locator(':scope > button').filter({ hasText: '数学 · 在操场上玩一玩' }).click();
  await expect(detail.getByRole('heading', { name: '数学 · 在操场上玩一玩' })).toBeVisible();
  await expect(detail.getByRole('button', { name: '领取 🪙 8' })).toBeVisible();
});

test('Pad 上课程邮件分类不产生横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/#/');
  await page.locator('.star-mailbox').click();
  await expect(page.getByRole('dialog', { name: '当前来信' })).toContainText('数学 · 在操场上玩一玩');
  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth - window.innerWidth,
    dialog: document.querySelector('.star-letter')!.scrollWidth - document.querySelector('.star-letter')!.clientWidth,
  }));
  expect(overflow.page).toBeLessThanOrEqual(1);
  expect(overflow.dialog).toBeLessThanOrEqual(1);
  const [listBox, detailBox] = await Promise.all([
    page.locator('.inbox-entry-list').boundingBox(),
    page.locator('.inbox-entry-detail').boundingBox(),
  ]);
  expect(listBox).not.toBeNull();
  expect(detailBox).not.toBeNull();
  expect(listBox!.x + listBox!.width).toBeLessThan(detailBox!.x);
});

test('管理员可在 Pad 上独立选择每天的新课和复习学科', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.route('**/api/admin/config/store', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.addInitScript(() => localStorage.setItem('sfz_role', 'admin'));
  await page.goto('/#/admin');
  await page.getByRole('button', { name: '📅 课程表' }).click();
  await expect(page.getByText('每周课程表')).toBeVisible();
  await expect(page.locator('.adm-week-day')).toHaveCount(7);
  const wednesday = page.locator('.adm-week-day').filter({ hasText: '周三' });
  const newCourses = wednesday.locator('.adm-week-choice').filter({ hasText: '新课' });
  const reviewCourses = wednesday.locator('.adm-week-choice').filter({ hasText: '复习' });
  const math = reviewCourses.getByRole('button', { name: /数学/ });
  const chinese = reviewCourses.getByRole('button', { name: /语文/ });
  const english = newCourses.getByRole('button', { name: /英语/ });
  if (await math.getAttribute('aria-pressed') === 'false') await math.click();
  if (await chinese.getAttribute('aria-pressed') === 'false') await chinese.click();
  if (await english.getAttribute('aria-pressed') === 'false') await english.click();
  await expect(math).toHaveAttribute('aria-pressed', 'true');
  await expect(chinese).toHaveAttribute('aria-pressed', 'true');
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '保存并发布课程表' }).click();
  await expect(page.locator('.adm-toast')).toContainText('周课程表已发布');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('管理员在 Web 上修改三课复习模板后发布七天课程表', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  let published: { courseSchedule?: Array<{ grade: string; weekday: number; subjects: string[]; reviews: string[] }> } | undefined;
  await page.route('**/api/admin/config/store', async (route) => {
    published = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.addInitScript(() => localStorage.setItem('sfz_role', 'admin'));
  await page.goto('/#/admin');
  await page.getByRole('button', { name: '📅 课程表' }).click();
  await page.getByRole('button', { name: '填入三课复习模板' }).click();
  for (const [day, subject] of [['周一', '语文'], ['周三', '数学'], ['周五', '英语']]) {
    await expect(page.locator('.adm-week-day').filter({ hasText: day }).locator('.adm-week-choice').filter({ hasText: '新课' }).getByRole('button', { name: new RegExp(subject) })).toHaveAttribute('aria-pressed', 'true');
  }
  for (const [day, subjects] of [['周二', ['语文', '英语']], ['周四', ['语文', '数学']], ['周六', ['数学', '英语']]] as const) {
    const review = page.locator('.adm-week-day').filter({ hasText: day }).locator('.adm-week-choice').filter({ hasText: '复习' });
    for (const subject of subjects) await expect(review.getByRole('button', { name: new RegExp(subject) })).toHaveAttribute('aria-pressed', 'true');
  }
  const sundayReview = page.locator('.adm-week-day').filter({ hasText: '周日' }).locator('.adm-week-choice').filter({ hasText: '复习' });
  await expect(page.locator('.adm-week-day').filter({ hasText: '周日' })).toContainText('休息日');
  await sundayReview.getByRole('button', { name: /英语/ }).click();
  const mondayReview = page.locator('.adm-week-day').filter({ hasText: '周一' }).locator('.adm-week-choice').filter({ hasText: '复习' });
  await mondayReview.getByRole('button', { name: /数学/ }).click();
  await page.getByRole('button', { name: '保存并发布课程表' }).click();
  await expect(page.locator('.adm-toast')).toContainText('周课程表已发布');
  expect(published?.courseSchedule?.filter((item) => item.grade === 'g1').map((item) => [item.weekday, item.subjects, item.reviews])).toEqual([
    [1, ['chinese'], ['math']], [2, [], ['chinese', 'english']], [3, ['math'], []],
    [4, [], ['chinese', 'math']], [5, ['english'], []], [6, [], ['math', 'english']], [7, [], ['english']],
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test('语文新课后的 D0 短巩固需要单独答题才完成并领取当日复习奖励', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sfz-review-plan-v1:mission-child', JSON.stringify([{
      id: 'chinese:china', subject: 'chinese', lessonId: 'china', title: '我是中国人', focus: '认识祖国',
      route: '/chinese-course/china', learnedAt: Date.now(), completedDays: [],
    }]));
  });
  await page.goto('/#/review');
  await expect(page.getByText('语文 · 当天短巩固')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state.points['mission-child'])).toBe(0);
  await page.getByRole('button', { name: '开始小检验' }).click();
  await expect(page.getByText('画面中的小朋友虽然服饰不同，他们共同是什么人？')).toBeVisible();
  await page.getByRole('button', { name: '中国人', exact: true }).click();
  await expect(page.getByText('今天没有待复习的课程')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state.points['mission-child'])).toBe(8);
});

test('专项挑战按第一次作答结算并只发一次奖励', async ({ page }) => {
  await page.goto('/#/task/challenge:math:within-five');
  const answers = [1, 0, 1, 1, 1, 1];
  for (let index = 0; index < answers.length; index += 1) {
    await page.locator('.mission-options button').nth(answers[index]).click();
    await page.getByRole('button', { name: index === answers.length - 1 ? '完成任务' : '下一关 →' }).click();
  }
  await expect(page.getByRole('heading', { name: '任务完成！' })).toBeVisible();
  await expect(page.getByText('卷星币 +15')).toBeVisible();
  const ledger = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state.pointLog['mission-child']);
  expect(ledger.filter((entry: { id: string }) => entry.id === 'mission:challenge:math:within-five')).toHaveLength(1);
});
