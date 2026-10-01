import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    protegerPagina
} from "../roles.js";

import {
    registrarAuditoria
} from "../auditoria.js";

const estadoCarga =
    document.getElementById("estadoCarga");

const estadoError =
    document.getElementById("estadoError");

const estadoErrorTexto =
    document.getElementById("estadoErrorTexto");

const appConfiguracion =
    document.getElementById("appConfiguracion");

const btnReintentar =
    document.getElementById("btnReintentar");

const adminNombre =
    document.getElementById("adminNombre");

const temporadaActualNombre =
    document.getElementById("temporadaActualNombre");

const temporadaActualEstado =
    document.getElementById("temporadaActualEstado");

const resumenInscripciones =
    document.getElementById("resumenInscripciones");

const resumenJornada5 =
    document.getElementById("resumenJornada5");

const resumenEdiciones =
    document.getElementById("resumenEdiciones");

const resumenPrestamos =
    document.getElementById("resumenPrestamos");

const badgeEdiciones =
    document.getElementById("badgeEdiciones");

const badgePrestamos =
    document.getElementById("badgePrestamos");

const contadorEdiciones =
    document.getElementById("contadorEdiciones");

const contadorPrestamos =
    document.getElementById("contadorPrestamos");

const switchInscripciones =
    document.getElementById("switchInscripciones");

const estadoInscripcionesTexto =
    document.getElementById("estadoInscripcionesTexto");

const estadoInscripcionesDetalle =
    document.getElementById("estadoInscripcionesDetalle");

const maximoJugadores =
    document.getElementById("maximoJugadores");

const btnGuardarMaximoJugadores =
    document.getElementById("btnGuardarMaximoJugadores");

const buscarPlantilla =
    document.getElementById("buscarPlantilla");

const listaPlantillas =
    document.getElementById("listaPlantillas");

const switchJornada5 =
    document.getElementById("switchJornada5");

const estadoJornada5Texto =
    document.getElementById("estadoJornada5Texto");

const estadoJornada5Detalle =
    document.getElementById("estadoJornada5Detalle");

const maximoMovimientosJ5 =
    document.getElementById("maximoMovimientosJ5");

const btnGuardarMaximoJ5 =
    document.getElementById("btnGuardarMaximoJ5");

const listaMovimientosJ5 =
    document.getElementById("listaMovimientosJ5");

const listaSolicitudesEdicion =
    document.getElementById("listaSolicitudesEdicion");

const listaSolicitudesPrestamo =
    document.getElementById("listaSolicitudesPrestamo");

const totalEquipos =
    document.getElementById("totalEquipos");

const totalCategorias =
    document.getElementById("totalCategorias");

const buscarEquipo =
    document.getElementById("buscarEquipo");

const buscarCategoria =
    document.getElementById("buscarCategoria");

const listaEquipos =
    document.getElementById("listaEquipos");

const listaCategorias =
    document.getElementById("listaCategorias");

const totalJugadores =
    document.getElementById("totalJugadoresAdmin");

const buscarJugador =
    document.getElementById("buscarJugadorAdmin");

const listaJugadores =
    document.getElementById("listaJugadoresAdmin");

const modalConfirmacion =
    document.getElementById("modalConfirmacion");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCancelarModal =
    document.getElementById("btnCancelarModal");

const btnConfirmarModal =
    document.getElementById("btnConfirmarModal");

const modalIcono =
    document.getElementById("modalIcono");

const modalTitulo =
    document.getElementById("modalTitulo");

const modalTexto =
    document.getElementById("modalTexto");

const modalAdvertencia =
    document.getElementById("modalAdvertencia");

const modalCampoConfirmacion =
    document.getElementById("modalCampoConfirmacion");

const textoConfirmacionRequerido =
    document.getElementById("textoConfirmacionRequerido");

const inputConfirmacion =
    document.getElementById("inputConfirmacion");

const modalSolicitud =
    document.getElementById("modalSolicitud");

const btnCerrarSolicitud =
    document.getElementById("btnCerrarSolicitud");

const solicitudTitulo =
    document.getElementById("solicitudTitulo");

const solicitudSubtitulo =
    document.getElementById("solicitudSubtitulo");

const solicitudContenido =
    document.getElementById("solicitudContenido");

const solicitudObservaciones =
    document.getElementById("solicitudObservaciones");

const btnRechazarSolicitud =
    document.getElementById("btnRechazarSolicitud");

const btnAprobarSolicitud =
    document.getElementById("btnAprobarSolicitud");

const toast =
    document.getElementById("toast");

const toastIcono =
    document.getElementById("toastIcono");

const toastTitulo =
    document.getElementById("toastTitulo");

const toastTexto =
    document.getElementById("toastTexto");

let usuarioActual = null;
let configuracion = null;
let temporadaActual = null;
let equipos = [];
let categorias = [];
let jugadores = [];
let solicitudesEdicion = [];
let solicitudesPrestamo = [];
let movimientosJ5 = [];
let filtroEdicion = "pendiente";
let filtroPrestamo = "pendiente";
let accionConfirmacion = null;
let solicitudSeleccionada = null;
let tipoSolicitudSeleccionada = "";
let toastTimer = null;

const CONFIGURACION_ID =
    "general";

const usuario =
    await protegerPagina([
        "admin"
    ]);

if (usuario) {
    usuarioActual =
        usuario;

    activarEventos();

    await iniciar();
}

function activarEventos() {
    document
        .querySelectorAll(
            ".configuracion-nav-btn"
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    "click",
                    () => {
                        cambiarSeccion(
                            boton.dataset.seccion
                        );
                    }
                );
            }
        );

    document
        .querySelectorAll(
            "[data-filtro-edicion]"
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    "click",
                    () => {
                        filtroEdicion =
                            boton.dataset.filtroEdicion;

                        document
                            .querySelectorAll(
                                "[data-filtro-edicion]"
                            )
                            .forEach(
                                elemento =>
                                    elemento.classList.remove(
                                        "activo"
                                    )
                            );

                        boton.classList.add(
                            "activo"
                        );

                        renderizarSolicitudesEdicion();
                    }
                );
            }
        );

    document
        .querySelectorAll(
            "[data-filtro-prestamo]"
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    "click",
                    () => {
                        filtroPrestamo =
                            boton.dataset.filtroPrestamo;

                        document
                            .querySelectorAll(
                                "[data-filtro-prestamo]"
                            )
                            .forEach(
                                elemento =>
                                    elemento.classList.remove(
                                        "activo"
                                    )
                            );

                        boton.classList.add(
                            "activo"
                        );

                        renderizarSolicitudesPrestamo();
                    }
                );
            }
        );

    switchInscripciones.addEventListener(
        "change",
        solicitarCambioInscripciones
    );

    switchJornada5.addEventListener(
        "change",
        solicitarCambioJornada5
    );

    btnGuardarMaximoJugadores.addEventListener(
        "click",
        guardarMaximoJugadores
    );

    btnGuardarMaximoJ5.addEventListener(
        "click",
        guardarMaximoJ5
    );

    buscarPlantilla.addEventListener(
        "input",
        renderizarPlantillas
    );

    buscarEquipo.addEventListener(
        "input",
        renderizarEquipos
    );

    buscarCategoria.addEventListener(
        "input",
        renderizarCategorias
    );

    if (buscarJugador) {
        buscarJugador.addEventListener(
            "input",
            renderizarJugadores
        );
    }

    btnReintentar.addEventListener(
        "click",
        iniciar
    );

    btnCerrarModal.addEventListener(
        "click",
        cerrarModalConfirmacion
    );

    btnCancelarModal.addEventListener(
        "click",
        cerrarModalConfirmacion
    );

    btnConfirmarModal.addEventListener(
        "click",
        ejecutarConfirmacion
    );

    btnCerrarSolicitud.addEventListener(
        "click",
        cerrarModalSolicitud
    );

    btnAprobarSolicitud.addEventListener(
        "click",
        () =>
            resolverSolicitud(
                "aprobada"
            )
    );

    btnRechazarSolicitud.addEventListener(
        "click",
        () =>
            resolverSolicitud(
                "rechazada"
            )
    );

    modalConfirmacion.addEventListener(
        "click",
        evento => {
            if (
                evento.target ===
                modalConfirmacion
            ) {
                cerrarModalConfirmacion();
            }
        }
    );

    modalSolicitud.addEventListener(
        "click",
        evento => {
            if (
                evento.target ===
                modalSolicitud
            ) {
                cerrarModalSolicitud();
            }
        }
    );
}

