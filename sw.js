const CACHE = 'conductor-v2';
// Los assets versionados (?v=N) deben coincidir con los de index.html: si no,
// el SW cachea una URL que la pagina nunca pide y se sirve la version vieja.
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=2',
  './app.js?v=2',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
