const CACHE_NAME = 'timer-pro-v2.2.3';
// 动态获取基础路径（兼容根路径和子路径部署）
const BASE = self.registration.scope.replace(/\/$/, '');
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/main.js',
  BASE + '/manifest.json',
  BASE + '/supabase.min.js',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 请求：缓存优先，网络兜底
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => {
          if (e.request.mode === 'navigate') {
            return caches.match(BASE + '/index.html');
          }
        });
      })
  );
});