async function iniciar() {
    mostrarCarga();

    try {
        await Promise.all([
            cargarTemporada(),
            cargarEquipos(),
            cargarCategorias(),
            cargarJugadores()
        ]);

        await cargarConfiguracion();

        await Promise.all([
            cargarSolicitudesEdicion(),
            cargarSolicitudesPrestamo(),
            cargarMovimientosJ5()
        ]);

        cargarAdministrador();

        renderizarTodo();

        habilitarControles();

        mostrarAplicacion();

    } catch (error) {
        console.error(
            "Error cargando configuración:",
            error
        );

        mostrarError(
            error.message ||
            "No fue posible cargar la configuración de la liga."
        );
    }
}

function cargarAdministrador() {
    const nombre =
        usuarioActual.nombre ||
        usuarioActual.nombreCompleto ||
        usuarioActual.email ||
        "Administrador";

    adminNombre.textContent =
        nombre;
}

async function cargarTemporada() {
    temporadaActual =
        null;

    const snapshot =
        await getDocs(
            collection(
                db,
                "temporadas"
            )
        );

    const temporadas =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

    temporadaActual =
        temporadas.find(
            temporada =>
                temporada.activa === true ||
                normalizarTexto(
                    temporada.estado
                ) === "activa"
        ) ||
        temporadas.find(
            temporada =>
                normalizarTexto(
                    temporada.estado
                ) === "proxima"
        ) ||
        null;
}

async function cargarEquipos() {
    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );

    equipos =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
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
}

async function cargarCategorias() {
    const snapshot =
        await getDocs(
            collection(
                db,
                "categorias"
            )
        );

    categorias =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
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
}

async function cargarJugadores() {
    const snapshot =
        await getDocs(
            collection(
                db,
                "jugadores"
            )
        );

    jugadores =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );
}

async function cargarConfiguracion() {
    const referencia =
        doc(
            db,
            "configuracionLiga",
            CONFIGURACION_ID
        );

    const snapshot =
        await getDoc(
            referencia
        );

    if (snapshot.exists()) {
        configuracion = {
            id: snapshot.id,
            ...snapshot.data()
        };

        return;
    }

    configuracion = {
        inscripcionesAbiertas: true,
        maximoJugadores: 26,
        jornada5Activa: false,
        maximoMovimientosJ5: 5
    };

    await setDoc(
        referencia,
        {
            ...configuracion,
            creadoEn:
                serverTimestamp(),
            actualizadoEn:
                serverTimestamp(),
            actualizadoPor:
                obtenerUsuarioId(),
            actualizadoPorNombre:
                obtenerNombreUsuario()
        }
    );
}

async function cargarSolicitudesEdicion() {
    solicitudesEdicion =
        await obtenerColeccionOpcional(
            "solicitudesEdicion"
        );
}

async function cargarSolicitudesPrestamo() {
    solicitudesPrestamo =
        await obtenerColeccionOpcional(
            "solicitudesPrestamo"
        );
}

async function cargarMovimientosJ5() {
    movimientosJ5 =
        await obtenerColeccionOpcional(
            "movimientosJornada5"
        );
}

async function obtenerColeccionOpcional(
    nombre
) {
    try {
        const snapshot =
            await getDocs(
                collection(
                    db,
                    nombre
                )
            );

        return snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

    } catch (error) {
        console.warn(
            `No se pudo cargar ${nombre}:`,
            error
        );

        return [];
    }
}

function renderizarTodo() {
    renderizarTemporada();

    renderizarConfiguracion();

    renderizarResumen();

    renderizarPlantillas();

    renderizarMovimientosJ5();

    renderizarSolicitudesEdicion();

    renderizarSolicitudesPrestamo();

    renderizarEquipos();

    renderizarCategorias();

    renderizarJugadores();
}

function renderizarTemporada() {
    if (!temporadaActual) {
        temporadaActualNombre.textContent =
            "Sin temporada activa";

        temporadaActualEstado.textContent =
            "SIN TEMPORADA";

        return;
    }

    temporadaActualNombre.textContent =
        temporadaActual.nombre ||
        temporadaActual.temporada ||
        temporadaActual.titulo ||
        "Temporada actual";

    const estado =
        normalizarTexto(
            temporadaActual.estado
        );

    if (
        temporadaActual.activa === true ||
        estado === "activa"
    ) {
        temporadaActualEstado.textContent =
            "ACTIVA";
    } else {
        temporadaActualEstado.textContent =
            "PRÓXIMA";
    }
}

function renderizarConfiguracion() {
    const inscripcionesAbiertas =
        configuracion.inscripcionesAbiertas !==
        false;

    switchInscripciones.checked =
        inscripcionesAbiertas;

    maximoJugadores.value =
        obtenerNumeroValido(
            configuracion.maximoJugadores,
            26
        );

    if (inscripcionesAbiertas) {
        estadoInscripcionesTexto.textContent =
            "INSCRIPCIONES ABIERTAS";

        estadoInscripcionesDetalle.textContent =
            "Los jefes de equipo pueden registrar jugadores.";
    } else {
        estadoInscripcionesTexto.textContent =
            "INSCRIPCIONES CERRADAS";

        estadoInscripcionesDetalle.textContent =
            "No se permiten nuevas altas ordinarias.";
    }

    const jornada5Activa =
        configuracion.jornada5Activa ===
        true;

    switchJornada5.checked =
        jornada5Activa;

    maximoMovimientosJ5.value =
        obtenerNumeroValido(
            configuracion.maximoMovimientosJ5,
            5
        );

    if (jornada5Activa) {
        estadoJornada5Texto.textContent =
            "PERIODO ABIERTO";

        estadoJornada5Detalle.textContent =
            "Los equipos pueden realizar movimientos autorizados.";
    } else {
        estadoJornada5Texto.textContent =
            "PERIODO CERRADO";

        estadoJornada5Detalle.textContent =
            "Los movimientos especiales no están disponibles.";
    }
}

function renderizarResumen() {
    resumenInscripciones.textContent =
        configuracion.inscripcionesAbiertas !==
        false
            ? "ABIERTAS"
            : "CERRADAS";

    resumenJornada5.textContent =
        configuracion.jornada5Activa ===
        true
            ? "ABIERTA"
            : "CERRADA";

    const edicionesPendientes =
        solicitudesEdicion.filter(
            solicitud =>
                obtenerEstadoSolicitud(
                    solicitud
                ) === "pendiente"
        ).length;

    const prestamosPendientes =
        solicitudesPrestamo.filter(
            solicitud =>
                obtenerEstadoSolicitud(
                    solicitud
                ) === "pendiente"
        ).length;

    resumenEdiciones.textContent =
        edicionesPendientes;

    resumenPrestamos.textContent =
        prestamosPendientes;

    contadorEdiciones.textContent =
        edicionesPendientes;

    contadorPrestamos.textContent =
        prestamosPendientes;

    actualizarBadge(
        badgeEdiciones,
        edicionesPendientes
    );

    actualizarBadge(
        badgePrestamos,
        prestamosPendientes
    );
}

