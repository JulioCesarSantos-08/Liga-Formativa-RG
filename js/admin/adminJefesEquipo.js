import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";

const totalJefes = document.getElementById("totalJefes");
const totalActivos = document.getElementById("totalActivos");
const totalEquipos = document.getElementById("totalEquipos");
const totalJugadores = document.getElementById("totalJugadores");
const contadorResultados = document.getElementById("contadorResultados");

const buscarJefe = document.getElementById("buscarJefe");
const btnLimpiarBusqueda = document.getElementById("btnLimpiarBusqueda");

const filtroEstado = document.getElementById("filtroEstado");
const filtroEquipos = document.getElementById("filtroEquipos");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const btnRestablecerFiltros = document.getElementById("btnRestablecerFiltros");
const listaJefes = document.getElementById("listaJefes");

const modalJefe = document.getElementById("modalJefe");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");

const modalJefeInicial = document.getElementById("modalJefeInicial");
const modalJefeEstado = document.getElementById("modalJefeEstado");
const modalJefeNombre = document.getElementById("modalJefeNombre");

const modalTotalEquipos = document.getElementById("modalTotalEquipos");
const modalTotalJugadores = document.getElementById("modalTotalJugadores");
const modalEquiposActivos = document.getElementById("modalEquiposActivos");
const modalEquiposDescalificados = document.getElementById("modalEquiposDescalificados");

const modalNombreCompleto = document.getElementById("modalNombreCompleto");
const modalCorreo = document.getElementById("modalCorreo");
const modalEstadoCuenta = document.getElementById("modalEstadoCuenta");

const contadorEquiposJefe = document.getElementById("contadorEquiposJefe");
const listaEquiposJefe = document.getElementById("listaEquiposJefe");
const sinEquiposJefe = document.getElementById("sinEquiposJefe");

let jefes = [];
let equipos = [];
let jugadores = [];
let jefesFiltrados = [];

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
    buscarJefe.addEventListener("input", () => {
        actualizarBotonBusqueda();
        aplicarFiltros();
    });

    btnLimpiarBusqueda.addEventListener("click", () => {
        buscarJefe.value = "";
        actualizarBotonBusqueda();
        aplicarFiltros();
        buscarJefe.focus();
    });

    filtroEstado.addEventListener("change", aplicarFiltros);
    filtroEquipos.addEventListener("change", aplicarFiltros);

    btnRestablecerFiltros.addEventListener("click", restablecerFiltros);

    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCerrarDetalle.addEventListener("click", cerrarModal);

    document.querySelectorAll("[data-cerrar-modal]").forEach(elemento => {
        elemento.addEventListener("click", cerrarModal);
    });

    document.addEventListener("keydown", evento => {
        if (
            evento.key === "Escape" &&
            !modalJefe.classList.contains("hidden")
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
            equiposSnapshot,
            jugadoresSnapshot
        ] = await Promise.all([
            getDocs(collection(db, "usuarios")),
            getDocs(collection(db, "equipos")),
            getDocs(collection(db, "jugadores"))
        ]);

        jefes = usuariosSnapshot.docs
            .map(documento => ({
                id: documento.id,
                ...documento.data()
            }))
            .filter(usuario => esRolJefe(usuario.rol));

        equipos = equiposSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        jugadores = jugadoresSnapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        jefes.sort((a, b) => {
            return obtenerNombreJefe(a).localeCompare(
                obtenerNombreJefe(b),
                "es",
                {
                    sensitivity: "base"
                }
            );
        });

        actualizarResumen();
        aplicarFiltros();
    } catch (error) {
        console.error("Error al cargar jefes de equipo:", error);
        mostrarErrorCarga();
    }
}

function actualizarResumen() {
    const activos = jefes.filter(estaActivo);

    const idsJefes = new Set(
        jefes.map(jefe => jefe.id)
    );

    const equiposAdministrados = equipos.filter(equipo => {
        const responsableId = obtenerResponsableId(equipo);

        return responsableId && idsJefes.has(responsableId);
    });

    const idsEquipos = new Set(
        equiposAdministrados.map(equipo => equipo.id)
    );

    const jugadoresAdministrados = jugadores.filter(jugador => {
        return idsEquipos.has(obtenerEquipoIdJugador(jugador));
    });

    totalJefes.textContent = jefes.length;
    totalActivos.textContent = activos.length;
    totalEquipos.textContent = equiposAdministrados.length;
    totalJugadores.textContent = jugadoresAdministrados.length;
}

