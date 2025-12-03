const CACHE_NAME = 'kws-beta-v3';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            cacheName: CACHE_NAME
          });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip caching for non-GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Check if this is a refresh request (Pull-to-Refresh)
  // When user pulls to refresh, the browser adds Cache-Control: no-cache
  const isRefresh = request.headers.get('cache-control') === 'no-cache' ||
                    request.headers.get('pragma') === 'no-cache' ||
                    (request.mode === 'navigate' && request.cache === 'reload');

  // Don't cache videos or large media files (they use Range Requests with 206 status)
  const url = new URL(request.url);
  const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(url.pathname);
  const isMedia = /\.(mp4|mov|webm|avi|mkv|m4v|jpg|jpeg|png|gif|webp)$/i.test(url.pathname);
  
  // For videos, always fetch from network and never cache
  if (isVideo) {
    event.respondWith(fetch(request));
    return;
  }

  // For refresh requests, always fetch from network and bypass ALL caches
  if (isRefresh) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      })
    );
    return;
  }

  // For media files, try network first, then cache
  if (isMedia) {
    event.respondWith(
      fetch(request).then((response) => {
        // Only cache successful responses
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // If network fails, try cache
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          // If cache also fails, return network error
          throw new Error('Network request failed and no cache available');
        });
      })
    );
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        // Only cache successful responses
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
