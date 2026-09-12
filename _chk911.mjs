import { chromium } from 'playwright';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.route('**/sw.js', r => r.abort());
await page.goto('http://localhost:5173/#/');
const payload = { state: { lang: 'zh', theme: 'light', sound: false, musicOn: true, voiceOn: false, lessonSkipOn: false,
  profiles: [{ id: 'c1', name: '卷卷', avatarId: 'tiger', age: 5, createdAt: Date.now() }], activeChildId: 'c1',
  records: [], mastery: {}, lessonProgress: {}, charBag: {}, storyDone: { c1: ['p1','c1-1'] }, storyPulse: null, wrongs: {},
  points: { c1: 100579 }, pointLog: { c1: [] }, customTasks: {}, ownedItems: { c1: [] }, equipped: { c1: {} },
  avatarColor: { c1: 'pink' }, avatarHair: { c1: 'sporty' },
  materials: { c1: { stardust: 200, cardShard: 300 } },
  archivedCards: { c1: ['npc-a-guang','npc-tie-tuo','npc-dang-dang','npc-pao-pao','npc-xiao-juan'] },
  rewardRequests: { c1: [] }, showBadges: { c1: [] }, shipLevel: { c1: 1 }, expeditionLastAt: { c1: Date.now() - 3600000 },
  storeOverrides: {}, taskOverrides: {}, rewardRequestsDone: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
  buddyOpen: false, buddyWakeOn: false, materialsExtra: {}, ownedItemsExtra: {}, cardRewardClaimed: { c1: [] } }, version: 0 };
await page.evaluate((d) => localStorage.setItem('smart-fun-zone', JSON.stringify(d)), payload);
await page.reload(); await page.waitForTimeout(1800);
await page.goto('http://localhost:5173/#/archive'); await page.waitForTimeout(2500);
const info = await page.evaluate(() => ({
  manga: document.querySelectorAll('g.manga').length,
  images: document.querySelectorAll('.ccard').length,
  err: (window as any).__err ?? null,
}));
console.log(JSON.stringify(info));
await browser.close();
