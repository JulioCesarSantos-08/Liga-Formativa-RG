import {
    collection,
    doc,
    getDocs,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";
import { registrarAuditoria } from "../auditoria.js";

const totalAmarillas = document.getElementById("totalAmarillas");
const totalRojas = document.getElementById("totalRojas");
const totalSuspendidos = document.getElementById("totalSuspendidos");
const totalPartidosPendientes = document.getElementById("totalPartidosPendientes");
const contadorResultados = document.getElementById("contadorResultados");

const buscarJugador = document.getElementById("buscarJugador");
const btnLimpiarBusqueda = document.getElementById("btnLimpiarBusqueda");

const filtroCategoria = document.getElementById("filtroCategoria");
const filtroEquipo = document.getElementById("filtroEquipo");
const filtroDisciplina = document.getElementById("filtroDisciplina");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const btnRestablecerFiltros = document.getElementById("btnRestablecerFiltros");
const listaDisciplina = document.getElementById("listaDisciplina");

const modalDisciplina = document.getElementById("modalDisciplina");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");

const contenedorFotoJugador = document.getElementById("contenedorFotoJugador");
const modalJugadorInicial = document.getElementById("modalJugadorInicial");
const modalEstadoDisciplina = document.getElementById("modalEstadoDisciplina");
const modalJugadorNombre = document.getElementById("modalJugadorNombre");
const modalEquipoCategoria = document.getElementById("modalEquipoCategoria");

const modalAmarillas = document.getElementById("modalAmarillas");
const modalRojas = document.getElementById("modalRojas");
const modalSuspension = document.getElementById("modalSuspension");
const modalPartidosPendientes = document.getElementById("modalPartidosPendientes");

const modalNombreCompleto = document.getElementById("modalNombreCompleto");
const modalEquipo = document.getElementById("modalEquipo");
const modalCategoria = document.getElementById("modalCategoria");
const modalDorsal = document.getElementById("modalDorsal");
const modalEstadoJugador = document.getElementById("modalEstadoJugador");

const campoSuspendido = document.getElementById("campoSuspendido");
const campoPartidosSuspension = document.getElementById("campoPartidosSuspension");
const btnRestarPartido = document.getElementById("btnRestarPartido");
const btnSumarPartido = document.getElementById("btnSumarPartido");
const mensajeSancion = document.getElementById("mensajeSancion");
const btnGuardarSancion = document.getElementById("btnGuardarSancion");

const contadorRegistrosDisciplina = document.getElementById("contadorRegistrosDisciplina");
const listaRegistrosDisciplina = document.getElementById("listaRegistrosDisciplina");
const sinRegistrosDisciplina = document.getElementById("sinRegistrosDisciplina");

const modalConfirmacion = document.getElementById("modalConfirmacion");
const textoConfirmacion = document.getElementById("textoConfirmacion");
const confirmacionJugador = document.getElementById("confirmacionJugador");
const confirmacionEstado = document.getElementById("confirmacionEstado");
const confirmacionPartidos = document.getElementById("confirmacionPartidos");
const btnCancelarConfirmacion = document.getElementById("btnCancelarConfirmacion");
const btnConfirmarSancion = document.getElementById("btnConfirmarSancion");

let jugadores = [];
let equipos = [];
let categorias = [];
let cedulas = [];
let jugadoresFiltrados = [];
let jugadorSeleccionado = null;
let guardandoSancion = false;

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
    try {
        await protegerPagina(["admin"]);
        configurarEventos();
        await cargarDatos();
    } catch (error) {
        console.error(error);
        mostrarErrorCarga();
    }
}

