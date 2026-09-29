import { expect, test } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

test.beforeEach(async ({ page }) => {
  const childId = 'math-review-child';
  await page.addInitScript((id) => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: true, voiceOn: false,
        profiles: [{ id, name: '数学复习生', avatarId: 'boy', age: 6, createdAt: Date.now() }], activeChildId: id,
        records: [], mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {},
        wrongs: {
          [id]: [{ uid: 'structured-math-wrong', lessonId: 'math-lab-compare', lessonName: '比大小', kind: '图式转算式', question: '3 ○ 4，填什么符号？', answer: '＞', objective: '图式转算式', diagnosis: '可能还没先看清题目里的整体和部分。', remedy: '先一个对一个配，再看哪边有剩余。', options: ['＝', '＞', '＜'], correctAnswer: '＜', time: Date.now() }],
        },
        points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
      },
      version: 4,
    }));
    localStorage.setItem(`sfz-review-plan-v1:${id}`, JSON.stringify([{
      id: 'math:compare', subject: 'math', lessonId: 'compare', title: '比大小', focus: '一一对应，看有没有剩余。', route: '/math-course/compare', learnedAt: Date.now(), completedDays: [],
    }]));
  }, childId);
});

test('数学今日复习必须答对小检验才完成', async ({ page }) => {
  await page.goto('/#/review');
  await page.getByRole('button', { name: '开始小检验' }).click();
  await page.getByRole('button', { name: '3 = 4', exact: true }).click();
  await expect(page.getByText('再看看本课的方法卡，慢慢想一次。')).toBeVisible();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: '3 < 4', exact: true }).click();
  await expect(page.getByText('答对了，这次复习已完成！')).toBeVisible();
  await expect(page.getByText('今天没有待复习的课程')).toBeVisible({ timeout: 2_000 });
});

test('新版数学错题可在错题本内重练并自动移出', async ({ page }) => {
  await page.goto('/#/wrongs?subject=math');
  const profile = page.getByRole('region', { name: '数学学习画像' });
  await expect(profile.getByText('数量关系')).toBeVisible();
  await expect(profile.getByText('1 道待复习')).toBeVisible();
  await expect(page.getByText('先一个对一个配，再看哪边有剩余。')).toBeVisible();
  await page.getByRole('button', { name: '＞', exact: true }).click();
  await expect(page.locator('.wrong-math-retry').getByText('先一个对一个配，再看哪边有剩余。', { exact: true })).toBeVisible();
  await page.waitForTimeout(1_000);
  await page.getByRole('button', { name: '＜', exact: true }).click();
  await expect(page.getByText('答对了，已经从错题本移出！')).toBeVisible();
  await expect(page.getByText('还没有错题，太棒啦！')).toBeVisible({ timeout: 2_000 });
});

test('智能闯关答错后先做对应的方法复盘，再回到原题', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.evaluate(() => {
    localStorage.setItem(`sfz-math-flow-v4:math-review-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true }));
  });
  await page.reload();
  await page.getByRole('button', { name: '0', exact: true }).click();
  await expect(page.getByText('本题考查：方法复盘')).toBeVisible({ timeout: 2_000 });
  await expect(page.getByText('十格框里已经有一些圆片，算之前应该先看什么？')).toBeVisible();
  await page.getByRole('button', { name: '还空着几格', exact: true }).click();
  await expect(page.getByText('本题考查：找凑十伙伴')).toBeVisible({ timeout: 2_000 });
});

test('说理由后提供可朗读的完整句式支架', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.evaluate(() => {
    localStorage.setItem(`sfz-math-flow-v4:math-review-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 2, unlocked: 2, actionDone: true, knowledgeDone: false }));
  });
  await page.reload();
  await page.getByRole('button', { name: '10 加几容易计算', exact: true }).click();
  const expression = page.getByLabel('把理由说完整');
  await expect(expression).toBeVisible();
  await expect(expression.getByText('我这样想：10 加几容易计算。')).toBeVisible();
  await expect(expression.getByRole('button', { name: '我来讲理由' })).toBeVisible();
});

test('智能闯关连对三题后插入进阶迁移挑战', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.evaluate(() => {
    localStorage.setItem(`sfz-math-flow-v4:math-review-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true }));
  });
  await page.reload();
  const options = page.locator('.mt-arena-opts');
  await options.getByRole('button', { name: '1', exact: true }).click();
  await page.waitForTimeout(900);
  await options.getByRole('button', { name: '1', exact: true }).click();
  await page.waitForTimeout(900);
  await options.getByRole('button', { name: '9 和 1', exact: true }).click();
  await expect(page.getByText('本题考查：进阶挑战 · 凑十')).toBeVisible({ timeout: 2_000 });
  await expect(page.getByText('9＋6 时，先从 6 里分出几给 9，剩下几？')).toBeVisible();
});
