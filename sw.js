const VERSION = '24b1e8eb5be6';
const CACHE = 'lifenum-' + VERSION;
const PRECACHE = [
  "./",
  "./assets/index-DBa7cTTV.css",
  "./assets/index-CCdaw0FC.js",
  "./assets/web-Cm2HNoTQ.js",
  "./assets/web-C34jspSy.js",
  "./assets/web-WCn-wJM9.js",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];
const SHELL = new URL('./index.html', self.location);
const ROOT = new URL('./', self.location);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lifenum-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirstNavigation(request) {
  try {
    return await Promise.race([fetch(request), timeout(3000)]);
  } catch {
    const cache = await caches.open(CACHE);
    const options = { ignoreVary: true };
    return (await cache.match(SHELL, options)) || (await cache.match(ROOT, options)) || Response.error();
  }
}

function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), ms);
  });
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  const refresh = fetch(request).then((response) => {
    if (response && response.ok && response.type === 'basic') {
      void cache.put(request, response.clone());
    }
    return response;
  });

  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }

  try {
    return await refresh;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, request));
});
