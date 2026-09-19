import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    increment,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";

import {
    registrarAuditoria
} from "../auditoria.js";


const adminInicial = document.getElementById("adminInicial");

const totalPartidos = document.getElementById("totalPartidos");
const totalProximos = document.getElementById("totalProximos");
const totalEnJuego = document.getElementById("totalEnJuego");
const totalFinalizados = document.getElementById("totalFinalizados");

const buscarPartido = document.getElementById("buscarPartido");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroJornada = document.getElementById("filtroJornada");
const filtroEstado = document.getElementById("filtroEstado");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const listaPartidos = document.getElementById("listaPartidos");

const btnNuevoPartido = document.getElementById("btnNuevoPartido");

const modalPartido = document.getElementById("modalPartido");
const modalTitulo = document.getElementById("modalTitulo");

const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarModal = document.getElementById("btnCancelarModal");
const btnGuardarPartido = document.getElementById("btnGuardarPartido");

const formPartido = document.getElementById("formPartido");

const categoriaPartido = document.getElementById("categoriaPartido");
const jornadaPartido = document.getElementById("jornadaPartido");

const equipoLocal = document.getElementById("equipoLocal");
const equipoVisitante = document.getElementById("equipoVisitante");

const previewLocal = document.getElementById("previewLocal");
const previewVisitante = document.getElementById("previewVisitante");

const fechaPartido = document.getElementById("fechaPartido");
const horaPartido = document.getElementById("horaPartido");
const campoPartido = document.getElementById("campoPartido");
const arbitroPartido = document.getElementById("arbitroPartido");
const observacionesPartido = document.getElementById("observacionesPartido");

const btnEstadoProximo = document.getElementById("btnEstadoProximo");
const btnEstadoEnJuego = document.getElementById("btnEstadoEnJuego");
const btnEstadoFinalizado = document.getElementById("btnEstadoFinalizado");
const btnEstadoCancelado = document.getElementById("btnEstadoCancelado");

const grupoMotivoCancelacion = document.getElementById("grupoMotivoCancelacion");
const motivoCancelacion = document.getElementById("motivoCancelacion");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let categorias = [];
let jornadas = [];
let equipos = [];
let arbitros = [];
let partidos = [];

let partidoSeleccionado = null;
let estadoSeleccionado = "proximo";

let toastTimer = null;


const usuario = await protegerPagina([
    "admin"
]);


if (usuario) {

    cargarAdministrador(usuario);

    activarEventos();

    await cargarDatosBase();

    await cargarPartidos();

    aplicarParametrosURL();

}


function cargarAdministrador(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Administrador";

    adminInicial.textContent =
        obtenerInicial(nombre);

}


function activarEventos() {

    btnNuevoPartido.addEventListener(
        "click",
        abrirModalNuevoPartido
    );


    buscarPartido.addEventListener(
        "input",
        aplicarFiltros
    );


    filtroCategoria.addEventListener(
        "change",
        () => {

            actualizarFiltroJornadas();
            aplicarFiltros();

        }
    );


    filtroJornada.addEventListener(
        "change",
        aplicarFiltros
    );


    filtroEstado.addEventListener(
        "change",
        aplicarFiltros
    );


    categoriaPartido.addEventListener(
        "change",
        () => {

            actualizarJornadasModal();
            actualizarEquiposModal();

        }
    );


    equipoLocal.addEventListener(
        "change",
        () => {

            actualizarPreviewEquipo(
                equipoLocal.value,
                previewLocal,
                "L"
            );

            actualizarEquiposDisponibles();

        }
    );


    equipoVisitante.addEventListener(
        "change",
        () => {

            actualizarPreviewEquipo(
                equipoVisitante.value,
                previewVisitante,
                "V"
            );

            actualizarEquiposDisponibles();

        }
    );


    btnEstadoProximo.addEventListener(
        "click",
        () => seleccionarEstado("proximo")
    );


    btnEstadoEnJuego.addEventListener(
        "click",
        () => seleccionarEstado("enJuego")
    );


    btnEstadoFinalizado.addEventListener(
        "click",
        () => seleccionarEstado("finalizado")
    );


    btnEstadoCancelado.addEventListener(
        "click",
        () => seleccionarEstado("cancelado")
    );


    btnCerrarModal.addEventListener(
        "click",
        cerrarModal
    );


    btnCancelarModal.addEventListener(
        "click",
        cerrarModal
    );


    modalPartido.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modalPartido
            ) {

                cerrarModal();

            }

        }
    );


    formPartido.addEventListener(
        "submit",
        guardarPartido
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !modalPartido.classList.contains("oculto")
            ) {

                cerrarModal();

            }

        }
    );

}


