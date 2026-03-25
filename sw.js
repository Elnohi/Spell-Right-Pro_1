// sw.js - Enhanced service worker with better caching strategy
const CACHE_VERSION = '2026-03-25-v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const HTML_CACHE = `html-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/css/premium.css',
  '/js/config.js',
  '/js/firebase-config.js',
  '/js/analytics.js',
  '/js/error-tracking.js',
  '/assets/logo.png'
];

// Assets that should always be network-first
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/premium\.html/,
  /\/pricing\.html/,
  /\/payment\.html/
];

self.addEventListener('install', event => {
  console.log('[SW] Installing new version');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('[SW] Failed to cache static assets:', err);
    })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating new version');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      const oldCaches = keys.filter(key => 
        key !== STATIC_CACHE && 
        key !== HTML_CACHE && 
        key !== ASSET_CACHE
      );
      
      await Promise.all(oldCaches.map(key => caches.delete(key)));
      await self.clients.claim();
      console.log('[SW] Cleaned up old caches');
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache clearing
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
        console.log('[SW] Cache cleared');
      })()
    );
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip third-party domains
  const thirdPartyDomains = [
    'googletagmanager.com',
    'google-analytics.com',
    'gstatic.com',
    'firebaseinstallations.googleapis.com',
    'pagead2.googlesyndication.com',
    'cdnjs.cloudflare.com'
  ];
  
  if (thirdPartyDomains.some(domain => url.hostname.includes(domain))) {
    return;
  }
  
  // Network-first for navigation (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(event.request);
          const cache = await caches.open(HTML_CACHE);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          // Network failed - try cache
          console.log('[SW] Network failed, trying cache for:', url.pathname);
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline page
          return caches.match('/offline.html');
        }
      })()
    );
    return;
  }
  
  // Network-first for premium and payment pages
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          const cache = await caches.open(HTML_CACHE);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          return caches.match(event.request);
        }
      })()
    );
    return;
  }
  
  // Stale-while-revalidate for static assets
  if (event.request.destination === 'script' ||
      event.request.destination === 'style' ||
      event.request.destination === 'image' ||
      event.request.destination === 'font') {
    
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cachedResponse = await cache.match(event.request);
        
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);
        
        return cachedResponse || fetchPromise;
      })()
    );
    return;
  }
  
  // Cache-first for everything else
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match(event.request);
      
      if (cachedResponse) {
        // Return cached and update in background
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            cache.put(event.request, networkResponse);
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      return fetch(event.request);
    })()
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgressData());
  }
});

async function syncProgressData() {
  const db = await openIndexedDB();
  const pending = await db.getAll('pendingSync');
  
  for (const item of pending) {
    try {
      await fetch('/api/sync-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
      await db.delete('pendingSync', item.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

// IndexedDB helper for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SpellRightProDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingSync')) {
        db.createObjectStore('pendingSync', { autoIncrement: true });
      }
    };
  });
}

console.log('[SW] Service Worker loaded with version:', CACHE_VERSION);
