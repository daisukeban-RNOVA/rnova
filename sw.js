// RNOVA offline worker, build 261021.2025-5b16ee9. Pages: network first (always the newest version when
// online, the cached copy offline). Bundles, fonts and pictures: cache first (their names change
// whenever their content does). version.json: never cached.
const CACHE = 'rnova-261021.2025-5b16ee9';
const BASE = '/rnova/';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE, BASE + 'manifest.webmanifest']).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname.endsWith('/version.json')) return;
  if (url.pathname.includes('/videos/')) return; // videos stream in parts; let the browser handle them
  if (req.mode === 'navigate') {
    e.respondWith(
      // Always ask the server (skip the browser's 10-minute page cache) so a new version shows at once.
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE, copy));
          return res;
        })
        .catch(() => caches.match(BASE).then((r) => r || caches.match(req))),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
