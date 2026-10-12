import { expect, test, type Page } from '@playwright/test';
import { mathArenaQuestions } from '../src/content/mathArenaQuestions';
import { mathCoreQuestions, mathQuestions } from '../src/content/mathTeaching';
import { answerMathQuestion, finishMathAssessment } from './math-teaching-helpers';

test.use({ viewport: { width: 1024, height: 768 } });
const childId = 'assessment-separation-child';
const key = (id: string, context: string) => `sfz-math-assessment-v1:${childId}:${id}:${context}`;
async function seed(page: Page, id: string, phase = 3, legacyIndex = 0) {
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(({ id, phase, childId, legacyIndex }) => {
    if (sessionStorage.getItem('assessment-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: {
      lang: 'zh', theme: 'light', sound: false, voiceOn: false,
      profiles: [{ id: childId, name: '闯关体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: childId,
      mastery: {}, records: [], lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, customTasks: {}, taskStates: {},
      ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, bonusMin: {},
      parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {},
      archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {},
    } }));
    localStorage.setItem(`sfz-math-flow-v4:${childId}:#/math-course/${id}`, JSON.stringify({ contentVersion: 4, phase, unlocked: phase, actionDone: true, knowledgeDone: true }));
    for (const context of ['checkpoint', 'lesson']) localStorage.setItem(`sfz-math-assessment-v1:${childId}:${id}:${context}`, JSON.stringify({ version: 1, variant: 3, index: context === 'lesson' ? legacyIndex : 0, levels: context === 'lesson' ? Array(legacyIndex).fill('independent') : [], replacement: 0, supported: false }));
    sessionStorage.setItem('assessment-seeded', '1');
  }, { id, phase, childId, legacyIndex });
  await page.goto(`/#/math-course/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

for (const id of ['ten-again', 'plus-nine']) test(`${id}：小检测后进入独立情景题，刷新接续，三题完成保存星级`, async ({ page }) => {
  await seed(page, id);
  const checkpoint = mathCoreQuestions(mathQuestions(id, 3)).slice(0, 2);
  await finishMathAssessment(page, childId, id, 'checkpoint');
  const arena = mathArenaQuestions(id, 3);
  expect(arena.every(q => checkpoint.every(c => c.prompt !== q.prompt))).toBe(true);
  const region = page.locator('.math-assessment.context-lesson');
  await expect(region.getByRole('heading', { name: arena[0].prompt, exact: true })).toBeVisible();
  await expect(region.locator('header')).toContainText('1/3');
  await answerMathQuestion(page, arena[0]);
  await page.reload();
  await expect(region.getByRole('heading', { name: arena[1].prompt, exact: true })).toBeVisible();
  await answerMathQuestion(page, arena[1]);
  await expect(region.getByRole('heading', { name: arena[2].prompt, exact: true })).toBeVisible();
  if (id === 'ten-again') {
    await expect(region.getByRole('button', { name: '不同意，还是10颗', exact: true })).toBeVisible();
    await expect(region.getByRole('heading')).not.toContainText('旁边 0');
  }
  await answerMathQuestion(page, arena[2]);
  await expect(region.getByRole('heading', { name: '这组练习已完成', exact: true })).toBeVisible();
  await expect(region.locator('.math-assessment-workspace')).toHaveCount(0);
  const stars = await page.evaluate(({ childId, id }) => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.mastery[childId][`math-lab-${id}`].stars, { childId, id });
  expect(stars).toBe(3);
  await region.getByRole('button', { name: '换一组新题，再独立试试', exact: true }).click();
  await expect(region.getByRole('heading', { name: mathArenaQuestions(id, 14)[0].prompt, exact: true })).toBeVisible();
  await expect(region.locator('header')).toContainText('1/3');
});

test('旧五题组进行中的断点继续有效，换一组后使用独立三题', async ({ page }) => {
  await seed(page, 'plus-nine', 4, 3);
  const region = page.locator('.math-assessment.context-lesson');
  await expect(region.getByRole('heading', { name: mathQuestions('plus-nine', 3)[3].prompt, exact: true })).toBeVisible();
  await expect(region.locator('header')).toContainText('4/5');
  await page.reload();
  await finishMathAssessment(page, childId, 'plus-nine');
  await region.getByRole('button', { name: '换一组新题，再独立试试', exact: true }).click();
  await expect(region.getByRole('heading', { name: mathArenaQuestions('plus-nine', 14)[0].prompt, exact: true })).toBeVisible();
  expect(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!).bank, key('plus-nine', 'lesson'))).toBe('arena-v1');
});

test('闯关答错后的换题与错题本重练都保留情景题及原目标', async ({ page }) => {
  await seed(page, 'plus-nine', 4);
  const region = page.locator('.math-assessment.context-lesson');
  await region.getByLabel('独立答案', { exact: true }).fill('0');
  await region.getByRole('button', { name: '检查我的答案', exact: true }).click();
  const wrong = await page.evaluate(childId => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.wrongs[childId][0], childId);
  expect(wrong.mathQuestionBank).toBe('arena-v1');
  await region.getByRole('button', { name: '检查方法后，换新题独立试', exact: true }).click();
  await expect(region.getByRole('heading', { name: mathArenaQuestions('plus-nine', 10)[0].prompt, exact: true })).toBeVisible();
  await page.goto('/#/wrongs?subject=math');
  const retry = page.locator('.math-assessment.context-review');
  const q = mathArenaQuestions('plus-nine', 14)[0];
  await expect(retry.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible();
  await retry.getByLabel('独立答案', { exact: true }).fill(q.answer);
  await retry.getByRole('button', { name: '检查我的答案', exact: true }).click();
  await expect(page.getByText('还没有错题，太棒啦！')).toBeVisible();
});

for (const size of [{ width: 1024, height: 768 }, { width: 1194, height: 834 }]) test(`挑战练习可随时退出，完成后返回课程且保留星级 ${size.width}`, async ({ page }) => {
  await page.setViewportSize(size);
  await seed(page, 'ordinal', 4);
  await finishMathAssessment(page, childId, 'ordinal');
  const course = page.locator('.math-assessment.context-lesson');
  const stars = await page.evaluate(childId => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.mastery[childId]['math-lab-ordinal'].stars, childId);
  const open = course.getByRole('button', { name: '我想挑战一下', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog', { name: '试试新的挑战', exact: true });
  const exit = dialog.getByRole('button', { name: '退出挑战', exact: true });
  await expect(exit).toBeVisible();
  const bounds = await exit.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(Math.round(bounds!.height * 100) / 100).toBeGreaterThanOrEqual(44);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(size.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height);
  const questions = mathQuestions('ordinal', 20).slice(3);
  await answerMathQuestion(page, questions[0], 'challenge');
  await exit.click();
  await expect(dialog).toBeHidden();
  await expect(course.getByRole('heading', { name: '这组练习已完成', exact: true })).toBeVisible();
  await open.click();
  await expect(dialog.getByRole('heading', { name: questions[1].prompt, exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await open.click();
  for (const question of questions.slice(1)) await answerMathQuestion(page, question, 'challenge');
  await expect(dialog.getByRole('heading', { name: '这组练习已完成', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '返回课程', exact: true })).toBeVisible();
  await page.screenshot({ path: `tmp/math-tools-qa/challenge-complete-${size.width}.png` });
  await dialog.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: questions[0].prompt, exact: true })).toBeVisible();
  for (const question of questions) await answerMathQuestion(page, question, 'challenge');
  await dialog.getByRole('button', { name: '返回课程', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(course.getByRole('heading', { name: '这组练习已完成', exact: true })).toBeVisible();
  expect(await page.evaluate(childId => JSON.parse(localStorage.getItem('smart-fun-zone')!).state.mastery[childId]['math-lab-ordinal'].stars, childId)).toBe(stars);
  await course.getByRole('button', { name: '返回课程目录', exact: true }).click();
  await expect(page).toHaveURL(/#\/subject\/math$/);
});
