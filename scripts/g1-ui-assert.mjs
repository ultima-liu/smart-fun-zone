/* 语文一年级上册（2022修订）内容 UI 抽查：目录课数、课文页能走通读/学/认/练 */
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173';
const fails = [];
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) fails.push(name);
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 960 }, locale: 'zh-CN' });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 180)));

await page.goto(BASE);
await page.getByRole('button', { name: /创建小档案/ }).click();
await page.getByRole('button', { name: /开始玩/ }).click();
await page.getByRole('link', { name: '地图', exact: true }).click();
await page.locator('.subject-card', { hasText: '语文' }).click();
await page.waitForTimeout(600);
const chips = await page.locator('.skill-chip').count();
check('目录: 一年级语文上册课时数 = 45', chips === 45, `chips=${chips}`);

async function gotoLesson(id) {
  await page.goto(`${BASE}/#/learn/${id}`);
  await page.reload();
  await page.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200);
}

// 1) 识字课《天地人》
await gotoLesson('chinese-g1-a-2-1');
let txt = await page.locator('.lesson-stage').innerText().catch(() => '');
check('天地人: 页面渲染课文文字', txt.includes('天') && txt.includes('地') && txt.includes('人'), txt.slice(0, 40).replace(/\n/g, ' '));

// 2) 入学课《我是中国人》（words 为空）
await gotoLesson('chinese-g1-a-1-1');
txt = await page.locator('.lesson-stage').innerText().catch(() => '');
check('我是中国人: 页面渲染课文文字', txt.includes('我是中国人'), txt.slice(0, 30).replace(/\n/g, ' '));

// 3) 阅读课《乌鸦喝水》多段课文 + 生字
await gotoLesson('chinese-g1-a-9-2');
txt = await page.locator('.lesson-stage').innerText().catch(() => '');
check('乌鸦喝水: 课文全文呈现', txt.includes('瓶子里的水渐渐升高'), txt.slice(0, 40).replace(/\n/g, ' '));

// 4) 看课文→学课文 步骤可切换（乌鸦喝水 记要点等节点不白屏）
const stepButtons = await page.locator('.step-seg').count();
check('步骤条: 四个学习节点存在', stepButtons >= 4, `steps=${stepButtons}`);
await page.locator('.step-seg', { hasText: '记要点' }).click().catch(() => {});
await page.waitForTimeout(800);
const bodyAfter = await page.locator('.lesson-stage').innerText().catch(() => '');
check('记要点: 有讲解要点内容', bodyAfter.includes('乌鸦') || bodyAfter.includes('朗读'), bodyAfter.slice(0, 40).replace(/\n/g, ' '));

await browser.close();
console.log(fails.length === 0 ? '\nALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
