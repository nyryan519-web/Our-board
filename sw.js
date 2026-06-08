// Ledger service worker — offline app shell + runtime caching
const CACHE = "cookiepot-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon192.png",
  "./icon512.png",
  "./appletouchicon.png",
];

self.addEventListener("install", (e) => {
  // cache files individually so one missing file can't block installation
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // For page navigations, try network first, fall back to cached app shell (offline).
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // Everything else: cache-first, then network (and cache the result for next time).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});
