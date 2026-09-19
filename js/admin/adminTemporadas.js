import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
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


const adminInicial =
    document.getElementById("adminInicial");

const btnNuevaTemporada =
    document.getElementById("btnNuevaTemporada");

const btnCrearPrimera =
    document.getElementById("btnCrearPrimera");

const buscarTemporada =
    document.getElementById("buscarTemporada");

const filtroEstado =
    document.getElementById("filtroEstado");

const totalTemporadas =
    document.getElementById("totalTemporadas");

const totalActivas =
    document.getElementById("totalActivas");

const totalProximas =
    document.getElementById("totalProximas");

const totalFinalizadas =
    document.getElementById("totalFinalizadas");

const bloqueTemporadaActual =
    document.getElementById("bloqueTemporadaActual");

const temporadaActualNombre =
    document.getElementById("temporadaActualNombre");

const temporadaActualFechas =
    document.getElementById("temporadaActualFechas");

const contadorResultados =
    document.getElementById("contadorResultados");

const estadoCarga =
    document.getElementById("estadoCarga");

const estadoVacio =
    document.getElementById("estadoVacio");

const listaTemporadas =
    document.getElementById("listaTemporadas");

const modalTemporada =
    document.getElementById("modalTemporada");

const modalTitulo =
    document.getElementById("modalTitulo");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCancelar =
    document.getElementById("btnCancelar");

const formTemporada =
    document.getElementById("formTemporada");

const temporadaNombre =
    document.getElementById("temporadaNombre");

const temporadaFechaInicio =
    document.getElementById("temporadaFechaInicio");

const temporadaFechaFin =
    document.getElementById("temporadaFechaFin");

const temporadaDescripcion =
    document.getElementById("temporadaDescripcion");

const contadorDescripcion =
    document.getElementById("contadorDescripcion");

const estadoOpciones =
    document.querySelectorAll(".estado-opcion");

const avisoTemporadaActiva =
    document.getElementById("avisoTemporadaActiva");

const btnGuardar =
    document.getElementById("btnGuardar");

const modalConfirmacion =
    document.getElementById("modalConfirmacion");

const textoConfirmacion =
    document.getElementById("textoConfirmacion");

const btnCancelarConfirmacion =
    document.getElementById("btnCancelarConfirmacion");

const btnConfirmarActivacion =
    document.getElementById("btnConfirmarActivacion");

const toast =
    document.getElementById("toast");

const toastIcono =
    document.getElementById("toastIcono");

const toastTitulo =
    document.getElementById("toastTitulo");

const toastTexto =
    document.getElementById("toastTexto");


let usuarioAdminActual = null;

let temporadas = [];

let temporadaSeleccionada = null;

let estadoSeleccionado = "proxima";

let datosPendientesActivacion = null;

let temporizadorToast = null;


iniciar();


async function iniciar() {

    try {

        usuarioAdminActual =
            await protegerPagina([
                "admin"
            ]);

        configurarAdministrador();

        activarEventos();

        await cargarTemporadas();

    } catch (error) {

        console.error(
            "Error iniciando temporadas:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo cargar",
            "Ocurrió un problema al iniciar el módulo de temporadas."
        );

    }

}


function configurarAdministrador() {

    if (
        !usuarioAdminActual ||
        !adminInicial
    ) {
        return;
    }

    const nombre =
        usuarioAdminActual.nombre ||
        usuarioAdminActual.nombreCompleto ||
        usuarioAdminActual.email ||
        "Administrador";

    adminInicial.textContent =
        nombre
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "A";

}


