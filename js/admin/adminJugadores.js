import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";

const totalJugadores = document.getElementById("totalJugadores");
const totalActivos = document.getElementById("totalActivos");
const totalSuspendidos = document.getElementById("totalSuspendidos");
const totalEquipos = document.getElementById("totalEquipos");
const contadorResultados = document.getElementById("contadorResultados");

const buscarJugador = document.getElementById("buscarJugador");
const btnLimpiarBusqueda = document.getElementById("btnLimpiarBusqueda");

const filtroCategoria = document.getElementById("filtroCategoria");
const filtroEquipo = document.getElementById("filtroEquipo");
const filtroEstado = document.getElementById("filtroEstado");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const btnRestablecerFiltros = document.getElementById("btnRestablecerFiltros");
const listaJugadores = document.getElementById("listaJugadores");

const modalJugador = document.getElementById("modalJugador");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");

const modalJugadorFoto = document.getElementById("modalJugadorFoto");
const modalJugadorDorsal = document.getElementById("modalJugadorDorsal");
const modalJugadorEstado = document.getElementById("modalJugadorEstado");
const modalJugadorNombre = document.getElementById("modalJugadorNombre");
const modalJugadorEquipo = document.getElementById("modalJugadorEquipo");
const modalJugadorCategoria = document.getElementById("modalJugadorCategoria");

const modalJugadorGoles = document.getElementById("modalJugadorGoles");
const modalJugadorAmarillas = document.getElementById("modalJugadorAmarillas");
const modalJugadorRojas = document.getElementById("modalJugadorRojas");
const modalJugadorSuspension = document.getElementById("modalJugadorSuspension");

const modalNombreCompleto = document.getElementById("modalNombreCompleto");
const modalFechaNacimiento = document.getElementById("modalFechaNacimiento");
const modalDorsalTexto = document.getElementById("modalDorsalTexto");
const modalEquipoTexto = document.getElementById("modalEquipoTexto");
const modalCategoriaTexto = document.getElementById("modalCategoriaTexto");

const bloqueSuspension = document.getElementById("bloqueSuspension");
const textoSuspension = document.getElementById("textoSuspension");

const bloqueObservaciones = document.getElementById("bloqueObservaciones");
const modalObservaciones = document.getElementById("modalObservaciones");

const btnVerJugadorPublico = document.getElementById("btnVerJugadorPublico");

let jugadores = [];
let equipos = [];
let categorias = [];
let jugadoresFiltrados = [];

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
    filtroEstado.addEventListener("change", aplicarFiltros);

    btnRestablecerFiltros.addEventListener("click", restablecerFiltros);

    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCerrarDetalle.addEventListener("click", cerrarModal);

    document.querySelectorAll("[data-cerrar-modal]").forEach(elemento => {
        elemento.addEventListener("click", cerrarModal);
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && !modalJugador.classList.contains("hidden")) {
            cerrarModal();
        }
    });
}

