import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";

const totalRegistros = document.getElementById("totalRegistros");
const totalUsuarios = document.getElementById("totalUsuarios");
const totalHoy = document.getElementById("totalHoy");
const totalModulos = document.getElementById("totalModulos");
const contadorResultados = document.getElementById("contadorResultados");

const buscarAuditoria = document.getElementById("buscarAuditoria");
const btnLimpiarBusqueda = document.getElementById("btnLimpiarBusqueda");

const filtroModulo = document.getElementById("filtroModulo");
const filtroAccion = document.getElementById("filtroAccion");
const filtroFecha = document.getElementById("filtroFecha");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const btnRestablecerFiltros = document.getElementById("btnRestablecerFiltros");
const listaAuditoria = document.getElementById("listaAuditoria");

const modalAuditoria = document.getElementById("modalAuditoria");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");

const modalIcono = document.getElementById("modalIcono");
const modalModulo = document.getElementById("modalModulo");
const modalAccion = document.getElementById("modalAccion");
const modalFecha = document.getElementById("modalFecha");

const modalUsuario = document.getElementById("modalUsuario");
const modalRol = document.getElementById("modalRol");
const modalModuloDetalle = document.getElementById("modalModuloDetalle");
const modalAccionDetalle = document.getElementById("modalAccionDetalle");
const modalDescripcion = document.getElementById("modalDescripcion");

const seccionEntidad = document.getElementById("seccionEntidad");
const filaEntidadTipo = document.getElementById("filaEntidadTipo");
const filaEntidadNombre = document.getElementById("filaEntidadNombre");
const filaEntidadId = document.getElementById("filaEntidadId");

const modalEntidadTipo = document.getElementById("modalEntidadTipo");
const modalEntidadNombre = document.getElementById("modalEntidadNombre");
const modalEntidadId = document.getElementById("modalEntidadId");

let registros = [];
let registrosFiltrados = [];

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
    try {
        await protegerPagina(["admin"]);
        configurarEventos();
        await cargarAuditoria();
    } catch (error) {
        console.error(error);
        mostrarErrorCarga();
    }
}

function configurarEventos() {
    buscarAuditoria.addEventListener("input", () => {
        actualizarBotonBusqueda();
        aplicarFiltros();
    });

    btnLimpiarBusqueda.addEventListener("click", () => {
        buscarAuditoria.value = "";
        actualizarBotonBusqueda();
        aplicarFiltros();
        buscarAuditoria.focus();
    });

    filtroModulo.addEventListener("change", aplicarFiltros);
    filtroAccion.addEventListener("change", aplicarFiltros);
    filtroFecha.addEventListener("change", aplicarFiltros);

    btnRestablecerFiltros.addEventListener("click", restablecerFiltros);

    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCerrarDetalle.addEventListener("click", cerrarModal);

    document.querySelectorAll("[data-cerrar-modal]").forEach(elemento => {
        elemento.addEventListener("click", cerrarModal);
    });

    document.addEventListener("keydown", evento => {
        if (
            evento.key === "Escape" &&
            !modalAuditoria.classList.contains("hidden")
        ) {
            cerrarModal();
        }
    });
}

async function cargarAuditoria() {
    mostrarCargando();

    try {
        const snapshot = await getDocs(collection(db, "auditoria"));

        registros = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        registros.sort((a, b) => {
            return obtenerMilisegundos(b.fecha || b.creadoEn) -
                obtenerMilisegundos(a.fecha || a.creadoEn);
        });

        llenarFiltros();
        actualizarResumen();
        aplicarFiltros();
    } catch (error) {
        console.error("Error al cargar auditoría:", error);
        mostrarErrorCarga();
    }
}

function llenarFiltros() {
    const modulos = obtenerValoresUnicos(
        registros
            .map(registro => obtenerModulo(registro))
            .filter(Boolean)
    );

    const acciones = obtenerValoresUnicos(
        registros
            .map(registro => obtenerAccion(registro))
            .filter(Boolean)
    );

    filtroModulo.innerHTML = `
        <option value="">Todos los módulos</option>
        ${modulos.map(modulo => `
            <option value="${escaparAtributo(modulo)}">
                ${escaparHTML(formatearEtiqueta(modulo))}
            </option>
        `).join("")}
    `;

    filtroAccion.innerHTML = `
        <option value="">Todas las acciones</option>
        ${acciones.map(accion => `
            <option value="${escaparAtributo(accion)}">
                ${escaparHTML(formatearEtiqueta(accion))}
            </option>
        `).join("")}
    `;
}

