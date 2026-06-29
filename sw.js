// Service Worker - Jiron Technology Background PWA
const CACHE_NAME = 'jiron-tech-v1';

// Recursos que se cachean para funcionar sin internet
const STATIC_ASSETS = [
  './index.html',
  './manifest.json'
];

// Instalar: cachear recursos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activar: eliminar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first para CDN, cache-first para archivos locales
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Recursos externos (Tailwind, FontAwesome, Google Fonts): red primero, fallback silencioso
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Archivos locales: cache primero, red como respaldo
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
