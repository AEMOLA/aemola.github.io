const CACHE_NAME = 'class-schedule-v8';
const API_CACHE = 'class-schedule-api-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/settings.html',
  '/manifest.json',
  '/icons/sun.svg',
  '/icons/moon.svg',
  '/icons/cloud.svg',
  '/icons/ground-spring.svg',
  '/icons/ground-summer.svg',
  '/icons/ground-autumn.svg',
  '/icons/ground-snow.svg',
  '/icons/tree-spring.svg',
  '/icons/tree-summer.svg',
  '/icons/tree-autumn.svg',
  '/icons/tree-winter.svg',
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@latest/dist/font-face.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/lenis@1.3.11/dist/lenis.css',
  'https://unpkg.com/lenis@1.3.11/dist/lenis.min.js'
];

// نصب: کش استاتیک + بلافاصله فعال‌سازی تا کاربران قدیمی به‌روز شوند
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(() => {})
  );
});

// فعال‌سازی: پاک کردن کش‌های قدیمی و کنترل فوری
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// کش درخواست‌های Supabase با کلید کامل URL (برای آفلاین و رفرش بدون تغییر محتوا)
function getCacheKey(req) {
  try {
    const u = new URL(req.url);
    if (u.hostname.includes('supabase') && req.method === 'GET')
      return u.origin + u.pathname + u.search;
  } catch (e) {}
  return req.url;
}

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // درخواست‌های Supabase: شبکه اول، در صورت خطا از کش
  if (url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && event.request.method === 'GET') {
            const key = getCacheKey(event.request);
            const cacheReq = new Request(key, { method: 'GET' });
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(cacheReq, clone));
          }
          return response;
        })
        .catch(() => {
          const key = getCacheKey(event.request);
          return caches.open(API_CACHE).then(cache =>
            cache.match(new Request(key, { method: 'GET' }))
          ).then(cached => cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }));
        })
    );
    return;
  }

  // صفحهٔ اصلی: اول شبکه (برای به‌روزرسانی کاربران قدیمی)، در صورت خطا از کش
  if (event.request.mode === 'navigate' && event.request.url.indexOf(self.registration.scope) === 0) {
    event.respondWith(
      fetch(event.request)
        .then(function (res) {
          if (res.ok) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (c) { c.put(event.request, clone); });
          }
          return res;
        })
        .catch(function () {
          return caches.match(event.request).then(function (cached) {
            return cached || caches.match('/').then(function (index) { return index || fetch(event.request); });
          });
        })
    );
    return;
  }
  // اسکریپت و استایل: کش سپس شبکه
  if (event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request).then(r => r || fetch(event.request))
    );
  }
});

// نوتیفیکیشن از طریق پیام صفحه — در موبایل فقط از این طریق پایدار کار می‌کند
self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    const uniqueTag = tag || 'notif-' + Date.now();
    const promise = self.registration.showNotification(title || 'یادآور کلاس', {
      body: body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: uniqueTag,
      vibrate: [200, 100, 200],
      requireInteraction: false
    }).catch(function () {});
    if (event.waitUntil) event.waitUntil(promise);
  }
});

// Push برای نوتیف وقتی تب بسته است (نیاز به سرور برای ارسال push)
self.addEventListener('push', event => {
  let data = { title: 'یادآور کلاس', body: '' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'push-' + Date.now(),
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) list[0].focus();
      else if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
