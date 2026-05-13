const CACHE_NAME = 'indovinando-v2'
const OFFLINE_URL = '/offline.html'

// Risorse da pre-cachare all'installazione
const PRECACHE_URLS = [OFFLINE_URL, '/app_icon/apple-touch-icon.png', '/logo.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  // Rimuovi cache vecchie
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  // Solo richieste GET, ignora supabase/api/cross-origin
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Strategia: Network first, fallback a offline.html solo per navigazione HTML
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cacha i JSON dei corsi, gli asset statici e le pagine corso già visitate
        const shouldCache =
          url.pathname.startsWith('/corsi/') ||
          url.pathname.startsWith('/app_icon/') ||
          url.pathname === '/logo.svg' ||
          url.pathname.startsWith('/corso-vino')
        if (shouldCache) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline: prova la cache, altrimenti pagina offline per navigazione
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL)
          }
        })
      }),
  )
})
