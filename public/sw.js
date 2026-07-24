const CACHE_NAME = 'gestion-commerce-v4';
const STATIC_CACHE = 'static-v4';
const DYNAMIC_CACHE = 'dynamic-v4';

// Simple logger pour le service worker. Active les debug seulement si self.__DEV__ est vrai.
const swLogger = {
  debug: (...args) => { try { if (self && self.__DEV__) console.debug(...args); } catch { /* ignore */ } },
  info: (...args) => { try { if (self && self.__DEV__) console.info(...args); } catch { /* ignore */ } },
  warn: (...args) => { try { console.warn(...args); } catch { /* ignore */ } },
  error: (...args) => { try { console.error(...args); } catch { /* ignore */ } }
};

// URLs à mettre en cache pour PWA
const urlsToCache = [
  '/',
  '/manifest.json',
  '/index.html',
  '/icon-192.png?v=2',
  '/icon-512.png?v=2'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  swLogger.debug('Service Worker: Installation PWA iOS');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        swLogger.debug('Service Worker: Mise en cache des assets PWA');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        swLogger.debug('Service Worker: Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        swLogger.error('Service Worker: Erreur lors de l\'installation:', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  swLogger.debug('Service Worker: Activation PWA iOS');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            swLogger.debug('Service Worker: Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      swLogger.debug('Service Worker: Activation terminée');
      return self.clients.claim();
    })
  );
});

// Stratégie de cache: Network First with fallback
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ne pas traiter les schémas non supportés par Cache API
  if (requestUrl.protocol !== 'https:' && requestUrl.protocol !== 'http:') {
    return;
  }

  // Ne pas mettre en cache les requêtes API, les pages d'authentification ou les requêtes non GET
  if (event.request.method !== 'GET' ||
      event.request.url.includes('supabase') ||
      event.request.url.includes('/login') ||
      event.request.url.includes('/register') ||
      event.request.url.includes('/api')) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            event.waitUntil(
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone))
            );
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request)
          .then((cachedResponse) => cachedResponse || caches.match('/index.html') || caches.match('/'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok &&
              ['script', 'style', 'image', 'font', 'document'].includes(event.request.destination)) {
            const responseClone = networkResponse.clone();
            event.waitUntil(
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone))
            );
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || networkPromise.then((response) => response || new Response('Erreur réseau', { status: 500 }));
    })
  );
});