function activarEventos() {

    btnNuevaTemporada?.addEventListener(
        "click",
        abrirNuevaTemporada
    );

    btnCrearPrimera?.addEventListener(
        "click",
        abrirNuevaTemporada
    );

    btnCerrarModal?.addEventListener(
        "click",
        cerrarModal
    );

    btnCancelar?.addEventListener(
        "click",
        cerrarModal
    );

    modalTemporada
        ?.querySelector(".modal-overlay")
        ?.addEventListener(
            "click",
            cerrarModal
        );

    buscarTemporada?.addEventListener(
        "input",
        aplicarFiltros
    );

    filtroEstado?.addEventListener(
        "change",
        aplicarFiltros
    );

    temporadaDescripcion?.addEventListener(
        "input",
        actualizarContadorDescripcion
    );

    estadoOpciones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    seleccionarEstado(
                        boton.dataset.estado
                    );

                }
            );

        }
    );

    formTemporada?.addEventListener(
        "submit",
        guardarTemporada
    );

    listaTemporadas?.addEventListener(
        "click",
        manejarAccionListado
    );

    btnCancelarConfirmacion?.addEventListener(
        "click",
        cerrarConfirmacion
    );

    modalConfirmacion
        ?.querySelector(".modal-overlay")
        ?.addEventListener(
            "click",
            cerrarConfirmacion
        );

    btnConfirmarActivacion?.addEventListener(
        "click",
        confirmarActivacion
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
                modalConfirmacion &&
                !modalConfirmacion.classList.contains(
                    "oculto"
                )
            ) {

                cerrarConfirmacion();

                return;

            }

            if (
                modalTemporada &&
                !modalTemporada.classList.contains(
                    "oculto"
                )
            ) {

                cerrarModal();

            }

        }
    );

}


async function cargarTemporadas() {

    mostrarCarga();

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "temporadas"
                )
            );

        temporadas =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );

        ordenarTemporadas();

        actualizarResumen();

        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando temporadas:",
            error
        );

        temporadas = [];

        actualizarResumen();

        aplicarFiltros();

        mostrarToast(
            "error",
            "No se pudieron cargar",
            "Ocurrió un problema al consultar las temporadas."
        );

    }

}


function ordenarTemporadas() {

    const prioridad = {
        activa: 0,
        proxima: 1,
        finalizada: 2
    };

    temporadas.sort(
        (a, b) => {

            const estadoA =
                normalizarEstado(
                    a.estado
                );

            const estadoB =
                normalizarEstado(
                    b.estado
                );

            const prioridadA =
                prioridad[estadoA] ?? 9;

            const prioridadB =
                prioridad[estadoB] ?? 9;

            if (
                prioridadA !== prioridadB
            ) {

                return prioridadA - prioridadB;

            }

            const fechaA =
                obtenerTiempoFecha(
                    a.fechaInicio
                );

            const fechaB =
                obtenerTiempoFecha(
                    b.fechaInicio
                );

            return fechaB - fechaA;

        }
    );

}


function actualizarResumen() {

    const activas =
        temporadas.filter(
            temporada =>
                normalizarEstado(
                    temporada.estado
                ) === "activa"
        );

    const proximas =
        temporadas.filter(
            temporada =>
                normalizarEstado(
                    temporada.estado
                ) === "proxima"
        );

    const finalizadas =
        temporadas.filter(
            temporada =>
                normalizarEstado(
                    temporada.estado
                ) === "finalizada"
        );

    totalTemporadas.textContent =
        temporadas.length;

    totalActivas.textContent =
        activas.length;

    totalProximas.textContent =
        proximas.length;

    totalFinalizadas.textContent =
        finalizadas.length;

    const activa =
        activas[0];

    if (
        !activa
    ) {

        bloqueTemporadaActual.classList.add(
            "oculto"
        );

        return;

    }

    temporadaActualNombre.textContent =
        activa.nombre ||
        "Temporada activa";

    temporadaActualFechas.textContent =
        construirRangoFechas(
            activa.fechaInicio,
            activa.fechaFin
        );

    bloqueTemporadaActual.classList.remove(
        "oculto"
    );

}


function aplicarFiltros() {

    const busqueda =
        normalizarTexto(
            buscarTemporada?.value
        );

    const estado =
        filtroEstado?.value ||
        "todas";

    const resultados =
        temporadas.filter(
            temporada => {

                const coincideBusqueda =
                    !busqueda ||
                    normalizarTexto(
                        [
                            temporada.nombre,
                            temporada.descripcion,
                            temporada.fechaInicio,
                            temporada.fechaFin
                        ]
                            .filter(Boolean)
                            .join(" ")
                    ).includes(
                        busqueda
                    );

                const coincideEstado =
                    estado === "todas" ||
                    normalizarEstado(
                        temporada.estado
                    ) === estado;

                return (
                    coincideBusqueda &&
                    coincideEstado
                );

            }
        );

    renderizarTemporadas(
        resultados
    );

}


