/* 聪明乐园 Service Worker：离线可用（构建产物带哈希，可安全缓存） */
const CACHE_PREFIX = 'smart-fun-zone-';
// 课程 P51 的任务一已从“9－3＝□”改为场景关系图；升级缓存以淘汰旧页面脚本。
const CACHE = 'smart-fun-zone-v4';

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
      : isStaticAsset ? caches.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          });
        }) : fetch(request),
  );
});
