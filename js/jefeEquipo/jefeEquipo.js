import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina,
    cerrarSesion
} from "../roles.js";

import {
    db
} from "../firebase.js";

const estadoCarga =
    document.getElementById(
        "estadoCarga"
    );

const sinEquipo =
    document.getElementById(
        "sinEquipo"
    );

const contenidoEquipo =
    document.getElementById(
        "contenidoEquipo"
    );

const navegacionMovil =
    document.getElementById(
        "navegacionMovil"
    );

const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );

const equipoLogo =
    document.getElementById(
        "equipoLogo"
    );

const equipoNombre =
    document.getElementById(
        "equipoNombre"
    );

const equipoCategoria =
    document.getElementById(
        "equipoCategoria"
    );

const equipoEstado =
    document.getElementById(
        "equipoEstado"
    );

const jefeInicial =
    document.getElementById(
        "jefeInicial"
    );

const jefeNombre =
    document.getElementById(
        "jefeNombre"
    );

const btnGenerarCredenciales =
    document.getElementById(
        "btnGenerarCredenciales"
    );

const btnVerPartidos =
    document.getElementById(
        "btnVerPartidos"
    );

let usuarioActual = null;
let equipoActual = null;

let equiposAsignados = [];
let todosLosEquipos = [];

let selectorEquiposContenedor = null;
let selectorEquipos = null;

const usuario =
    await protegerPagina([
        "jefeEquipo",
        "admin"
    ]);

if (usuario) {
    usuarioActual =
        usuario;

    publicarUsuarioActual();
    activarEventos();

    await iniciarPanel();
}

function activarEventos() {
    btnCerrarSesion?.addEventListener(
        "click",
        async () => {
            btnCerrarSesion.disabled =
                true;

            await cerrarSesion();
        }
    );

    btnGenerarCredenciales?.addEventListener(
        "click",
        () => {
            if (!equipoActual) {
                return;
            }

            window.location.href =
                `credenciales.html?equipo=${encodeURIComponent(
                    equipoActual.id
                )}`;
        }
    );

    btnVerPartidos?.addEventListener(
        "click",
        () => {
            if (!equipoActual) {
                return;
            }

            window.location.href =
                `partidos.html?equipo=${encodeURIComponent(
                    equipoActual.id
                )}`;
        }
    );
}

async function iniciarPanel() {
    cargarIdentidadJefe();

    try {
        await cargarEquiposAsignados();

        estadoCarga?.classList.add(
            "oculto"
        );

        if (!equipoActual) {
            publicarContextoEquipo();
            mostrarSinEquipo();
            return;
        }

        crearSelectorEquipos();
        cargarDatosEquipo();

        contenidoEquipo?.classList.remove(
            "oculto"
        );

        navegacionMovil?.classList.remove(
            "oculto"
        );

        publicarContextoEquipo();

    } catch (error) {
        console.error(
            "Error iniciando panel del jefe:",
            error
        );

        estadoCarga?.classList.add(
            "oculto"
        );

        publicarContextoEquipo();

        mostrarSinEquipo(
            "No pudimos cargar tus equipos",
            "Ocurrió un problema al consultar la información en Firebase."
        );
    }
}

function cargarIdentidadJefe() {
    const nombre =
        usuarioActual?.nombre?.trim() ||
        usuarioActual?.nombreCompleto?.trim() ||
        (
            usuarioActual?.rol === "admin"
                ? "Administrador"
                : "Jefe de equipo"
        );

    if (jefeNombre) {
        jefeNombre.textContent =
            nombre;
    }

    if (jefeInicial) {
        jefeInicial.textContent =
            obtenerInicial(
                nombre
            );
    }
}

async function cargarEquiposAsignados() {
    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );

    todosLosEquipos =
        snapshot.docs
            .map(
                documento => ({
                    id:
                        documento.id,
                    ...documento.data()
                })
            )
            .sort(
                (a, b) =>
                    String(
                        a.nombre ||
                        ""
                    ).localeCompare(
                        String(
                            b.nombre ||
                            ""
                        ),
                        "es"
                    )
            );

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const equipoIdURL =
        parametros.get(
            "equipo"
        );

    if (
        usuarioActual?.rol ===
        "admin"
    ) {
        if (!equipoIdURL) {
            equipoActual =
                null;

            equiposAsignados =
                [];

            return;
        }

        const equipoEncontrado =
            todosLosEquipos.find(
                equipo =>
                    equipo.id ===
                    equipoIdURL
            ) ||
            null;

        equipoActual =
            equipoEncontrado;

        equiposAsignados =
            equipoEncontrado
                ? [
                    equipoEncontrado
                ]
                : [];

        return;
    }

    const usuarioId =
        obtenerUsuarioId();

    equiposAsignados =
        todosLosEquipos.filter(
            equipo =>
                equipo.responsableId ===
                usuarioId
        );

    if (!equiposAsignados.length) {
        equipoActual =
            null;

        return;
    }

    if (equipoIdURL) {
        const equipoDeURL =
            equiposAsignados.find(
                equipo =>
                    equipo.id ===
                    equipoIdURL
            );

        if (equipoDeURL) {
            equipoActual =
                equipoDeURL;

            return;
        }
    }

    equipoActual =
        equiposAsignados[0];

    actualizarEquipoEnURL(
        equipoActual.id
    );
}

