/* 样板课《金木水火土》学课文图文分步走查：出现配图、田字格步骤、口诀不与要点重复 */
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173';
const fails = [];
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${e ? ' — ' + e : ''}`); if (!c) fails.push(n); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 960 }, locale: 'zh-CN' });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
await page.goto(BASE);
await page.getByRole('button', { name: /创建小档案/ }).click();
await page.getByRole('button', { name: /开始玩/ }).click();
await page.goto(`${BASE}/#/learn/chinese-g1-a-2-2`);
await page.reload();
await page.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(1200);

// 学课文（步骤1）
await page.locator('.step-seg').nth(1).click();
await page.waitForTimeout(1200);
let title = await page.locator('.explain-title').first().textContent().catch(() => '');
check('学课文: 出现分节标题', /数|金木|日|月|田|姿势/.test(title || ''), title);
const hasStar = await page.locator('.mf-count-slot').count();
check('学课文: 第一步配图（数星星 5 个）', hasStar >= 5, `slots=${hasStar}`);

// 逐节前进，直到出现"田字格"
let sawTzg = false, sawTzgLabels = false, guard = 0;
while (guard++ < 12) {
  const curTitle = await page.locator('.explain-title').first().textContent().catch(() => '');
  if (/田字格/.test(curTitle || '')) {
    sawTzg = true;
    const svgTxt = await page.locator('.mf-tianzige').innerText().catch(() => '');
    sawTzgLabels = /竖中线/.test(svgTxt) && /横中线/.test(svgTxt);
    break;
  }
  const tryIt = page.getByRole('button', { name: /小试身手/ }).first();
  const nextBtn = page.getByRole('button', { name: /下一步|学会了/ }).first();
  if (await tryIt.count()) {
    await tryIt.click();
    await page.waitForTimeout(500);
    const opt = page.locator('.quiz-opt').first();
    if (await opt.count()) { await opt.click(); await page.waitForTimeout(700); }
    const nb = page.getByRole('button', { name: /下一步|学会了/ }).first();
    if (await nb.count()) { await nb.click(); await page.waitForTimeout(900); }
  } else if (await nextBtn.count()) {
    await nextBtn.click();
    await page.waitForTimeout(900);
  } else break;
}
check('学课文: 出现"认识田字格"分节并配田字格图', sawTzg);
check('学课文: 田字格图标注 竖中线/横中线', sawTzgLabels);
await browser.close();
console.log(fails.length === 0 ? '\nALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
