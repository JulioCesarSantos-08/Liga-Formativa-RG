import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";

const btnSolicitarPrestamo =
    document.getElementById(
        "btnSolicitarPrestamo"
    );

const modalPrestamo =
    document.getElementById(
        "modalPrestamo"
    );

const btnCerrarPrestamo =
    document.getElementById(
        "btnCerrarPrestamo"
    );

const btnCancelarPrestamo =
    document.getElementById(
        "btnCancelarPrestamo"
    );

const formPrestamo =
    document.getElementById(
        "formPrestamo"
    );

const equipoOrigenPrestamo =
    document.getElementById(
        "equipoOrigenPrestamo"
    );

const jugadorPrestamo =
    document.getElementById(
        "jugadorPrestamo"
    );

const motivoPrestamo =
    document.getElementById(
        "motivoPrestamo"
    );

const prestamoJugadorInfo =
    document.getElementById(
        "prestamoJugadorInfo"
    );

const prestamoValidacion =
    document.getElementById(
        "prestamoValidacion"
    );

const btnEnviarPrestamo =
    document.getElementById(
        "btnEnviarPrestamo"
    );

let usuarioActualPrestamos = null;
let equipoActualPrestamos = null;
let equiposAsignadosPrestamos = [];
let todosLosEquiposPrestamos = [];
let todosLosJugadoresPrestamos = [];
let categoriasPrestamos = [];
let solicitudesPrestamo = [];
let prestamosActivos = [];
let temporadaActualPrestamos = null;

let iniciadoPrestamos = false;
let enviandoPrestamo = false;
let ultimoEquipoPrestamosId = "";

const NIVELES_CATEGORIA = {
    "SUPER BEBE": 1,
    "DIENTES DE LECHE": 2,
    "PONY": 3,
    "INFANTIL": 4,
    "JUVENIL MENOR": 5,
    "JUVENIL MAYOR": 6
};

const usuarioPrestamos =
    await protegerPagina([
        "jefeEquipo",
        "admin"
    ]);

if (usuarioPrestamos) {
    usuarioActualPrestamos =
        usuarioPrestamos;

    try {
        await iniciarModuloPrestamos();
    } catch (error) {
        console.error(
            "Error iniciando módulo de préstamos:",
            error
        );
    }
}

window.LigaReforzamientos =
    window.LigaReforzamientos ||
    {};

window.LigaReforzamientos.abrir =
    async () => {
        await abrirModalPrestamo();
    };

async function iniciarModuloPrestamos() {
    if (iniciadoPrestamos) {
        return;
    }

    iniciadoPrestamos = true;

    activarEventosPrestamos();
    observarCambioEquipo();

    try {
        await cargarInformacionPrestamos();

        determinarEquiposAsignados();
        determinarEquipoActual();
    } catch (error) {
        console.error(
            "Error cargando información de préstamos:",
            error
        );
    }
}

async function cargarInformacionPrestamos() {
    await Promise.all([
        cargarEquipos(),
        cargarJugadores(),
        cargarCategorias(),
        cargarSolicitudesPrestamo(),
        cargarPrestamosActivos(),
        cargarTemporadaActual()
    ]);
}

async function cargarEquipos() {
    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );

    todosLosEquiposPrestamos =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
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

    todosLosJugadoresPrestamos =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );
}

async function cargarCategorias() {
    try {
        const snapshot =
            await getDocs(
                collection(
                    db,
                    "categorias"
                )
            );

        categoriasPrestamos =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );
    } catch (error) {
        console.warn(
            "No se pudieron cargar las categorías:",
            error
        );

        categoriasPrestamos = [];
    }
}

async function cargarSolicitudesPrestamo() {
    try {
        const snapshot =
            await getDocs(
                collection(
                    db,
                    "solicitudesPrestamo"
                )
            );

        solicitudesPrestamo =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );
    } catch (error) {
        console.warn(
            "No se pudieron cargar las solicitudes de préstamo:",
            error
        );

        solicitudesPrestamo = [];
    }
}

async function cargarPrestamosActivos() {
    try {
        const snapshot =
            await getDocs(
                collection(
                    db,
                    "prestamosJugadores"
                )
            );

        prestamosActivos =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );
    } catch (error) {
        prestamosActivos = [];
    }
}

async function cargarTemporadaActual() {
    try {
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

        temporadaActualPrestamos =
            temporadas.find(
                temporada =>
                    temporada.activa === true
            ) ||
            temporadas.find(
                temporada =>
                    normalizarTexto(
                        temporada.estado
                    ) === "activa"
            ) ||
            null;
    } catch (error) {
        temporadaActualPrestamos =
            null;
    }
}