function actualizarBadge(
    elemento,
    cantidad
) {
    elemento.textContent =
        cantidad;

    if (cantidad > 0) {
        elemento.classList.remove(
            "oculto"
        );
    } else {
        elemento.classList.add(
            "oculto"
        );
    }
}

function renderizarPlantillas() {
    const busqueda =
        normalizarTexto(
            buscarPlantilla.value
        );

    const equiposFiltrados =
        equipos.filter(
            equipo => {
                const texto =
                    normalizarTexto(
                        `${equipo.nombre || ""} ${equipo.categoriaNombre || ""}`
                    );

                return texto.includes(
                    busqueda
                );
            }
        );

    listaPlantillas.innerHTML =
        "";

    if (!equiposFiltrados.length) {
        listaPlantillas.innerHTML =
            crearMensajeVacio(
                "No se encontraron equipos."
            );

        return;
    }

    equiposFiltrados.forEach(
        equipo => {
            const total =
                contarJugadoresEquipo(
                    equipo.id
                );

            const limite =
                obtenerLimiteEquipo(
                    equipo
                );

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "plantilla-item";

            const logo =
                obtenerLogoEquipo(
                    equipo
                );

            const inicial =
                obtenerInicial(
                    equipo.nombre ||
                    "E"
                );

            item.innerHTML = `
                <div class="plantilla-logo">
                    ${
                        logo
                            ? `<img src="${escaparAtributo(logo)}" alt="">`
                            : escaparHtml(inicial)
                    }
                </div>

                <div class="plantilla-info">
                    <strong>
                        ${escaparHtml(equipo.nombre || "Equipo")}
                    </strong>

                    <span>
                        ${escaparHtml(equipo.categoriaNombre || "Sin categoría")}
                    </span>
                </div>

                <div class="plantilla-cupo">
                    <strong>
                        ${total}
                    </strong>

                    <span>
                        / ${limite}
                    </span>
                </div>
            `;

            listaPlantillas.appendChild(
                item
            );
        }
    );
}

function contarJugadoresEquipo(
    equipoId
) {
    return jugadores.filter(
        jugador =>
            jugador.equipoId ===
                equipoId &&
            jugador.activo !==
                false
    ).length;
}

function obtenerLimiteEquipo(
    equipo
) {
    const congelado =
        Number(
            equipo.cupoTemporada ??
            equipo.limitePlantillaTemporada
        );

    if (
        Number.isFinite(
            congelado
        ) &&
        congelado > 0
    ) {
        return congelado;
    }

    return obtenerNumeroValido(
        configuracion.maximoJugadores,
        26
    );
}

function renderizarMovimientosJ5() {
    listaMovimientosJ5.innerHTML =
        "";

    if (!equipos.length) {
        listaMovimientosJ5.innerHTML =
            crearMensajeVacio(
                "No hay equipos registrados."
            );

        return;
    }

    const maximo =
        obtenerNumeroValido(
            configuracion.maximoMovimientosJ5,
            5
        );

    equipos.forEach(
        equipo => {
            const movimientos =
                movimientosJ5.filter(
                    movimiento =>
                        movimiento.equipoId ===
                        equipo.id
                );

            const altas =
                movimientos.filter(
                    movimiento =>
                        normalizarTexto(
                            movimiento.tipo
                        ) === "alta"
                ).length;

            const bajas =
                movimientos.filter(
                    movimiento =>
                        normalizarTexto(
                            movimiento.tipo
                        ) === "baja"
                ).length;

            const utilizados =
                Math.max(
                    altas,
                    bajas
                );

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "movimiento-item";

            item.innerHTML = `
                <div class="plantilla-info">
                    <strong>
                        ${escaparHtml(equipo.nombre || "Equipo")}
                    </strong>

                    <span>
                        Altas: ${altas} · Bajas: ${bajas}
                    </span>
                </div>

                <div class="plantilla-cupo">
                    <strong>
                        ${utilizados}
                    </strong>

                    <span>
                        / ${maximo}
                    </span>
                </div>
            `;

            listaMovimientosJ5.appendChild(
                item
            );
        }
    );
}

function renderizarSolicitudesEdicion() {
    const lista =
        filtrarSolicitudes(
            solicitudesEdicion,
            filtroEdicion
        );

    listaSolicitudesEdicion.innerHTML =
        "";

    if (!lista.length) {
        listaSolicitudesEdicion.innerHTML =
            crearSolicitudVacia(
                "Sin solicitudes",
                filtroEdicion === "pendiente"
                    ? "No hay solicitudes de edición pendientes."
                    : "No hay solicitudes con este estado."
            );

        return;
    }

    ordenarSolicitudes(
        lista
    ).forEach(
        solicitud => {
            const item =
                crearItemSolicitud(
                    solicitud,
                    "edicion"
                );

            listaSolicitudesEdicion.appendChild(
                item
            );
        }
    );
}

function renderizarSolicitudesPrestamo() {
    const lista =
        filtrarSolicitudes(
            solicitudesPrestamo,
            filtroPrestamo
        );

    listaSolicitudesPrestamo.innerHTML =
        "";

    if (!lista.length) {
        listaSolicitudesPrestamo.innerHTML =
            crearSolicitudVacia(
                "Sin solicitudes",
                filtroPrestamo === "pendiente"
                    ? "No hay solicitudes de préstamo pendientes."
                    : "No hay solicitudes con este estado."
            );

        return;
    }

    ordenarSolicitudes(
        lista
    ).forEach(
        solicitud => {
            const item =
                crearItemSolicitud(
                    solicitud,
                    "prestamo"
                );

            listaSolicitudesPrestamo.appendChild(
                item
            );
        }
    );
}

function crearItemSolicitud(
    solicitud,
    tipo
) {
    const item =
        document.createElement(
            "article"
        );

    item.className =
        "solicitud-item";

    const estado =
        obtenerEstadoSolicitud(
            solicitud
        );

    const jugador =
        solicitud.jugadorNombre ||
        solicitud.nombreJugador ||
        solicitud.nombre ||
        "Jugador";

    const equipo =
        solicitud.equipoNombre ||
        solicitud.nombreEquipo ||
        "Equipo";

    const solicitante =
        solicitud.solicitanteNombre ||
        solicitud.usuarioNombre ||
        solicitud.creadoPorNombre ||
        "Jefe de equipo";

    const descripcion =
        tipo === "edicion"
            ? obtenerDescripcionEdicion(
                solicitud
            )
            : obtenerDescripcionPrestamo(
                solicitud
            );

    item.innerHTML = `
        <div class="solicitud-item-principal">

            <div class="solicitud-item-etiqueta">
                ${escaparHtml(estado.toUpperCase())}
            </div>

            <h4>
                ${escaparHtml(jugador)}
            </h4>

            <p>
                ${escaparHtml(descripcion)}
            </p>

            <div class="solicitud-item-meta">
                <span>
                    ${escaparHtml(equipo)}
                </span>

                <span>
                    Solicitado por ${escaparHtml(solicitante)}
                </span>
            </div>

        </div>

        <div class="solicitud-item-acciones">
            <button
                class="btn btn-secundario btn-ver-solicitud"
                type="button"
            >
                Ver solicitud
            </button>
        </div>
    `;

    const boton =
        item.querySelector(
            ".btn-ver-solicitud"
        );

    boton.addEventListener(
        "click",
        () => {
            abrirSolicitud(
                solicitud,
                tipo
            );
        }
    );

    return item;
}

function obtenerDescripcionEdicion(
    solicitud
) {
    const campo =
        solicitud.campo ||
        solicitud.campoModificado ||
        "";

    if (campo) {
        return `Solicita modificar: ${campo}`;
    }

    return solicitud.motivo ||
        solicitud.descripcion ||
        "Solicitud de modificación de información.";
}

function obtenerDescripcionPrestamo(
    solicitud
) {
    const origen =
        solicitud.equipoOrigenNombre ||
        solicitud.equipoNombre ||
        "Equipo de origen";

    const destino =
        solicitud.equipoDestinoNombre ||
        "Equipo de destino";

    return `${origen} → ${destino}`;
}

