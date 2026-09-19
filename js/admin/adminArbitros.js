import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";

const totalArbitros = document.getElementById("totalArbitros");
const totalActivos = document.getElementById("totalActivos");
const totalAsignaciones = document.getElementById("totalAsignaciones");
const totalCedulas = document.getElementById("totalCedulas");
const contadorResultados = document.getElementById("contadorResultados");

const buscarArbitro = document.getElementById("buscarArbitro");
const btnLimpiarBusqueda = document.getElementById("btnLimpiarBusqueda");

const filtroEstado = document.getElementById("filtroEstado");
const filtroActividad = document.getElementById("filtroActividad");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const btnRestablecerFiltros = document.getElementById("btnRestablecerFiltros");
const listaArbitros = document.getElementById("listaArbitros");

const modalArbitro = document.getElementById("modalArbitro");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");

const modalArbitroInicial = document.getElementById("modalArbitroInicial");
const modalArbitroEstado = document.getElementById("modalArbitroEstado");
const modalArbitroNombre = document.getElementById("modalArbitroNombre");

const modalPartidosAsignados = document.getElementById("modalPartidosAsignados");
const modalCedulasRegistradas = document.getElementById("modalCedulasRegistradas");
const modalPartidosPendientes = document.getElementById("modalPartidosPendientes");
const modalPartidosFinalizados = document.getElementById("modalPartidosFinalizados");

const modalNombreCompleto = document.getElementById("modalNombreCompleto");
const modalCorreo = document.getElementById("modalCorreo");
const modalEstadoCuenta = document.getElementById("modalEstadoCuenta");

const contadorPartidosArbitro = document.getElementById("contadorPartidosArbitro");
const listaPartidosArbitro = document.getElementById("listaPartidosArbitro");
const sinPartidosArbitro = document.getElementById("sinPartidosArbitro");

let arbitros = [];
let partidos = [];
let cedulas = [];
let arbitrosFiltrados = [];

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
    buscarArbitro.addEventListener("input", () => {
        actualizarBotonBusqueda();
        aplicarFiltros();
    });

    btnLimpiarBusqueda.addEventListener("click", () => {
        buscarArbitro.value = "";
        actualizarBotonBusqueda();
        aplicarFiltros();
        buscarArbitro.focus();
    });

    filtroEstado.addEventListener("change", aplicarFiltros);
    filtroActividad.addEventListener("change", aplicarFiltros);

    btnRestablecerFiltros.addEventListener("click", restablecerFiltros);

    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCerrarDetalle.addEventListener("click", cerrarModal);

    document.querySelectorAll("[data-cerrar-modal]").forEach(elemento => {
        elemento.addEventListener("click", cerrarModal);
    });

    document.addEventListener("keydown", evento => {
        if (
            evento.key === "Escape" &&
            !modalArbitro.classList.contains("hidden")
        ) {
            cerrarModal();
        }
    });
}

async function cargarDatos() {
    mostrarCargando();

    try {
        const [
            usuariosSnapshot,
            partidosSnapshot,
            cedulasSnapshot
        ] = await Promise.all([
            getDocs(collection(db, "usuarios")),
            getDocs(collection(db, "partidos")),
            getDocs(collection(db, "cedulas"))
        ]);

        arbitros = usuariosSnapshot.docs
            .map(documento => ({
                id: documento.id,
                ...documento.data()
            }))
            .filter(usuario => normalizarRol(usuario.rol) === "arbitro");

        partidos = partidosSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        cedulas = cedulasSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        arbitros.sort((a, b) => {
            return obtenerNombreArbitro(a).localeCompare(
                obtenerNombreArbitro(b),
                "es",
                { sensitivity: "base" }
            );
        });

        actualizarResumen();
        aplicarFiltros();
    } catch (error) {
        console.error("Error al cargar árbitros:", error);
        mostrarErrorCarga();
    }
}

function actualizarResumen() {
    const activos = arbitros.filter(estaActivo);

    const arbitrosIds = new Set(
        arbitros.map(arbitro => arbitro.id)
    );

    const asignaciones = partidos.filter(partido => {
        const arbitroId = obtenerArbitroIdPartido(partido);
        return arbitroId && arbitrosIds.has(arbitroId);
    });

    const cedulasRegistradas = cedulas.filter(cedula => {
        const arbitroId = obtenerArbitroIdCedula(cedula);

        return (
            arbitroId &&
            arbitrosIds.has(arbitroId) &&
            esCedulaRegistrada(cedula)
        );
    });

    totalArbitros.textContent = arbitros.length;
    totalActivos.textContent = activos.length;
    totalAsignaciones.textContent = asignaciones.length;
    totalCedulas.textContent = cedulasRegistradas.length;
}

