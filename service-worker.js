const CACHE_NAME = "liga-rio-grande-v3";

const CACHE_PREFIX = "liga-rio-grande-";

const ARCHIVOS_BASE = [
    "./",
    "./index.html",
    "./publico.html",
    "./login.html",
    "./manifest.json",
    "./css/global.css",
    "./css/publico.css",
    "./css/index.css",
    "./js/index.js",
    "./imagenes/logo.png",
    "./imagenes/icon-192.png",
    "./imagenes/icon-512.png",
    "./imagenes/icon-maskable-512.png"
];


self.addEventListener(
    "install",
    event => {

        event.waitUntil(
            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    async cache => {

                        await Promise.allSettled(
                            ARCHIVOS_BASE.map(
                                archivo => {

                                    return cache.add(
                                        archivo
                                    );

                                }
                            )
                        );

                    }
                )
        );

    }
);


self.addEventListener(
    "activate",
    event => {

        event.waitUntil(
            caches
                .keys()
                .then(
                    nombres => {

                        return Promise.all(
                            nombres
                                .filter(
                                    nombre => {

                                        return (
                                            nombre.startsWith(
                                                CACHE_PREFIX
                                            ) &&
                                            nombre !==
                                                CACHE_NAME
                                        );

                                    }
                                )
                                .map(
                                    nombre => {

                                        return caches.delete(
                                            nombre
                                        );

                                    }
                                )
                        );

                    }
                )
                .then(
                    () => {

                        return self.clients.claim();

                    }
                )
        );

    }
);


self.addEventListener(
    "message",
    event => {

        if (
            event.data?.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);


self.addEventListener(
    "fetch",
    event => {

        if (
            event.request.method !==
            "GET"
        ) {

            return;

        }


        const url =
            new URL(
                event.request.url
            );


        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        if (
            event.request.mode ===
            "navigate"
        ) {

            event.respondWith(
                manejarNavegacion(
                    event.request
                )
            );

            return;

        }


        event.respondWith(
            manejarRecurso(
                event.request
            )
        );

    }
);


async function manejarNavegacion(
    request
) {

    try {

        const response =
            await fetch(
                request,
                {
                    cache:
                        "no-store"
                }
            );


        if (
            response &&
            response.ok
        ) {

            const cache =
                await caches.open(
                    CACHE_NAME
                );


            await cache.put(
                request,
                response.clone()
            );

        }


        return response;

    } catch (error) {

        const respuestaCache =
            await caches.match(
                request
            );


        if (respuestaCache) {

            return respuestaCache;

        }


        const url =
            new URL(
                request.url
            );


        if (
            url.pathname.endsWith(
                "/publico.html"
            )
        ) {

            const publicoCache =
                await caches.match(
                    "./publico.html"
                );


            if (publicoCache) {

                return publicoCache;

            }

        }


        if (
            url.pathname.endsWith(
                "/login.html"
            )
        ) {

            const loginCache =
                await caches.match(
                    "./login.html"
                );


            if (loginCache) {

                return loginCache;

            }

        }


        const indexCache =
            await caches.match(
                "./index.html"
            );


        if (indexCache) {

            return indexCache;

        }


        return new Response(
            "Sin conexión",
            {
                status:
                    503,

                statusText:
                    "Sin conexión",

                headers: {
                    "Content-Type":
                        "text/plain; charset=utf-8"
                }
            }
        );

    }

}


async function manejarRecurso(
    request
) {

    try {

        const response =
            await fetch(
                request,
                {
                    cache:
                        "no-store"
                }
            );


        if (
            response &&
            response.ok
        ) {

            const cache =
                await caches.open(
                    CACHE_NAME
                );


            await cache.put(
                request,
                response.clone()
            );

        }


        return response;

    } catch (error) {

        const respuestaCache =
            await caches.match(
                request
            );


        if (respuestaCache) {

            return respuestaCache;

        }


        throw error;

    }

}
