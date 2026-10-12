import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ALL_MATH_LESSONS } from '../src/content/mathUpperCurriculum';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/math-stage-completion.json', import.meta.url), 'utf8')) as {
  base: Record<string, unknown>;
  cases: Array<{ lesson: string; complete: Record<string, unknown>; pending: Record<string, unknown>; action: { kind: string; name?: string; selector?: string; index?: number } }>;
};

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const childId = 'math-stage-completion-child';
const phases = (page: Page) => page.getByRole('navigation', { name: '本课学习步骤' });
const taskTwo = (page: Page) => page.getByRole('tab', { name: /教材任务 2/ });

async function seed(page: Page, lesson: string, snapshot: unknown, unlocked: number) {
  const persist = ({ childId, lesson, snapshot, unlocked, initial }: { childId: string; lesson: string; snapshot: unknown; unlocked: number; initial: boolean }) => {
    if (initial && sessionStorage.getItem('stage-snapshot-seeded')) return;
    localStorage.setItem(`sfz-math-task-v1:${childId}:${lesson}`, JSON.stringify(snapshot));
    localStorage.setItem(`sfz-math-flow-v4:${childId}:#/math-course/${lesson}`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked, actionDone: true, knowledgeDone: false }));
    if (initial) sessionStorage.setItem('stage-snapshot-seeded', '1');
  };
  const initial = page.url() === 'about:blank';
  if (initial) await page.addInitScript(persist, { childId, lesson, snapshot, unlocked, initial });
  else await page.evaluate(persist, { childId, lesson, snapshot, unlocked, initial });
  await page.goto(`/?completion-round=${unlocked}#/math-course/${lesson}`);
  await expect(page.locator('.boot-splash')).toBeHidden();
  await taskTwo(page).click();
}

// Walk only real unfinished required cards. Optional reflection is not a gate.
async function openPendingCards(page: Page) {
  const decks = page.locator('.math-lesson-activity-panel:visible .math-task-board-deck:visible');
  for (let depth = 0; depth < 6; depth++) {
    const deck = decks.nth(depth);
    if (!await deck.count()) return;
    const cards = deck.locator(':scope > .math-task-board-pages > [data-required="true"]');
    const pending = cards.locator('xpath=self::*[@data-complete="false"]');
    if (!await pending.count()) return;
    const id = await pending.first().getAttribute('id');
    const tab = deck.locator(':scope > nav > button');
    if (await tab.count()) await deck.locator(`:scope > nav > button[aria-controls="${id}"]`).click();
  }
}

test('全册阶段跳转检查覆盖实际 47 课，不遗漏新增或变更课时', () => {
  expect(fixtures.cases.map(row => row.lesson).sort()).toEqual(ALL_MATH_LESSONS.map(lesson => lesson.id).sort());
});

for (const row of fixtures.cases) test(`${row.lesson}：旧完成回看稳定，最后一步完成自动进入说理由`, async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(childId => {
    if (sessionStorage.getItem('stage-profile-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 6, state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false, profiles: [{ id: childId, name: '阶段检查', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: childId, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false } }));
    sessionStorage.setItem('stage-profile-seeded', '1');
  }, childId);
  const complete = { ...fixtures.base, ...row.complete };
  await seed(page, row.lesson, complete, 2);
  await expect(taskTwo(page)).toHaveClass(/done/);
  await page.waitForTimeout(1200);
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
  await seed(page, row.lesson, { ...complete, ...row.pending }, 1);
  await expect(taskTwo(page)).not.toHaveClass(/done/);
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toBeDisabled();
  await openPendingCards(page);
  const panel = page.locator('.math-lesson-activity-panel:visible');
  if (row.action.kind === 'button') await panel.getByRole('button', { name: row.action.name!, exact: true }).click();
  else await panel.locator(row.action.selector!).nth(row.action.index!).click();
  await expect(phases(page).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
  await phases(page).getByRole('button', { name: /动手试/ }).click();
  await taskTwo(page).click();
  await expect(taskTwo(page)).toHaveClass(/done/);
  await page.waitForTimeout(1200);
  await expect(phases(page).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
  expect(errors).toEqual([]);
});