function configurarEventos() {
    buscarJugador.addEventListener("input", () => {
        actualizarBotonBusqueda();
        aplicarFiltros();
    });

    btnLimpiarBusqueda.addEventListener("click", () => {
        buscarJugador.value = "";
        actualizarBotonBusqueda();
        aplicarFiltros();
        buscarJugador.focus();
    });

    filtroCategoria.addEventListener("change", () => {
        actualizarFiltroEquipos();
        aplicarFiltros();
    });

    filtroEquipo.addEventListener("change", aplicarFiltros);
    filtroDisciplina.addEventListener("change", aplicarFiltros);

    btnRestablecerFiltros.addEventListener("click", restablecerFiltros);

    btnCerrarModal.addEventListener("click", cerrarModalDisciplina);
    btnCerrarDetalle.addEventListener("click", cerrarModalDisciplina);

    document.querySelectorAll("[data-cerrar-modal]").forEach(elemento => {
        elemento.addEventListener("click", cerrarModalDisciplina);
    });

    btnRestarPartido.addEventListener("click", () => {
        const actual = obtenerEnteroNoNegativo(campoPartidosSuspension.value);
        campoPartidosSuspension.value = Math.max(0, actual - 1);
        sincronizarSuspensionDesdePartidos();
    });

    btnSumarPartido.addEventListener("click", () => {
        const actual = obtenerEnteroNoNegativo(campoPartidosSuspension.value);
        campoPartidosSuspension.value = actual + 1;
        sincronizarSuspensionDesdePartidos();
    });

    campoPartidosSuspension.addEventListener("input", () => {
        const valor = obtenerEnteroNoNegativo(campoPartidosSuspension.value);
        campoPartidosSuspension.value = valor;
        sincronizarSuspensionDesdePartidos();
    });

    campoSuspendido.addEventListener("change", () => {
        if (!campoSuspendido.checked) {
            campoPartidosSuspension.value = 0;
        }
    });

    btnGuardarSancion.addEventListener("click", abrirConfirmacion);

    btnCancelarConfirmacion.addEventListener("click", cerrarConfirmacion);

    btnConfirmarSancion.addEventListener("click", guardarSancion);

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape") {
            return;
        }

        if (!modalConfirmacion.classList.contains("hidden")) {
            cerrarConfirmacion();
            return;
        }

        if (!modalDisciplina.classList.contains("hidden")) {
            cerrarModalDisciplina();
        }
    });
}

async function cargarDatos() {
    mostrarCargando();

    try {
        const [
            jugadoresSnapshot,
            equiposSnapshot,
            categoriasSnapshot,
            cedulasSnapshot
        ] = await Promise.all([
            getDocs(collection(db, "jugadores")),
            getDocs(collection(db, "equipos")),
            getDocs(collection(db, "categorias")),
            getDocs(collection(db, "cedulas"))
        ]);

        jugadores = jugadoresSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        equipos = equiposSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        categorias = categoriasSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        cedulas = cedulasSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        jugadores.sort((a, b) => {
            return obtenerNombreJugador(a).localeCompare(
                obtenerNombreJugador(b),
                "es",
                { sensitivity: "base" }
            );
        });

        categorias.sort((a, b) => {
            return obtenerNombreCategoria(a).localeCompare(
                obtenerNombreCategoria(b),
                "es",
                { sensitivity: "base" }
            );
        });

        equipos.sort((a, b) => {
            return obtenerNombreEquipo(a).localeCompare(
                obtenerNombreEquipo(b),
                "es",
                { sensitivity: "base" }
            );
        });

        llenarFiltroCategorias();
        actualizarFiltroEquipos();
        actualizarResumen();
        aplicarFiltros();
    } catch (error) {
        console.error("Error al cargar disciplina:", error);
        mostrarErrorCarga();
    }
}

function llenarFiltroCategorias() {
    const valorActual = filtroCategoria.value;

    filtroCategoria.innerHTML = `
        <option value="">Todas las categorías</option>
        ${categorias.map(categoria => `
            <option value="${escaparAtributo(categoria.id)}">
                ${escaparHTML(obtenerNombreCategoria(categoria))}
            </option>
        `).join("")}
    `;

    if (
        valorActual &&
        categorias.some(categoria => categoria.id === valorActual)
    ) {
        filtroCategoria.value = valorActual;
    }
}

function actualizarFiltroEquipos() {
    const categoriaId = filtroCategoria.value;
    const valorActual = filtroEquipo.value;

    const disponibles = equipos.filter(equipo => {
        if (!categoriaId) {
            return true;
        }

        return obtenerCategoriaIdEquipo(equipo) === categoriaId;
    });

    filtroEquipo.innerHTML = `
        <option value="">Todos los equipos</option>
        ${disponibles.map(equipo => `
            <option value="${escaparAtributo(equipo.id)}">
                ${escaparHTML(obtenerNombreEquipo(equipo))}
            </option>
        `).join("")}
    `;

    if (
        valorActual &&
        disponibles.some(equipo => equipo.id === valorActual)
    ) {
        filtroEquipo.value = valorActual;
    }
}

