/*
 * StackBase service worker — Milestone 6 (SRS C8).
 *
 * Cache policy is an explicit allowlist, never a broad rule:
 *
 *   - NEVER cached: anything under /api/ (the Next route handlers proxy the
 *     session cookie to the API) and every cross-origin request (the API
 *     origin, Google Fonts). Private responses and ciphertext never enter
 *     Cache Storage through this worker.
 *   - Cached: public, content-addressed assets only — the offline shell,
 *     manifest, icons and favicon, plus hashed /_next/static bundles.
 *   - Navigations: network-first, falling back to the public offline shell.
 *     Authenticated HTML is deliberately not persisted, so a shared or stolen
 *     device finds no library data in the cache after the tab is gone.
 *
 * User-specific state lives in IndexedDB and is cleared on sign-out by the
 * app (features/offline), not here.
 */

const VERSION = 'stackbase-v1';
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

function isNeverCached(url) {
  return url.pathname.startsWith('/api/') || url.origin !== self.location.origin;
}

function isPublicAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.svg'
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // One missing asset must not abort the install; the shell still works.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* offline install: keep going */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('stackbase-static-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function navigationResponse(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_URL);
    if (cached) return cached;
    return new Response('You are offline.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

async function publicAssetResponse(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh quietly so a rebuilt bundle or a regenerated icon is not stuck.
    fetch(request)
      .then(async (response) => {
        if (response.ok) await cache.put(request, response);
      })
      .catch(() => {});
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isNeverCached(url)) return; // network only, no cache write

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (isPublicAsset(url)) {
    event.respondWith(publicAssetResponse(request));
  }
  // Anything else falls through to the network untouched.
});
