import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

import {
    usuarioTieneRol
} from "../permisosUsuario.js";

export function milisegundosSolicitud(valor) {
    if (!valor) return 0;

    try {
        const numero =
            typeof valor.toMillis === "function"
                ? valor.toMillis()
                : typeof valor.toDate === "function"
                    ? valor.toDate().getTime()
                    : typeof valor.seconds === "number"
                        ? valor.seconds * 1000 +
                            Math.floor(
                                (valor.nanoseconds || 0) / 1000000
                            )
                        : valor instanceof Date
                            ? valor.getTime()
                            : typeof valor === "number"
                                ? valor
                                : Date.parse(valor);

        return Number.isFinite(numero)
            ? numero
            : 0;
    } catch {
        return 0;
    }
}

export function estadoSolicitud(solicitud) {
    return String(solicitud.estado || "")
        .trim()
        .toLowerCase();
}

export function claveRespuesta(solicitud) {
    const estado = estadoSolicitud(solicitud);

    return ["aprobada", "rechazada"].includes(estado)
        ? JSON.stringify([
            solicitud.id,
            estado,
            milisegundosSolicitud(solicitud.resueltoEn),
            solicitud.resueltoPor || "",
            solicitud.resueltoPorNombre || "",
            solicitud.observacionesAdmin || ""
        ])
        : "";
}

export function cambiosSolicitud(solicitud) {
    const antes = solicitud.datosAnteriores || {};
    const despues = solicitud.datosNuevos || {};

    const campos = [
        ["Nombre completo", ["nombreCompleto", "nombre"]],
        ["Sexo", ["sexo"]],
        ["Fecha de nacimiento", ["fechaNacimiento"]],
        ["Dorsal", ["numero", "dorsal"]],
        ["CURP", ["curp"]],
        ["Observaciones", ["observaciones"]],
        ["Fotografía", ["fotoUrl"], "archivo"],
        [
            "Documento CURP",
            ["curpArchivoUrl", "curpUrl"],
            "archivo"
        ]
    ];

    const valor = (datos, claves) => {
        for (const clave of claves) {
            if (
                datos[clave] !== undefined &&
                datos[clave] !== null &&
                datos[clave] !== ""
            ) {
                return datos[clave];
            }
        }

        return "";
    };

    return campos
        .filter(([, claves]) =>
            claves.some(clave =>
                Object.hasOwn(despues, clave)
            )
        )
        .map(([nombre, claves, tipo]) => ({
            nombre,
            antes: valor(antes, claves),
            despues: valor(despues, claves),
            tipo
        }))
        .filter(cambio =>
            String(cambio.antes) !==
            String(cambio.despues)
        );
}

const boton = document.getElementById(
    "btnHistorialSolicitudes"
);

const contador = document.getElementById(
    "hsRespuestasNuevas"
);

let solicitudes = [];
let vistas = new Set();
let uidActual = "";
let pagina = 1;
let cancelar = null;
let generacion = 0;
let errorCarga = "";
let cargando = true;

const tamano = 20;

function crear(tag, clase, texto) {
    const nodo = document.createElement(tag);

    if (clase) nodo.className = clase;

    if (texto !== undefined) {
        nodo.textContent = texto;
    }

    return nodo;
}

const normalizar = valor =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

function fecha(valor) {
    const ms = milisegundosSolicitud(valor);

    return ms
        ? new Intl.DateTimeFormat("es-MX", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/Mexico_City"
        }).format(ms)
        : "No registrada";
}

function cargarVistas() {
    try {
        const datos = JSON.parse(
            localStorage.getItem(
                "ligaRG:historialEdiciones:" + uidActual
            ) || "[]"
        );

        vistas = new Set(
            Array.isArray(datos)
                ? datos.filter(
                    dato => typeof dato === "string"
                )
                : []
        );
    } catch {
        vistas = new Set();
    }
}

function actualizarContador() {
    const nuevas = solicitudes.filter(solicitud => {
        const clave = claveRespuesta(solicitud);

        return clave && !vistas.has(clave);
    }).length;

    contador.textContent = nuevas
        ? String(nuevas)
        : "";

    contador.hidden = !nuevas;

    boton.setAttribute(
        "aria-label",
        "Historial de solicitudes" +
        (
            nuevas
                ? ", " + nuevas + " respuestas nuevas"
                : ""
        )
    );
}

function marcarVistas(visibles) {
    visibles.forEach(solicitud => {
        const clave = claveRespuesta(solicitud);

        if (clave) vistas.add(clave);
    });

    try {
        localStorage.setItem(
            "ligaRG:historialEdiciones:" + uidActual,
            JSON.stringify(
                [...vistas].slice(-3000)
            )
        );
    } catch {}

    actualizarContador();
}

