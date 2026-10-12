import { CHINESE_PINYIN_STUDY } from '../src/content/chinesePinyinStudy';
import { expect, test, type Page } from '@playwright/test';

const child = 'explanation-autoplay-child';
test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
type AudioState = { __lectureHold: boolean; __lectureReads: string[]; __lecturePending?: { onended?: () => void; onerror?: () => void }; __lectureOld?: { onended?: () => void } };
async function setup(page: Page, subject: 'math' | 'english' | 'chinese', lesson: string, complete = false, failure = false, voice = true, hold = subject === 'math') {
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/volc-tts/')) {
      const text = route.request().postDataJSON().req_params.text;
      return route.fulfill({ contentType: 'text/event-stream', body: failure ? 'data: {"code":20000000}\n\n' : `data: ${JSON.stringify({ code: 0, data: Buffer.from(JSON.stringify({ text })).toString('base64') })}\n\n` });
    }
    return route.fulfill({ json: { ok: true, ttsConfigured: true } });
  });
  await page.addInitScript(({ child, subject, lesson, complete, voice, hold }) => {
    const w = window as unknown as AudioState & { Audio: typeof Audio; __VOLC_TTS_ENABLED__: boolean };
    w.__VOLC_TTS_ENABLED__ = true; w.__lectureHold = hold; w.__lectureReads = [];
    w.Audio = class {
      onended?: () => void; onerror?: () => void;
      constructor(private src: string) {}
      async play() { const raw = await fetch(this.src).then(response => response.text()); let payload: { text: string }; try { payload = JSON.parse(raw); } catch { payload = { text: '本地音节录音' }; } w.__lectureReads.push(payload.text); w.__lecturePending = this; if (!w.__lectureHold) setTimeout(() => this.onended?.(), 0); }
      pause() {}
    } as unknown as typeof Audio;
    if (sessionStorage.getItem('lecture-seeded')) return;
    sessionStorage.setItem('lecture-seeded', '1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: { lang: 'zh', theme: 'light', sound: voice, voiceOn: voice, musicOn: false, profiles: [{ id: child, name: '自动讲解体验生', ageBand: subject === 'math' ? 'g1' : 'g3', avatar: '🐼', createdAt: Date.now() }], activeChildId: child, mastery: {}, records: [], lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false } }));
    if (subject === 'math') {
      localStorage.setItem(`sfz-math-flow-v4:${child}:#/math-course/${lesson}`, JSON.stringify({ contentVersion: 4, phase: 2, unlocked: complete ? 4 : 2, actionDone: true, knowledgeDone: complete }));
      localStorage.setItem(`sfz-math-task-v1:${child}:${lesson}`, JSON.stringify({ 'reason-ready-v1': true }));
    } else if (subject === 'chinese') {
      localStorage.setItem(`sfz-chinese-flow-v1:${child}:${lesson}`, JSON.stringify({ phase: 2, unlocked: 3 }));
      localStorage.setItem(`sfz-chinese-practice-v1:${child}:${lesson}:pinyinStep`, '3');
    } else localStorage.setItem(`sfz-english-g3a-flow-v6:${child}:${lesson}`, JSON.stringify({ phase: 1, unlocked: 4 }));
  }, { child, subject, lesson, complete, voice, hold });
  await page.goto(`/#/${subject}-course/${lesson}`);
  await expect(page.locator('.boot-splash')).toBeHidden();
}
const bridge = (page: Page) => page.getByRole('region', { name: '本课知识延伸', exact: true });
const reads = (page: Page) => page.evaluate(() => (window as unknown as AudioState).__lectureReads);
const finishAudio = (page: Page) => page.evaluate(() => (window as unknown as AudioState).__lecturePending?.onended?.());
const lectureCount = async (page: Page) => (await reads(page)).filter(text => text.includes('数线上的左右位置')).length;

