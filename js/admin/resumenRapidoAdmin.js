function calcularResumen(datos, ahora = Date.now()) {
    const jugadores = datos.jugadores || [];
    const partidos = datos.partidos || [];

    const normalizar = valor => String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const finalizado = partido =>
        partido.resultadoRegistrado === true ||
        [
            "finalizado",
            "finalizada",
            "terminado",
            "terminada"
        ].includes(normalizar(partido.estado));

    const cancelado = partido =>
        ["cancelado", "cancelada"].includes(
            normalizar(partido.estado)
        );

    const pendientes = partidos.filter(partido =>
        !cancelado(partido) && !finalizado(partido)
    );

    const altas = jugadores.filter(jugador => {
        const valor = jugador.creadoEn;
        let tiempo = NaN;

        try {
            if (typeof valor?.toMillis === "function") {
                tiempo = valor.toMillis();
            } else if (valor instanceof Date) {
                tiempo = valor.getTime();
            } else if (typeof valor?.seconds === "number") {
                tiempo = valor.seconds * 1000;
            }
        } catch {
            return false;
        }

        return Number.isFinite(tiempo) &&
            tiempo >= ahora - 86400000 &&
            tiempo <= ahora;
    }).length;

    return [
        [
            "Jugadores activos",
            jugadores.filter(jugador =>
                jugador.activo !== false
            ).length
        ],
        [
            "Altas en las últimas 24 horas",
            altas
        ],
        [
            "Partidos pendientes",
            pendientes.length
        ],
        [
            "Partidos finalizados",
            partidos.filter(partido =>
                !cancelado(partido) && finalizado(partido)
            ).length
        ],
        [
            "Pendientes sin árbitro",
            pendientes.filter(partido =>
                !String(partido.arbitroId || "").trim()
            ).length,
            true
        ],
        [
            "Cédulas pendientes",
            datos.cedulasPendientes,
            true
        ]
    ];
}

