import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test('首页复习入口汇总当天跨学科任务，并可保留完成状态', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('review-hub-seeded')) return;
    const id = 'review-hub-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: {
      lang: 'zh', theme: 'dark', sound: false, musicOn: false, voiceOn: false,
      profiles: [{ id, name: '复习体验生', avatarId: 'boy', age: 8, createdAt: Date.now() }], activeChildId: id,
      records: [], mastery: {}, lessonProgress: {}, charBag: {}, storyDone: { [id]: ['p1'] }, storyPulse: null,
      wrongs: {}, points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
    }, version: 0 }));
    const now = Date.now();
    localStorage.setItem(`sfz-review-plan-v1:${id}`, JSON.stringify([
      { id: 'english:friends-a', subject: 'english', lessonId: 'friends-a', title: 'Making friends · 听说与词汇', focus: '听读、词汇和核心表达', route: '/english-course/friends-a', learnedAt: now, completedDays: [] },
      { id: 'math:count-1-5', subject: 'math', lessonId: 'count-1-5', title: '1～5 的认识', focus: '数、量和数字对应', route: '/math-course/count-1-5', learnedAt: now, completedDays: [] },
      { id: 'chinese:china', subject: 'chinese', lessonId: 'china', title: '我是中国人', focus: '朗读课文和识字', route: '/chinese-course/china', learnedAt: now, completedDays: [] },
    ]));
    sessionStorage.setItem('review-hub-seeded', '1');
  });

  await page.goto('/#/');
  await expect(page.getByRole('button', { name: '今日复习3节' })).toBeVisible();
  await page.getByRole('button', { name: '今日复习3节' }).click();
  await expect(page.getByRole('heading', { name: '今日复习' })).toBeVisible();
  await expect(page.getByText('3 节待复习')).toBeVisible();
  await expect(page.getByLabel('今日待复习课程').locator('.review-hub-card')).toHaveCount(3);
  await expect(page.getByText('Making friends · 听说与词汇')).toBeVisible();
  await expect(page.getByText('1～5 的认识')).toBeVisible();
  await expect(page.getByText('我是中国人')).toBeVisible();

  await page.getByLabel('今日待复习课程').getByRole('button', { name: '✓ 已完成回顾' }).first().click();
  await expect(page.getByText('2 节待复习')).toBeVisible();
  await page.reload();
  await expect(page.getByText('2 节待复习')).toBeVisible();
});
