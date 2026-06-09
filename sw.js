/* Kai Lin 個人網站 — Service Worker(network-first,離線時退回快取) */
const CACHE = "kai-site-v3";
const SHELL = [
  "/",
  "/index.html",
  "/IMG/logo/kai.png",
  "/IMG/logo/icon-192.png",
  "/IMG/logo/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("/index.html")))
  );
});