async function cargarDatos() {
    mostrarCargando();

    try {
        const [
            jugadoresSnapshot,
            equiposSnapshot,
            categoriasSnapshot
        ] = await Promise.all([
            getDocs(collection(db, "jugadores")),
            getDocs(collection(db, "equipos")),
            getDocs(collection(db, "categorias"))
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

        ordenarDatos();
        cargarSelectCategorias();
        cargarSelectEquipos();
        actualizarResumen();
        aplicarFiltros();
    } catch (error) {
        console.error("Error al cargar jugadores:", error);
        mostrarErrorCarga();
    }
}

function ordenarDatos() {
    categorias.sort((a, b) => {
        return obtenerTexto(a.nombre).localeCompare(
            obtenerTexto(b.nombre),
            "es",
            { sensitivity: "base" }
        );
    });

    equipos.sort((a, b) => {
        return obtenerTexto(a.nombre).localeCompare(
            obtenerTexto(b.nombre),
            "es",
            { sensitivity: "base" }
        );
    });

    jugadores.sort((a, b) => {
        return obtenerNombreJugador(a).localeCompare(
            obtenerNombreJugador(b),
            "es",
            { sensitivity: "base" }
        );
    });
}

function cargarSelectCategorias() {
    filtroCategoria.innerHTML = `
        <option value="">
            Todas las categorías
        </option>
    `;

    categorias.forEach(categoria => {
        const option = document.createElement("option");

        option.value = categoria.id;
        option.textContent = categoria.nombre || "Sin nombre";

        filtroCategoria.appendChild(option);
    });
}

function cargarSelectEquipos() {
    const valorActual = filtroEquipo.value;

    filtroEquipo.innerHTML = `
        <option value="">
            Todos los equipos
        </option>
    `;

    equipos.forEach(equipo => {
        const option = document.createElement("option");

        option.value = equipo.id;
        option.textContent = equipo.nombre || "Sin nombre";

        filtroEquipo.appendChild(option);
    });

    if (
        valorActual &&
        [...filtroEquipo.options].some(option => option.value === valorActual)
    ) {
        filtroEquipo.value = valorActual;
    }
}

function actualizarFiltroEquipos() {
    const categoriaId = filtroCategoria.value;
    const equipoSeleccionado = filtroEquipo.value;

    filtroEquipo.innerHTML = `
        <option value="">
            Todos los equipos
        </option>
    `;

    const equiposDisponibles = categoriaId
        ? equipos.filter(equipo => equipo.categoriaId === categoriaId)
        : equipos;

    equiposDisponibles.forEach(equipo => {
        const option = document.createElement("option");

        option.value = equipo.id;
        option.textContent = equipo.nombre || "Sin nombre";

        filtroEquipo.appendChild(option);
    });

    const equipoSigueDisponible = [...filtroEquipo.options]
        .some(option => option.value === equipoSeleccionado);

    if (equipoSigueDisponible) {
        filtroEquipo.value = equipoSeleccionado;
    } else {
        filtroEquipo.value = "";
    }
}

function actualizarResumen() {
    const suspendidos = jugadores.filter(estaSuspendido);

    const activos = jugadores.filter(jugador => {
        return estaActivo(jugador) && !estaSuspendido(jugador);
    });

    const equiposConJugadores = new Set(
        jugadores
            .map(jugador => jugador.equipoId)
            .filter(Boolean)
    );

    totalJugadores.textContent = jugadores.length;
    totalActivos.textContent = activos.length;
    totalSuspendidos.textContent = suspendidos.length;
    totalEquipos.textContent = equiposConJugadores.size;
}

function aplicarFiltros() {
    const textoBusqueda = normalizarTexto(buscarJugador.value);
    const categoriaId = filtroCategoria.value;
    const equipoId = filtroEquipo.value;
    const estado = filtroEstado.value;

    jugadoresFiltrados = jugadores.filter(jugador => {
        const nombre = normalizarTexto(obtenerNombreJugador(jugador));
        const nombreCompleto = normalizarTexto(jugador.nombreCompleto);
        const equipo = normalizarTexto(obtenerNombreEquipo(jugador));
        const categoria = normalizarTexto(obtenerNombreCategoria(jugador));
        const dorsal = normalizarTexto(obtenerDorsal(jugador));

        const coincideBusqueda =
            !textoBusqueda ||
            nombre.includes(textoBusqueda) ||
            nombreCompleto.includes(textoBusqueda) ||
            equipo.includes(textoBusqueda) ||
            categoria.includes(textoBusqueda) ||
            dorsal.includes(textoBusqueda);

        const coincideCategoria =
            !categoriaId ||
            jugador.categoriaId === categoriaId;

        const coincideEquipo =
            !equipoId ||
            jugador.equipoId === equipoId;

        let coincideEstado = true;

        if (estado === "activo") {
            coincideEstado =
                estaActivo(jugador) &&
                !estaSuspendido(jugador);
        }

        if (estado === "suspendido") {
            coincideEstado = estaSuspendido(jugador);
        }

        if (estado === "inactivo") {
            coincideEstado = !estaActivo(jugador);
        }

        return (
            coincideBusqueda &&
            coincideCategoria &&
            coincideEquipo &&
            coincideEstado
        );
    });

    renderizarJugadores();
}

function renderizarJugadores() {
    estadoCarga.classList.add("hidden");

    contadorResultados.textContent = jugadoresFiltrados.length;

    if (!jugadoresFiltrados.length) {
        listaJugadores.innerHTML = "";
        listaJugadores.classList.add("hidden");
        estadoVacio.classList.remove("hidden");
        return;
    }

    estadoVacio.classList.add("hidden");
    listaJugadores.classList.remove("hidden");

    listaJugadores.innerHTML = jugadoresFiltrados
        .map(crearTarjetaJugador)
        .join("");

    listaJugadores
        .querySelectorAll("[data-jugador-id]")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                abrirJugador(boton.dataset.jugadorId);
            });
        });
}