function abrirSolicitud(
    solicitud,
    tipo
) {
    solicitudSeleccionada =
        solicitud;

    tipoSolicitudSeleccionada =
        tipo;

    solicitudObservaciones.value =
        "";

    const pendiente =
        obtenerEstadoSolicitud(
            solicitud
        ) === "pendiente";

    btnAprobarSolicitud.classList.toggle(
        "oculto",
        !pendiente
    );

    btnRechazarSolicitud.classList.toggle(
        "oculto",
        !pendiente
    );

    const jugador =
        solicitud.jugadorNombre ||
        solicitud.nombreJugador ||
        solicitud.nombre ||
        "Jugador";

    solicitudTitulo.textContent =
        tipo === "edicion"
            ? "Solicitud de edición"
            : "Solicitud de préstamo";

    solicitudSubtitulo.textContent =
        jugador;

    if (tipo === "edicion") {
        solicitudContenido.innerHTML =
            crearDetalleEdicion(
                solicitud
            );
    } else {
        solicitudContenido.innerHTML =
            crearDetallePrestamo(
                solicitud
            );
    }

    modalSolicitud.classList.remove(
        "oculto"
    );
}

function crearDetalleEdicion(
    solicitud
) {
    const equipo =
        solicitud.equipoNombre ||
        solicitud.nombreEquipo ||
        "Sin especificar";

    const campo =
        solicitud.campo ||
        solicitud.campoModificado ||
        "Información";

    const actual =
        solicitud.valorActual ??
        solicitud.datoActual ??
        "-";

    const nuevo =
        solicitud.valorNuevo ??
        solicitud.datoNuevo ??
        "-";

    const motivo =
        solicitud.motivo ||
        "Sin motivo especificado";

    return `
        <div class="solicitud-detalle-grid">

            <div class="solicitud-detalle">
                <span>Equipo</span>
                <strong>${escaparHtml(equipo)}</strong>
            </div>

            <div class="solicitud-detalle">
                <span>Campo solicitado</span>
                <strong>${escaparHtml(campo)}</strong>
            </div>

        </div>

        <div class="cambio-comparacion">

            <div class="cambio-valor">
                <span>Información actual</span>
                <strong>${escaparHtml(actual)}</strong>
            </div>

            <div class="cambio-flecha">
                →
            </div>

            <div class="cambio-valor">
                <span>Información solicitada</span>
                <strong>${escaparHtml(nuevo)}</strong>
            </div>

        </div>

        <div class="solicitud-detalle" style="margin-top:13px;">
            <span>Motivo</span>
            <strong>${escaparHtml(motivo)}</strong>
        </div>
    `;
}

function crearDetallePrestamo(
    solicitud
) {
    const equipoOrigen =
        solicitud.equipoOrigenNombre ||
        solicitud.equipoNombre ||
        "Sin especificar";

    const equipoDestino =
        solicitud.equipoDestinoNombre ||
        "Sin especificar";

    const categoriaOrigen =
        solicitud.categoriaOrigenNombre ||
        solicitud.categoriaNombre ||
        "Sin especificar";

    const categoriaDestino =
        solicitud.categoriaDestinoNombre ||
        "Sin especificar";

    return `
        <div class="solicitud-detalle-grid">

            <div class="solicitud-detalle">
                <span>Equipo de origen</span>
                <strong>${escaparHtml(equipoOrigen)}</strong>
            </div>

            <div class="solicitud-detalle">
                <span>Equipo de destino</span>
                <strong>${escaparHtml(equipoDestino)}</strong>
            </div>

            <div class="solicitud-detalle">
                <span>Categoría de origen</span>
                <strong>${escaparHtml(categoriaOrigen)}</strong>
            </div>

            <div class="solicitud-detalle">
                <span>Categoría de destino</span>
                <strong>${escaparHtml(categoriaDestino)}</strong>
            </div>

        </div>
    `;
}

async function resolverSolicitud(
    nuevoEstado
) {
    if (
        !solicitudSeleccionada ||
        !tipoSolicitudSeleccionada
    ) {
        return;
    }

    const coleccion =
        tipoSolicitudSeleccionada ===
            "edicion"
            ? "solicitudesEdicion"
            : "solicitudesPrestamo";

    btnAprobarSolicitud.disabled =
        true;

    btnRechazarSolicitud.disabled =
        true;

    try {
        await updateDoc(
            doc(
                db,
                coleccion,
                solicitudSeleccionada.id
            ),
            {
                estado:
                    nuevoEstado,

                observacionesAdmin:
                    solicitudObservaciones.value.trim(),

                resueltoEn:
                    serverTimestamp(),

                resueltoPor:
                    obtenerUsuarioId(),

                resueltoPorNombre:
                    obtenerNombreUsuario()
            }
        );

        solicitudSeleccionada.estado =
            nuevoEstado;

        solicitudSeleccionada.observacionesAdmin =
            solicitudObservaciones.value.trim();

        await registrarAuditoria({
            usuarioId:
                obtenerUsuarioId(),

            usuarioNombre:
                obtenerNombreUsuario(),

            usuarioRol:
                usuarioActual.rol ||
                "admin",

            modulo:
                tipoSolicitudSeleccionada ===
                    "edicion"
                    ? "CONFIGURACIÓN - EDICIONES"
                    : "CONFIGURACIÓN - PRÉSTAMOS",

            accion:
                nuevoEstado === "aprobada"
                    ? "SOLICITUD APROBADA"
                    : "SOLICITUD RECHAZADA",

            descripcion:
                `Se ${nuevoEstado === "aprobada" ? "aprobó" : "rechazó"} una solicitud.`,

            entidadTipo:
                coleccion,

            entidadId:
                solicitudSeleccionada.id,

            entidadNombre:
                solicitudSeleccionada.jugadorNombre ||
                solicitudSeleccionada.nombreJugador ||
                "Jugador"
        });

        cerrarModalSolicitud();

        renderizarResumen();

        renderizarSolicitudesEdicion();

        renderizarSolicitudesPrestamo();

        mostrarToast(
            "exito",
            "Solicitud actualizada",
            nuevoEstado === "aprobada"
                ? "La solicitud fue aprobada."
                : "La solicitud fue rechazada."
        );

    } catch (error) {
        console.error(
            "Error resolviendo solicitud:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo actualizar",
            error.message ||
            "Ocurrió un problema al procesar la solicitud."
        );

    } finally {
        btnAprobarSolicitud.disabled =
            false;

        btnRechazarSolicitud.disabled =
            false;
    }
}

function cerrarModalSolicitud() {
    modalSolicitud.classList.add(
        "oculto"
    );

    solicitudSeleccionada =
        null;

    tipoSolicitudSeleccionada =
        "";

    solicitudObservaciones.value =
        "";
}

function solicitarCambioInscripciones() {
    const nuevoEstado =
        switchInscripciones.checked;

    switchInscripciones.checked =
        configuracion.inscripcionesAbiertas !==
        false;

    if (nuevoEstado) {
        abrirConfirmacion({
            titulo:
                "Abrir inscripciones",

            texto:
                "Los jefes de equipo podrán volver a registrar jugadores durante el periodo inicial.",

            advertencia:
                "Confirma que deseas habilitar nuevamente las altas ordinarias.",

            requiereTexto:
                false,

            tipoBoton:
                "normal",

            accion:
                () =>
                    cambiarEstadoInscripciones(
                        true
                    )
        });
    } else {
        abrirConfirmacion({
            titulo:
                "Cerrar inscripciones",

            texto:
                "Se bloquearán las nuevas altas ordinarias y la plantilla actual de cada equipo quedará como su límite para esta temporada.",

            advertencia:
                "Ejemplo: si un equipo tiene 20 jugadores al cerrar, su límite quedará en 20 aunque el máximo reglamentario sea 26.",

            requiereTexto:
                true,

            textoRequerido:
                "CERRAR",

            tipoBoton:
                "peligro",

            accion:
                () =>
                    cambiarEstadoInscripciones(
                        false
                    )
        });
    }
}

