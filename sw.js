/* PPICapp pembungkus PWA — service worker sederhana.
   Hanya menyimpan "cangkang" pembungkus (index, ikon, manifest) di perangkat.
   Data & halaman aplikasi (Google Apps Script) selalu diambil langsung dari internet. */
const CACHE = 'ppicapp-shell-v10';
const BASE = self.registration.scope;                       // otomatis benar di domain utama maupun sub-alamat (GitHub Pages)
const SHELL = ['', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo-256.png'].map(p => BASE + p);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // jangan sentuh Google Apps Script
  if (req.mode === 'navigate') {                            // halaman: utamakan jaringan, cadangan cache
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(BASE + 'index.html', copy)); return res;
      }).catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }
  e.respondWith(                                            // aset statis: cache dulu, perbarui di belakang
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
