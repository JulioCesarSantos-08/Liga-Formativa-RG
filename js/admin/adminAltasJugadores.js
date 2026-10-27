import {
    collection,
    getDocsFromServer
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";

const el = id => document.getElementById(id);

const periodo = el("filtroPeriodo");
const buscar = el("buscarAlta");
const club = el("filtroClub");
const categoria = el("filtroCategoria");

const actualizar = el("btnActualizar");
const marcar = el("btnMarcarRevisado");
const limpiar = el("btnLimpiar");

const lista = el("listaAltas");
const mensaje = el("estadoConsulta");

const controles = [
    periodo,
    buscar,
    club,
    categoria,
    limpiar
];

const orden = new Intl.Collator("es", {
    sensitivity: "base",
    numeric: true
});

const formato = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City"
});

let jugadores = [];
let idsConsulta = [];
let ultimaConsulta = 0;
let revision = null;
let claveRevision = "";

let cargando = false;
let disponible = false;
let almacenamientoDisponible = true;

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function fechaRegistro(valor) {
    if (
        !valor ||
        typeof valor.toMillis !== "function"
    ) {
        return null;
    }

    try {
        const fecha = valor.toMillis();

        return Number.isFinite(fecha) &&
            Math.abs(fecha) <= 8640000000000000
            ? fecha
            : null;
    } catch {
        return null;
    }
}

function prepararJugadores(documentos, equipos) {
    const mapa = new Map(
        equipos.map(equipo => [
            equipo.id,
            equipo
        ])
    );

    return documentos.map(jugador => {
        const equipo = mapa.get(
            jugador.equipoId
        );

        const clubId = String(
            equipo?.clubId || ""
        ).trim();

        const categoriaId = String(
            jugador.categoriaId ||
            equipo?.categoriaId ||
            ""
        );

        const categoriaNombre = String(
            jugador.categoriaNombre ||
            equipo?.categoriaNombre ||
            "Sin categoría"
        );

        return {
            id: jugador.id,

            nombre: String(
                jugador.nombreCompleto ||
                jugador.nombre ||
                "Sin nombre"
            ),

            equipoId: String(
                jugador.equipoId || ""
            ),

            equipoNombre: String(
                equipo?.nombre ||
                jugador.equipoNombre ||
                "Sin equipo identificado"
            ),

            clubId,

            clubNombre: clubId
                ? String(
                    equipo.clubNombre ||
                    "Club " + clubId
                )
                : "Sin club asignado",

            clubClave: clubId
                ? "club:" + clubId
                : "sin-club",

            categoriaClave:
                categoriaId ||
                "nombre:" +
                    normalizar(categoriaNombre),

            categoriaNombre,

            fecha: fechaRegistro(
                jugador.creadoEn
            ),

            activo: jugador.activo !== false
        };
    });
}

function filtrarPeriodo(
    datos,
    valor,
    referencia,
    punto
) {
    const conFecha = datos.filter(
        jugador => jugador.fecha !== null
    );

    if (valor === "revision") {
        if (!punto) {
            return [];
        }

        const conocidos = new Set(
            punto.ids
        );

        return conFecha.filter(
            jugador =>
                !conocidos.has(jugador.id)
        );
    }

    const horas = {
        "2h": 2,
        "24h": 24,
        "7d": 168
    };

    if (!horas[valor]) {
        return conFecha;
    }

    const inicio =
        referencia -
        horas[valor] * 3600000;

    return conFecha.filter(
        jugador =>
            jugador.fecha >= inicio &&
            jugador.fecha <= referencia
    );
}

function crear(tag, clase, texto) {
    const nodo = document.createElement(tag);

    if (clase) {
        nodo.className = clase;
    }

    if (texto !== undefined) {
        nodo.textContent = texto;
    }

    return nodo;
}

function leerRevision() {
    try {
        const guardado =
            localStorage.getItem(
                claveRevision
            );

        if (!guardado) {
            return null;
        }

        const punto = JSON.parse(
            guardado
        );

        if (
            punto.version !== 1 ||
            !Number.isFinite(punto.fecha) ||
            Math.abs(punto.fecha) >
                8640000000000000 ||
            !Array.isArray(punto.ids) ||
            !punto.ids.every(
                id => typeof id === "string"
            )
        ) {
            throw new Error(
                "El punto de revisión guardado no es válido."
            );
        }

        return punto;
    } catch (error) {
        console.warn(
            "No se pudo leer el punto de revisión:",
            error
        );

        almacenamientoDisponible = false;

        return null;
    }
}

function mostrarRevision() {
    marcar.textContent =
        "Guardar punto de revisión";

    document.querySelector(
        ".panel-revision small"
    ).textContent =
        "Se guarda para tu cuenta en este navegador y abarca todos los registros consultados, aunque apliques filtros.";

    el("ultimaRevision").textContent =
        revision
            ? "Punto guardado: " +
                formato.format(
                    new Date(revision.fecha)
                ) +
                ". Los registros que no estaban en esa consulta aparecen al elegir Desde mi última revisión."
            : almacenamientoDisponible
                ? "Aún no tienes un punto guardado. Consulta los registros y guarda uno para comparar las próximas altas."
                : "No se pudo acceder a la revisión guardada. Puedes consultar las altas por periodo, pero no guardar un punto en este momento.";
}

