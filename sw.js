// Deja el juego disponible sin conexion. Con red siempre pide la version nueva
// y la guarda; sin red responde con la ultima guardada.
var CACHE = 'invicto7-v7';
var ARCHIVOS = ['./', 'index.html', 'data.js', 'campeones.js', 'engine.js', 'analitica.js', 'datos.js', 'sonido.js', 'arte.js', 'perfil.js', 'buzon.js', 'imagen.js', 'ui.js',
  'manifest.webmanifest', 'iconos/icono-192.png', 'iconos/icono-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) { return; }
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copia); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
  }));
});
