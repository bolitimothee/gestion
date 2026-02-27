const CACHE_NAME = 'gestion-cache-v3'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null)))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // do NOT intercept any requests - let all traffic go directly to network
  // this avoids any potential AbortSignal issues with cross-origin APIs (Supabase, etc)
  return
})
