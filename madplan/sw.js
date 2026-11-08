// Gemmer madplanen offline. Svarer fra cachen med det samme og henter en frisk udgave i baggrunden.
// Planen og opskrifterne hentes altid friske, når der er net.
const CACHE = 'madplan-v1';
const SHELL = [
  './',
  'index.html',
  'madplan.css',
  'app.js',
  'manifest.webmanifest',
  'ikoner/icon-192.png',
  'ikoner/apple-touch-icon.png',
  '../opskrifter/app.css',
  '../opskrifter/recipes.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('madplan-') && k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.endsWith('.json') && !url.pathname.endsWith('manifest.webmanifest')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(url.pathname, res.clone()));
          return res;
        })
        .catch(() => caches.match(url.pathname))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
