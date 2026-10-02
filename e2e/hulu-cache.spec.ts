import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { HULU_CARDS } from '../src/content/huluCards';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test('图片缓存误存 HTML 后自动恢复，普通刷新和离线仍能解码', async ({ page, context }) => {
  const worker = await readFile('public/sw.js', 'utf8');
  const picture = await readFile('public/assets/cards/hulu/hulu-1.webp');
  let serveHtml = false;
  let requests = 0;
  const server = createServer((request, response) => {
    if (request.url === '/sw.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      response.end(worker);
    } else if (request.url === '/assets/cards/hulu/hulu-1.webp') {
      requests += 1;
      response.writeHead(200, { 'Content-Type': serveHtml ? 'text/html' : 'image/webp', 'Cache-Control': 'no-store' });
      response.end(serveHtml ? '<html>SPA fallback</html>' : picture);
    } else {
      response.writeHead(200, { 'Content-Type': request.url === '/manifest.webmanifest' ? 'application/manifest+json' : 'text/html' });
      response.end(request.url === '/manifest.webmanifest' ? '{}' : '<html><body>Image cache regression</body></html>');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(origin);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
    });
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const asset = '/assets/cards/hulu/hulu-1.webp';
    const cacheName = await page.evaluate(async (asset) => {
      const name = (await caches.keys()).find((key) => key.startsWith('smart-fun-zone-'))!;
      const cache = await caches.open(name);
      await cache.put(asset, new Response('<html>Old wrong asset</html>', { headers: { 'Content-Type': 'text/html' } }));
      return name;
    }, asset);
    const decode = () => page.evaluate(async (asset) => {
      const image = new Image();
      image.src = asset;
      try { await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight }; }
      catch { return null; }
    }, asset);
    expect(await decode()).toEqual({ width: 768, height: 1152 });
    await expect.poll(() => page.evaluate(async ({ cacheName, asset }) => {
      return (await (await caches.open(cacheName)).match(asset))?.headers.get('content-type');
    }, { cacheName, asset })).toBe('image/webp');

    // 同一路径的 HTTP 200 HTML 回退不得再次进入离线缓存。
    await page.reload();
    await page.evaluate(async ({ cacheName, asset }) => { await (await caches.open(cacheName)).delete(asset); }, { cacheName, asset });
    serveHtml = true;
    const wrong = await page.evaluate(async (asset) => (await fetch(asset, { cache: 'reload' })).headers.get('content-type'), asset);
    expect(wrong).toBe('text/html');
    expect(await page.evaluate(async ({ cacheName, asset }) => !!await (await caches.open(cacheName)).match(asset), { cacheName, asset })).toBe(false);
    serveHtml = false;
    expect(await decode()).toEqual({ width: 768, height: 1152 });
    const before = requests;
    await page.reload();
    expect(await decode()).toEqual({ width: 768, height: 1152 });
    expect(requests).toBe(before);
    await context.setOffline(true);
    await page.reload();
    expect(await decode()).toEqual({ width: 768, height: 1152 });
  } finally {
    await context.setOffline(false);
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('开发模式进入档案库会移除旧离线缓存，连续普通刷新可显示十一位人物', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.setItem('smart-fun-zone', JSON.stringify({ version: 8, state: {
      lang: 'zh', voiceOn: false, sound: false,
      profiles: [{ id: 'cache-kid', name: '图鉴伙伴', avatarId: 'girl', age: 6, createdAt: Date.now() }], activeChildId: 'cache-kid',
    } }));
    await (await caches.open('smart-fun-zone-v4')).put('/assets/cards/hulu/hulu-1.webp', new Response('<html>Old missing image</html>', { headers: { 'Content-Type': 'text/html' } }));
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto('/#/archive');
  await page.reload();
  await expect(page.locator('.filter-tier').first()).toBeVisible();
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
  expect(await page.evaluate(async () => (await caches.keys()).filter((key) => key.startsWith('smart-fun-zone-')))).toEqual([]);
  for (let visit = 0; visit < 3; visit++) {
    await page.locator('.filter-tier').first().getByRole('tab', { name: /葫芦娃/ }).click();
    await expect(page.locator('.gallery-shelf .hulu-character-art')).toHaveCount(HULU_CARDS.length);
    const images = await page.locator('.gallery-shelf .hulu-character-art').evaluateAll(async (elements) => {
      return Promise.all(elements.map(async (element) => {
        const image = new Image();
        image.src = element.getAttribute('href')!;
        try { await image.decode(); return [image.naturalWidth, image.naturalHeight]; }
        catch { return [0, 0]; }
      }));
    });
    expect(images).toEqual(HULU_CARDS.map(() => [768, 1152]));
    await page.locator('.hulu-card[title="四娃"]').click();
    await expect(page.locator('.hulu-preview .hulu-character-art')).toHaveAttribute('href', '/assets/cards/hulu/hulu-4.webp');
    await page.locator('.card-preview-close').click();
    await page.reload();
  }
});
