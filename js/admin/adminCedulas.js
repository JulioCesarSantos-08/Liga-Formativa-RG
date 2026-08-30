import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";


const adminInicial =
    document.getElementById("adminInicial");

const totalPartidos =
    document.getElementById("totalPartidos");

const totalPendientes =
    document.getElementById("totalPendientes");

const totalRegistradas =
    document.getElementById("totalRegistradas");

const totalRevision =
    document.getElementById("totalRevision");

const buscarCedula =
    document.getElementById("buscarCedula");

const filtroCategoria =
    document.getElementById("filtroCategoria");

const filtroJornada =
    document.getElementById("filtroJornada");

const filtroCedula =
    document.getElementById("filtroCedula");

const estadoCarga =
    document.getElementById("estadoCarga");

const estadoVacio =
    document.getElementById("estadoVacio");

const listaCedulas =
    document.getElementById("listaCedulas");


const modalCedula =
    document.getElementById("modalCedula");

const modalCedulaTitulo =
    document.getElementById("modalCedulaTitulo");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCerrarDetalle =
    document.getElementById("btnCerrarDetalle");

const btnEditarCedula =
    document.getElementById("btnEditarCedula");


const modalLogoLocal =
    document.getElementById("modalLogoLocal");

const modalLogoVisitante =
    document.getElementById("modalLogoVisitante");

const modalNombreLocal =
    document.getElementById("modalNombreLocal");

const modalNombreVisitante =
    document.getElementById("modalNombreVisitante");

const modalJornada =
    document.getElementById("modalJornada");

const modalResultado =
    document.getElementById("modalResultado");

const modalEstadoPartido =
    document.getElementById("modalEstadoPartido");

const modalCategoria =
    document.getElementById("modalCategoria");

const modalFecha =
    document.getElementById("modalFecha");

const modalHora =
    document.getElementById("modalHora");

const modalCampo =
    document.getElementById("modalCampo");

const modalArbitro =
    document.getElementById("modalArbitro");

const modalEstadoCedula =
    document.getElementById("modalEstadoCedula");


const bloqueCedulaPendiente =
    document.getElementById("bloqueCedulaPendiente");

const contenidoCedula =
    document.getElementById("contenidoCedula");


const resultadoNombreLocal =
    document.getElementById("resultadoNombreLocal");

const resultadoGolesLocal =
    document.getElementById("resultadoGolesLocal");

const resultadoNombreVisitante =
    document.getElementById("resultadoNombreVisitante");

const resultadoGolesVisitante =
    document.getElementById("resultadoGolesVisitante");


const modalTotalGoles =
    document.getElementById("modalTotalGoles");

const modalTotalAmarillas =
    document.getElementById("modalTotalAmarillas");

const modalTotalRojas =
    document.getElementById("modalTotalRojas");

const modalTotalJugadores =
    document.getElementById("modalTotalJugadores");

const modalIncidencias =
    document.getElementById("modalIncidencias");

const modalRegistradoPor =
    document.getElementById("modalRegistradoPor");

const modalFechaRegistro =
    document.getElementById("modalFechaRegistro");


const toast =
    document.getElementById("toast");

const toastIcono =
    document.getElementById("toastIcono");

const toastTitulo =
    document.getElementById("toastTitulo");

const toastTexto =
    document.getElementById("toastTexto");


let partidos = [];

let cedulas = [];

let categorias = [];

let jornadas = [];

let equipos = [];

let registros = [];

let registroSeleccionado = null;

let toastTimer = null;


const usuario = await protegerPagina([
    "admin"
]);


if (usuario) {

    cargarAdministrador(usuario);

    activarEventos();

    await cargarDatos();

}


function cargarAdministrador(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Administrador";


    adminInicial.textContent =
        obtenerInicial(nombre);

}


function activarEventos() {

    buscarCedula.addEventListener(
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


    filtroCedula.addEventListener(
        "change",
        aplicarFiltros
    );


    btnCerrarModal.addEventListener(
        "click",
        cerrarModal
    );


    btnCerrarDetalle.addEventListener(
        "click",
        cerrarModal
    );


    modalCedula.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modalCedula
            ) {

                cerrarModal();

            }

        }
    );


    btnEditarCedula.addEventListener(
        "click",
        () => {

            if (!registroSeleccionado) {
                return;
            }


            window.location.href =
                `adminEditarCedula.html?partido=${registroSeleccionado.partido.id}`;

        }
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !modalCedula.classList.contains("oculto")
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
            snapshotCedulas,
            snapshotCategorias,
            snapshotJornadas,
            snapshotEquipos
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
                    "cedulas"
                )
            ),

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
            )

        ]);


        partidos =
            snapshotPartidos.docs.map(
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


        categorias =
            snapshotCategorias.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        jornadas =
            snapshotJornadas.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        equipos =
            snapshotEquipos.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        construirRegistros();

        llenarCategorias();

        actualizarFiltroJornadas();

        actualizarResumen();

        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando cédulas:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        listaCedulas.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            "No pudimos cargar las cédulas";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            "Revisa la conexión con Firebase e intenta nuevamente.";

    }

}