function aplicarFiltros() {
    const busqueda = normalizarTexto(buscarArbitro.value);
    const estado = filtroEstado.value;
    const actividad = filtroActividad.value;

    arbitrosFiltrados = arbitros.filter(arbitro => {
        const nombre = normalizarTexto(obtenerNombreArbitro(arbitro));
        const correo = normalizarTexto(obtenerCorreoArbitro(arbitro));

        const partidosArbitro = obtenerPartidosArbitro(arbitro.id);
        const cedulasArbitro = obtenerCedulasArbitro(arbitro.id);

        const coincideBusqueda =
            !busqueda ||
            nombre.includes(busqueda) ||
            correo.includes(busqueda);

        let coincideEstado = true;

        if (estado === "activo") {
            coincideEstado = estaActivo(arbitro);
        }

        if (estado === "inactivo") {
            coincideEstado = !estaActivo(arbitro);
        }

        let coincideActividad = true;

        if (actividad === "conPartidos") {
            coincideActividad = partidosArbitro.length > 0;
        }

        if (actividad === "sinPartidos") {
            coincideActividad = partidosArbitro.length === 0;
        }

        if (actividad === "conCedulas") {
            coincideActividad = cedulasArbitro.some(esCedulaRegistrada);
        }

        return (
            coincideBusqueda &&
            coincideEstado &&
            coincideActividad
        );
    });

    renderizarArbitros();
}

function renderizarArbitros() {
    estadoCarga.classList.add("hidden");

    contadorResultados.textContent = arbitrosFiltrados.length;

    if (!arbitrosFiltrados.length) {
        listaArbitros.innerHTML = "";
        listaArbitros.classList.add("hidden");
        estadoVacio.classList.remove("hidden");
        return;
    }

    estadoVacio.classList.add("hidden");
    listaArbitros.classList.remove("hidden");

    listaArbitros.innerHTML = arbitrosFiltrados
        .map(crearTarjetaArbitro)
        .join("");

    listaArbitros
        .querySelectorAll("[data-arbitro-id]")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                abrirArbitro(boton.dataset.arbitroId);
            });
        });
}

function crearTarjetaArbitro(arbitro) {
    const nombre = obtenerNombreArbitro(arbitro);
    const correo = obtenerCorreoArbitro(arbitro);
    const activo = estaActivo(arbitro);

    const partidosArbitro = obtenerPartidosArbitro(arbitro.id);

    const cedulasRegistradas = obtenerCedulasArbitro(arbitro.id)
        .filter(esCedulaRegistrada);

    const pendientes = partidosArbitro.filter(partido => {
        return !esPartidoFinalizado(partido);
    }).length;

    return `
        <article class="arbitro-admin-card ${activo ? "activo" : "inactivo"}">

            <div class="arbitro-avatar">
                ${escaparHTML(obtenerIniciales(nombre))}
            </div>

            <div class="arbitro-card-info">

                <span class="arbitro-card-estado ${activo ? "activo" : "inactivo"}">
                    ${activo ? "Activo" : "Inactivo"}
                </span>

                <h3>
                    ${escaparHTML(nombre)}
                </h3>

                <p>
                    ${escaparHTML(correo || "Sin correo registrado")}
                </p>

                <div class="arbitro-card-meta">

                    <span>
                        ⚽ ${partidosArbitro.length} asignados
                    </span>

                    <span>
                        📋 ${cedulasRegistradas.length} cédulas
                    </span>

                    <span>
                        ⏳ ${pendientes} pendientes
                    </span>

                </div>

            </div>

            <button
                type="button"
                class="btn-ver-arbitro"
                data-arbitro-id="${escaparAtributo(arbitro.id)}"
                aria-label="Ver árbitro ${escaparAtributo(nombre)}"
            >
                ›
            </button>

        </article>
    `;
}

function abrirArbitro(arbitroId) {
    const arbitro = arbitros.find(item => item.id === arbitroId);

    if (!arbitro) {
        return;
    }

    const nombre = obtenerNombreArbitro(arbitro);
    const correo = obtenerCorreoArbitro(arbitro);
    const activo = estaActivo(arbitro);

    const partidosArbitro = obtenerPartidosArbitro(arbitro.id);
    const cedulasArbitro = obtenerCedulasArbitro(arbitro.id);

    const cedulasRegistradas = cedulasArbitro.filter(esCedulaRegistrada);

    const finalizados = partidosArbitro.filter(esPartidoFinalizado);

    const pendientes = partidosArbitro.filter(partido => {
        return !esPartidoFinalizado(partido);
    });

    modalArbitroInicial.textContent = obtenerIniciales(nombre);

    modalArbitroEstado.textContent =
        activo ? "Activo" : "Inactivo";

    modalArbitroEstado.className =
        `estado-arbitro ${activo ? "activo" : "inactivo"}`;

    modalArbitroNombre.textContent = nombre;

    modalPartidosAsignados.textContent = partidosArbitro.length;
    modalCedulasRegistradas.textContent = cedulasRegistradas.length;
    modalPartidosPendientes.textContent = pendientes.length;
    modalPartidosFinalizados.textContent = finalizados.length;

    modalNombreCompleto.textContent = nombre;
    modalCorreo.textContent = correo || "Sin correo registrado";
    modalEstadoCuenta.textContent = activo ? "Activa" : "Inactiva";

    renderizarPartidosArbitro(partidosArbitro);

    modalArbitro.classList.remove("hidden");
    modalArbitro.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
}

