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

  // For refresh requests, always fetch from network and bypass cache
  if (isRefresh) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then((response) => {
        // Update cache in background but return fresh response
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
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
      // Update cache in background
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseClone);
      });
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