const dialogo = crear("dialog", "hs-dialogo");

dialogo.id = "hsHistorial";

dialogo.setAttribute(
    "aria-labelledby",
    "hsTitulo"
);

dialogo.innerHTML = `
    <header class="hs-cabecera">
        <div>
            <small>MIS SOLICITUDES DE EDICIÓN</small>
            <h2 id="hsTitulo">Historial de solicitudes</h2>
        </div>
        <button type="button" class="hs-cerrar" aria-label="Cerrar historial" data-hs="cerrar">×</button>
    </header>

    <div class="hs-cuerpo">
        <p class="hs-intro">
            Consulta qué pasó con los cambios que enviaste para tus jugadores.
            Fechas y horas de la liga, en horario de Oaxaca.
        </p>

        <div class="hs-resumen">
            <div>
                <strong data-hs="pendientes">—</strong>
                <span>Pendientes</span>
            </div>
            <div>
                <strong data-hs="aprobadas">—</strong>
                <span>Aprobadas</span>
            </div>
            <div>
                <strong data-hs="rechazadas">—</strong>
                <span>Rechazadas</span>
            </div>
        </div>

        <div class="hs-filtros">
            <label>
                Buscar
                <input type="search" placeholder="Jugador o equipo" data-hs="buscar">
            </label>

            <label>
                Estado
                <select data-hs="estado">
                    <option value="">Todos</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="aprobada">Aprobadas</option>
                    <option value="rechazada">Rechazadas</option>
                </select>
            </label>

            <label>
                Equipo
                <select data-hs="equipo">
                    <option value="">Todos mis equipos</option>
                </select>
            </label>
        </div>

        <p class="hs-aviso" role="status" aria-live="polite" data-hs="aviso"></p>

        <button type="button" class="hs-boton hs-secundario" data-hs="reintentar" hidden>
            Volver a consultar
        </button>

        <div class="hs-lista" data-hs="lista"></div>

        <nav class="hs-paginacion" aria-label="Páginas del historial">
            <button type="button" class="hs-boton hs-secundario" data-hs="anterior">
                Anterior
            </button>
            <span data-hs="pagina" aria-live="polite"></span>
            <button type="button" class="hs-boton hs-secundario" data-hs="siguiente">
                Siguiente
            </button>
        </nav>
    </div>
`;

const el = clave =>
    dialogo.querySelector(
        '[data-hs="' + clave + '"]'
    );

function archivoSeguro(valor) {
    try {
        const url = new URL(String(valor));

        return url.protocol === "https:"
            ? url.href
            : "";
    } catch {
        return "";
    }
}

function presentarValor(cambio, lado) {
    const valor = cambio[lado];
    const nodo = crear("div", "hs-valor");

    nodo.append(
        crear(
            "small",
            "",
            lado === "antes"
                ? "ANTERIOR"
                : "SOLICITADO"
        )
    );

    if (cambio.tipo === "archivo") {
        const url = archivoSeguro(valor);

        if (url) {
            const enlace = crear(
                "a",
                "hs-enlace",
                "Consultar archivo"
            );

            enlace.href = url;
            enlace.target = "_blank";
            enlace.rel = "noopener noreferrer";

            nodo.append(enlace);
        } else {
            nodo.append(
                crear(
                    "span",
                    "",
                    valor
                        ? "Archivo no disponible"
                        : "Sin archivo"
                )
            );
        }
    } else {
        let contenido = valor === ""
            ? "Sin dato"
            : String(valor);

        if (
            cambio.nombre === "Fecha de nacimiento" &&
            /^\d{4}-\d{2}-\d{2}$/.test(contenido)
        ) {
            contenido = contenido
                .split("-")
                .reverse()
                .join("/");
        }

        nodo.append(
            crear("span", "", contenido)
        );
    }

    return nodo;
}