function renderizarTemporadas(
    resultados
) {

    estadoCarga.classList.add(
        "oculto"
    );

    contadorResultados.textContent =
        `${resultados.length} ${
            resultados.length === 1
                ? "temporada"
                : "temporadas"
        }`;

    if (
        !resultados.length
    ) {

        listaTemporadas.innerHTML =
            "";

        listaTemporadas.classList.add(
            "oculto"
        );

        estadoVacio.classList.remove(
            "oculto"
        );

        if (
            temporadas.length
        ) {

            estadoVacio.querySelector(
                "strong"
            ).textContent =
                "No hay resultados";

            estadoVacio.querySelector(
                "p"
            ).textContent =
                "No encontramos temporadas que coincidan con los filtros seleccionados.";

            btnCrearPrimera.classList.add(
                "oculto"
            );

        } else {

            estadoVacio.querySelector(
                "strong"
            ).textContent =
                "No hay temporadas registradas";

            estadoVacio.querySelector(
                "p"
            ).textContent =
                "Crea la primera temporada para comenzar a organizar los ciclos deportivos de la liga.";

            btnCrearPrimera.classList.remove(
                "oculto"
            );

        }

        return;

    }

    estadoVacio.classList.add(
        "oculto"
    );

    listaTemporadas.classList.remove(
        "oculto"
    );

    listaTemporadas.innerHTML =
        resultados
            .map(
                crearTarjetaTemporada
            )
            .join("");

}


function crearTarjetaTemporada(
    temporada
) {

    const estado =
        normalizarEstado(
            temporada.estado
        );

    const descripcion =
        temporada.descripcion
            ? escaparHTML(
                temporada.descripcion
            )
            : "Sin descripción registrada.";

    const botonActivar =
        estado !== "activa"
            ? `
                <button
                    type="button"
                    class="btn-activar"
                    data-accion="activar"
                    data-id="${temporada.id}"
                >
                    Activar
                </button>
            `
            : "";

    return `
        <article class="temporada-card ${estado}">
            <div class="temporada-card-icono">
                ${iconoEstado(estado)}
            </div>

            <div class="temporada-card-info">
                <div class="temporada-card-superior">
                    <h3>
                        ${escaparHTML(
                            temporada.nombre ||
                            "Temporada"
                        )}
                    </h3>

                    <span class="badge-estado ${estado}">
                        ${textoEstado(estado)}
                    </span>
                </div>

                <p class="temporada-card-fechas">
                    ${construirRangoFechas(
                        temporada.fechaInicio,
                        temporada.fechaFin
                    )}
                </p>

                <p class="temporada-card-descripcion">
                    ${descripcion}
                </p>
            </div>

            <div class="temporada-card-acciones">
                <button
                    type="button"
                    class="btn-editar"
                    data-accion="editar"
                    data-id="${temporada.id}"
                >
                    Editar
                </button>

                ${botonActivar}
            </div>
        </article>
    `;

}


function manejarAccionListado(
    event
) {

    const boton =
        event.target.closest(
            "[data-accion]"
        );

    if (
        !boton
    ) {
        return;
    }

    const id =
        boton.dataset.id;

    const accion =
        boton.dataset.accion;

    const temporada =
        temporadas.find(
            item =>
                item.id === id
        );

    if (
        !temporada
    ) {
        return;
    }

    if (
        accion === "editar"
    ) {

        abrirEditarTemporada(
            temporada
        );

        return;

    }

    if (
        accion === "activar"
    ) {

        solicitarActivacion(
            temporada
        );

    }

}


