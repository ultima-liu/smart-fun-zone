import { chromium } from 'playwright';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e.message).slice(0, 200)));
await page.route('**/sw.js', r => r.abort());
await page.goto('http://localhost:5173/#/');
const payload = { state: { lang: 'zh', theme: 'dark', sound: false, musicOn: false, voiceOn: false, lessonSkipOn: false,
  profiles: [{ id: 'c1', name: '卷卷', avatarId: 'tiger', age: 5, createdAt: Date.now() }], activeChildId: 'c1',
  records: [], mastery: {}, lessonProgress: {}, charBag: {}, storyDone: { c1: ['p1','c1-1','c1-2','c2-1'] },
  storyRewardClaimed: { c1: ['p1','c1-1','c1-2','c2-1'] }, storyPulse: null, wrongs: {}, points: { c1: 500 }, pointLog: { c1: [] },
  customTasks: {}, ownedItems: { c1: [] }, equipped: { c1: {} }, avatarColor: { c1: 'pink' }, avatarHair: { c1: 'sporty' },
  materials: { c1: { stardust: 0, cardShard: 0 } }, archivedCards: { c1: [] }, rewardRequests: { c1: [] }, showBadges: { c1: [] },
  badges: { c1: [] }, shipLevel: { c1: 1 }, expeditionLastAt: { c1: Date.now() - 3600000 }, storeOverrides: {}, taskOverrides: {},
  rewardRequestsDone: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false,
  materialsExtra: {}, ownedItemsExtra: {}, cardRewardClaimed: { c1: [] }, dailyCheckin: {} }, version: 0 };
await page.evaluate((d) => localStorage.setItem('smart-fun-zone', JSON.stringify(d)), payload);
await page.reload(); await page.waitForTimeout(2500);
console.log('pill before:', await page.locator('.ss-action-pill').textContent().catch(()=>'n/a'));
// go lobby
await page.goto('http://localhost:5173/#/lobby'); await page.waitForTimeout(2000);
const gameCount = await page.locator('.game-card, .cat-entry').count();
console.log('lobby entries:', gameCount);
// find a playable game link and open it
await page.locator('.game-card').first().click().catch(async () => { await page.locator('.cat-entry').first().click(); });
await page.waitForTimeout(2500);
console.log('url now:', page.url());
const opts = await page.locator('button').count();
console.log('buttons:', opts);
// try to complete: click options repeatedly
for (let i = 0; i < 40; i++) {
  const b = page.locator('.quiz-option, .apple, .opt, button.option').first();
  if (await b.count() === 0) break;
  const n = await page.locator('.quiz-option, .apple, .opt, button.option').count();
  await page.locator('.quiz-option, .apple, .opt, button.option').nth(i % n).click({ force: true }).catch(()=>{});
  await page.waitForTimeout(400);
  const done = await page.locator('.result-panel, .game-result, .game-over, .result-card').count();
  if (done > 0) { console.log('game finished at iteration', i); break; }
}
await page.waitForTimeout(1500);
const st = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('smart-fun-zone')).state; return { records: s.records.length, rec: s.records.slice(0,1) }; });
console.log('records after play:', JSON.stringify(st));
await page.goto('http://localhost:5173/#/'); await page.waitForTimeout(2500);
console.log('pill after:', await page.locator('.ss-action-pill').textContent().catch(()=>'n/a'), '| title:', await page.locator('.ss-title').textContent().catch(()=>'n/a'));
console.log('errors:', JSON.stringify(errs.slice(0,3)));
await browser.close();
