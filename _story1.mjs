import { chromium } from 'playwright';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.route('**/sw.js', r => r.abort());
await page.goto('http://localhost:5173/#/');
const D = new Date().toDateString();
const payload = { state: { lang: 'zh', theme: 'dark', sound: false, musicOn: true, voiceOn: false, lessonSkipOn: false,
  profiles: [{ id: 'c1', name: '卷卷', avatarId: 'tiger', age: 5, createdAt: Date.now() }], activeChildId: 'c1',
  records: [{ id: 'r1', childId: 'c1', gameId: 'number-farm', level: 1, stars: 8, correct: 8, total: 8, durationSec: 60, playedAt: Date.now() }],
  mastery: {}, lessonProgress: {}, charBag: {},
  storyDone: { c1: ['p1','c1-1','c1-2','c2-1'] }, storyRewardClaimed: { c1: ['p1','c1-1','c1-2','c2-1'] },
  storyPulse: null, wrongs: {}, points: { c1: 500 }, pointLog: { c1: [] }, customTasks: {}, ownedItems: { c1: [] }, equipped: { c1: {} },
  avatarColor: { c1: 'pink' }, avatarHair: { c1: 'sporty' }, materials: { c1: { stardust: 0, cardShard: 0 } },
  archivedCards: { c1: [] }, rewardRequests: { c1: [] }, showBadges: { c1: [] }, badges: { c1: [] }, shipLevel: { c1: 1 },
  expeditionLastAt: { c1: Date.now() - 3600000 }, storeOverrides: {}, taskOverrides: {}, rewardRequestsDone: {}, bonusMin: {},
  parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false, materialsExtra: {}, ownedItemsExtra: {},
  cardRewardClaimed: { c1: [] }, dailyCheckin: {} }, version: 0 };
await page.evaluate((d) => localStorage.setItem('smart-fun-zone', JSON.stringify(d)), payload);
await page.reload(); await page.waitForTimeout(2000);
const strip = await page.evaluate(() => {
  const s = document.querySelector('.story-strip');
  return s ? { title: s.querySelector('.ss-title')?.textContent, text: s.querySelector('.ss-text')?.textContent, pill: s.querySelector('.ss-action-pill')?.textContent } : null;
});
console.log('strip BEFORE:', JSON.stringify(strip));
// click the strip to claim
await page.locator('.story-strip').click();
await page.waitForTimeout(1800);
const after = await page.evaluate(() => {
  const raw = localStorage.getItem('smart-fun-zone');
  const st = raw ? JSON.parse(raw).state : {};
  const s = document.querySelector('.story-strip');
  return {
    done: st.storyDone?.c1, claimed: st.storyRewardClaimed?.c1, badges: st.badges?.c1, points: st.points?.c1,
    stripTitle: s?.querySelector('.ss-title')?.textContent, pill: s?.querySelector('.ss-action-pill')?.textContent,
  };
});
console.log('AFTER:', JSON.stringify(after, null, 1));
await browser.close();