function determinarEquiposAsignados() {
    if (
        usuarioActualPrestamos?.rol ===
        "admin"
    ) {
        equiposAsignadosPrestamos = [
            ...todosLosEquiposPrestamos
        ];

        return;
    }

    const usuarioId =
        obtenerUsuarioId();

    equiposAsignadosPrestamos =
        todosLosEquiposPrestamos.filter(
            equipo =>
                equipo.responsableId ===
                usuarioId
        );
}

function determinarEquipoActual() {
    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const equipoId =
        parametros.get(
            "equipo"
        );

    if (equipoId) {
        const encontrado =
            todosLosEquiposPrestamos.find(
                equipo =>
                    equipo.id === equipoId
            );

        if (
            encontrado &&
            puedeAdministrarEquipo(
                encontrado
            )
        ) {
            equipoActualPrestamos =
                encontrado;

            ultimoEquipoPrestamosId =
                encontrado.id;

            return;
        }
    }

    equipoActualPrestamos =
        equiposAsignadosPrestamos[0] ||
        null;

    ultimoEquipoPrestamosId =
        equipoActualPrestamos?.id ||
        "";
}

function puedeAdministrarEquipo(
    equipo
) {
    if (!equipo) {
        return false;
    }

    if (
        usuarioActualPrestamos?.rol ===
        "admin"
    ) {
        return true;
    }

    return (
        equipo.responsableId ===
        obtenerUsuarioId()
    );
}

function activarEventosPrestamos() {
    btnSolicitarPrestamo?.addEventListener(
        "click",
        abrirModalPrestamo
    );

    btnCerrarPrestamo?.addEventListener(
        "click",
        cerrarModalPrestamo
    );

    btnCancelarPrestamo?.addEventListener(
        "click",
        cerrarModalPrestamo
    );

    modalPrestamo?.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                modalPrestamo
            ) {
                cerrarModalPrestamo();
            }
        }
    );

    equipoOrigenPrestamo?.addEventListener(
        "change",
        cargarJugadoresPrestamo
    );

    jugadorPrestamo?.addEventListener(
        "change",
        validarJugadorSeleccionado
    );

    formPrestamo?.addEventListener(
        "submit",
        enviarSolicitudPrestamo
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modalPrestamo &&
                !modalPrestamo.classList.contains(
                    "oculto"
                )
            ) {
                cerrarModalPrestamo();
            }
        }
    );
}

async function abrirModalPrestamo() {
    await sincronizarEquipoActual();

    if (!equipoActualPrestamos) {
        mostrarToastPrestamos(
            "error",
            "Equipo no disponible",
            "No encontramos el equipo que estás administrando."
        );

        return;
    }

    if (
        !obtenerClubIdEquipo(
            equipoActualPrestamos
        )
    ) {
        mostrarToastPrestamos(
            "error",
            "Club sin configurar",
            "Este equipo todavía no tiene configurado su Club / Comunidad."
        );

        return;
    }

    const nivelDestino =
        obtenerNivelCategoriaEquipo(
            equipoActualPrestamos
        );

    if (nivelDestino === null) {
        mostrarToastPrestamos(
            "error",
            "Categoría no reconocida",
            "No pudimos identificar la categoría del equipo."
        );

        return;
    }

    limpiarFormularioPrestamo();

    await Promise.all([
        cargarEquipos(),
        cargarJugadores(),
        cargarSolicitudesPrestamo(),
        cargarPrestamosActivos()
    ]);

    determinarEquiposAsignados();

    const equipoRecargado =
        todosLosEquiposPrestamos.find(
            equipo =>
                equipo.id ===
                equipoActualPrestamos.id
        );

    if (equipoRecargado) {
        equipoActualPrestamos =
            equipoRecargado;
    }

    cargarEquiposElegibles();

    modalPrestamo?.classList.remove(
        "oculto"
    );

    document.body.style.overflow =
        "hidden";
}

function limpiarFormularioPrestamo() {
    formPrestamo?.reset();

    if (equipoOrigenPrestamo) {
        equipoOrigenPrestamo.innerHTML = `
            <option value="">
                Selecciona un equipo
            </option>
        `;
    }

    if (jugadorPrestamo) {
        jugadorPrestamo.innerHTML = `
            <option value="">
                Primero selecciona el equipo
            </option>
        `;

        jugadorPrestamo.disabled =
            true;
    }

    if (prestamoJugadorInfo) {
        prestamoJugadorInfo.innerHTML =
            "";

        prestamoJugadorInfo.classList.add(
            "oculto"
        );
    }

    ocultarValidacion();
}

