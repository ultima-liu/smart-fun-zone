/* 闭环终检：认生字(TraceCard) 与 去练习 节点可走通，不白屏、有内容 */
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
// 乌鸦喝水：认生字（step=2）
await page.goto(`${BASE}/#/learn/chinese-g1-a-9-2`);
await page.reload();
await page.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(1200);
await page.locator('.step-seg').nth(2).click();
await page.waitForTimeout(1200);
const traceText = await page.locator('.lesson-stage').innerText().catch(() => '');
check('认生字: 出现生字卡内容', traceText.includes('写') || /写一写|描|写/.test(traceText), traceText.slice(0, 60).replace(/\n/g, ' '));
// 去练习：练习页渲染不白屏
await page.locator('.step-seg').nth(3).click();
await page.waitForTimeout(2500);
const practiceUrl = page.url();
const practiceTxt = await page.locator('.page.practice').innerText().catch(() => '');
check('去练习: 打开练习页并有内容', /practice/.test(practiceUrl) && practiceTxt.length > 20, practiceUrl.split('/').pop());
await browser.close();
console.log(fails.length === 0 ? '\nALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