function actualizarResumen() {
    const usuarios = new Set();
    const modulos = new Set();

    let hoy = 0;

    registros.forEach(registro => {
        const usuario = obtenerIdentificadorUsuario(registro);
        const modulo = obtenerModulo(registro);

        if (usuario) {
            usuarios.add(usuario);
        }

        if (modulo) {
            modulos.add(normalizarTexto(modulo));
        }

        if (esHoy(obtenerFechaRegistro(registro))) {
            hoy += 1;
        }
    });

    totalRegistros.textContent = registros.length;
    totalUsuarios.textContent = usuarios.size;
    totalHoy.textContent = hoy;
    totalModulos.textContent = modulos.size;
}

function aplicarFiltros() {
    const busqueda = normalizarTexto(buscarAuditoria.value);
    const moduloSeleccionado = filtroModulo.value;
    const accionSeleccionada = filtroAccion.value;
    const fechaSeleccionada = filtroFecha.value;

    registrosFiltrados = registros.filter(registro => {
        const usuario = obtenerNombreUsuario(registro);
        const rol = obtenerRol(registro);
        const modulo = obtenerModulo(registro);
        const accion = obtenerAccion(registro);
        const descripcion = obtenerDescripcion(registro);
        const entidadNombre = obtenerEntidadNombre(registro);

        const textoBusqueda = normalizarTexto([
            usuario,
            rol,
            modulo,
            accion,
            descripcion,
            entidadNombre
        ].join(" "));

        const coincideBusqueda =
            !busqueda ||
            textoBusqueda.includes(busqueda);

        const coincideModulo =
            !moduloSeleccionado ||
            modulo === moduloSeleccionado;

        const coincideAccion =
            !accionSeleccionada ||
            accion === accionSeleccionada;

        const coincideFecha = cumpleFiltroFecha(
            obtenerFechaRegistro(registro),
            fechaSeleccionada
        );

        return (
            coincideBusqueda &&
            coincideModulo &&
            coincideAccion &&
            coincideFecha
        );
    });

    renderizarRegistros();
}

function renderizarRegistros() {
    estadoCarga.classList.add("hidden");

    contadorResultados.textContent = registrosFiltrados.length;

    if (!registrosFiltrados.length) {
        listaAuditoria.innerHTML = "";
        listaAuditoria.classList.add("hidden");
        estadoVacio.classList.remove("hidden");
        return;
    }

    estadoVacio.classList.add("hidden");
    listaAuditoria.classList.remove("hidden");

    listaAuditoria.innerHTML = registrosFiltrados
        .map(crearRegistroHTML)
        .join("");

    listaAuditoria
        .querySelectorAll("[data-registro-id]")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                abrirRegistro(boton.dataset.registroId);
            });
        });
}

function crearRegistroHTML(registro) {
    const modulo = obtenerModulo(registro);
    const accion = obtenerAccion(registro);
    const usuario = obtenerNombreUsuario(registro);
    const descripcion = obtenerDescripcion(registro);
    const fecha = obtenerFechaRegistro(registro);

    const fechaCorta = formatearFechaCorta(fecha);
    const hora = formatearHora(fecha);

    return `
        <article class="auditoria-registro">

            <div class="registro-icono">
                ${obtenerIconoModulo(modulo)}
            </div>

            <div class="registro-contenido">

                <div class="registro-superior">

                    <span class="registro-modulo">
                        ${escaparHTML(formatearEtiqueta(modulo))}
                    </span>

                    <span class="registro-accion">
                        ${escaparHTML(formatearEtiqueta(accion))}
                    </span>

                </div>

                <h3>
                    ${escaparHTML(usuario)}
                </h3>

                <p>
                    ${escaparHTML(descripcion)}
                </p>

            </div>

            <div class="registro-fecha">

                <strong>
                    ${escaparHTML(fechaCorta)}
                </strong>

                <span>
                    ${escaparHTML(hora)}
                </span>

            </div>

            <button
                type="button"
                class="btn-ver-registro"
                data-registro-id="${escaparAtributo(registro.id)}"
                aria-label="Ver detalle del registro"
            >
                ›
            </button>

        </article>
    `;
}