async function cambiarEstadoInscripciones(
    abiertas
) {
    const referencia =
        doc(
            db,
            "configuracionLiga",
            CONFIGURACION_ID
        );

    if (!abiertas) {
        await congelarPlantillas();
    }

    await updateDoc(
        referencia,
        {
            inscripcionesAbiertas:
                abiertas,

            inscripcionesActualizadasEn:
                serverTimestamp(),

            inscripcionesActualizadasPor:
                obtenerUsuarioId(),

            inscripcionesActualizadasPorNombre:
                obtenerNombreUsuario(),

            actualizadoEn:
                serverTimestamp()
        }
    );

    configuracion.inscripcionesAbiertas =
        abiertas;

    await registrarAuditoria({
        usuarioId:
            obtenerUsuarioId(),

        usuarioNombre:
            obtenerNombreUsuario(),

        usuarioRol:
            usuarioActual.rol ||
            "admin",

        modulo:
            "CONFIGURACIÓN",

        accion:
            abiertas
                ? "INSCRIPCIONES ABIERTAS"
                : "INSCRIPCIONES CERRADAS",

        descripcion:
            abiertas
                ? "Se habilitó el registro ordinario de jugadores."
                : "Se cerró el registro ordinario y se congelaron los cupos de los equipos.",

        entidadTipo:
            "configuracionLiga",

        entidadId:
            CONFIGURACION_ID,

        entidadNombre:
            "Configuración general"
    });

    renderizarConfiguracion();

    renderizarResumen();

    renderizarPlantillas();

    mostrarToast(
        "exito",
        abiertas
            ? "Inscripciones abiertas"
            : "Inscripciones cerradas",
        abiertas
            ? "Los jefes de equipo podrán registrar jugadores."
            : "Las plantillas actuales quedaron registradas como límite."
    );
}

async function congelarPlantillas() {
    const batch =
        writeBatch(
            db
        );

    equipos.forEach(
        equipo => {
            const cantidad =
                contarJugadoresEquipo(
                    equipo.id
                );

            const referencia =
                doc(
                    db,
                    "equipos",
                    equipo.id
                );

            batch.update(
                referencia,
                {
                    cupoTemporada:
                        cantidad,

                    limitePlantillaTemporada:
                        cantidad,

                    plantillaCongelada:
                        true,

                    plantillaCongeladaEn:
                        serverTimestamp(),

                    temporadaPlantillaId:
                        temporadaActual?.id ||
                        ""
                }
            );

            equipo.cupoTemporada =
                cantidad;

            equipo.limitePlantillaTemporada =
                cantidad;

            equipo.plantillaCongelada =
                true;
        }
    );

    await batch.commit();
}

function solicitarCambioJornada5() {
    const nuevoEstado =
        switchJornada5.checked;

    switchJornada5.checked =
        configuracion.jornada5Activa ===
        true;

    abrirConfirmacion({
        titulo:
            nuevoEstado
                ? "Abrir Jornada 5"
                : "Cerrar Jornada 5",

        texto:
            nuevoEstado
                ? "Se habilitará el periodo especial de movimientos para los equipos."
                : "Se cerrará el periodo especial y ya no podrán registrarse nuevos movimientos de Jornada 5.",

        advertencia:
            nuevoEstado
                ? "Los equipos conservarán su límite de plantilla congelado y solo podrán utilizar el número máximo de movimientos establecido."
                : "Los movimientos realizados anteriormente permanecerán registrados.",

        requiereTexto:
            false,

        tipoBoton:
            nuevoEstado
                ? "normal"
                : "peligro",

        accion:
            () =>
                cambiarEstadoJornada5(
                    nuevoEstado
                )
    });
}

async function cambiarEstadoJornada5(
    activa
) {
    await updateDoc(
        doc(
            db,
            "configuracionLiga",
            CONFIGURACION_ID
        ),
        {
            jornada5Activa:
                activa,

            jornada5ActualizadaEn:
                serverTimestamp(),

            jornada5ActualizadaPor:
                obtenerUsuarioId(),

            jornada5ActualizadaPorNombre:
                obtenerNombreUsuario(),

            actualizadoEn:
                serverTimestamp()
        }
    );

    configuracion.jornada5Activa =
        activa;

    await registrarAuditoria({
        usuarioId:
            obtenerUsuarioId(),

        usuarioNombre:
            obtenerNombreUsuario(),

        usuarioRol:
            usuarioActual.rol ||
            "admin",

        modulo:
            "CONFIGURACIÓN",

        accion:
            activa
                ? "JORNADA 5 ABIERTA"
                : "JORNADA 5 CERRADA",

        descripcion:
            activa
                ? "Se habilitó el periodo especial de movimientos de Jornada 5."
                : "Se cerró el periodo especial de movimientos de Jornada 5.",

        entidadTipo:
            "configuracionLiga",

        entidadId:
            CONFIGURACION_ID,

        entidadNombre:
            "Jornada 5"
    });

    renderizarConfiguracion();

    renderizarResumen();

    mostrarToast(
        "exito",
        activa
            ? "Jornada 5 abierta"
            : "Jornada 5 cerrada",
        activa
            ? "El periodo especial quedó habilitado."
            : "El periodo especial quedó cerrado."
    );
}

async function guardarMaximoJugadores() {
    const valor =
        Number(
            maximoJugadores.value
        );

    if (
        !Number.isInteger(
            valor
        ) ||
        valor < 1 ||
        valor > 100
    ) {
        mostrarToast(
            "error",
            "Valor inválido",
            "Escribe un máximo de jugadores válido."
        );

        return;
    }

    btnGuardarMaximoJugadores.disabled =
        true;

    try {
        await updateDoc(
            doc(
                db,
                "configuracionLiga",
                CONFIGURACION_ID
            ),
            {
                maximoJugadores:
                    valor,

                actualizadoEn:
                    serverTimestamp(),

                actualizadoPor:
                    obtenerUsuarioId(),

                actualizadoPorNombre:
                    obtenerNombreUsuario()
            }
        );

        configuracion.maximoJugadores =
            valor;

        await registrarAuditoria({
            usuarioId:
                obtenerUsuarioId(),

            usuarioNombre:
                obtenerNombreUsuario(),

            usuarioRol:
                usuarioActual.rol ||
                "admin",

            modulo:
                "CONFIGURACIÓN",

            accion:
                "MÁXIMO DE JUGADORES ACTUALIZADO",

            descripcion:
                `Se estableció un máximo reglamentario de ${valor} jugadores por equipo.`,

            entidadTipo:
                "configuracionLiga",

            entidadId:
                CONFIGURACION_ID,

            entidadNombre:
                "Máximo de jugadores"
        });

        renderizarPlantillas();

        mostrarToast(
            "exito",
            "Máximo actualizado",
            `El máximo reglamentario quedó en ${valor} jugadores.`
        );

    } catch (error) {
        console.error(
            "Error guardando máximo:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo guardar",
            error.message ||
            "Ocurrió un problema al guardar el máximo."
        );

    } finally {
        btnGuardarMaximoJugadores.disabled =
            false;
    }
}

