import { chromium } from 'playwright';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const AMOUNT = Number(process.argv[2] ?? 10000);

const browser = await chromium.launch({ executablePath: CHROME, headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.route('**/sw.js', r => r.abort());
await page.goto('http://localhost:5173/#/');
await page.waitForTimeout(600);

const result = await page.evaluate((amount) => {
  const KEY = 'smart-fun-zone';
  const raw = localStorage.getItem(KEY);
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  let mode;
  if (!data?.state?.profiles?.length) {
    // 没有存档时建一个可玩的测试档：卷卷，序章完成（星环学校已解锁）
    data = { state: {
      lang: 'zh', theme: 'dark', sound: false, musicOn: false, voiceOn: false, lessonSkipOn: false,
      profiles: [{ id: 'c1', name: '卷卷', avatarId: 'tiger', age: 5, createdAt: Date.now() }], activeChildId: 'c1',
      records: [], mastery: {}, lessonProgress: {}, charBag: {}, storyDone: { c1: ['p1'] }, storyPulse: null, wrongs: {},
      points: { c1: 0 }, pointLog: { c1: [] }, customTasks: {}, ownedItems: { c1: [] }, equipped: { c1: {} },
      avatarColor: {}, avatarHair: {}, materials: {}, archivedCards: { c1: [] }, rewardRequests: { c1: [] },
      showBadges: { c1: [] }, shipLevel: { c1: 1 }, expeditionLastAt: {},
      storeOverrides: {}, taskOverrides: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
      buddyOpen: false, buddyWakeOn: false, cardRewardClaimed: { c1: [] },
    }, version: 0 };
    mode = 'seeded';
  } else {
    mode = 'updated';
  }
  const childId = data.state.activeChildId ?? data.state.profiles[0].id;
  const before = data.state.points?.[childId] ?? 0;
  data.state.points = { ...data.state.points, [childId]: before + amount };
  data.state.pointLog = { ...data.state.pointLog, [childId]: [
    { id: `admin-grant:${Date.now()}`, time: Date.now(), amount, reason: '管理员补给·卷星币', childId },
    ...(data.state.pointLog?.[childId] ?? []),
  ] };
  localStorage.setItem(KEY, JSON.stringify(data));
  return { mode, childId, name: data.state.profiles.find((p) => p.id === childId)?.name, before };
}, AMOUNT);

await page.reload();
await page.waitForTimeout(2000);
const after = await page.evaluate(() => {
  const data = JSON.parse(localStorage.getItem('smart-fun-zone'));
  const childId = data.state.activeChildId ?? data.state.profiles[0]?.id;
  return data.state.points?.[childId] ?? 0;
});
console.log(JSON.stringify({ ...result, amount: AMOUNT, after }));
// 不关闭浏览器，窗口留给用户直接使用