function aplicarFiltros() {
    const busqueda = normalizarTexto(buscarJefe.value);
    const estado = filtroEstado.value;
    const filtroCantidadEquipos = filtroEquipos.value;

    jefesFiltrados = jefes.filter(jefe => {
        const nombre = normalizarTexto(obtenerNombreJefe(jefe));
        const correo = normalizarTexto(obtenerCorreoJefe(jefe));

        const equiposJefe = obtenerEquiposJefe(jefe.id);

        const nombresEquipos = normalizarTexto(
            equiposJefe
                .map(equipo => obtenerNombreEquipo(equipo))
                .join(" ")
        );

        const coincideBusqueda =
            !busqueda ||
            nombre.includes(busqueda) ||
            correo.includes(busqueda) ||
            nombresEquipos.includes(busqueda);

        let coincideEstado = true;

        if (estado === "activo") {
            coincideEstado = estaActivo(jefe);
        }

        if (estado === "inactivo") {
            coincideEstado = !estaActivo(jefe);
        }

        let coincideEquipos = true;

        if (filtroCantidadEquipos === "conEquipos") {
            coincideEquipos = equiposJefe.length > 0;
        }

        if (filtroCantidadEquipos === "sinEquipos") {
            coincideEquipos = equiposJefe.length === 0;
        }

        if (filtroCantidadEquipos === "multiples") {
            coincideEquipos = equiposJefe.length > 1;
        }

        return (
            coincideBusqueda &&
            coincideEstado &&
            coincideEquipos
        );
    });

    renderizarJefes();
}

function renderizarJefes() {
    estadoCarga.classList.add("hidden");

    contadorResultados.textContent = jefesFiltrados.length;

    if (!jefesFiltrados.length) {
        listaJefes.innerHTML = "";
        listaJefes.classList.add("hidden");
        estadoVacio.classList.remove("hidden");
        return;
    }

    estadoVacio.classList.add("hidden");
    listaJefes.classList.remove("hidden");

    listaJefes.innerHTML = jefesFiltrados
        .map(crearTarjetaJefe)
        .join("");

    listaJefes
        .querySelectorAll("[data-jefe-id]")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                abrirJefe(boton.dataset.jefeId);
            });
        });
}

function crearTarjetaJefe(jefe) {
    const nombre = obtenerNombreJefe(jefe);
    const correo = obtenerCorreoJefe(jefe);
    const activo = estaActivo(jefe);

    const equiposJefe = obtenerEquiposJefe(jefe.id);
    const jugadoresJefe = obtenerJugadoresEquipos(equiposJefe);

    const equiposActivos = equiposJefe.filter(equipo => {
        return equipoEstaActivo(equipo);
    }).length;

    const textoEquipos = equiposJefe.length === 1
        ? "1 equipo"
        : `${equiposJefe.length} equipos`;

    const textoJugadores = jugadoresJefe.length === 1
        ? "1 jugador"
        : `${jugadoresJefe.length} jugadores`;

    return `
        <article class="jefe-admin-card ${activo ? "activo" : "inactivo"}">

            <div class="jefe-avatar">
                ${escaparHTML(obtenerIniciales(nombre))}
            </div>

            <div class="jefe-card-info">

                <span class="jefe-card-estado ${activo ? "activo" : "inactivo"}">
                    ${activo ? "Activo" : "Inactivo"}
                </span>

                <h3>
                    ${escaparHTML(nombre)}
                </h3>

                <p>
                    ${escaparHTML(correo || "Sin correo registrado")}
                </p>

                <div class="jefe-card-meta">

                    <span>
                        🛡️ ${escaparHTML(textoEquipos)}
                    </span>

                    <span>
                        👕 ${escaparHTML(textoJugadores)}
                    </span>

                    <span>
                        🟢 ${equiposActivos} activos
                    </span>

                </div>

            </div>

            <button
                type="button"
                class="btn-ver-jefe"
                data-jefe-id="${escaparAtributo(jefe.id)}"
                aria-label="Ver jefe ${escaparAtributo(nombre)}"
            >
                ›
            </button>

        </article>
    `;
}