async function guardarMaximoJ5() {
    const valor =
        Number(
            maximoMovimientosJ5.value
        );

    if (
        !Number.isInteger(
            valor
        ) ||
        valor < 1 ||
        valor > 50
    ) {
        mostrarToast(
            "error",
            "Valor inválido",
            "Escribe un máximo de movimientos válido."
        );

        return;
    }

    btnGuardarMaximoJ5.disabled =
        true;

    try {
        await updateDoc(
            doc(
                db,
                "configuracionLiga",
                CONFIGURACION_ID
            ),
            {
                maximoMovimientosJ5:
                    valor,

                actualizadoEn:
                    serverTimestamp(),

                actualizadoPor:
                    obtenerUsuarioId(),

                actualizadoPorNombre:
                    obtenerNombreUsuario()
            }
        );

        configuracion.maximoMovimientosJ5 =
            valor;

        await registrarAuditoria({
            usuarioId:
                obtenerUsuarioId(),

            usuarioNombre:
                obtenerNombreUsuario(),

            usuarioRol:
                usuarioActual.rol ||
                "admin",

            modulo:
                "CONFIGURACIÓN",

            accion:
                "MÁXIMO JORNADA 5 ACTUALIZADO",

            descripcion:
                `Se estableció un máximo de ${valor} movimientos de Jornada 5 por equipo.`,

            entidadTipo:
                "configuracionLiga",

            entidadId:
                CONFIGURACION_ID,

            entidadNombre:
                "Movimientos Jornada 5"
        });

        renderizarMovimientosJ5();

        mostrarToast(
            "exito",
            "Límite actualizado",
            `Cada equipo podrá utilizar hasta ${valor} movimientos.`
        );

    } catch (error) {
        console.error(
            "Error guardando límite J5:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo guardar",
            error.message ||
            "Ocurrió un problema al guardar el límite."
        );

    } finally {
        btnGuardarMaximoJ5.disabled =
            false;
    }
}

function renderizarEquipos() {
    const busqueda =
        normalizarTexto(
            buscarEquipo.value
        );

    const lista =
        equipos.filter(
            equipo =>
                normalizarTexto(
                    `${equipo.nombre || ""} ${equipo.categoriaNombre || ""}`
                ).includes(
                    busqueda
                )
        );

    totalEquipos.textContent =
        equipos.length;

    listaEquipos.innerHTML =
        "";

    if (!lista.length) {
        listaEquipos.innerHTML =
            crearMensajeVacio(
                "No se encontraron equipos."
            );

        return;
    }

    lista.forEach(
        equipo => {
            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "administracion-item";

            const logo =
                obtenerLogoEquipo(
                    equipo
                );

            item.innerHTML = `
                <div class="administracion-item-icono">
                    ${
                        logo
                            ? `<img src="${escaparAtributo(logo)}" alt="">`
                            : escaparHtml(
                                obtenerInicial(
                                    equipo.nombre ||
                                    "E"
                                )
                            )
                    }
                </div>

                <div class="administracion-item-info">
                    <strong>
                        ${escaparHtml(equipo.nombre || "Equipo")}
                    </strong>

                    <span>
                        ${escaparHtml(equipo.categoriaNombre || "Sin categoría")}
                    </span>
                </div>

                <button
                    class="btn-eliminar"
                    type="button"
                >
                    Eliminar
                </button>
            `;

            item
                .querySelector(
                    ".btn-eliminar"
                )
                .addEventListener(
                    "click",
                    () =>
                        solicitarEliminarEquipo(
                            equipo
                        )
                );

            listaEquipos.appendChild(
                item
            );
        }
    );
}

function renderizarCategorias() {
    const busqueda =
        normalizarTexto(
            buscarCategoria.value
        );

    const lista =
        categorias.filter(
            categoria =>
                normalizarTexto(
                    categoria.nombre ||
                    ""
                ).includes(
                    busqueda
                )
        );

    totalCategorias.textContent =
        categorias.length;

    listaCategorias.innerHTML =
        "";

    if (!lista.length) {
        listaCategorias.innerHTML =
            crearMensajeVacio(
                "No se encontraron categorías."
            );

        return;
    }

    lista.forEach(
        categoria => {
            const cantidadEquipos =
                equipos.filter(
                    equipo =>
                        equipo.categoriaId ===
                        categoria.id
                ).length;

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "administracion-item";

            item.innerHTML = `
                <div class="administracion-item-icono">
                    C
                </div>

                <div class="administracion-item-info">
                    <strong>
                        ${escaparHtml(categoria.nombre || "Categoría")}
                    </strong>

                    <span>
                        ${cantidadEquipos} equipo${cantidadEquipos === 1 ? "" : "s"}
                    </span>
                </div>

                <button
                    class="btn-eliminar"
                    type="button"
                >
                    Eliminar
                </button>
            `;

            item
                .querySelector(
                    ".btn-eliminar"
                )
                .addEventListener(
                    "click",
                    () =>
                        solicitarEliminarCategoria(
                            categoria
                        )
                );

            listaCategorias.appendChild(
                item
            );
        }
    );
}

function renderizarJugadores() {
    if (
        !listaJugadores ||
        !totalJugadores
    ) {
        return;
    }

    const busqueda =
        normalizarTexto(
            buscarJugador?.value ||
            ""
        );

    const lista =
        jugadores
            .filter(
                jugador => {
                    const nombre =
                        obtenerNombreJugador(
                            jugador
                        );

                    const equipo =
                        obtenerEquipoJugador(
                            jugador
                        );

                    const categoria =
                        obtenerCategoriaJugador(
                            jugador
                        );

                    const curp =
                        jugador.curp ||
                        "";

                    return normalizarTexto(
                        `${nombre} ${equipo} ${categoria} ${curp}`
                    ).includes(
                        busqueda
                    );
                }
            )
            .sort(
                (a, b) =>
                    obtenerNombreJugador(
                        a
                    ).localeCompare(
                        obtenerNombreJugador(
                            b
                        ),
                        "es"
                    )
            );

    totalJugadores.textContent =
        jugadores.length;

    listaJugadores.innerHTML =
        "";

    if (!lista.length) {
        listaJugadores.innerHTML =
            crearMensajeVacio(
                busqueda
                    ? "No se encontraron jugadores."
                    : "No hay jugadores registrados."
            );

        return;
    }

    lista.forEach(
        jugador => {
            const nombre =
                obtenerNombreJugador(
                    jugador
                );

            const equipo =
                obtenerEquipoJugador(
                    jugador
                );

            const categoria =
                obtenerCategoriaJugador(
                    jugador
                );

            const foto =
                jugador.fotoUrl ||
                jugador.fotoURL ||
                jugador.foto ||
                jugador.imagenUrl ||
                jugador.imagenURL ||
                jugador.imagen ||
                "";

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "administracion-item";

            item.innerHTML = `
                <div class="administracion-item-icono">
                    ${
                        foto
                            ? `<img src="${escaparAtributo(foto)}" alt="">`
                            : escaparHtml(
                                obtenerInicial(
                                    nombre
                                )
                            )
                    }
                </div>

                <div class="administracion-item-info">
                    <strong>
                        ${escaparHtml(nombre)}
                    </strong>

                    <span>
                        ${escaparHtml(equipo)}
                    </span>

                    <span>
                        ${escaparHtml(categoria)}
                    </span>
                </div>

                <button
                    class="btn-eliminar"
                    type="button"
                >
                    Eliminar
                </button>
            `;

            item
                .querySelector(
                    ".btn-eliminar"
                )
                .addEventListener(
                    "click",
                    () =>
                        solicitarEliminarJugador(
                            jugador
                        )
                );

            listaJugadores.appendChild(
                item
            );
        }
    );
}

function obtenerNombreJugador(
    jugador
) {
    return jugador.nombreCompleto ||
        jugador.nombre ||
        jugador.nombreJugador ||
        "Jugador";
}

function obtenerEquipoJugador(
    jugador
) {
    if (jugador.equipoNombre) {
        return jugador.equipoNombre;
    }

    const equipo =
        equipos.find(
            elemento =>
                String(
                    elemento.id
                ) ===
                String(
                    jugador.equipoId ||
                    ""
                )
        );

    return equipo?.nombre ||
        "Sin equipo";
}

