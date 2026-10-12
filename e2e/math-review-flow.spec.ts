import { expect, test } from '@playwright/test';

import { mathQuestions, mathReviewQuestions } from '../src/content/mathTeaching';
import { mockCourseAI } from './course-ai-helpers';
import { finishMathAssessment } from './math-teaching-helpers';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

test.beforeEach(async ({ page }) => {
  await page.route('**/config/store', (route) => route.abort());
  const childId = 'math-review-child';
  await page.addInitScript((id) => {
    if (sessionStorage.getItem('math-review-seeded')) return;
    sessionStorage.setItem('math-review-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: true, voiceOn: false,
        profiles: [{ id, name: '数学复习生', avatarId: 'boy', age: 6, ageBand: 'g1', createdAt: Date.now() }], activeChildId: id,
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

test('数学今日复习需完成三个目标检验，答错不能直接完成', async ({ page }) => {
  await page.goto('/#/review');
  await page.getByRole('button', { name: '开始小检验' }).click();
  const assessment = page.locator('.math-assessment.context-review');
  const variant = await page.evaluate(() => JSON.parse(localStorage.getItem('sfz-math-assessment-v1:math-review-child:compare:review')!).variant);
  const first = mathReviewQuestions('compare', variant)[0];
  if (first.kind === 'choice') await assessment.getByRole('button', { name: first.options!.find((option) => option !== first.answer)!, exact: true }).click();
  else {
    await assessment.getByLabel('独立答案', { exact: true }).fill('0');
    await assessment.getByRole('button', { name: '检查我的答案' }).click();
  }
  await expect(assessment.getByRole('status')).toContainText('需要回到材料');
  await expect(page.getByRole('heading', { name: '今天没有待复习的课程' })).not.toBeVisible();
  await finishMathAssessment(page, 'math-review-child', 'compare', 'review');
  await expect(page.getByText('今天没有待复习的课程')).toBeVisible();
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

test('智能闯关答错后提供针对性线索，并用同目标新题检验', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.evaluate(() => {
    localStorage.setItem(`sfz-math-flow-v4:math-review-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true }));
    localStorage.setItem('sfz-math-assessment-v1:math-review-child:plus-nine:lesson', JSON.stringify({ version: 1, variant: 3, index: 0, levels: [], replacement: 0, supported: false }));
  });
  await page.reload();
  const assessment = page.locator('.math-assessment.context-lesson');
  const original = await assessment.getByRole('heading').textContent();
  await assessment.getByLabel('独立答案', { exact: true }).fill('10');
  await assessment.getByRole('button', { name: '检查我的答案' }).click();
  await expect(assessment.getByRole('status')).toContainText('漏掉了剩余部分');
  await assessment.getByRole('button', { name: '检查方法后，换新题独立试' }).click();
  await expect(assessment.getByRole('heading')).not.toHaveText(original!);
  await finishMathAssessment(page, 'math-review-child', 'plus-nine');
  await expect(page.getByText('🎉 闯关成功')).toBeVisible();
});

test('说理由写完自动检查，不再要求句式帮助和关系选择', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.evaluate(() => localStorage.setItem(`sfz-math-flow-v4:math-review-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 2, unlocked: 2, actionDone: true, knowledgeDone: false })));
  await page.reload();
  const expression = page.getByLabel('用自己的方式讲理由');
  await mockCourseAI(page);
  await expect(expression.getByRole('button', { name: '我需要句式帮助' })).toHaveCount(0);
  await expression.getByRole('textbox', { name: '我的数学理由', exact: true }).fill('从第二组拿一个给九凑成十，再加剩下的，更容易计算。');
  await expect(page.getByRole('region', { name: '本课知识延伸' })).toBeVisible();
});

test('智能闯关完成后才提供自选挑战，挑战不会改变课程星级', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.evaluate(() => localStorage.setItem(`sfz-math-flow-v4:math-review-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true })));
  await page.reload();
  await expect(page.getByRole('button', { name: '我想挑战一下' })).not.toBeVisible();
  await finishMathAssessment(page, 'math-review-child', 'plus-nine');
  await page.getByRole('button', { name: '我想挑战一下' }).click();
  await expect(page.locator('.math-assessment.context-challenge')).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.mastery['math-review-child']['math-lab-plus-nine']);
  expect(state.stars).toBe(3);
});

test('结构化错题使用新材料独立重练，而不是记住原答案', async ({ page }) => {
  await page.goto('/#/wrongs?subject=math');
  await page.evaluate((question) => {
    const saved = JSON.parse(localStorage.getItem('smart-fun-zone')!);
    saved.state.wrongs['math-review-child'] = [{ uid: 'modern-wrong', lessonId: 'math-lab-plus-nine', lessonName: '9加几', kind: question.objective, objective: question.objective, question: question.prompt, answer: '10', mathLessonId: 'plus-nine', mathVariant: 3, mathQuestionIndex: 0, time: Date.now() }];
    localStorage.setItem('smart-fun-zone', JSON.stringify(saved));
  }, mathQuestions('plus-nine', 3)[0]);
  await page.reload();
  const next = mathQuestions('plus-nine', 14)[0];
  const assessment = page.locator('.math-assessment.context-review');
  await expect(assessment.getByRole('heading')).toHaveText(next.prompt);
  await assessment.getByLabel('独立答案', { exact: true }).fill(next.answer);
  await assessment.getByRole('button', { name: '检查我的答案' }).click();
  await expect(page.getByText('还没有错题，太棒啦！')).toBeVisible();
});
