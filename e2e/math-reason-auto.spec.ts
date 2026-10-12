import { expect, test, type Page } from '@playwright/test';
import { mockCourseAI, mockCourseMicrophone } from './course-ai-helpers';

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const child = 'math-reason-auto-child';
const taskKey = `sfz-math-task-v1:${child}:ten-again`;
const answer = '十根小棒捆成一捆，数量还是十根，可以一捆一捆按十数，更清楚。';
async function open(page: Page, snapshot: Record<string, unknown> = {}) {
  await mockCourseMicrophone(page);
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(({ child, taskKey, snapshot }) => {
    if (sessionStorage.getItem('reason-auto-seeded')) return;
    sessionStorage.setItem('reason-auto-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false,
      profiles: [{ id: child, name: '数学理由体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child,
      mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false } }));
    localStorage.setItem(`sfz-math-flow-v4:${child}:#/math-course/ten-again`, JSON.stringify({ contentVersion: 4, phase: 2, unlocked: 2, actionDone: true, knowledgeDone: false }));
    localStorage.setItem(taskKey, JSON.stringify(snapshot));
  }, { child, taskKey, snapshot });
  await page.goto('/#/math-course/ten-again');
  await expect(reason(page)).toBeVisible({ timeout: 20_000 });
}
const reason = (page: Page) => page.getByRole('region', { name: '用自己的方式讲理由', exact: true });
const input = (page: Page) => reason(page).getByRole('textbox', { name: '我的数学理由', exact: true });
const knowledge = (page: Page) => page.getByRole('tab', { name: /知识延伸/ });

test('数学理由只有一个输入框，文字写完自动检查并直接解锁下一任务', async ({ page }) => {
  await open(page); const sent: any[] = [];
  await mockCourseAI(page, body => { sent.push(body); return { feedback: '十根捆成一捆，数量没变，解释得很清楚。' }; });
  await expect(reason(page).getByRole('textbox')).toHaveCount(1);
  await expect(reason(page).getByRole('button', { name: /补充说明|请 AI 确认|录音交给 AI|句式帮助/ })).toHaveCount(0);
  await expect(reason(page).locator('.math-reason-verify,.math-reason-check,.ai-course-check')).toHaveCount(0);
  await input(page).fill('数起来方便');
  await expect(reason(page).getByText('十根捆成一捆，数量没变，解释得很清楚。', { exact: true })).toBeVisible();
  await expect(knowledge(page)).toHaveAttribute('aria-selected', 'true');
  expect(sent).toHaveLength(1); expect(sent[0]).toMatchObject({ taskId: 'reason-expression', answer: '数起来方便' });
  expect(sent[0].criteria).toHaveLength(1);
  expect(sent[0].criteria[0]).toContain('与参考意思接近');
  expect(sent[0].prompt).toContain('不要求复述参考答案或展开所有步骤');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), taskKey);
  expect(saved).toMatchObject({ 'reason-shared-v1': true, 'reason-checked-v1': true, 'reason-ready-v1': true });
});

test('数学理由说完自动把真实录音交给 AI，无额外提交按钮', async ({ page }) => {
  await open(page); const sent: any[] = [];
  await mockCourseAI(page, body => { sent.push(body); return {}; });
  await reason(page).getByRole('button', { name: '🎤 我来讲理由', exact: true }).click();
  await reason(page).getByRole('button', { name: '说完了', exact: true }).click();
  await expect(knowledge(page)).toHaveAttribute('aria-selected', 'true');
  expect(sent).toHaveLength(1); expect(sent[0].audio).toMatchObject({ format: 'wav' });
  expect(sent[0].criteria).toHaveLength(1);
  expect(Buffer.from(sent[0].audio.data, 'base64').subarray(0, 4).toString()).toBe('RIFF');
  expect(await page.evaluate(() => (window as any).__courseMicStops)).toBeGreaterThan(0);
});

test('数学理由未通过直接显示建议，改写后自动重查', async ({ page }) => {
  await open(page);
  await mockCourseAI(page, body => body.answer === '因为好看' ? { verdict: 'retry', feedback: '想想捆好前后有多少根，怎样数更方便。' } : {});
  await input(page).fill('因为好看');
  await expect(reason(page).getByText('想想捆好前后有多少根，怎样数更方便。', { exact: true })).toBeVisible();
  await expect(knowledge(page)).toBeDisabled();
  await page.screenshot({ path: 'tmp/math-stationery/reason-auto-retry-1024.png' });
  await input(page).fill(answer);
  await expect(knowledge(page)).toHaveAttribute('aria-selected', 'true');
});

test('数学理由接口失败可原地重试，不误记完成', async ({ page }) => {
  await open(page); let count = 0;
  await mockCourseAI(page, () => ++count === 1 ? { status: 503 } : {});
  await input(page).fill(answer);
  await reason(page).getByRole('button', { name: '再试一次', exact: true }).click();
  await expect(knowledge(page)).toHaveAttribute('aria-selected', 'true');
  expect(count).toBe(2);
});

test('数学理由修改输入后忽略旧请求迟到的通过结果', async ({ page }) => {
  await open(page); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/course/assess', async route => {
    const body = route.request().postDataJSON();
    if (body.answer === '旧的理由') await gate;
    await route.fulfill({ json: { ok: true, result: { verdict: body.answer === '旧的理由' ? 'pass' : 'retry', feedback: '需要解释数量关系。', checks: body.criteria.map(() => ({ met: body.answer === '旧的理由', feedback: '需要解释数量关系。' })) } } }).catch(() => {});
  });
  const sent = page.waitForRequest('**/api/course/assess');
  await input(page).fill('旧的理由'); await sent;
  await input(page).fill('新的理由'); release();
  await expect(reason(page).getByText('再想一想', { exact: true })).toBeVisible();
  await expect(knowledge(page)).toBeDisabled();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), taskKey);
  expect(saved['reason-checked-v1']).not.toBe(true);
});

test('数学理由中文输入组合过程中不检查，草稿刷新不自动提交', async ({ page }) => {
  await open(page, { 'reason-said-v1': '尚未说完的想法' }); let count = 0;
  await mockCourseAI(page, () => { count++; return { verdict: 'retry' }; });
  await page.waitForTimeout(2100); expect(count).toBe(0);
  await input(page).dispatchEvent('compositionstart');
  await input(page).fill('十根捆成一捆');
  await page.waitForTimeout(2100); expect(count).toBe(0);
  await input(page).dispatchEvent('compositionend');
  await expect(reason(page).getByText('再想一想', { exact: true })).toBeVisible();
  expect(count).toBe(1);
});

test('数学理由离开页面时停止录音，不提交已取消的录音', async ({ page }) => {
  await open(page); let count = 0;
  await mockCourseAI(page, () => { count++; return {}; });
  await reason(page).getByRole('button', { name: '🎤 我来讲理由', exact: true }).click();
  await expect(reason(page).getByRole('button', { name: '说完了', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '返回数学目录', exact: true }).click();
  await expect(reason(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__courseMicStops)).toBeGreaterThan(0);
  expect(count).toBe(0);
});