function llenarSelector(
    selector,
    valores,
    etiqueta
) {
    const anterior = selector.value;
    const opciones = new Map(valores);

    selector.replaceChildren(
        new Option(etiqueta, "")
    );

    [...opciones]
        .sort(
            (a, b) =>
                orden.compare(a[1], b[1])
        )
        .forEach(([clave, nombre]) => {
            selector.add(
                new Option(nombre, clave)
            );
        });

    selector.value =
        opciones.has(anterior)
            ? anterior
            : "";
}

function tarjeta(jugador) {
    const articulo = crear(
        "article",
        "alta"
    );

    const cabecera = crear(
        "div",
        "alta-cabecera"
    );

    const iniciales = jugador.nombre
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0])
        .join("");

    const avatar = crear(
        "span",
        "alta-avatar",
        iniciales
    );

    avatar.setAttribute(
        "aria-hidden",
        "true"
    );

    const identidad = crear(
        "div",
        "alta-identidad"
    );

    identidad.append(
        crear(
            "h2",
            "",
            jugador.nombre
        ),
        crear(
            "p",
            "",
            jugador.equipoNombre
        )
    );

    cabecera.append(
        avatar,
        identidad
    );

    const detalles = crear(
        "dl",
        "alta-datos"
    );

    const datos = [
        [
            "Club / comunidad",
            jugador.clubNombre
        ],
        [
            "Categoría",
            jugador.categoriaNombre
        ],
        [
            "Fecha de alta",
            formato.format(
                new Date(jugador.fecha)
            )
        ]
    ];

    for (const [titulo, valor] of datos) {
        const grupo = crear("div");

        grupo.append(
            crear("dt", "", titulo),
            crear("dd", "", valor)
        );

        detalles.appendChild(grupo);
    }

    const pie = crear(
        "div",
        "alta-pie"
    );

    pie.appendChild(
        crear(
            "span",
            jugador.activo
                ? "estado-activo"
                : "estado-inactivo",
            jugador.activo
                ? "Jugador activo"
                : "Jugador inactivo"
        )
    );

    articulo.append(
        cabecera,
        detalles,
        pie
    );

    return articulo;
}

function renderizar() {
    if (!disponible) {
        return;
    }

    const termino = normalizar(
        buscar.value
    );

    const visibles = filtrarPeriodo(
        jugadores,
        periodo.value,
        ultimaConsulta,
        revision
    )
        .filter(jugador => {
            if (
                club.value &&
                jugador.clubClave !==
                    club.value
            ) {
                return false;
            }

            if (
                categoria.value &&
                jugador.categoriaClave !==
                    categoria.value
            ) {
                return false;
            }

            return normalizar(
                jugador.nombre +
                " " +
                jugador.equipoNombre
            ).includes(termino);
        })
        .sort(
            (a, b) =>
                b.fecha - a.fecha ||
                orden.compare(
                    a.nombre,
                    b.nombre
                ) ||
                orden.compare(
                    a.id,
                    b.id
                )
        );

    const fragmento =
        document.createDocumentFragment();

    visibles.forEach(jugador => {
        fragmento.appendChild(
            tarjeta(jugador)
        );
    });

    lista.replaceChildren(
        fragmento
    );

    el("totalAltas").textContent =
        visibles.length;

    el("totalEquipos").textContent =
        new Set(
            visibles
                .map(
                    jugador =>
                        jugador.equipoId
                )
                .filter(Boolean)
        ).size;

    el("totalClubes").textContent =
        new Set(
            visibles
                .map(
                    jugador =>
                        jugador.clubId
                )
                .filter(Boolean)
        ).size;

    const sinFecha = jugadores.filter(
        jugador => jugador.fecha === null
    ).length;

    el("avisoSinFecha").hidden =
        sinFecha === 0;

    el("avisoSinFecha").textContent =
        sinFecha +
        " registros no tienen una fecha de creación válida. Se excluyen de las altas por fecha; no se modificaron sus datos.";

    const vacio = el(
        "estadoVacio"
    );

    vacio.hidden =
        visibles.length !== 0;

    const faltaRevision =
        periodo.value === "revision" &&
        !revision;

    vacio.querySelector(
        "h2"
    ).textContent =
        faltaRevision
            ? "Primero guarda un punto de revisión"
            : "No hay altas en esta consulta";

    vacio.querySelector(
        "p"
    ).textContent =
        faltaRevision
            ? "Usa Guardar punto de revisión para comparar las próximas consultas con los registros actuales."
            : "Puedes ampliar el periodo o cambiar los filtros para consultar otros registros.";

    el("periodoConsulta").textContent =
        "Periodo: " +
        periodo.selectedOptions[0].text +
        ". Corte de consulta: " +
        formato.format(
            new Date(ultimaConsulta)
        ) +
        ".";
}

