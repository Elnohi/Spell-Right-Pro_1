const CACHE_VERSION = 'v3';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',                // Netlify will serve /index.html
  '/index.html',
  '/premium.html',
  '/offline.html',
  '/css/styles.css',
  '/css/premium.css',
  '/js/config.js',
  '/js/common.js',
  '/js/oet_word_list.js',
  '/js/main-premium.js',
  '/assets/logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE_ASSETS)).catch(err => {
    console.error('SW install precache failed:', err);
  }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      if ('navigationPreload' in self.registration) await self.registration.navigationPreload.enable();
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)));
    } finally {
      await self.clients.claim();
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    event.respondWith(fetch(request).catch(() =>
      new Response('Offline: request not cached', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    ));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse; if (preload) return preload;
        const net = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE); cache.put(request, net.clone());
        return net;
      } catch {
        const cached = await caches.match(request); if (cached) return cached;
        const offline = await caches.match('/offline.html'); if (offline) return offline;
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const staticDest = ['style','script','image','font','manifest'];

  if (isSameOrigin && staticDest.includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request); if (cached) return cached;
      try {
        const net = await fetch(request);
        if (net && net.ok) { const cache = await caches.open(STATIC_CACHE); cache.put(request, net.clone()); }
        return net;
      } catch {
        return new Response('Offline: static not in cache', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const controller = new AbortController(); const t = setTimeout(()=>controller.abort(), 8000);
      const net = await fetch(request, { signal: controller.signal }); clearTimeout(t);
      if (net && net.ok && (net.type === 'basic' || net.type === 'cors')) {
        const cache = await caches.open(RUNTIME_CACHE); cache.put(request, net.clone());
      }
      return net;
    } catch {
      const cached = await caches.match(request); if (cached) return cached;
      return new Response('Offline: resource not available', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })().catch(err => new Response('Service Worker error', { status: 500 })));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
