// Gemmer appen offline. Svarer fra cachen med det samme og henter
// en frisk udgave i baggrunden, så ændringer ses næste gang appen åbnes.
const CACHE = 'opskrifter-v12';
const SHELL = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'recipes.json',
  'manifest.webmanifest',
  'ikoner/icon-192.png',
  'ikoner/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('.php')) return;

  // Opskrifterne hentes altid friske, når der er net, så nye opskrifter ses med det samme.
  if (url.pathname.endsWith('recipes.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put('recipes.json', res.clone()));
          return res;
        })
        .catch(() => caches.match('recipes.json'))
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