function obtenerCategoriaJugador(
    jugador
) {
    if (jugador.categoriaNombre) {
        return jugador.categoriaNombre;
    }

    const equipo =
        equipos.find(
            elemento =>
                String(
                    elemento.id
                ) ===
                String(
                    jugador.equipoId ||
                    ""
                )
        );

    if (equipo?.categoriaNombre) {
        return equipo.categoriaNombre;
    }

    const categoriaId =
        jugador.categoriaId ||
        equipo?.categoriaId ||
        "";

    const categoria =
        categorias.find(
            elemento =>
                String(
                    elemento.id
                ) ===
                String(
                    categoriaId
                )
        );

    return categoria?.nombre ||
        "Sin categoría";
}

function solicitarEliminarJugador(
    jugador
) {
    const nombre =
        obtenerNombreJugador(
            jugador
        );

    abrirConfirmacion({
        titulo:
            "Eliminar jugador",

        texto:
            `Estás a punto de eliminar a "${nombre}".`,

        advertencia:
            "Esta acción eliminará permanentemente el registro del jugador. No se puede deshacer.",

        requiereTexto:
            true,

        textoRequerido:
            "ELIMINAR",

        tipoBoton:
            "peligro",

        accion:
            () =>
                eliminarJugador(
                    jugador
                )
    });
}

async function eliminarJugador(
    jugador
) {
    const nombre =
        obtenerNombreJugador(
            jugador
        );

    const equipoId =
        jugador.equipoId ||
        "";

    await deleteDoc(
        doc(
            db,
            "jugadores",
            jugador.id
        )
    );

    jugadores =
        jugadores.filter(
            elemento =>
                elemento.id !==
                jugador.id
        );

    if (equipoId) {
        const equipo =
            equipos.find(
                elemento =>
                    String(
                        elemento.id
                    ) ===
                    String(
                        equipoId
                    )
            );

        if (equipo) {
            const totalActual =
                jugadores.filter(
                    elemento =>
                        String(
                            elemento.equipoId ||
                            ""
                        ) ===
                            String(
                                equipoId
                            ) &&
                        elemento.activo !==
                            false
                ).length;

            await updateDoc(
                doc(
                    db,
                    "equipos",
                    equipo.id
                ),
                {
                    totalJugadores:
                        totalActual,

                    actualizadoEn:
                        serverTimestamp()
                }
            );

            equipo.totalJugadores =
                totalActual;
        }
    }

    await registrarAuditoria({
        usuarioId:
            obtenerUsuarioId(),

        usuarioNombre:
            obtenerNombreUsuario(),

        usuarioRol:
            usuarioActual.rol ||
            "admin",

        modulo:
            "CONFIGURACIÓN - JUGADORES",

        accion:
            "JUGADOR ELIMINADO",

        descripcion:
            `Se eliminó al jugador ${nombre}.`,

        entidadTipo:
            "jugador",

        entidadId:
            jugador.id,

        entidadNombre:
            nombre
    });

    renderizarJugadores();

    renderizarEquipos();

    renderizarPlantillas();

    mostrarToast(
        "exito",
        "Jugador eliminado",
        `${nombre} fue eliminado correctamente.`
    );
}

function solicitarEliminarEquipo(
    equipo
) {
    const jugadoresEquipo =
        jugadores.filter(
            jugador =>
                jugador.equipoId ===
                equipo.id
        ).length;

    abrirConfirmacion({
        titulo:
            "Eliminar equipo",

        texto:
            `Estás a punto de eliminar "${equipo.nombre || "este equipo"}".`,

        advertencia:
            jugadoresEquipo > 0
                ? `Este equipo tiene ${jugadoresEquipo} jugador${jugadoresEquipo === 1 ? "" : "es"} asociado${jugadoresEquipo === 1 ? "" : "s"}. Por seguridad no podrá eliminarse mientras tenga jugadores relacionados.`
                : "Esta acción eliminará el equipo de la base de datos y no se puede deshacer.",

        requiereTexto:
            true,

        textoRequerido:
            "ELIMINAR",

        tipoBoton:
            "peligro",

        accion:
            () =>
                eliminarEquipo(
                    equipo
                )
    });
}

async function eliminarEquipo(
    equipo
) {
    const jugadoresEquipo =
        jugadores.filter(
            jugador =>
                jugador.equipoId ===
                equipo.id
        );

    if (jugadoresEquipo.length) {
        throw new Error(
            "No se puede eliminar un equipo que todavía tiene jugadores asociados."
        );
    }

    await deleteDoc(
        doc(
            db,
            "equipos",
            equipo.id
        )
    );

    equipos =
        equipos.filter(
            elemento =>
                elemento.id !==
                equipo.id
        );

    await registrarAuditoria({
        usuarioId:
            obtenerUsuarioId(),

        usuarioNombre:
            obtenerNombreUsuario(),

        usuarioRol:
            usuarioActual.rol ||
            "admin",

        modulo:
            "CONFIGURACIÓN - EQUIPOS",

        accion:
            "EQUIPO ELIMINADO",

        descripcion:
            `Se eliminó el equipo ${equipo.nombre || equipo.id}.`,

        entidadTipo:
            "equipo",

        entidadId:
            equipo.id,

        entidadNombre:
            equipo.nombre ||
            "Equipo"
    });

    renderizarEquipos();

    renderizarCategorias();

    renderizarJugadores();

    renderizarPlantillas();

    renderizarMovimientosJ5();

    mostrarToast(
        "exito",
        "Equipo eliminado",
        "El equipo fue eliminado correctamente."
    );
}

function solicitarEliminarCategoria(
    categoria
) {
    const equiposCategoria =
        equipos.filter(
            equipo =>
                equipo.categoriaId ===
                categoria.id
        );

    abrirConfirmacion({
        titulo:
            "Eliminar categoría",

        texto:
            `Estás a punto de eliminar "${categoria.nombre || "esta categoría"}".`,

        advertencia:
            equiposCategoria.length
                ? `Esta categoría contiene ${equiposCategoria.length} equipo${equiposCategoria.length === 1 ? "" : "s"}. Primero debes eliminar o mover esos equipos.`
                : "Esta acción eliminará la categoría de la base de datos y no se puede deshacer.",

        requiereTexto:
            true,

        textoRequerido:
            "ELIMINAR",

        tipoBoton:
            "peligro",

        accion:
            () =>
                eliminarCategoria(
                    categoria
                )
    });
}

async function eliminarCategoria(
    categoria
) {
    const equiposCategoria =
        equipos.filter(
            equipo =>
                equipo.categoriaId ===
                categoria.id
        );

    if (equiposCategoria.length) {
        throw new Error(
            "No se puede eliminar una categoría que todavía contiene equipos."
        );
    }

    await deleteDoc(
        doc(
            db,
            "categorias",
            categoria.id
        )
    );

    categorias =
        categorias.filter(
            elemento =>
                elemento.id !==
                categoria.id
        );

    await registrarAuditoria({
        usuarioId:
            obtenerUsuarioId(),

        usuarioNombre:
            obtenerNombreUsuario(),

        usuarioRol:
            usuarioActual.rol ||
            "admin",

        modulo:
            "CONFIGURACIÓN - CATEGORÍAS",

        accion:
            "CATEGORÍA ELIMINADA",

        descripcion:
            `Se eliminó la categoría ${categoria.nombre || categoria.id}.`,

        entidadTipo:
            "categoria",

        entidadId:
            categoria.id,

        entidadNombre:
            categoria.nombre ||
            "Categoría"
    });

    renderizarCategorias();

    renderizarJugadores();

    mostrarToast(
        "exito",
        "Categoría eliminada",
        "La categoría fue eliminada correctamente."
    );
}

