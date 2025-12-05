const CACHE_NAME = 'kws-beta-v5'; // Increment version to force cache refresh
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
  const url = new URL(request.url);
  
  // CRITICAL: Never intercept Supabase requests - they cause CORS errors and caching issues
  // Supabase endpoints (Auth, REST API, Storage) must go directly to network without ANY service worker interference
  // Check for Supabase domains FIRST, before any other processing
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('supabase.io') ||
      url.hostname.includes('.supabase.co') ||
      url.hostname.includes('.supabase.io')) {
    // Don't intercept at all - let the request go directly to network
    // This is the safest way to ensure no interference
    // By not calling event.respondWith(), the browser handles the request natively
    return; // Exit early, don't call event.respondWith()
  }
  
  // Skip caching for non-GET requests (POST, PUT, DELETE, etc.)
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

  // For API/data requests (JSON, or requests to our domain), use network-first strategy
  // This ensures fresh data on reload
  const isApiRequest = url.pathname.endsWith('.json') || 
                       url.pathname.includes('/api/') ||
                       (url.origin === self.location.origin && request.headers.get('accept')?.includes('application/json'));
  
  // For page reloads, always use network-first to get fresh data
  const isPageReload = request.mode === 'navigate' || 
                       request.headers.get('cache-control') === 'no-cache' ||
                       request.headers.get('pragma') === 'no-cache';
  
  if (isApiRequest || isPageReload) {
    // Network-first strategy: Try network first, fallback to cache
    event.respondWith(
      fetch(request, {
        cache: 'no-store', // Always fetch from network, don't use HTTP cache
      }).then((response) => {
        // Only cache successful responses
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // If network fails, try cache as fallback
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          throw new Error('Network request failed and no cache available');
        });
      })
    );
    return;
  }

  // For other requests (static assets), use cache-first strategy
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