function renderizarPartidosArbitro(partidosArbitro) {
    const ordenados = [...partidosArbitro].sort(
        compararPartidosPorFecha
    );

    contadorPartidosArbitro.textContent = ordenados.length;

    if (!ordenados.length) {
        listaPartidosArbitro.innerHTML = "";
        listaPartidosArbitro.classList.add("hidden");
        sinPartidosArbitro.classList.remove("hidden");
        return;
    }

    sinPartidosArbitro.classList.add("hidden");
    listaPartidosArbitro.classList.remove("hidden");

    listaPartidosArbitro.innerHTML = ordenados
        .map(partido => {
            const local = obtenerNombreLocal(partido);
            const visitante = obtenerNombreVisitante(partido);
            const fecha = formatearFechaPartido(partido);
            const contexto = obtenerContextoPartido(partido);
            const estado = obtenerEstadoPartido(partido);

            return `
                <article class="partido-arbitro-card">

                    <div class="partido-arbitro-info">

                        <span>
                            ${escaparHTML(fecha)}
                        </span>

                        <strong>
                            ${escaparHTML(local)} vs ${escaparHTML(visitante)}
                        </strong>

                        <small>
                            ${escaparHTML(contexto)}
                        </small>

                    </div>

                    <span class="partido-arbitro-estado ${estado.clase}">
                        ${escaparHTML(estado.texto)}
                    </span>

                </article>
            `;
        })
        .join("");
}

function obtenerPartidosArbitro(arbitroId) {
    return partidos.filter(partido => {
        return obtenerArbitroIdPartido(partido) === arbitroId;
    });
}

function obtenerCedulasArbitro(arbitroId) {
    return cedulas.filter(cedula => {
        return obtenerArbitroIdCedula(cedula) === arbitroId;
    });
}

function obtenerArbitroIdPartido(partido) {
    return obtenerPrimerTexto(
        partido.arbitroId,
        partido.arbitroUid,
        partido.arbitroUID,
        partido.uidArbitro,
        partido.idArbitro
    );
}

function obtenerArbitroIdCedula(cedula) {
    return obtenerPrimerTexto(
        cedula.arbitroId,
        cedula.arbitroUid,
        cedula.arbitroUID,
        cedula.uidArbitro,
        cedula.idArbitro
    );
}

function esCedulaRegistrada(cedula) {
    const estado = normalizarTexto(cedula.estado);

    return (
        estado === "registrada" ||
        estado === "finalizada" ||
        estado === "finalizado" ||
        estado === "enviada"
    );
}

function esPartidoFinalizado(partido) {
    const estado = normalizarTexto(partido.estado);

    return (
        estado === "finalizado" ||
        estado === "finalizada" ||
        estado === "terminado" ||
        estado === "terminada" ||
        partido.resultadoRegistrado === true
    );
}

function obtenerEstadoPartido(partido) {
    const estado = normalizarTexto(partido.estado);

    if (
        estado === "cancelado" ||
        estado === "cancelada"
    ) {
        return {
            texto: "Cancelado",
            clase: "cancelado"
        };
    }

    if (esPartidoFinalizado(partido)) {
        return {
            texto: "Finalizado",
            clase: "finalizado"
        };
    }

    return {
        texto: "Pendiente",
        clase: "pendiente"
    };
}

function obtenerNombreLocal(partido) {
    return obtenerPrimerTexto(
        partido.localNombre,
        partido.equipoLocalNombre,
        partido.nombreLocal,
        partido.local
    ) || "Equipo local";
}

function obtenerNombreVisitante(partido) {
    return obtenerPrimerTexto(
        partido.visitanteNombre,
        partido.equipoVisitanteNombre,
        partido.nombreVisitante,
        partido.visitante
    ) || "Equipo visitante";
}

function obtenerContextoPartido(partido) {
    const partes = [];

    const categoria = obtenerPrimerTexto(
        partido.categoriaNombre,
        partido.nombreCategoria
    );

    const jornada = obtenerPrimerTexto(
        partido.jornadaNombre,
        partido.nombreJornada
    );

    const cancha = obtenerPrimerTexto(
        partido.cancha,
        partido.campo,
        partido.sede,
        partido.lugar
    );

    if (categoria) {
        partes.push(categoria);
    }

    if (jornada) {
        partes.push(jornada);
    }

    if (cancha) {
        partes.push(cancha);
    }

    return partes.length
        ? partes.join(" · ")
        : "Partido de liga";
}