function abrirJefe(jefeId) {
    const jefe = jefes.find(item => item.id === jefeId);

    if (!jefe) {
        return;
    }

    const nombre = obtenerNombreJefe(jefe);
    const correo = obtenerCorreoJefe(jefe);
    const activo = estaActivo(jefe);

    const equiposJefe = obtenerEquiposJefe(jefe.id);
    const jugadoresJefe = obtenerJugadoresEquipos(equiposJefe);

    const equiposActivos = equiposJefe.filter(equipo => {
        return equipoEstaActivo(equipo);
    });

    const equiposDescalificados = equiposJefe.filter(equipo => {
        return equipo.descalificado === true;
    });

    modalJefeInicial.textContent = obtenerIniciales(nombre);

    modalJefeEstado.textContent =
        activo ? "Activo" : "Inactivo";

    modalJefeEstado.className =
        `estado-jefe ${activo ? "activo" : "inactivo"}`;

    modalJefeNombre.textContent = nombre;

    modalTotalEquipos.textContent = equiposJefe.length;
    modalTotalJugadores.textContent = jugadoresJefe.length;
    modalEquiposActivos.textContent = equiposActivos.length;
    modalEquiposDescalificados.textContent =
        equiposDescalificados.length;

    modalNombreCompleto.textContent = nombre;
    modalCorreo.textContent =
        correo || "Sin correo registrado";

    modalEstadoCuenta.textContent =
        activo ? "Activa" : "Inactiva";

    renderizarEquiposJefe(equiposJefe);

    modalJefe.classList.remove("hidden");
    modalJefe.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
}

function renderizarEquiposJefe(equiposJefe) {
    const equiposOrdenados = [...equiposJefe].sort((a, b) => {
        return obtenerNombreEquipo(a).localeCompare(
            obtenerNombreEquipo(b),
            "es",
            {
                sensitivity: "base"
            }
        );
    });

    contadorEquiposJefe.textContent = equiposOrdenados.length;

    if (!equiposOrdenados.length) {
        listaEquiposJefe.innerHTML = "";
        listaEquiposJefe.classList.add("hidden");
        sinEquiposJefe.classList.remove("hidden");
        return;
    }

    sinEquiposJefe.classList.add("hidden");
    listaEquiposJefe.classList.remove("hidden");

    listaEquiposJefe.innerHTML = equiposOrdenados
        .map(crearTarjetaEquipo)
        .join("");
}

function crearTarjetaEquipo(equipo) {
    const nombre = obtenerNombreEquipo(equipo);
    const categoria = obtenerCategoriaEquipo(equipo);

    const jugadoresEquipo = obtenerJugadoresEquipo(equipo.id);

    const estado = obtenerEstadoEquipo(equipo);

    const logo = obtenerLogoEquipo(equipo);

    const logoHTML = logo
        ? `
            <img
                src="${escaparAtributo(logo)}"
                alt="${escaparAtributo(nombre)}"
                loading="lazy"
            >
        `
        : `
            <span>
                ${escaparHTML(obtenerInicialesEquipo(nombre))}
            </span>
        `;

    return `
        <article class="equipo-jefe-card">

            <div class="equipo-jefe-logo">
                ${logoHTML}
            </div>

            <div class="equipo-jefe-info">

                <strong>
                    ${escaparHTML(nombre)}
                </strong>

                <span>
                    ${escaparHTML(categoria)}
                </span>

                <small>
                    ${jugadoresEquipo.length} ${
                        jugadoresEquipo.length === 1
                            ? "jugador"
                            : "jugadores"
                    }
                </small>

            </div>

            <span class="equipo-jefe-estado ${estado.clase}">
                ${escaparHTML(estado.texto)}
            </span>

        </article>
    `;
}

function obtenerEquiposJefe(jefeId) {
    return equipos.filter(equipo => {
        return obtenerResponsableId(equipo) === jefeId;
    });
}

function obtenerJugadoresEquipos(equiposJefe) {
    if (!equiposJefe.length) {
        return [];
    }

    const idsEquipos = new Set(
        equiposJefe.map(equipo => equipo.id)
    );

    return jugadores.filter(jugador => {
        return idsEquipos.has(
            obtenerEquipoIdJugador(jugador)
        );
    });
}