function cargarEquiposElegibles() {
    if (!equipoOrigenPrestamo) {
        return;
    }

    equipoOrigenPrestamo.innerHTML = `
        <option value="">
            Selecciona un equipo
        </option>
    `;

    const elegibles =
        obtenerEquiposPrestamoElegibles();

    elegibles.forEach(
        equipo => {
            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                equipo.id;

            opcion.textContent =
                `${equipo.nombre || "Equipo"} — ${obtenerNombreCategoriaEquipo(equipo)}`;

            equipoOrigenPrestamo.appendChild(
                opcion
            );
        }
    );

    if (!elegibles.length) {
        const nivelDestino =
            obtenerNivelCategoriaEquipo(
                equipoActualPrestamos
            );

        if (nivelDestino === 1) {
            mostrarValidacion(
                false,
                "Super Bebé es la categoría inferior de la liga, por lo que no puede recibir jugadores a préstamo de otra categoría."
            );

            return;
        }

        mostrarValidacion(
            false,
            "No encontramos un equipo del mismo Club / Comunidad en la categoría inmediatamente inferior."
        );

        return;
    }

    mostrarValidacion(
        true,
        elegibles.length === 1
            ? "Encontramos 1 equipo compatible para solicitar jugadores a préstamo."
            : `Encontramos ${elegibles.length} equipos compatibles para solicitar jugadores a préstamo.`
    );
}

function obtenerEquiposPrestamoElegibles() {
    if (!equipoActualPrestamos) {
        return [];
    }

    const clubDestino =
        obtenerClubIdEquipo(
            equipoActualPrestamos
        );

    const nivelDestino =
        obtenerNivelCategoriaEquipo(
            equipoActualPrestamos
        );

    if (
        !clubDestino ||
        nivelDestino === null
    ) {
        return [];
    }

    const nivelOrigenPermitido =
        nivelDestino - 1;

    if (
        nivelOrigenPermitido < 1
    ) {
        return [];
    }

    return todosLosEquiposPrestamos
        .filter(
            equipo => {
                if (
                    !equipo ||
                    equipo.id ===
                        equipoActualPrestamos.id
                ) {
                    return false;
                }

                if (
                    !equipoEstaActivo(
                        equipo
                    )
                ) {
                    return false;
                }

                const clubOrigen =
                    obtenerClubIdEquipo(
                        equipo
                    );

                const nivelOrigen =
                    obtenerNivelCategoriaEquipo(
                        equipo
                    );

                return (
                    clubOrigen ===
                        clubDestino &&
                    nivelOrigen ===
                        nivelOrigenPermitido
                );
            }
        )
        .sort(
            (a, b) =>
                String(
                    a.nombre || ""
                ).localeCompare(
                    String(
                        b.nombre || ""
                    ),
                    "es"
                )
        );
}

function equipoEstaActivo(
    equipo
) {
    if (!equipo) {
        return false;
    }

    if (
        equipo.activo === false ||
        equipo.descalificado === true
    ) {
        return false;
    }

    const estado =
        normalizarTexto(
            equipo.estado
        );

    return (
        estado !== "inactivo" &&
        estado !== "descalificado"
    );
}

function obtenerClubIdEquipo(
    equipo
) {
    if (!equipo) {
        return "";
    }

    const clubId =
        String(
            equipo.clubId ||
            ""
        )
            .trim()
            .toLowerCase();

    if (clubId) {
        return clubId;
    }

    return crearIdClub(
        equipo.clubNombre ||
        ""
    );
}

function crearIdClub(
    valor
) {
    return String(
        valor || ""
    )
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );
}

function obtenerNivelCategoriaEquipo(
    equipo
) {
    if (!equipo) {
        return null;
    }

    const categoria =
        categoriasPrestamos.find(
            item =>
                item.id ===
                equipo.categoriaId
        );

    const nombre =
        normalizarCategoria(
            categoria?.nombre ||
            equipo.categoriaNombre ||
            ""
        );

    return (
        NIVELES_CATEGORIA[nombre] ??
        null
    );
}

