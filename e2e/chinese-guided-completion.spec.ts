import { expect, test, type Page } from '@playwright/test';
import { CHINESE_TEXTBOOK_STUDY } from '../src/content/chineseTextbookStudy';

test.use({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
const child = 'guided-completion-child';
async function setup(page: Page, lessonId: string, selected: number) {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/**', route => {
    if (route.request().url().endsWith('/api/course/assess')) {
      const task = route.request().postDataJSON(); requests.push(task);
      return route.fulfill({ json: { ok: true, result: { verdict: 'pass', feedback: '关键词补充完整了。', checks: task.criteria.map(() => ({ met: true, feedback: '关键意思清楚。' })) } } });
    }
    return route.fulfill({ json: { ok: true, ttsConfigured: false } });
  });
  await page.addInitScript(({ child, lessonId, selected }) => {
    if (sessionStorage.getItem('guided-seeded')) return;
    sessionStorage.setItem('guided-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false, profiles: [{ id: child, name: '补充练习', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, records: [], mastery: {}, lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false } }));
    localStorage.setItem(`sfz-chinese-flow-v1:${child}:${lessonId}`, JSON.stringify({ phase: 2, unlocked: 2 }));
    localStorage.setItem(`sfz-chinese-practice-v1:${child}:${lessonId}:studySelected`, JSON.stringify(selected));
  }, { child, lessonId, selected });
  await page.goto(`/#/chinese-course/${lessonId}`);
  await expect(page.locator('.boot-splash')).toBeHidden();
  return requests;
}

test('只填一空不检查，刷新保存，填完关键词后组成一句回答并自动推进', async ({ page }) => {
  const requests = await setup(page, 'heaven-earth-human', 2);
  const task = CHINESE_TEXTBOOK_STUDY['heaven-earth-human'].tasks[0];
  const completion = task.completion!;
  const answer = page.getByRole('group', { name: '补充关键信息' });
  await expect(answer.getByRole('textbox')).toHaveCount(2);
  await expect(page.locator('.ct-study-activity:visible textarea')).toHaveCount(0);
  await answer.getByRole('textbox', { name: '我指谁', exact: true }).fill('说话的人');
  await page.waitForTimeout(2100);
  expect(requests).toHaveLength(0);
  await page.reload();
  await expect(answer.getByRole('textbox', { name: '我指谁', exact: true })).toHaveValue('说话的人');
  await expect(answer.getByRole('textbox', { name: '他指谁', exact: true })).toHaveValue('');
  expect(requests).toHaveLength(0);
  await answer.getByRole('textbox', { name: '他指谁', exact: true }).fill('另外的人');
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].answer).toBe(completion.frame.replace('____', '说话的人').replace('____', '另外的人'));
  expect(requests[0].criteria).toEqual(completion.criteria);
  expect(requests[0].supported).toBe(true);
  await expect(page.getByRole('tab', { name: '知识桥', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('一个空格的题不用写整句，空白不检查，补充关键词即可提交', async ({ page }) => {
  const requests = await setup(page, 'sun-moon-mountain-river', 5);
  const answer = page.getByRole('group', { name: '补充关键信息' });
  await expect(answer.getByRole('textbox')).toHaveCount(1);
  await answer.getByRole('textbox').fill('   ');
  await page.waitForTimeout(2100);
  expect(requests).toHaveLength(0);
  await answer.getByRole('textbox').fill('山峰');
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].answer).toBe('“山”字中间高高的一竖，像山峰。');
  expect(requests[0].requirement).toBe('answer');
  await expect(page.getByRole('tab', { name: '知识桥', exact: true })).toHaveAttribute('aria-selected', 'true');
});
