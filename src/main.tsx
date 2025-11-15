import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Note: Global error handlers are registered in index.html to catch errors early
// This ensures storage errors are caught before they become uncaught exceptions

// Prevent zoom gestures on mobile
if (typeof window !== 'undefined') {
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevent pinch zoom
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });

  // Prevent zoom on wheel with Ctrl/Cmd key
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  }, { passive: false });
}

// Clear all caches on page load to ensure fresh data
if ('caches' in window) {
  caches.keys().then((cacheNames) => {
    return Promise.all(
      cacheNames.map((cacheName) => {
        // Keep service worker cache but clear it
        return caches.open(cacheName).then((cache) => {
          return cache.keys().then((keys) => {
            return Promise.all(keys.map((key) => cache.delete(key)));
          });
        });
      })
    );
  }).catch(() => {
    // Ignore errors
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
  
  // On page reload/refresh, unregister and re-register service worker to ensure fresh start
  if (performance.navigation?.type === 1 || performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          navigator.serviceWorker.register('/service-worker.js').catch(() => {});
        });
      });
    });
  }
}