function abrirConfirmacion({
    titulo,
    texto,
    advertencia = "",
    requiereTexto = false,
    textoRequerido = "",
    tipoBoton = "normal",
    accion
}) {
    accionConfirmacion =
        accion;

    modalTitulo.textContent =
        titulo;

    modalTexto.textContent =
        texto;

    modalIcono.textContent =
        tipoBoton === "peligro"
            ? "!"
            : "✓";

    if (advertencia) {
        modalAdvertencia.textContent =
            advertencia;

        modalAdvertencia.classList.remove(
            "oculto"
        );
    } else {
        modalAdvertencia.classList.add(
            "oculto"
        );
    }

    if (requiereTexto) {
        textoConfirmacionRequerido.textContent =
            textoRequerido;

        inputConfirmacion.value =
            "";

        inputConfirmacion.dataset.requerido =
            textoRequerido;

        modalCampoConfirmacion.classList.remove(
            "oculto"
        );
    } else {
        inputConfirmacion.value =
            "";

        inputConfirmacion.dataset.requerido =
            "";

        modalCampoConfirmacion.classList.add(
            "oculto"
        );
    }

    btnConfirmarModal.textContent =
        tipoBoton === "peligro"
            ? "Confirmar"
            : "Continuar";

    modalConfirmacion.classList.remove(
        "oculto"
    );

    if (requiereTexto) {
        setTimeout(
            () =>
                inputConfirmacion.focus(),
            100
        );
    }
}

function cerrarModalConfirmacion() {
    modalConfirmacion.classList.add(
        "oculto"
    );

    accionConfirmacion =
        null;

    inputConfirmacion.value =
        "";

    inputConfirmacion.dataset.requerido =
        "";
}

async function ejecutarConfirmacion() {
    if (
        typeof accionConfirmacion !==
        "function"
    ) {
        cerrarModalConfirmacion();

        return;
    }

    const requerido =
        String(
            inputConfirmacion.dataset.requerido ||
            ""
        ).trim();

    if (
        requerido &&
        inputConfirmacion.value
            .trim()
            .toUpperCase() !==
            requerido.toUpperCase()
    ) {
        mostrarToast(
            "error",
            "Confirmación incorrecta",
            `Escribe ${requerido} para continuar.`
        );

        return;
    }

    const accion =
        accionConfirmacion;

    btnConfirmarModal.disabled =
        true;

    try {
        await accion();

        cerrarModalConfirmacion();

    } catch (error) {
        console.error(
            "Error ejecutando acción:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo completar",
            error.message ||
            "Ocurrió un problema al realizar la acción."
        );

    } finally {
        btnConfirmarModal.disabled =
            false;
    }
}

function cambiarSeccion(
    nombre
) {
    document
        .querySelectorAll(
            ".configuracion-nav-btn"
        )
        .forEach(
            boton => {
                boton.classList.toggle(
                    "activo",
                    boton.dataset.seccion ===
                        nombre
                );
            }
        );

    document
        .querySelectorAll(
            ".configuracion-seccion"
        )
        .forEach(
            seccion => {
                seccion.classList.toggle(
                    "activo",
                    seccion.dataset.seccionContenido ===
                        nombre
                );
            }
        );
}

function filtrarSolicitudes(
    lista,
    filtro
) {
    if (filtro === "todas") {
        return [
            ...lista
        ];
    }

    return lista.filter(
        solicitud =>
            obtenerEstadoSolicitud(
                solicitud
            ) ===
            filtro
    );
}

function obtenerEstadoSolicitud(
    solicitud
) {
    const estado =
        normalizarTexto(
            solicitud.estado ||
            "pendiente"
        );

    if (
        estado === "aprobado" ||
        estado === "aprobada" ||
        estado === "aceptado" ||
        estado === "aceptada"
    ) {
        return "aprobada";
    }

    if (
        estado === "rechazado" ||
        estado === "rechazada"
    ) {
        return "rechazada";
    }

    return "pendiente";
}

function ordenarSolicitudes(
    lista
) {
    return [
        ...lista
    ].sort(
        (a, b) =>
            obtenerTiempo(
                b.creadoEn ||
                b.fechaSolicitud
            ) -
            obtenerTiempo(
                a.creadoEn ||
                a.fechaSolicitud
            )
    );
}

function obtenerTiempo(
    valor
) {
    if (!valor) {
        return 0;
    }

    if (
        typeof valor.toDate ===
        "function"
    ) {
        return valor
            .toDate()
            .getTime();
    }

    const fecha =
        new Date(
            valor
        );

    const tiempo =
        fecha.getTime();

    return Number.isFinite(
        tiempo
    )
        ? tiempo
        : 0;
}

function obtenerLogoEquipo(
    equipo
) {
    return equipo.logoUrl ||
        equipo.logoURL ||
        equipo.logo ||
        equipo.escudoUrl ||
        equipo.escudoURL ||
        equipo.escudo ||
        equipo.imagenUrl ||
        equipo.imagen ||
        "";
}

function obtenerUsuarioId() {
    return usuarioActual.uid ||
        usuarioActual.id ||
        "";
}

function obtenerNombreUsuario() {
    return usuarioActual.nombre ||
        usuarioActual.nombreCompleto ||
        usuarioActual.email ||
        "Administrador";
}

function obtenerNumeroValido(
    valor,
    respaldo
) {
    const numero =
        Number(
            valor
        );

    if (
        Number.isFinite(
            numero
        ) &&
        numero > 0
    ) {
        return numero;
    }

    return respaldo;
}

function crearMensajeVacio(
    mensaje
) {
    return `
        <div class="lista-vacia">
            ${escaparHtml(mensaje)}
        </div>
    `;
}

function crearSolicitudVacia(
    titulo,
    texto
) {
    return `
        <div class="lista-vacia">

            <div class="lista-vacia-icono">
                ✓
            </div>

            <strong>
                ${escaparHtml(titulo)}
            </strong>

            <span>
                ${escaparHtml(texto)}
            </span>

        </div>
    `;
}

function obtenerInicial(
    texto
) {
    const valor =
        String(
            texto ||
            ""
        ).trim();

    if (!valor) {
        return "E";
    }

    return valor
        .charAt(0)
        .toUpperCase();
}

function normalizarTexto(
    valor
) {
    return String(
        valor ||
        ""
    )
        .trim()
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}

function escaparHtml(
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

function escaparAtributo(
    valor
) {
    return escaparHtml(
        valor
    );
}

function habilitarControles() {
    switchInscripciones.disabled =
        false;

    switchJornada5.disabled =
        false;

    maximoJugadores.disabled =
        false;

    maximoMovimientosJ5.disabled =
        false;

    btnGuardarMaximoJugadores.disabled =
        false;

    btnGuardarMaximoJ5.disabled =
        false;
}

function mostrarCarga() {
    estadoCarga.classList.remove(
        "oculto"
    );

    estadoError.classList.add(
        "oculto"
    );

    appConfiguracion.classList.add(
        "oculto"
    );
}

function mostrarAplicacion() {
    estadoCarga.classList.add(
        "oculto"
    );

    estadoError.classList.add(
        "oculto"
    );

    appConfiguracion.classList.remove(
        "oculto"
    );
}

function mostrarError(
    mensaje
) {
    estadoCarga.classList.add(
        "oculto"
    );

    appConfiguracion.classList.add(
        "oculto"
    );

    estadoErrorTexto.textContent =
        mensaje;

    estadoError.classList.remove(
        "oculto"
    );
}

function mostrarToast(
    tipo,
    titulo,
    texto
) {
    clearTimeout(
        toastTimer
    );

    toastTitulo.textContent =
        titulo;

    toastTexto.textContent =
        texto;

    if (tipo === "error") {
        toastIcono.textContent =
            "!";

        toast.style.background =
            "#fff3f2";

        toast.style.borderColor =
            "#f1cbc7";

        toastIcono.style.background =
            "#fee4e2";

        toastIcono.style.color =
            "#b42318";
    } else {
        toastIcono.textContent =
            "✓";

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