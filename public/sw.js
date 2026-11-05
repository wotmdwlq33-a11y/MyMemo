/* MyMemo service worker: app-shell precache + runtime caching. Hand-written, no build step. */
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'mymemo-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Resolve against the registration scope so this works under a non-root BASE_URL.
const scopeUrl = (path) => new URL(path, self.registration.scope).href;

const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-maskable.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
].map(scopeUrl);

const INDEX_URL = scopeUrl('index.html');

// Find the hashed bundles (/assets/*.js, *.css) that index.html references, so the
// very first visit is usable offline even though those files loaded before the SW existed.
function assetUrlsFromHtml(html) {
  const urls = new Set();
  const re = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(html))) {
    const url = new URL(match[1], INDEX_URL);
    if (url.origin === self.location.origin && url.pathname.includes('/assets/')) {
      urls.add(url.href);
    }
  }
  return [...urls];
}

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })));
  const index = await cache.match(INDEX_URL);
  if (index) {
    const assets = assetUrlsFromHtml(await index.text());
    await cache.addAll(assets);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Keep the shell fresh so the offline fallback references current hashed assets.
      cache.put(INDEX_URL, response.clone());
    }
    return response;
  } catch (err) {
    const cached =
      (await cache.match(INDEX_URL, { ignoreVary: true })) ||
      (await cache.match(scopeUrl('./'), { ignoreVary: true }));
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  // ignoreVary: servers often send `Vary: Origin`, and crossorigin module/CSS requests
  // carry an Origin header that precached requests lack; the bytes are the same.
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    // Hashed Vite assets are immutable; no need to revalidate them.
    if (!new URL(request.url).pathname.includes('/assets/')) {
      event.waitUntil(network);
    }
    return cached;
  }
  const response = await network;
  return response || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event));
});
