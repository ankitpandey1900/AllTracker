const CACHE_NAME = 'alltracker-cache-v2.0.5'; // V2.0.5: New landing page; drop the cached old one
const ASSETS_TO_CACHE = [
  '/',
  '/app',
  '/app.html',
  '/manifest.json',
  '/app-logo.png',
  '/icon-192.png'
];

// Utility: Check if request is for the main site shell
const isNavigationRequest = (request) => {
  if (request.mode === 'navigate') return true;
  try {
    const { pathname } = new URL(request.url);
    return pathname === '/' || pathname === '/app' || pathname === '/app.html';
  } catch {
    return false;
  }
};

// Utility: Identify API or Dynamic data that should NEVER be cached by SW
const isApiRequest = (url) => {
  const apiPatterns = [
    'supabase.co',
    'api.groq.com',
    '/rest/v1/',
    '/auth/v1/',
    '/api/'
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
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS_TO_CACHE.map((asset) => cache.add(asset)))
    )
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
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Asset Strategy: Selective Stale-While-Revalidate (never cache HTML rewrites as JS/CSS)
  let pathname = '';
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    return;
  }

  const isInternal = url.startsWith(self.location.origin);
  const cacheableExtensions = ['.js', '.css', '.woff2', '.png', '.svg', '.jpg'];
  const isCacheableFile = cacheableExtensions.some(ext => pathname.endsWith(ext));
  const isCodeAsset = pathname.endsWith('.js') || pathname.endsWith('.css');

  if ((isInternal && isCacheableFile) || isExternalCacheable(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            const contentType = networkResponse.headers.get('content-type') || '';
            const validAsset = !isCodeAsset || !contentType.includes('text/html');
            if (networkResponse.ok && validAsset) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || Response.error());
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// 🔔 TACTICAL NOTIFICATIONS: Handle clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Try to find an existing window and focus it
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Push events arrive even when no AllTracker page is open. The server sends
// only user-opted-in subscriptions and the click brings the user back to the app.
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const options = {
    body: payload.body || 'Maamu has a study reminder for you.',
    icon: '/pwa-logo.png',
    badge: '/pwa-logo.png',
    tag: 'alltracker-maamu-reminder',
    renotify: true,
    data: { url: payload.url || '/app' },
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'AllTracker', options));
});
