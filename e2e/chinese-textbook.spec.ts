import { dragChineseWord } from './chinese-order-helpers';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { CHINESE_BOOK_UNITS, CHINESE_TEXTBOOK_LESSONS } from '../src/content/chineseTextbookCurriculum';
import { CHINESE_PINYIN_STUDY } from '../src/content/chinesePinyinStudy';
import { CHINESE_PINYIN_TRIALS } from '../src/content/chinesePinyinTrials';
import { getChineseTeaching } from '../src/content/chineseTeaching';
import { CHINESE_KNOWLEDGE_EXTENSION } from '../src/content/chineseKnowledgeExtension';
import { CHINESE_PINYIN_AUDIO } from '../src/content/chinesePinyinAudio';
import { CHINESE_PINYIN_GARDENS } from '../src/content/chinesePinyinGardenStudy';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

async function recordSelf(scope: Locator) {
  await scope.getByRole('button', { name: '我已实际练习，开始检查', exact: true }).click();
  await scope.getByRole('button', { name: '记录：我练习了', exact: true }).click();
}
async function observeAndRead(page: Page) {
  await expect(page.locator('.ct-scene-hotspot').first()).toBeVisible();
  for (const button of await page.locator('.ct-scene-hotspot').all()) await button.click();
  await expect(page.locator('.ct-phase-nav button').nth(1)).toHaveClass(/active/);
  await page.getByRole('button', { name: '我已完整听读或读过' }).click();
  await expect(page.locator('.ct-phase-nav button').nth(2)).toHaveClass(/active/);
}
async function phase(page: Page, id: string, value: number) {
  await page.addInitScript(({ id, value }) => {
    localStorage.setItem(`sfz-chinese-flow-v1:chinese-textbook-child:${id}`, JSON.stringify({ phase: value, unlocked: value }));
  }, { id, value });
  await page.goto(`/#/chinese-course/${id}`);
  await expect(page.locator('.ct-phase-nav button').nth(value)).toHaveClass(/active/);
}
async function evidence(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('sfz-chinese-evidence-v1:chinese-textbook-child') ?? '[]') as Array<{ skill: string; level: string; source: string; taskId: string; context: string }>);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('chinese-teaching-seeded')) return;
    sessionStorage.setItem('chinese-teaching-seeded', '1');
    // 模拟文字识别回填，验证机器不据此评价实际发音。
    class FakeSR {
      lang = ''; continuous = false; interimResults = false;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onend: (() => void) | null = null; onerror: (() => void) | null = null;
      start() {
        setTimeout(() => {
          const target = document.querySelector('.ct-follow-line')?.textContent ?? '我是中国人';
          this.onresult?.({ results: [[{ transcript: target }]] });
          this.onend?.();
        }, 150);
      }
      stop() { this.onend?.(); }
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeSR;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeSR;
    const childId = 'chinese-textbook-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: false, musicOn: false, voiceOn: false,
        profiles: [{ id: childId, name: '语文体验生', avatarId: 'boy', age: 6, createdAt: Date.now() }],
        activeChildId: childId, records: [], mastery: {}, lessonProgress: {}, charBag: {},
        wrongs: {}, points: { [childId]: 0 }, pointLog: { [childId]: [] },
        customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
      },
      version: 0,
    }));
    localStorage.removeItem(`sfz-chinese-textbook-progress:${childId}`);
  });
});

test('整册45课保留教材目录', async ({ page }) => {
  await page.goto('/#/subject/chinese');
  await expect(page.getByRole('heading', { name: '一年级语文上册' })).toBeVisible();
  await expect(page.locator('.ct-unit-buttons button')).toHaveCount(9);
  for (const [index, tab] of (await page.locator('.ct-unit-buttons button').all()).entries()) {
    await tab.click();
    await expect(page.locator('.ct-lesson-entry')).toHaveCount(CHINESE_BOOK_UNITS[index].lessonIds.length);
  }
});

