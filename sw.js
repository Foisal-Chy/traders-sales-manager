/* sw.js - offline support: tries the network first, falls back to the saved copy */
const V = 'fc-traders-v4', FILES = ['./', 'index.html', 'style.css', 'storage.js', 'bangla.js', 'products.js', 'sales.js', 'dashboard.js', 'reports.js', 'ocr.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'hdr-left.png', 'hdr-right.png', 'mgi-l.png', 'mgi-r.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  e.respondWith(fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
