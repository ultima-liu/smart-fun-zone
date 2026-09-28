/* 聪明乐园 Service Worker：离线可用（构建产物带哈希，可安全缓存） */
const CACHE_PREFIX = 'smart-fun-zone-';
// 课程 P51 的任务一已从“9－3＝□”改为场景关系图；升级缓存以淘汰旧页面脚本。
const CACHE = 'smart-fun-zone-v3';

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

  const isHtml = request.mode === 'navigate' || url.pathname === '/index.html';

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
      : caches.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          });
        }),
  );
});
