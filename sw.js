// ============================================================
//  Jiron Technology PWA — Service Worker
//  Versión: 1.0.0
// ============================================================

const CACHE_NAME = 'jiron-tech-v1';

// Recursos a guardar en caché para uso sin conexión
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // CDN externos — se cachean en la primera visita
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// ── INSTALL: Cachear todos los recursos esenciales ──────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Instalando caché...');
      // Intentamos cachear cada recurso individualmente para que
      // un fallo en CDN externo no rompa la instalación.
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] No se pudo cachear:', url, err)
          )
        )
      );
    }).then(() => {
      console.log('[SW] Instalación completada.');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: Limpiar cachés viejas ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Activado y controlando clientes.');
      return self.clients.claim();
    })
  );
});

// ── FETCH: Estrategia Cache-First con fallback a red ────────
self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Devolver desde caché inmediatamente
        return cachedResponse;
      }

      // No está en caché — ir a la red y guardarlo
      return fetch(event.request)
        .then(networkResponse => {
          // Guardar en caché solo respuestas válidas
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type !== 'opaque'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Sin red y sin caché — devolver página offline si existe
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ── MENSAJE: Forzar actualización desde la UI ───────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
