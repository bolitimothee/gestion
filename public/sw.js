const CACHE_NAME = 'gestion-commerce-v2';
const STATIC_CACHE = 'static-v2';

// URLs à mettre en cache (sera mis à jour automatiquement)
const urlsToCache = [
  '/',
  '/manifest.json',
  '/index.html'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des assets');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors de l\'installation:', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Stratégie de cache: Network First with fallback
self.addEventListener('fetch', (event) => {
  // Ne pas mettre en cache les requêtes API
  if (event.request.url.includes('supabase') || 
      event.request.url.includes('api') ||
      event.request.method !== 'GET') {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Network First pour les pages HTML
        if (event.request.destination === 'document') {
          return fetch(event.request)
            .then((networkResponse) => {
              // Mettre en cache la réponse réseau
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // Fallback au cache si réseau échoue
              return response;
            });
        }
        
        // Cache First pour les assets statiques
        if (response) {
          return response;
        }
        
        // Sinon, faire la requête réseau
        return fetch(event.request)
          .then((networkResponse) => {
            // Mettre en cache les assets statiques
            if (networkResponse.ok && 
                (event.request.destination === 'script' || 
                 event.request.destination === 'style' ||
                 event.request.destination === 'image')) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          });
      })
      .catch((error) => {
        console.error('Service Worker: Erreur de fetch:', error);
        return new Response('Erreur réseau', { status: 500 });
      })
  );
});