async function cargarDatosBase() {

    try {

        const [
            snapshotCategorias,
            snapshotJornadas,
            snapshotEquipos,
            snapshotUsuarios
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "categorias"
                )
            ),

            getDocs(
                collection(
                    db,
                    "jornadas"
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
                    "usuarios"
                )
            )

        ]);


        categorias =
            snapshotCategorias.docs
                .map(
                    documento => ({
                        id: documento.id,
                        ...documento.data()
                    })
                )
                .filter(
                    categoria =>
                        categoria.activo !== false
                )
                .sort(
                    (a, b) =>
                        (a.nombre || "")
                            .localeCompare(
                                b.nombre || "",
                                "es"
                            )
                );


        jornadas =
            snapshotJornadas.docs
                .map(
                    documento => ({
                        id: documento.id,
                        ...documento.data()
                    })
                )
                .sort(
                    (a, b) =>
                        Number(a.numero || 0) -
                        Number(b.numero || 0)
                );


        equipos =
            snapshotEquipos.docs
                .map(
                    documento => ({
                        id: documento.id,
                        ...documento.data()
                    })
                );


        arbitros =
            snapshotUsuarios.docs
                .map(
                    documento => ({
                        id: documento.id,
                        ...documento.data()
                    })
                )
                .filter(
                    usuario =>
                        usuario.rol === "arbitro" &&
                        usuario.activo !== false
                )
                .sort(
                    (a, b) =>
                        (a.nombre || "")
                            .localeCompare(
                                b.nombre || "",
                                "es"
                            )
                );


        llenarCategorias();

        llenarArbitros();

        actualizarFiltroJornadas();

    } catch (error) {

        console.error(
            "Error cargando datos base:",
            error
        );


        mostrarToast(
            "error",
            "No se pudieron cargar los datos",
            "Revisa la conexión con Firestore."
        );

    }

}


async function cargarPartidos() {

    mostrarCarga();


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "partidos"
                )
            );


        partidos =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        partidos.sort(
            ordenarPartidos
        );


        actualizarResumen();

        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando partidos:",
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
            "No pudimos cargar los partidos";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            "Revisa la conexión con Firebase e intenta nuevamente.";

    }

}


function llenarCategorias() {

    categoriaPartido.innerHTML = `
        <option value="">
            Selecciona una categoría
        </option>
    `;


    filtroCategoria.innerHTML = `
        <option value="todas">
            Todas las categorías
        </option>
    `;


    categorias.forEach(
        categoria => {

            const optionModal =
                document.createElement(
                    "option"
                );

            optionModal.value =
                categoria.id;

            optionModal.textContent =
                categoria.nombre ||
                "Sin nombre";

            categoriaPartido.appendChild(
                optionModal
            );


            const optionFiltro =
                document.createElement(
                    "option"
                );

            optionFiltro.value =
                categoria.id;

            optionFiltro.textContent =
                categoria.nombre ||
                "Sin nombre";

            filtroCategoria.appendChild(
                optionFiltro
            );

        }
    );

}


function llenarArbitros() {

    arbitroPartido.innerHTML = `
        <option value="">
            Selecciona un árbitro
        </option>
    `;


    arbitros.forEach(
        arbitro => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                arbitro.id;

            option.textContent =
                arbitro.nombre ||
                arbitro.email ||
                "Árbitro";

            arbitroPartido.appendChild(
                option
            );

        }
    );

}


