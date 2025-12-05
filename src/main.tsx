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

// TEMPORARY FIX: Unregister service worker to test if it's causing the issue
// TODO: Re-enable after confirming it's the cause
if ('serviceWorker' in navigator) {
  // Unregister all service workers first
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    console.log('[Main] ⚠️ TEMPORARY FIX: Unregistering all service workers to test Supabase requests');
    registrations.forEach((registration) => {
      registration.unregister().then((success) => {
        console.log('[Main] Service Worker unregistered:', success);
      });
    });
  });
  
  // Don't register service worker for now - this is a test to see if it's causing the issue
  console.log('[Main] ⚠️ Service Worker registration DISABLED for testing');
  
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
}
  
  // On page reload/refresh, refresh service worker but DON'T clear caches immediately
  // Clearing caches too early can interfere with data fetching
  // Let React Query handle cache invalidation instead
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (performance.navigation?.type === 1 || navigation?.type === 'reload') {
    // Don't clear caches immediately - this can interfere with data fetching
    // React Query will handle cache invalidation through its own mechanisms
    // Only refresh service worker to get latest version
    console.log('[Main] Page reload detected, refreshing service worker (not clearing caches)');
    
    // Force service worker update on reload to ensure latest version is active
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      for (const registration of registrations) {
        try {
          console.log('[Main] ⚠️ Checking Service Worker state:', {
            active: registration.active?.scriptURL,
            waiting: registration.waiting?.scriptURL,
            installing: registration.installing?.scriptURL,
          });
          
          // First, try to update
          await registration.update();
          console.log('[Main] Service Worker update requested');
          
          // If there's a waiting service worker, skip waiting immediately
          if (registration.waiting) {
            console.log('[Main] ⚠️ Service Worker waiting - forcing SKIP_WAITING');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Wait a bit and then unregister/re-register to force update
            setTimeout(async () => {
              if (registration.waiting) {
                console.log('[Main] ⚠️ Service Worker still waiting - unregistering and re-registering');
                await registration.unregister();
                // Re-register will happen on next page load
                window.location.reload();
              }
            }, 2000);
          }
          
          // If there's an active service worker, check if it's the latest version
          if (registration.active) {
            console.log('[Main] Service Worker active:', registration.active.scriptURL);
            // Force update check
            const checkUpdate = setInterval(async () => {
              try {
                await registration.update();
                if (registration.waiting) {
                  clearInterval(checkUpdate);
                  console.log('[Main] ⚠️ New Service Worker found - activating');
                  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
              } catch (error) {
                clearInterval(checkUpdate);
              }
            }, 1000);
            
            // Stop checking after 5 seconds
            setTimeout(() => clearInterval(checkUpdate), 5000);
          }
        } catch (error) {
          console.error('[Main] Error updating service worker:', error);
        }
      }
    });
    
    // Only clear old caches after a delay to not interfere with initial data loading
    setTimeout(() => {
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          // Only clear old cache versions, not the current one
          const oldCaches = cacheNames.filter(name => !name.includes('kws-beta-v5'));
          if (oldCaches.length > 0) {
            return Promise.all(
              oldCaches.map((cacheName) => caches.delete(cacheName))
            );
          }
        }).then(() => {
          console.log('[Main] Old caches cleared (after data loading)');
        }).catch((error) => {
          console.error('[Main] Error clearing old caches:', error);
        });
      }
    }, 5000); // Wait 5 seconds after page load
  }
}