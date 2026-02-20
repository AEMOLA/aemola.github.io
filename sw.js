const CACHE_NAME = 'class-schedule-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@latest/dist/font-face.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// نصب و کش کردن فایل‌های ثابت
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// استراتژی: کش اول، سپس شبکه (برای فایل‌های ثابت)
self.addEventListener('fetch', event => {
  // درخواست‌های مربوط به Supabase رو شبکه اول می‌گیریم (برای داده‌های به‌روز)
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // ذخیره در کش برای آفلاین
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request)) // آفلاین: برگرد از کش
    );
  } else {
    // برای فایل‌های ثابت (css, js, fonts, ...) اول کش بعد شبکه
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// مدیریت نوتیفیکیشن
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // باز کردن صفحه اصلی
  );
});

self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
