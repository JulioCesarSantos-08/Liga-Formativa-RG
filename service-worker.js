const CACHE_NAME = "liga-rio-grande-v2";

const ARCHIVOS_BASE = [
  "./",
  "./index.html",
  "./publico.html",
  "./login.html",
  "./manifest.json",
  "./css/global.css",
  "./css/publico.css",
  "./imagenes/logo.png",
  "./imagenes/icon-192.png",
  "./imagenes/icon-512.png",
  "./imagenes/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARCHIVOS_BASE);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => {
        return Promise.all(
          nombres.map((nombre) => {
            if (nombre !== CACHE_NAME) {
              return caches.delete(nombre);
            }

            return null;
          }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const copia = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copia);
        });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      }),
  );
});
