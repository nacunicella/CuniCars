// Service worker de CUNICARS.
// Estrategia network-first para el contenido propio: siempre intenta lo último
// (así los deploys nuevos se ven al instante) y cae al cache solo si no hay red.
// Los datos de Traccar (/api, websocket) y los tiles van directo a la red.
const CACHE = "cunicars-v2";
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
  // No tocar: métodos no-GET, API, otros orígenes (tiles de Google, etc.).
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api")) {
    return;
  }
  // Network-first: pedir a la red, cachear la copia, y si falla usar el cache.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("/index.html"))),
  );
});
