const CACHE = 'conductor-v3';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
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

// El codigo de la app (HTML/JS/CSS) va network-first: siempre se intenta la
// version publicada y el cache queda de respaldo para abrir sin conexion. Asi
// un deploy entra en la siguiente apertura sin versionar las URLs a mano.
function esCodigo(request) {
  if (request.mode === 'navigate') return true;
  return /\.(html|js|css)$/.test(new URL(request.url).pathname);
}

// 'no-cache' obliga a revalidar contra el servidor: sin esto el max-age=600
// de GitHub Pages puede devolver el archivo viejo desde el cache HTTP del
// navegador y mezclar versiones.
function desdeLaRed(request) {
  return fetch(request, { cache: 'no-cache' }).catch(() => fetch(request));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  if (!esCodigo(e.request)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }

  e.respondWith(
    desdeLaRed(e.request)
      .then(resp => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
