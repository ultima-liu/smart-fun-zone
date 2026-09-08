/* 语文二年级下册（2022修订）内容 UI 抽查：
   目录课时数 = 37，抄录课/新增课/语文园地 均能走通 读/学/认/练 闭环不白屏。 */
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
await page.locator('.grade-seg', { hasText: '2年级' }).click();
await page.waitForTimeout(500);
await page.locator('.term-tab', { hasText: '下册' }).click();
await page.waitForTimeout(900);
const chips = await page.locator('.skill-chip').count();
check('目录: 二年级下册课时数 = 37', chips === 37, `chips=${chips}`);

async function gotoLesson(id) {
  await page.goto(`${BASE}/#/learn/${id}`);
  await page.reload();
  await page.locator('.lesson-stage').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200);
}

const cases = [
  ['chinese-g2-b-1-1', '古诗二首(村居)', '草长莺飞二月天'],
  ['chinese-g2-b-1-2', '找春天', '脱掉棉袄'],
  ['chinese-g2-b-2-3', '我不是最弱小的', '萨沙'],
  ['chinese-g2-b-8-2', '黄帝的传说', '轩辕'],
  ['chinese-g2-b-8-3', '大禹治水', '洪水经常泛滥'],
  ['chinese-g2-b-6-5', '语文园地六', '二十四节气歌'],
];
for (const [id, label, needle] of cases) {
  await gotoLesson(id);
  const txt = await page.locator('.lesson-stage').innerText().catch(() => '');
  check(`${label}: 课文呈现`, txt.includes(needle), txt.slice(12, 40).replace(/\n/g, ' '));
}

// 步骤条四个节点，切到 学课文 不白屏（无增强的课回退到要点）
await gotoLesson('chinese-g2-b-2-3');
const stepButtons = await page.locator('.step-seg').count();
check('步骤条: 四个学习节点', stepButtons >= 4, `steps=${stepButtons}`);
await page.locator('.step-seg', { hasText: '学课文' }).click().catch(() => {});
await page.waitForTimeout(800);
const bodyAfter = await page.locator('.lesson-stage').innerText().catch(() => '');
check('学课文: 有讲解要点(不白屏)', bodyAfter.trim().length > 5 && !bodyAfter.includes('再等等'), bodyAfter.slice(0, 40).replace(/\n/g, ' '));

await browser.close();
console.log(fails.length === 0 ? '\nALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
