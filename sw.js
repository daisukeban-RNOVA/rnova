// RNOVA offline worker, build 261021.2042-5dc447f. Pages: the saved copy first (instant open), refreshed in the
// background; update reloads (?v=) go to the network. Bundles, fonts and pictures: cache first (their names change
// whenever their content does). version.json: never cached.
const CACHE = 'rnova-261021.2042-5dc447f';
const BASE = '/rnova/';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([new Request(BASE, { cache: 'reload' }), new Request(BASE + 'manifest.webmanifest', { cache: 'reload' })]).catch(() => {})));
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
    // Opening the app: show the saved copy at once (the loading screen appears instantly, even on a
    // slow connection) and refresh the saved copy in the background. An update reload (?v=build)
    // always asks the server, so the new version arrives straight away.
    const fresh = () =>
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE, copy));
        }
        return res;
      });
    if (url.searchParams.has('v')) {
      e.respondWith(fresh().catch(() => caches.match(BASE).then((r) => r || caches.match(req))));
      return;
    }
    e.respondWith(
      caches.match(BASE).then((hit) => {
        if (hit) {
          e.waitUntil(fresh().catch(() => {}));
          return hit;
        }
        return fresh().catch(() => caches.match(req));
      }),
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
