// BizTrack Malawi - service worker: offline app shell (Stage 3, feature 1)
const CACHE = 'biztrack-shell-v2';
const SHELL = [
  './', './index.html', './css/style.css',
  './js/db.js', './js/money.js', './js/calc.js', './js/app.js',
  './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for same-origin GET. Data never goes through here - IndexedDB only.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request))
  );
});