function actualizarFiltroJornadas() {

    const categoriaId =
        filtroCategoria.value;


    const jornadaActual =
        filtroJornada.value;


    filtroJornada.innerHTML = `
        <option value="todas">
            Todas las jornadas
        </option>
    `;


    let disponibles =
        jornadas;


    if (
        categoriaId &&
        categoriaId !== "todas"
    ) {

        disponibles =
            jornadas.filter(
                jornada =>
                    jornada.categoriaId ===
                    categoriaId
            );

    }


    disponibles.forEach(
        jornada => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                jornada.id;

            option.textContent =
                jornada.nombre ||
                `Jornada ${jornada.numero || ""}`;

            filtroJornada.appendChild(
                option
            );

        }
    );


    const existe =
        [...filtroJornada.options]
            .some(
                option =>
                    option.value ===
                    jornadaActual
            );


    if (existe) {

        filtroJornada.value =
            jornadaActual;

    }

}


function actualizarJornadasModal() {

    const categoriaId =
        categoriaPartido.value;


    jornadaPartido.innerHTML = `
        <option value="">
            Selecciona una jornada
        </option>
    `;


    if (!categoriaId) {
        return;
    }


    const disponibles =
        jornadas.filter(
            jornada =>
                jornada.categoriaId ===
                categoriaId
        );


    disponibles.forEach(
        jornada => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                jornada.id;

            option.textContent =
                jornada.nombre ||
                `Jornada ${jornada.numero || ""}`;

            jornadaPartido.appendChild(
                option
            );

        }
    );

}


function actualizarEquiposModal() {

    const categoriaId =
        categoriaPartido.value;


    equipoLocal.innerHTML = `
        <option value="">
            Selecciona equipo local
        </option>
    `;


    equipoVisitante.innerHTML = `
        <option value="">
            Selecciona equipo visitante
        </option>
    `;


    previewLocal.innerHTML =
        "L";


    previewVisitante.innerHTML =
        "V";


    if (!categoriaId) {
        return;
    }


    const disponibles =
        equipos
            .filter(
                equipo =>
                    equipo.categoriaId ===
                    categoriaId &&
                    obtenerEstadoEquipo(equipo) ===
                    "activo"
            )
            .sort(
                (a, b) =>
                    (a.nombre || "")
                        .localeCompare(
                            b.nombre || "",
                            "es"
                        )
            );


    disponibles.forEach(
        equipo => {

            const local =
                document.createElement(
                    "option"
                );

            local.value =
                equipo.id;

            local.textContent =
                equipo.nombre ||
                "Equipo";


            const visitante =
                document.createElement(
                    "option"
                );

            visitante.value =
                equipo.id;

            visitante.textContent =
                equipo.nombre ||
                "Equipo";


            equipoLocal.appendChild(
                local
            );


            equipoVisitante.appendChild(
                visitante
            );

        }
    );

}


function actualizarEquiposDisponibles() {

    const localId =
        equipoLocal.value;


    const visitanteId =
        equipoVisitante.value;


    [...equipoLocal.options]
        .forEach(
            option => {

                option.disabled =
                    option.value !== "" &&
                    option.value === visitanteId;

            }
        );


    [...equipoVisitante.options]
        .forEach(
            option => {

                option.disabled =
                    option.value !== "" &&
                    option.value === localId;

            }
        );

}


function actualizarPreviewEquipo(
    equipoId,
    contenedor,
    inicialDefault
) {

    const equipo =
        equipos.find(
            item =>
                item.id === equipoId
        );


    if (!equipo) {

        contenedor.innerHTML =
            inicialDefault;

        return;

    }


    if (equipo.logoUrl) {

        contenedor.innerHTML = `
            <img
                src="${escaparHTML(equipo.logoUrl)}"
                alt="${escaparHTML(equipo.nombre || "Equipo")}"
            >
        `;

        return;

    }


    contenedor.innerHTML =
        escaparHTML(
            obtenerInicial(
                equipo.nombre ||
                inicialDefault
            )
        );

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


    totalEnJuego.textContent =
        partidos.filter(
            partido =>
                partido.estado === "enJuego"
        ).length;


    totalFinalizados.textContent =
        partidos.filter(
            partido =>
                partido.estado === "finalizado"
        ).length;

}