function construirRegistros() {

    registros =
        partidos.map(
            partido => {

                const cedula =
                    cedulas.find(
                        item =>
                            item.partidoId ===
                            partido.id
                    ) || null;


                return {

                    partido,

                    cedula,

                    estadoCedula:
                        obtenerEstadoCedula(
                            partido,
                            cedula
                        )

                };

            }
        );


    registros.sort(
        (a, b) =>
            ordenarPartidos(
                a.partido,
                b.partido
            )
    );

}


function obtenerEstadoCedula(
    partido,
    cedula
) {

    if (
        cedula?.estado === "revision" ||
        cedula?.enRevision === true
    ) {

        return "revision";

    }


    if (
        cedula ||
        partido.cedulaCreada === true ||
        partido.resultadoRegistrado === true
    ) {

        return "registrada";

    }


    return "pendiente";

}


function llenarCategorias() {

    filtroCategoria.innerHTML = `
        <option value="todas">
            Todas las categorías
        </option>
    `;


    const categoriasUsadas =
        [...categorias]
            .sort(
                (a, b) =>
                    (a.nombre || "")
                        .localeCompare(
                            b.nombre || "",
                            "es"
                        )
            );


    categoriasUsadas.forEach(
        categoria => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                categoria.id;


            option.textContent =
                categoria.nombre ||
                "Sin nombre";


            filtroCategoria.appendChild(
                option
            );

        }
    );

}


function actualizarFiltroJornadas() {

    const categoriaId =
        filtroCategoria.value;


    const valorActual =
        filtroJornada.value;


    filtroJornada.innerHTML = `
        <option value="todas">
            Todas las jornadas
        </option>
    `;


    let disponibles =
        jornadas;


    if (
        categoriaId !== "todas"
    ) {

        disponibles =
            jornadas.filter(
                jornada =>
                    jornada.categoriaId ===
                    categoriaId
            );

    }


    disponibles
        .sort(
            (a, b) =>
                Number(a.numero || 0) -
                Number(b.numero || 0)
        )
        .forEach(
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
                    valorActual
            );


    if (existe) {

        filtroJornada.value =
            valorActual;

    }

}


function actualizarResumen() {

    totalPartidos.textContent =
        registros.length;


    totalPendientes.textContent =
        registros.filter(
            registro =>
                registro.estadoCedula ===
                "pendiente"
        ).length;


    totalRegistradas.textContent =
        registros.filter(
            registro =>
                registro.estadoCedula ===
                "registrada"
        ).length;


    totalRevision.textContent =
        registros.filter(
            registro =>
                registro.estadoCedula ===
                "revision"
        ).length;

}