test('order-twenty 先听讲解自动完整播放一次，公共按钮可重播，回看不跳走', async ({ page }) => {
  await setup(page, 'math', 'order-twenty'); await page.getByRole('tab', { name: /知识延伸/ }).click();
  await expect.poll(() => lectureCount(page)).toBe(1);
  const text = (await reads(page)).find(text => text.includes('数线上的左右位置'))!;
  expect(text).toContain('例如'); expect(text).toContain('先找两个点'); expect(text).toContain('记住');
  await expect(bridge(page).getByRole('button', { name: /听讲解|停止讲解/ })).toHaveCount(0);
  await bridge(page).getByText('聪聪老师讲方法', { exact: true }).click();
  await page.waitForTimeout(450); expect(await lectureCount(page)).toBe(1);
  await page.screenshot({ path: 'tmp/course-explanation/数学讲解-1024.png' });
  await finishAudio(page); await expect(bridge(page).getByRole('tab', { name: /再动手/ })).toHaveAttribute('aria-selected', 'true');
  await bridge(page).getByRole('tab', { name: /先听讲解/ }).click();
  await expect.poll(() => lectureCount(page)).toBe(2); await finishAudio(page);
  await expect(bridge(page).getByRole('tab', { name: /先听讲解/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: '再听一遍讲解', exact: true }).click();
  await expect.poll(() => lectureCount(page)).toBe(3); await finishAudio(page);
  await expect(bridge(page).getByRole('tab', { name: /先听讲解/ })).toHaveAttribute('aria-selected', 'true');
});

test('纯观察模型也自动讲一次，完整播完才进入新情景', async ({ page }) => {
  await setup(page, 'math', 'campus'); await page.getByRole('tab', { name: /知识延伸/ }).click();
  await expect.poll(async () => (await reads(page)).some(text => text.includes('数之前先决定数什么'))).toBe(true);
  await finishAudio(page); await expect(bridge(page).getByRole('tab', { name: /再动手/ })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => (await reads(page)).filter(text => text.includes('一个实物对应一个数词')).length).toBe(1);
  await expect(bridge(page).getByRole('tab', { name: /换个情景/ })).toBeDisabled();
  await finishAudio(page); await expect(bridge(page).getByRole('tab', { name: /换个情景/ })).toHaveAttribute('aria-selected', 'true');
});

test('已完成讲解原地重做会重新自动播放，迟到的旧播放不能解锁新一轮', async ({ page }) => {
  await setup(page, 'math', 'order-twenty', true); await page.getByRole('tab', { name: /知识延伸/ }).click();
  await expect.poll(() => lectureCount(page)).toBe(1);
  await page.evaluate(() => { const w = window as unknown as AudioState; w.__lectureOld = w.__lecturePending; });
  await bridge(page).getByRole('button', { name: '再做一次', exact: true }).click();
  await expect.poll(() => lectureCount(page)).toBe(2);
  await page.evaluate(() => (window as unknown as AudioState).__lectureOld?.onended?.());
  await expect(bridge(page).getByRole('tab', { name: /再动手/ })).toBeDisabled();
  await finishAudio(page); await expect(bridge(page).getByRole('tab', { name: /再动手/ })).toHaveAttribute('aria-selected', 'true');
});

test('自动讲解播放失败提供阅读后继续入口，不要求再点一次播放', async ({ page }) => {
  await setup(page, 'math', 'order-twenty', false, true); await page.getByRole('tab', { name: /知识延伸/ }).click();
  await expect(bridge(page).getByRole('button', { name: '看完讲解，去动手 →', exact: true })).toBeVisible();
  await expect(bridge(page).getByRole('tab', { name: /先听讲解/ })).toHaveAttribute('aria-selected', 'true');
  await bridge(page).getByRole('button', { name: '看完讲解，去动手 →', exact: true }).click();
  await expect(bridge(page).getByRole('tab', { name: /再动手/ })).toHaveAttribute('aria-selected', 'true');
});

for (const lesson of ['friends-letters', 'families-letters']) test(`${lesson} 英语占格规则完整自动讲一次，保留公共重播按钮`, async ({ page }) => {
  await setup(page, 'english', lesson); await page.getByRole('tab', { name: /规范书写/ }).click();
  const needle = lesson === 'friends-letters' ? '英语四线格' : '四线格占格复习';
  const count = async () => (await reads(page)).filter(text => text.includes(needle)).length;
  await expect.poll(count).toBe(1);
  await expect.poll(async () => (await reads(page)).some(text => text.includes('尾巴向下垂'))).toBe(true);
  const panel = page.locator('[data-lesson-explanation]:visible');
  await panel.click({ position: { x: 20, y: 20 } }); await page.waitForTimeout(450); expect(await count()).toBe(1);
  await page.getByRole('button', { name: /再听一遍/ }).click(); await expect.poll(count).toBe(2);
  await page.screenshot({ path: `tmp/course-explanation/${lesson}-1024.png` });
});

for (const voice of [true, false]) test(`拼音规则${voice ? '自动讲一次' : '关闭声音'}都不需要点击“已听规则”才能答题`, async ({ page }) => {
  await setup(page, 'chinese', 'pinyin-a-o-e', false, false, voice);
  await page.locator('.ct-pinyin-rule h4').click();
  if (voice) await expect.poll(async () => (await reads(page)).filter(text => text.includes('四声初体验')).length).toBe(1);
  await expect(page.getByRole('button', { name: /听聪聪解释规则|已听规则/ })).toHaveCount(0);
  await page.locator('.ct-pinyin-check').getByRole('button', { name: CHINESE_PINYIN_STUDY['pinyin-a-o-e'].check.answer, exact: true }).click();
  await expect(page.getByRole('tab', { name: /听辨练习/, selected: true })).toBeVisible();
  expect(await page.evaluate(child => localStorage.getItem(`sfz-chinese-practice-v1:${child}:pinyin-a-o-e:pinyinRuleSeen`), child)).toBeNull();
});

for (const [subject, lesson, tab] of [['math', 'order-twenty', '知识延伸'], ['chinese', 'love-chinese', '知识桥'], ['english', 'friends-letters', '规范书写']] as const) test(`${subject} 自动与手动朗读显示播放动效，播放中重复点击无效，结束后恢复`, async ({ page }) => {
  await setup(page, subject, lesson, true, false, true, true);
  await page.getByRole('tab', { name: new RegExp(tab) }).click();
  const replay = page.getByRole('button', { name: subject === 'math' ? '再听一遍讲解' : '再听一遍', exact: true });
  await expect(replay).toHaveAttribute('aria-busy', 'true');
  await expect(replay).toBeDisabled();
  await expect.poll(() => reads(page).then(values => values.length)).toBeGreaterThan(0);
  expect(await replay.locator('.course-speaker-wave').first().evaluate(element => getComputedStyle(element).animationName)).toBe('course-speaker-wave');
  const before = (await reads(page)).length;
  await replay.evaluate(element => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await page.waitForTimeout(300); expect((await reads(page)).length).toBe(before);
  await page.screenshot({ path: `tmp/course-replay-playing/${subject}-1024.png` });
  // 结束整段连读（中英分段 / 中文与拼音段），全程不能出现可重播的间隙。
  await page.evaluate(async () => {
    const w = window as unknown as AudioState;
    for (let i = 0; i < 30; i++) {
      w.__lecturePending?.onended?.();
      await new Promise(resolve => setTimeout(resolve, 25));
      if (!document.querySelector('.course-replay-button.is-playing')) break;
    }
  });
  await expect(replay).toBeEnabled(); await expect(replay).toHaveAttribute('aria-busy', 'false');
  await replay.click(); await expect(replay).toHaveAttribute('aria-busy', 'true'); await expect(replay).toBeDisabled();
  await expect.poll(() => reads(page).then(values => values.length)).toBeGreaterThan(before);
  // 播放器报错必须停止动效并解锁，不等一个估算的播放时长。
  await page.evaluate(() => { const w = window as unknown as AudioState; w.__lectureHold = false; w.__lecturePending?.onerror?.(); });
  await expect(replay).toBeEnabled(); await expect(replay).toHaveAttribute('aria-busy', 'false');
});
