/* sw.js - offline support. Always asks the server for a fresh copy first, falls back to the saved copy when offline */
const V = 'fc-traders-v8', FILES = ['./', 'index.html', 'style.css', 'storage.js', 'products.js', 'sales.js', 'dashboard.js', 'reports.js', 'ocr.js', 'business.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'hdr-left.png', 'hdr-right.png', 'mgi-l.png', 'mgi-r.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const same = new URL(r.url).origin === location.origin;
  e.respondWith(fetch(same ? new Request(r, { cache: 'no-cache' }) : r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
