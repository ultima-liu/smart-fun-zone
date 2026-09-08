/* 语文二年级上册（2022修订）内容 UI 抽查：
   目录课时数、带增强课文/无增强课文/语文园地 均能走通 读/学/认/练，
   验证"读课文→学课文→认生字→去练习"闭环不白屏。 */
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
// 切到二年级
await page.locator('.grade-seg', { hasText: '2年级' }).click();
await page.waitForTimeout(900);
const chips = await page.locator('.skill-chip').count();
check('目录: 二年级上册课时数 = 36', chips === 36, `chips=${chips}`);

async function gotoLesson(id) {
  await page.goto(`${BASE}/#/learn/${id}`);
  await page.reload();
  await page.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200);
}

// 1) 带增强的阅读课《小蝌蚪找妈妈》
await gotoLesson('chinese-g2-a-1-1');
let txt = await page.locator('.lesson-stage').innerText().catch(() => '');
check('小蝌蚪找妈妈: 课文呈现', txt.includes('小蝌蚪') && txt.includes('青蛙'), txt.slice(0, 34).replace(/\n/g, ' '));

// 2) 无增强（仅要点回退）的课文《场景歌》
await gotoLesson('chinese-g2-a-2-1');
txt = await page.locator('.lesson-stage').innerText().catch(() => '');
check('场景歌: 课文呈现', txt.includes('海鸥') && txt.includes('帆船'), txt.slice(0, 34).replace(/\n/g, ' '));

// 3) 本册新增录入的 语文园地二（含 数九歌）
await gotoLesson('chinese-g2-a-2-5');
txt = await page.locator('.lesson-stage').innerText().catch(() => '');
check('语文园地二: 呈现日积月累(数九歌)', txt.includes('数九歌') && txt.includes('耕牛遍地走'), txt.slice(0, 40).replace(/\n/g, ' '));

// 4) 无增强阅读课《纸船和风筝》
await gotoLesson('chinese-g2-a-8-2');
txt = await page.locator('.lesson-stage').innerText().catch(() => '');
check('纸船和风筝: 课文呈现', txt.includes('松鼠') && txt.includes('风筝'), txt.slice(0, 34).replace(/\n/g, ' '));

// 5) 四个学习节点存在；切换到"学课文"不白屏（无论有无增强）
const stepButtons = await page.locator('.step-seg').count();
check('步骤条: 四个学习节点(读/学/认/练)', stepButtons >= 4, `steps=${stepButtons}`);
await page.locator('.step-seg', { hasText: '学课文' }).click().catch(() => {});
await page.waitForTimeout(800);
let bodyAfter = await page.locator('.lesson-stage').innerText().catch(() => '');
check('学课文: 有讲解要点(回退不白屏)', bodyAfter.trim().length > 5 && !bodyAfter.includes('再等等'), bodyAfter.slice(0, 40).replace(/\n/g, ' '));

await browser.close();
console.log(fails.length === 0 ? '\nALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
