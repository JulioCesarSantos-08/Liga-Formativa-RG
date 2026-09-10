import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina,
    cerrarSesion
} from "../roles.js";

import {
    db
} from "../firebase.js";

import {
    subirFotoJugador,
    subirPDFCurp
} from "../cloudinary.js";


const estadoCarga = document.getElementById("estadoCarga");
const sinEquipo = document.getElementById("sinEquipo");
const contenidoEquipo = document.getElementById("contenidoEquipo");
const navegacionMovil = document.getElementById("navegacionMovil");

const btnCerrarSesion = document.getElementById("btnCerrarSesion");

const equipoLogo = document.getElementById("equipoLogo");
const equipoNombre = document.getElementById("equipoNombre");
const equipoCategoria = document.getElementById("equipoCategoria");
const equipoEstado = document.getElementById("equipoEstado");

const jefeInicial = document.getElementById("jefeInicial");
const jefeNombre = document.getElementById("jefeNombre");

const totalJugadores = document.getElementById("totalJugadores");
const totalActivos = document.getElementById("totalActivos");
const totalSuspendidos = document.getElementById("totalSuspendidos");
const totalCredenciales = document.getElementById("totalCredenciales");

const btnNuevoJugador = document.getElementById("btnNuevoJugador");
const btnGenerarCredenciales = document.getElementById("btnGenerarCredenciales");
const btnVerPartidos = document.getElementById("btnVerPartidos");

const buscarJugador = document.getElementById("buscarJugador");
const sinJugadores = document.getElementById("sinJugadores");
const gridJugadores = document.getElementById("gridJugadores");

const navItems = document.querySelectorAll("[data-accion]");

const modalJugador = document.getElementById("modalJugador");
const modalTitulo = document.getElementById("modalTitulo");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarModal = document.getElementById("btnCancelarModal");
const formJugador = document.getElementById("formJugador");

const fotoJugador = document.getElementById("fotoJugador");
const previewInicial = document.getElementById("previewInicial");
const previewFotoImagen = document.getElementById("previewFotoImagen");

const nombreJugador = document.getElementById("nombreJugador");
const fechaNacimiento = document.getElementById("fechaNacimiento");
const numeroJugador = document.getElementById("numeroJugador");
const curpJugador = document.getElementById("curpJugador");
const archivoCurp = document.getElementById("archivoCurp");
const archivoCurpNombre = document.getElementById("archivoCurpNombre");
const observacionesJugador = document.getElementById("observacionesJugador");
const btnGuardarJugador = document.getElementById("btnGuardarJugador");

const modalLimite = document.getElementById("modalLimite");
const btnCerrarLimite = document.getElementById("btnCerrarLimite");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let usuarioActual = null;
let equipoActual = null;

let equiposAsignados = [];
let jugadores = [];

let jugadorSeleccionado = null;

let fotoSeleccionada = null;
let archivoCurpSeleccionado = null;
let previewFotoURL = null;

let toastTimer = null;

let selectorEquiposContenedor = null;
let selectorEquipos = null;


const usuario = await protegerPagina([
    "jefeEquipo",
    "admin"
]);


if (usuario) {

    usuarioActual = usuario;

    activarEventos();

    await iniciarPanel();

}