function obtenerNombreCategoriaEquipo(
    equipo
) {
    if (!equipo) {
        return "Sin categoría";
    }

    const categoria =
        categoriasPrestamos.find(
            item =>
                item.id ===
                equipo.categoriaId
        );

    return (
        categoria?.nombre ||
        equipo.categoriaNombre ||
        "Sin categoría"
    );
}

function normalizarCategoria(
    valor
) {
    return String(
        valor || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .toUpperCase();
}

function cargarJugadoresPrestamo() {
    if (
        !equipoOrigenPrestamo ||
        !jugadorPrestamo
    ) {
        return;
    }

    const equipoOrigenId =
        equipoOrigenPrestamo.value;

    jugadorPrestamo.innerHTML = `
        <option value="">
            Selecciona un jugador
        </option>
    `;

    jugadorPrestamo.disabled =
        true;

    if (prestamoJugadorInfo) {
        prestamoJugadorInfo.innerHTML =
            "";

        prestamoJugadorInfo.classList.add(
            "oculto"
        );
    }

    ocultarValidacion();

    if (!equipoOrigenId) {
        jugadorPrestamo.innerHTML = `
            <option value="">
                Primero selecciona el equipo
            </option>
        `;

        return;
    }

    const equipoOrigen =
        todosLosEquiposPrestamos.find(
            equipo =>
                equipo.id ===
                equipoOrigenId
        );

    if (!equipoOrigen) {
        mostrarValidacion(
            false,
            "No encontramos el equipo seleccionado."
        );

        return;
    }

    const validacionEquipo =
        validarRelacionEquipos(
            equipoOrigen,
            equipoActualPrestamos
        );

    if (!validacionEquipo.valido) {
        mostrarValidacion(
            false,
            validacionEquipo.mensaje
        );

        return;
    }

    const jugadoresActivos =
        todosLosJugadoresPrestamos
            .filter(
                jugador =>
                    jugador.equipoId ===
                        equipoOrigenId &&
                    jugador.activo !== false
            )
            .sort(
                ordenarJugadores
            );

    const disponibles =
        jugadoresActivos.filter(
            jugador =>
                jugadorDisponiblePrestamo(
                    jugador,
                    equipoActualPrestamos
                )
        );

    disponibles.forEach(
        jugador => {
            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                jugador.id;

            const numero =
                jugador.numero !== null &&
                jugador.numero !== undefined &&
                jugador.numero !== ""
                    ? ` #${jugador.numero}`
                    : "";

            opcion.textContent =
                `${
                    jugador.nombre ||
                    jugador.nombreCompleto ||
                    "Jugador"
                }${numero}`;

            jugadorPrestamo.appendChild(
                opcion
            );
        }
    );

    jugadorPrestamo.disabled =
        disponibles.length === 0;

    if (!jugadoresActivos.length) {
        mostrarValidacion(
            false,
            "Este equipo no tiene jugadores activos registrados."
        );

        return;
    }

    if (!disponibles.length) {
        mostrarValidacion(
            false,
            "No hay jugadores disponibles para una nueva solicitud hacia este equipo."
        );

        return;
    }

    const noDisponibles =
        jugadoresActivos.length -
        disponibles.length;

    if (noDisponibles > 0) {
        mostrarValidacion(
            true,
            `${disponibles.length} jugadores disponibles. ${noDisponibles} no aparecen porque ya tienen una solicitud pendiente o un préstamo activo hacia este equipo.`
        );

        return;
    }

    mostrarValidacion(
        true,
        `${disponibles.length} ${
            disponibles.length === 1
                ? "jugador disponible"
                : "jugadores disponibles"
        }.`
    );
}

function jugadorDisponiblePrestamo(
    jugador,
    equipoDestino
) {
    if (
        !jugador ||
        !equipoDestino
    ) {
        return false;
    }

    const solicitudPendiente =
        solicitudesPrestamo.some(
            solicitud =>
                solicitud.jugadorId ===
                    jugador.id &&
                obtenerEquipoDestinoIdSolicitud(
                    solicitud
                ) ===
                    equipoDestino.id &&
                obtenerEstadoSolicitud(
                    solicitud
                ) ===
                    "pendiente"
        );

    if (solicitudPendiente) {
        return false;
    }

    const prestamoActivo =
        prestamosActivos.some(
            prestamo =>
                prestamo.jugadorId ===
                    jugador.id &&
                obtenerEquipoDestinoIdPrestamo(
                    prestamo
                ) ===
                    equipoDestino.id &&
                prestamoEstaActivo(
                    prestamo
                )
        );

    return !prestamoActivo;
}

function obtenerEquipoDestinoIdSolicitud(
    solicitud
) {
    return (
        solicitud?.equipoDestinoId ||
        solicitud?.equipoId ||
        ""
    );
}

function obtenerEquipoDestinoIdPrestamo(
    prestamo
) {
    return (
        prestamo?.equipoDestinoId ||
        prestamo?.equipoId ||
        ""
    );
}

function prestamoEstaActivo(
    prestamo
) {
    if (!prestamo) {
        return false;
    }

    if (
        prestamo.activo === false
    ) {
        return false;
    }

    const estado =
        normalizarTexto(
            prestamo.estado
        );

    if (
        estado === "finalizado" ||
        estado === "cancelado" ||
        estado === "cancelada" ||
        estado === "rechazado" ||
        estado === "rechazada" ||
        estado === "inactivo"
    ) {
        return false;
    }

    return true;
}

function validarJugadorSeleccionado() {
    const jugador =
        todosLosJugadoresPrestamos.find(
            item =>
                item.id ===
                jugadorPrestamo?.value
        );

    if (!jugador) {
        if (prestamoJugadorInfo) {
            prestamoJugadorInfo.innerHTML =
                "";

            prestamoJugadorInfo.classList.add(
                "oculto"
            );
        }

        ocultarValidacion();

        return false;
    }

    const equipoOrigen =
        todosLosEquiposPrestamos.find(
            equipo =>
                equipo.id ===
                jugador.equipoId
        );

    const validacion =
        validarPrestamo(
            equipoOrigen,
            equipoActualPrestamos,
            jugador
        );

    if (prestamoJugadorInfo) {
        prestamoJugadorInfo.innerHTML = `
            <strong>
                ${escaparHTML(
                    jugador.nombre ||
                    jugador.nombreCompleto ||
                    "Jugador"
                )}
            </strong>

            <p>
                Equipo actual:
                ${escaparHTML(
                    equipoOrigen?.nombre ||
                    "Sin equipo"
                )}
                ·
                ${escaparHTML(
                    obtenerNombreCategoriaEquipo(
                        equipoOrigen
                    )
                )}
            </p>
        `;

        prestamoJugadorInfo.classList.remove(
            "oculto"
        );
    }

    mostrarValidacion(
        validacion.valido,
        validacion.mensaje
    );

    return validacion.valido;
}

function validarRelacionEquipos(
    origen,
    destino
) {
    if (
        !origen ||
        !destino
    ) {
        return {
            valido: false,
            mensaje:
                "No se pudo validar la información de los equipos."
        };
    }

    if (
        origen.id ===
        destino.id
    ) {
        return {
            valido: false,
            mensaje:
                "El equipo de origen y destino no pueden ser el mismo."
        };
    }

    const clubOrigen =
        obtenerClubIdEquipo(
            origen
        );

    const clubDestino =
        obtenerClubIdEquipo(
            destino
        );

    if (
        !clubOrigen ||
        !clubDestino
    ) {
        return {
            valido: false,
            mensaje:
                "Los dos equipos necesitan tener configurado su Club / Comunidad."
        };
    }

    if (
        clubOrigen !==
        clubDestino
    ) {
        return {
            valido: false,
            mensaje:
                "El préstamo solo se permite entre equipos del mismo Club / Comunidad."
        };
    }

    const nivelOrigen =
        obtenerNivelCategoriaEquipo(
            origen
        );

    const nivelDestino =
        obtenerNivelCategoriaEquipo(
            destino
        );

    if (
        nivelOrigen === null ||
        nivelDestino === null
    ) {
        return {
            valido: false,
            mensaje:
                "No pudimos identificar correctamente las categorías de los equipos."
        };
    }

    if (
        nivelDestino -
        nivelOrigen !==
        1
    ) {
        return {
            valido: false,
            mensaje:
                "El préstamo solo se permite de una categoría hacia la categoría inmediatamente superior."
        };
    }

    return {
        valido: true,
        mensaje:
            "Los equipos cumplen las reglas de préstamo."
    };
}

function validarPrestamo(
    origen,
    destino,
    jugador
) {
    if (
        !origen ||
        !destino ||
        !jugador
    ) {
        return {
            valido: false,
            mensaje:
                "No se pudo validar la información del préstamo."
        };
    }

    const relacion =
        validarRelacionEquipos(
            origen,
            destino
        );

    if (!relacion.valido) {
        return relacion;
    }

    if (
        jugador.activo === false
    ) {
        return {
            valido: false,
            mensaje:
                "El jugador seleccionado no se encuentra activo."
        };
    }

    if (
        jugador.equipoId !==
        origen.id
    ) {
        return {
            valido: false,
            mensaje:
                "El jugador no pertenece al equipo de origen seleccionado."
        };
    }

    const solicitudPendiente =
        solicitudesPrestamo.some(
            solicitud =>
                solicitud.jugadorId ===
                    jugador.id &&
                obtenerEquipoDestinoIdSolicitud(
                    solicitud
                ) ===
                    destino.id &&
                obtenerEstadoSolicitud(
                    solicitud
                ) ===
                    "pendiente"
        );

    if (solicitudPendiente) {
        return {
            valido: false,
            mensaje:
                "Ya existe una solicitud pendiente para este jugador hacia este equipo."
        };
    }

    const prestamoActivo =
        prestamosActivos.some(
            prestamo =>
                prestamo.jugadorId ===
                    jugador.id &&
                obtenerEquipoDestinoIdPrestamo(
                    prestamo
                ) ===
                    destino.id &&
                prestamoEstaActivo(
                    prestamo
                )
        );

    if (prestamoActivo) {
        return {
            valido: false,
            mensaje:
                "Este jugador ya tiene un préstamo activo hacia este equipo."
        };
    }

    return {
        valido: true,
        mensaje:
            "El jugador cumple las reglas. La solicitud quedará pendiente de aprobación administrativa."
    };
}

async function enviarSolicitudPrestamo(
    event
) {
    event.preventDefault();

    if (enviandoPrestamo) {
        return;
    }

    await sincronizarEquipoActual();

    const equipoOrigen =
        todosLosEquiposPrestamos.find(
            equipo =>
                equipo.id ===
                equipoOrigenPrestamo?.value
        );

    const jugador =
        todosLosJugadoresPrestamos.find(
            item =>
                item.id ===
                jugadorPrestamo?.value
        );

    if (
        !equipoActualPrestamos ||
        !equipoOrigen ||
        !jugador
    ) {
        mostrarToastPrestamos(
            "error",
            "Información incompleta",
            "Selecciona el equipo de origen y el jugador."
        );

        return;
    }

    const validacion =
        validarPrestamo(
            equipoOrigen,
            equipoActualPrestamos,
            jugador
        );

    if (!validacion.valido) {
        mostrarValidacion(
            false,
            validacion.mensaje
        );

        return;
    }

    const motivo =
        String(
            motivoPrestamo?.value ||
            ""
        )
            .trim()
            .replace(
                /\s+/g,
                " "
            );

    if (!motivo) {
        mostrarToastPrestamos(
            "error",
            "Motivo requerido",
            "Explica por qué solicitas el préstamo."
        );

        motivoPrestamo?.focus();

        return;
    }

    enviandoPrestamo = true;

    if (btnEnviarPrestamo) {
        btnEnviarPrestamo.disabled =
            true;

        btnEnviarPrestamo.textContent =
            "Enviando...";
    }

    try {
        await cargarSolicitudesPrestamo();
        await cargarPrestamosActivos();

        const validacionFinal =
            validarPrestamo(
                equipoOrigen,
                equipoActualPrestamos,
                jugador
            );

        if (!validacionFinal.valido) {
            mostrarValidacion(
                false,
                validacionFinal.mensaje
            );

            return;
        }

        const clubId =
            obtenerClubIdEquipo(
                equipoActualPrestamos
            );

        const clubNombre =
            equipoActualPrestamos.clubNombre ||
            equipoOrigen.clubNombre ||
            "";

        const nivelOrigen =
            obtenerNivelCategoriaEquipo(
                equipoOrigen
            );

        const nivelDestino =
            obtenerNivelCategoriaEquipo(
                equipoActualPrestamos
            );

        const documento =
            await addDoc(
                collection(
                    db,
                    "solicitudesPrestamo"
                ),
                {
                    jugadorId:
                        jugador.id,

                    jugadorNombre:
                        jugador.nombre ||
                        jugador.nombreCompleto ||
                        "Jugador",

                    nombreJugador:
                        jugador.nombre ||
                        jugador.nombreCompleto ||
                        "Jugador",

                    equipoOrigenId:
                        equipoOrigen.id,

                    equipoOrigenNombre:
                        equipoOrigen.nombre ||
                        "",

                    categoriaOrigenId:
                        equipoOrigen.categoriaId ||
                        "",

                    categoriaOrigenNombre:
                        obtenerNombreCategoriaEquipo(
                            equipoOrigen
                        ),

                    equipoDestinoId:
                        equipoActualPrestamos.id,

                    equipoDestinoNombre:
                        equipoActualPrestamos.nombre ||
                        "",

                    equipoId:
                        equipoActualPrestamos.id,

                    equipoNombre:
                        equipoActualPrestamos.nombre ||
                        "",

                    categoriaDestinoId:
                        equipoActualPrestamos.categoriaId ||
                        "",

                    categoriaDestinoNombre:
                        obtenerNombreCategoriaEquipo(
                            equipoActualPrestamos
                        ),

                    clubId,

                    clubNombre,

                    clubOrigenId:
                        obtenerClubIdEquipo(
                            equipoOrigen
                        ),

                    clubOrigenNombre:
                        equipoOrigen.clubNombre ||
                        clubNombre,

                    clubDestinoId:
                        clubId,

                    clubDestinoNombre:
                        equipoActualPrestamos.clubNombre ||
                        clubNombre,

                    nivelCategoriaOrigen:
                        nivelOrigen,

                    nivelCategoriaDestino:
                        nivelDestino,

                    temporadaId:
                        temporadaActualPrestamos?.id ||
                        "",

                    temporadaNombre:
                        temporadaActualPrestamos?.nombre ||
                        "",

                    motivo,

                    estado:
                        "pendiente",

                    activo:
                        false,

                    solicitanteId:
                        obtenerUsuarioId(),

                    solicitanteNombre:
                        obtenerNombreUsuario(),

                    usuarioNombre:
                        obtenerNombreUsuario(),

                    creadoPor:
                        obtenerUsuarioId(),

                    creadoPorNombre:
                        obtenerNombreUsuario(),

                    creadoEn:
                        serverTimestamp(),

                    actualizadoEn:
                        serverTimestamp()
                }
            );

        solicitudesPrestamo.push({
            id:
                documento.id,

            jugadorId:
                jugador.id,

            jugadorNombre:
                jugador.nombre ||
                jugador.nombreCompleto ||
                "Jugador",

            equipoOrigenId:
                equipoOrigen.id,

            equipoOrigenNombre:
                equipoOrigen.nombre ||
                "",

            categoriaOrigenId:
                equipoOrigen.categoriaId ||
                "",

            categoriaOrigenNombre:
                obtenerNombreCategoriaEquipo(
                    equipoOrigen
                ),

            equipoDestinoId:
                equipoActualPrestamos.id,

            equipoDestinoNombre:
                equipoActualPrestamos.nombre ||
                "",

            categoriaDestinoId:
                equipoActualPrestamos.categoriaId ||
                "",

            categoriaDestinoNombre:
                obtenerNombreCategoriaEquipo(
                    equipoActualPrestamos
                ),

            clubId,

            clubNombre,

            nivelCategoriaOrigen:
                nivelOrigen,

            nivelCategoriaDestino:
                nivelDestino,

            temporadaId:
                temporadaActualPrestamos?.id ||
                "",

            motivo,

            estado:
                "pendiente",

            activo:
                false
        });

        cerrarModalPrestamo();

        mostrarToastPrestamos(
            "exito",
            "Solicitud enviada",
            "El préstamo quedó pendiente de aprobación administrativa."
        );
    } catch (error) {
        console.error(
            "Error enviando solicitud de préstamo:",
            error
        );

        mostrarToastPrestamos(
            "error",
            "No se pudo enviar",
            error?.message ||
            "Ocurrió un problema al registrar la solicitud."
        );
    } finally {
        enviandoPrestamo =
            false;

        if (btnEnviarPrestamo) {
            btnEnviarPrestamo.disabled =
                false;

            btnEnviarPrestamo.textContent =
                "Enviar solicitud";
        }
    }
}

function obtenerEstadoSolicitud(
    solicitud
) {
    return normalizarTexto(
        solicitud?.estado ||
        solicitud?.estatus ||
        "pendiente"
    );
}

function cerrarModalPrestamo() {
    modalPrestamo?.classList.add(
        "oculto"
    );

    document.body.style.overflow =
        "";
}

function mostrarValidacion(
    valido,
    mensaje
) {
    if (!prestamoValidacion) {
        return;
    }

    prestamoValidacion.textContent =
        mensaje;

    prestamoValidacion.className =
        `prestamo-validacion ${
            valido
                ? "valido"
                : "invalido"
        }`;
}

function ocultarValidacion() {
    if (!prestamoValidacion) {
        return;
    }

    prestamoValidacion.textContent =
        "";

    prestamoValidacion.className =
        "prestamo-validacion oculto";
}

async function sincronizarEquipoActual() {
    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const equipoId =
        parametros.get(
            "equipo"
        );

    if (!equipoId) {
        if (
            !equipoActualPrestamos &&
            equiposAsignadosPrestamos.length
        ) {
            equipoActualPrestamos =
                equiposAsignadosPrestamos[0];
        }

        return;
    }

    if (
        equipoActualPrestamos?.id ===
        equipoId
    ) {
        return;
    }

    const equipo =
        todosLosEquiposPrestamos.find(
            item =>
                item.id ===
                equipoId
        );

    if (
        equipo &&
        puedeAdministrarEquipo(
            equipo
        )
    ) {
        equipoActualPrestamos =
            equipo;

        ultimoEquipoPrestamosId =
            equipo.id;
    }
}

function observarCambioEquipo() {
    const sincronizar =
        async () => {
            const parametros =
                new URLSearchParams(
                    window.location.search
                );

            const equipoId =
                parametros.get(
                    "equipo"
                ) ||
                "";

            if (
                !equipoId ||
                equipoId ===
                    ultimoEquipoPrestamosId
            ) {
                return;
            }

            const equipo =
                todosLosEquiposPrestamos.find(
                    item =>
                        item.id ===
                        equipoId
                );

            if (
                !equipo ||
                !puedeAdministrarEquipo(
                    equipo
                )
            ) {
                return;
            }

            cerrarModalPrestamo();

            equipoActualPrestamos =
                equipo;

            ultimoEquipoPrestamosId =
                equipo.id;

            await Promise.all([
                cargarJugadores(),
                cargarSolicitudesPrestamo(),
                cargarPrestamosActivos()
            ]);
        };

    window.addEventListener(
        "popstate",
        sincronizar
    );

    setInterval(
        sincronizar,
        600
    );
}

function ordenarJugadores(
    a,
    b
) {
    const numeroA =
        Number(
            a.numero
        );

    const numeroB =
        Number(
            b.numero
        );

    if (
        Number.isFinite(numeroA) &&
        Number.isFinite(numeroB) &&
        numeroA !== numeroB
    ) {
        return numeroA - numeroB;
    }

    return String(
        a.nombre ||
        a.nombreCompleto ||
        ""
    ).localeCompare(
        String(
            b.nombre ||
            b.nombreCompleto ||
            ""
        ),
        "es"
    );
}

function obtenerUsuarioId() {
    return (
        usuarioActualPrestamos?.uid ||
        usuarioActualPrestamos?.id ||
        ""
    );
}

function obtenerNombreUsuario() {
    return (
        usuarioActualPrestamos?.nombre ||
        usuarioActualPrestamos?.nombreCompleto ||
        usuarioActualPrestamos?.email ||
        (
            usuarioActualPrestamos?.rol ===
            "admin"
                ? "Administrador"
                : "Jefe de equipo"
        )
    );
}

function normalizarTexto(
    valor
) {
    return String(
        valor ||
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();
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

function mostrarToastPrestamos(
    tipo,
    titulo,
    texto
) {
    const toast =
        document.getElementById(
            "toast"
        );

    const toastIcono =
        document.getElementById(
            "toastIcono"
        );

    const toastTitulo =
        document.getElementById(
            "toastTitulo"
        );

    const toastTexto =
        document.getElementById(
            "toastTexto"
        );

    if (
        !toast ||
        !toastTitulo ||
        !toastTexto
    ) {
        if (
            tipo === "error"
        ) {
            console.error(
                titulo,
                texto
            );
        } else {
            console.log(
                titulo,
                texto
            );
        }

        return;
    }

    if (toastIcono) {
        toastIcono.textContent =
            tipo === "exito"
                ? "✓"
                : "!";
    }

    toastTitulo.textContent =
        titulo;

    toastTexto.textContent =
        texto;

    toast.classList.remove(
        "exito",
        "error",
        "visible"
    );

    toast.classList.add(
        tipo === "exito"
            ? "exito"
            : "error"
    );

    requestAnimationFrame(
        () => {
            toast.classList.add(
                "visible"
            );
        }
    );

    setTimeout(
        () => {
            toast.classList.remove(
                "visible"
            );
        },
        4200
    );
}