function actualizarResumen() {
    let amarillas = 0;
    let rojas = 0;
    let suspendidos = 0;
    let pendientes = 0;

    jugadores.forEach(jugador => {
        amarillas += obtenerAmarillasJugador(jugador);
        rojas += obtenerRojasJugador(jugador);

        if (estaSuspendido(jugador)) {
            suspendidos += 1;
        }

        pendientes += obtenerPartidosSuspension(jugador);
    });

    totalAmarillas.textContent = amarillas;
    totalRojas.textContent = rojas;
    totalSuspendidos.textContent = suspendidos;
    totalPartidosPendientes.textContent = pendientes;
}

function aplicarFiltros() {
    const busqueda = normalizarTexto(buscarJugador.value);
    const categoriaId = filtroCategoria.value;
    const equipoId = filtroEquipo.value;
    const disciplina = filtroDisciplina.value;

    jugadoresFiltrados = jugadores.filter(jugador => {
        const nombre = normalizarTexto(obtenerNombreJugador(jugador));
        const equipo = obtenerEquipoJugador(jugador);
        const categoria = obtenerCategoriaJugador(jugador, equipo);

        const nombreEquipo = normalizarTexto(
            equipo ? obtenerNombreEquipo(equipo) : jugador.equipoNombre
        );

        const coincideBusqueda =
            !busqueda ||
            nombre.includes(busqueda) ||
            nombreEquipo.includes(busqueda);

        const coincideCategoria =
            !categoriaId ||
            obtenerCategoriaIdJugador(jugador, equipo) === categoriaId ||
            categoria?.id === categoriaId;

        const coincideEquipo =
            !equipoId ||
            obtenerEquipoIdJugador(jugador) === equipoId;

        const amarillas = obtenerAmarillasJugador(jugador);
        const rojas = obtenerRojasJugador(jugador);
        const partidosPendientes = obtenerPartidosSuspension(jugador);
        const suspendido = estaSuspendido(jugador);

        let coincideDisciplina = true;

        if (disciplina === "suspendidos") {
            coincideDisciplina = suspendido;
        }

        if (disciplina === "amarillas") {
            coincideDisciplina = amarillas > 0;
        }

        if (disciplina === "rojas") {
            coincideDisciplina = rojas > 0;
        }

        if (disciplina === "sancion") {
            coincideDisciplina = partidosPendientes > 0;
        }

        if (disciplina === "limpios") {
            coincideDisciplina =
                amarillas === 0 &&
                rojas === 0 &&
                !suspendido &&
                partidosPendientes === 0;
        }

        return (
            coincideBusqueda &&
            coincideCategoria &&
            coincideEquipo &&
            coincideDisciplina
        );
    });

    renderizarJugadores();
}

function renderizarJugadores() {
    estadoCarga.classList.add("hidden");
    contadorResultados.textContent = jugadoresFiltrados.length;

    if (!jugadoresFiltrados.length) {
        listaDisciplina.innerHTML = "";
        listaDisciplina.classList.add("hidden");
        estadoVacio.classList.remove("hidden");
        return;
    }

    estadoVacio.classList.add("hidden");
    listaDisciplina.classList.remove("hidden");

    listaDisciplina.innerHTML = jugadoresFiltrados
        .map(crearTarjetaJugador)
        .join("");

    listaDisciplina
        .querySelectorAll("[data-jugador-id]")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                abrirJugador(boton.dataset.jugadorId);
            });
        });
}

function crearTarjetaJugador(jugador) {
    const nombre = obtenerNombreJugador(jugador);
    const equipo = obtenerEquipoJugador(jugador);
    const categoria = obtenerCategoriaJugador(jugador, equipo);

    const equipoNombre = equipo
        ? obtenerNombreEquipo(equipo)
        : obtenerTexto(jugador.equipoNombre) || "Sin equipo";

    const categoriaNombre = categoria
        ? obtenerNombreCategoria(categoria)
        : obtenerTexto(jugador.categoriaNombre) || "Sin categoría";

    const amarillas = obtenerAmarillasJugador(jugador);
    const rojas = obtenerRojasJugador(jugador);
    const partidos = obtenerPartidosSuspension(jugador);
    const suspendido = estaSuspendido(jugador);

    const foto = obtenerFotoJugador(jugador);

    const clases = [
        "disciplina-jugador-card",
        suspendido ? "suspendido" : "",
        rojas > 0 ? "con-roja" : "",
        amarillas > 0 ? "con-amarilla" : ""
    ].filter(Boolean).join(" ");

    const fotoHTML = foto
        ? `
            <img
                src="${escaparAtributo(foto)}"
                alt="${escaparAtributo(nombre)}"
                loading="lazy"
            >
        `
        : `
            <span>
                ${escaparHTML(obtenerIniciales(nombre))}
            </span>
        `;

    return `
        <article class="${clases}">

            <div class="jugador-foto">
                ${fotoHTML}
            </div>

            <div class="disciplina-card-info">

                <span class="estado-jugador-disciplina ${suspendido ? "suspendido" : ""}">
                    ${suspendido ? "Suspendido" : "Disponible"}
                </span>

                <h3>
                    ${escaparHTML(nombre)}
                </h3>

                <p>
                    ${escaparHTML(equipoNombre)} · ${escaparHTML(categoriaNombre)}
                </p>

                <div class="disciplina-card-meta">

                    <span class="meta-amarilla">
                        🟨 ${amarillas}
                    </span>

                    <span class="meta-roja">
                        🟥 ${rojas}
                    </span>

                    ${partidos > 0 ? `
                        <span class="meta-suspension">
                            ⛔ ${partidos} ${partidos === 1 ? "partido" : "partidos"}
                        </span>
                    ` : ""}

                </div>

            </div>

            <button
                type="button"
                class="btn-ver-disciplina"
                data-jugador-id="${escaparAtributo(jugador.id)}"
                aria-label="Ver disciplina de ${escaparAtributo(nombre)}"
            >
                ›
            </button>

        </article>
    `;
}

