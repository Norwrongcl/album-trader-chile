/* global caches, fetch, self */

const CACHE_NAME = 'album-trader-chile-v2'
const APP_SHELL = ['/manifest.webmanifest', '/icon.svg', '/icon.png', '/logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/', responseCopy)
          })

          return networkResponse
        })
        .catch(() => caches.match('/') || caches.match(event.request)),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(event.request).then((networkResponse) => {
        const responseCopy = networkResponse.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseCopy)
        })

        return networkResponse
      })
    }),
  )
})
