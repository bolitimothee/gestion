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
  // Ne pas mettre en cache les requêtes API et pages d'authentification
  if (event.request.url.includes('supabase') || 
      event.request.url.includes('api') ||
      event.request.url.includes('/login') ||
      event.request.url.includes('/dashboard') ||
      event.request.url.includes('/stock') ||
      event.request.url.includes('/sales') ||
      event.request.url.includes('/finances') ||
      event.request.method !== 'GET') {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Network First pour les pages HTML - toujours aller au réseau pour éviter les problèmes de cache
        if (event.request.destination === 'document') {
          return fetch(event.request)
            .then((networkResponse) => {
              // Ne mettre en cache que la page d'accueil
              if (networkResponse.ok && event.request.url.endsWith('/')) {
                const responseClone = networkResponse.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // Fallback au cache uniquement pour la page d'accueil
              if (event.request.url.endsWith('/') && response) {
                return response;
              }
              throw new Error('Network failed');
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
