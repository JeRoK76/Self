// Offline-stöd för Selfbond. Höj VER när du vill tvinga fram en ny cache.
const VER = "selfbond-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Egna filer: hämta färskt när du är online, annars från cachen
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VER).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
  } else if (/(^|\.)cdn\.jsdelivr\.net$|(^|\.)storage\.googleapis\.com$/.test(url.hostname)) {
    // Kamerabiblioteket och ansiktsmodellen: spara första gången, använd sedan lokalt
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VER).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