async function cargar() {
    if (cargando) {
        return;
    }

    cargando = true;
    disponible = false;

    actualizar.disabled = true;
    marcar.disabled = true;

    controles.forEach(control => {
        control.disabled = true;
    });

    lista.setAttribute(
        "aria-busy",
        "true"
    );

    mensaje.hidden = false;
    mensaje.classList.remove(
        "es-error"
    );

    mensaje.textContent =
        "Consultando registros y equipos…";

    try {
        const resultados =
            await Promise.allSettled([
                getDocsFromServer(
                    collection(
                        db,
                        "jugadores"
                    )
                ),
                getDocsFromServer(
                    collection(
                        db,
                        "equipos"
                    )
                )
            ]);

        const fallo = resultados.find(
            resultado =>
                resultado.status ===
                "rejected"
        );

        if (fallo) {
            throw fallo.reason;
        }

        const [
            snapshotJugadores,
            snapshotEquipos
        ] = resultados.map(
            resultado =>
                resultado.value
        );

        const leer = snapshot =>
            snapshot.docs.map(
                documento => ({
                    ...documento.data(),
                    id: documento.id
                })
            );

        const nuevos = prepararJugadores(
            leer(snapshotJugadores),
            leer(snapshotEquipos)
        );

        jugadores = nuevos;

        idsConsulta =
            snapshotJugadores.docs.map(
                documento => documento.id
            );

        ultimaConsulta = Date.now();

        llenarSelector(
            club,
            jugadores.map(jugador => [
                jugador.clubClave,
                jugador.clubNombre
            ]),
            "Todos los clubes"
        );

        llenarSelector(
            categoria,
            jugadores.map(jugador => [
                jugador.categoriaClave,
                jugador.categoriaNombre
            ]),
            "Todas las categorías"
        );

        disponible = true;

        controles.forEach(control => {
            control.disabled = false;
        });

        marcar.disabled =
            !almacenamientoDisponible;

        el("fechaConsulta").textContent =
            "Última consulta: " +
            formato.format(
                new Date(ultimaConsulta)
            );

        mostrarRevision();
        renderizar();

        mensaje.hidden = true;
    } catch (error) {
        console.error(
            "Error consultando altas:",
            error
        );

        const codigo = String(
            error.code || ""
        );

        mensaje.classList.add(
            "es-error"
        );

        mensaje.textContent =
            codigo.includes(
                "resource-exhausted"
            )
                ? "Firebase alcanzó una cuota de uso. Revisa el uso y la facturación del proyecto."
                : codigo.includes(
                    "permission-denied"
                )
                    ? "Firebase no permitió consultar los registros. Revisa la sesión y los permisos."
                    : "No se pudo completar la consulta. Intenta actualizar nuevamente.";

        if (ultimaConsulta) {
            mensaje.textContent +=
                " Los resultados anteriores siguen visibles; no se puede guardar una revisión hasta actualizar correctamente.";
        }
    } finally {
        cargando = false;

        actualizar.disabled = false;

        lista.setAttribute(
            "aria-busy",
            "false"
        );
    }
}

function guardarRevision() {
    if (
        !disponible ||
        cargando ||
        !almacenamientoDisponible
    ) {
        return;
    }

    const punto = {
        version: 1,
        fecha: ultimaConsulta,
        ids: [...idsConsulta]
    };

    try {
        localStorage.setItem(
            claveRevision,
            JSON.stringify(punto)
        );

        revision = punto;
        periodo.value = "revision";

        mostrarRevision();
        renderizar();

        mensaje.hidden = false;
        mensaje.classList.remove(
            "es-error"
        );

        mensaje.textContent =
            "Punto de revisión guardado. Al actualizar, podrás identificar los jugadores que no estaban en esta consulta.";
    } catch (error) {
        console.warn(
            "No se pudo guardar la revisión:",
            error
        );

        mensaje.hidden = false;
        mensaje.classList.add(
            "es-error"
        );

        mensaje.textContent =
            "El navegador no permitió guardar la revisión. Tu punto anterior se conserva; puedes seguir consultando por periodo.";
    }
}

buscar.addEventListener(
    "input",
    renderizar
);

[periodo, club, categoria].forEach(
    control => {
        control.addEventListener(
            "change",
            renderizar
        );
    }
);

actualizar.addEventListener(
    "click",
    cargar
);

marcar.addEventListener(
    "click",
    guardarRevision
);

limpiar.addEventListener(
    "click",
    () => {
        periodo.value = "2h";
        buscar.value = "";
        club.value = "";
        categoria.value = "";

        renderizar();
    }
);

const usuario =
    await protegerPagina([
        "admin"
    ]);

if (usuario) {
    claveRevision =
        "ligaRG:altasJugadores:v1:" +
        usuario.uid;

    revision = leerRevision();

    mostrarRevision();

    await cargar();
}