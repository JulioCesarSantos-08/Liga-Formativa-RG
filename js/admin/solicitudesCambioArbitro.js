import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";
import {
    aprobarCambioArbitro,
    rechazarCambioArbitro
} from "./aprobarCambioArbitro.js";

async function iniciar() {
    const usuario = await protegerPagina(["admin"]);

    if (!usuario) return;

    const adminUid = usuario.firebaseUser?.uid || usuario.uid;
    const contenedor = prepararPestanaArbitros();

    if (
        !adminUid ||
        !contenedor ||
        document.getElementById("panelSolicitudesCambioArbitro")
    ) {
        return;
    }

    let solicitudes = [];
    const respuestas = new Map();
    const ocupadas = new Set();

    const estilos = document.createElement("style");
    estilos.textContent = `
    .solicitudes-arbitros-panel {
        margin-bottom:22px;
        border:1px solid #c8d5ca;
        border-radius:22px;
        background:#fff8e8;
        overflow:hidden;
        box-shadow:0 10px 28px rgba(38,67,48,.08);
    }
    .solicitudes-arbitros-cabecera {
        display:flex;
        justify-content:space-between;
        gap:16px;
        flex-wrap:wrap;
        align-items:center;
        padding:22px;
        background:linear-gradient(120deg,#07574f,#0b756d);
        color:white;
    }
    .solicitudes-arbitros-cabecera h3 {
        margin:0;
        color:white;
        font-size:1.12rem;
        line-height:1.5;
    }
    .solicitudes-arbitros-cabecera [data-cambios="total"] {
        display:inline-block;
        margin-left:8px;
        padding:4px 10px;
        border-radius:999px;
        background:rgba(255,255,255,.16);
        color:#fff8e8;
        font-size:.75rem;
        font-weight:800;
    }
    .solicitudes-arbitros-panel p {
        font-size:.86rem;
        line-height:1.6;
    }
    .solicitudes-arbitros-panel>p {
        margin:0;
        padding:14px 22px;
        color:#526960;
    }
    .solicitudes-arbitros-panel select,
    .solicitudes-arbitros-panel textarea {
        min-height:46px;
        padding:11px 13px;
        border:1px solid #c4b17f;
        border-radius:12px;
        background:#fffaf0;
        color:#17332e;
        font:inherit;
    }
    .solicitudes-arbitros-cabecera select {
        min-width:160px;
        background:#fff8e8;
        font-size:.85rem;
        font-weight:700;
    }
    .solicitudes-arbitros-panel textarea {
        width:100%;
        min-height:95px;
        resize:vertical;
        margin-top:8px;
        box-sizing:border-box;
        line-height:1.5;
    }
    .solicitudes-arbitros-panel select:focus-visible,
    .solicitudes-arbitros-panel textarea:focus-visible,
    .solicitud-arbitro-acciones button:focus-visible {
        outline:3px solid #62b9aa;
        outline-offset:3px;
    }
    .solicitudes-arbitros-lista {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:16px;
        padding:6px 22px 22px;
    }
    .solicitudes-arbitros-lista>p {
        grid-column:1/-1;
        margin:0;
        padding:32px 20px;
        border:1px dashed #c4b17f;
        border-radius:16px;
        background:rgba(228,238,227,.55);
        text-align:center;
        color:#526960;
    }
    .solicitud-arbitro-card {
        position:relative;
        padding:20px;
        border:1px solid #d7dccd;
        border-radius:17px;
        background:linear-gradient(180deg,#ffffff,#fffaf0);
        box-shadow:0 5px 16px rgba(38,67,48,.05);
        min-width:0;
    }
    .solicitud-arbitro-card h4 {
        margin:0 0 12px;
        font-size:1rem;
        line-height:1.5;
        color:#07574f;
    }
    .solicitud-arbitro-card p {
        margin:9px 0;
        overflow-wrap:anywhere;
        white-space:pre-wrap;
        color:#405c51;
    }
    .solicitud-arbitro-card label {
        display:block;
        margin-top:18px;
        font-size:.8rem;
        line-height:1.5;
        font-weight:800;
        color:#07574f;
    }
    .solicitud-arbitro-acciones {
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:14px;
    }
    .solicitud-arbitro-acciones button {
        flex:1;
        min-height:46px;
        padding:12px 16px;
        border:1px solid #07574f;
        border-radius:11px;
        background:#0b756d;
        color:white;
        font-weight:800;
        font-size:.82rem;
        cursor:pointer;
        box-shadow:0 4px 10px rgba(11,117,109,.12);
    }
    .solicitud-arbitro-acciones .rechazar {
        border-color:#e2b9ac;
        background:#f9e4dc;
        color:#923b2b;
        box-shadow:none;
    }
    .solicitud-arbitro-acciones button:disabled {
        opacity:.55;
        cursor:default;
        box-shadow:none;
    }
    .solicitud-arbitro-estado {
        display:inline-block;
        padding:6px 11px;
        border:1px solid #bad6c9;
        border-radius:999px;
        background:#e5efea;
        color:#07574f;
        font-size:.7rem;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.04em;
    }
    .solicitud-arbitro-estado.pendiente {
        border-color:#ecd18a;
        background:#fff0bd;
        color:#7b5800;
    }
    .solicitud-arbitro-estado.rechazada {
        border-color:#e3beb4;
        background:#f9ded8;
        color:#982d24;
    }
    .solicitudes-arbitros-panel>.solicitudes-arbitros-mensaje {
        margin:0 22px 14px;
        padding:12px 14px;
        border-radius:12px;
        background:#e5efea;
        color:#07574f;
        font-weight:700;
        white-space:pre-wrap;
    }
    .solicitudes-arbitros-panel>.solicitudes-arbitros-mensaje:empty {
        display:none;
    }
    .solicitudes-arbitros-panel>.solicitudes-arbitros-mensaje.error {
        background:#f9ded8;
        color:#982d24;
    }
    .contador-cambios-arbitro {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:21px;
        min-height:21px;
        padding:3px 7px;
        border-radius:999px;
        background:#bd4c2b;
        color:white;
        font-size:.7rem;
        font-weight:900;
    }
    .contador-cambios-arbitro[hidden] {
        display:none!important;
    }
    .enlace-gestion-arbitros {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:44px;
        padding:10px 14px;
        border:1px solid #b9ccc4;
        border-radius:12px;
        background:#e5efea;
        color:#07574f;
        text-decoration:none;
        font-size:.82rem;
        font-weight:800;
        white-space:nowrap;
    }
    @media(max-width:850px) {
        .solicitudes-arbitros-lista {
            grid-template-columns:1fr;
        }
    }
    @media(max-width:550px) {
        .solicitudes-arbitros-cabecera {
            padding:17px;
            gap:12px;
        }
        .solicitudes-arbitros-cabecera h3 {
            font-size:1rem;
        }
        .solicitudes-arbitros-cabecera select {
            width:100%;
        }
        .solicitudes-arbitros-cabecera [data-cambios="total"] {
            margin:6px 0 0;
        }
        .solicitudes-arbitros-panel>p {
            padding:12px 17px;
        }
        .solicitudes-arbitros-lista {
            padding:4px 14px 14px;
        }
        .solicitud-arbitro-card {
            padding:16px;
        }
        .solicitudes-arbitros-panel>.solicitudes-arbitros-mensaje {
            margin-left:14px;
            margin-right:14px;
        }
        .enlace-gestion-arbitros {
            white-space:normal;
            width:100%;
        }
    }
`;

    document.head.appendChild(estilos);

    const panel = document.createElement("article");
    panel.id = "panelSolicitudesCambioArbitro";
    panel.className = "solicitudes-arbitros-panel";
    panel.innerHTML = `
        <div class="solicitudes-arbitros-cabecera">
            <h3>
                Solicitudes de cambio de árbitro
                <span data-cambios="total">0</span>
            </h3>
            <select
                data-cambios="filtro"
                aria-label="Filtrar solicitudes de árbitros"
            >
                <option value="pendiente">Pendientes</option>
                <option value="todas">Todas</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
            </select>
        </div>
        <p>
            Revisa el motivo y el árbitro propuesto antes de resolver
            cada solicitud.
        </p>
        <p
            data-cambios="mensaje"
            class="solicitudes-arbitros-mensaje"
            role="status"
            aria-live="polite"
        ></p>
        <div data-cambios="lista" class="solicitudes-arbitros-lista">
            Cargando solicitudes...
        </div>
    `;

    contenedor.prepend(panel);

    const lista = panel.querySelector('[data-cambios="lista"]');
    const filtro = panel.querySelector('[data-cambios="filtro"]');
    const total = panel.querySelector('[data-cambios="total"]');
    const mensaje = panel.querySelector('[data-cambios="mensaje"]');

    const pestana = document.querySelector(
        '[data-seccion="arbitros"]'
    );

    const contador = document.createElement("span");
    contador.className = "contador-cambios-arbitro";
    contador.hidden = true;

    if (pestana) pestana.appendChild(contador);

    function texto(destino, contenido, etiqueta = "p") {
        const elemento = document.createElement(etiqueta);
        elemento.textContent = contenido;
        destino.appendChild(elemento);
        return elemento;
    }

    function mostrarMensaje(contenido, error = false) {
        mensaje.textContent = contenido;
        mensaje.classList.toggle("error", error);
    }

    async function resolver(solicitud, aprobar, respuesta) {
        if (ocupadas.has(solicitud.id)) return;

        if (!aprobar && !respuesta.trim()) {
            mostrarMensaje(
                "Escribe el motivo del rechazo en la respuesta administrativa.",
                true
            );
            return;
        }

        ocupadas.add(solicitud.id);
        mostrarMensaje("Guardando la resolución...");
        renderizar();

        try {
            const operacion = aprobar
                ? aprobarCambioArbitro
                : rechazarCambioArbitro;

            await operacion({
                solicitudId: solicitud.id,
                adminUid,
                respuesta
            });

            respuestas.delete(solicitud.id);

            mostrarMensaje(
                aprobar
                    ? "Solicitud aprobada. El partido tiene actualizado su árbitro."
                    : "Solicitud rechazada. Se conservó el árbitro asignado."
            );
        } catch (error) {
            console.error("Error resolviendo cambio de árbitro:", error);
            mostrarMensaje(
                error.message || "No se pudo resolver la solicitud.",
                true
            );
        } finally {
            ocupadas.delete(solicitud.id);
            renderizar();
        }
    }

    function renderizar() {
        const pendientes = solicitudes.filter(
            s => s.estado === "pendiente"
        ).length;

        total.textContent = "· " + pendientes + " pendientes";
        contador.textContent = pendientes;
        contador.hidden = pendientes === 0;
        contador.setAttribute(
            "aria-label",
            pendientes + " cambios de árbitro pendientes"
        );

        lista.replaceChildren();

        const visibles = solicitudes.filter(
            s => filtro.value === "todas" || s.estado === filtro.value
        );

        if (!visibles.length) {
            texto(lista, "No hay solicitudes para este filtro.");
        }

        visibles.forEach(solicitud => {
            const tarjeta = document.createElement("section");
            tarjeta.className = "solicitud-arbitro-card";

            texto(
                tarjeta,
                `${solicitud.localNombre || "Local"} vs. ${solicitud.visitanteNombre || "Visitante"}`,
                "h4"
            );

            const estado = texto(
                tarjeta,
                solicitud.estado || "Sin estado",
                "span"
            );

            estado.className = "solicitud-arbitro-estado" + (
                ["pendiente", "rechazada"].includes(solicitud.estado)
                    ? " " + solicitud.estado : ""
            );

            texto(
                tarjeta,
                `${solicitud.categoriaNombre || ""} · ${solicitud.jornadaNombre || ""} · ${solicitud.fecha || ""} ${solicitud.hora || ""}`
            );

            texto(
                tarjeta,
                `Árbitro actual: ${solicitud.arbitroActualNombre || "Sin asignar"}`
            );

            texto(
                tarjeta,
                `Árbitro propuesto: ${solicitud.arbitroPropuestoNombre || "Árbitro"}`
            );

            texto(
                tarjeta,
                `Solicitó: ${solicitud.solicitanteNombre || "Jefe de árbitros"}`
            );

            texto(tarjeta, `Motivo: ${solicitud.motivo || ""}`);

            if (solicitud.estado === "pendiente") {
                const etiqueta = texto(
                    tarjeta,
                    "Respuesta administrativa (obligatoria al rechazar)",
                    "label"
                );

                const respuesta = document.createElement("textarea");
                respuesta.maxLength = 1000;
                respuesta.value = respuestas.get(solicitud.id) || "";
                respuesta.disabled = ocupadas.has(solicitud.id);

                respuesta.addEventListener("input", () => {
                    respuestas.set(solicitud.id, respuesta.value);
                });

                etiqueta.appendChild(respuesta);

                const acciones = document.createElement("div");
                acciones.className = "solicitud-arbitro-acciones";

                for (const aprobar of [true, false]) {
                    const boton = document.createElement("button");
                    boton.type = "button";
                    boton.textContent = aprobar
                        ? "Aprobar cambio" : "Rechazar";

                    if (!aprobar) boton.className = "rechazar";

                    boton.disabled = ocupadas.has(solicitud.id);
                    boton.addEventListener("click", () =>
                        resolver(solicitud, aprobar, respuesta.value)
                    );

                    acciones.appendChild(boton);
                }

                tarjeta.appendChild(acciones);
            } else {
                texto(
                    tarjeta,
                    `Respuesta: ${solicitud.respuestaAdministrativa || "Sin respuesta registrada"}`
                );

                if (solicitud.respondidoPorNombre) {
                    texto(
                        tarjeta,
                        `Resolvió: ${solicitud.respondidoPorNombre}`
                    );
                }
            }

            lista.appendChild(tarjeta);
        });
    }

    filtro.addEventListener("change", renderizar);

    const cancelar = onSnapshot(
        collection(db, "solicitudesCambioArbitro"),
        snapshot => {
            solicitudes = snapshot.docs
                .map(d => ({ ...d.data(), id: d.id }))
                .sort((a, b) =>
                    (b.creadoEn?.toMillis?.() || 0) -
                    (a.creadoEn?.toMillis?.() || 0)
                );

            renderizar();
        },
        error => {
            console.error("Error leyendo solicitudes de árbitros:", error);
            lista.replaceChildren();
            mostrarMensaje(
                "No se pudieron cargar las solicitudes. Recarga la página para intentarlo nuevamente.",
                true
            );
        }
    );

    window.addEventListener("pagehide", cancelar, { once: true });
}


