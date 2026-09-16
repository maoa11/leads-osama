/* sw.js — Service Worker بسيط: يحفظ نسخة من الصفحة عشان تفتح بدون نت.
   بياناتك مو هنا — بياناتك في localStorage داخل المتصفح. */
var CACHE = 'osama-crm-v2';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// الشبكة أولًا (عشان توصلك التحديثات)، ولو ما فيه نت أو تأخرت ٤ ثواني: النسخة المحفوظة
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(new Promise(function (resolve) {
    var settled = false;
    function fromCache() {
      return caches.match(req, { ignoreSearch: true })
        .then(function (r) { return r || (req.mode === 'navigate' ? caches.match('./') : null); })
        .then(function (r) { return r || caches.match('index.html'); });
    }
    function useCache() {
      if (settled) return;
      fromCache().then(function (r) {
        if (settled) return;
        if (r) { settled = true; resolve(r); }
      });
    }
    var timer = setTimeout(useCache, 4000);

    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      if (!settled) { settled = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      fromCache().then(function (r) {
        if (settled) return;
        settled = true;
        resolve(r || new Response('بدون اتصال', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
      });
    });
  }));
});

// الضغط على التنبيه يفتح الصفحة
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      return self.clients.openWindow ? self.clients.openWindow('./') : null;
    })
  );
});
