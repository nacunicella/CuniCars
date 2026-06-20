// Service worker mínimo de CUNICARS: habilita la instalación PWA y cachea el
// shell para arranque offline. Los datos de Traccar (/api, tiles) van siempre a red.
const CACHE = "cunicars-v1";
const SHELL = ["/", "/index.html", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Nunca cachear API ni tiles ni websockets: siempre a la red.
  if (e.request.method !== "GET" || url.pathname.startsWith("/api") || url.hostname.endsWith("google.com") || url.hostname.includes("arcgisonline") || url.hostname.includes("cartocdn")) {
    return;
  }
  // App shell: cache-first con actualización en segundo plano.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    }),
  );
});
