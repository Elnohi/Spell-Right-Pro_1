const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles.css', // Replace with your actual built CSS path if different
  '/script.js'   // Replace with your actual built JS path if different
];

// Install: Pre-cache critical files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        console.error('SW install precache failed:', err);
      })
  );
});

// Activate: Clean up old caches and enable navigation preload
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
    } finally {
      await self.clients.claim();
    }
  })());
});

// Fetch: strategies per request type with guaranteed Response fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Non-GET: pass through with simple offline fallback
  if (request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(() =>
        new Response('Offline: request not cached', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        })
      )
    );
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // 1) Navigations: network-first, then cache, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, preload.clone());
          return preload;
        }
        const netRes = await fetch(request);
        if (netRes && netRes.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, netRes.clone());
        }
        return netRes;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match('/offline.html');
        if (offline) return offline;
        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })());
    return;
  }

  // 2) Static assets: cache-first
  const staticDestinations = ['style', 'script', 'image', 'font', 'manifest'];
  if (isSameOrigin && staticDestinations.includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const netRes = await fetch(request);
        if (netRes && netRes.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, netRes.clone());
        }
        return netRes;
      } catch {
        return new Response('Offline: static asset not in cache', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })());
    return;
  }

  // 3) Others (APIs/cross-origin): network-first with timeout, cache fallback
  event.respondWith((async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const netRes = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (netRes && netRes.ok && (netRes.type === 'basic' || netRes.type === 'cors')) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, netRes.clone());
      }
      return netRes;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response('Offline: resource not available', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  })().catch((err) => {
    console.error('SW fetch handler fatal error:', err);
    return new Response('Service Worker error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }));
});

// Optional: allow page to trigger immediate activation after update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
