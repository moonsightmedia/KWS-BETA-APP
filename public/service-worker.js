const CACHE_NAME = 'kws-beta-v2';
const UPLOAD_QUEUE_DB = 'upload-queue-db';
const UPLOAD_QUEUE_STORE = 'uploads';

const CORE_ASSETS = [
  '/',
  '/index.html'
];

// IndexedDB helper functions
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(UPLOAD_QUEUE_DB, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(UPLOAD_QUEUE_STORE)) {
        const store = db.createObjectStore(UPLOAD_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function addToQueue(uploadData) {
  const db = await openDB();
  const tx = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
  const store = tx.objectStore(UPLOAD_QUEUE_STORE);
  return store.add({
    ...uploadData,
    status: 'pending',
    timestamp: Date.now(),
    retries: 0
  });
}

async function updateQueueItem(id, updates) {
  const db = await openDB();
  const tx = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
  const store = tx.objectStore(UPLOAD_QUEUE_STORE);
  const item = await store.get(id);
  if (item) {
    Object.assign(item, updates);
    return store.put(item);
  }
}

async function getQueueItems(status = null) {
  const db = await openDB();
  const tx = db.transaction([UPLOAD_QUEUE_STORE], 'readonly');
  const store = tx.objectStore(UPLOAD_QUEUE_STORE);
  
  if (status) {
    const index = store.index('status');
    return index.getAll(status);
  }
  return store.getAll();
}

// Upload function that runs in service worker
async function processUpload(uploadData) {
  const { id, url, method, headers, body, fileData, chunkIndex, totalChunks, uploadSessionId } = uploadData;
  
  try {
    // Convert fileData back to Blob if needed
    let formData;
    if (chunkIndex !== undefined) {
      // Chunked upload
      formData = new FormData();
      const blob = new Blob([new Uint8Array(fileData)], { type: headers['Content-Type'] || 'application/octet-stream' });
      formData.append('chunk', blob);
      
      // Add chunk headers
      Object.keys(headers).forEach(key => {
        if (key !== 'Content-Type') {
          formData.append(key, headers[key]);
        }
      });
    } else {
      // Single file upload
      formData = new FormData();
      const blob = new Blob([new Uint8Array(fileData)], { type: headers['Content-Type'] || 'application/octet-stream' });
      formData.append('file', blob, headers['X-File-Name'] || 'file');
      
      // Add headers as form data
      Object.keys(headers).forEach(key => {
        if (key !== 'Content-Type' && key !== 'X-File-Name') {
          formData.append(key, headers[key]);
        }
      });
    }
    
    const response = await fetch(url, {
      method: method || 'POST',
      body: formData,
      // Don't set headers here - FormData handles it
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Update queue item
    await updateQueueItem(id, {
      status: 'completed',
      result: result
    });
    
    // Notify client
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'UPLOAD_COMPLETE',
        uploadId: id,
        result: result
      });
    });
    
    return result;
  } catch (error) {
    console.error('[Service Worker] Upload error:', error);
    
    // Update queue item with error
    await updateQueueItem(id, {
      status: 'failed',
      error: error.message,
      retries: (uploadData.retries || 0) + 1
    });
    
    // Notify client
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'UPLOAD_ERROR',
        uploadId: id,
        error: error.message
      });
    });
    
    throw error;
  }
}

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

// Background Sync for uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-queue') {
    event.waitUntil(
      getQueueItems('pending').then(items => {
        return Promise.all(
          items.map(item => {
            if (item.retries < 3) {
              return processUpload(item).catch(err => {
                console.error('[Service Worker] Failed to process upload:', err);
              });
            }
          })
        );
      })
    );
  }
});

// Message handler for upload requests
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'QUEUE_UPLOAD') {
    const uploadData = event.data.uploadData;
    
    // Add to queue
    addToQueue(uploadData).then(id => {
      // Register background sync
      if ('sync' in self.registration) {
        self.registration.sync.register('upload-queue').catch(err => {
          console.error('[Service Worker] Failed to register sync:', err);
          // Fallback: process immediately
          processUpload({ ...uploadData, id }).catch(console.error);
        });
      } else {
        // Fallback: process immediately if sync not supported
        processUpload({ ...uploadData, id }).catch(console.error);
      }
      
      // Notify client
      event.ports[0].postMessage({ success: true, id });
    }).catch(err => {
      console.error('[Service Worker] Failed to queue upload:', err);
      event.ports[0].postMessage({ success: false, error: err.message });
    });
  } else if (event.data && event.data.type === 'GET_QUEUE_STATUS') {
    getQueueItems().then(items => {
      event.ports[0].postMessage({ items });
    }).catch(err => {
      event.ports[0].postMessage({ error: err.message });
    });
  }
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
}