function tarjeta(solicitud) {
    const estado = estadoSolicitud(solicitud);

    const nombreEstado = {
        pendiente: "Pendiente",
        aprobada: "Aprobada",
        rechazada: "Rechazada"
    }[estado] || "Estado no registrado";

    const nodo = crear("article", "hs-tarjeta");

    nodo.dataset.estado = estado;

    const cabecera = crear(
        "div",
        "hs-tarjeta-cabecera"
    );

    cabecera.append(
        crear("span", "hs-estado", nombreEstado)
    );

    const clave = claveRespuesta(solicitud);

    if (clave && !vistas.has(clave)) {
        cabecera.append(
            crear(
                "span",
                "hs-nueva",
                "Respuesta nueva"
            )
        );
    }

    nodo.append(
        cabecera,
        crear(
            "h3",
            "",
            solicitud.jugadorNombre ||
                "Jugador sin nombre registrado"
        ),
        crear(
            "p",
            "hs-equipo",
            (
                solicitud.equipoNombre ||
                "Equipo no registrado"
            ) +
            " · " +
            (
                solicitud.categoriaNombre ||
                "Categoría no registrada"
            )
        ),
        crear(
            "p",
            "hs-fecha",
            "Enviada: " + fecha(solicitud.creadoEn)
        )
    );

    if (
        ["aprobada", "rechazada"].includes(estado)
    ) {
        const respuesta = crear(
            "div",
            "hs-respuesta"
        );

        respuesta.append(
            crear(
                "strong",
                "",
                estado === "aprobada"
                    ? "La administración aprobó los cambios."
                    : "La administración rechazó esta solicitud."
            ),
            crear(
                "p",
                "",
                "Resuelta por: " +
                (
                    solicitud.resueltoPorNombre ||
                    "No registrado"
                )
            ),
            crear(
                "p",
                "",
                "Fecha y hora: " +
                    fecha(solicitud.resueltoEn)
            ),
            crear(
                "p",
                "",
                "Observaciones: " +
                (
                    solicitud.observacionesAdmin ||
                    "Sin observaciones registradas."
                )
            )
        );

        nodo.append(respuesta);
    } else if (estado === "pendiente") {
        nodo.append(
            crear(
                "p",
                "hs-espera",
                "La solicitud sigue esperando revisión administrativa."
            )
        );
    }

    const detalles = crear(
        "details",
        "hs-detalles"
    );

    detalles.append(
        crear(
            "summary",
            "",
            "Ver cambios solicitados"
        ),
        crear(
            "p",
            "",
            "Motivo: " +
                (solicitud.motivo || "No registrado")
        )
    );

    const cambios = cambiosSolicitud(solicitud);

    cambios.forEach(cambio => {
        const fila = crear(
            "section",
            "hs-cambio"
        );

        const valores = crear(
            "div",
            "hs-valores"
        );

        valores.append(
            presentarValor(cambio, "antes"),
            presentarValor(cambio, "despues")
        );

        fila.append(
            crear("h4", "", cambio.nombre),
            valores
        );

        detalles.append(fila);
    });

    if (!cambios.length) {
        detalles.append(
            crear(
                "p",
                "",
                "No hay diferencias disponibles para mostrar en esta solicitud."
            )
        );
    }

    nodo.append(detalles);

    return nodo;
}

function filtrar() {
    const buscar = normalizar(
        el("buscar").value
    );

    return solicitudes.filter(solicitud =>
        (
            !el("estado").value ||
            estadoSolicitud(solicitud) ===
                el("estado").value
        ) &&
        (
            !el("equipo").value ||
            solicitud.equipoId === el("equipo").value
        ) &&
        normalizar(
            [
                solicitud.jugadorNombre,
                solicitud.equipoNombre
            ].join(" ")
        ).includes(buscar)
    );
}

function renderizar() {
    const filtradas = filtrar();

    const paginas = Math.max(
        1,
        Math.ceil(filtradas.length / tamano)
    );

    pagina = Math.min(pagina, paginas);

    const visibles = filtradas.slice(
        (pagina - 1) * tamano,
        pagina * tamano
    );

    for (const [clave, estado] of [
        ["pendientes", "pendiente"],
        ["aprobadas", "aprobada"],
        ["rechazadas", "rechazada"]
    ]) {
        el(clave).textContent =
            cargando || errorCarga
                ? "—"
                : String(
                    solicitudes.filter(
                        solicitud =>
                            estadoSolicitud(solicitud) === estado
                    ).length
                );
    }

    el("aviso").textContent =
        errorCarga ||
        (
            cargando
                ? "Consultando solicitudes…"
                : !solicitudes.length
                    ? "Todavía no tienes solicitudes de edición registradas."
                    : !filtradas.length
                        ? "No hay solicitudes que coincidan con estos filtros."
                        : "Mostrando " +
                            filtradas.length +
                            " solicitudes. Las más recientes aparecen primero."
        );

    el("aviso").dataset.error =
        String(Boolean(errorCarga));

    el("reintentar").hidden = !errorCarga;

    el("lista").replaceChildren(
        ...visibles.map(tarjeta)
    );

    el("pagina").textContent =
        cargando || errorCarga
            ? ""
            : "Página " + pagina + " de " + paginas;

    el("anterior").disabled =
        cargando ||
        Boolean(errorCarga) ||
        pagina <= 1;

    el("siguiente").disabled =
        cargando ||
        Boolean(errorCarga) ||
        pagina >= paginas;

    if (
        dialogo.open &&
        !cargando &&
        !errorCarga
    ) {
        marcarVistas(visibles);
    }
}

