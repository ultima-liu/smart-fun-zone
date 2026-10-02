import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './pages/home-improvements.css';

async function startApp() {
  // preview 与 dev 共用 5173，旧生产 SW 即使不再注册也仍可能接管 dev。
  // 首次渲染图片前移除本应用的离线缓存，避免开发时反复读到旧资源。
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const controller = navigator.serviceWorker.controller;
      const controlledByApp = controller && new URL(controller.scriptURL).pathname === '/sw.js';
      const removed = await Promise.all(registrations.map((registration) => {
        const worker = registration.active ?? registration.waiting ?? registration.installing;
        return worker && new URL(worker.scriptURL).pathname === '/sw.js' ? registration.unregister() : undefined;
      }));
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((name) => name.startsWith('smart-fun-zone-')).map((name) => caches.delete(name)));
      // 注销不会解除当前文档的 controller；普通重载一次让旧 SW 真正退出。
      if (controlledByApp && removed.some(Boolean)) {
        window.location.reload();
        return;
      }
    } catch (error) {
      console.warn('Development cache cleanup failed:', error);
    }
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void startApp();

// PWA：生产环境注册 Service Worker（离线可用）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