for (const scenario of [
  { name: 'Web 目录进入课程', lessonId: 'little-boat', unit: 7, viewport: { width: 1280, height: 900 }, direct: false },
  { name: 'Pad 直接进入课程', lessonId: 'crow-drinks-water', unit: 8, viewport: { width: 768, height: 1024 }, direct: true },
]) test(`返回目录定位：${scenario.name}保留所属单元，刷新也保留`, async ({ page }) => {
  await page.setViewportSize(scenario.viewport);
  if (scenario.direct) await page.goto(`/#/chinese-course/${scenario.lessonId}`);
  else {
    await page.goto('/#/subject/chinese');
    await page.locator('.ct-unit-buttons button').nth(scenario.unit).click();
    await page.locator(`.ct-lesson-${scenario.lessonId}`).click();
  }
  await page.getByRole('button', { name: '返回语文目录', exact: true }).click();
  await expect(page.locator('.ct-unit-buttons button').nth(scenario.unit)).toHaveClass(/active/);
  await expect(page.locator(`.ct-lesson-${scenario.lessonId}`)).toBeVisible();
  await page.reload();
  await expect(page.locator('.ct-unit-buttons button').nth(scenario.unit)).toHaveClass(/active/);
  await page.locator(`.ct-lesson-${scenario.lessonId}`).click();
  await page.goBack();
  await expect(page.locator('.ct-unit-buttons button').nth(scenario.unit)).toHaveClass(/active/);
});

test('完成课程后返回所属单元，不回到第一单元', async ({ page }) => {
  await phase(page, 'crow-drinks-water', 4);
  const questions = CHINESE_TEXTBOOK_LESSONS.find((lesson) => lesson.id === 'crow-drinks-water')!.questions;
  for (const question of questions) {
    await page.locator('.ct-challenge-options').getByText(question.options[question.answer], { exact: true }).click();
    await expect(page.locator('.ct-challenge-options button.correct')).toHaveCount(0);
  }
  await expect(page).toHaveURL(/subject\/chinese/);
  await expect(page.locator('.ct-unit-buttons button').nth(8)).toHaveClass(/active/);
  await expect(page.locator('.ct-lesson-crow-drinks-water.done')).toBeVisible();
});

test('完整入学课：可选知识桥、真实拼句与交流、迁移取证和奖励分别记录', async ({ page }) => {
  await page.goto('/#/chinese-course/china');
  await expect(page.locator('.ct-phase-nav button').nth(1)).toBeDisabled();
  await observeAndRead(page);
  for (const button of await page.locator('.ct-word-grid button').all()) await button.click();
  await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
  await page.locator('.ct-phase-nav button').nth(3).click();
  await expect(page.locator('.ct-phase-nav button').nth(3)).toHaveClass(/active/);
  const operation = page.getByRole('region', { name: '配对与排序任务' });
  const next = page.locator('.ct-phase-nav button').nth(4);
  await expect(next).toBeDisabled();
  for (const [index, item] of ['中华民族', '是', '一家'].entries()) await dragChineseWord(page, operation, item, index);
  await operation.getByRole('button', { name: '检查这项任务' }).click();
  await expect(next).toBeDisabled();
  await page.getByRole('tab', { name: /口语练习/ }).click();
  const oral = page.getByRole('region', { name: '真实表达与交流' });
  await oral.getByRole('button', { name: '需要帮助：听示范、看句式' }).click();
  await expect(oral.getByRole('button', { name: '家人：独立完成' })).toBeDisabled();
  await oral.getByRole('button', { name: '收起句式，自己试试' }).click();
  await recordSelf(oral);
  expect((await evidence(page)).find((row) => row.taskId === 'oral-transfer')).toMatchObject({ source: 'self', level: 'practiced' });
  await expect(next).toHaveClass(/active/);
  const questions = CHINESE_TEXTBOOK_LESSONS.find((lesson) => lesson.id === 'china')!.questions;
  await page.locator('.ct-challenge-options').getByText(questions[0].options.find((_, index) => index !== questions[0].answer)!, { exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sfz-chinese-practice-v1:chinese-textbook-child:china:challengeHelped'))).toBe('true');
  await page.reload();
  for (const question of questions) {
    await page.locator('.ct-challenge-options').getByText(question.options[question.answer], { exact: true }).click();
    await expect(page.locator('.ct-challenge-options button.correct')).toHaveCount(0);
  }
  expect((await evidence(page)).find((row) => row.taskId === 'challenge:0')).toMatchObject({ level: 'supported' });
  await expect(page.getByRole('region', { name: '语文学习完成', exact: true })).toBeVisible();
  await page.getByRole('region', { name: '语文学习完成', exact: true }).getByRole('button', { name: '返回语文目录', exact: true }).click();
  await expect(page).toHaveURL(/subject\/chinese/);
  await expect(page.locator('.ct-lesson-entry.done')).toContainText('我是中国人');
  expect((await evidence(page)).filter((row) => row.source === 'self').every((row) => row.level === 'practiced')).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('sfz-chinese-practice-v1:chinese-textbook-child:china:')))).toBe(false);
});