function abrirJugador(jugadorId) {
    const jugador = jugadores.find(item => item.id === jugadorId);

    if (!jugador) {
        return;
    }

    jugadorSeleccionado = jugador;

    const nombre = obtenerNombreJugador(jugador);
    const equipo = obtenerEquipoJugador(jugador);
    const categoria = obtenerCategoriaJugador(jugador, equipo);

    const equipoNombre = equipo
        ? obtenerNombreEquipo(equipo)
        : obtenerTexto(jugador.equipoNombre) || "Sin equipo";

    const categoriaNombre = categoria
        ? obtenerNombreCategoria(categoria)
        : obtenerTexto(jugador.categoriaNombre) || "Sin categoría";

    const dorsal = obtenerDorsalJugador(jugador);
    const amarillas = obtenerAmarillasJugador(jugador);
    const rojas = obtenerRojasJugador(jugador);
    const partidos = obtenerPartidosSuspension(jugador);
    const suspendido = estaSuspendido(jugador);
    const foto = obtenerFotoJugador(jugador);

    if (foto) {
        contenedorFotoJugador.innerHTML = `
            <img
                src="${escaparAtributo(foto)}"
                alt="${escaparAtributo(nombre)}"
            >
        `;
    } else {
        contenedorFotoJugador.innerHTML = `
            <span id="modalJugadorInicial">
                ${escaparHTML(obtenerIniciales(nombre))}
            </span>
        `;
    }

    modalEstadoDisciplina.textContent =
        suspendido ? "Suspendido" : "Sin suspensión";

    modalEstadoDisciplina.className =
        `estado-disciplina ${suspendido ? "suspendido" : "limpio"}`;

    modalJugadorNombre.textContent = nombre;
    modalEquipoCategoria.textContent = `${equipoNombre} · ${categoriaNombre}`;

    modalAmarillas.textContent = amarillas;
    modalRojas.textContent = rojas;
    modalSuspension.textContent = suspendido ? "Sí" : "No";
    modalPartidosPendientes.textContent = partidos;

    modalNombreCompleto.textContent = nombre;
    modalEquipo.textContent = equipoNombre;
    modalCategoria.textContent = categoriaNombre;
    modalDorsal.textContent = dorsal || "Sin dorsal";

    modalEstadoJugador.textContent =
        jugador.activo === false
            ? "Inactivo"
            : suspendido
                ? "Suspendido"
                : "Activo";

    campoSuspendido.checked = suspendido;
    campoPartidosSuspension.value = partidos;

    ocultarMensajeSancion();

    renderizarHistorialJugador(jugador);

    modalDisciplina.classList.remove("hidden");
    modalDisciplina.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function renderizarHistorialJugador(jugador) {
    const registros = obtenerRegistrosCedulasJugador(jugador);

    contadorRegistrosDisciplina.textContent = registros.length;

    if (!registros.length) {
        listaRegistrosDisciplina.innerHTML = "";
        listaRegistrosDisciplina.classList.add("hidden");
        sinRegistrosDisciplina.classList.remove("hidden");
        return;
    }

    sinRegistrosDisciplina.classList.add("hidden");
    listaRegistrosDisciplina.classList.remove("hidden");

    listaRegistrosDisciplina.innerHTML = registros
        .map(registro => {
            const tarjeta = registro.tipo === "roja"
                ? "Roja"
                : "Amarilla";

            return `
                <article class="registro-disciplina-card">

                    <div class="registro-disciplina-info">

                        <span>
                            ${escaparHTML(registro.jornada)}
                        </span>

                        <strong>
                            ${escaparHTML(registro.partido)}
                        </strong>

                        <small>
                            ${escaparHTML(registro.detalle)}
                        </small>

                    </div>

                    <span class="registro-tarjeta ${registro.tipo}">
                        ${registro.tipo === "roja" ? "🟥" : "🟨"} ${tarjeta}
                    </span>

                </article>
            `;
        })
        .join("");
}

function obtenerRegistrosCedulasJugador(jugador) {
    const registros = [];

    cedulas.forEach(cedula => {
        const jornada =
            obtenerTexto(cedula.jornadaNombre) ||
            "Jornada";

        const local =
            obtenerTexto(cedula.localNombre) ||
            "Local";

        const visitante =
            obtenerTexto(cedula.visitanteNombre) ||
            "Visitante";

        const partido = `${local} vs ${visitante}`;

        procesarColeccionTarjetas(
            cedula.amarillas,
            "amarilla",
            jugador,
            cedula,
            jornada,
            partido,
            registros
        );

        procesarColeccionTarjetas(
            cedula.rojas,
            "roja",
            jugador,
            cedula,
            jornada,
            partido,
            registros
        );
    });

    return registros.sort((a, b) => {
        return b.orden - a.orden;
    });
}

function procesarColeccionTarjetas(
    coleccionTarjetas,
    tipo,
    jugador,
    cedula,
    jornada,
    partido,
    registros
) {
    const tarjetas = convertirALista(coleccionTarjetas);

    tarjetas.forEach(tarjeta => {
        if (!tarjetaPerteneceJugador(tarjeta, jugador)) {
            return;
        }

        const minuto = obtenerPrimerTexto(
            tarjeta.minuto,
            tarjeta.tiempo,
            tarjeta.min
        );

        const motivo = obtenerPrimerTexto(
            tarjeta.motivo,
            tarjeta.descripcion,
            tarjeta.detalle,
            tarjeta.observacion
        );

        let detalle = "";

        if (minuto && motivo) {
            detalle = `Minuto ${minuto} · ${motivo}`;
        } else if (minuto) {
            detalle = `Minuto ${minuto}`;
        } else if (motivo) {
            detalle = motivo;
        } else {
            detalle = "Registrada en cédula arbitral";
        }

        registros.push({
            tipo,
            jornada,
            partido,
            detalle,
            orden: obtenerOrdenCedula(cedula)
        });
    });
}

function convertirALista(valor) {
    if (!valor) {
        return [];
    }

    if (Array.isArray(valor)) {
        return valor;
    }

    if (typeof valor === "object") {
        return Object.values(valor);
    }

    return [];
}

function tarjetaPerteneceJugador(tarjeta, jugador) {
    if (!tarjeta || typeof tarjeta !== "object") {
        return false;
    }

    const jugadorIdTarjeta = obtenerPrimerTexto(
        tarjeta.jugadorId,
        tarjeta.idJugador,
        tarjeta.jugadorID,
        tarjeta.uidJugador
    );

    if (jugadorIdTarjeta) {
        return jugadorIdTarjeta === jugador.id;
    }

    const nombreTarjeta = normalizarTexto(
        obtenerPrimerTexto(
            tarjeta.jugadorNombre,
            tarjeta.nombreJugador,
            tarjeta.nombre,
            tarjeta.jugador
        )
    );

    if (!nombreTarjeta) {
        return false;
    }

    const nombreJugador = normalizarTexto(
        obtenerNombreJugador(jugador)
    );

    if (nombreTarjeta !== nombreJugador) {
        return false;
    }

    const equipoIdTarjeta = obtenerPrimerTexto(
        tarjeta.equipoId,
        tarjeta.idEquipo
    );

    if (
        equipoIdTarjeta &&
        obtenerEquipoIdJugador(jugador) &&
        equipoIdTarjeta !== obtenerEquipoIdJugador(jugador)
    ) {
        return false;
    }

    return true;
}

function obtenerOrdenCedula(cedula) {
    const campos = [
        cedula.enviadoEn,
        cedula.actualizadoEn,
        cedula.creadoEn
    ];

    for (const campo of campos) {
        if (campo?.toMillis) {
            return campo.toMillis();
        }

        if (campo?.seconds) {
            return campo.seconds * 1000;
        }

        if (campo instanceof Date) {
            return campo.getTime();
        }

        if (typeof campo === "number") {
            return campo;
        }
    }

    return 0;
}

function abrirConfirmacion() {
    if (!jugadorSeleccionado || guardandoSancion) {
        return;
    }

    let partidos = obtenerEnteroNoNegativo(
        campoPartidosSuspension.value
    );

    let suspendido = campoSuspendido.checked;

    if (partidos > 0) {
        suspendido = true;
        campoSuspendido.checked = true;
    }

    if (!suspendido) {
        partidos = 0;
        campoPartidosSuspension.value = 0;
    }

    const nombre = obtenerNombreJugador(jugadorSeleccionado);

    confirmacionJugador.textContent = nombre;
    confirmacionEstado.textContent =
        suspendido ? "Suspendido" : "Disponible";
    confirmacionPartidos.textContent = partidos;

    textoConfirmacion.textContent = suspendido
        ? `Se registrará una suspensión de ${partidos} ${partidos === 1 ? "partido" : "partidos"} para este jugador.`
        : "Se retirará la suspensión vigente y el jugador quedará disponible.";

    modalConfirmacion.classList.remove("hidden");
    modalConfirmacion.setAttribute("aria-hidden", "false");
}

function cerrarConfirmacion() {
    if (guardandoSancion) {
        return;
    }

    modalConfirmacion.classList.add("hidden");
    modalConfirmacion.setAttribute("aria-hidden", "true");
}

async function guardarSancion() {
    if (!jugadorSeleccionado || guardandoSancion) {
        return;
    }

    guardandoSancion = true;

    btnConfirmarSancion.disabled = true;
    btnGuardarSancion.disabled = true;

    const textoOriginalConfirmar = btnConfirmarSancion.textContent;
    const contenidoOriginalGuardar = btnGuardarSancion.innerHTML;

    btnConfirmarSancion.textContent = "Guardando...";

    btnGuardarSancion.innerHTML = `
        <span>⌛</span>
        <strong>Guardando...</strong>
    `;

    try {
        const suspensionAnterior = estaSuspendido(jugadorSeleccionado);
        const partidosAnteriores = obtenerPartidosSuspension(jugadorSeleccionado);

        let partidos = obtenerEnteroNoNegativo(
            campoPartidosSuspension.value
        );

        let suspendido = campoSuspendido.checked;

        if (partidos > 0) {
            suspendido = true;
        }

        if (!suspendido) {
            partidos = 0;
        }

        const nombreJugador = obtenerNombreJugador(jugadorSeleccionado);
        const equipo = obtenerEquipoJugador(jugadorSeleccionado);
        const categoria = obtenerCategoriaJugador(
            jugadorSeleccionado,
            equipo
        );

        const equipoNombre = equipo
            ? obtenerNombreEquipo(equipo)
            : obtenerTexto(jugadorSeleccionado.equipoNombre) || "Sin equipo";

        const categoriaNombre = categoria
            ? obtenerNombreCategoria(categoria)
            : obtenerTexto(jugadorSeleccionado.categoriaNombre) || "Sin categoría";

        await updateDoc(
            doc(db, "jugadores", jugadorSeleccionado.id),
            {
                suspendido,
                partidosSuspensionPendientes: partidos,
                actualizadoEn: serverTimestamp()
            }
        );

        jugadorSeleccionado.suspendido = suspendido;
        jugadorSeleccionado.partidosSuspensionPendientes = partidos;

        const indice = jugadores.findIndex(
            jugador => jugador.id === jugadorSeleccionado.id
        );

        if (indice !== -1) {
            jugadores[indice] = {
                ...jugadores[indice],
                suspendido,
                partidosSuspensionPendientes: partidos
            };

            jugadorSeleccionado = jugadores[indice];
        }

        campoSuspendido.checked = suspendido;
        campoPartidosSuspension.value = partidos;

        modalEstadoDisciplina.textContent =
            suspendido ? "Suspendido" : "Sin suspensión";

        modalEstadoDisciplina.className =
            `estado-disciplina ${suspendido ? "suspendido" : "limpio"}`;

        modalSuspension.textContent =
            suspendido ? "Sí" : "No";

        modalPartidosPendientes.textContent =
            partidos;

        modalEstadoJugador.textContent =
            jugadorSeleccionado.activo === false
                ? "Inactivo"
                : suspendido
                    ? "Suspendido"
                    : "Activo";

        const usuarioActual = await protegerPagina(["admin"]);

        let accion = "sancion_actualizada";
        let descripcion = "";

        if (!suspensionAnterior && suspendido) {
            accion = "suspension_registrada";

            descripcion =
                `Se suspendió a ${nombreJugador} por ${partidos} ${
                    partidos === 1 ? "partido" : "partidos"
                }.`;
        } else if (suspensionAnterior && !suspendido) {
            accion = "suspension_retirada";

            descripcion =
                `Se retiró la suspensión de ${nombreJugador}.`;
        } else if (
            suspendido &&
            partidosAnteriores !== partidos
        ) {
            accion = "suspension_modificada";

            descripcion =
                `Se modificó la suspensión de ${nombreJugador} de ` +
                `${partidosAnteriores} ${
                    partidosAnteriores === 1 ? "partido" : "partidos"
                } a ${partidos} ${
                    partidos === 1 ? "partido" : "partidos"
                }.`;
        } else if (suspendido) {
            descripcion =
                `Se actualizó la sanción vigente de ${nombreJugador} ` +
                `con ${partidos} ${
                    partidos === 1 ? "partido pendiente" : "partidos pendientes"
                }.`;
        } else {
            descripcion =
                `Se confirmó que ${nombreJugador} se encuentra disponible.`;
        }

        await registrarAuditoria({
            usuarioId: usuarioActual?.uid || "",
            usuarioNombre:
                usuarioActual?.nombre ||
                usuarioActual?.nombreCompleto ||
                usuarioActual?.email ||
                "Administrador",
            usuarioRol: usuarioActual?.rol || "admin",
            modulo: "disciplina",
            accion,
            descripcion,
            entidadTipo: "jugador",
            entidadId: jugadorSeleccionado.id,
            entidadNombre: nombreJugador
        });

        cerrarConfirmacionForzado();

        mostrarMensajeSancion(
            suspendido
                ? `Sanción actualizada. El jugador tiene ${partidos} ${
                    partidos === 1
                        ? "partido pendiente"
                        : "partidos pendientes"
                }.`
                : "La suspensión fue retirada. El jugador está disponible.",
            false
        );

        actualizarResumen();
        aplicarFiltros();

        console.log(
            "Sanción guardada:",
            {
                jugador: nombreJugador,
                equipo: equipoNombre,
                categoria: categoriaNombre,
                suspendido,
                partidos
            }
        );
    } catch (error) {
        console.error("Error al guardar sanción:", error);

        cerrarConfirmacionForzado();

        mostrarMensajeSancion(
            "No fue posible actualizar la sanción. Revisa tu conexión o los permisos de Firestore.",
            true
        );
    } finally {
        guardandoSancion = false;

        btnConfirmarSancion.disabled = false;
        btnGuardarSancion.disabled = false;

        btnConfirmarSancion.textContent =
            textoOriginalConfirmar;

        btnGuardarSancion.innerHTML =
            contenidoOriginalGuardar;
    }
}

function cerrarConfirmacionForzado() {
    modalConfirmacion.classList.add("hidden");
    modalConfirmacion.setAttribute("aria-hidden", "true");
}

function sincronizarSuspensionDesdePartidos() {
    const partidos = obtenerEnteroNoNegativo(
        campoPartidosSuspension.value
    );

    if (partidos > 0) {
        campoSuspendido.checked = true;
    }
}

function mostrarMensajeSancion(texto, error = false) {
    mensajeSancion.textContent = texto;
    mensajeSancion.classList.remove("hidden");
    mensajeSancion.classList.toggle("error", error);
}

function ocultarMensajeSancion() {
    mensajeSancion.textContent = "";
    mensajeSancion.classList.add("hidden");
    mensajeSancion.classList.remove("error");
}

function cerrarModalDisciplina() {
    if (guardandoSancion) {
        return;
    }

    cerrarConfirmacionForzado();

    modalDisciplina.classList.add("hidden");
    modalDisciplina.setAttribute("aria-hidden", "true");

    jugadorSeleccionado = null;

    document.body.style.overflow = "";
}

function restablecerFiltros() {
    buscarJugador.value = "";
    filtroCategoria.value = "";
    filtroEquipo.value = "";
    filtroDisciplina.value = "";

    actualizarBotonBusqueda();
    actualizarFiltroEquipos();
    aplicarFiltros();
}

function actualizarBotonBusqueda() {
    if (buscarJugador.value.trim()) {
        btnLimpiarBusqueda.classList.remove("hidden");
    } else {
        btnLimpiarBusqueda.classList.add("hidden");
    }
}

function obtenerEquipoJugador(jugador) {
    const equipoId = obtenerEquipoIdJugador(jugador);

    if (!equipoId) {
        return null;
    }

    return equipos.find(equipo => equipo.id === equipoId) || null;
}

function obtenerCategoriaJugador(jugador, equipo = null) {
    const categoriaId = obtenerCategoriaIdJugador(jugador, equipo);

    if (!categoriaId) {
        return null;
    }

    return categorias.find(categoria => categoria.id === categoriaId) || null;
}

function obtenerEquipoIdJugador(jugador) {
    return obtenerPrimerTexto(
        jugador.equipoId,
        jugador.idEquipo,
        jugador.clubId
    );
}

function obtenerCategoriaIdJugador(jugador, equipo = null) {
    return obtenerPrimerTexto(
        jugador.categoriaId,
        equipo?.categoriaId,
        equipo?.idCategoria
    );
}

function obtenerCategoriaIdEquipo(equipo) {
    return obtenerPrimerTexto(
        equipo.categoriaId,
        equipo.idCategoria
    );
}

function obtenerNombreJugador(jugador) {
    return obtenerPrimerTexto(
        jugador.nombreCompleto,
        jugador.nombre
    ) || "Jugador sin nombre";
}

function obtenerNombreEquipo(equipo) {
    return obtenerPrimerTexto(
        equipo.nombre,
        equipo.nombreEquipo,
        equipo.equipoNombre
    ) || "Equipo sin nombre";
}

function obtenerNombreCategoria(categoria) {
    return obtenerPrimerTexto(
        categoria.nombre,
        categoria.nombreCategoria,
        categoria.categoriaNombre
    ) || "Categoría sin nombre";
}

function obtenerFotoJugador(jugador) {
    return obtenerPrimerTexto(
        jugador.fotoUrl,
        jugador.fotoURL,
        jugador.foto,
        jugador.imagenUrl
    );
}

function obtenerDorsalJugador(jugador) {
    return obtenerPrimerTexto(
        jugador.dorsal,
        jugador.numero,
        jugador.numeroJugador
    );
}

function obtenerAmarillasJugador(jugador) {
    return obtenerEnteroNoNegativo(jugador.amarillas);
}

function obtenerRojasJugador(jugador) {
    return obtenerEnteroNoNegativo(jugador.rojas);
}

function obtenerPartidosSuspension(jugador) {
    return obtenerEnteroNoNegativo(
        jugador.partidosSuspensionPendientes
    );
}

function estaSuspendido(jugador) {
    return (
        jugador.suspendido === true ||
        obtenerPartidosSuspension(jugador) > 0
    );
}

function obtenerIniciales(nombre) {
    const palabras = obtenerTexto(nombre)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!palabras.length) {
        return "JG";
    }

    if (palabras.length === 1) {
        return palabras[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        palabras[0].charAt(0) +
        palabras[1].charAt(0)
    ).toUpperCase();
}

function obtenerEnteroNoNegativo(valor) {
    const numero = Number.parseInt(valor, 10);

    if (!Number.isFinite(numero) || numero < 0) {
        return 0;
    }

    return numero;
}

function mostrarCargando() {
    estadoCarga.classList.remove("hidden");
    estadoVacio.classList.add("hidden");
    listaDisciplina.classList.add("hidden");
}

function mostrarErrorCarga() {
    estadoCarga.classList.add("hidden");
    listaDisciplina.classList.add("hidden");
    estadoVacio.classList.remove("hidden");

    const titulo = estadoVacio.querySelector("strong");
    const descripcion = estadoVacio.querySelector("p");

    if (titulo) {
        titulo.textContent =
            "No se pudo cargar la información disciplinaria";
    }

    if (descripcion) {
        descripcion.textContent =
            "Ocurrió un problema al consultar los registros. Intenta recargar la página.";
    }

    contadorResultados.textContent = "0";
}

function obtenerPrimerTexto(...valores) {
    for (const valor of valores) {
        const texto = obtenerTexto(valor).trim();

        if (texto) {
            return texto;
        }
    }

    return "";
}

function obtenerTexto(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return "";
    }

    return String(valor);
}

function normalizarTexto(valor) {
    return obtenerTexto(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escaparHTML(valor) {
    return obtenerTexto(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
    return escaparHTML(valor);
}