function abrirNuevaTemporada() {

    temporadaSeleccionada =
        null;

    formTemporada.reset();

    modalTitulo.textContent =
        "Nueva temporada";

    btnGuardar.textContent =
        "Guardar temporada";

    seleccionarEstado(
        "proxima"
    );

    actualizarContadorDescripcion();

    modalTemporada.classList.remove(
        "oculto"
    );

    setTimeout(
        () => {
            temporadaNombre.focus();
        },
        80
    );

}


function abrirEditarTemporada(
    temporada
) {

    temporadaSeleccionada =
        temporada;

    modalTitulo.textContent =
        "Editar temporada";

    btnGuardar.textContent =
        "Guardar cambios";

    temporadaNombre.value =
        temporada.nombre ||
        "";

    temporadaFechaInicio.value =
        temporada.fechaInicio ||
        "";

    temporadaFechaFin.value =
        temporada.fechaFin ||
        "";

    temporadaDescripcion.value =
        temporada.descripcion ||
        "";

    seleccionarEstado(
        normalizarEstado(
            temporada.estado
        )
    );

    actualizarContadorDescripcion();

    modalTemporada.classList.remove(
        "oculto"
    );

}


function cerrarModal() {

    modalTemporada.classList.add(
        "oculto"
    );

    formTemporada.reset();

    temporadaSeleccionada =
        null;

    seleccionarEstado(
        "proxima"
    );

    actualizarContadorDescripcion();

}


function seleccionarEstado(
    estado
) {

    estadoSeleccionado =
        normalizarEstado(
            estado
        );

    estadoOpciones.forEach(
        boton => {

            boton.classList.toggle(
                "seleccionado",
                boton.dataset.estado ===
                    estadoSeleccionado
            );

        }
    );

    avisoTemporadaActiva.classList.toggle(
        "oculto",
        estadoSeleccionado !==
            "activa"
    );

}


function actualizarContadorDescripcion() {

    contadorDescripcion.textContent =
        temporadaDescripcion.value.length;

}


async function guardarTemporada(
    event
) {

    event.preventDefault();

    const nombre =
        temporadaNombre.value
            .trim();

    const fechaInicio =
        temporadaFechaInicio.value;

    const fechaFin =
        temporadaFechaFin.value;

    const descripcion =
        temporadaDescripcion.value
            .trim();

    if (
        !nombre
    ) {

        mostrarToast(
            "error",
            "Nombre requerido",
            "Escribe el nombre de la temporada."
        );

        temporadaNombre.focus();

        return;

    }

    if (
        !fechaInicio ||
        !fechaFin
    ) {

        mostrarToast(
            "error",
            "Fechas requeridas",
            "Selecciona la fecha de inicio y finalización."
        );

        return;

    }

    if (
        fechaFin < fechaInicio
    ) {

        mostrarToast(
            "error",
            "Fechas incorrectas",
            "La fecha de finalización no puede ser anterior a la fecha de inicio."
        );

        return;

    }

    const datos = {
        nombre,
        fechaInicio,
        fechaFin,
        descripcion,
        estado:
            estadoSeleccionado,
        activa:
            estadoSeleccionado ===
            "activa",
        actualizadoEn:
            serverTimestamp()
    };

    if (
        estadoSeleccionado ===
        "activa"
    ) {

        datosPendientesActivacion = {
            tipo:
                temporadaSeleccionada
                    ? "editar"
                    : "crear",
            datos,
            temporada:
                temporadaSeleccionada
        };

        textoConfirmacion.textContent =
            `"${nombre}" se convertirá en la temporada vigente de la Liga Río Grande.`;

        modalConfirmacion.classList.remove(
            "oculto"
        );

        return;

    }

    await ejecutarGuardadoTemporada(
        datos
    );

}


async function ejecutarGuardadoTemporada(
    datos
) {

    btnGuardar.disabled =
        true;

    btnGuardar.textContent =
        "Guardando...";

    try {

        if (
            temporadaSeleccionada
        ) {

            await actualizarTemporada(
                temporadaSeleccionada,
                datos
            );

        } else {

            await crearTemporada(
                datos
            );

        }

        cerrarModal();

        await cargarTemporadas();

    } catch (error) {

        console.error(
            "Error guardando temporada:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al guardar la temporada."
        );

    } finally {

        btnGuardar.disabled =
            false;

        btnGuardar.textContent =
            temporadaSeleccionada
                ? "Guardar cambios"
                : "Guardar temporada";

    }

}


