const CACHE_NAME = 'gestion-cache-v2'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null)))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
+
+  // don't handle cross-origin requests (e.g. Supabase API) to avoid
+  // forwarding an AbortSignal from the page which might already be aborted
+  const url = new URL(event.request.url)
+  if (url.origin !== self.location.origin) {
+    return // let the network handle it normally
+  }
+
+  // avoid 'only-if-cached' requests with mode != same-origin (see spec)
+  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
+    return
+  }
+
+  event.respondWith(
+    caches.match(event.request).then((cached) => {
+      if (cached) return cached
+      return fetch(event.request.clone()).then((res) => {
+        return caches.open(CACHE_NAME).then((cache) => {
+          try { cache.put(event.request.clone(), res.clone()) } catch (e) {}
+          return res
+        })
+      })
+    }).catch(() => caches.match('/index.html'))
+  )
+})
