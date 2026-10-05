/* Bondi · service worker: app shell offline + notificaciones de llegada

   CACHE debe acompañar los cambios del shell. Al publicar una versión:
     1) APP_VERSION en core.js        -> 'vNNN'
     2) los ?v=NNN de index.html      -> NNN
     3) VERSION acá abajo              -> 'vNNN'
   Si se olvida el paso 3 igual funciona (el HTML entra por red y los
   assets nuevos se cachean en runtime), pero queda basura en disco. */
'use strict';

var VERSION = 'v186';
var CACHE = 'bondi-' + VERSION;

/* shell precacheado: con esto la app abre sin conexión */
var SHELL = [
  './',
  'index.html',
  'style.css?v=186',
  'data.js?v=186',
  'core.js?v=186',
  'bici.js?v=186',
  'views.js?v=186',
  'main.js?v=186',
  'vendor/leaflet.css',
  'vendor/leaflet.js',
  'logo.svg',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (c) {
        /* cada archivo por separado: si uno falla no se cae todo el precache */
        return Promise.all(
          SHELL.map(function (u) {
            return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) { return k.indexOf('bondi-') === 0 && k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* fuera del origen (tiles, fuentes, geocoder, relay) → siempre la red */
  if (url.origin !== self.location.origin) return;

  /* navegación: red primero, y si no hay señal se sirve el shell guardado */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('index.html', copy); }).catch(function () {});
          return res;
        })
        .catch(function () {
          return caches
            .match('index.html')
            .then(function (r) { return r || caches.match('./'); })
            .then(function (r) { return r || Response.error(); });
        })
    );
    return;
  }

  /* estáticos: cache primero. Como cada versión cambia el ?v=, la URL nueva
     no está en cache y se vuelve a bajar sin tocar este archivo. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req)
        .then(function (res) {
          if (res && res.status === 200 && res.type === 'same-origin') {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
          }
          return res;
        })
        .catch(function () { return Response.error(); });
    })
  );
});

/* ---------- notificaciones de llegada ---------- */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      return self.clients.openWindow(self.registration.scope);
    })
  );
});