async function crearTemporada(
    datos
) {

    const referencia =
        await addDoc(
            collection(
                db,
                "temporadas"
            ),
            {
                ...datos,
                creadoEn:
                    serverTimestamp()
            }
        );

    await registrarAuditoria({
        usuarioId:
            usuarioAdminActual.uid,

        usuarioNombre:
            obtenerNombreAdministrador(),

        usuarioRol:
            usuarioAdminActual.rol ||
            "admin",

        modulo:
            "temporadas",

        accion:
            datos.estado === "activa"
                ? "temporada_activada"
                : "temporada_creada",

        descripcion:
            datos.estado === "activa"
                ? `Se creó y activó la temporada ${datos.nombre}.`
                : `Se creó la temporada ${datos.nombre} con estado ${textoEstado(datos.estado)}.`,

        entidadTipo:
            "temporada",

        entidadId:
            referencia.id,

        entidadNombre:
            datos.nombre
    });

    mostrarToast(
        "exito",
        "Temporada creada",
        "La temporada fue registrada correctamente."
    );

}


async function actualizarTemporada(
    temporada,
    datos
) {

    const anterior = {
        ...temporada
    };

    const cambios =
        obtenerCambios(
            anterior,
            datos
        );

    await updateDoc(
        doc(
            db,
            "temporadas",
            temporada.id
        ),
        datos
    );

    if (
        cambios.length
    ) {

        let accion =
            "temporada_actualizada";

        if (
            normalizarEstado(
                anterior.estado
            ) !==
            normalizarEstado(
                datos.estado
            )
        ) {

            if (
                datos.estado ===
                "activa"
            ) {

                accion =
                    "temporada_activada";

            } else if (
                datos.estado ===
                "finalizada"
            ) {

                accion =
                    "temporada_finalizada";

            } else {

                accion =
                    "temporada_programada";

            }

        }

        await registrarAuditoria({
            usuarioId:
                usuarioAdminActual.uid,

            usuarioNombre:
                obtenerNombreAdministrador(),

            usuarioRol:
                usuarioAdminActual.rol ||
                "admin",

            modulo:
                "temporadas",

            accion,

            descripcion:
                `Se actualizó la temporada ${datos.nombre}. Cambios: ${cambios.join(", ")}.`,

            entidadTipo:
                "temporada",

            entidadId:
                temporada.id,

            entidadNombre:
                datos.nombre
        });

    }

    mostrarToast(
        "exito",
        "Temporada actualizada",
        cambios.length
            ? "Los cambios fueron guardados correctamente."
            : "No se detectaron cambios en la temporada."
    );

}


function obtenerCambios(
    anterior,
    nuevo
) {

    const cambios = [];

    if (
        (anterior.nombre || "") !==
        nuevo.nombre
    ) {

        cambios.push(
            `nombre de "${anterior.nombre || "Sin nombre"}" a "${nuevo.nombre}"`
        );

    }

    if (
        (anterior.fechaInicio || "") !==
        nuevo.fechaInicio
    ) {

        cambios.push(
            "fecha de inicio"
        );

    }

    if (
        (anterior.fechaFin || "") !==
        nuevo.fechaFin
    ) {

        cambios.push(
            "fecha de finalización"
        );

    }

    if (
        (anterior.descripcion || "") !==
        nuevo.descripcion
    ) {

        cambios.push(
            "descripción"
        );

    }

    if (
        normalizarEstado(
            anterior.estado
        ) !==
        normalizarEstado(
            nuevo.estado
        )
    ) {

        cambios.push(
            `estado de ${textoEstado(anterior.estado)} a ${textoEstado(nuevo.estado)}`
        );

    }

    return cambios;

}


