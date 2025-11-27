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

// Register service worker (both dev and prod for background uploads)
if ('serviceWorker' in navigator) {
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
  
  // On page reload/refresh, clear all caches and refresh service worker
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (performance.navigation?.type === 1 || navigation?.type === 'reload') {
    // Clear all browser caches on refresh
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[Main] All caches cleared on page reload');
      }).catch((error) => {
        console.error('[Main] Error clearing caches on reload:', error);
      });
    }
    
    // Refresh service worker
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.update(); // Update service worker
      });
    });
  }
}