test('园地按教材材料学习，活动和观察断点可刷新继续', async ({ page }) => {
  await phase(page, 'garden-2', 2);
  const activities = CHINESE_PINYIN_GARDENS['garden-2'];
  for (const button of await page.locator('.ct-pinyin-garden-material:visible button').all()) await button.click();
  await expect(page.getByRole('tab', {name:/想一想/,selected:true})).toBeVisible();
  await page.locator('.ct-pinyin-garden-question:visible').getByText(activities[0].answer, { exact: true }).click();
  await expect(page.getByRole('tab', {name:/教材任务 2/,selected:true})).toBeVisible();
  await page.locator('.ct-pinyin-garden-material:visible button').first().click();
  await page.reload();
  await expect(page.locator('.ct-pinyin-panel-head:visible')).toContainText(activities[1].title);
  await expect(page.locator('.ct-pinyin-garden-material:visible button').first()).toHaveClass(/seen/);
  await expect(page.locator('.ct-phase-nav button').nth(3)).toBeDisabled();
});

test('语音识别只展示识别文字，不打发音分、不强制逐句过关', async ({ page }) => {
  await page.addInitScript(() => {
    class PartialRecognition {
      onresult: ((event: unknown) => void) | null = null; onend: (() => void) | null = null;
      start() { setTimeout(() => { this.onresult?.({ results: [[{ transcript: '我是' }]] }); this.onend?.(); }, 50); }
      abort() {}
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = PartialRecognition;
  });
  await phase(page, 'china', 1);
  await page.locator('.ct-read-follow').first().click();
  await expect(page.locator('.ct-follow-scores')).toContainText('识别到：我是');
  await expect(page.locator('.ct-follow-card')).not.toContainText('分');
  await page.getByRole('button', { name: '完成，记录这次练习' }).click();
  expect((await evidence(page))[0]).toMatchObject({ level: 'practiced', source: 'self' });
  await page.getByRole('button', { name: '我已完整听读或读过' }).click();
  await expect(page.locator('.ct-phase-nav button').nth(2)).toHaveClass(/active/);
  await page.addInitScript(() => {
    const target = window as unknown as Record<string, unknown>;
    target.SpeechRecognition = undefined; target.webkitSpeechRecognition = undefined;
    localStorage.removeItem('sfz-chinese-evidence-v1:chinese-textbook-child');
  });
  await page.reload();
  await page.locator('.ct-read-follow').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await evidence(page)).toEqual([]);
  await page.getByRole('button', { name: '我已线下读过，记录练习' }).click();
  expect((await evidence(page))[0]).toMatchObject({ source: 'self', level: 'practiced' });
});

