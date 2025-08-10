const CACHE_NAME = 'spellrightpro-cache-v5';
const OFFLINE_URL = 'offline.html';
const PRECACHE_URLS = [
  'index.html',
  'premium.html',
  'pricing.html',
  'thankyou.html',
  'offline.html',
  'manifest.json',
  'robots.txt',
  'css/styles.css',
  'css/premium.css',
  'js/config.js',
  'js/common.js',
  'js/main-premium.js',
  'js/main-freemium-oet.js',
  'js/main-freemium-bee.js',
  'js/oet_word_list.js',
  'data/oet.json',
  'data/spelling-bee.json',
  'assets/logo.png',
  'assets/icons/icon-192x192.png',
  'assets/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS.concat([OFFLINE_URL])))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => (n === CACHE_NAME ? null : caches.delete(n)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request).then(networkResp => {
        if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return networkResp;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});
