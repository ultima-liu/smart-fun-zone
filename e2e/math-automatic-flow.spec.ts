import { test, expect, type Page } from '@playwright/test';
import { mathCoreQuestions, mathQuestions, type MathQuestion } from '../src/content/mathTeaching';
import { mathArenaQuestions } from '../src/content/mathArenaQuestions';
import { ALL_MATH_LESSONS } from '../src/content/mathUpperCurriculum';
import { MATH_KNOWLEDGE_EXTENSION } from '../src/content/mathKnowledgeExtension';

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const childId = 'math-auto-flow-child';
async function seed(page: Page, phase = 0, unlocked = phase, snapshot: Record<string, unknown> = {}) {
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(({ childId, phase, unlocked, snapshot }) => {
    if (sessionStorage.getItem('math-auto-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: {
      lang: 'zh', theme: 'light', sound: false, voiceOn: false,
      profiles: [{ id: childId, name: '数学流程体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: childId,
      mastery: {}, records: [], lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, customTasks: {}, taskStates: {},
      ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, bonusMin: {},
      parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {},
      archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
    } }));
    localStorage.setItem(`sfz-math-flow-v4:${childId}:#/math-course/compare`, JSON.stringify({ contentVersion: 4, phase, unlocked, actionDone: phase === 1, knowledgeDone: false }));
    localStorage.setItem(`sfz-math-task-v1:${childId}:compare`, JSON.stringify(snapshot));
    sessionStorage.setItem('math-auto-seeded', '1');
  }, { childId, phase, unlocked, snapshot });
  await page.goto('/#/math-course/compare');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('比大小');
}
const phases = (page: Page) => page.getByRole('navigation', { name: '本课学习步骤' });
const taskTabs = (page: Page) => page.getByRole('tablist', { name: '本阶段任务' });
async function answer(page: Page, q: MathQuestion, context: string) {
  const region = page.locator(`.math-assessment.context-${context}`);
  await expect(region.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible();
  if (q.kind === 'choice') await region.getByRole('button', { name: q.answer, exact: true }).click();
  else { await region.getByLabel(q.kind === 'expression' ? '完整算式' : '独立答案', { exact: true }).fill(q.answer); await region.getByRole('button', { name: '检查我的答案', exact: true }).click(); }
}
async function finishAssessment(page: Page, context: string) {
  const key = `sfz-math-assessment-v1:${childId}:compare:${context}`;
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').variant, key)).toBeGreaterThanOrEqual(0);
  const variant = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).variant as number, key);
  const questions = context === 'checkpoint' ? mathCoreQuestions(mathQuestions('compare', variant)).slice(0, 2) : mathArenaQuestions('compare', variant);
  for (const [index, q] of questions.entries()) {
    await answer(page, q, context);
    if (index < questions.length - 1) await page.getByRole('button', { name: '下一题 →', exact: true }).click();
    else await expect(page.getByRole('button', { name: '完成这组练习 →', exact: true })).toHaveCount(0);
  }
}