function aplicarFiltros() {

    const texto =
        normalizarTexto(
            buscarCedula.value
        );


    const categoriaId =
        filtroCategoria.value;


    const jornadaId =
        filtroJornada.value;


    const estado =
        filtroCedula.value;


    const filtrados =
        registros.filter(
            registro => {

                const partido =
                    registro.partido;


                const coincideTexto =
                    !texto ||
                    normalizarTexto(
                        partido.localNombre || ""
                    ).includes(texto) ||
                    normalizarTexto(
                        partido.visitanteNombre || ""
                    ).includes(texto) ||
                    normalizarTexto(
                        partido.arbitroNombre || ""
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
                    estado === "todas" ||
                    registro.estadoCedula ===
                    estado;


                return (
                    coincideTexto &&
                    coincideCategoria &&
                    coincideJornada &&
                    coincideEstado
                );

            }
        );


    renderizarRegistros(
        filtrados
    );

}


function renderizarRegistros(lista) {

    estadoCarga.classList.add(
        "oculto"
    );


    listaCedulas.innerHTML =
        "";


    if (!lista.length) {

        listaCedulas.classList.add(
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


    listaCedulas.classList.remove(
        "oculto"
    );


    lista.forEach(
        registro => {

            const partido =
                registro.partido;


            const cedula =
                registro.cedula;


            const fecha =
                obtenerPartesFecha(
                    partido.fecha
                );


            const resultado =
                obtenerResultado(
                    partido,
                    cedula
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                `cedula-card ${registro.estadoCedula}`;


            card.innerHTML = `

                <div class="cedula-fecha">

                    <strong>
                        ${fecha.dia}
                    </strong>

                    <span>
                        ${fecha.mes}
                    </span>

                </div>


                <div class="cedula-info">

                    <div class="cedula-meta">

                        <span class="cedula-categoria">
                            ${escaparHTML(
                                partido.categoriaNombre ||
                                "Sin categoría"
                            )}
                        </span>


                        <span class="cedula-jornada">
                            ${escaparHTML(
                                partido.jornadaNombre ||
                                "Sin jornada"
                            )}
                        </span>


                        <span class="estado-cedula ${registro.estadoCedula}">
                            ${textoEstadoCedula(
                                registro.estadoCedula
                            )}
                        </span>

                    </div>


                    <div class="cedula-enfrentamiento">

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


                    <div class="cedula-detalles">

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


                <div class="cedula-arbitro">

                    <span>
                        Árbitro asignado
                    </span>

                    <strong>
                        ${escaparHTML(
                            partido.arbitroNombre ||
                            "Sin asignar"
                        )}
                    </strong>

                </div>


                <div class="cedula-resultado">

                    <span>
                        Resultado
                    </span>

                    <strong>
                        ${resultado}
                    </strong>

                    <button
                        type="button"
                        class="btn-ver-cedula"
                    >
                        ${
                            registro.estadoCedula ===
                            "pendiente"
                                ? "Ver partido"
                                : "Ver cédula"
                        }
                    </button>

                </div>

            `;


            card.querySelector(
                ".btn-ver-cedula"
            ).addEventListener(
                "click",
                () => {

                    abrirDetalle(
                        partido.id
                    );

                }
            );


            listaCedulas.appendChild(
                card
            );

        }
    );

}


function abrirDetalle(partidoId) {

    const registro =
        registros.find(
            item =>
                item.partido.id ===
                partidoId
        );


    if (!registro) {
        return;
    }


    registroSeleccionado =
        registro;


    const partido =
        registro.partido;


    const cedula =
        registro.cedula;


    modalCedulaTitulo.textContent =
        `${partido.localNombre || "Local"} vs ${partido.visitanteNombre || "Visitante"}`;


    modalNombreLocal.textContent =
        partido.localNombre ||
        "Equipo local";


    modalNombreVisitante.textContent =
        partido.visitanteNombre ||
        "Equipo visitante";


    cargarLogoEquipo(
        partido.localId,
        modalLogoLocal,
        partido.localNombre,
        "L"
    );


    cargarLogoEquipo(
        partido.visitanteId,
        modalLogoVisitante,
        partido.visitanteNombre,
        "V"
    );


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


    modalArbitro.textContent =
        partido.arbitroNombre ||
        "Sin asignar";


    modalEstadoPartido.textContent =
        textoEstadoPartido(
            partido.estado
        );


    modalEstadoCedula.textContent =
        textoEstadoCedula(
            registro.estadoCedula
        );


    if (
        registro.estadoCedula ===
        "pendiente"
    ) {

        modalResultado.textContent =
            "- vs -";


        bloqueCedulaPendiente.classList.remove(
            "oculto"
        );


        contenidoCedula.classList.add(
            "oculto"
        );


        btnEditarCedula.classList.add(
            "oculto"
        );

    } else {

        bloqueCedulaPendiente.classList.add(
            "oculto"
        );


        contenidoCedula.classList.remove(
            "oculto"
        );


        btnEditarCedula.classList.remove(
            "oculto"
        );


        cargarContenidoCedula(
            partido,
            cedula
        );

    }


    modalCedula.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cargarContenidoCedula(
    partido,
    cedula
) {

    const golesLocal =
        obtenerNumero(
            cedula?.golesLocal,
            partido.golesLocal
        );


    const golesVisitante =
        obtenerNumero(
            cedula?.golesVisitante,
            partido.golesVisitante
        );


    modalResultado.textContent =
        `${golesLocal} - ${golesVisitante}`;


    resultadoNombreLocal.textContent =
        partido.localNombre ||
        "Local";


    resultadoNombreVisitante.textContent =
        partido.visitanteNombre ||
        "Visitante";


    resultadoGolesLocal.textContent =
        golesLocal;


    resultadoGolesVisitante.textContent =
        golesVisitante;


    modalTotalGoles.textContent =
        obtenerNumero(
            cedula?.totalGoles,
            golesLocal + golesVisitante
        );


    modalTotalAmarillas.textContent =
        obtenerTotalColeccion(
            cedula?.amarillas,
            cedula?.totalAmarillas
        );


    modalTotalRojas.textContent =
        obtenerTotalColeccion(
            cedula?.rojas,
            cedula?.totalRojas
        );


    modalTotalJugadores.textContent =
        obtenerTotalJugadores(
            cedula
        );


    modalIncidencias.textContent =
        cedula?.incidencias?.trim() ||
        cedula?.observaciones?.trim() ||
        "Sin incidencias registradas.";


    modalRegistradoPor.textContent =
        cedula?.arbitroNombre ||
        cedula?.registradoPorNombre ||
        partido.arbitroNombre ||
        "Sin información";


    modalFechaRegistro.textContent =
        formatearTimestamp(
            cedula?.creadoEn ||
            cedula?.registradoEn ||
            cedula?.actualizadoEn
        );

}


function cargarLogoEquipo(
    equipoId,
    contenedor,
    nombre,
    inicialDefault
) {

    const equipo =
        equipos.find(
            item =>
                item.id === equipoId
        );


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
            inicialDefault
        );

}


function cerrarModal() {

    modalCedula.classList.add(
        "oculto"
    );


    registroSeleccionado =
        null;


    document.body.style.overflow =
        "";

}


function obtenerResultado(
    partido,
    cedula
) {

    if (
        !cedula &&
        partido.resultadoRegistrado !== true
    ) {

        return "Pendiente";

    }


    const local =
        obtenerNumero(
            cedula?.golesLocal,
            partido.golesLocal
        );


    const visitante =
        obtenerNumero(
            cedula?.golesVisitante,
            partido.golesVisitante
        );


    return `${local} - ${visitante}`;

}


function obtenerNumero(
    primero,
    segundo = 0
) {

    if (
        primero !== undefined &&
        primero !== null &&
        primero !== ""
    ) {

        return Number(primero) || 0;

    }


    if (
        segundo !== undefined &&
        segundo !== null &&
        segundo !== ""
    ) {

        return Number(segundo) || 0;

    }


    return 0;

}


function obtenerTotalColeccion(
    coleccion,
    total
) {

    if (
        Array.isArray(
            coleccion
        )
    ) {

        return coleccion.length;

    }


    return Number(
        total || 0
    );

}


function obtenerTotalJugadores(cedula) {

    if (!cedula) {
        return 0;
    }


    if (
        Number.isFinite(
            Number(
                cedula.totalJugadores
            )
        ) &&
        cedula.totalJugadores !==
        undefined
    ) {

        return Number(
            cedula.totalJugadores
        );

    }


    const local =
        Array.isArray(
            cedula.jugadoresLocal
        )
            ? cedula.jugadoresLocal.length
            : 0;


    const visitante =
        Array.isArray(
            cedula.jugadoresVisitante
        )
            ? cedula.jugadoresVisitante.length
            : 0;


    return local + visitante;

}


function textoEstadoCedula(estado) {

    switch (estado) {

        case "registrada":
            return "Registrada";

        case "revision":
            return "En revisión";

        case "pendiente":
        default:
            return "Pendiente";

    }

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


function mostrarCarga() {

    estadoCarga.classList.remove(
        "oculto"
    );


    estadoVacio.classList.add(
        "oculto"
    );


    listaCedulas.classList.add(
        "oculto"
    );

}


function ordenarPartidos(a, b) {

    const fechaA =
        `${a.fecha || "9999-12-31"}T${a.hora || "23:59"}`;


    const fechaB =
        `${b.fecha || "9999-12-31"}T${b.hora || "23:59"}`;


    return fechaB.localeCompare(
        fechaA
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
        String(fecha).split("-");


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


function formatearTimestamp(valor) {

    if (!valor) {
        return "Sin información";
    }


    let fecha;


    if (
        typeof valor.toDate ===
        "function"
    ) {

        fecha =
            valor.toDate();

    } else {

        fecha =
            new Date(valor);

    }


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return "Sin información";

    }


    return fecha.toLocaleString(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );

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
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            "\"",
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
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