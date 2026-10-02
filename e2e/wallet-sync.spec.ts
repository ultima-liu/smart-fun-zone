import { expect, test } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test('长流水账户使用完整云端余额，补币后刷新保持到账', async ({ page }) => {
  const history = Array.from({ length: 1200 }, (_, i) => ({ source_id: `wallet-e2e-${i}`, amount: -1, reason: '历史消费', ts: i + 2 }));
  const initial = { source_id: 'wallet-e2e-initial', amount: 1461, reason: '历史入账', ts: 1 };
  let all = [...history.reverse(), initial];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const payload = url.pathname === '/api/sync' ? {
      ok: true, progress: [], wrongs: [], readAloud: [], items: [],
      points: all.slice(0, 800),
      wallet: { balance: all.reduce((sum, entry) => sum + entry.amount, 0), sourceIds: all.map((entry) => entry.source_id) },
    } : { ok: true, applied: 0, ttsConfigured: false, storeOverrides: {}, taskOverrides: {}, courseSchedule: [] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
  await page.addInitScript(({ entries }) => {
    if (localStorage.getItem('smart-fun-zone')) return;
    const id = 'wallet-e2e-child';
    localStorage.setItem('sfz_token', 'wallet-e2e-session');
    localStorage.setItem('sfz_cloud_child_map:unknown', JSON.stringify({ [id]: 8 }));
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
      lang: 'zh', theme: 'dark', sound: false, voiceOn: false,
      profiles: [{ id, name: '卷卷（同步回归）', avatar: '🐯', ageBand: 'g1', createdAt: Date.now() }], activeChildId: id,
      points: { [id]: 0 }, pointLog: { [id]: entries.map((row) => ({ id: row.source_id, amount: row.amount, reason: row.reason, time: row.ts * 1000, childId: id })) },
    } }));
  }, { entries: all.slice(0, 600) });
  await page.goto('/#/dock');
  await expect(page.locator('.sd-wallet')).toContainText('261');
  all = [...Array.from({ length: 20 }, (_, i) => ({ source_id: `wallet-e2e-credit-${i}`, amount: 500, reason: '补充卷星币', ts: 2000 + i })), ...all];
  await page.reload();
  await expect(page.locator('.sd-wallet')).toContainText('10261');
  await page.reload();
  await expect(page.locator('.sd-wallet')).toContainText('10261');
});
