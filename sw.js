/* Sistem Perekodan Kesalahan Ringan Murid — Service Worker
   Tukar nombor versi CACHE setiap kali index.html dikemas kini supaya telefon mendapat versi baharu. */
const CACHE = 'demerit-v15';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './logo.png',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// Butang "Muat Semula" pada banner kemas kini mengaktifkan service worker baharu serta-merta
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // API (POST) tidak disimpan
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;

  // Semakan versi oleh aplikasi (index.html?_v=...): sentiasa dari rangkaian
  if (url.searchParams.has('_v')) { e.respondWith(fetch(req.url, { cache: 'no-store' })); return; }

  // Halaman aplikasi: papar salinan tersimpan SERTA-MERTA, kemas kini salinan di latar belakang.
  // Versi baharu dikesan oleh aplikasi dan banner "Muat Semula" dipaparkan.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return res; });
    e.respondWith(
      caches.match('./index.html').then(cached => cached || net)
        .catch(() => net)
    );
    e.waitUntil(net.catch(() => {}));
    return;
  }

  // Aset statik: cache dahulu, kemas kini di latar belakang
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
