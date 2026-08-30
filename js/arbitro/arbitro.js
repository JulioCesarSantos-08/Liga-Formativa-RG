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


const nombreArbitro = document.getElementById("nombreArbitro");
const correoArbitro = document.getElementById("correoArbitro");
const arbitroInicial = document.getElementById("arbitroInicial");

const btnCerrarSesion = document.getElementById("btnCerrarSesion");

const totalPartidos = document.getElementById("totalPartidos");
const totalProximos = document.getElementById("totalProximos");
const totalPendientes = document.getElementById("totalPendientes");
const totalRegistradas = document.getElementById("totalRegistradas");

const filtroPartidos = document.getElementById("filtroPartidos");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const listaPartidos = document.getElementById("listaPartidos");

const navItems = document.querySelectorAll("[data-filtro]");

const modalPartido = document.getElementById("modalPartido");

const modalTitulo = document.getElementById("modalTitulo");
const modalLogoLocal = document.getElementById("modalLogoLocal");
const modalLogoVisitante = document.getElementById("modalLogoVisitante");

const modalLocal = document.getElementById("modalLocal");
const modalVisitante = document.getElementById("modalVisitante");

const modalJornada = document.getElementById("modalJornada");
const modalCategoria = document.getElementById("modalCategoria");

const modalFecha = document.getElementById("modalFecha");
const modalHora = document.getElementById("modalHora");
const modalCampo = document.getElementById("modalCampo");
const modalEstado = document.getElementById("modalEstado");

const avisoCedulaPendiente = document.getElementById("avisoCedulaPendiente");
const avisoCedulaRegistrada = document.getElementById("avisoCedulaRegistrada");

const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");
const btnAbrirPartido = document.getElementById("btnAbrirPartido");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let usuarioActual = null;

let partidos = [];
let equipos = [];
let cedulas = [];

let partidoSeleccionado = null;

let filtroActual = "todos";

let toastTimer = null;


const usuario = await protegerPagina([
    "arbitro",
    "admin"
]);


if (usuario) {

    usuarioActual = usuario;

    cargarPerfil(usuario);
    activarEventos();

    await cargarDatos();

}


function cargarPerfil(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Árbitro";


    nombreArbitro.textContent =
        obtenerPrimerNombre(nombre);


    correoArbitro.textContent =
        usuario.email ||
        "Sin correo";


    arbitroInicial.textContent =
        obtenerInicial(nombre);

}


function activarEventos() {

    btnCerrarSesion.addEventListener(
        "click",
        async () => {

            btnCerrarSesion.disabled =
                true;


            await cerrarSesion();

        }
    );


    filtroPartidos.addEventListener(
        "change",
        () => {

            filtroActual =
                filtroPartidos.value;


            sincronizarNavegacion();

            aplicarFiltro();

        }
    );


    navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    const filtro =
                        item.dataset.filtro;


                    if (!filtro) {
                        return;
                    }


                    filtroActual =
                        filtro;


                    filtroPartidos.value =
                        filtro;


                    sincronizarNavegacion();

                    aplicarFiltro();

                }
            );

        }
    );


    btnCerrarModal.addEventListener(
        "click",
        cerrarModal
    );


    btnCerrarDetalle.addEventListener(
        "click",
        cerrarModal
    );


    modalPartido.addEventListener(
        "click",
        event => {

            if (
                event.target === modalPartido
            ) {

                cerrarModal();

            }

        }
    );


    btnAbrirPartido.addEventListener(
        "click",
        () => {

            if (!partidoSeleccionado) {
                return;
            }


            window.location.href =
                `partidoArbitro.html?id=${partidoSeleccionado.id}`;

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !modalPartido.classList.contains("oculto")
            ) {

                cerrarModal();

            }

        }
    );

}


async function cargarDatos() {

    mostrarCarga();


    try {

        const [
            snapshotPartidos,
            snapshotEquipos,
            snapshotCedulas
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "partidos"
                )
            ),

            getDocs(
                collection(
                    db,
                    "equipos"
                )
            ),

            getDocs(
                collection(
                    db,
                    "cedulas"
                )
            )

        ]);


        equipos =
            snapshotEquipos.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        cedulas =
            snapshotCedulas.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        const todosLosPartidos =
            snapshotPartidos.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        partidos =
            todosLosPartidos
                .filter(
                    partido => {

                        if (
                            usuarioActual.rol === "admin"
                        ) {

                            return true;

                        }


                        return (
                            partido.arbitroId ===
                            usuarioActual.uid ||
                            partido.arbitroId ===
                            usuarioActual.id
                        );

                    }
                )
                .sort(
                    ordenarPartidos
                );


        actualizarResumen();

        aplicarFiltro();

    } catch (error) {

        console.error(
            "Error cargando partidos del árbitro:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        listaPartidos.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            "No pudimos cargar tus partidos";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            "Revisa la conexión con Firebase e intenta nuevamente.";

    }

}


function mostrarCarga() {

    estadoCarga.classList.remove(
        "oculto"
    );


    estadoVacio.classList.add(
        "oculto"
    );


    listaPartidos.classList.add(
        "oculto"
    );

}