export function crearResumenRapidoAdmin({ obtenerDatos }) {
    if (typeof obtenerDatos !== "function") {
        throw new Error(
            "Falta conectar los datos del resumen administrativo."
        );
    }

    const estilo = new URL(
        "../../css/resumenRapidoAdmin.css",
        import.meta.url
    );

    if (
        !document.querySelector(
            "link[data-estilos-resumen-admin]"
        )
    ) {
        const enlace = document.createElement("link");
        enlace.rel = "stylesheet";
        enlace.href = estilo.href;
        enlace.dataset.estilosResumenAdmin = "true";
        document.head.appendChild(enlace);
    }

    const dialogo = document.createElement("dialog");
    dialogo.className = "ra-dialogo";
    dialogo.setAttribute(
        "aria-labelledby",
        "raTituloAdmin"
    );

    dialogo.innerHTML = `
        <header class="ra-cabecera">
            <p class="ra-etiqueta">
                Administración · Vista rápida
            </p>
            <h2 class="ra-titulo" id="raTituloAdmin">
                Tu liga, de un vistazo
            </h2>
            <p class="ra-subtitulo" data-saludo></p>
            <button
                class="ra-cerrar"
                type="button"
                aria-label="Cerrar resumen"
                autofocus
            >×</button>
        </header>

        <div class="ra-cuerpo">
            <div class="ra-contexto">
                <strong data-temporada></strong>
                <span data-actualizacion></span>
            </div>

            <p
                class="ra-aviso"
                role="status"
                data-aviso
                hidden
            ></p>

            <section
                data-resultados
                aria-label="Resumen de actividad"
            >
                <h3 class="ra-seccion-titulo">
                    Lo que necesitas revisar
                </h3>
                <div
                    class="ra-metricas"
                    data-metricas
                ></div>
            </section>

            <section>
                <h3 class="ra-seccion-titulo">
                    Ir directamente
                </h3>

                <nav
                    class="ra-accesos"
                    aria-label="Accesos administrativos"
                >
                    <a
                        class="ra-acceso"
                        href="adminPartidos.html"
                    >Gestionar partidos</a>

                    <a
                        class="ra-acceso"
                        href="adminConfiguracion.html"
                    >Solicitudes y configuración</a>

                    <a
                        class="ra-acceso"
                        href="adminDocumentosJugadores.html"
                    >Documentación de jugadores</a>

                    <a
                        class="ra-acceso"
                        href="adminResumenEquipos.html"
                    >Resumen de equipos</a>

                    <a
                        class="ra-acceso"
                        href="adminAltasJugadores.html"
                    >Ver altas recientes</a>

                    <a
                        class="ra-acceso"
                        href="adminArbitros.html"
                    >Árbitros y credenciales</a>
                </nav>
            </section>

            <p class="ra-pie">
                Las cifras utilizan la última carga del panel.
                Los partidos corresponden al alcance de temporada
                del dashboard. Las altas incluyen registros activos
                e inactivos; las ediciones no cuentan como altas.
            </p>
        </div>
    `;

    document.body.appendChild(dialogo);

    const buscar = selector =>
        dialogo.querySelector(selector);

    const aviso = buscar("[data-aviso]");
    const resultados = buscar("[data-resultados]");
    const metricas = buscar("[data-metricas]");

    let focoAnterior = null;

    function actualizar() {
        let datos;

        try {
            datos = obtenerDatos();

            if (!datos || typeof datos !== "object") {
                throw new Error("Sin datos");
            }
        } catch (error) {
            console.error(
                "No se pudo preparar el resumen:",
                error
            );

            aviso.textContent =
                "No se pudo preparar el resumen. Recarga el panel e intenta nuevamente.";

            aviso.hidden = false;
            resultados.hidden = true;
            metricas.replaceChildren();
            return;
        }

        const nombre =
            datos.usuario?.nombre ||
            datos.usuario?.nombreCompleto ||
            "Administrador";

        buscar("[data-saludo]").textContent =
            `${nombre}, aquí tienes la actividad y los accesos principales.`;

        buscar("[data-temporada]").textContent =
            datos.temporada || "Todas las temporadas";

        buscar("[data-actualizacion]").textContent =
            datos.actualizadoEn
                ? "Datos cargados: " +
                    new Intl.DateTimeFormat("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                    }).format(
                        new Date(datos.actualizadoEn)
                    )
                : "Sin carga completada";

        metricas.replaceChildren();

        if (datos.cargando || datos.estado !== "listo") {
            resultados.hidden = true;
            aviso.hidden = false;

            aviso.textContent = datos.cargando
                ? "Se está cargando la información del panel. El resumen se actualizará al terminar."
                : "No se completó la carga de datos. Recarga el panel para consultar cifras completas.";

            return;
        }

        aviso.hidden = true;
        resultados.hidden = false;

        const formato = new Intl.NumberFormat("es-MX");

        for (
            const [titulo, cantidad, atencion]
            of calcularResumen(datos)
        ) {
            const tarjeta = document.createElement("div");
            tarjeta.className = "ra-metrica";

            if (atencion && cantidad > 0) {
                tarjeta.dataset.tono = "atencion";
            }

            const numero = document.createElement("strong");
            numero.className = "ra-numero";

            numero.textContent = Number.isFinite(cantidad)
                ? formato.format(cantidad)
                : "—";

            const etiqueta = document.createElement("span");
            etiqueta.className = "ra-metrica-texto";
            etiqueta.textContent = titulo;

            tarjeta.append(numero, etiqueta);
            metricas.appendChild(tarjeta);
        }
    }

    function cerrar() {
        if (dialogo.open) {
            dialogo.close();
        }
    }

    buscar(".ra-cerrar").addEventListener(
        "click",
        cerrar
    );

    dialogo.addEventListener("click", evento => {
        if (evento.target !== dialogo) return;

        const area = dialogo.getBoundingClientRect();

        if (
            evento.clientX < area.left ||
            evento.clientX > area.right ||
            evento.clientY < area.top ||
            evento.clientY > area.bottom
        ) {
            cerrar();
        }
    });

    dialogo.addEventListener("close", () => {
        if (focoAnterior?.isConnected) {
            focoAnterior.focus({
                preventScroll: true
            });
        }
    });

    return {
        abrir() {
            actualizar();

            if (dialogo.open) return;

            focoAnterior = document.activeElement;
            dialogo.showModal();
        },

        cerrar,

        actualizar() {
            if (dialogo.open) {
                actualizar();
            }
        }
    };
}