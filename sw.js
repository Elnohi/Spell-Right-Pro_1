const CACHE_NAME = 'spellrightpro-cache-v4';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/premium.html',
  '/pricing.html',
  '/thankyou.html',
  '/offline.html',
  '/styles.css',
  '/premium.css',
  '/config.js',
  '/common.js',
  '/main-freemium-oet.js',
  '/main-freemium-bee.js',
  '/main-premium.js',
  '/oet.json',
  '/spelling-bee.json',
  '/logo.png',
  '/manifest.json',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching');
        return cache.addAll(PRECACHE_URLS)
          .then(() => cache.add(OFFLINE_URL));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => event.request.headers.get('accept')?.includes('text/html') ? caches.match(OFFLINE_URL) : undefined)
  );
});
