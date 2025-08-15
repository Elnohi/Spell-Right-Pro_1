// sw.js
const CACHE_NAME = 'spellrightpro-cache-v5';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/', '/index.html',
  '/freemium-oet.html', '/freemium-bee.html',
  '/premium.html', '/thankyou.html', '/offline.html',
  '/css/styles.css', '/css/premium.css',
  '/js/config.js', '/js/common.js',
  '/js/main-freemium-oet.js', '/js/main-freemium-bee.js', '/js/main-premium.js',
  '/js/oet_word_list.js',
  '/assets/logo.png',
  '/assets/icons/icon-192x192.png', '/assets/icons/icon-512x512.png',
  '/assets/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map(n => (n === CACHE_NAME ? null : caches.delete(n)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // HTML/navigation → network-first to avoid stale pages
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets → cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(req);
    return cached || caches.match(OFFLINE_URL);
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  cache.put(req, fresh.clone());
  return fresh;
}