function abrirRegistro(registroId) {
    const registro = registros.find(item => item.id === registroId);

    if (!registro) {
        return;
    }

    const modulo = obtenerModulo(registro);
    const accion = obtenerAccion(registro);
    const usuario = obtenerNombreUsuario(registro);
    const rol = obtenerRol(registro);
    const descripcion = obtenerDescripcion(registro);
    const fecha = obtenerFechaRegistro(registro);

    const entidadTipo = obtenerEntidadTipo(registro);
    const entidadNombre = obtenerEntidadNombre(registro);
    const entidadId = obtenerEntidadId(registro);

    modalIcono.textContent = obtenerIconoModulo(modulo);
    modalModulo.textContent = formatearEtiqueta(modulo);
    modalAccion.textContent = formatearEtiqueta(accion);
    modalFecha.textContent = formatearFechaCompleta(fecha);

    modalUsuario.textContent = usuario;
    modalRol.textContent = formatearEtiqueta(rol);
    modalModuloDetalle.textContent = formatearEtiqueta(modulo);
    modalAccionDetalle.textContent = formatearEtiqueta(accion);
    modalDescripcion.textContent = descripcion;

    const tieneEntidad =
        Boolean(entidadTipo) ||
        Boolean(entidadNombre) ||
        Boolean(entidadId);

    if (tieneEntidad) {
        seccionEntidad.classList.remove("hidden");

        configurarFilaEntidad(
            filaEntidadTipo,
            modalEntidadTipo,
            entidadTipo
        );

        configurarFilaEntidad(
            filaEntidadNombre,
            modalEntidadNombre,
            entidadNombre
        );

        configurarFilaEntidad(
            filaEntidadId,
            modalEntidadId,
            entidadId
        );
    } else {
        seccionEntidad.classList.add("hidden");
    }

    modalAuditoria.classList.remove("hidden");
    modalAuditoria.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function configurarFilaEntidad(fila, elemento, valor) {
    if (valor) {
        elemento.textContent = valor;
        fila.classList.remove("hidden");
    } else {
        elemento.textContent = "—";
        fila.classList.add("hidden");
    }
}

function cerrarModal() {
    modalAuditoria.classList.add("hidden");
    modalAuditoria.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function restablecerFiltros() {
    buscarAuditoria.value = "";
    filtroModulo.value = "";
    filtroAccion.value = "";
    filtroFecha.value = "";

    actualizarBotonBusqueda();
    aplicarFiltros();
}

function actualizarBotonBusqueda() {
    if (buscarAuditoria.value.trim()) {
        btnLimpiarBusqueda.classList.remove("hidden");
    } else {
        btnLimpiarBusqueda.classList.add("hidden");
    }
}

function cumpleFiltroFecha(fecha, filtro) {
    if (!filtro) {
        return true;
    }

    const fechaRegistro = convertirFecha(fecha);

    if (!fechaRegistro) {
        return false;
    }

    const ahora = new Date();

    const inicioHoy = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate()
    );

    const inicioRegistro = new Date(
        fechaRegistro.getFullYear(),
        fechaRegistro.getMonth(),
        fechaRegistro.getDate()
    );

    const diferencia =
        inicioHoy.getTime() - inicioRegistro.getTime();

    const dias = Math.floor(
        diferencia / 86400000
    );

    if (filtro === "hoy") {
        return dias === 0;
    }

    if (filtro === "ayer") {
        return dias === 1;
    }

    if (filtro === "7dias") {
        return dias >= 0 && dias <= 6;
    }

    if (filtro === "30dias") {
        return dias >= 0 && dias <= 29;
    }

    return true;
}

function esHoy(fecha) {
    const fechaRegistro = convertirFecha(fecha);

    if (!fechaRegistro) {
        return false;
    }

    const hoy = new Date();

    return (
        fechaRegistro.getFullYear() === hoy.getFullYear() &&
        fechaRegistro.getMonth() === hoy.getMonth() &&
        fechaRegistro.getDate() === hoy.getDate()
    );
}

function obtenerFechaRegistro(registro) {
    return (
        registro.fecha ||
        registro.creadoEn ||
        registro.timestamp ||
        registro.actualizadoEn ||
        null
    );
}

function convertirFecha(valor) {
    if (!valor) {
        return null;
    }

    if (valor?.toDate) {
        return valor.toDate();
    }

    if (valor?.seconds) {
        return new Date(valor.seconds * 1000);
    }

    if (valor instanceof Date) {
        return valor;
    }

    if (typeof valor === "number") {
        const fecha = new Date(valor);

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    if (typeof valor === "string") {
        const fecha = new Date(valor);

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    return null;
}

function obtenerMilisegundos(valor) {
    const fecha = convertirFecha(valor);

    return fecha
        ? fecha.getTime()
        : 0;
}

function formatearFechaCorta(valor) {
    const fecha = convertirFecha(valor);

    if (!fecha) {
        return "Sin fecha";
    }

    if (esHoy(fecha)) {
        return "Hoy";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(fecha);
}

function formatearHora(valor) {
    const fecha = convertirFecha(valor);

    if (!fecha) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    ).format(fecha);
}

function formatearFechaCompleta(valor) {
    const fecha = convertirFecha(valor);

    if (!fecha) {
        return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    ).format(fecha);
}

function obtenerNombreUsuario(registro) {
    return obtenerPrimerTexto(
        registro.usuarioNombre,
        registro.nombreUsuario,
        registro.actorNombre,
        registro.nombre,
        registro.usuario?.nombre
    ) || "Usuario desconocido";
}

function obtenerIdentificadorUsuario(registro) {
    return obtenerPrimerTexto(
        registro.usuarioId,
        registro.uid,
        registro.actorId,
        registro.usuario?.uid,
        registro.usuarioNombre,
        registro.nombreUsuario
    );
}

function obtenerRol(registro) {
    return obtenerPrimerTexto(
        registro.usuarioRol,
        registro.rol,
        registro.actorRol,
        registro.usuario?.rol
    ) || "Sin rol";
}

function obtenerModulo(registro) {
    return obtenerPrimerTexto(
        registro.modulo,
        registro.seccion,
        registro.area
    ) || "sistema";
}

function obtenerAccion(registro) {
    return obtenerPrimerTexto(
        registro.accion,
        registro.tipoAccion,
        registro.tipo
    ) || "actividad";
}

function obtenerDescripcion(registro) {
    return obtenerPrimerTexto(
        registro.descripcion,
        registro.detalle,
        registro.mensaje
    ) || "Sin descripción adicional.";
}

function obtenerEntidadTipo(registro) {
    return obtenerPrimerTexto(
        registro.entidadTipo,
        registro.entidad?.tipo,
        registro.objetoTipo
    );
}

function obtenerEntidadNombre(registro) {
    return obtenerPrimerTexto(
        registro.entidadNombre,
        registro.entidad?.nombre,
        registro.objetoNombre
    );
}

function obtenerEntidadId(registro) {
    return obtenerPrimerTexto(
        registro.entidadId,
        registro.entidad?.id,
        registro.objetoId
    );
}

function obtenerIconoModulo(modulo) {
    const valor = normalizarTexto(modulo);

    if (valor.includes("jugador")) {
        return "👕";
    }

    if (valor.includes("arbit")) {
        return "🧑‍⚖️";
    }

    if (
        valor.includes("jefe") ||
        valor.includes("responsable")
    ) {
        return "🧑‍💼";
    }

    if (valor.includes("equipo")) {
        return "🛡️";
    }

    if (valor.includes("categoria")) {
        return "📁";
    }

    if (valor.includes("jornada")) {
        return "🗓️";
    }

    if (valor.includes("partido")) {
        return "⚽";
    }

    if (
        valor.includes("cedula") ||
        valor.includes("cédula")
    ) {
        return "📋";
    }

    if (
        valor.includes("disciplina") ||
        valor.includes("sancion") ||
        valor.includes("sanción")
    ) {
        return "⛔";
    }

    if (valor.includes("noticia")) {
        return "📰";
    }

    if (
        valor.includes("usuario") ||
        valor.includes("rol")
    ) {
        return "👤";
    }

    if (
        valor.includes("comunidad") ||
        valor.includes("chat")
    ) {
        return "💬";
    }

    return "📋";
}

function obtenerValoresUnicos(valores) {
    const mapa = new Map();

    valores.forEach(valor => {
        const texto = obtenerTexto(valor).trim();

        if (!texto) {
            return;
        }

        const clave = normalizarTexto(texto);

        if (!mapa.has(clave)) {
            mapa.set(clave, texto);
        }
    });

    return Array.from(mapa.values()).sort(
        (a, b) => a.localeCompare(
            b,
            "es",
            { sensitivity: "base" }
        )
    );
}

function formatearEtiqueta(valor) {
    const texto = obtenerTexto(valor)
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    if (!texto) {
        return "—";
    }

    return texto.charAt(0).toUpperCase() +
        texto.slice(1);
}

function mostrarCargando() {
    estadoCarga.classList.remove("hidden");
    estadoVacio.classList.add("hidden");
    listaAuditoria.classList.add("hidden");
}

function mostrarErrorCarga() {
    estadoCarga.classList.add("hidden");
    listaAuditoria.classList.add("hidden");
    estadoVacio.classList.remove("hidden");

    const titulo = estadoVacio.querySelector("strong");
    const descripcion = estadoVacio.querySelector("p");

    if (titulo) {
        titulo.textContent =
            "No se pudo cargar la auditoría";
    }

    if (descripcion) {
        descripcion.textContent =
            "Ocurrió un problema al consultar los registros de Firestore.";
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