function formatearFechaPartido(partido) {
    const fecha =
        partido.fecha ??
        partido.fechaPartido ??
        partido.fechaHora ??
        partido.programadoPara;

    const fechaConvertida = convertirAFecha(fecha);

    if (!fechaConvertida) {
        return "Fecha por definir";
    }

    const opciones = {
        day: "2-digit",
        month: "short",
        year: "numeric"
    };

    const hora =
        partido.hora ??
        partido.horaPartido;

    let resultado = fechaConvertida.toLocaleDateString(
        "es-MX",
        opciones
    );

    if (hora) {
        resultado += ` · ${hora}`;
    } else if (
        fechaConvertida.getHours() !== 0 ||
        fechaConvertida.getMinutes() !== 0
    ) {
        resultado += ` · ${fechaConvertida.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit"
        })}`;
    }

    return resultado;
}

function compararPartidosPorFecha(a, b) {
    const fechaA = convertirAFecha(
        a.fecha ??
        a.fechaPartido ??
        a.fechaHora ??
        a.programadoPara
    );

    const fechaB = convertirAFecha(
        b.fecha ??
        b.fechaPartido ??
        b.fechaHora ??
        b.programadoPara
    );

    if (!fechaA && !fechaB) {
        return 0;
    }

    if (!fechaA) {
        return 1;
    }

    if (!fechaB) {
        return -1;
    }

    return fechaB.getTime() - fechaA.getTime();
}

function convertirAFecha(valor) {
    if (!valor) {
        return null;
    }

    if (
        typeof valor === "object" &&
        typeof valor.toDate === "function"
    ) {
        const fecha = valor.toDate();

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime())
            ? null
            : valor;
    }

    if (typeof valor === "number") {
        const fecha = new Date(valor);

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    const texto = String(valor).trim();

    if (!texto) {
        return null;
    }

    const partes = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (partes) {
        const fecha = new Date(
            Number(partes[1]),
            Number(partes[2]) - 1,
            Number(partes[3])
        );

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    const fecha = new Date(texto);

    return Number.isNaN(fecha.getTime())
        ? null
        : fecha;
}

function obtenerNombreArbitro(arbitro) {
    return obtenerPrimerTexto(
        arbitro.nombreCompleto,
        arbitro.nombre,
        arbitro.displayName,
        arbitro.usuarioNombre
    ) || "Árbitro sin nombre";
}

function obtenerCorreoArbitro(arbitro) {
    return obtenerPrimerTexto(
        arbitro.correo,
        arbitro.email
    );
}

function estaActivo(arbitro) {
    if (arbitro.activo === false) {
        return false;
    }

    if (arbitro.suspendido === true) {
        return false;
    }

    const estado = normalizarTexto(arbitro.estado);

    if (
        estado === "inactivo" ||
        estado === "suspendido" ||
        estado === "bloqueado" ||
        estado === "deshabilitado"
    ) {
        return false;
    }

    return true;
}

function obtenerIniciales(nombre) {
    const palabras = obtenerTexto(nombre)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!palabras.length) {
        return "A";
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

function restablecerFiltros() {
    buscarArbitro.value = "";
    filtroEstado.value = "";
    filtroActividad.value = "";

    actualizarBotonBusqueda();
    aplicarFiltros();
}

function actualizarBotonBusqueda() {
    if (buscarArbitro.value.trim()) {
        btnLimpiarBusqueda.classList.remove("hidden");
    } else {
        btnLimpiarBusqueda.classList.add("hidden");
    }
}

function cerrarModal() {
    modalArbitro.classList.add("hidden");
    modalArbitro.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function mostrarCargando() {
    estadoCarga.classList.remove("hidden");
    estadoVacio.classList.add("hidden");
    listaArbitros.classList.add("hidden");
}

function mostrarErrorCarga() {
    estadoCarga.classList.add("hidden");
    listaArbitros.classList.add("hidden");
    estadoVacio.classList.remove("hidden");

    const titulo = estadoVacio.querySelector("strong");
    const descripcion = estadoVacio.querySelector("p");

    if (titulo) {
        titulo.textContent =
            "No se pudieron cargar los árbitros";
    }

    if (descripcion) {
        descripcion.textContent =
            "Ocurrió un problema al consultar la información. Intenta recargar la página.";
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

function normalizarRol(valor) {
    return normalizarTexto(valor)
        .replace(/\s+/g, "")
        .replace(/_/g, "")
        .replace(/-/g, "");
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