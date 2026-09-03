/* 火山引擎 seed-tts-2.0 集成验证：
   场景一：已配置密钥 → 请求走同源代理 /api/volc-tts → 真实合成音频播放；
   场景二：模拟未配置 → 页面出现配置提示 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const fails = [];
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) fails.push(name);
};

/* ---------- 场景一：已配置密钥 ---------- */
const page = await browser.newPage({ viewport: { width: 480, height: 900 }, locale: 'zh-CN' });
const ttsRequests = [];
page.on('request', (r) => {
  if (r.url().includes('/api/volc-tts/')) ttsRequests.push(r.url());
});
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.addInitScript(() => {
  window.__systemTtsUsed = 0;
  const Orig = window.SpeechSynthesisUtterance;
  window.SpeechSynthesisUtterance = function (text) {
    window.__systemTtsUsed += 1;
    return new Orig(text);
  };
  window.SpeechSynthesisUtterance.prototype = Orig.prototype;
  window.__audioPlays = 0;
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    window.__audioPlays += 1;
    return origPlay.apply(this, arguments);
  };
});

await page.goto(BASE);
await page.getByRole('button', { name: /创建小档案/ }).click();
await page.getByRole('button', { name: /开始玩/ }).click();
await page.goto(`${BASE}/#/learn/math-g1-a-1-1`);
await page.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(12000); // 等数数语音 + 示例句合成播放

check('volc: 语音请求走同源代理 /api/volc-tts', ttsRequests.length > 0, `requests=${ttsRequests.length}`);
const systemUsed = await page.evaluate(() => window.__systemTtsUsed);
check('volc: 不再使用系统 speechSynthesis', systemUsed === 0, `used=${systemUsed}`);
const audioPlays = await page.evaluate(() => window.__audioPlays);
check('volc: 合成音频真实播放（Audio.play）', audioPlays > 0, `plays=${audioPlays}`);
const lit = await page.locator('.mf-count-slot.lit').count();
check('volc: 动画照常数数', lit >= 4, `lit=${lit}`);
const hintVisible = await page.locator('.voice-off-hint').isVisible().catch(() => false);
check('volc: 已配置时不显示"未配置"提示', !hintVisible);

await browser.close();

/* ---------- 场景二：模拟未配置密钥 ---------- */
const browser2 = await chromium.launch();
const page2 = await browser2.newPage({ viewport: { width: 480, height: 900 }, locale: 'zh-CN' });
await page2.addInitScript(() => {
  window.__VOLC_TTS_ENABLED__ = false; // 测试钩子：模拟未配置
});
await page2.goto(BASE);
await page2.getByRole('button', { name: /创建小档案/ }).click();
await page2.getByRole('button', { name: /开始玩/ }).click();
await page2.goto(`${BASE}/#/learn/math-g1-a-1-1`);
await page2.reload();
await page2.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
await page2.waitForTimeout(1500);
const hint2 = await page2.locator('.voice-off-hint').textContent().catch(() => '');
check('volc: 未配置密钥时页面提示配置方式', !!hint2 && hint2.includes('VOLC_SPEECH_API_KEY'), (hint2 ?? '').slice(0, 60));
await browser2.close();

/* ---------- 场景三：课程每段文字点读 ---------- */
const browser3 = await chromium.launch();
const page3 = await browser3.newPage({ viewport: { width: 480, height: 900 }, locale: 'zh-CN' });
const spokenTexts = [];
page3.on('request', (r) => {
  if (!r.url().includes('/api/volc-tts/')) return;
  try {
    const post = r.postDataJSON();
    spokenTexts.push(post?.req_params?.text ?? '');
  } catch {
    /* ignore */
  }
});
await page3.goto(BASE);
await page3.getByRole('button', { name: /创建小档案/ }).click();
await page3.getByRole('button', { name: /开始玩/ }).click();
await page3.goto(`${BASE}/#/learn/math-g1-a-1-1`);
await page3.reload();
await page3.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
await page3.waitForTimeout(3000); // 等进场自动朗读结束/进行中

// 看例题：点示例句 / 例题题目
await page3.locator('.example-scene-text').click();
await page3.locator('.work-problem').first().click();
await page3.waitForTimeout(1500);

// 看演示：点讲解标题与正文
await page3.locator('.step-seg', { hasText: '看演示' }).click();
await page3.locator('.explain-title').first().waitFor({ state: 'visible', timeout: 8000 });
await page3.waitForTimeout(2500);
await page3.locator('.explain-title').click();
await page3.locator('.explain-text').click();
await page3.waitForTimeout(1500);

const joined = spokenTexts.join(' | ');
check('点读-看例题: 点示例句/例题即播对应语音', joined.includes('树上有 5 只小鸟') && joined.includes('又飞来 1 只'), joined.slice(0, 90));
check('点读-看演示: 点标题即播标题语音', spokenTexts.some((t) => t.includes('伸出小手来点数')), '');
check('点读-看演示: 点正文即播正文语音', spokenTexts.some((t) => t.includes('点一个东西就数一个数')), '');
await browser3.close();

console.log(fails.length === 0 ? '\nALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