function solicitarActivacion(
    temporada
) {

    datosPendientesActivacion = {
        tipo:
            "activar",
        temporada
    };

    textoConfirmacion.textContent =
        `"${temporada.nombre || "Esta temporada"}" se convertirá en la temporada vigente de la Liga Río Grande.`;

    modalConfirmacion.classList.remove(
        "oculto"
    );

}


function cerrarConfirmacion() {

    modalConfirmacion.classList.add(
        "oculto"
    );

    datosPendientesActivacion =
        null;

    btnConfirmarActivacion.disabled =
        false;

    btnConfirmarActivacion.textContent =
        "Activar temporada";

}


async function confirmarActivacion() {

    if (
        !datosPendientesActivacion
    ) {
        return;
    }

    const pendiente =
        datosPendientesActivacion;

    btnConfirmarActivacion.disabled =
        true;

    btnConfirmarActivacion.textContent =
        "Activando...";

    try {

        if (
            pendiente.tipo ===
            "activar"
        ) {

            await activarTemporadaExistente(
                pendiente.temporada
            );

        } else {

            const datos = {
                ...pendiente.datos
            };

            if (
                pendiente.tipo ===
                "editar"
            ) {

                temporadaSeleccionada =
                    pendiente.temporada;

                await finalizarOtrasTemporadas(
                    pendiente.temporada.id
                );

                await actualizarTemporada(
                    pendiente.temporada,
                    datos
                );

            } else {

                await finalizarOtrasTemporadas(
                    null
                );

                await crearTemporada(
                    datos
                );

            }

        }

        modalConfirmacion.classList.add(
            "oculto"
        );

        datosPendientesActivacion =
            null;

        modalTemporada.classList.add(
            "oculto"
        );

        formTemporada.reset();

        temporadaSeleccionada =
            null;

        await cargarTemporadas();

    } catch (error) {

        console.error(
            "Error activando temporada:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo activar",
            "Ocurrió un problema al activar la temporada."
        );

    } finally {

        btnConfirmarActivacion.disabled =
            false;

        btnConfirmarActivacion.textContent =
            "Activar temporada";

    }

}


async function activarTemporadaExistente(
    temporada
) {

    if (
        normalizarEstado(
            temporada.estado
        ) === "activa"
    ) {
        return;
    }

    await finalizarOtrasTemporadas(
        temporada.id
    );

    await updateDoc(
        doc(
            db,
            "temporadas",
            temporada.id
        ),
        {
            estado:
                "activa",
            activa:
                true,
            actualizadoEn:
                serverTimestamp()
        }
    );

    await registrarAuditoria({
        usuarioId:
            usuarioAdminActual.uid,

        usuarioNombre:
            obtenerNombreAdministrador(),

        usuarioRol:
            usuarioAdminActual.rol ||
            "admin",

        modulo:
            "temporadas",

        accion:
            "temporada_activada",

        descripcion:
            `Se activó la temporada ${temporada.nombre || "Sin nombre"} como temporada vigente.`,

        entidadTipo:
            "temporada",

        entidadId:
            temporada.id,

        entidadNombre:
            temporada.nombre ||
            "Temporada"
    });

    mostrarToast(
        "exito",
        "Temporada activada",
        `${temporada.nombre || "La temporada"} ahora es la temporada vigente.`
    );

}


async function finalizarOtrasTemporadas(
    excluirId
) {

    const activas =
        temporadas.filter(
            temporada =>
                temporada.id !==
                    excluirId &&
                normalizarEstado(
                    temporada.estado
                ) === "activa"
        );

    if (
        !activas.length
    ) {
        return;
    }

    const batch =
        writeBatch(
            db
        );

    activas.forEach(
        temporada => {

            batch.update(
                doc(
                    db,
                    "temporadas",
                    temporada.id
                ),
                {
                    estado:
                        "finalizada",
                    activa:
                        false,
                    actualizadoEn:
                        serverTimestamp()
                }
            );

        }
    );

    await batch.commit();

    for (
        const temporada of activas
    ) {

        await registrarAuditoria({
            usuarioId:
                usuarioAdminActual.uid,

            usuarioNombre:
                obtenerNombreAdministrador(),

            usuarioRol:
                usuarioAdminActual.rol ||
                "admin",

            modulo:
                "temporadas",

            accion:
                "temporada_finalizada",

            descripcion:
                `La temporada ${temporada.nombre || "Sin nombre"} fue finalizada al activar una nueva temporada.`,

            entidadTipo:
                "temporada",

            entidadId:
                temporada.id,

            entidadNombre:
                temporada.nombre ||
                "Temporada"
        });

    }

}


