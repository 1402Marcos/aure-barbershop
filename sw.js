// Service Worker de Aure Barbershop
// Cachea el "app shell" para que la app abra sin internet una vez visitada.
// Los DATOS (ventas, gastos, insumos) NO viven aquí — siguen en localStorage,
// dentro del propio index.html, y este archivo no los toca para nada.

const CACHE_NAME = 'aure-barbershop-v12';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Estrategia: red primero (para traer la versión más nueva si hay internet),
// y si falla (sin señal), sirve la copia guardada — así funciona offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
