import { expect, test, type Page } from '@playwright/test';
import { aiWav } from './course-ai-helpers';
import { CHINESE_PINYIN_STUDY } from '../src/content/chinesePinyinStudy';
import { getChineseTextbookStudy } from '../src/content/chineseTextbookStudy';

const child = 'chinese-listening-sequence-child';
test.use({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
async function setup(page: Page, id: string, phase: number, fields: Record<string, unknown> = {}, review = false) {
  await page.route('**/api/**', async route => {
    if (route.request().url().includes('/volc-tts/')) {
      const text: string = route.request().postDataJSON().req_params.text;
      await page.evaluate(text => { (window as any).__listeningEvents.push(`tts:${text}`); }, text);
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ code: 0, data: aiWav.toString('base64') })}\n\ndata: {"code":20000000}\n\n` });
    }
    return route.fulfill({ json: { ok: true, ttsConfigured: true } });
  });
  await page.addInitScript(({ child, id, phase, fields, review }) => {
    const w = window as any;
    w.__listeningEvents = []; w.__pendingListeningAudio = []; w.__holdListeningAudio = false; w.__VOLC_TTS_ENABLED__ = true;
    HTMLMediaElement.prototype.play = function () {
      w.__listeningEvents.push(`play:${this.src}`);
      if (w.__holdListeningAudio) w.__pendingListeningAudio.push(this);
      else setTimeout(() => this.dispatchEvent(new Event('ended')), 30);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () { w.__pendingListeningAudio = w.__pendingListeningAudio.filter((audio: HTMLMediaElement) => audio !== this); };
    if (sessionStorage.getItem('listening-seeded')) return;
    sessionStorage.setItem('listening-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: { lang: 'zh', theme: 'light', sound: true, voiceOn: true, musicOn: false, profiles: [{ id: child, name: '听音体验生', ageBand: 'g1', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, records: [], mastery: {}, lessonProgress: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false } }));
    localStorage.setItem(`sfz-chinese-flow-v1:${child}:${id}`, JSON.stringify({ phase, unlocked: phase }));
    for (const [field, value] of Object.entries(fields)) localStorage.setItem(`sfz-chinese-practice-v1:${child}:${id}:${field}`, JSON.stringify(value));
    if (review) localStorage.setItem(`sfz-review-plan-v1:${child}`, JSON.stringify([{ id: `chinese:${id}`, subject: 'chinese', lessonId: id, title: '天地人', focus: '认字', route: `/chinese-course/${id}`, learnedAt: Date.now(), completedDays: [], reviewedOn: [] }]));
  }, { child, id, phase, fields, review });
  await page.goto(review ? '/#/review' : `/#/chinese-course/${id}`);
  await expect(page.locator('.boot-splash')).toBeHidden();
}
const events = (page: Page) => page.evaluate(() => (window as any).__listeningEvents as string[]);
async function finishAudio(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as any).__pendingListeningAudio.length)).toBeGreaterThan(0);
  await page.evaluate(() => { const w = window as any; const audio = w.__pendingListeningAudio.shift() as HTMLMediaElement; w.__listeningEvents.push(`end:${audio.src}`); audio.dispatchEvent(new Event('ended')); });
}

