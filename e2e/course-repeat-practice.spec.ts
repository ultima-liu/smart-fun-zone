import { writeHanzi } from './screen-writing-helpers';
import { mockCourseAI, mockCourseMicrophone, answerCourseTask } from './course-ai-helpers';
import { expect, test, type Page } from '@playwright/test';
import { getEnglishG3Extension } from '../src/content/englishG3Extensions';
import { getEnglishTeaching } from '../src/content/englishTeaching';
import { getChineseTextbookStudy } from '../src/content/chineseTextbookStudy';
import { CHINESE_PINYIN_STUDY } from '../src/content/chinesePinyinStudy';

const childId = 'repeat-practice-child';
async function seed(page: Page, entries: Record<string, unknown>) {
  await mockCourseMicrophone(page);
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(({ childId, entries }) => {
    if (sessionStorage.getItem('repeat-seeded')) return;
    sessionStorage.setItem('repeat-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: {
      lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false,
      profiles: [{ id: childId, name: '重复练习体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }],
      activeChildId: childId, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {},
      parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
    } }));
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, JSON.stringify(value));
  }, { childId, entries });
}

test('数学连续练习完成后保留原题，反复作答和刷新不撤销子任务进度', async ({ page }) => {
  const id = 'eleven-twenty';
  const taskKey = `sfz-math-task-v1:${childId}:${id}`;
  await seed(page, {
    [`sfz-math-flow-v4:${childId}:#/math-course/${id}`]: { contentVersion: 4, phase: 1, unlocked: 2, actionDone: true },
    [taskKey]: { 'completed-action-tasks-v1': [0, 1], 'place-value': { counted: 10, bundled: true, ones: 5 },
      'teen-writing-board': { 11: '11', 13: '13', 16: '16', 18: '18', 20: '20' }, 'teen-twenty-composition': '2个十', 'mission-index': 2 },
  });
  await page.goto(`/#/math-course/${id}`);
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
  const task = page.getByRole('tab', { name: /教材任务 2/ });
  await expect(task).toHaveClass(/done/);
  const deck = page.locator('.math-lesson-activity-panel:visible > .whole-stage > .whole-scene > .mt-action-station > .math-task-board-deck');
  await deck.locator(':scope > nav > button').nth(2).click();
  await expect(deck.getByRole('heading', { name: '1 个十和 8 个一是？', exact: true })).toBeVisible();
  await page.screenshot({ path: 'tmp/course-repeat/math-pad.png' });
  await deck.getByRole('button', { name: '18', exact: true }).click();
  await expect(deck.getByRole('heading', { name: /20/ })).toBeVisible();
  await deck.getByRole('button', { name: '2 个十', exact: true }).click();
  await expect(deck.getByRole('heading', { name: '1 个十和 8 个一是？', exact: true })).toBeVisible();
  await expect(task).toHaveClass(/done/);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)['mission-index'], taskKey)).toBe(2);
  await page.reload(); await expect(task).toHaveClass(/done/);
});

test('语文认字和书写完成后仍显示原题，重做保留抽查和书写完成记录', async ({ page }) => {
  const id = 'rhyme-song', pack = getChineseTextbookStudy(id)!;
  const prefix = `sfz-chinese-practice-v1:${childId}:${id}:`;
  await seed(page, {
    [`sfz-chinese-flow-v1:${childId}:${id}`]: { phase: 2, unlocked: 3 },
    [prefix + 'recognized']: pack.recognize!.map(item => item.char),
    [prefix + 'writingSeen']: pack.writing!.map(item => item.char),
    [prefix + 'recognitionChecked']: true, [prefix + 'writingPracticed']: true,
    [prefix + 'lesson:recognitionIndex:0']: 3,
    [prefix + 'lesson:paper-writing:writingIndex:0']: pack.writing!.length,
    [prefix + 'studySelected']: 1,
  });
  await page.goto(`/#/chinese-course/${id}`);
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
  const recognition = page.getByRole('region', { name: '脱离拼音认字检查' });
  await expect(recognition).toBeVisible();
  await expect(recognition.getByRole('button', { name: 'AI 认字检查', exact: true })).toBeEnabled();
  await page.getByRole('tab', { name: /实际书写/ }).click();
  const writing = page.getByRole('region', { name: '屏幕书写实践' });
  await expect(writing).toBeVisible();
  await expect(writing.getByRole('heading')).toContainText(`1/${pack.writing!.length}`);
  await page.screenshot({ path: 'tmp/course-repeat/chinese-pad.png' });
  await mockCourseAI(page);
  await writeHanzi(page,writing,pack.writing![0].char);
  await writing.getByRole('button', { name: '再做一次', exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), prefix + 'lesson:paper-writing:writingIndex:0')).toBe(pack.writing!.length);
  await expect(page.getByRole('tab', { name: /实际书写/ })).toHaveClass(/done/);
  await page.reload(); await expect(writing).toBeVisible();
});