function activarEventos() {

    btnCerrarSesion.addEventListener(
        "click",
        async () => {

            btnCerrarSesion.disabled = true;

            await cerrarSesion();

        }
    );


    btnNuevoJugador.addEventListener(
        "click",
        abrirNuevoJugador
    );


    btnGenerarCredenciales.addEventListener(
        "click",
        () => {

            if (!equipoActual) {
                return;
            }

            window.location.href =
                `credenciales.html?equipo=${encodeURIComponent(equipoActual.id)}`;

        }
    );


    btnVerPartidos.addEventListener(
        "click",
        () => {

            if (!equipoActual) {
                return;
            }

            window.location.href =
                `partidos.html?equipo=${encodeURIComponent(equipoActual.id)}`;

        }
    );


    buscarJugador.addEventListener(
        "input",
        aplicarBusqueda
    );


    btnCerrarModal.addEventListener(
        "click",
        cerrarModalJugador
    );


    btnCancelarModal.addEventListener(
        "click",
        cerrarModalJugador
    );


    modalJugador.addEventListener(
        "click",
        event => {

            if (
                event.target === modalJugador
            ) {

                cerrarModalJugador();

            }

        }
    );


    formJugador.addEventListener(
        "submit",
        guardarJugador
    );


    nombreJugador.addEventListener(
        "input",
        actualizarInicialPreview
    );


    curpJugador.addEventListener(
        "input",
        () => {

            curpJugador.value =
                curpJugador.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 18);

        }
    );


    fotoJugador.addEventListener(
        "change",
        manejarFoto
    );


    archivoCurp.addEventListener(
        "change",
        manejarArchivoCurp
    );


    btnCerrarLimite.addEventListener(
        "click",
        cerrarModalLimite
    );


    modalLimite.addEventListener(
        "click",
        event => {

            if (
                event.target === modalLimite
            ) {

                cerrarModalLimite();

            }

        }
    );


    navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    const accion =
                        item.dataset.accion;


                    if (
                        accion === "plantilla"
                    ) {

                        document.querySelector(
                            ".panel-jugadores"
                        )?.scrollIntoView({
                            behavior: "smooth"
                        });

                    }


                    if (
                        accion === "nuevo"
                    ) {

                        abrirNuevoJugador();

                    }


                    if (
                        accion === "credenciales"
                    ) {

                        btnGenerarCredenciales.click();

                    }

                }
            );

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }


            if (
                !modalJugador.classList.contains("oculto")
            ) {

                cerrarModalJugador();

                return;

            }


            if (
                !modalLimite.classList.contains("oculto")
            ) {

                cerrarModalLimite();

            }

        }
    );

}


async function iniciarPanel() {

    cargarIdentidadJefe();


    try {

        await cargarEquiposAsignados();


        estadoCarga.classList.add(
            "oculto"
        );


        if (!equipoActual) {

            mostrarSinEquipo();

            return;

        }


        crearSelectorEquipos();


        cargarDatosEquipo();


        await cargarJugadores();


        contenidoEquipo.classList.remove(
            "oculto"
        );


        navegacionMovil.classList.remove(
            "oculto"
        );

    } catch (error) {

        console.error(
            "Error iniciando panel del jefe:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        mostrarSinEquipo(
            "No pudimos cargar tus equipos",
            "Ocurrió un problema al consultar la información en Firebase."
        );

    }

}


function cargarIdentidadJefe() {

    const nombre =
        usuarioActual.nombre?.trim() ||
        (
            usuarioActual.rol === "admin"
                ? "Administrador"
                : "Jefe de equipo"
        );


    jefeNombre.textContent =
        nombre;


    jefeInicial.textContent =
        obtenerInicial(
            nombre
        );

}


