// CACHE BUST: Version 3 - Force reload of all JavaScript files
console.log('[Main] 🚀 Loading application v3 - Cache busted');

// NOTE: Fetch is already overridden in index.html BEFORE this module loads
// This ensures Supabase requests are intercepted even before module imports
console.log('[Main] 🔍 Checking if fetch was already overridden in index.html:', {
  windowFetch: typeof window.fetch,
  fetchToString: window.fetch.toString().substring(0, 150),
  hasIndexOverride: window.fetch.toString().includes('Index HTML Fetch Override'),
});

// Keep the override in main.tsx as a backup, but index.html should have already done it
const originalFetch = window.fetch;
let fetchCallCount = 0;

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const urlObj = new URL(urlString, window.location.origin);
  
  // Only intercept Supabase requests
  const isSupabaseRequest = urlObj.hostname.includes('supabase.co') || 
                            urlObj.hostname.includes('supabase.io') ||
                            urlObj.hostname.includes('.supabase.co') ||
                            urlObj.hostname.includes('.supabase.io');
  
  if (isSupabaseRequest) {
    fetchCallCount++;
    const callId = fetchCallCount;
    const startTime = Date.now();
    
    // CRITICAL FIX: Preserve all headers correctly, including API keys
    // Convert Headers object to plain object if needed, but preserve all headers
    let headers: HeadersInit | undefined = init?.headers;
    
    // If headers is a Headers object, convert to plain object
    if (headers instanceof Headers) {
      const headersObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      headers = headersObj;
    }
    
    // If headers is an array, convert to object
    if (Array.isArray(headers)) {
      const headersObj: Record<string, string> = {};
      headers.forEach(([key, value]) => {
        headersObj[key] = value;
      });
      headers = headersObj;
    }
    
    // Ensure we have all original headers, including Authorization and API keys
    const finalHeaders: Record<string, string> = {
      ...(headers as Record<string, string> || {}),
      // Preserve any headers from init that might not be in headers object
      ...(init?.headers && typeof init.headers === 'object' && !(init.headers instanceof Headers) && !Array.isArray(init.headers) 
        ? init.headers as Record<string, string> 
        : {}),
    };
    
    // If input is a Request object, preserve its headers too
    if (input instanceof Request) {
      input.headers.forEach((value, key) => {
        if (!finalHeaders[key]) {
          finalHeaders[key] = value;
        }
      });
    }
    
    console.log(`[Main Fetch Override] 🚀 [${callId}] Starting Supabase request:`, {
      url: urlObj.href,
      pathname: urlObj.pathname,
      method: init?.method || 'GET',
      hasAuth: !!finalHeaders['Authorization'] || !!finalHeaders['authorization'],
      hasApiKey: !!(finalHeaders['apikey'] || finalHeaders['apiKey'] || finalHeaders['x-api-key']),
      headerKeys: Object.keys(finalHeaders),
      timestamp: new Date().toISOString(),
    });
    
    try {
      // CRITICAL: Use original fetch with ALL headers preserved
      // Create a new Request to ensure all headers are included
      const requestInit: RequestInit = {
        ...init,
        headers: finalHeaders, // Use processed headers
        cache: 'no-store' as RequestCache,
      };
      
      // If input is a Request, merge its properties
      const request = input instanceof Request 
        ? new Request(input, requestInit)
        : new Request(input as string, requestInit);
      
      const response = await originalFetch(request);
      
      const duration = Date.now() - startTime;
      console.log(`[Main Fetch Override] ✅ [${callId}] Response received:`, {
        url: urlObj.href,
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
      });
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[Main Fetch Override] ❌ [${callId}] Request failed:`, {
        url: urlObj.href,
        error: error?.message || error,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }
  
  // For non-Supabase requests, use original fetch
  return originalFetch(input, init);
};

console.log('[Main] ✅ Native fetch overridden BEFORE Supabase import');
console.log('[Main] 🔍 Fetch override check:', {
  originalFetch: typeof originalFetch,
  windowFetch: typeof window.fetch,
  isOverridden: window.fetch !== originalFetch,
  fetchToString: window.fetch.toString().substring(0, 100),
});

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Note: Global error handlers are registered in index.html to catch errors early
// This ensures storage errors are caught before they become uncaught exceptions

// Prevent zoom gestures on mobile
if (typeof window !== 'undefined') {
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  const handleTouchEnd = (event: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  };

  // Prevent pinch zoom
  const handleGestureStart = (e: Event) => {
    e.preventDefault();
  };
  
  const handleGestureChange = (e: Event) => {
    e.preventDefault();
  };
  
  const handleGestureEnd = (e: Event) => {
    e.preventDefault();
  };

  // Prevent zoom on wheel with Ctrl/Cmd key
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  };

  document.addEventListener('touchend', handleTouchEnd, false);
  document.addEventListener('gesturestart', handleGestureStart);
  document.addEventListener('gesturechange', handleGestureChange);
  document.addEventListener('gestureend', handleGestureEnd);
  document.addEventListener('wheel', handleWheel, { passive: false });

  // Cleanup function (though this runs on page unload, so cleanup is less critical)
  // But it's good practice to have it for potential hot-reload scenarios
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureChange);
      document.removeEventListener('gestureend', handleGestureEnd);
      document.removeEventListener('wheel', handleWheel);
    });
  }
}

// Don't clear all caches on page load - this was too aggressive
// Instead, rely on React Query's staleTime and refetchOnMount settings
// Only clear caches on explicit refresh (handled by service worker)

createRoot(document.getElementById("root")!).render(<App />);

// Listen for messages from service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_SUPABASE_BYPASS') {
      console.log('[Main] ✅ Service Worker bypassed Supabase request:', {
        url: event.data.url,
        method: event.data.method,
        timestamp: event.data.timestamp,
      });
    }
  });
}

// CRITICAL FIX: Completely disable service worker IMMEDIATELY - clear all caches and unregister
// The service worker is blocking Supabase requests even though it should bypass them
// This must happen IMMEDIATELY, not after delays, to prevent blocking requests
if ('serviceWorker' in navigator) {
  // IMMEDIATELY clear all caches first (synchronous where possible)
  if ('caches' in window) {
    // Don't wait - clear caches immediately
    caches.keys().then(async (cacheNames) => {
      console.log('[Main] 🗑️ IMMEDIATELY clearing all caches to remove service worker:', cacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[Main] ✅ All caches cleared');
    }).catch((error) => {
      console.error('[Main] Error clearing caches:', error);
    });
  }
  
  // IMMEDIATELY unregister all service workers - FORCE unregister (don't wait)
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    console.log('[Main] ⚠️ CRITICAL FIX: IMMEDIATELY unregistering all service workers');
    
    if (registrations.length === 0) {
      console.log('[Main] ✅ No service workers found');
      return;
    }
    
    for (const registration of registrations) {
      try {
        console.log('[Main] Unregistering:', registration.scope, registration.active?.scriptURL);
        
        // Stop all service worker states immediately
        if (registration.active) {
          try {
            registration.active.postMessage({ type: 'SKIP_WAITING' });
          } catch (e) {}
        }
        if (registration.waiting) {
          try {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          } catch (e) {}
        }
        if (registration.installing) {
          try {
            registration.installing.postMessage({ type: 'SKIP_WAITING' });
          } catch (e) {}
        }
        
        // Force unregister immediately
        const success = await registration.unregister();
        console.log('[Main] Service Worker unregistered:', success);
      } catch (error) {
        console.error('[Main] Error unregistering service worker:', error);
      }
    }
    
    // Double-check immediately (no delay)
    const remaining = await navigator.serviceWorker.getRegistrations();
    if (remaining.length > 0) {
      console.error('[Main] ⚠️ WARNING: Service Workers still registered:', remaining.length);
      for (const reg of remaining) {
        try {
          await reg.unregister();
          console.log('[Main] Second unregister:', 'SUCCESS');
        } catch (e) {
          console.error('[Main] Second unregister failed:', e);
        }
      }
    } else {
      console.log('[Main] ✅ All Service Workers successfully unregistered');
    }
  }).catch((error) => {
    console.error('[Main] Error getting service worker registrations:', error);
  });
  
  // BLOCK any new service worker registrations immediately
  const originalRegister = navigator.serviceWorker.register;
  navigator.serviceWorker.register = function(...args: any[]) {
    console.warn('[Main] ⚠️ BLOCKED: Service Worker registration attempt blocked:', args[0]);
    return Promise.reject(new Error('Service Worker registration is disabled'));
  };
  
  console.log('[Main] ⚠️ Service Worker registration BLOCKED - file renamed to .disabled');
  
  // OLD CODE - commented out for testing
  /*
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('[Main] Service Worker registered:', registration.scope);
        
        // Request persistent storage for background uploads
        if ('storage' in navigator && 'persist' in navigator.storage) {
          navigator.storage.persist().then((granted) => {
            console.log('[Main] Persistent storage granted:', granted);
          });
        }
      })
      .catch((err) => {
        console.error('[Main] Service Worker registration failed:', err);
      });
  });
  */
  
  // On page reload/refresh, clear browser caches (but NOT React Query cache)
  // React Query cache should persist to allow queries to use cached data during reload
  // Only clear browser/service worker caches to ensure fresh assets
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (performance.navigation?.type === 1 || navigation?.type === 'reload') {
    const reloadStartTime = Date.now();
    console.log('[Main] 🔄 Page reload detected - clearing React Query cache and forcing refetch...');
    console.log('[Main] 📊 Debugging info:', {
      timestamp: new Date().toISOString(),
      navigationType: navigation?.type || performance.navigation?.type,
    });
    
    // CRITICAL FIX: Clear React Query cache on reload to force fresh queries
    // This ensures queries are re-executed after reload
    setTimeout(() => {
      // Import QueryClient dynamically to avoid circular dependencies
      import('@tanstack/react-query').then(({ QueryClient }) => {
        // Get the query client instance from the app
        // We need to access it through the window object or a global
        const queryClient = (window as any).__queryClient;
        if (queryClient) {
          console.log('[Main] 🗑️ Clearing React Query cache on reload...');
          queryClient.clear();
          console.log('[Main] ✅ React Query cache cleared - queries will refetch');
        } else {
          console.warn('[Main] ⚠️ QueryClient not found on window object');
        }
      }).catch((error) => {
        console.error('[Main] Error importing QueryClient:', error);
      });
    }, 100);
    
    // Clear browser caches (service worker caches)
    if ('caches' in window) {
      setTimeout(() => {
        caches.keys().then(async (cacheNames) => {
          console.log('[Main] Clearing browser caches on reload:', cacheNames);
          const cleared = await Promise.allSettled(
            cacheNames.map((cacheName) => {
              console.log('[Main] Deleting cache on reload:', cacheName);
              return caches.delete(cacheName);
            })
          );
          const successCount = cleared.filter(r => r.status === 'fulfilled').length;
          const duration = Date.now() - reloadStartTime;
          console.log(`[Main] ✅ Cleared ${successCount}/${cacheNames.length} browser caches in ${duration}ms`);
        }).catch((error) => {
          console.error('[Main] Error clearing browser caches on reload:', error);
        });
      }, 200);
    }
  }
}