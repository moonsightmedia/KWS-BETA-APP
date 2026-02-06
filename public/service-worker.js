/**
 * No-op service worker. App disables SW registration in main.tsx; this file
 * exists so any legacy/cached registration gets a valid script instead of 404,
 * reducing "Uncaught (in promise)" console noise (e.g. "Frame with ID ... was removed").
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});
self.addEventListener('activate', function () {
  self.clients.claim();
});
// Suppress unhandled rejections inside SW context (e.g. frame removed, extension noise)
self.addEventListener('unhandledrejection', function (event) {
  var msg = (event.reason && (event.reason.message || String(event.reason))) ? String(event.reason.message || event.reason).toLowerCase() : '';
  if (msg.indexOf('frame') !== -1 && msg.indexOf('was removed') !== -1) {
    event.preventDefault();
  }
});
