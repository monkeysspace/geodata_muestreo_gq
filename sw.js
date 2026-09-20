/* Service worker: deja la app completa guardada en el teléfono.
 * Una vez abierta con señal, arranca igual en terreno sin cobertura. */
const CACHE = 'geodata-gq-v1.0.0';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/catalogs.js',
  './js/db.js',
  './js/geo.js',
  './js/zip.js',
  './js/xlsx.js',
  './js/photos.js',
  './js/form.js',
  './js/list.js',
  './js/map.js',
  './js/export.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ARCHIVOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (llaves) {
      return Promise.all(llaves.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Cache primero: en terreno la red no existe o es peor que inútil (lenta). */
self.addEventListener('fetch', function (ev) {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    caches.match(ev.request).then(function (hit) {
      if (hit) return hit;
      return fetch(ev.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then(function (c) { c.put(ev.request, copia); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