test('数学按真实任务完成自动推进，回看不跳走，最后一题自动记录奖励', async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page);
  await expect(page.locator('.math-readiness,.math-support-path')).toHaveCount(0);
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toBeDisabled();
  await page.getByRole('button', { name: '香蕉', exact: true }).click();
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
  await expect(page.locator('.mt-flow-next,.activity-journey')).toHaveCount(0);
  await expect(taskTabs(page).getByRole('tab')).toHaveCount(2);
  await expect(taskTabs(page).getByRole('tab', { name: /小探索/ })).toHaveCount(0);
  for (let index = 0; index < 3; index++) { await page.locator('.mt-pair-monkey').nth(index).click(); await page.locator('.mt-pair-fruit').nth(index).click(); }
  await expect(taskTabs(page).getByRole('tab', { name: /教材任务 1/ })).toHaveClass(/done/);
  await expect(taskTabs(page).getByRole('tab', { name: /教材任务 2/ })).toHaveAttribute('aria-selected', 'true');
  const board = page.getByRole('region', { name: '5以内一一对应比较板', exact: true });
  for (let i = 1; i <= 3; i++) await board.getByRole('button', { name: `给第 ${i} 只小猴分桃`, exact: true }).click();
  await board.locator('article').filter({ hasText: '4 个桃子和 3 只小猴' }).getByRole('button', { name: '4＞3', exact: true }).click();
  await board.locator('article').filter({ hasText: '3 个圆片和 3 个方块' }).getByRole('button', { name: '3＝3', exact: true }).click();
  await expect(page.locator('.math-inquiry,.math-inquiry-done')).toHaveCount(0);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
  await page.getByRole('button', { name: '我已说、指或摆出想法', exact: true }).click();
  await page.getByRole('button', { name: '一个小猴配一个水果，看哪边有剩余', exact: true }).click();
  await expect(taskTabs(page).getByRole('tab', { name: /知识延伸/ })).toHaveAttribute('aria-selected', 'true');
  await page.locator('.mt-knowledge-options').getByRole('button', { name: MATH_KNOWLEDGE_EXTENSION.compare.answer, exact: true }).click();
  await expect(phases(page).getByRole('button', { name: /小检测/ })).toHaveClass(/active/);
  await phases(page).getByRole('button', { name: /动手试/ }).click();
  await taskTabs(page).getByRole('tab', { name: /教材任务 1/ }).click();
  await page.getByRole('button', { name: '3 和 2 · 谁更多', exact: true }).click();
  await expect(taskTabs(page).getByRole('tab', { name: /教材任务 1/ })).toHaveClass(/done/);
  await page.waitForTimeout(1400);
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
  await expect(taskTabs(page).getByRole('tab', { name: /教材任务 1/ })).toHaveAttribute('aria-selected', 'true');
  await page.reload();
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
  await expect(taskTabs(page).getByRole('tab', { name: /教材任务 1/ })).toHaveClass(/done/);
  await phases(page).getByRole('button', { name: /小检测/ }).click();
  await finishAssessment(page, 'checkpoint');
  await expect(phases(page).getByRole('button', { name: /智能闯关/ })).toHaveClass(/active/);
  await finishAssessment(page, 'lesson');
  await expect(taskTabs(page)).toHaveCount(0);
  await expect(page.locator('.math-life-inquiry,.math-flow-guidance')).toHaveCount(0);
  await expect(phases(page).getByRole('button', { name: /智能闯关/ })).toHaveText(/✓/);
  await expect(page.locator('.math-flow-workspace')).toHaveClass(/math-flow-workspace-full/);
  await expect.poll(() => page.evaluate(childId => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.mastery[childId]?.['math-lab-compare']?.stars, childId)).toBeGreaterThan(0);
  await page.reload();
  await expect(taskTabs(page)).toHaveCount(0);
  await expect(page.locator('.math-life-inquiry,.math-flow-guidance')).toHaveCount(0);
  await expect(phases(page).getByRole('button', { name: /智能闯关/ })).toHaveText(/✓/);
  await expect(page.locator('.math-flow-workspace')).toHaveClass(/math-flow-workspace-full/);
});

test('旧的动手与探索完成标记不能跳过未做的教材任务，历史探索数据保留', async ({ page }) => {
  const history = { 'teaching-exploration-v1': { done: true }, 'teaching-exploration-v2': { stage: 1, done: true, round: 2 } };
  await seed(page, 1, 1, history);
  await page.waitForTimeout(1400);
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await expect(taskTabs(page).getByRole('tab')).toHaveCount(2);
  await expect(taskTabs(page).getByRole('tab', { name: /小探索/ })).toHaveCount(0);
  await taskTabs(page).getByRole('tab', { name: /教材任务 2/ }).click();
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await page.reload();
  const saved = await page.evaluate(childId => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${childId}:compare`)!), childId);
  for (const [key, value] of Object.entries(history)) expect(saved[key]).toEqual(value);
});

test('恢复已完成教材任务时，无需探索记录即可进入说理由', async ({ page }) => {
  await seed(page, 1, 1, { 'completed-action-tasks-v1': [0, 1], 'teaching-exploration-v1': { done: false } });
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
});

test('全册动手试仅展示实际教材任务，Web 与 Pad 均无小探索', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page, 1, 4);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const lesson of ALL_MATH_LESSONS) {
      await page.evaluate(({ childId, lessonId }) => {
        localStorage.setItem(`sfz-math-flow-v4:${childId}:#/math-course/${lessonId}`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked: 4, actionDone: false, knowledgeDone: false }));
      }, { childId, lessonId: lesson.id });
      await page.goto(`/#/math-course/${lesson.id}`, { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
      const labels = await taskTabs(page).getByRole('tab').allTextContents();
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.every(label => /教材任务 \d+/.test(label))).toBe(true);
      await expect(page.getByLabel('数学小探索', { exact: true })).toHaveCount(0);
      await expect(page.locator('.math-inquiry,.math-inquiry-done')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

 test('已解锁后续阶段的课程，新完成当前任务仍会自动推进', async ({ page }) => {
  await seed(page, 2, 4, { 'teaching-support-path-v1': 'standard' });
  await page.getByRole('button', { name: '我已说、指或摆出想法', exact: true }).click();
  await page.getByRole('button', { name: '一个小猴配一个水果，看哪边有剩余', exact: true }).click();
  await expect(taskTabs(page).getByRole('tab', { name: /知识延伸/ })).toHaveAttribute('aria-selected', 'true');
  await page.locator('.mt-knowledge-options').getByRole('button', { name: MATH_KNOWLEDGE_EXTENSION.compare.answer, exact: true }).click();
  await expect(phases(page).getByRole('button', { name: /小检测/ })).toHaveClass(/active/);
});
