/* 动画行为断言：验证数一数/第几/比一比/加法配图的动态计数效果 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 900 }, locale: 'zh-CN' });
const fails = [];
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) fails.push(name);
};

await page.goto(BASE);
await page.getByRole('button', { name: /创建小档案/ }).click();
await page.getByRole('button', { name: /开始玩/ }).click();

async function gotoLesson(id) {
  await page.goto(`${BASE}/#/learn/${id}`);
  await page.reload(); // 保证 LessonPage 以 step=0 全新挂载
  await page.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
}

// ---------- 数一数：看例题 ----------
await gotoLesson('math-g1-a-1-1');
await page.waitForTimeout(1600); // 正在数第 2~3 只
let lit = await page.locator('.mf-count-slot.lit').count();
let cur = await page.locator('.mf-count-slot.current').count();
let pointer = await page.locator('.mf-slot-pointer', { hasText: '👆' }).count();
let badgeTexts = await page.locator('.mf-slot-badge').allTextContents();
let numText = await page.locator('.mf-num').first().textContent();
check('count-mid: 已有部分小鸟被数到', lit > 0 && lit < 5, `lit=${lit}`);
check('count-mid: 恰好一只正在被点', cur === 1, `cur=${cur}`);
check('count-mid: 手指指向当前小鸟', pointer === 1);
check('count-mid: 数过的小鸟盖了数字章', badgeTexts.filter(Boolean).length === lit, `badges=${badgeTexts.join(',')}`);
check('count-mid: 大数字与进度同步', numText === String(lit), `num=${numText}, lit=${lit}`);

await page.waitForTimeout(5000); // 数完
lit = await page.locator('.mf-count-slot.lit').count();
numText = await page.locator('.mf-num').first().textContent();
badgeTexts = await page.locator('.mf-slot-badge').allTextContents();
check('count-done: 5 只小鸟全部数到', lit === 5, `lit=${lit}`);
check('count-done: 大数字是 5', numText === '5', `num=${numText}`);
check('count-done: 每只小鸟都有数字章 1-5', badgeTexts.join(',') === '1,2,3,4,5', badgeTexts.join(','));

// 重播按钮
await page.locator('.mf-play').first().click();
await page.waitForTimeout(2200); // 启动延迟 450ms + 首次数到 850ms
const litAfterReplay = await page.locator('.mf-count-slot.lit').count();
check('count-replay: 重播从 1 开始数', litAfterReplay > 0 && litAfterReplay < 3, `lit=${litAfterReplay}`);

// ---------- 数一数：看演示（步骤图随讲解变化、每步自动点数） ----------
await page.locator('.step-seg', { hasText: '看演示' }).click();
await page.waitForTimeout(1600);
let demoLit = await page.locator('.mf-count-slot.lit').count();
check('demo-step1: 演示图也在自动点数', demoLit > 0 && demoLit <= 5, `lit=${demoLit}`);
await page.waitForTimeout(4500);
demoLit = await page.locator('.mf-count-slot.lit').count();
check('demo-step1-done: 数到 5', demoLit === 5, `lit=${demoLit}`);
// 进入下一步（第 2 步同样是 5 只小鸟，重新点数；需先答对第 1 步的小试身手）
await page.getByRole('button', { name: /小试身手/ }).click();
await page.locator('.quiz-opt', { hasText: '5' }).click();
await page.getByRole('button', { name: /下一步/ }).click();
await page.waitForTimeout(1400);
demoLit = await page.locator('.mf-count-slot.lit').count();
check('demo-step2: 换步骤后重新自动点数', demoLit > 0 && demoLit < 5, `lit=${demoLit}`);

// ---------- 第几 ----------
await gotoLesson('math-g1-a-3-3');
await page.waitForTimeout(3400); // mark=3，约 2.7s 数完
const marked = await page.locator('.mf-count-slot.marked').count();
const crown = await page.locator('.mf-slot-pointer', { hasText: '👑' }).count();
const ordinalText = await page.locator('.mf-num').first().textContent();
check('ordinal-done: 只有 1 个被标记', marked === 1, `marked=${marked}`);
check('ordinal-done: 标记的那只戴皇冠', crown === 1);
check('ordinal-done: 显示"第 3 个"', ordinalText?.includes('第 3 个'), `num=${ordinalText}`);

// ---------- 比一比 ----------
await gotoLesson('math-g1-a-1-2');
await page.waitForTimeout(3600);
const pairLines = await page.locator('.cp-line').count();
const extraRings = await page.locator('.cp-extra').count();
const stars = await page.locator('.cp-star').count();
const sym = await page.locator('.cp-symbol').textContent();
check('compare-done: 3 对物品连线', pairLines === 3, `lines=${pairLines}`);
check('compare-done: 多出的 2 个画金圈', extraRings === 2, `rings=${extraRings}`);
check('compare-done: 多出的标 ⭐', stars === 2, `stars=${stars}`);
check('compare-done: 符号 > 弹出', sym === '>', `sym=${sym}`);

// ---------- 加法 ----------
await gotoLesson('math-g1-a-3-5'); // 2+3
await page.waitForTimeout(1000);
let onDots = await page.locator('.mf-dots .dot.on').count();
check('equation-mid: 圆点逐个点亮', onDots > 0 && onDots < 5, `on=${onDots}`);
await page.waitForTimeout(2600);
onDots = await page.locator('.mf-dots .dot.on').count();
const resultK = await page.locator('.mf-result-k').count();
const eqText = await page.locator('.mf-equation-wrap').textContent();
check('equation-done: 全部 5 点 + 结果 5 点共 10 点', onDots === 10, `on=${onDots}`);
check('equation-done: 结果弹出', resultK === 1);
check('equation-done: 结果为 5', eqText?.includes('5'), eqText);

// ---------- 分类与整理 ----------
await gotoLesson('math-g1-b-3-1');
await page.waitForTimeout(2200);
const sortItems = await page.locator('.sort-item').count();
check('sort: 物品逐组逐个弹出', sortItems === 7, `items=${sortItems}`);

// ---------- 认识人民币（3×1元 + 1×5元 + 1×10元 = 18 元） ----------
await gotoLesson('math-g1-b-5-1');
await page.waitForTimeout(2800);
const coinCount = await page.locator('.coin-drop').count();
const moneyText = await page.locator('.mf-num').first().textContent();
check('money: 硬币一枚枚落下', coinCount === 5, `coins=${coinCount}`);
check('money: 总额数到 18 元', moneyText?.includes('18'), `num=${moneyText}`);

// ---------- 找规律 ----------
await gotoLesson('math-g1-b-8-1');
await page.waitForTimeout(1800);
const patternItems = await page.locator('.pattern-item').count();
check('pattern: 序列逐个弹出', patternItems === 4, `items=${patternItems}`);

// ---------- 凑十法（9+4：13 个点，凑十后两行 26 个点） ----------
await gotoLesson('math-g1-a-8-1');
await page.waitForTimeout(1200);
const mtDotsBefore = await page.locator('.mt-dot').count();
check('makeTen: 第一行 13 个点逐个弹出', mtDotsBefore === 13, `dots=${mtDotsBefore}`);
await page.locator('.mf-makeTen button', { hasText: '凑十演示' }).click();
await page.waitForTimeout(1200);
const mtDotsAfter = await page.locator('.mt-dot').count();
const mtText = await page.locator('.mf-makeTen').textContent();
check('makeTen: 凑十后两行 26 个点', mtDotsAfter === 26, `dots=${mtDotsAfter}`);
check('makeTen: 结果 10+3=13', mtText?.includes('10 + 3 = 13'), mtText);

await browser.close();
console.log(fails.length === 0 ? '\nALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
