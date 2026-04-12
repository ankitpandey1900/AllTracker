const CACHE_NAME = 'alltracker-cache-v1.9.3'; // V1.9.3: Square Logo Fix (PWA Install Compliance)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/css/loader.css'
];

// Utility: Check if request is for the main site shell
const isNavigationRequest = (request) => {
  return request.mode === 'navigate' || (request.url.endsWith('/') || request.url.endsWith('/index.html'));
};

// Utility: Identify API or Dynamic data that should NEVER be cached by SW
const isApiRequest = (url) => {
  const apiPatterns = [
    'supabase.co',
    'api.groq.com',
    '/rest/v1/',
    '/auth/v1/'
  ];
  return apiPatterns.some(pattern => url.includes(pattern));
};

// Utility: Check if the request is for an external resource we want to cache (like fonts)
const isExternalCacheable = (url) => {
  return url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') || url.includes('flagcdn.com');
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. Block non-GET and API requests from the Cache
  if (event.request.method !== 'GET' || isApiRequest(url)) {
    return; // Fall through to standard network fetch
  }

  // 2. Navigation Strategy: Network-First
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Asset Strategy: Selective Stale-While-Revalidate
  const isInternal = url.startsWith(self.location.origin);
  const cacheableExtensions = ['.js', '.css', '.woff2', '.png', '.svg', '.jpg'];
  const isCacheableFile = cacheableExtensions.some(ext => url.toLowerCase().endsWith(ext));

  if ((isInternal && isCacheableFile) || isExternalCacheable(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Only cache successful GET responses that aren't too massive
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});