function obtenerJugadoresEquipo(equipoId) {
    return jugadores.filter(jugador => {
        return obtenerEquipoIdJugador(jugador) === equipoId;
    });
}

function obtenerResponsableId(equipo) {
    return obtenerPrimerTexto(
        equipo.responsableId,
        equipo.jefeEquipoId,
        equipo.jefeId,
        equipo.responsableUid,
        equipo.responsableUID,
        equipo.uidResponsable
    );
}

function obtenerEquipoIdJugador(jugador) {
    return obtenerPrimerTexto(
        jugador.equipoId,
        jugador.idEquipo,
        jugador.clubId
    );
}

function obtenerNombreEquipo(equipo) {
    return obtenerPrimerTexto(
        equipo.nombre,
        equipo.nombreEquipo,
        equipo.equipoNombre
    ) || "Equipo sin nombre";
}

function obtenerCategoriaEquipo(equipo) {
    return obtenerPrimerTexto(
        equipo.categoriaNombre,
        equipo.nombreCategoria,
        equipo.categoria
    ) || "Categoría sin especificar";
}

function obtenerLogoEquipo(equipo) {
    return obtenerPrimerTexto(
        equipo.logoUrl,
        equipo.logoURL,
        equipo.logo,
        equipo.imagenUrl
    );
}

function obtenerEstadoEquipo(equipo) {
    if (equipo.descalificado === true) {
        return {
            texto: "Descalificado",
            clase: "descalificado"
        };
    }

    if (!equipoEstaActivo(equipo)) {
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

function equipoEstaActivo(equipo) {
    if (equipo.descalificado === true) {
        return false;
    }

    if (equipo.activo === false) {
        return false;
    }

    const estado = normalizarTexto(equipo.estado);

    if (
        estado === "inactivo" ||
        estado === "descalificado" ||
        estado === "suspendido" ||
        estado === "eliminado"
    ) {
        return false;
    }

    return true;
}

function obtenerNombreJefe(jefe) {
    return obtenerPrimerTexto(
        jefe.nombreCompleto,
        jefe.nombre,
        jefe.displayName,
        jefe.usuarioNombre
    ) || "Jefe sin nombre";
}

function obtenerCorreoJefe(jefe) {
    return obtenerPrimerTexto(
        jefe.correo,
        jefe.email
    );
}

function estaActivo(jefe) {
    if (jefe.activo === false) {
        return false;
    }

    if (jefe.suspendido === true) {
        return false;
    }

    const estado = normalizarTexto(jefe.estado);

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

function esRolJefe(rol) {
    const rolNormalizado = normalizarRol(rol);

    return (
        rolNormalizado === "jefeequipo" ||
        rolNormalizado === "jefedeequipo"
    );
}

function obtenerIniciales(nombre) {
    const palabras = obtenerTexto(nombre)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!palabras.length) {
        return "JE";
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

function obtenerInicialesEquipo(nombre) {
    const palabras = obtenerTexto(nombre)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!palabras.length) {
        return "EQ";
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
    buscarJefe.value = "";
    filtroEstado.value = "";
    filtroEquipos.value = "";

    actualizarBotonBusqueda();
    aplicarFiltros();
}

function actualizarBotonBusqueda() {
    if (buscarJefe.value.trim()) {
        btnLimpiarBusqueda.classList.remove("hidden");
    } else {
        btnLimpiarBusqueda.classList.add("hidden");
    }
}

function cerrarModal() {
    modalJefe.classList.add("hidden");
    modalJefe.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function mostrarCargando() {
    estadoCarga.classList.remove("hidden");
    estadoVacio.classList.add("hidden");
    listaJefes.classList.add("hidden");
}

function mostrarErrorCarga() {
    estadoCarga.classList.add("hidden");
    listaJefes.classList.add("hidden");
    estadoVacio.classList.remove("hidden");

    const titulo = estadoVacio.querySelector("strong");
    const descripcion = estadoVacio.querySelector("p");

    if (titulo) {
        titulo.textContent =
            "No se pudieron cargar los jefes de equipo";
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