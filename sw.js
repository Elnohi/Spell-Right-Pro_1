const CACHE_NAME = 'app-cache-v1';
const PRECACHE_ASSETS = [
  '/',               // Root page
  '/index.html',
  '/styles.css',     // Update paths for your actual CSS
  '/script.js',      // Update paths for your actual JS
  '/offline.html'    // A fallback page for offline mode
];

// Install: Pre-cache critical files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  clients.claim();
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: Network first, fall back to cache, then offline page
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Optionally cache the new resource
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Return offline fallback for navigations
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          // Last resort plain text response
          return new Response('Offline: resource not available', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
