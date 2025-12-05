// CACHE BUST: Version 2 - Force reload of all JavaScript files
console.log('[Main] 🚀 Loading application v2 - Cache busted');

// CRITICAL: Override native fetch BEFORE Supabase is imported
// This ensures ALL Supabase requests are intercepted
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
    
    // Preserve all headers
    let headers: HeadersInit | undefined = init?.headers;
    if (headers instanceof Headers) {
      const headersObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      headers = headersObj;
    }
    
    console.log(`[Main Fetch Override] 🚀 [${callId}] Starting Supabase request:`, {
      url: urlObj.href,
      pathname: urlObj.pathname,
      method: init?.method || 'GET',
      hasAuth: !!(headers && (headers as any)['Authorization']),
      hasApiKey: !!(headers && ((headers as any)['apikey'] || (headers as any)['apiKey'])),
      headerKeys: headers ? Object.keys(headers) : [],
      timestamp: new Date().toISOString(),
    });
    
    try {
      // Use original fetch with ALL original options
      const response = await originalFetch(input, {
        ...init,
        headers: headers || init?.headers,
        cache: 'no-store' as RequestCache,
      });
      
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

// CRITICAL FIX: Completely disable service worker - clear all caches and unregister
// The service worker is blocking Supabase requests even though it should bypass them
if ('serviceWorker' in navigator) {
  // First, clear all caches to remove cached service worker
  if ('caches' in window) {
    caches.keys().then(async (cacheNames) => {
      console.log('[Main] 🗑️ Clearing all caches to remove service worker:', cacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[Main] ✅ All caches cleared');
    });
  }
  
  // Unregister all service workers - FORCE unregister
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    console.log('[Main] ⚠️ CRITICAL FIX: Unregistering all service workers to test Supabase requests');
    for (const registration of registrations) {
      try {
        // Stop the service worker first
        if (registration.active) {
          registration.active.postMessage({ type: 'SKIP_WAITING' });
        }
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        if (registration.installing) {
          registration.installing.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Force unregister
        const success = await registration.unregister();
        console.log('[Main] Service Worker unregistered:', success, registration.scope);
      } catch (error) {
        console.error('[Main] Error unregistering service worker:', error);
      }
    }
    
    // Wait and double-check: Get registrations again
    setTimeout(async () => {
      const remainingRegistrations = await navigator.serviceWorker.getRegistrations();
      if (remainingRegistrations.length > 0) {
        console.error('[Main] ⚠️ WARNING: Service Workers still registered:', remainingRegistrations.length);
        for (const reg of remainingRegistrations) {
          console.error('[Main] Still registered:', reg.scope, reg.active?.scriptURL);
          try {
            await reg.unregister();
            console.log('[Main] Second unregister attempt successful');
          } catch (e) {
            console.error('[Main] Second unregister failed:', e);
          }
        }
      } else {
        console.log('[Main] ✅ All Service Workers successfully unregistered');
      }
    }, 500);
  });
  
  // Don't register service worker - file is renamed to .disabled
  console.log('[Main] ⚠️ Service Worker registration DISABLED - file renamed to .disabled');
  
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
  
  // On page reload/refresh, clear ALL caches immediately in Production
  // This is critical for Production where Service Worker might still be active
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (performance.navigation?.type === 1 || navigation?.type === 'reload') {
    console.log('[Main] Page reload detected - clearing ALL caches (Production fix)');
    
    // Clear ALL caches immediately on reload in Production
    if ('caches' in window) {
      caches.keys().then(async (cacheNames) => {
        console.log('[Main] Clearing ALL caches on reload:', cacheNames);
        await Promise.all(cacheNames.map((cacheName) => {
          console.log('[Main] Deleting cache on reload:', cacheName);
          return caches.delete(cacheName);
        }));
        console.log('[Main] ✅ All caches cleared on reload');
      }).catch((error) => {
        console.error('[Main] Error clearing caches on reload:', error);
      });
    }
  }
}