test('拼音静音时提供实际线下听辨，自己拼读与表达分别必做', async ({ page }) => {
  await phase(page, 'pinyin-a-o-e', 2);
  const letters = page.locator('.ct-pinyin-letter-grid button');
  await letters.first().click();
  await page.reload();
  await expect(letters.first()).toHaveClass(/seen/);
  for (const button of await letters.all()) await button.click();
  await expect(page.getByRole('tab',{name:/声调与拼读/,selected:true})).toBeVisible();
  for (const vowel of ['a', 'o', 'e']) {
    await page.locator('.ct-tone-demo').getByRole('button', { name: vowel, exact: true }).click();
    await page.locator('.ct-tone-road-grid > button').first().click();
  }
  await expect(page.getByRole('tab',{name:/口型示范/,selected:true})).toBeVisible();
  for (const button of await page.locator('.ct-mouth-card').all()) {
    await button.click();
    await expect(button).not.toHaveClass(/is-demonstrating/);
  }
  await expect(page.getByRole('tab',{name:/规律验证/,selected:true})).toBeVisible();
  await expect(page.getByRole('button', { name: '听聪聪解释规则' })).toHaveCount(0);
  await page.locator('.ct-pinyin-check').getByText(CHINESE_PINYIN_STUDY['pinyin-a-o-e'].check.answer, { exact: true }).click();
  await expect(page.locator('.ct-phase-nav button').nth(3)).toBeDisabled();
  await expect(page.getByRole('tab',{name:/听辨练习/,selected:true})).toBeVisible();
  for (let index = 0; index < 2; index++) {
    const listening = page.getByRole('region', { name: '新音节听辨' });
    await expect(listening.getByRole('button', { name: '听真人音节录音' })).toBeDisabled();
    await listening.getByRole('button',{name:'请家人帮助，或线下听辨',exact:true}).click();
    await recordSelf(page.locator('.ct-offline-check'));
  }
  await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
  await page.locator('.ct-phase-nav button').nth(3).click();
  await expect(page.locator('.ct-phase-nav button').nth(3)).toHaveClass(/active/);
  await page.getByRole('tab',{name:/拼音表达/}).click();
  await recordSelf(page.getByRole('region', { name: '自己拼读新音节' }));
  await expect(page.getByRole('tab',{name:/口语练习/,selected:true})).toBeVisible();
  await expect(page.locator('.ct-phase-nav button').nth(4)).toBeDisabled();
  await recordSelf(page.getByRole('region', { name: '真实表达与交流' }));
  await expect(page.locator('.ct-phase-nav button').nth(4)).toHaveClass(/active/);
});

test('真人录音听完才可选择，答错后重试记录为需要提示', async ({ page }) => {
  await page.addInitScript(() => {
    const stored = JSON.parse(localStorage.getItem('smart-fun-zone')!); stored.state.sound = true; stored.state.voiceOn = true;
    localStorage.setItem('smart-fun-zone', JSON.stringify(stored));
    HTMLMediaElement.prototype.play = function () { setTimeout(() => this.dispatchEvent(new Event('ended')), 40); return Promise.resolve(); };
  });
  await phase(page, 'pinyin-b-p-m-f', 4);
  const listening = page.getByRole('region', { name: '新音节听辨' });
  const trial = CHINESE_PINYIN_TRIALS['pinyin-b-p-m-f'][2];
  await expect(listening.getByRole('button', { name: trial.target, exact: true })).toBeDisabled();
  await listening.getByRole('button', { name: '听真人音节录音' }).click();
  await listening.getByRole('button', { name: trial.choices.find((choice) => choice !== trial.target)!, exact: true }).click();
  await listening.getByRole('button', { name: trial.target, exact: true }).click();
  expect((await evidence(page)).find((row) => row.taskId === `listen:${trial.target}`)).toMatchObject({ source: 'check', level: 'supported' });
});

