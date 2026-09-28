import { chromium } from '/Users/liuquanneng/code/smart-fun-zone/node_modules/playwright/index.mjs';
import { PNG } from '/Users/liuquanneng/code/smart-fun-zone/node_modules/pngjs/lib/png.js' assert { type: 'json' };

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 2400 } });
const childId = 'math-textbook-child';
await page.addInitScript(({ id, t }) => {
  if (sessionStorage.getItem('math-textbook-e2e-seeded')) return;
  localStorage.setItem('smart-fun-zone', JSON.stringify({
    state: {
      lang: 'zh', theme: t, sound: true, musicOn: false, voiceOn: false,
      profiles: [{ id, name: '数学体验生', avatarId: 'boy', age: 6, createdAt: Date.now() }],
      activeChildId: id, records: [], mastery: {}, lessonProgress: {}, charBag: {},
      storyDone: { [id]: ['p1'] }, storyPulse: null, wrongs: { [id]: [] },
      points: { [id]: 0 }, pointLog: { [id]: [] },
      customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {},
      taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
      buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {},
      archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
    },
    version: 0,
  }));
  sessionStorage.setItem('math-textbook-e2e-seeded', '1');
}, { id: childId, t: 'dark' });

await page.goto('http://localhost:5173/#/math-course/solid-shapes');
await page.waitForSelector('.boot-splash.exit', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
await page.getByRole('button', { name: '球', exact: true }).click();
await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
await page.waitForTimeout(800);
// 完成任务一
for (let i = 0; i < 4; i++) {
  await page.locator('.mt-match-objects button:not(.done)').first().click();
  for (let j = 0; j < 4; j++) {
    const btn = page.locator('.mt-match-shapes button').nth(j);
    if (await btn.evaluate((el) => el.classList.contains('done'))) continue;
    await btn.click();
    if (await btn.evaluate((el) => el.classList.contains('wrong'))) { await page.waitForTimeout(800); continue; }
    break;
  }
}
// 完成任务二
const lab = page.getByRole('region', { name: '立体图形特征实验台' });
for (const [item, feature] of [['球', '能向各个方向滚动'], ['圆柱', '有平面也有曲面'], ['正方体', '六个面一样大'], ['长方体', '适合作稳定底座']]) {
  const row = lab.locator('article').filter({ hasText: item }).first();
  await row.getByRole('button', { name: `测试${item}` }).click();
  await page.waitForTimeout(1700);
  await row.getByRole('button', { name: feature, exact: true }).click();
}
await page.waitForTimeout(500);
const shot = await page.screenshot({ fullPage: true });
await browser.close();

// 像素扫描：找“绿色占优”的像素
const { PNG: Png } = await import('/Users/liuquanneng/code/smart-fun-zone/node_modules/pngjs/lib/png.js');
const img = Png.sync.read(shot);
const buckets = new Map();
let greenCount = 0;
for (let y = 0; y < img.height; y += 2) {
  for (let x = 0; x < img.width; x += 2) {
    const idx = (img.width * y + x) << 2;
    const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
    if (g > 85 && g > r + 25 && g > b + 25) {
      greenCount++;
      const bx = Math.floor(x / 150), by = Math.floor(y / 150);
      const key = `${bx},${by}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
}
console.log('green-ish sampled pixels:', greenCount);
console.log('hot regions (x/150,y/150 -> count):');
for (const [key, count] of [...buckets].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${key} -> ${count}`);
