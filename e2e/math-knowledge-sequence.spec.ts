import { expect, test, type Page } from '@playwright/test';
import { MATH_KNOWLEDGE_EXTENSION } from '../src/content/mathKnowledgeExtension';

const child = 'knowledge-sequence-child';
test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
async function open(page: Page, lesson: string, complete = false) {
  await page.route('**/api/**', route => route.fulfill({ json: { ok: false, ttsConfigured: false } }));
  await page.addInitScript(({ child, lesson, complete }) => {
    if (sessionStorage.getItem('knowledge-sequence-seeded')) return;
    sessionStorage.setItem('knowledge-sequence-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false,
      profiles: [{ id: child, name: '知识延伸体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false } }));
    localStorage.setItem(`sfz-math-flow-v4:${child}:#/math-course/${lesson}`, JSON.stringify({ contentVersion: 4, phase: 2, unlocked: complete ? 4 : 2, actionDone: true, knowledgeDone: complete }));
    localStorage.setItem(`sfz-math-task-v1:${child}:${lesson}`, JSON.stringify({ 'reason-ready-v1': true }));
  }, { child, lesson, complete });
  await page.goto(`/#/math-course/${lesson}`);
  await expect(page.locator('.boot-splash')).toBeHidden();
  await page.getByRole('tab', { name: /知识延伸/ }).click();
}
async function readLecture(page: Page) {
  const bridge = page.getByRole('region', { name: '本课知识延伸', exact: true });
  await bridge.getByRole('button', { name: '看完讲解，去动手 →', exact: true }).click();
}

test('知识延伸三步按顺序解锁，捆十结果保留，最后才完成并进入检测', async ({ page }) => {
  await open(page, 'ten-again');
  const bridge = page.getByRole('region', { name: '本课知识延伸', exact: true });
  await expect(bridge.getByRole('tab')).toHaveCount(3);
  await expect(bridge.getByRole('tab', { name: /先听讲解/ })).toHaveAttribute('aria-selected', 'true');
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toBeDisabled();
  await expect(bridge.getByRole('button', { name: MATH_KNOWLEDGE_EXTENSION['ten-again'].answer, exact: true })).toBeHidden();
  await page.screenshot({ path: 'tmp/math-knowledge-sequence/讲解.png' });
  await readLecture(page);
  for (let index = 1; index <= 4; index++) await bridge.getByRole('button', { name: `第 ${index} 根小棒`, exact: true }).click();
  await page.reload();
  await expect(bridge.getByRole('tab', { name: /再动手/ })).toHaveAttribute('aria-selected', 'true');
  await expect(bridge.getByText('已数 4 根，还差 6 根', { exact: true })).toBeVisible();
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toBeDisabled();
  for (let index = 5; index <= 10; index++) await bridge.getByRole('button', { name: `第 ${index} 根小棒`, exact: true }).click();
  await expect(bridge.locator('[data-math-bundle="10"]')).toBeVisible();
  await expect(bridge.getByRole('tab', { name: /再动手/ })).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: 'tmp/math-knowledge-sequence/动手.png' });
  await bridge.getByRole('button', { name: '完成了，去试一试 →', exact: true }).click();
  await page.screenshot({ path: 'tmp/math-knowledge-sequence/新情景.png' });
  await bridge.getByRole('button', { name: '变成 1 根', exact: true }).click();
  await expect(page.locator('.mt-phase-nav-math').getByRole('button', { name: /小检测/ })).toBeDisabled();
  await bridge.getByRole('button', { name: '仍是 10 根', exact: true }).click();
  await expect(page.locator('.mt-phase-nav-math').getByRole('button', { name: /小检测/ })).toHaveClass(/active/);
  expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-math-flow-v4:${child}:#/math-course/ten-again`) ?? '{}').knowledgeDone, child)).toBe(true);
});

test('已完成知识延伸可回看三步，重做从讲解开始且刷新保留历史完成', async ({ page }) => {
  await open(page, 'plus-nine', true);
  const bridge = page.getByRole('region', { name: '本课知识延伸', exact: true });
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toBeEnabled();
  await bridge.getByRole('tab', { name: /再动手/ }).click();
  await expect(bridge.locator('.mt-knowledge-ten .added')).toHaveCount(1);
  await bridge.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(bridge.getByRole('tab', { name: /先听讲解/ })).toHaveAttribute('aria-selected', 'true');
  await expect(bridge.getByRole('tab', { name: /先听讲解/ })).toHaveAttribute('aria-selected', 'true');
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toBeDisabled();
  await page.reload();
  await page.getByRole('tab', { name: /知识延伸/ }).click();
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toBeEnabled();
  expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-math-flow-v4:${child}:#/math-course/plus-nine`) ?? '{}').knowledgeDone, child)).toBe(true);
});

const linePaths: Record<string, number[]> = {
  'order-twenty': [12, 11, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  ordinal: [1, 2, 5, 4, 3, 2],
  'between-positions': [3, 7, 4, 5, 6],
  zero: [0, 1, 2, 3, 4],
  'six-to-nine': [5, 6, 7, 8],
  'compare-order-nine': [6, 7, 8, 9],
  'review-numbers': [15, 16, 17, 18],
};
for (const [lesson, path] of Object.entries(linePaths)) test(`${lesson} 知识桥数线有明确动作、点击反馈与实际完成门槛`, async ({ page }) => {
  await open(page, lesson); await readLecture(page);
  const bridge = page.getByRole('region', { name: '本课知识延伸', exact: true });
  const route = bridge.getByRole('group', { name: /小朋友队伍|一步一格的路线/ });
  const button = (value: number) => route.getByRole('button', { name: new RegExp(` ${value}$`) });
  await expect(bridge.getByRole('button', { name: /看好了|完成了，去试一试/ })).toHaveCount(0);
  await button(path[0]).click(); await expect(button(path[0])).toHaveAttribute('aria-pressed', 'true');
  await expect(button(path[0])).toHaveClass(/reached/);
  if (lesson === 'order-twenty') {
    await button(11).click(); await page.reload();
    await expect(bridge.getByRole('status')).toContainText('已走 1 步');
    await expect(page.locator('.boot-splash')).toBeHidden();
    await page.screenshot({ path: 'tmp/math-knowledge-sequence/路线操作-1024.png' });
  }
  const remaining = lesson === 'order-twenty' ? path.slice(2) : path.slice(1);
  for (const value of remaining.slice(0, -1)) await button(value).click();
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toBeDisabled();
  await button(remaining[remaining.length - 1]).click();
  await expect(bridge.getByRole('status')).toContainText('✓');
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toBeEnabled();
  const overflow = await route.evaluate(el => el.scrollWidth > el.clientWidth + 1);
  expect(overflow).toBe(false);
  if (lesson === 'order-twenty') {
    await page.screenshot({ path: 'tmp/math-knowledge-sequence/路线完成-1024.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
    await expect(route).toBeVisible();
    await page.screenshot({ path: 'tmp/math-knowledge-sequence/路线完成-1280-dark.png' });
  }
  await bridge.getByRole('button', { name: '完成了，去试一试 →', exact: true }).click();
  await expect(bridge.getByRole('tab', { name: /换个情景/ })).toHaveAttribute('aria-selected', 'true');
});
