const CACHE_VERSION = 'carity-pwa-v1'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache authenticated API responses or dashboard HTML; sensitive transport data must remain online-only.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_VERSION)
        return (await cache.match(OFFLINE_URL)) || Response.error()
      })
    )
    return
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const refreshed = fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseClone))
            }
            return response
          })
          .catch(() => cached)
        return cached || refreshed
      })
    )
  }
})

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Carity Transport',
    body: 'You have a new transport update.',
    url: '/',
    tag: 'carity-notification',
  }

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.body = event.data.text()
    }
  }

  const targetUrl = payload.url || '/'
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Carity Transport', {
      body: payload.body || 'You have a new transport update.',
      icon: '/icons/icon-192.png',
      badge: '/icons/maskable-192.png',
      tag: payload.tag || 'carity-notification',
      renotify: Boolean(payload.tag),
      requireInteraction: Boolean(payload.requireInteraction),
      data: { url: targetUrl },
      actions: [
        { action: 'open', title: 'Open Carity' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/'
  const absoluteTarget = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          if ('navigate' in client) client.navigate(absoluteTarget)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(absoluteTarget)
      return undefined
    })
  )
})

self.addEventListener('notificationclose', () => {
  // Reserved for future analytics. No-op keeps mobile notification lifecycle explicit.
})