function actualizarResumen() {

    totalPartidos.textContent =
        partidos.length;


    totalProximos.textContent =
        partidos.filter(
            partido =>
                partido.estado === "proximo"
        ).length;


    totalPendientes.textContent =
        partidos.filter(
            partido =>
                !tieneCedula(partido)
        ).length;


    totalRegistradas.textContent =
        partidos.filter(
            partido =>
                tieneCedula(partido)
        ).length;

}


function aplicarFiltro() {

    const filtrados =
        partidos.filter(
            partido => {

                if (
                    filtroActual === "proximos"
                ) {

                    return (
                        partido.estado ===
                        "proximo"
                    );

                }


                if (
                    filtroActual === "pendientes"
                ) {

                    return !tieneCedula(
                        partido
                    );

                }


                if (
                    filtroActual === "registrados"
                ) {

                    return tieneCedula(
                        partido
                    );

                }


                return true;

            }
        );


    renderizarPartidos(
        filtrados
    );

}


function renderizarPartidos(lista) {

    estadoCarga.classList.add(
        "oculto"
    );


    listaPartidos.innerHTML =
        "";


    if (!lista.length) {

        listaPartidos.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            filtroActual === "todos"
                ? "No tienes partidos asignados"
                : "No hay partidos en este filtro";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            filtroActual === "todos"
                ? "Cuando un administrador te asigne un encuentro, aparecerá automáticamente en este apartado."
                : "Prueba seleccionando otra opción para consultar tus encuentros.";


        return;

    }


    estadoVacio.classList.add(
        "oculto"
    );


    listaPartidos.classList.remove(
        "oculto"
    );


    lista.forEach(
        partido => {

            const local =
                equipos.find(
                    equipo =>
                        equipo.id ===
                        partido.localId
                );


            const visitante =
                equipos.find(
                    equipo =>
                        equipo.id ===
                        partido.visitanteId
                );


            const cedulaRegistrada =
                tieneCedula(
                    partido
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "partido-card";


            card.innerHTML = `

                <div class="partido-card-top">

                    <div class="partido-card-meta">

                        <span class="partido-badge categoria">
                            ${escaparHTML(
                                partido.categoriaNombre ||
                                "Sin categoría"
                            )}
                        </span>


                        <span class="partido-badge jornada">
                            ${escaparHTML(
                                partido.jornadaNombre ||
                                "Sin jornada"
                            )}
                        </span>

                    </div>


                    <span class="estado-partido ${partido.estado || "proximo"}">
                        ${textoEstadoPartido(
                            partido.estado
                        )}
                    </span>

                </div>


                <div class="partido-enfrentamiento">

                    <div class="equipo-card">

                        <div class="equipo-logo-card">
                            ${obtenerLogoHTML(
                                local,
                                partido.localNombre,
                                "L"
                            )}
                        </div>

                        <strong>
                            ${escaparHTML(
                                partido.localNombre ||
                                "Local"
                            )}
                        </strong>

                    </div>


                    <div class="vs-card">
                        VS
                    </div>


                    <div class="equipo-card visitante">

                        <div class="equipo-logo-card">
                            ${obtenerLogoHTML(
                                visitante,
                                partido.visitanteNombre,
                                "V"
                            )}
                        </div>

                        <strong>
                            ${escaparHTML(
                                partido.visitanteNombre ||
                                "Visitante"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="partido-datos">

                    <div>

                        <span>
                            Fecha
                        </span>

                        <strong>
                            ${formatearFecha(
                                partido.fecha
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Hora
                        </span>

                        <strong>
                            ${formatearHora(
                                partido.hora
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Campo
                        </span>

                        <strong>
                            ${escaparHTML(
                                partido.campo ||
                                "Por definir"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="partido-cedula">

                    <div>

                        <span>
                            Cédula
                        </span>

                        <strong>
                            ${
                                cedulaRegistrada
                                    ? "Registro enviado"
                                    : "Pendiente"
                            }
                        </strong>

                    </div>


                    <span class="cedula-badge ${
                        cedulaRegistrada
                            ? "registrada"
                            : "pendiente"
                    }">

                        ${
                            cedulaRegistrada
                                ? "✓ Registrada"
                                : "⏳ Pendiente"
                        }

                    </span>

                </div>


                <button
                    type="button"
                    class="btn-ver-partido"
                >
                    ${
                        cedulaRegistrada
                            ? "Ver partido"
                            : "Abrir partido"
                    }
                </button>

            `;


            card.querySelector(
                ".btn-ver-partido"
            ).addEventListener(
                "click",
                () => {

                    abrirDetalle(
                        partido.id
                    );

                }
            );


            listaPartidos.appendChild(
                card
            );

        }
    );

}


function abrirDetalle(partidoId) {

    const partido =
        partidos.find(
            item =>
                item.id === partidoId
        );


    if (!partido) {
        return;
    }


    if (
        usuarioActual.rol !== "admin" &&
        partido.arbitroId !== usuarioActual.uid &&
        partido.arbitroId !== usuarioActual.id
    ) {

        mostrarToast(
            "error",
            "Acceso no permitido",
            "Este encuentro no está asignado a tu cuenta."
        );

        return;

    }


    partidoSeleccionado =
        partido;


    modalTitulo.textContent =
        `${partido.localNombre || "Local"} vs ${partido.visitanteNombre || "Visitante"}`;


    modalLocal.textContent =
        partido.localNombre ||
        "Local";


    modalVisitante.textContent =
        partido.visitanteNombre ||
        "Visitante";


    modalJornada.textContent =
        partido.jornadaNombre ||
        "Sin jornada";


    modalCategoria.textContent =
        partido.categoriaNombre ||
        "Sin categoría";


    modalFecha.textContent =
        formatearFecha(
            partido.fecha
        );


    modalHora.textContent =
        formatearHora(
            partido.hora
        );


    modalCampo.textContent =
        partido.campo ||
        "Sin definir";


    modalEstado.textContent =
        textoEstadoPartido(
            partido.estado
        );


    const local =
        equipos.find(
            equipo =>
                equipo.id ===
                partido.localId
        );


    const visitante =
        equipos.find(
            equipo =>
                equipo.id ===
                partido.visitanteId
        );


    cargarLogoModal(
        modalLogoLocal,
        local,
        partido.localNombre,
        "L"
    );


    cargarLogoModal(
        modalLogoVisitante,
        visitante,
        partido.visitanteNombre,
        "V"
    );


    const registrada =
        tieneCedula(
            partido
        );


    avisoCedulaPendiente.classList.toggle(
        "oculto",
        registrada
    );


    avisoCedulaRegistrada.classList.toggle(
        "oculto",
        !registrada
    );


    btnAbrirPartido.textContent =
        registrada
            ? "Ver partido"
            : "Abrir partido";


    modalPartido.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cargarLogoModal(
    contenedor,
    equipo,
    nombre,
    inicial
) {

    if (
        equipo?.logoUrl
    ) {

        contenedor.innerHTML = `
            <img
                src="${escaparHTML(equipo.logoUrl)}"
                alt="${escaparHTML(nombre || "Equipo")}"
            >
        `;

        return;

    }


    contenedor.textContent =
        obtenerInicial(
            nombre ||
            inicial
        );

}


function tieneCedula(partido) {

    const existeDocumento =
        cedulas.some(
            cedula =>
                cedula.partidoId ===
                partido.id
        );


    return (
        existeDocumento ||
        partido.cedulaCreada === true ||
        partido.resultadoRegistrado === true
    );

}


function obtenerLogoHTML(
    equipo,
    nombre,
    inicial
) {

    if (
        equipo?.logoUrl
    ) {

        return `
            <img
                src="${escaparHTML(equipo.logoUrl)}"
                alt="${escaparHTML(nombre || "Equipo")}"
            >
        `;

    }


    return escaparHTML(
        obtenerInicial(
            nombre ||
            inicial
        )
    );

}


function sincronizarNavegacion() {

    navItems.forEach(
        item => {

            item.classList.toggle(
                "activo",
                item.dataset.filtro ===
                filtroActual
            );

        }
    );

}


function cerrarModal() {

    modalPartido.classList.add(
        "oculto"
    );


    partidoSeleccionado =
        null;


    document.body.style.overflow =
        "";

}


function ordenarPartidos(a, b) {

    const valorA =
        `${a.fecha || "9999-12-31"}T${a.hora || "23:59"}`;


    const valorB =
        `${b.fecha || "9999-12-31"}T${b.hora || "23:59"}`;


    return valorA.localeCompare(
        valorB
    );

}


function textoEstadoPartido(estado) {

    switch (estado) {

        case "enJuego":
            return "En juego";

        case "finalizado":
            return "Finalizado";

        case "cancelado":
            return "Cancelado";

        case "proximo":
        default:
            return "Próximo";

    }

}


function formatearFecha(fecha) {

    if (!fecha) {
        return "Sin definir";
    }


    const partes =
        String(fecha).split("-");


    if (
        partes.length !== 3
    ) {

        return fecha;

    }


    const objeto =
        new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );


    return objeto.toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function formatearHora(hora) {

    if (!hora) {
        return "Sin definir";
    }


    const partes =
        String(hora).split(":");


    const horas =
        Number(partes[0]);


    const minutos =
        partes[1] || "00";


    const periodo =
        horas >= 12
            ? "PM"
            : "AM";


    const hora12 =
        horas % 12 || 12;


    return `${hora12}:${minutos} ${periodo}`;

}


function obtenerInicial(nombre) {

    const texto =
        String(nombre || "")
            .trim();


    if (!texto) {
        return "A";
    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function obtenerPrimerNombre(nombre) {

    const texto =
        String(nombre || "")
            .trim();


    if (!texto) {
        return "Árbitro";
    }


    return texto
        .split(/\s+/)[0];

}


function escaparHTML(texto) {

    return String(texto || "")
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