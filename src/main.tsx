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
  // Unregister all service workers first - FORCE unregister
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    console.log('[Main] ⚠️ TEMPORARY FIX: Unregistering all service workers to test Supabase requests');
    for (const registration of registrations) {
      try {
        // Force unregister
        const success = await registration.unregister();
        console.log('[Main] Service Worker unregistered:', success);
        
        // Also try to update and then unregister to ensure it's gone
        await registration.update();
        if (registration.waiting) {
          await registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (error) {
        console.error('[Main] Error unregistering service worker:', error);
      }
    }
    
    // Double-check: Get registrations again and log if any are still there
    const remainingRegistrations = await navigator.serviceWorker.getRegistrations();
    if (remainingRegistrations.length > 0) {
      console.error('[Main] ⚠️ WARNING: Service Workers still registered after unregister attempt:', remainingRegistrations.length);
      remainingRegistrations.forEach((reg) => {
        console.error('[Main] Still registered:', reg.scope, reg.active?.scriptURL);
      });
    } else {
      console.log('[Main] ✅ All Service Workers successfully unregistered');
    }
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
  
  // On page reload/refresh, clear old caches but DON'T register service worker
  // Clearing caches too early can interfere with data fetching
  // Let React Query handle cache invalidation instead
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (performance.navigation?.type === 1 || navigation?.type === 'reload') {
    // Don't clear caches immediately - this can interfere with data fetching
    // React Query will handle cache invalidation through its own mechanisms
    console.log('[Main] Page reload detected (service worker disabled for testing)');
    
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