for (const kind of ['recognition', 'pinyin', 'challenge', 'review'] as const) test(`听音选择分段播报 ${kind}：认字选项静音，拼音分段播放且布局清晰`, async ({ page }) => {
  const pinyin = kind === 'pinyin' || kind === 'challenge';
  const id = pinyin ? 'pinyin-b-p-m-f' : 'heaven-earth-human';
  const pack = CHINESE_PINYIN_STUDY[id];
  await setup(page, id, kind === 'challenge' ? 4 : 2, pinyin ? { pinyinStep: 3, pinyinLetters: pack.letters.map(letter => letter.glyph), pinyinTones: pack.tones, pinyinBlends: pack.blends.map((_, index) => index), pinyinRuleSeen: true } : { studySelected: 1, 'lesson:recognitionTargets:0': ['天', '地', '人'] }, kind === 'review');
  if (kind === 'review') await page.getByRole('button', { name: '开始小检验', exact: true }).click();
  if (kind === 'pinyin') await page.getByRole('tab', { name: '听辨练习', exact: true }).click();
  const panel = page.getByRole('region', { name: pinyin ? '新音节听辨' : '脱离拼音认字检查', exact: true });
  await expect(panel).toBeVisible();
  await panel.locator('.ct-listen-question').click();
  const instruction = pinyin ? '先点击听真人音节录音' : '先点击听词语';
  await expect.poll(async () => (await events(page)).some(event => event.startsWith('tts:') && event.includes(instruction))).toBe(true);
  const entryEvents = await events(page);
  const currentEntry = entryEvents.slice(entryEvents.findIndex(event => event.startsWith('tts:') && event.includes(instruction)));
  expect(currentEntry.some(event => /tts:.*(词语是|选项一|请听选项)/.test(event))).toBe(false);
  expect(currentEntry.some(event => event.startsWith('play:') && event.endsWith('.mp3'))).toBe(false);
  await expect(panel.locator('.ct-listen-options button').first()).toBeDisabled();
  await page.evaluate(() => { const w = window as any; w.__listeningEvents = []; w.__holdListeningAudio = true; });
  await panel.getByRole('button', { name: pinyin ? '听真人音节录音' : '听词语', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__pendingListeningAudio.length)).toBe(1);
  expect((await events(page)).some(event => /tts:.*请听选项/.test(event))).toBe(false);
  await expect(panel.locator('.ct-listen-options button').first()).toBeDisabled();
  await finishAudio(page);
  if (pinyin) {
    await expect.poll(async () => (await events(page)).some(event => /tts:.*请听选项/.test(event))).toBe(true);
    const ordered = await events(page);
    expect(ordered.findIndex(event => /tts:.*请听选项/.test(event))).toBeGreaterThan(ordered.findIndex(event => event.startsWith('end:')));
    await expect(panel.locator('.ct-listen-options button').first()).toBeDisabled();
    for (let i = 0; i < 12 && await panel.locator('.ct-listen-options button').first().isDisabled(); i++) await finishAudio(page);
  } else {
    expect((await events(page)).some(event => /tts:.*(请听选项|选项一)/.test(event))).toBe(false);
    await expect(panel).not.toContainText('读选项');
  }
  await expect(panel.locator('.ct-listen-options button').first()).toBeEnabled();
  await expect(panel.locator('.ct-listen-play [role="status"]')).toContainText('听完了');
  expect(await panel.locator('.ct-listen-choice').evaluate(el => {
    const question = el.querySelector('.ct-listen-question')!.getBoundingClientRect();
    const play = el.querySelector('.ct-listen-play')!.getBoundingClientRect();
    const answer = el.querySelector('.ct-listen-answer')!.getBoundingClientRect();
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.ct-listen-options button')];
    const options = buttons.map(button => button.getBoundingClientRect());
    return question.bottom < play.top && play.bottom < answer.top && options.every((rect, index) => buttons[index].offsetHeight >= 100 && rect.height >= 44 && (index === 0 || rect.left > options[index - 1].right && Math.abs(rect.top - options[index - 1].top) <= 1));
  })).toBe(true);
  if (kind !== 'review') expect(await panel.evaluate(el => { const rect = el.getBoundingClientRect(); return rect.bottom <= innerHeight && rect.right <= innerWidth && el.scrollHeight <= el.clientHeight + 1; })).toBe(true);
  await page.screenshot({ path: `tmp/chinese-listening/${kind}-1024.png`, animations: 'disabled' });
  if (kind === 'recognition') {
    await panel.getByRole('button', { name: '天', exact: true }).click();
    await expect(panel.locator('.ct-listen-progress')).toHaveText('2 / 3');
    await expect(panel.locator('.ct-listen-options button').first()).toBeDisabled();
  }
});


