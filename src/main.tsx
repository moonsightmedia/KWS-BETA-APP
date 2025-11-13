import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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