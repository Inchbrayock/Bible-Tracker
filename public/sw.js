const CACHE_NAME = 'selah-pwa-v3';
const SCOPE_URL = new URL('./', self.location.href);
const SCOPE_PATH = SCOPE_URL.pathname;
const INDEX_URL = new URL('index.html', SCOPE_URL).href;
const APP_SHELL = [
  SCOPE_URL.href,
  INDEX_URL,
  new URL('manifest.webmanifest', SCOPE_URL).href,
  new URL('apple-touch-icon.png', SCOPE_URL).href,
  new URL('icon-192.png', SCOPE_URL).href,
  new URL('icon-512.png', SCOPE_URL).href,
  new URL('favicon.svg', SCOPE_URL).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname === `${SCOPE_PATH}sw.js` ||
    url.pathname === `${SCOPE_PATH}version.json` ||
    url.pathname.startsWith('/__/')
  ) {
    return;
  }

  // Network-first for page navigations so web updates load immediately while supporting offline launch.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(INDEX_URL, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(INDEX_URL).then((cached) => cached || caches.match(SCOPE_URL.href))
        )
    );
    return;
  }

  // Cache-first for same-origin static assets (/assets/*, fonts, icons).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