function crearTarjetaJugador(jugador) {
    const nombre = escaparHTML(obtenerNombreJugador(jugador));
    const equipo = escaparHTML(obtenerNombreEquipo(jugador));
    const categoria = escaparHTML(obtenerNombreCategoria(jugador));
    const dorsal = escaparHTML(obtenerDorsal(jugador));
    const foto = escaparAtributo(obtenerFotoJugador(jugador));

    const estado = obtenerEstadoJugador(jugador);

    const goles = obtenerNumero(jugador.goles);
    const amarillas = obtenerNumero(jugador.amarillas);
    const rojas = obtenerNumero(jugador.rojas);

    return `
        <article class="jugador-admin-card ${estado.clase}">

            <div class="jugador-foto-wrap">

                <img
                    src="${foto}"
                    alt="${nombre}"
                    class="jugador-foto"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='imagenes/logo.png';"
                >

                <span class="jugador-dorsal">
                    ${dorsal}
                </span>

            </div>

            <div class="jugador-card-info">

                <span class="jugador-card-estado ${estado.clase}">
                    ${estado.texto}
                </span>

                <h3>
                    ${nombre}
                </h3>

                <p>
                    ${equipo}
                </p>

                <div class="jugador-card-meta">

                    <span>
                        ${categoria}
                    </span>

                    <span>
                        ⚽ ${goles}
                    </span>

                    <span>
                        🟨 ${amarillas}
                    </span>

                    <span>
                        🟥 ${rojas}
                    </span>

                </div>

            </div>

            <button
                type="button"
                class="btn-ver-jugador"
                data-jugador-id="${escaparAtributo(jugador.id)}"
                aria-label="Ver ${nombre}"
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

    const estado = obtenerEstadoJugador(jugador);

    modalJugadorFoto.src = obtenerFotoJugador(jugador);
    modalJugadorFoto.alt = obtenerNombreJugador(jugador);

    modalJugadorFoto.onerror = () => {
        modalJugadorFoto.onerror = null;
        modalJugadorFoto.src = "imagenes/logo.png";
    };

    modalJugadorDorsal.textContent = obtenerDorsal(jugador);

    modalJugadorEstado.textContent = estado.texto;
    modalJugadorEstado.className = `estado-jugador ${estado.clase}`;

    modalJugadorNombre.textContent = obtenerNombreJugador(jugador);
    modalJugadorEquipo.textContent = obtenerNombreEquipo(jugador);
    modalJugadorCategoria.textContent = obtenerNombreCategoria(jugador);

    modalJugadorGoles.textContent = obtenerNumero(jugador.goles);
    modalJugadorAmarillas.textContent = obtenerNumero(jugador.amarillas);
    modalJugadorRojas.textContent = obtenerNumero(jugador.rojas);
    modalJugadorSuspension.textContent = obtenerNumero(
        jugador.partidosSuspensionPendientes
    );

    modalNombreCompleto.textContent =
        jugador.nombreCompleto ||
        jugador.nombre ||
        "-";

    modalFechaNacimiento.textContent =
        formatearFechaNacimiento(jugador.fechaNacimiento);

    modalDorsalTexto.textContent = obtenerDorsal(jugador);
    modalEquipoTexto.textContent = obtenerNombreEquipo(jugador);
    modalCategoriaTexto.textContent = obtenerNombreCategoria(jugador);

    actualizarBloqueSuspension(jugador);
    actualizarObservaciones(jugador);

    btnVerJugadorPublico.href =
        `jugador.html?id=${encodeURIComponent(jugador.id)}`;

    modalJugador.classList.remove("hidden");
    modalJugador.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
}

function actualizarBloqueSuspension(jugador) {
    if (!estaSuspendido(jugador)) {
        bloqueSuspension.classList.add("hidden");
        textoSuspension.textContent = "";
        return;
    }

    const pendientes = obtenerNumero(
        jugador.partidosSuspensionPendientes
    );

    if (pendientes > 0) {
        textoSuspension.textContent =
            pendientes === 1
                ? "Le queda 1 partido de suspensión."
                : `Le quedan ${pendientes} partidos de suspensión.`;
    } else {
        textoSuspension.textContent =
            "Este jugador se encuentra suspendido.";
    }

    bloqueSuspension.classList.remove("hidden");
}

function actualizarObservaciones(jugador) {
    const observaciones = obtenerTexto(jugador.observaciones).trim();

    if (!observaciones) {
        bloqueObservaciones.classList.add("hidden");
        modalObservaciones.textContent = "";
        return;
    }

    modalObservaciones.textContent = observaciones;
    bloqueObservaciones.classList.remove("hidden");
}

function cerrarModal() {
    modalJugador.classList.add("hidden");
    modalJugador.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
}

function restablecerFiltros() {
    buscarJugador.value = "";
    filtroCategoria.value = "";
    filtroEstado.value = "";

    cargarSelectEquipos();

    filtroEquipo.value = "";

    actualizarBotonBusqueda();
    aplicarFiltros();
}

function actualizarBotonBusqueda() {
    if (buscarJugador.value.trim()) {
        btnLimpiarBusqueda.classList.remove("hidden");
    } else {
        btnLimpiarBusqueda.classList.add("hidden");
    }
}

function mostrarCargando() {
    estadoCarga.classList.remove("hidden");
    estadoVacio.classList.add("hidden");
    listaJugadores.classList.add("hidden");
}

function mostrarErrorCarga() {
    estadoCarga.classList.add("hidden");
    listaJugadores.classList.add("hidden");

    estadoVacio.classList.remove("hidden");

    estadoVacio.querySelector("strong").textContent =
        "No se pudieron cargar los jugadores";

    estadoVacio.querySelector("p").textContent =
        "Ocurrió un problema al consultar la información. Intenta recargar la página.";

    contadorResultados.textContent = "0";
}

function obtenerNombreJugador(jugador) {
    return (
        obtenerTexto(jugador.nombreCompleto).trim() ||
        obtenerTexto(jugador.nombre).trim() ||
        "Jugador sin nombre"
    );
}

function obtenerNombreEquipo(jugador) {
    if (obtenerTexto(jugador.equipoNombre).trim()) {
        return jugador.equipoNombre.trim();
    }

    const equipo = equipos.find(item => item.id === jugador.equipoId);

    return equipo?.nombre || "Sin equipo";
}

function obtenerNombreCategoria(jugador) {
    if (obtenerTexto(jugador.categoriaNombre).trim()) {
        return jugador.categoriaNombre.trim();
    }

    const categoria = categorias.find(
        item => item.id === jugador.categoriaId
    );

    if (categoria?.nombre) {
        return categoria.nombre;
    }

    const equipo = equipos.find(item => item.id === jugador.equipoId);

    if (equipo?.categoriaNombre) {
        return equipo.categoriaNombre;
    }

    if (equipo?.categoriaId) {
        const categoriaEquipo = categorias.find(
            item => item.id === equipo.categoriaId
        );

        if (categoriaEquipo?.nombre) {
            return categoriaEquipo.nombre;
        }
    }

    return "Sin categoría";
}

function obtenerDorsal(jugador) {
    const dorsal =
        jugador.dorsal ??
        jugador.numero;

    if (
        dorsal === undefined ||
        dorsal === null ||
        String(dorsal).trim() === ""
    ) {
        return "-";
    }

    return String(dorsal);
}

function obtenerFotoJugador(jugador) {
    const foto = obtenerTexto(jugador.fotoUrl).trim();

    return foto || "imagenes/logo.png";
}

function estaSuspendido(jugador) {
    return (
        jugador.suspendido === true ||
        obtenerNumero(jugador.partidosSuspensionPendientes) > 0
    );
}

function estaActivo(jugador) {
    return jugador.activo !== false;
}

function obtenerEstadoJugador(jugador) {
    if (estaSuspendido(jugador)) {
        return {
            texto: "Suspendido",
            clase: "suspendido"
        };
    }

    if (!estaActivo(jugador)) {
        return {
            texto: "Inactivo",
            clase: "inactivo"
        };
    }

    return {
        texto: "Activo",
        clase: "activo"
    };
}

function obtenerNumero(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

function formatearFechaNacimiento(valor) {
    if (!valor) {
        return "-";
    }

    if (
        typeof valor === "object" &&
        typeof valor.toDate === "function"
    ) {
        const fecha = valor.toDate();

        return fecha.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    const texto = String(valor).trim();

    if (!texto) {
        return "-";
    }

    const partes = texto.split("-");

    if (partes.length === 3) {
        const anio = Number(partes[0]);
        const mes = Number(partes[1]);
        const dia = Number(partes[2]);

        const fecha = new Date(
            anio,
            mes - 1,
            dia
        );

        if (!Number.isNaN(fecha.getTime())) {
            return fecha.toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            });
        }
    }

    return texto;
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