test('英语完成反馈保留迁移原题和可点击选项，重做不清空星级', async ({ page }) => {
  const id = 'friends-opening', quiz = getEnglishG3Extension(id)!.transfer;
  const flowKey = `sfz-english-g3a-flow-v6:${childId}:${id}`;
  await seed(page, {
    [flowKey]: { phase: 4, unlocked: 4, stars: 3, transferPick: quiz.answer, operationPick: getEnglishTeaching(id).check.answer, expressionDone: true },
    [`sfz-english-practice-v1:${childId}:${id}:expression:lesson`]: { stage: 2, unlocked: 2, done: true },
  });
  await page.goto(`/#/english-course/${id}`);
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
  const panel = page.getByRole('region', { name: '把方法用到新问题', exact: true });
  await expect(panel.getByRole('heading', { name: quiz.question, exact: true })).toBeVisible();
  await page.screenshot({ path: 'tmp/course-repeat/english-pad.png' });
  const wrong = quiz.options.find(value => value !== quiz.answer)!;
  await panel.getByRole('button', { name: wrong, exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('再试一次');
  await panel.getByRole('button', { name: quiz.answer, exact: true }).click();
  await panel.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(panel.getByRole('button', { name: quiz.answer, exact: true })).toBeEnabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stars, flowKey)).toBe(3);
  await page.reload(); await expect(panel.getByRole('heading', { name: quiz.question, exact: true })).toBeVisible();
});

test('数学加法操作完成后可以重新移动实物，完成快照保持不变', async ({ page }) => {
  const id = 'add-within-5', taskKey = `sfz-math-task-v1:${childId}:${id}`;
  await seed(page, {
    [`sfz-math-flow-v4:${childId}:#/math-course/${id}`]: { contentVersion: 4, phase: 1, unlocked: 2, actionDone: true },
    [taskKey]: { 'completed-action-tasks-v1': [0, 1], 'addition-within-five-practice': { step: 2, moved: 0 } },
  });
  await page.goto(`/#/math-course/${id}`);
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
  const panel = page.getByRole('region', { name: '5以内加法合并练习', exact: true });
  await expect(panel.getByRole('heading')).toContainText('新来的 1 个');
  await panel.locator('.mt-addition-stage article:last-child button').click();
  await panel.getByRole('button', { name: '继续试一试 →', exact: true }).click();
  await expect(panel.getByRole('heading')).toContainText('新来的 2 个');
  for (let i = 0; i < 2; i++) await panel.locator('.mt-addition-stage article:last-child button:not(:disabled)').first().click();
  await panel.getByRole('button', { name: '完成加法练习', exact: true }).click();
  await expect(panel.getByRole('heading')).toContainText('新来的 1 个');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)['addition-within-five-practice'], taskKey)).toEqual({ step: 2, moved: 0 });
  await expect(page.getByRole('tab', { name: /教材任务 2/ })).toHaveClass(/done/);
});

test('语文听辨完成后仍能通过原题再次练习，已有听辨进度保留', async ({ page }) => {
  const id = 'pinyin-b-p-m-f', pack = CHINESE_PINYIN_STUDY[id];
  const prefix = `sfz-chinese-practice-v1:${childId}:${id}:`;
  await seed(page, {
    [`sfz-chinese-flow-v1:${childId}:${id}`]: { phase: 2, unlocked: 3 },
    [prefix + 'pinyinLetters']: pack.letters.map(item => item.glyph),
    [prefix + 'pinyinTones']: pack.tones, [prefix + 'pinyinBlends']: pack.blends.map((_, index) => index),
    [prefix + 'pinyinWords']: pack.words.map(item => item.word), [prefix + 'pinyinRuleAnswer']: pack.check.answer,
    [prefix + 'pinyinRuleSeen']: true, [prefix + 'pinyinListeningDone']: true,
    [prefix + 'lesson:listenIndex:0']: 2, [prefix + 'pinyinStep']: 3,
  });
  await page.goto(`/#/chinese-course/${id}`);
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('tab', { name: /听辨练习/ }).click();
  const panel = page.getByRole('region', { name: '新音节听辨', exact: true });
  await expect(panel.getByRole('heading')).toBeVisible();
  await panel.getByRole('button', { name: '我来拼读', exact: true }).click();
  const practice = page.locator('.ct-offline-check');
  await mockCourseAI(page);
  await answerCourseTask(practice,'audio');
  await expect(panel.getByText('听辨 2 / 2', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(panel.getByText('听辨 1 / 2', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), prefix + 'lesson:listenIndex:0')).toBe(2);
});