async function cargarEquiposAsignados() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );


    const todosLosEquipos =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            )
            .sort(
                (a, b) =>
                    (a.nombre || "")
                        .localeCompare(
                            b.nombre || "",
                            "es"
                        )
            );


    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const equipoIdURL =
        parametros.get("equipo");


    if (
        usuarioActual.rol === "admin"
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
                    equipo.id === equipoIdURL
            ) || null;


        equipoActual =
            equipoEncontrado;


        equiposAsignados =
            equipoEncontrado
                ? [equipoEncontrado]
                : [];


        return;

    }


    equiposAsignados =
        todosLosEquipos.filter(
            equipo =>
                equipo.responsableId === usuarioActual.uid ||
                equipo.responsableId === usuarioActual.id
        );


    if (
        !equiposAsignados.length
    ) {

        equipoActual =
            null;

        return;

    }


    if (
        equipoIdURL
    ) {

        const equipoDeURL =
            equiposAsignados.find(
                equipo =>
                    equipo.id === equipoIdURL
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
        usuarioActual.rol === "admin" ||
        equiposAsignados.length <= 1
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
            >
            </select>

        </div>

    `;


    contenidoEquipo.insertBefore(
        selectorEquiposContenedor,
        contenidoEquipo.firstChild
    );


    selectorEquipos =
        document.getElementById(
            "selectorEquipoJefe"
        );


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
                    : equipo.nombre || "Equipo";


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
                equipo.id === equipoId
        );


    if (!nuevoEquipo) {
        return;
    }


    if (
        equipoActual?.id === nuevoEquipo.id
    ) {
        return;
    }


    selectorEquipos.disabled =
        true;


    cerrarModalJugador();


    equipoActual =
        nuevoEquipo;


    jugadores =
        [];


    buscarJugador.value =
        "";


    actualizarEquipoEnURL(
        equipoActual.id
    );


    cargarDatosEquipo();


    gridJugadores.innerHTML =
        "";


    sinJugadores.classList.add(
        "oculto"
    );


    totalJugadores.textContent =
        "0";

    totalActivos.textContent =
        "0";

    totalSuspendidos.textContent =
        "0";

    totalCredenciales.textContent =
        "0";


    try {

        await cargarJugadores();


        mostrarToast(
            "exito",
            "Equipo seleccionado",
            `Ahora estás administrando ${equipoActual.nombre || "este equipo"}.`
        );

    } catch (error) {

        console.error(
            "Error cambiando de equipo:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo cambiar de equipo",
            "Ocurrió un problema al cargar la plantilla."
        );

    } finally {

        selectorEquipos.disabled =
            false;

    }

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

}


function eliminarSelectorEquipos() {

    if (
        selectorEquiposContenedor
    ) {

        selectorEquiposContenedor.remove();

    }


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
            background:
                linear-gradient(
                    135deg,
                    rgba(255,248,232,.97),
                    rgba(226,201,144,.88)
                );
            box-shadow:
                0 8px 22px rgba(55,43,20,.08);
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
                inset 0 0 0 3px rgba(255,255,255,.18);
        }

        .selector-equipos-jefe-contenido{
            width:100%;
            min-width:0;
            display:flex;
            flex-direction:column;
            gap:4px;
        }

        .selector-equipos-jefe-etiqueta{
            color:#68746e;
            font-size:.76rem;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.04em;
        }

        .selector-equipos-jefe-contenido strong{
            color:#102b28;
            font-size:.93rem;
        }

        #selectorEquipoJefe{
            width:100%;
            min-height:44px;
            box-sizing:border-box;
            margin-top:5px;
            padding:9px 38px 9px 12px;
            border:1px solid #baa676;
            border-radius:12px;
            outline:none;
            background:#fff8e8;
            color:#213732;
            font:inherit;
            font-weight:700;
            cursor:pointer;
        }

        #selectorEquipoJefe:focus{
            border-color:#0b756d;
            box-shadow:
                0 0 0 3px rgba(11,117,109,.12);
        }

        #selectorEquipoJefe:disabled{
            opacity:.65;
            cursor:wait;
        }

        @media (max-width:560px){

            .selector-equipos-jefe{
                align-items:flex-start;
                padding:13px;
            }

            .selector-equipos-jefe-icono{
                width:42px;
                height:42px;
                flex-basis:42px;
                font-size:20px;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


function mostrarSinEquipo(
    titulo = "",
    texto = ""
) {

    contenidoEquipo.classList.add(
        "oculto"
    );


    navegacionMovil.classList.add(
        "oculto"
    );


    sinEquipo.classList.remove(
        "oculto"
    );


    const tituloElemento =
        sinEquipo.querySelector(
            "h1"
        );


    const parrafos =
        sinEquipo.querySelectorAll(
            "p"
        );


    if (
        titulo &&
        tituloElemento
    ) {

        tituloElemento.textContent =
            titulo;

    }


    if (
        texto &&
        parrafos[0]
    ) {

        parrafos[0].textContent =
            texto;

    }

}


function cargarDatosEquipo() {

    if (!equipoActual) {
        return;
    }


    equipoNombre.textContent =
        equipoActual.nombre ||
        "Equipo";


    equipoCategoria.textContent =
        equipoActual.categoriaNombre ||
        "Sin categoría";


    const estado =
        obtenerEstadoEquipo(
            equipoActual
        );


    equipoEstado.textContent =
        textoEstadoEquipo(
            estado
        );


    equipoEstado.className =
        `estado-equipo ${estado}`;


    cargarLogoEquipo();

}


function cargarLogoEquipo() {

    if (!equipoActual) {
        return;
    }


    if (
        equipoActual.logoUrl
    ) {

        equipoLogo.innerHTML = `
            <img
                src="${escaparHTML(equipoActual.logoUrl)}"
                alt="${escaparHTML(equipoActual.nombre || "Equipo")}"
            >
        `;

        return;

    }


    equipoLogo.innerHTML =
        "";


    equipoLogo.textContent =
        obtenerInicial(
            equipoActual.nombre ||
            "E"
        );

}


async function cargarJugadores() {

    if (!equipoActual) {

        jugadores =
            [];

        actualizarResumen();

        aplicarBusqueda();

        return;

    }


    const snapshot =
        await getDocs(
            collection(
                db,
                "jugadores"
            )
        );


    jugadores =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            )
            .filter(
                jugador =>
                    jugador.equipoId ===
                    equipoActual.id
            )
            .sort(
                ordenarJugadores
            );


    actualizarResumen();

    aplicarBusqueda();

}


function actualizarResumen() {

    totalJugadores.textContent =
        jugadores.length;


    totalActivos.textContent =
        jugadores.filter(
            jugador =>
                jugador.activo !== false &&
                jugador.suspendido !== true
        ).length;


    totalSuspendidos.textContent =
        jugadores.filter(
            jugador =>
                jugador.suspendido === true ||
                Number(
                    jugador.partidosSuspensionPendientes || 0
                ) > 0
        ).length;


    totalCredenciales.textContent =
        jugadores.filter(
            jugador =>
                jugador.credencialGenerada === true
        ).length;

}


function aplicarBusqueda() {

    const texto =
        normalizarTexto(
            buscarJugador.value
        );


    const filtrados =
        jugadores.filter(
            jugador => {

                if (!texto) {
                    return true;
                }


                return (
                    normalizarTexto(
                        jugador.nombre ||
                        jugador.nombreCompleto ||
                        ""
                    ).includes(texto) ||
                    normalizarTexto(
                        jugador.curp ||
                        ""
                    ).includes(texto)
                );

            }
        );


    renderizarJugadores(
        filtrados
    );

}


function renderizarJugadores(
    lista
) {

    gridJugadores.innerHTML =
        "";


    if (!lista.length) {

        sinJugadores.classList.remove(
            "oculto"
        );

        return;

    }


    sinJugadores.classList.add(
        "oculto"
    );


    lista.forEach(
        jugador => {

            const suspendido =
                jugador.suspendido === true ||
                Number(
                    jugador.partidosSuspensionPendientes || 0
                ) > 0;


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                `jugador-card ${
                    suspendido
                        ? "suspendido"
                        : ""
                }`;


            const foto =
                jugador.fotoUrl
                    ? `
                        <img
                            src="${escaparHTML(jugador.fotoUrl)}"
                            alt="${escaparHTML(
                                jugador.nombre ||
                                jugador.nombreCompleto ||
                                "Jugador"
                            )}"
                        >
                    `
                    : escaparHTML(
                        obtenerInicial(
                            jugador.nombre ||
                            jugador.nombreCompleto ||
                            "J"
                        )
                    );


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "-";


            const edad =
                calcularEdad(
                    jugador.fechaNacimiento
                );


            card.innerHTML = `

                <div class="jugador-card-top">

                    <div class="jugador-foto">
                        ${foto}
                    </div>


                    <div class="jugador-identidad">

                        <strong>
                            ${escaparHTML(
                                jugador.nombre ||
                                jugador.nombreCompleto ||
                                "Jugador"
                            )}
                        </strong>

                        <span>
                            Dorsal #${escaparHTML(numero)}
                        </span>

                    </div>


                    <span class="jugador-estado ${
                        suspendido
                            ? "suspendido"
                            : ""
                    }">

                        ${
                            suspendido
                                ? "Suspendido"
                                : "Activo"
                        }

                    </span>

                </div>


                <div class="jugador-datos">

                    <div>

                        <span>
                            Edad
                        </span>

                        <strong>
                            ${
                                edad !== null
                                    ? `${edad} años`
                                    : "Sin definir"
                            }
                        </strong>

                    </div>


                    <div>

                        <span>
                            CURP
                        </span>

                        <strong>
                            ${escaparHTML(
                                ocultarCurp(
                                    jugador.curp
                                )
                            )}
                        </strong>

                    </div>

                </div>


                <div class="jugador-estadisticas">

                    <div>

                        <span>
                            Goles
                        </span>

                        <strong>
                            ${Number(
                                jugador.goles || 0
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Amarillas
                        </span>

                        <strong>
                            ${Number(
                                jugador.amarillas || 0
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Rojas
                        </span>

                        <strong>
                            ${Number(
                                jugador.rojas || 0
                            )}
                        </strong>

                    </div>

                </div>


                <div class="jugador-acciones">

                    <button
                        type="button"
                        class="btn-editar-jugador"
                    >
                        Editar
                    </button>


                    <button
                        type="button"
                        class="btn-ver-jugador"
                    >
                        Ver datos
                    </button>

                </div>

            `;


            card.querySelector(
                ".btn-editar-jugador"
            ).addEventListener(
                "click",
                () => {

                    abrirEditarJugador(
                        jugador.id
                    );

                }
            );


            card.querySelector(
                ".btn-ver-jugador"
            ).addEventListener(
                "click",
                () => {

                    abrirEditarJugador(
                        jugador.id
                    );

                }
            );


            gridJugadores.appendChild(
                card
            );

        }
    );

}


function abrirNuevoJugador() {

    if (!equipoActual) {
        return;
    }


    if (
        jugadores.length >= 26
    ) {

        modalLimite.classList.remove(
            "oculto"
        );


        document.body.style.overflow =
            "hidden";

        return;

    }


    jugadorSeleccionado =
        null;


    formJugador.reset();


    modalTitulo.textContent =
        "Registrar jugador";


    btnGuardarJugador.textContent =
        "Guardar jugador";


    archivoCurpNombre.textContent =
        "Seleccionar PDF";


    fotoSeleccionada =
        null;


    archivoCurpSeleccionado =
        null;


    limpiarPreviewFoto();


    modalJugador.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            nombreJugador.focus();

        },
        100
    );

}


function abrirEditarJugador(
    id
) {

    const jugador =
        jugadores.find(
            item =>
                item.id === id
        );


    if (!jugador) {
        return;
    }


    jugadorSeleccionado =
        jugador;


    modalTitulo.textContent =
        "Editar jugador";


    btnGuardarJugador.textContent =
        "Guardar cambios";


    nombreJugador.value =
        jugador.nombre ||
        jugador.nombreCompleto ||
        "";


    fechaNacimiento.value =
        jugador.fechaNacimiento ||
        "";


    numeroJugador.value =
        jugador.numero ??
        jugador.dorsal ??
        "";


    curpJugador.value =
        jugador.curp ||
        "";


    observacionesJugador.value =
        jugador.observaciones ||
        "";


    fotoSeleccionada =
        null;


    archivoCurpSeleccionado =
        null;


    limpiarPreviewFoto();


    if (
        jugador.fotoUrl
    ) {

        previewFotoImagen.src =
            jugador.fotoUrl;


        previewFotoImagen.classList.remove(
            "oculto"
        );


        previewInicial.classList.add(
            "oculto"
        );

    } else {

        previewInicial.textContent =
            obtenerInicial(
                jugador.nombre ||
                "J"
            );

    }


    archivoCurpNombre.textContent =
        jugador.curpArchivoUrl
            ? "Documento cargado"
            : "Seleccionar PDF";


    modalJugador.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


async function guardarJugador(
    event
) {

    event.preventDefault();


    if (!equipoActual) {
        return;
    }


    if (
        !jugadorSeleccionado &&
        jugadores.length >= 26
    ) {

        cerrarModalJugador();


        modalLimite.classList.remove(
            "oculto"
        );


        document.body.style.overflow =
            "hidden";

        return;

    }


    const nombre =
        nombreJugador.value
            .trim()
            .replace(/\s+/g, " ");


    const nacimiento =
        fechaNacimiento.value;


    const numeroTexto =
        numeroJugador.value.trim();


    const numero =
        numeroTexto === ""
            ? null
            : Number(numeroTexto);


    const curp =
        curpJugador.value
            .trim()
            .toUpperCase();


    const observaciones =
        observacionesJugador.value
            .trim()
            .replace(/\s+/g, " ");


    if (!nombre) {

        mostrarToast(
            "error",
            "Nombre requerido",
            "Escribe el nombre completo del jugador."
        );

        return;

    }


    if (!nacimiento) {

        mostrarToast(
            "error",
            "Fecha requerida",
            "Selecciona la fecha de nacimiento."
        );

        return;

    }


    if (
        curp.length !== 18
    ) {

        mostrarToast(
            "error",
            "CURP incorrecta",
            "La CURP debe contener exactamente 18 caracteres."
        );

        return;

    }


    if (
        numero !== null &&
        (
            !Number.isInteger(numero) ||
            numero < 0 ||
            numero > 99
        )
    ) {

        mostrarToast(
            "error",
            "Dorsal incorrecto",
            "El número debe estar entre 0 y 99."
        );

        return;

    }


    const curpDuplicada =
        jugadores.some(
            jugador => {

                if (
                    jugadorSeleccionado &&
                    jugador.id === jugadorSeleccionado.id
                ) {

                    return false;

                }


                return (
                    String(
                        jugador.curp || ""
                    ).toUpperCase() ===
                    curp
                );

            }
        );


    if (curpDuplicada) {

        mostrarToast(
            "error",
            "CURP registrada",
            "Ya existe un jugador de este equipo con esa CURP."
        );

        return;

    }


    btnGuardarJugador.disabled =
        true;


    btnGuardarJugador.textContent =
        "Guardando...";


    try {

        let fotoUrl =
            jugadorSeleccionado?.fotoUrl ||
            null;


        let fotoPublicId =
            jugadorSeleccionado?.fotoPublicId ||
            null;


        let curpArchivoUrl =
            jugadorSeleccionado?.curpArchivoUrl ||
            null;


        let curpArchivoPublicId =
            jugadorSeleccionado?.curpArchivoPublicId ||
            null;


        if (
            fotoSeleccionada
        ) {

            btnGuardarJugador.textContent =
                "Subiendo fotografía...";


            const resultadoFoto =
                await subirFotoJugador(
                    fotoSeleccionada
                );


            fotoUrl =
                resultadoFoto.url;


            fotoPublicId =
                resultadoFoto.publicId;

        }


        if (
            archivoCurpSeleccionado
        ) {

            btnGuardarJugador.textContent =
                "Subiendo CURP...";


            const resultadoCurp =
                await subirPDFCurp(
                    archivoCurpSeleccionado
                );


            curpArchivoUrl =
                resultadoCurp.url;


            curpArchivoPublicId =
                resultadoCurp.publicId;

        }


        btnGuardarJugador.textContent =
            jugadorSeleccionado
                ? "Guardando cambios..."
                : "Registrando jugador...";


        const datos = {

            equipoId:
                equipoActual.id,

            equipoNombre:
                equipoActual.nombre || "",

            categoriaId:
                equipoActual.categoriaId || null,

            categoriaNombre:
                equipoActual.categoriaNombre || "",

            nombre,

            nombreCompleto:
                nombre,

            fechaNacimiento:
                nacimiento,

            numero,

            dorsal:
                numero,

            curp,

            observaciones,

            fotoUrl,

            fotoPublicId,

            curpArchivoUrl,

            curpArchivoPublicId,

            activo:
                jugadorSeleccionado?.activo !== false,

            suspendido:
                jugadorSeleccionado?.suspendido === true,

            partidosSuspensionPendientes:
                Number(
                    jugadorSeleccionado?.partidosSuspensionPendientes || 0
                ),

            goles:
                Number(
                    jugadorSeleccionado?.goles || 0
                ),

            amarillas:
                Number(
                    jugadorSeleccionado?.amarillas || 0
                ),

            rojas:
                Number(
                    jugadorSeleccionado?.rojas || 0
                ),

            credencialGenerada:
                jugadorSeleccionado?.credencialGenerada === true,

            actualizadoEn:
                serverTimestamp()

        };


        if (
            jugadorSeleccionado
        ) {

            await updateDoc(
                doc(
                    db,
                    "jugadores",
                    jugadorSeleccionado.id
                ),
                datos
            );


            Object.assign(
                jugadorSeleccionado,
                datos
            );


            mostrarToast(
                "exito",
                "Jugador actualizado",
                "Los cambios fueron guardados correctamente."
            );

        } else {

            const documento =
                await addDoc(
                    collection(
                        db,
                        "jugadores"
                    ),
                    {
                        ...datos,

                        creadoEn:
                            serverTimestamp()
                    }
                );


            jugadores.push({
                id: documento.id,
                ...datos
            });


            await actualizarTotalJugadoresEquipo();


            mostrarToast(
                "exito",
                "Jugador registrado",
                "El jugador ya forma parte de la plantilla."
            );

        }


        jugadores.sort(
            ordenarJugadores
        );


        actualizarResumen();

        aplicarBusqueda();

        cerrarModalJugador();

    } catch (error) {

        console.error(
            "Error guardando jugador:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            error?.message ||
            "Ocurrió un problema al registrar al jugador."
        );

    } finally {

        btnGuardarJugador.disabled =
            false;


        btnGuardarJugador.textContent =
            jugadorSeleccionado
                ? "Guardar cambios"
                : "Guardar jugador";

    }

}


async function actualizarTotalJugadoresEquipo() {

    if (!equipoActual) {
        return;
    }


    const nuevoTotal =
        jugadores.length;


    await updateDoc(
        doc(
            db,
            "equipos",
            equipoActual.id
        ),
        {
            totalJugadores:
                nuevoTotal,

            actualizadoEn:
                serverTimestamp()
        }
    );


    equipoActual.totalJugadores =
        nuevoTotal;


    const equipoEnLista =
        equiposAsignados.find(
            equipo =>
                equipo.id === equipoActual.id
        );


    if (
        equipoEnLista
    ) {

        equipoEnLista.totalJugadores =
            nuevoTotal;

    }

}


function manejarFoto() {

    const archivo =
        fotoJugador.files?.[0];


    if (!archivo) {

        fotoSeleccionada =
            null;

        return;

    }


    const permitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !permitidos.includes(
            archivo.type
        )
    ) {

        mostrarToast(
            "error",
            "Imagen no válida",
            "Selecciona una imagen JPG, PNG o WEBP."
        );


        fotoJugador.value =
            "";


        fotoSeleccionada =
            null;

        return;

    }


    const maximo =
        5 * 1024 * 1024;


    if (
        archivo.size > maximo
    ) {

        mostrarToast(
            "error",
            "Imagen demasiado grande",
            "La fotografía debe pesar menos de 5 MB."
        );


        fotoJugador.value =
            "";


        fotoSeleccionada =
            null;

        return;

    }


    fotoSeleccionada =
        archivo;


    limpiarPreviewTemporal();


    previewFotoURL =
        URL.createObjectURL(
            archivo
        );


    previewFotoImagen.src =
        previewFotoURL;


    previewFotoImagen.classList.remove(
        "oculto"
    );


    previewInicial.classList.add(
        "oculto"
    );

}


function manejarArchivoCurp() {

    const archivo =
        archivoCurp.files?.[0];


    if (!archivo) {

        archivoCurpSeleccionado =
            null;


        archivoCurpNombre.textContent =
            jugadorSeleccionado?.curpArchivoUrl
                ? "Documento cargado"
                : "Seleccionar PDF";

        return;

    }


    if (
        archivo.type !== "application/pdf"
    ) {

        mostrarToast(
            "error",
            "Documento incorrecto",
            "El documento de CURP debe ser un archivo PDF."
        );


        archivoCurp.value =
            "";


        archivoCurpSeleccionado =
            null;

        return;

    }


    const maximo =
        10 * 1024 * 1024;


    if (
        archivo.size > maximo
    ) {

        mostrarToast(
            "error",
            "PDF demasiado grande",
            "El documento debe pesar menos de 10 MB."
        );


        archivoCurp.value =
            "";


        archivoCurpSeleccionado =
            null;

        return;

    }


    archivoCurpSeleccionado =
        archivo;


    archivoCurpNombre.textContent =
        archivo.name;

}


function actualizarInicialPreview() {

    if (
        !previewFotoImagen.classList.contains(
            "oculto"
        )
    ) {

        return;

    }


    previewInicial.textContent =
        obtenerInicial(
            nombreJugador.value ||
            "J"
        );

}


function limpiarPreviewFoto() {

    limpiarPreviewTemporal();


    fotoJugador.value =
        "";


    archivoCurp.value =
        "";


    previewFotoImagen.removeAttribute(
        "src"
    );


    previewFotoImagen.classList.add(
        "oculto"
    );


    previewInicial.classList.remove(
        "oculto"
    );


    previewInicial.textContent =
        obtenerInicial(
            nombreJugador.value ||
            "J"
        );

}


function limpiarPreviewTemporal() {

    if (
        previewFotoURL
    ) {

        URL.revokeObjectURL(
            previewFotoURL
        );


        previewFotoURL =
            null;

    }

}


function cerrarModalJugador() {

    modalJugador.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";


    limpiarPreviewTemporal();


    jugadorSeleccionado =
        null;


    fotoSeleccionada =
        null;


    archivoCurpSeleccionado =
        null;

}


function cerrarModalLimite() {

    modalLimite.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";

}


function obtenerEstadoEquipo(
    equipo
) {

    if (
        equipo.estado === "descalificado" ||
        equipo.descalificado === true
    ) {

        return "descalificado";

    }


    if (
        equipo.estado === "inactivo" ||
        equipo.activo === false
    ) {

        return "inactivo";

    }


    return "activo";

}


function textoEstadoEquipo(
    estado
) {

    switch (estado) {

        case "descalificado":
            return "Descalificado";

        case "inactivo":
            return "Inactivo";

        case "activo":
        default:
            return "Activo";

    }

}


function ordenarJugadores(
    a,
    b
) {

    const numeroA =
        Number(
            a.numero ??
            a.dorsal ??
            999
        );


    const numeroB =
        Number(
            b.numero ??
            b.dorsal ??
            999
        );


    if (
        numeroA !== numeroB
    ) {

        return numeroA -
            numeroB;

    }


    return (
        a.nombre ||
        a.nombreCompleto ||
        ""
    ).localeCompare(
        b.nombre ||
        b.nombreCompleto ||
        "",
        "es"
    );

}


function calcularEdad(
    fecha
) {

    if (!fecha) {
        return null;
    }


    const nacimiento =
        new Date(
            `${fecha}T00:00:00`
        );


    if (
        Number.isNaN(
            nacimiento.getTime()
        )
    ) {

        return null;

    }


    const hoy =
        new Date();


    let edad =
        hoy.getFullYear() -
        nacimiento.getFullYear();


    const mes =
        hoy.getMonth() -
        nacimiento.getMonth();


    if (
        mes < 0 ||
        (
            mes === 0 &&
            hoy.getDate() <
            nacimiento.getDate()
        )
    ) {

        edad--;

    }


    return Math.max(
        edad,
        0
    );

}


function ocultarCurp(
    curp
) {

    const texto =
        String(
            curp ||
            ""
        );


    if (
        texto.length < 8
    ) {

        return texto ||
        "Sin CURP";

    }


    return `${texto.slice(0, 4)}••••••${texto.slice(-4)}`;

}


function normalizarTexto(
    texto
) {

    return String(
        texto ||
        ""
    )
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

}


function obtenerInicial(
    nombre
) {

    const texto =
        String(
            nombre ||
            ""
        ).trim();


    if (!texto) {
        return "J";
    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function escaparHTML(
    texto
) {

    return String(
        texto ??
        ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");

}


function mostrarToast(
    tipo,
    titulo,
    texto
) {

    clearTimeout(
        toastTimer
    );


    toastIcono.textContent =
        tipo === "error"
            ? "!"
            : "✓";


    toastTitulo.textContent =
        titulo;


    toastTexto.textContent =
        texto;


    if (
        tipo === "error"
    ) {

        toast.style.background =
            "#fff3f2";


        toast.style.borderColor =
            "#f1cbc7";


        toastIcono.style.background =
            "#fee4e2";


        toastIcono.style.color =
            "#b42318";

    } else {

        toast.style.background =
            "#f0faf3";


        toast.style.borderColor =
            "#cbe7d5";


        toastIcono.style.background =
            "#d9f2e1";


        toastIcono.style.color =
            "#18794e";

    }


    toast.classList.remove(
        "oculto"
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.add(
                    "oculto"
                );

            },
            3500
        );

}