function prepararPestanaArbitros() {
    const nav = document.querySelector(".configuracion-nav");
    const contenido = document.querySelector(".configuracion-contenido");

    if (!nav || !contenido) return null;

    let seccion = document.getElementById("seccionArbitros");

    if (!seccion) {
        seccion = document.createElement("section");
        seccion.id = "seccionArbitros";
        seccion.className = "configuracion-seccion";
        seccion.dataset.seccionContenido = "arbitros";
        seccion.innerHTML =
            '<div class="seccion-cabecera">' +
            '<div><span class="seccion-kicker">COORDINACI\u00d3N ARBITRAL</span>' +
            '<h2>\u00c1rbitros</h2>' +
            '<p>Autoriza los cambios de designaci\u00f3n y consulta las solicitudes resueltas.</p></div>' +
            '<a href="adminArbitros.html" class="enlace-gestion-arbitros">Gestionar \u00e1rbitros</a>' +
            '</div>';

        contenido.appendChild(seccion);
    }

    let boton = nav.querySelector('[data-seccion="arbitros"]');

    if (!boton) {
        boton = document.createElement("button");
        boton.type = "button";
        boton.className = "configuracion-nav-btn";
        boton.dataset.seccion = "arbitros";
        boton.setAttribute("aria-controls", "seccionArbitros");
        boton.innerHTML =
            '<span class="configuracion-nav-icono">\u2691</span>' +
            '<span>\u00c1rbitros</span>';

        const administracion = nav.querySelector(
            '[data-seccion="administracion"]'
        );

        if (administracion) {
            nav.insertBefore(boton, administracion);
        } else {
            nav.appendChild(boton);
        }

        boton.addEventListener("click", () => {
            document.querySelectorAll(".configuracion-nav-btn")
                .forEach(elemento => {
                    const activo = elemento.dataset.seccion === "arbitros";
                    elemento.classList.toggle("activo", activo);
                    elemento.setAttribute("aria-selected", String(activo));
                });

            document.querySelectorAll(".configuracion-seccion")
                .forEach(elemento => {
                    elemento.classList.toggle(
                        "activo",
                        elemento.dataset.seccionContenido === "arbitros"
                    );
                });
        });

        nav.addEventListener("click", () => {
            nav.querySelectorAll(".configuracion-nav-btn")
                .forEach(elemento => {
                    elemento.setAttribute(
                        "aria-selected",
                        String(elemento.classList.contains("activo"))
                    );
                });
        });
    }

    return seccion;
}

await iniciar();