async function readingAudioSetup(page: Page, configured = false) {
  await page.route('**/api/health', (route) => route.fulfill({ json: { ok: true, ttsConfigured: configured } }));
  await page.addInitScript(() => {
    const stored = JSON.parse(localStorage.getItem('smart-fun-zone')!);
    stored.state.sound = true; stored.state.voiceOn = true;
    localStorage.setItem('smart-fun-zone', JSON.stringify(stored));
    const events: {src: string; event: string}[] = [];
    (window as unknown as {readingAudioEvents: typeof events}).readingAudioEvents = events;
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      events.push({ src: this.src, event: 'play' });
      this.addEventListener('ended', () => events.push({src: this.src, event: 'ended'}), {once: true});
      return original.call(this);
    };
  });
}
async function readingAudioEvents(page: Page) {
  return page.evaluate(() => (window as unknown as {readingAudioEvents: {src: string; event: string}[]}).readingAudioEvents);
}

for (const width of [1280, 768]) test(`完整听读拼音：${width}px四声真人录音实际播放并结束`, async ({ page }) => {
  await page.setViewportSize({width, height: 1024});
  await readingAudioSetup(page);
  await phase(page, 'pinyin-b-p-m-f', 1);
  await page.evaluate(() => { (window as unknown as {readingAudioEvents: unknown[]}).readingAudioEvents.length = 0; });
  await page.locator('.ct-read-line > button:first-child').nth(1).click();
  await expect(page.locator('.ct-reading-stage [role=status]')).toHaveText('朗读播放完成，可以再听一遍。', { timeout: 15_000 });
  const events = await readingAudioEvents(page);
  expect(events.filter((event) => event.event === 'play').map((event) => event.src.split('/').pop())).toEqual(['pinyin-ba1.mp3', 'pinyin-ba2.mp3', 'pinyin-ba3.mp3', 'pinyin-ba4.mp3']);
  expect(events.filter((event) => event.event === 'ended')).toHaveLength(4);
});

test('完整听读拼音：连起来听不会因中文服务不可用丢掉音节', async ({ page }) => {
  await readingAudioSetup(page);
  await phase(page, 'pinyin-b-p-m-f', 1);
  await page.evaluate(() => { (window as unknown as {readingAudioEvents: unknown[]}).readingAudioEvents.length = 0; });
  await page.getByRole('button', {name: '🔊 连起来听', exact: true}).click();
  await expect(page.locator('.ct-reading-stage [role=status]')).toContainText('朗读未完整播完', { timeout: 15_000 });
  expect((await readingAudioEvents(page)).filter((event) => event.event === 'ended').map((event) => event.src.split('/').pop())).toEqual(['pinyin-ba1.mp3', 'pinyin-ba1.mp3', 'pinyin-ba2.mp3', 'pinyin-ba3.mp3', 'pinyin-ba4.mp3']);
});

test('完整听读拼音：返回目录立即停止队列，不播放剩余四声', async ({ page }) => {
  await readingAudioSetup(page);
  await phase(page, 'pinyin-b-p-m-f', 1);
  await page.evaluate(() => { (window as unknown as {readingAudioEvents: unknown[]}).readingAudioEvents.length = 0; });
  await page.locator('.ct-read-line > button:first-child').nth(1).click();
  await expect.poll(async () => (await readingAudioEvents(page)).filter((event) => event.event === 'play').length).toBe(1);
  await page.getByRole('button', {name: '返回语文目录', exact: true}).click();
  await expect(page.getByRole('heading', {name: '一年级语文上册'})).toBeVisible();
  const stoppedAt = (await readingAudioEvents(page)).filter((event) => event.event === 'play').length;
  await page.waitForTimeout(1600);
  expect((await readingAudioEvents(page)).filter((event) => event.event === 'play')).toHaveLength(stoppedAt);
});

