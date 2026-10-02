/* 聪明乐园 Service Worker：离线可用（构建产物带哈希，可安全缓存） */
const CACHE_PREFIX = 'smart-fun-zone-';
// 淘汰可能把 SPA 的 HTML 回退误存为人物图片的旧缓存。
const CACHE = 'smart-fun-zone-v5';

function isUsableAsset(request, response) {
  if (!response || !response.ok) return false;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  const pathname = new URL(request.url).pathname;
  const isImage = request.destination === 'image' || /\.(?:png|jpe?g|webp|svg|gif|avif|ico)$/i.test(pathname);
  // HTTP 200 不代表返回了图片，开发服务器/SPA 托管可能回退到 index.html。
  return isImage ? type.startsWith('image/') : !type.includes('text/html');
}

async function staticAsset(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (isUsableAsset(request, hit)) return hit;
  if (hit) await cache.delete(request);
  // 损坏缓存恢复时，同时避开 HTTP 缓存里可能保存的错误页面。
  const isImage = request.destination === 'image' || /\.(?:png|jpe?g|webp|svg|gif|avif|ico)$/i.test(new URL(request.url).pathname);
  const response = await fetch(request, hit || isImage ? { cache: 'no-cache' } : undefined);
  if (isUsableAsset(request, response)) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/index.html', '/manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 跨域（字体等）走网络

  // API 响应可能包含账号、学习进度和家庭数据，绝不能进入共享 Cache Storage。
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  const isHtml = request.mode === 'navigate' || url.pathname === '/index.html';
  const isStaticAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|mjs|png|jpe?g|webp|svg|gif|woff2?|ttf|mp3|wav)$/i.test(url.pathname);

  event.respondWith(
    isHtml
      ? fetch(request, { cache: 'no-cache' })
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(async () => {
            // HTML 优先使用最新版本；离线时才回退到应用外壳。
            return (await caches.match(request)) || (await caches.match('/index.html')) || Response.error();
          })
      : isStaticAsset ? staticAsset(request) : fetch(request),
  );
});