function mostrarCarga() {

    estadoCarga.classList.remove(
        "oculto"
    );

    estadoVacio.classList.add(
        "oculto"
    );

    listaTemporadas.classList.add(
        "oculto"
    );

}


function construirRangoFechas(
    inicio,
    fin
) {

    if (
        !inicio &&
        !fin
    ) {

        return "Fechas no registradas";

    }

    if (
        inicio &&
        fin
    ) {

        return `${formatearFecha(inicio)} — ${formatearFecha(fin)}`;

    }

    if (
        inicio
    ) {

        return `Desde ${formatearFecha(inicio)}`;

    }

    return `Hasta ${formatearFecha(fin)}`;

}


function formatearFecha(
    valor
) {

    if (
        !valor
    ) {
        return "Sin fecha";
    }

    const partes =
        String(valor)
            .split("-");

    if (
        partes.length !== 3
    ) {
        return valor;
    }

    const fecha =
        new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return valor;
    }

    return fecha.toLocaleDateString(
        "es-MX",
        {
            day:
                "2-digit",
            month:
                "short",
            year:
                "numeric"
        }
    );

}


function obtenerTiempoFecha(
    valor
) {

    if (
        !valor
    ) {
        return 0;
    }

    const tiempo =
        new Date(
            `${valor}T00:00:00`
        ).getTime();

    return Number.isNaN(
        tiempo
    )
        ? 0
        : tiempo;

}


function normalizarEstado(
    estado
) {

    const valor =
        String(
            estado ||
            "proxima"
        )
            .trim()
            .toLowerCase();

    if (
        valor === "activa" ||
        valor === "activo" ||
        valor === "encurso" ||
        valor === "en curso"
    ) {

        return "activa";

    }

    if (
        valor === "finalizada" ||
        valor === "finalizado"
    ) {

        return "finalizada";

    }

    return "proxima";

}


function textoEstado(
    estado
) {

    switch (
        normalizarEstado(
            estado
        )
    ) {

        case "activa":
            return "Activa";

        case "finalizada":
            return "Finalizada";

        default:
            return "Próxima";

    }

}


function iconoEstado(
    estado
) {

    switch (
        normalizarEstado(
            estado
        )
    ) {

        case "activa":
            return "🏆";

        case "finalizada":
            return "✓";

        default:
            return "🗓️";

    }

}


function normalizarTexto(
    texto
) {

    return String(
        texto ||
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();

}


function obtenerNombreAdministrador() {

    return (
        usuarioAdminActual?.nombre ||
        usuarioAdminActual?.nombreCompleto ||
        usuarioAdminActual?.email ||
        "Administrador"
    );

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


function mostrarToast(
    tipo,
    titulo,
    texto
) {

    clearTimeout(
        temporizadorToast
    );

    toast.classList.remove(
        "oculto"
    );

    toastTitulo.textContent =
        titulo;

    toastTexto.textContent =
        texto;

    if (
        tipo === "error"
    ) {

        toastIcono.textContent =
            "!";

        toast.style.borderColor =
            "#dfb1a8";

        toast.style.background =
            "#fff1ee";

        toastIcono.style.color =
            "#a83f31";

        toastIcono.style.background =
            "#f4d4ce";

    } else {

        toastIcono.textContent =
            "✓";

        toast.style.borderColor =
            "#cbe7d5";

        toast.style.background =
            "#f0faf3";

        toastIcono.style.color =
            "#18794e";

        toastIcono.style.background =
            "#d9f2e1";

    }

    temporizadorToast =
        setTimeout(
            () => {

                toast.classList.add(
                    "oculto"
                );

            },
            4200
        );

}