for (const nextCompleted of [false, true]) test(`认字抽查只在本轮答完时跳转，已完成 tab 可回看，下一项已完成=${nextCompleted}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const id = 'heaven-earth-human';
  await setup(page, id, 2, { studySelected: 1, 'lesson:recognitionTargets:0': ['天', '地', '人'], ...(nextCompleted ? { textbookTasks: getChineseTextbookStudy(id)!.tasks.map(task => task.id) } : {}) });
  const panel = page.getByRole('region', { name: '脱离拼音认字检查', exact: true });
  await page.evaluate(() => { (window as any).__holdListeningAudio = true; });
  const answerRound = async () => {
    for (const [index, char] of ['天', '地', '人'].entries()) {
      await expect(panel.locator('.ct-listen-progress')).toHaveText(`${index + 1} / 3`);
      await panel.getByRole('button', { name: '听词语', exact: true }).click();
      await finishAudio(page);
      await expect(panel.getByRole('button', { name: char, exact: true })).toBeEnabled();
      await panel.getByRole('button', { name: char, exact: true }).click();
      await expect(page.locator('.ct-classroom')).not.toContainText('这个字找到了');
    }
  };
  await answerRound();
  const next = page.getByRole('tab', { name: '教材任务 1', exact: false });
  await expect(next).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('认字抽查完成', { exact: true })).toHaveCount(0);
  await expect(panel.locator('[data-practice-restart]')).toHaveCount(0);
  const recognition = page.getByRole('tab', { name: '认字抽查', exact: false });
  await recognition.click();
  await expect(recognition).toHaveAttribute('aria-selected', 'true');
  await expect(panel.locator('.ct-listen-progress')).toHaveText('3 / 3');
  await page.waitForTimeout(1000);
  await expect(recognition).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('认字抽查完成', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(({ child, id }) => localStorage.getItem(`sfz-chinese-practice-v1:${child}:${id}:lesson:recognitionIndex:0`), { child, id })).toBe('3');
  // Restored completion is browsing, not a new completion event.
  await page.evaluate(({ child, id }) => localStorage.setItem(`sfz-chinese-practice-v1:${child}:${id}:studySelected`, '1'), { child, id });
  await page.reload();
  await expect(recognition).toHaveAttribute('aria-selected', 'true');
  await expect(panel.locator('.ct-listen-progress')).toHaveText('3 / 3');
  await page.waitForTimeout(1000);
  await expect(recognition).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('认字抽查完成', { exact: true })).toHaveCount(0);
  await expect(panel.locator('[data-practice-restart]')).toHaveCount(0);
  expect(errors).toEqual([]);
});


test('会认的字去掉页码，只按卡片点击点读，完成推进后可手动返回', async ({ page }) => {
  await setup(page, 'heaven-earth-human', 2, { studySelected: 0 });
  const tab = page.getByRole('tab', { name: '会认的字', exact: false });
  const panel = page.getByRole('tabpanel', { name: '会认的字', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText('P8');
  await panel.locator('.ct-study-section-head').click();
  const instruction = '会认的字。逐个点读';
  await expect.poll(async () => (await events(page)).some(event => event.startsWith('tts:') && event.includes(instruction))).toBe(true);
  const initial = (await events(page)).filter(event => event.startsWith('tts:'));
  expect(initial.some(event => /答案选项|选项一|tiān|dì|rén/.test(event))).toBe(false);
  const replay = panel.getByRole('button', { name: '听说明', exact: true });
  await expect(replay).toBeEnabled();
  await page.evaluate(() => { (window as any).__listeningEvents = []; });
  await replay.click();
  await expect.poll(async () => (await events(page)).filter(event => event.startsWith('play:')).length).toBeGreaterThan(0);
  expect((await events(page)).filter(event => event.startsWith('play:'))).toHaveLength(1);
  expect((await events(page)).filter(event => event.startsWith('tts:')).every(event => event.includes(instruction) && !/答案选项|选项一|P8/.test(event))).toBe(true);
  await expect(replay).toBeEnabled();
  await page.evaluate(() => { (window as any).__listeningEvents = []; });
  const cards = panel.locator('.ct-recognize-grid button');
  await cards.first().click();
  await expect.poll(async () => (await events(page)).some(event => event.startsWith('tts:') && event.includes('天'))).toBe(true);
  expect((await events(page)).filter(event => event.startsWith('tts:')).every(event => !/选项|地|人/.test(event))).toBe(true);
  for (let index = 1; index < await cards.count(); index++) await cards.nth(index).click();
  await expect(page.getByRole('tab', { name: '认字抽查', exact: false })).toHaveAttribute('aria-selected', 'true');
  await tab.click();
  await expect(panel).toBeVisible();
  await cards.first().click();
  await page.waitForTimeout(1000);
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(panel).toBeVisible();
});
