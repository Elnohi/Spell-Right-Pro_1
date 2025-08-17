// sw.js — network-first for HTML, stale-while-revalidate for static
const VERSION = '2025-08-17-1';
const STATIC_CACHE = `static-${VERSION}`;
const HTML_CACHE = `html-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE)); // create cache up front
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // remove old versioned caches
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k !== STATIC_CACHE && k !== HTML_CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Network-first for navigations (HTML pages)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const copy = res.clone();
        caches.open(HTML_CACHE).then(c => c.put(req, copy));
        return res;
      } catch {
        // offline fallback: cached page or your offline.html if present
        return (await caches.match(req)) || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  const dest = req.destination;
  if (dest === 'script' || dest === 'style' || dest === 'image' || dest === 'font') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => undefined);
      return hit || fetchPromise || fetch(req);
    })());
  }
});
