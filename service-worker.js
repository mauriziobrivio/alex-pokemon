// Offline cache for the walking skeleton.
//
// Strategy: stale-while-revalidate. The cached copy is served immediately (so
// the app is instant and works offline), while a fresh copy is fetched in the
// background and stored for next time. That means a replaced file — e.g.
// swapping audio/dada/greeting.mp3 for Dada's real "Hi Alex!" clip — is picked
// up automatically on the next launch, with no manual cache bump required.
//
// Bump CACHE only when you want every device to drop old files immediately.

const CACHE = 'dada-academy-v1';

// Relative paths resolve against this script's location, so the cache works at a
// domain root, a GitHub Pages project subpath, or localhost without changes.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/main.js',
  './js/audio.js',
  './js/voices.js',
  './assets/screens/screen-title.png',
  './audio/dada/greeting.mp3',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Tolerant precache: one missing/renamed asset must NOT abort the whole
    // offline cache (as cache.addAll would). Cache each independently.
    const results = await Promise.allSettled(ASSETS.map((url) => cache.add(url)));
    const missed = results
      .map((r, i) => (r.status === 'rejected' ? ASSETS[i] : null))
      .filter(Boolean);
    if (missed.length) console.warn('[sw] precache misses (offline may be partial):', missed);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const networkFetch = fetch(req)
      .then((res) => {
        // Cache fresh, successful same-origin responses for next time.
        if (res && res.ok && res.type === 'basic') {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      })
      .catch(() => null);

    if (cached) {
      // Serve cache instantly; refresh in the background.
      event.waitUntil(networkFetch);
      return cached;
    }

    const fresh = await networkFetch;
    if (fresh) return fresh;

    // Offline and uncached: fall back to the cached shell for navigations.
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  })());
});