test('完整听读拼音：静音时明确提示，不启动播放', async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as {readingAudioEvents: unknown[]}).readingAudioEvents = []; });
  await phase(page, 'pinyin-a-o-e', 1);
  await page.evaluate(() => { (window as unknown as {readingAudioEvents: unknown[]}).readingAudioEvents.length = 0; });
  await page.getByRole('button', {name: '🔊 连起来听', exact: true}).click();
  await expect(page.locator('.ct-reading-stage [role=status]')).toContainText('声音或语音已关闭');
  expect(await readingAudioEvents(page)).toEqual([]);
});

test('完整听读拼音：o单韵母直接送合成服务并播放，保留重复三次', async ({ page }) => {
  await readingAudioSetup(page, true);
  const texts: string[] = [];
  const audio = readFileSync('public/assets/chinese-textbook/audio/pinyin-a1.mp3').toString('base64');
  await page.route('**/api/volc-tts/**', (route) => {
    texts.push(route.request().postDataJSON().req_params.text);
    return route.fulfill({contentType: 'text/event-stream', body: `data: ${JSON.stringify({code: 0, data: audio})}\n\ndata: ${JSON.stringify({code: 20000000})}\n\n`});
  });
  await phase(page, 'pinyin-a-o-e', 1);
  await page.evaluate(() => { (window as unknown as {readingAudioEvents: unknown[]}).readingAudioEvents.length = 0; });
  await page.locator('.ct-read-line > button:first-child').nth(1).click();
  await expect(page.locator('.ct-reading-stage [role=status]')).toHaveText('朗读播放完成，可以再听一遍。', { timeout: 15_000 });
  expect(texts).toContain('ō');
  expect(texts.some((text) => /喔|窝/.test(text))).toBe(false);
  expect((await readingAudioEvents(page)).filter((event) => event.event === 'ended' && event.src.startsWith('blob:'))).toHaveLength(4);
});

test('书写观察不冒充会写，纸笔细项可刷新继续且只记录练习', async ({ page }) => {
  await phase(page, 'autumn', 2);
  for (const button of await page.locator('.ct-recognize-grid button').all()) await button.click();
  await page.getByRole('tab',{name:/写字观察/}).click();
  for (const button of await page.locator('.ct-writing-grid > button').all()) await button.click();
  await page.getByRole('tab',{name:/实际书写/}).click();
  expect((await evidence(page)).some((row) => row.skill === 'writing')).toBe(false);
  const writing = page.getByRole('region', { name: '纸笔书写实践' });
  await expect(writing.getByRole('button', { name: '家人：独立完成' })).toBeDisabled();
  await recordSelf(writing);
  await expect(writing).toContainText('2/4');
  await page.reload();
  await expect(writing).toContainText('2/4');
  for (let index = 0; index < 3; index++) await recordSelf(writing);
  const rows = (await evidence(page)).filter((row) => row.skill === 'writing');
  expect(rows).toHaveLength(4);
  expect(rows.every((row) => row.level === 'practiced')).toBe(true);
});

test('阅读保留个人感受与创作，平板录音失败可以实际线下表达', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new Error('denied')) } }); });
  await phase(page, 'little-boat', 3);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  const reading = page.getByRole('region', { name: '阅读感受与想象' });
  await reading.getByRole('button', { name: getChineseTeaching('little-boat').reading!.compare[0], exact: true }).click();
  await expect(reading).toContainText('两种选择都可以');
  await page.getByRole('tab', { name: /口语练习/ }).click();
  const oral = page.getByRole('region', { name: '真实表达与交流' });
  await oral.getByRole('button', { name: '录下自己的话（可选）' }).click();
  await expect(oral).toContainText('暂时无法录音');
  await oral.getByRole('textbox').fill('我还看见软软的白云。');
  await recordSelf(oral);
  await expect(page.locator('.ct-phase-nav button').nth(4)).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/chinese-teaching-pad.png', fullPage: true });
});

