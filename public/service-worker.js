const CACHE_NAME = 'kws-beta-v1';
const CORE_ASSETS = [
  '/',
  '/index.html'
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
                    request.mode === 'navigate' && request.cache === 'reload';

  // Don't cache videos or large media files (they use Range Requests with 206 status)
  const url = new URL(request.url);
  const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(url.pathname);
  const isMedia = /\.(mp4|mov|webm|avi|mkv|m4v|jpg|jpeg|png|gif|webp)$/i.test(url.pathname);
  
  // For videos, always fetch from network and never cache
  if (isVideo) {
    event.respondWith(fetch(request));
    return;
  }

  // For refresh requests, always fetch from network and bypass cache
  if (isRefresh) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then((response) => {
        // Only cache successful, complete responses (not partial 206)
        if (response.status === 200 && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Double-check it's not a partial response before caching
            if (responseClone.status !== 206) {
              cache.put(request, responseClone).catch(() => {
                // Ignore cache errors (e.g., if response is too large)
              });
            }
          });
        }
        return response;
      }).catch(() => {
        // If network fails, try cache as fallback
        return caches.match(request);
      })
    );
    return;
  }

  // Normal request: try network first, fallback to cache
  event.respondWith(
    fetch(request, { cache: 'no-cache' }).then((response) => {
      // Only cache successful, complete responses (not partial 206)
      // Also skip caching for large media files
      if (response.status === 200 && response.ok && !isMedia) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Double-check it's not a partial response before caching
          if (responseClone.status !== 206) {
            cache.put(request, responseClone).catch(() => {
              // Ignore cache errors (e.g., if response is too large)
            });
          }
        });
      }
      return response;
    }).catch(() => {
      // Network failed, try cache
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        // If both fail, return error response
        return new Response('Offline', { status: 503 });
      });
    })
  );
});


