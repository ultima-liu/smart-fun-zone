import { expect, test, type Page } from '@playwright/test';
import { mockCourseAI } from './course-ai-helpers';
import { ALL_MATH_LESSONS } from '../src/content/mathUpperCurriculum';
import { mathPrerequisites } from '../src/content/mathTeaching';
import { answerMathQuestion, finishMathAssessment } from './math-teaching-helpers';

const CHILD = 'math-teaching-child';
test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
test.beforeEach(async ({ page }, testInfo) => {
  await page.route('**/config/store', (route) => route.abort());
  await page.addInitScript(({ id, delayedReview }) => {
    if (sessionStorage.getItem('math-teaching-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: { lang: 'zh', theme: 'dark', sound: false, voiceOn: false, musicOn: false, profiles: [{ id, name: '数学教学生', age: 6, ageBand: 'g1', avatarId: 'boy', createdAt: Date.now() }], activeChildId: id, records: [], mastery: {}, lessonProgress: {}, wrongs: {}, points: { [id]: 0 }, pointLog: {}, parentPin: '1234', courseSchedule: [] }, version: 8 }));
    if (delayedReview) {
      const learned = new Date(); learned.setDate(learned.getDate() - 3);
      const weekday = new Date().getDay() || 7;
      const store = JSON.parse(localStorage.getItem('smart-fun-zone')!);
      store.state.courseSchedule = [{ id: `g1:weekday:${weekday}`, grade: 'g1', weekday, subjects: [], reviews: ['math'] }];
      localStorage.setItem('smart-fun-zone', JSON.stringify(store));
      localStorage.setItem(`sfz-review-plan-v1:${id}`, JSON.stringify([{ id: 'math:plus-nine', subject: 'math', lessonId: 'plus-nine', title: '9 加几', focus: '凑十后加上剩余', route: '/math-course/plus-nine', learnedAt: learned.getTime(), completedDays: [0], reviewedOn: [] }]));
    }
    sessionStorage.setItem('math-teaching-seeded', '1');
  }, { id: CHILD, delayedReview: testInfo.title.startsWith('延迟复习') });
});

async function enterPhase(page: Page, lesson: string, phase: number, variant = 3) {
  await page.goto(`/#/math-course/${lesson}`);
  await page.evaluate(({ child, phase, variant, lesson }) => {
    localStorage.setItem(`sfz-math-flow-v4:${child}:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase, unlocked: phase, actionDone: true, knowledgeDone: phase >= 3 }));
    localStorage.setItem(`sfz-math-assessment-v1:${child}:${lesson}:lesson`, JSON.stringify({ version: 1, variant, index: 0, levels: [], replacement: 0, supported: false }));
  }, { child: CHILD, lesson, phase, variant });
  await page.reload();
}

test('47课不显示能力目标卡片，先备路径与旧进度兼容', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const lesson of ALL_MATH_LESSONS) {
    await page.goto(`/#/math-course/${lesson.id}`);
    await expect(page.getByLabel('本课先备诊断')).toBeVisible();
    await expect(page.getByLabel('本课能力目标')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '带着猜想去验证 →' })).toBeDisabled();
  }
  await enterPhase(page, 'plus-nine', 4);
  await expect(page.locator('.math-assessment.context-lesson')).toBeVisible();
  expect(errors).toEqual([]);
});

test('先备检查决定精简或支持路径，精简仍覆盖全部关键目标', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.getByRole('button', { name: '试试我已经会什么' }).click();
  for (const question of mathPrerequisites('plus-nine', 2)) await answerMathQuestion(page, question, 'readiness');
  await expect(page.getByText('已有基础：检测集中做关键目标与迁移题。')).toBeVisible();
  await page.reload();
  await expect(page.getByText('已有基础：检测集中做关键目标与迁移题。')).toBeVisible();
  await page.evaluate(({ child }) => localStorage.setItem(`sfz-math-flow-v4:${child}:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true })), { child: CHILD });
  await page.reload();
  const objectives = await finishMathAssessment(page, CHILD, 'plus-nine', 'lesson', true);
  expect(new Set(objectives).size).toBe(3);
  await expect(page.getByText('🎉 闯关成功')).toBeVisible();
});

test('凑十漏算剩余有具体补救，新题证明理解后可满星，挑战单独记录', async ({ page }) => {
  await enterPhase(page, 'plus-nine', 4, 3);
  const region = page.locator('.math-assessment.context-lesson');
  await region.getByLabel('独立答案', { exact: true }).fill('10');
  await region.getByRole('button', { name: '检查我的答案' }).click();
  await expect(region.getByRole('status')).toContainText('漏掉了剩余部分');
  await region.getByRole('button', { name: '检查方法后，换新题独立试' }).click();
  await finishMathAssessment(page, CHILD, 'plus-nine');
  await expect(page.getByLabel('3 星', { exact: true })).toBeVisible();
  await expect(page.getByText('挑战完成，本课星级保持不变。')).not.toBeVisible();
  await page.getByRole('button', { name: '我想挑战一下' }).click();
  const challenge = page.locator('.math-assessment.context-challenge');
  await challenge.getByLabel('完整算式', { exact: true }).fill('1+1=2');
  await challenge.getByRole('button', { name: '检查我的答案' }).click();
  const mastery = await page.evaluate((id) => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.mastery[id]['math-lab-plus-nine'], CHILD);
  expect(mastery.stars).toBe(3);
  expect(mastery.gold).toBe(true);
});

test('提示后完成保留完成状态，满星后的重练会更新最近困难而不回收奖励', async ({ page }) => {
  await enterPhase(page, 'add-within-5', 4, 3);
  await finishMathAssessment(page, CHILD, 'add-within-5');
  const initial = await page.evaluate((id) => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.points[id], CHILD);
  await page.getByRole('button', { name: '换一组新题，再独立试试' }).click();
  await page.locator('.math-assessment.context-lesson').getByLabel('独立答案', { exact: true }).fill('0');
  await page.locator('.math-assessment.context-lesson').getByRole('button', { name: '检查我的答案' }).click();
  await expect(page.getByLabel('最近数学学习表现')).toHaveCount(0);
  await finishMathAssessment(page, CHILD, 'add-within-5');
  const state = await page.evaluate((id) => { const state = JSON.parse(localStorage.getItem('smart-fun-zone')!).state; return { points: state.points[id], mastery: state.mastery[id]['math-lab-add-within-5'] }; }, CHILD);
  expect(state.points).toBe(initial);
  expect(state.mastery.stars).toBe(3);
  await page.goto('/#/subject/math');
  await expect(page.locator('.ct-lesson-entry').filter({ hasText: '1～5 的加法' })).toContainText('学习已完成');
});

test('理由表达自动交给 AI 判断，表达可恢复', async ({ page }) => {
  await enterPhase(page, 'plus-nine', 2);
  await mockCourseAI(page);
  const expression = page.getByLabel('用自己的方式讲理由');
  await expect(expression.getByRole('button', { name: '10 加几容易计算', exact: true })).not.toBeVisible();
  await expression.getByLabel('我的数学理由', { exact: true }).fill('我从第二组拿一个补满十，再看还剩几个。');
  await expect(page.getByRole('tab', { name: /知识延伸/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('region', { name: '本课知识延伸' })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: /说出理由/ }).click();
  await expect(expression.getByLabel('我的数学理由', { exact: true })).toHaveValue('我从第二组拿一个补满十，再看还剩几个。');
  expect(await page.evaluate((id) => JSON.parse(localStorage.getItem(`sfz-math-evidence-v1:${id}`)! ).find((row: { taskId: string }) => row.taskId === 'reason-expression').level, CHILD)).toBe('independent');
});

test('8加9两条路线必须自主移动与解答，刷新保留操作', async ({ page }) => {
  await enterPhase(page, 'plus-eight-nine-strategies', 1);
  await page.getByRole('tab', { name: /教材任务 2/ }).click();
  const task = page.getByRole('region', { name: '8加9两种凑十方法' });
  await task.getByRole('button', { name: '给 8 凑十', exact: true }).click();
  await task.getByRole('button', { name: '给 9 凑十', exact: true }).click();
  await expect(task.getByText('✓ 两种方法都验证了。选自己容易讲清的一种。')).not.toBeVisible();
  await task.getByRole('button', { name: '路线圆片 1', exact: true }).click();
  await task.getByLabel('本路线完整结果').fill('17');
  await task.getByRole('button', { name: '验证这条路线' }).click();
  await page.reload();
  await page.getByRole('tab', { name: /教材任务 2/ }).click();
  await expect(task.getByLabel('本路线完整结果')).toHaveValue('17');
  await task.getByRole('button', { name: '给 8 凑十', exact: true }).click();
  await task.getByRole('button', { name: '路线圆片 1', exact: true }).click();
  await task.getByRole('button', { name: '路线圆片 2', exact: true }).click();
  await task.getByLabel('本路线完整结果').fill('17');
  await task.getByRole('button', { name: '验证这条路线' }).click();
  await expect(task.getByText('✓ 两种方法都验证了。选自己容易讲清的一种。')).toBeVisible();
});

test('智能闯关直接全宽显示，不再提供生活迁移与任务栏', async ({ page }) => {
  await enterPhase(page, 'add-within-5', 4);
  await expect(page.getByLabel('自己发现生活中的数学')).toHaveCount(0);
  await expect(page.getByRole('tablist', { name: '本阶段任务' })).toHaveCount(0);
  await expect(page.locator('.math-flow-guidance')).toHaveCount(0);
  await expect(page.locator('.math-flow-workspace')).toHaveClass(/math-flow-workspace-full/);
  await expect(page.locator('.math-assessment.context-lesson')).toBeVisible();
});

test('延迟复习使用新材料和相关先备题，独立完成记录保持', async ({ page }) => {
  await page.goto('/#/review');
  await expect(page.getByRole('heading', { name: '今日复习', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始小检验' })).toBeVisible();
  await page.getByRole('button', { name: '开始小检验' }).click();
  await finishMathAssessment(page, CHILD, 'plus-nine', 'review');
  await expect(page.getByText('今天没有待复习的课程')).toBeVisible();
  const evidence = await page.evaluate((id) => JSON.parse(localStorage.getItem(`sfz-math-evidence-v1:${id}`)!), CHILD);
  expect(evidence.filter((row: { context: string; level: string }) => row.context === 'review' && row.level === 'retained')).toHaveLength(3);
});

test('电脑和Pad的深浅主题下新课堂可以触摸输入且不溢出', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  for (const theme of ['dark', 'light']) {
    for (const width of [1280, 820, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      await enterPhase(page, 'plus-nine', 4);
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      await expect(page.locator('.math-assessment.context-lesson')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const input = page.getByLabel('独立答案', { exact: true });
      const style = await input.evaluate((element) => { const s = getComputedStyle(element); return { color: s.color, background: s.backgroundColor, minHeight: s.minHeight }; });
      expect(style.color).not.toBe(style.background);
      expect(Number.parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
    }
  }
  expect(errors).toEqual([]);
  await expect(page.locator('.boot-splash')).not.toBeVisible();
  await page.screenshot({ path: 'tmp/math-teaching-pad.png', fullPage: true });
});

test('切课不把上一课阶段写到下一课，儿童断点相互隔离', async ({ page }) => {
  await page.goto('/#/math-course/campus');
  await page.getByRole('button', { name: '我想先用学具学' }).click();
  await page.getByRole('button', { name: '4 层', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await page.getByRole('button', { name: '下一课 →', exact: true }).click();
  await expect(page.getByLabel('本课先备诊断')).toBeVisible();
  await expect(page.getByRole('button', { name: '带着猜想去验证 →' })).toBeDisabled();
  await page.goto('/#/math-course/campus');
  await expect(page.locator('.mt-campus-scene')).toBeVisible();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('smart-fun-zone')!);
    saved.state.profiles.push({ id: 'second-math-child', name: '另一位儿童', ageBand: 'g1', avatar: '🐰', createdAt: Date.now() });
    saved.state.activeChildId = 'second-math-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.getByLabel('本课先备诊断')).toBeVisible();
});

test('家长报告显示具体课时的最近困难，不依赖游戏记录或旧满星', async ({ page }) => {
  await enterPhase(page, 'plus-nine', 4);
  await page.getByLabel('独立答案', { exact: true }).fill('10');
  await page.getByRole('button', { name: '检查我的答案' }).click();
  await page.evaluate(() => sessionStorage.setItem('sfz_parent_authed', '1'));
  await page.goto('/#/parent');
  await page.getByRole('button', { name: '📊 学习报告', exact: true }).click();
  const report = page.getByLabel('数学能力与最近表现');
  await expect(report).toContainText('需要支持 1 项');
  await expect(report).toContainText('《9 加几》');
  await expect(report).toContainText('还需要练习');
});

test.describe('Pad实际触摸', () => {
  test.use({ hasTouch: true, viewport: { width: 768, height: 1000 } });
  test('触摸选路径、猜想和转移圆片，键入结果后验证', async ({ page }) => {
    await page.goto('/#/math-course/plus-nine');
    await page.getByRole('button', { name: '我想先用学具学' }).tap();
    await page.locator('.mt-guess-card').getByRole('button', { name: '1', exact: true }).tap();
    await page.getByRole('button', { name: '带着猜想去验证 →' }).tap();
    const task = page.getByLabel('凑十自主拆分');
    await task.getByLabel('计划移入的数量', { exact: true }).fill('1');
    await task.getByRole('button', { name: '转移第 1 个圆片', exact: true }).tap();
    await task.getByLabel('凑十完整结果', { exact: true }).fill('13');
    await task.getByRole('button', { name: '检查拆分、剩余与结果' }).tap();
    await expect(task).toContainText('9＋4＝10＋3＝13');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: 'tmp/math-ten-pad.png', fullPage: true });
  });
});