test('首次田字格仍先教后写，一般知识桥不会加重必做流程', async ({ page }) => {
  await phase(page, 'metal-wood-water-fire-earth', 2);
  await expect(page.locator('[data-knowledge="tian-grid"]')).toBeVisible();
  await expect(page.locator('.ct-phase-nav button').nth(3)).toBeDisabled();
  for (const name of ['左上格', '右上格', '左下格', '右下格', '横中线', '竖中线']) await page.locator('.ct-ktian-board').getByRole('button', { name }).click();
  await page.locator('.ct-ktrail-check').getByRole('button', { name: '竖中线' }).click();
  await expect(page.locator('.ct-ktian-number-pick')).toBeVisible();
  await page.reload();
  await expect(page.locator('.ct-ktian-number-pick')).toBeVisible();
  await page.goto('/#/chinese-course/china');
  await observeAndRead(page);
  for (const button of await page.locator('.ct-word-grid button').all()) await button.click();
  await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
  await page.locator('.ct-phase-nav button').nth(3).click();
  await expect(page.locator('.ct-phase-nav button').nth(3)).toHaveClass(/active/);
  await page.locator('.ct-phase-nav button').nth(2).click();
  await page.getByRole('tab',{name:/知识桥/}).click();
  await expect(page.getByRole('button', { name: '再听方法', exact: true })).toBeVisible();
  await page.locator('.ct-ktrail-check').getByText(CHINESE_KNOWLEDGE_EXTENSION.china.answer, { exact: true }).click();
  await expect(page.locator('.ct-phase-nav button').nth(3)).toBeEnabled();
});

test('本地249个音节资源能被浏览器解码且不是空白录音', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/#/subject/chinese');
  const paths = [...new Set(Object.values(CHINESE_PINYIN_AUDIO))];
  const failed = await page.evaluate(async (paths) => {
    const audio = new AudioContext();
    const failed: string[] = [];
    for (let index = 0; index < paths.length; index += 8) {
      await Promise.all(paths.slice(index, index + 8).map(async (path) => {
        try {
          const response = await fetch(path);
          if (!response.ok) throw new Error('missing audio');
          const buffer = await audio.decodeAudioData(await response.arrayBuffer());
          if (buffer.duration <= 0 || !buffer.getChannelData(0).some((value) => Math.abs(value) > .0001)) failed.push(path);
        } catch { failed.push(path); }
      }));
    }
    await audio.close();
    return failed;
  }, paths);
  expect(paths).toHaveLength(249);
  expect(failed).toEqual([]);
});

test.describe('实际录音回听', () => {
  test.use({ permissions: ['microphone'] });
  test('录制后生成可播放的本地录音，离开清除临时回听', async ({ page }) => {
    await phase(page, 'garden-5', 3);
    await page.getByRole('tab', { name: /口语练习/ }).click();
  const oral = page.getByRole('region', { name: '真实表达与交流' });
    await oral.getByRole('button', { name: '录下自己的话（可选）' }).click();
    await expect(oral.getByRole('button', { name: '停止录音，回听' })).toBeVisible();
    await page.waitForTimeout(300); // 留出实际 MediaRecorder 数据片段。
    await oral.getByRole('button', { name: '停止录音，回听' }).click();
    const audio = oral.locator('audio');
    await expect(audio).toHaveAttribute('src', /^blob:/);
    await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.readyState)).toBeGreaterThan(0);
    await page.goto('/#/subject/chinese');
    await page.goto('/#/chinese-course/garden-5');
    await expect(page.locator('.ct-voice-notebook audio')).toHaveCount(0);
  });
});

