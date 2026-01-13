// sw.js — Optimized caching strategy for SpellRightPro
const VERSION = '2025-10-07';
const STATIC_CACHE = `static-${VERSION}`;
const HTML_CACHE = `html-${VERSION}`;

// Critical assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/css/premium.css',
  '/js/config.js',
  '/js/analytics.js',
  '/assets/logo.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  console.log('🛠️ ServiceWorker installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('❌ Cache install failed:', err);
    })
  );
});

self.addEventListener('activate', event => {
  console.log('🚀 ServiceWorker activating...');
  event.waitUntil((async () => {
    // Clean up old caches
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== STATIC_CACHE && k !== HTML_CACHE)
        .map(k => {
          console.log('🗑️ Deleting old cache:', k);
          return caches.delete(k);
        })
    );
    
    // Take control immediately
    await self.clients.claim();
    console.log('✅ ServiceWorker ready!');
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  
  // 🚫 Skip third-party origins and non-GET requests
  if (req.method !== 'GET' ||
      url.origin !== self.location.origin ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('/admin/')) {
    return;
  }
  
  // 🧭 Network-first for HTML pages
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Try network first
        const networkResponse = await fetch(req);
        if (networkResponse.ok) {
          // Cache the response for offline use
          const cache = await caches.open(HTML_CACHE);
          await cache.put(req, networkResponse.clone());
          return networkResponse;
        }
        throw new Error('Network failed');
      } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(req);
        if (cachedResponse) {
          console.log('📂 Serving from cache:', req.url);
          return cachedResponse;
        }
        // Fallback to offline page
        console.log('📴 Offline fallback for:', req.url);
        return await caches.match('/offline.html');
      }
    })());
    return;
  }
  
  // 🧩 Cache-first for assets (CSS, JS, images)
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith((async () => {
      const cachedResponse = await caches.match(req);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      try {
        const networkResponse = await fetch(req);
        if (networkResponse.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(req, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Return empty response for assets if offline
        return new Response('', { 
          status: 408, 
          statusText: 'Offline' 
        });
      }
    })());
  }
});

// Handle messages from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
