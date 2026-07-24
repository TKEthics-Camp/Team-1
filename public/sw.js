// A small, hand-rolled service worker — no build-time precache manifest
// (Vite's hashed filenames change every build), so this caches
// opportunistically instead: network-first, falling back to whatever's
// already cached when offline, and always updating the cache from a
// successful network response. Good enough for "load once, then it works
// offline" without pulling in a bundler plugin.
const CACHE = "leaves-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Only same-origin GETs — anything else (Supabase API calls, POSTs) goes
  // straight to the network untouched.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
  );
});