function aplicarFiltros() {

    const texto =
        normalizarTexto(
            buscarPartido.value
        );


    const categoriaId =
        filtroCategoria.value;


    const jornadaId =
        filtroJornada.value;


    const estado =
        filtroEstado.value;


    const filtrados =
        partidos.filter(
            partido => {

                const coincideBusqueda =
                    !texto ||
                    normalizarTexto(
                        partido.localNombre || ""
                    ).includes(texto) ||
                    normalizarTexto(
                        partido.visitanteNombre || ""
                    ).includes(texto) ||
                    normalizarTexto(
                        partido.campo || ""
                    ).includes(texto);


                const coincideCategoria =
                    categoriaId === "todas" ||
                    partido.categoriaId ===
                    categoriaId;


                const coincideJornada =
                    jornadaId === "todas" ||
                    partido.jornadaId ===
                    jornadaId;


                const coincideEstado =
                    estado === "todos" ||
                    partido.estado ===
                    estado;


                return (
                    coincideBusqueda &&
                    coincideCategoria &&
                    coincideJornada &&
                    coincideEstado
                );

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

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "partido-card";


            const fecha =
                obtenerPartesFecha(
                    partido.fecha
                );


            card.innerHTML = `

                <div class="partido-fecha">

                    <strong>
                        ${fecha.dia}
                    </strong>

                    <span>
                        ${fecha.mes}
                    </span>

                </div>


                <div class="partido-info">

                    <div class="partido-meta">

                        <span class="partido-categoria">
                            ${escaparHTML(
                                partido.categoriaNombre ||
                                "Sin categoría"
                            )}
                        </span>

                        <span class="partido-jornada">
                            ${escaparHTML(
                                partido.jornadaNombre ||
                                "Sin jornada"
                            )}
                        </span>

                        <span class="estado-partido ${partido.estado || "proximo"}">
                            ${textoEstado(
                                partido.estado
                            )}
                        </span>

                    </div>


                    <div class="partido-enfrentamiento">

                        <strong>
                            ${escaparHTML(
                                partido.localNombre ||
                                "Local"
                            )}
                        </strong>

                        <span>
                            VS
                        </span>

                        <strong>
                            ${escaparHTML(
                                partido.visitanteNombre ||
                                "Visitante"
                            )}
                        </strong>

                    </div>


                    <div class="partido-detalles">

                        ${formatearHora(
                            partido.hora
                        )}

                        ·

                        ${escaparHTML(
                            partido.campo ||
                            "Sede por definir"
                        )}

                    </div>

                </div>


                <div class="partido-arbitro">

                    <span>
                        Árbitro
                    </span>

                    <strong>
                        ${escaparHTML(
                            partido.arbitroNombre ||
                            "Sin asignar"
                        )}
                    </strong>

                </div>


                <div class="partido-acciones">

                    <button
                        type="button"
                        class="btn-editar-partido"
                    >
                        Editar
                    </button>


                    <a
                        href="partido.html?id=${partido.id}"
                        class="btn-ver-partido"
                    >
                        Ver
                    </a>

                </div>

            `;


            card.querySelector(
                ".btn-editar-partido"
            ).addEventListener(
                "click",
                () => {

                    abrirModalEditarPartido(
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


function abrirModalNuevoPartido() {

    partidoSeleccionado =
        null;


    formPartido.reset();


    modalTitulo.textContent =
        "Nuevo partido";


    categoriaPartido.value =
        "";


    actualizarJornadasModal();
    actualizarEquiposModal();


    seleccionarEstado(
        "proximo"
    );


    previewLocal.innerHTML =
        "L";


    previewVisitante.innerHTML =
        "V";


    abrirModal();

}


function abrirModalEditarPartido(id) {

    const partido =
        partidos.find(
            item =>
                item.id === id
        );


    if (!partido) {
        return;
    }


    partidoSeleccionado =
        partido;


    modalTitulo.textContent =
        "Editar partido";


    categoriaPartido.value =
        partido.categoriaId || "";


    actualizarJornadasModal();
    actualizarEquiposModal();


    jornadaPartido.value =
        partido.jornadaId || "";


    equipoLocal.value =
        partido.localId || "";


    equipoVisitante.value =
        partido.visitanteId || "";


    fechaPartido.value =
        partido.fecha || "";


    horaPartido.value =
        partido.hora || "";


    campoPartido.value =
        partido.campo || "";


    arbitroPartido.value =
        partido.arbitroId || "";


    observacionesPartido.value =
        partido.observaciones || "";


    motivoCancelacion.value =
        partido.motivoCancelacion || "";


    seleccionarEstado(
        partido.estado ||
        "proximo"
    );


    actualizarPreviewEquipo(
        partido.localId,
        previewLocal,
        "L"
    );


    actualizarPreviewEquipo(
        partido.visitanteId,
        previewVisitante,
        "V"
    );


    actualizarEquiposDisponibles();


    abrirModal();

}


function abrirModal() {

    modalPartido.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarModal() {

    modalPartido.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";


    partidoSeleccionado =
        null;

}


function seleccionarEstado(estado) {

    estadoSeleccionado =
        estado;


    btnEstadoProximo.classList.toggle(
        "activo",
        estado === "proximo"
    );


    btnEstadoEnJuego.classList.toggle(
        "activo",
        estado === "enJuego"
    );


    btnEstadoFinalizado.classList.toggle(
        "activo",
        estado === "finalizado"
    );


    btnEstadoCancelado.classList.toggle(
        "activo",
        estado === "cancelado"
    );


    grupoMotivoCancelacion.classList.toggle(
        "oculto",
        estado !== "cancelado"
    );

}


async function guardarPartido(event) {

    event.preventDefault();


    const categoriaId =
        categoriaPartido.value;


    const jornadaId =
        jornadaPartido.value;


    const localId =
        equipoLocal.value;


    const visitanteId =
        equipoVisitante.value;


    const fecha =
        fechaPartido.value;


    const hora =
        horaPartido.value;


    const campo =
        campoPartido.value
            .trim()
            .replace(/\s+/g, " ");


    const arbitroId =
        arbitroPartido.value;


    const observaciones =
        observacionesPartido.value
            .trim()
            .replace(/\s+/g, " ");


    const motivo =
        motivoCancelacion.value
            .trim()
            .replace(/\s+/g, " ");


    if (!categoriaId) {

        mostrarToast(
            "error",
            "Categoría requerida",
            "Selecciona una categoría."
        );

        return;

    }


    if (!jornadaId) {

        mostrarToast(
            "error",
            "Jornada requerida",
            "Selecciona una jornada."
        );

        return;

    }


    if (
        !localId ||
        !visitanteId
    ) {

        mostrarToast(
            "error",
            "Equipos requeridos",
            "Selecciona el equipo local y visitante."
        );

        return;

    }


    if (
        localId === visitanteId
    ) {

        mostrarToast(
            "error",
            "Equipos incorrectos",
            "Un equipo no puede jugar contra sí mismo."
        );

        return;

    }


    if (
        !fecha ||
        !hora
    ) {

        mostrarToast(
            "error",
            "Fecha y hora requeridas",
            "Indica cuándo se jugará el partido."
        );

        return;

    }


    if (!campo) {

        mostrarToast(
            "error",
            "Campo requerido",
            "Indica el campo o sede del encuentro."
        );

        return;

    }


    if (!arbitroId) {

        mostrarToast(
            "error",
            "Árbitro requerido",
            "Selecciona el árbitro responsable."
        );

        return;

    }


    if (
        estadoSeleccionado === "cancelado" &&
        !motivo
    ) {

        mostrarToast(
            "error",
            "Motivo requerido",
            "Indica por qué fue cancelado el partido."
        );

        return;

    }


    const categoria =
        categorias.find(
            item =>
                item.id === categoriaId
        );


    const jornada =
        jornadas.find(
            item =>
                item.id === jornadaId
        );


    const local =
        equipos.find(
            item =>
                item.id === localId
        );


    const visitante =
        equipos.find(
            item =>
                item.id === visitanteId
        );


    const arbitro =
        arbitros.find(
            item =>
                item.id === arbitroId
        );


    if (
        !categoria ||
        !jornada ||
        !local ||
        !visitante ||
        !arbitro
    ) {

        mostrarToast(
            "error",
            "Información incompleta",
            "Alguno de los datos seleccionados ya no está disponible."
        );

        return;

    }


    if (
        jornada.categoriaId !== categoriaId ||
        local.categoriaId !== categoriaId ||
        visitante.categoriaId !== categoriaId
    ) {

        mostrarToast(
            "error",
            "Categorías incompatibles",
            "La jornada y ambos equipos deben pertenecer a la misma categoría."
        );

        return;

    }


    if (
        obtenerEstadoEquipo(local) !== "activo" ||
        obtenerEstadoEquipo(visitante) !== "activo"
    ) {

        mostrarToast(
            "error",
            "Equipo no disponible",
            "Los equipos inactivos o descalificados no pueden programarse."
        );

        return;

    }


    const conflictoEquipos =
        partidos.some(
            partido => {

                if (
                    partidoSeleccionado &&
                    partido.id === partidoSeleccionado.id
                ) {

                    return false;

                }


                if (
                    partido.estado === "cancelado"
                ) {

                    return false;

                }


                if (
                    partido.fecha !== fecha ||
                    partido.hora !== hora
                ) {

                    return false;

                }


                return [
                    partido.localId,
                    partido.visitanteId
                ].some(
                    id =>
                        id === localId ||
                        id === visitanteId
                );

            }
        );


    if (conflictoEquipos) {

        mostrarToast(
            "error",
            "Horario ocupado",
            "Uno de los equipos ya tiene otro partido programado a esa misma fecha y hora."
        );

        return;

    }


    const conflictoArbitro =
        partidos.some(
            partido => {

                if (
                    partidoSeleccionado &&
                    partido.id === partidoSeleccionado.id
                ) {

                    return false;

                }


                return (
                    partido.estado !== "cancelado" &&
                    partido.arbitroId === arbitroId &&
                    partido.fecha === fecha &&
                    partido.hora === hora
                );

            }
        );


    if (conflictoArbitro) {

        mostrarToast(
            "error",
            "Árbitro ocupado",
            "Ese árbitro ya tiene otro partido a la misma fecha y hora."
        );

        return;

    }


    bloquearGuardado(
        true
    );


    try {

        const datos = {

            categoriaId,

            categoriaNombre:
                categoria.nombre || "",

            jornadaId,

            jornadaNumero:
                Number(
                    jornada.numero || 0
                ),

            jornadaNombre:
                jornada.nombre ||
                `Jornada ${jornada.numero || ""}`,

            localId,

            localNombre:
                local.nombre || "",

            visitanteId,

            visitanteNombre:
                visitante.nombre || "",

            fecha,

            hora,

            campo,

            arbitroId,

            arbitroNombre:
                arbitro.nombre ||
                arbitro.email ||
                "",

            observaciones,

            estado:
                estadoSeleccionado,

            motivoCancelacion:
                estadoSeleccionado === "cancelado"
                    ? motivo
                    : "",

            actualizadoEn:
                serverTimestamp()

        };


        if (partidoSeleccionado) {

            const referencia =
                doc(
                    db,
                    "partidos",
                    partidoSeleccionado.id
                );


const partidoAnterior = {
    ...partidoSeleccionado
};

await updateDoc(
    referencia,
    datos
);

const cambios = [];

if (partidoAnterior.categoriaId !== categoriaId) {
    cambios.push(
        `categoría: ${partidoAnterior.categoriaNombre || "Sin categoría"} → ${categoria.nombre || "Sin categoría"}`
    );
}

if (partidoAnterior.jornadaId !== jornadaId) {
    cambios.push(
        `jornada: ${partidoAnterior.jornadaNombre || "Sin jornada"} → ${jornada.nombre || `Jornada ${jornada.numero || ""}`}`
    );
}

if (partidoAnterior.localId !== localId) {
    cambios.push(
        `local: ${partidoAnterior.localNombre || "Sin equipo"} → ${local.nombre || "Sin equipo"}`
    );
}

if (partidoAnterior.visitanteId !== visitanteId) {
    cambios.push(
        `visitante: ${partidoAnterior.visitanteNombre || "Sin equipo"} → ${visitante.nombre || "Sin equipo"}`
    );
}

if (partidoAnterior.fecha !== fecha) {
    cambios.push(
        `fecha: ${partidoAnterior.fecha || "Sin fecha"} → ${fecha}`
    );
}

if (partidoAnterior.hora !== hora) {
    cambios.push(
        `hora: ${partidoAnterior.hora || "Sin hora"} → ${hora}`
    );
}

if ((partidoAnterior.campo || "") !== campo) {
    cambios.push(
        `campo: ${partidoAnterior.campo || "Sin campo"} → ${campo}`
    );
}

if (partidoAnterior.arbitroId !== arbitroId) {
    cambios.push(
        `árbitro: ${partidoAnterior.arbitroNombre || "Sin árbitro"} → ${arbitro.nombre || arbitro.email || "Sin árbitro"}`
    );
}

if ((partidoAnterior.observaciones || "") !== observaciones) {
    cambios.push("observaciones modificadas");
}

if ((partidoAnterior.estado || "proximo") !== estadoSeleccionado) {
    cambios.push(
        `estado: ${textoEstado(partidoAnterior.estado)} → ${textoEstado(estadoSeleccionado)}`
    );
}

const motivoAnterior =
    partidoAnterior.motivoCancelacion || "";

const motivoNuevo =
    estadoSeleccionado === "cancelado"
        ? motivo
        : "";

if (motivoAnterior !== motivoNuevo) {
    cambios.push("motivo de cancelación modificado");
}

Object.assign(
    partidoSeleccionado,
    datos
);

if (cambios.length) {
    await registrarAuditoria({
        usuarioId: usuario.uid,
        usuarioNombre:
            usuario.nombre ||
            usuario.email ||
            "Administrador",
        usuarioRol:
            usuario.rol ||
            "admin",
        modulo: "partidos",
        accion: "partido_actualizado",
        descripcion:
            `Actualizó el partido ${local.nombre || "Local"} vs ${visitante.nombre || "Visitante"}. Cambios: ${cambios.join("; ")}.`,
        entidadTipo: "partido",
        entidadId: partidoSeleccionado.id,
        entidadNombre:
            `${local.nombre || "Local"} vs ${visitante.nombre || "Visitante"}`
    });
}

mostrarToast(
    "exito",
    "Partido actualizado",
    "Los cambios fueron guardados correctamente."
);

        } else {

            const batch =
                writeBatch(db);


            const referenciaPartido =
                doc(
                    collection(
                        db,
                        "partidos"
                    )
                );


            batch.set(
                referenciaPartido,
                {
                    ...datos,

                    cedulaCreada:
                        false,

                    resultadoRegistrado:
                        false,

                    golesLocal:
                        null,

                    golesVisitante:
                        null,

                    creadoEn:
                        serverTimestamp()
                }
            );


            const referenciaJornada =
                doc(
                    db,
                    "jornadas",
                    jornadaId
                );


            batch.update(
                referenciaJornada,
                {
                    totalPartidos:
                        increment(1),

                    actualizadoEn:
                        serverTimestamp()
                }
            );


            await batch.commit();

            await registrarAuditoria({
    usuarioId: usuario.uid,
    usuarioNombre:
        usuario.nombre ||
        usuario.email ||
        "Administrador",
    usuarioRol:
        usuario.rol ||
        "admin",
    modulo: "partidos",
    accion: "partido_creado",
    descripcion:
        `Creó el partido ${local.nombre || "Local"} vs ${visitante.nombre || "Visitante"}, ${jornada.nombre || `Jornada ${jornada.numero || ""}`}, programado para ${fecha} a las ${hora} en ${campo}.`,
    entidadTipo: "partido",
    entidadId: referenciaPartido.id,
    entidadNombre:
        `${local.nombre || "Local"} vs ${visitante.nombre || "Visitante"}`
});

            partidos.push(
                {
                    id:
                        referenciaPartido.id,

                    ...datos,

                    cedulaCreada:
                        false,

                    resultadoRegistrado:
                        false,

                    golesLocal:
                        null,

                    golesVisitante:
                        null
                }
            );


            const jornadaLocal =
                jornadas.find(
                    item =>
                        item.id === jornadaId
                );


            if (jornadaLocal) {

                jornadaLocal.totalPartidos =
                    Number(
                        jornadaLocal.totalPartidos || 0
                    ) + 1;

            }


            mostrarToast(
                "exito",
                "Partido creado",
                "El encuentro ya forma parte del calendario oficial."
            );

        }


        partidos.sort(
            ordenarPartidos
        );


        actualizarResumen();

        aplicarFiltros();

        cerrarModal();

    } catch (error) {

        console.error(
            "Error guardando partido:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al guardar el partido."
        );

    } finally {

        bloquearGuardado(
            false
        );

    }

}


function aplicarParametrosURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const jornadaId =
        parametros.get(
            "jornada"
        );


    const accion =
        parametros.get(
            "accion"
        );


    if (jornadaId) {

        const jornada =
            jornadas.find(
                item =>
                    item.id === jornadaId
            );


        if (jornada) {

            filtroCategoria.value =
                jornada.categoriaId;


            actualizarFiltroJornadas();


            filtroJornada.value =
                jornada.id;


            aplicarFiltros();

        }

    }


    if (
        accion === "nuevo"
    ) {

        abrirModalNuevoPartido();

    }

}


function obtenerEstadoEquipo(equipo) {

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


function ordenarPartidos(a, b) {

    const fechaA =
        `${a.fecha || "9999-12-31"}T${a.hora || "23:59"}`;


    const fechaB =
        `${b.fecha || "9999-12-31"}T${b.hora || "23:59"}`;


    return fechaA.localeCompare(
        fechaB
    );

}


function obtenerPartesFecha(fecha) {

    if (!fecha) {

        return {
            dia: "--",
            mes: "---"
        };

    }


    const partes =
        fecha.split("-");


    if (
        partes.length !== 3
    ) {

        return {
            dia: "--",
            mes: "---"
        };

    }


    const objeto =
        new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );


    return {

        dia:
            String(
                objeto.getDate()
            ).padStart(
                2,
                "0"
            ),

        mes:
            objeto
                .toLocaleDateString(
                    "es-MX",
                    {
                        month: "short"
                    }
                )
                .replace(".", "")

    };

}


function formatearHora(hora) {

    if (!hora) {
        return "Hora por definir";
    }


    const partes =
        hora.split(":");


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


function textoEstado(estado) {

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


function bloquearGuardado(bloquear) {

    btnGuardarPartido.disabled =
        bloquear;


    btnGuardarPartido.textContent =
        bloquear
            ? "Guardando..."
            : "Guardar partido";

}


function obtenerInicial(nombre) {

    const texto =
        String(nombre || "")
            .trim();


    if (!texto) {
        return "E";
    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function normalizarTexto(texto) {

    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

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