function crearSelectorEquipos() {
    eliminarSelectorEquipos();

    if (
        usuarioActual?.rol ===
            "admin" ||
        equiposAsignados.length <=
            1
    ) {
        return;
    }

    agregarEstilosSelectorEquipos();

    selectorEquiposContenedor =
        document.createElement(
            "section"
        );

    selectorEquiposContenedor.className =
        "selector-equipos-jefe";

    selectorEquiposContenedor.innerHTML = `
        <div class="selector-equipos-jefe-icono">
            ⚽
        </div>

        <div class="selector-equipos-jefe-contenido">
            <span class="selector-equipos-jefe-etiqueta">
                Equipo que estás administrando
            </span>

            <strong>
                Tienes ${equiposAsignados.length} equipos asignados
            </strong>

            <select
                id="selectorEquipoJefe"
                aria-label="Seleccionar equipo"
            ></select>
        </div>
    `;

    contenidoEquipo?.insertBefore(
        selectorEquiposContenedor,
        contenidoEquipo.firstChild
    );

    selectorEquipos =
        document.getElementById(
            "selectorEquipoJefe"
        );

    if (!selectorEquipos) {
        return;
    }

    equiposAsignados.forEach(
        equipo => {
            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                equipo.id;

            opcion.textContent =
                equipo.categoriaNombre
                    ? `${equipo.nombre || "Equipo"} — ${equipo.categoriaNombre}`
                    : equipo.nombre ||
                      "Equipo";

            selectorEquipos.appendChild(
                opcion
            );
        }
    );

    selectorEquipos.value =
        equipoActual.id;

    selectorEquipos.addEventListener(
        "change",
        cambiarEquipoSeleccionado
    );
}

async function cambiarEquipoSeleccionado() {
    if (!selectorEquipos) {
        return;
    }

    const equipoId =
        selectorEquipos.value;

    const nuevoEquipo =
        equiposAsignados.find(
            equipo =>
                equipo.id ===
                equipoId
        );

    if (
        !nuevoEquipo ||
        equipoActual?.id ===
            nuevoEquipo.id
    ) {
        return;
    }

    selectorEquipos.disabled =
        true;

    equipoActual =
        nuevoEquipo;

    actualizarEquipoEnURL(
        equipoActual.id
    );

    cargarDatosEquipo();
    publicarContextoEquipo();

    selectorEquipos.disabled =
        false;
}

function actualizarEquipoEnURL(
    equipoId
) {
    if (!equipoId) {
        return;
    }

    const url =
        new URL(
            window.location.href
        );

    url.searchParams.set(
        "equipo",
        equipoId
    );

    window.history.replaceState(
        {},
        "",
        url.toString()
    );

    window.dispatchEvent(
        new CustomEvent(
            "jefeEquipo:urlActualizada",
            {
                detail: {
                    equipoId
                }
            }
        )
    );
}

function cargarDatosEquipo() {
    if (!equipoActual) {
        return;
    }

    if (equipoNombre) {
        equipoNombre.textContent =
            equipoActual.nombre ||
            "Equipo";
    }

    if (equipoCategoria) {
        equipoCategoria.textContent =
            equipoActual.categoriaNombre ||
            "Sin categoría";
    }

    const activo =
        equipoActual.activo !==
        false;

    if (equipoEstado) {
        equipoEstado.textContent =
            activo
                ? "Activo"
                : "Inactivo";

        equipoEstado.classList.toggle(
            "activo",
            activo
        );
    }

    if (!equipoLogo) {
        return;
    }

    if (equipoActual.logoUrl) {
        equipoLogo.innerHTML = `
            <img
                src="${escaparHTML(
                    equipoActual.logoUrl
                )}"
                alt="${escaparHTML(
                    equipoActual.nombre ||
                    "Equipo"
                )}"
            >
        `;
    } else {
        equipoLogo.textContent =
            obtenerInicial(
                equipoActual.nombre ||
                "E"
            );
    }
}

function publicarUsuarioActual() {
    window.LigaJefeEquipo =
        window.LigaJefeEquipo ||
        {};

    window.LigaJefeEquipo.usuario =
        usuarioActual;

    window.LigaJefeEquipo.obtenerUsuario =
        () =>
            usuarioActual;

    window.LigaJefeEquipo.obtenerUsuarioId =
        () =>
            obtenerUsuarioId();

    window.LigaJefeEquipo.obtenerNombreUsuario =
        () =>
            obtenerNombreUsuario();
}