function llenarEquipos() {
    const anterior = el("equipo").value;

    const equipos = new Map();

    solicitudes.forEach(solicitud => {
        if (solicitud.equipoId) {
            equipos.set(
                solicitud.equipoId,
                (solicitud.equipoNombre || "Equipo") +
                " · " +
                (
                    solicitud.categoriaNombre ||
                    "Sin categoría"
                )
            );
        }
    });

    el("equipo").replaceChildren(
        new Option("Todos mis equipos", "")
    );

    [...equipos]
        .sort((a, b) =>
            a[1].localeCompare(b[1], "es")
        )
        .forEach(([id, nombre]) => {
            el("equipo").add(
                new Option(nombre, id)
            );
        });

    if (equipos.has(anterior)) {
        el("equipo").value = anterior;
    }
}

async function consultar() {
    const turno = ++generacion;

    cancelar?.();
    cancelar = null;

    solicitudes = [];
    cargando = true;
    errorCarga = "";

    actualizarContador();
    renderizar();

    const uid = auth.currentUser?.uid;

    if (!uid) return;

    try {
        const cuenta = await getDoc(
            doc(db, "usuarios", uid)
        );

        if (
            turno !== generacion ||
            auth.currentUser?.uid !== uid
        ) {
            return;
        }

        if (
            !cuenta.exists() ||
            cuenta.data().activo === false ||
            !(
                cuenta.data().rol === "admin" ||
                usuarioTieneRol(
                    cuenta.data(),
                    "jefeEquipo"
                )
            )
        ) {
            throw new Error(
                "Tu cuenta no tiene acceso al historial de jefes de equipo."
            );
        }

        boton.disabled = false;

        const consulta = query(
            collection(db, "solicitudesEdicion"),
            where("solicitadoPorId", "==", uid)
        );

        cancelar = onSnapshot(
            consulta,
            snapshot => {
                if (
                    turno !== generacion ||
                    auth.currentUser?.uid !== uid
                ) {
                    return;
                }

                solicitudes = snapshot.docs
                    .map(documento => ({
                        ...documento.data(),
                        id: documento.id
                    }))
                    .sort((a, b) =>
                        milisegundosSolicitud(b.creadoEn) -
                            milisegundosSolicitud(a.creadoEn) ||
                        a.id.localeCompare(b.id)
                    );

                cargando = false;
                errorCarga = "";

                llenarEquipos();
                actualizarContador();
                renderizar();
            },
            error => {
                if (turno !== generacion) return;

                solicitudes = [];
                cargando = false;

                errorCarga = String(
                    error.code || ""
                ).includes("permission-denied")
                    ? "No se permitió consultar el historial. Verifica tu sesión y los permisos de acceso."
                    : "No se pudo consultar el historial. Revisa tu conexión y pulsa Volver a consultar.";

                actualizarContador();
                renderizar();
            }
        );
    } catch (error) {
        if (turno !== generacion) return;

        cargando = false;

        errorCarga = error.message ||
            "No se pudo consultar el historial.";

        renderizar();
    }
}

if (boton && contador) {
    document.body.append(dialogo);

    boton.addEventListener("click", () => {
        pagina = 1;
        dialogo.showModal();
        renderizar();
    });

    el("cerrar").addEventListener(
        "click",
        () => dialogo.close()
    );

    el("reintentar").addEventListener(
        "click",
        consultar
    );

    [
        "buscar",
        "estado",
        "equipo"
    ].forEach(clave => {
        el(clave).addEventListener(
            clave === "buscar" ? "input" : "change",
            () => {
                pagina = 1;
                renderizar();
            }
        );
    });

    el("anterior").addEventListener("click", () => {
        pagina--;
        renderizar();

        el("aviso").scrollIntoView({
            block: "nearest"
        });
    });

    el("siguiente").addEventListener("click", () => {
        pagina++;
        renderizar();

        el("aviso").scrollIntoView({
            block: "nearest"
        });
    });

    onAuthStateChanged(auth, usuario => {
        ++generacion;

        cancelar?.();
        cancelar = null;

        uidActual = usuario?.uid || "";
        solicitudes = [];
        vistas = new Set();

        boton.disabled = true;

        cargando = true;
        errorCarga = "";
        pagina = 1;

        el("buscar").value = "";
        el("estado").value = "";

        llenarEquipos();
        dialogo.close();

        actualizarContador();
        renderizar();

        if (usuario) {
            cargarVistas();
            consultar();
        }
    });
}