test('复习按证据选择书写，完成后只更新复习，不冒充全课掌握', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem('sfz-review-plan-v1:chinese-textbook-child', JSON.stringify([{ id: 'chinese:crow-drinks-water', subject: 'chinese', lessonId: 'crow-drinks-water', title: '乌鸦喝水', focus: '旧题', route: '/chinese-course/crow-drinks-water', learnedAt: now, completedDays: [] }]));
    localStorage.setItem('sfz-chinese-evidence-v1:chinese-textbook-child', JSON.stringify([
      { skill: 'recognition', taskId: 'recognition:喝' }, { skill: 'expression', taskId: 'oral-transfer' }, { skill: 'reading', taskId: 'transfer-operation' }, { skill: 'writing', taskId: 'paper-writing:只', level: 'supported' },
    ].map((row) => ({ lessonId: 'crow-drinks-water', level: 'independent', source: 'adult', context: 'lesson', at: row.skill === 'writing' ? now - 4 * 86400000 : now, note: '家人观察', ...row }))));
  });
  await page.goto('/#/review');
  const card = page.locator('.review-hub-card.chinese');
  await expect(card).toContainText('书写：换一个字，纸上写后对照');
  await card.getByRole('button', { name: '开始小检验' }).click();
  await recordSelf(card.getByRole('region', { name: '纸笔书写实践' }));
  await expect(card).toHaveCount(0);
  expect((await evidence(page)).find((row) => row.context === 'review')).toMatchObject({ skill: 'writing', source: 'self', level: 'practiced' });
  expect(await page.evaluate(() => localStorage.getItem('sfz-chinese-textbook-progress:chinese-textbook-child'))).toBeNull();
});

test('下一次配对排序复习重新尝试，不继承上一次完成状态', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem('sfz-review-plan-v1:chinese-textbook-child', JSON.stringify([{ id: 'chinese:china', subject: 'chinese', lessonId: 'china', title: '我是中国人', focus: '排序', route: '/chinese-course/china', learnedAt: now, completedDays: [], reviewedOn: ['2026-10-01'] }]));
    localStorage.setItem('sfz-chinese-evidence-v1:chinese-textbook-child', JSON.stringify(['expression', 'listening', 'reading'].map((skill) => ({ lessonId: 'china', skill, taskId: skill === 'reading' ? 'transfer-operation' : 'oral-transfer', level: skill === 'reading' ? 'supported' : 'independent', source: 'adult', context: 'lesson', at: skill === 'reading' ? now - 4 * 86400000 : now, note: '家人观察' }))));
    localStorage.setItem('sfz-chinese-practice-v1:chinese-textbook-child:china:review:0:transferDone', 'true');
    localStorage.setItem('sfz-chinese-practice-v1:chinese-textbook-child:china:review:0:transferPlaced', JSON.stringify(['中华民族', '是', '一家']));
  });
  await page.goto('/#/review');
  const card = page.locator('.review-hub-card.chinese');
  await expect(card).toContainText('阅读理解：收起课文，重新配对或排序');
  await card.getByRole('button', { name: '开始小检验' }).click();
  const operation = card.getByRole('region', { name: '配对与排序任务' });
  const bank = operation.locator('.ct-order-bank button');
  const first = await bank.allTextContents();
  expect(first).not.toEqual(['中华民族', '是', '一家']);
  await operation.getByRole('button', { name: '重新排序', exact: true }).click();
  expect(await bank.allTextContents()).not.toEqual(first);
  expect(await bank.allTextContents()).not.toEqual(['中华民族', '是', '一家']);
  for (const [index, item] of ['中华民族', '是', '一家'].entries()) await dragChineseWord(page, operation, item, index);
  await operation.getByRole('button', { name: '检查这项任务' }).click();
  await expect(card).toHaveCount(0);
});

test('儿童切换不继承课程断点和口语证据', async ({ page }) => {
  await phase(page, 'garden-5', 3);
  await page.getByRole('tab',{name:/口语练习/}).click();
  await recordSelf(page.getByRole('region', { name: '真实表达与交流' }));
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('smart-fun-zone')!);
    stored.state.profiles.push({ id: 'another-child', name: '另一位儿童', avatarId: 'girl', age: 6, createdAt: Date.now() });
    stored.state.activeChildId = 'another-child'; localStorage.setItem('smart-fun-zone', JSON.stringify(stored));
  });
  await page.reload();
  await expect(page.locator('.ct-phase-nav button').nth(1)).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('sfz-chinese-evidence-v1:another-child'))).toBeNull();
});