function publicarContextoEquipo() {
    window.LigaJefeEquipo =
        window.LigaJefeEquipo ||
        {};

    window.LigaJefeEquipo.usuario =
        usuarioActual;

    window.LigaJefeEquipo.equipo =
        equipoActual;

    window.LigaJefeEquipo.equiposAsignados =
        [
            ...equiposAsignados
        ];

    window.LigaJefeEquipo.todosLosEquipos =
        [
            ...todosLosEquipos
        ];

    window.LigaJefeEquipo.obtenerEquipo =
        () =>
            equipoActual;

    window.LigaJefeEquipo.obtenerEquiposAsignados =
        () =>
            [
                ...equiposAsignados
            ];

    window.LigaJefeEquipo.obtenerTodosLosEquipos =
        () =>
            [
                ...todosLosEquipos
            ];

    window.dispatchEvent(
        new CustomEvent(
            "jefeEquipo:cambioEquipo",
            {
                detail: {
                    usuario:
                        usuarioActual,
                    equipo:
                        equipoActual,
                    equiposAsignados:
                        [
                            ...equiposAsignados
                        ],
                    todosLosEquipos:
                        [
                            ...todosLosEquipos
                        ]
                }
            }
        )
    );
}

function eliminarSelectorEquipos() {
    selectorEquiposContenedor?.remove();

    selectorEquiposContenedor =
        null;

    selectorEquipos =
        null;
}

function agregarEstilosSelectorEquipos() {
    if (
        document.getElementById(
            "estilosSelectorEquiposJefe"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "estilosSelectorEquiposJefe";

    style.textContent = `
        .selector-equipos-jefe{
            width:100%;
            box-sizing:border-box;
            display:flex;
            align-items:center;
            gap:14px;
            margin:0 0 22px;
            padding:16px;
            border:1px solid rgba(11,117,109,.22);
            border-radius:18px;
            background:linear-gradient(
                135deg,
                rgba(255,248,232,.97),
                rgba(226,201,144,.88)
            );
            box-shadow:0 8px 22px rgba(55,43,20,.08);
        }

        .selector-equipos-jefe-icono{
            width:48px;
            height:48px;
            flex:0 0 48px;
            display:grid;
            place-items:center;
            border-radius:50%;
            background:#0b756d;
            color:#fff;
            font-size:23px;
            box-shadow:
                inset 0 0 0 3px
                rgba(255,255,255,.18);
        }

        .selector-equipos-jefe-contenido{
            width:100%;
            min-width:0;
            display:flex;
            flex-direction:column;
            gap:4px;
        }

        .selector-equipos-jefe-etiqueta{
            color:#b9542e;
            font-size:10px;
            font-weight:900;
            letter-spacing:.08em;
        }

        .selector-equipos-jefe-contenido strong{
            color:#102b28;
            font-size:13px;
        }

        #selectorEquipoJefe{
            width:100%;
            min-height:42px;
            margin-top:5px;
            padding:0 12px;
            border:1px solid #baa676;
            border-radius:11px;
            outline:none;
            background:#fff8e8;
            color:#213732;
            font:inherit;
            font-size:12px;
            font-weight:700;
        }

        #selectorEquipoJefe:focus{
            border-color:#0b756d;
            box-shadow:
                0 0 0 3px
                rgba(11,117,109,.10);
        }

        @media(max-width:600px){
            .selector-equipos-jefe{
                align-items:flex-start;
                padding:13px;
                margin-bottom:14px;
            }

            .selector-equipos-jefe-icono{
                width:42px;
                height:42px;
                flex-basis:42px;
                font-size:19px;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}

function mostrarSinEquipo(
    titulo =
        "Aún no tienes un equipo asignado",
    texto =
        "Un administrador deberá asignarte un equipo antes de que puedas registrar jugadores."
) {
    sinEquipo?.classList.remove(
        "oculto"
    );

    contenidoEquipo?.classList.add(
        "oculto"
    );

    navegacionMovil?.classList.add(
        "oculto"
    );

    const h1 =
        sinEquipo?.querySelector(
            "h1"
        );

    const parrafos =
        sinEquipo?.querySelectorAll(
            "p"
        );

    if (h1) {
        h1.textContent =
            titulo;
    }

    if (
        parrafos &&
        parrafos.length
    ) {
        parrafos[
            parrafos.length - 1
        ].textContent =
            texto;
    }
}

function obtenerUsuarioId() {
    return (
        usuarioActual?.uid ||
        usuarioActual?.id ||
        ""
    );
}

function obtenerNombreUsuario() {
    return (
        usuarioActual?.nombre ||
        usuarioActual?.nombreCompleto ||
        usuarioActual?.email ||
        (
            usuarioActual?.rol ===
            "admin"
                ? "Administrador"
                : "Jefe de equipo"
        )
    );
}

function obtenerInicial(
    texto
) {
    const valor =
        String(
            texto ||
            ""
        ).trim();

    return valor
        ? valor
            .charAt(0)
            .toUpperCase()
        : "J";
}

function escaparHTML(
    valor
) {
    return String(
        valor ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}