import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    protegerPaginaPublica
} from "../roles.js";


const perfilInicial =
    document.getElementById(
        "perfilInicial"
    );

const btnPerfil =
    document.getElementById(
        "btnPerfil"
    );

const filtroCategoria =
    document.getElementById(
        "filtroCategoria"
    );

const filtroEstado =
    document.getElementById(
        "filtroEstado"
    );

const tituloPartidos =
    document.getElementById(
        "tituloPartidos"
    );

const contadorPartidos =
    document.getElementById(
        "contadorPartidos"
    );

const estadoCarga =
    document.getElementById(
        "estadoCarga"
    );

const listaPartidos =
    document.getElementById(
        "listaPartidos"
    );

const sinPartidos =
    document.getElementById(
        "sinPartidos"
    );


let usuarioActual = null;

let partidos = [];

let categorias = [];

let equipos = [];


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    usuarioActual =
        usuario;

    cargarUsuario(
        usuario
    );

    activarEventos();

    await cargarDatos();

}


function cargarUsuario(
    usuario
) {

    const nombre =
        usuario.nombre?.trim() ||
        usuario.firebaseUser
            ?.displayName
            ?.trim() ||
        "Usuario";


    perfilInicial.textContent =
        nombre
            .charAt(0)
            .toUpperCase();

}


function activarEventos() {

    filtroCategoria.addEventListener(
        "change",
        aplicarFiltros
    );


    filtroEstado.addEventListener(
        "change",
        aplicarFiltros
    );


    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );

}


async function cargarDatos() {

    mostrarCarga();


    try {

        const [
            snapshotPartidos,
            snapshotCategorias,
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
                    "categorias"
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


        categorias =
            snapshotCategorias.docs.map(
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


        ordenarPartidos();

        cargarCategorias();

        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando partidos:",
            error
        );


        ocultarCarga();

        mostrarError();

    }

}


function ordenarPartidos() {

    partidos.sort(
        (a, b) => {

            const fechaA =
                obtenerFechaOrden(
                    a
                );

            const fechaB =
                obtenerFechaOrden(
                    b
                );


            return (
                fechaB - fechaA
            );

        }
    );

}


function cargarCategorias() {

    const categoriasMap =
        new Map();


    categorias.forEach(
        categoria => {

            const nombre =
                categoria.nombre?.trim();


            if (!nombre) {
                return;
            }


            categoriasMap.set(
                categoria.id,
                nombre
            );

        }
    );


    partidos.forEach(
        partido => {

            const id =
                partido.categoriaId;

            const nombre =
                partido.categoriaNombre
                    ?.trim();


            if (
                id &&
                nombre
            ) {

                categoriasMap.set(
                    id,
                    nombre
                );

            }

        }
    );


    const lista =
        Array.from(
            categoriasMap.entries()
        ).sort(
            (a, b) =>
                a[1].localeCompare(
                    b[1],
                    "es"
                )
        );


    filtroCategoria.innerHTML = `
        <option value="">
            Todas las categorías
        </option>
    `;


    lista.forEach(
        ([id, nombre]) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                id;

            option.textContent =
                nombre;


            filtroCategoria.appendChild(
                option
            );

        }
    );

}


function aplicarFiltros() {

    const categoriaId =
        filtroCategoria.value;

    const estado =
        filtroEstado.value;


    let lista =
        [...partidos];


    if (categoriaId) {

        lista =
            lista.filter(
                partido =>
                    partido.categoriaId ===
                    categoriaId
            );

    }


    if (estado) {

        lista =
            lista.filter(
                partido => {

                    const estadoPartido =
                        normalizarEstado(
                            partido
                        );


                    return (
                        estadoPartido ===
                        estado
                    );

                }
            );

    }


    actualizarTitulo(
        categoriaId,
        estado
    );

    renderizarPartidos(
        lista
    );

}


function actualizarTitulo(
    categoriaId,
    estado
) {

    const optionCategoria =
        filtroCategoria.options[
            filtroCategoria.selectedIndex
        ];


    const nombreCategoria =
        categoriaId
            ? optionCategoria
                ?.textContent
                ?.trim()
            : "";


    if (
        categoriaId &&
        estado === "proximo"
    ) {

        tituloPartidos.textContent =
            `Próximos · ${nombreCategoria}`;

        return;

    }


    if (
        categoriaId &&
        estado === "finalizado"
    ) {

        tituloPartidos.textContent =
            `Finalizados · ${nombreCategoria}`;

        return;

    }


    if (categoriaId) {

        tituloPartidos.textContent =
            nombreCategoria;

        return;

    }


    if (estado === "proximo") {

        tituloPartidos.textContent =
            "Próximos partidos";

        return;

    }


    if (estado === "finalizado") {

        tituloPartidos.textContent =
            "Partidos finalizados";

        return;

    }


    tituloPartidos.textContent =
        "Todos los partidos";

}


function renderizarPartidos(
    lista
) {

    ocultarCarga();


    listaPartidos.innerHTML =
        "";


    contadorPartidos.textContent =
        `${lista.length} ${
            lista.length === 1
                ? "partido"
                : "partidos"
        }`;


    if (!lista.length) {

        listaPartidos.hidden =
            true;

        sinPartidos.hidden =
            false;

        return;

    }


    listaPartidos.hidden =
        false;

    sinPartidos.hidden =
        true;


    lista.forEach(
        partido => {

            const local =
                obtenerEquipo(
                    partido.localId
                );

            const visitante =
                obtenerEquipo(
                    partido.visitanteId
                );


            const estado =
                normalizarEstado(
                    partido
                );


            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "partido-card";


            tarjeta.innerHTML = `
                <div class="partido-card-superior">

                    <div class="partido-etiquetas">

                        <span class="partido-categoria">
                            ${escaparHTML(
                                partido.categoriaNombre ||
                                obtenerCategoriaNombre(
                                    partido.categoriaId
                                ) ||
                                "Sin categoría"
                            )}
                        </span>

                        <span class="partido-jornada">
                            ${escaparHTML(
                                obtenerNombreJornada(
                                    partido
                                )
                            )}
                        </span>

                    </div>

                    <span class="estado-partido ${estado}">
                        ${obtenerTextoEstado(
                            estado
                        )}
                    </span>

                </div>


                <div class="partido-equipos">

                    <div class="equipo-partido">

                        <div class="equipo-logo">
                            ${crearLogoEquipo(
                                local,
                                partido.localNombre,
                                "L"
                            )}
                        </div>

                        <strong>
                            ${escaparHTML(
                                partido.localNombre ||
                                local?.nombre ||
                                "Local"
                            )}
                        </strong>

                    </div>


                    <div class="partido-centro">

                        ${crearMarcador(
                            partido,
                            estado
                        )}

                    </div>


                    <div class="equipo-partido">

                        <div class="equipo-logo">
                            ${crearLogoEquipo(
                                visitante,
                                partido.visitanteNombre,
                                "V"
                            )}
                        </div>

                        <strong>
                            ${escaparHTML(
                                partido.visitanteNombre ||
                                visitante?.nombre ||
                                "Visitante"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="partido-datos">

                    <div>

                        <span>
                            📅
                        </span>

                        <p>

                            <small>
                                Fecha
                            </small>

                            <strong>
                                ${escaparHTML(
                                    formatearFecha(
                                        partido.fecha
                                    )
                                )}
                            </strong>

                        </p>

                    </div>


                    <div>

                        <span>
                            🕒
                        </span>

                        <p>

                            <small>
                                Hora
                            </small>

                            <strong>
                                ${escaparHTML(
                                    formatearHora(
                                        partido.hora
                                    )
                                )}
                            </strong>

                        </p>

                    </div>


                    <div>

                        <span>
                            📍
                        </span>

                        <p>

                            <small>
                                Campo
                            </small>

                            <strong>
                                ${escaparHTML(
                                    partido.campo ||
                                    "Por definir"
                                )}
                            </strong>

                        </p>

                    </div>

                </div>


                <a
                    href="partido.html?id=${encodeURIComponent(
                        partido.id
                    )}"
                    class="btn-ver-partido"
                >
                    ${
                        estado === "finalizado"
                            ? "Ver resultado"
                            : "Ver partido"
                    }
                    <span>
                        ›
                    </span>
                </a>
            `;


            listaPartidos.appendChild(
                tarjeta
            );

        }
    );

}


function obtenerEquipo(
    id
) {

    if (!id) {
        return null;
    }


    return (
        equipos.find(
            equipo =>
                equipo.id === id
        ) ||
        null
    );

}


function obtenerCategoriaNombre(
    categoriaId
) {

    if (!categoriaId) {
        return "";
    }


    const categoria =
        categorias.find(
            item =>
                item.id ===
                categoriaId
        );


    return (
        categoria?.nombre ||
        ""
    );

}


function obtenerNombreJornada(
    partido
) {

    const nombre =
        partido.jornadaNombre
            ?.trim();


    if (nombre) {

        return nombre;

    }


    if (
        partido.jornadaNumero !==
        undefined &&
        partido.jornadaNumero !==
        null
    ) {

        return (
            `Jornada ${partido.jornadaNumero}`
        );

    }


    if (
        partido.numeroJornada !==
        undefined &&
        partido.numeroJornada !==
        null
    ) {

        return (
            `Jornada ${partido.numeroJornada}`
        );

    }


    return "Sin jornada";

}


function crearLogoEquipo(
    equipo,
    nombre,
    fallback
) {

    const logo =
        equipo?.logoUrl ||
        equipo?.escudoUrl ||
        equipo?.imagenUrl ||
        equipo?.logo ||
        "";


    if (logo) {

        return `
            <img
                src="${escaparAtributo(
                    logo
                )}"
                alt="${escaparAtributo(
                    nombre ||
                    equipo?.nombre ||
                    "Equipo"
                )}"
                loading="lazy"
            >
        `;

    }


    const inicial =
        obtenerInicialEquipo(
            nombre ||
            equipo?.nombre ||
            fallback
        );


    return `
        <span>
            ${escaparHTML(
                inicial
            )}
        </span>
    `;

}


function obtenerInicialEquipo(
    nombre
) {

    const texto =
        String(
            nombre || ""
        ).trim();


    if (!texto) {
        return "E";
    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function crearMarcador(
    partido,
    estado
) {

    const golesLocal =
        obtenerNumero(
            partido.golesLocal
        );

    const golesVisitante =
        obtenerNumero(
            partido.golesVisitante
        );


    if (
        estado === "finalizado" ||
        (
            golesLocal !== null &&
            golesVisitante !== null &&
            tieneResultado(
                partido
            )
        )
    ) {

        return `
            <span class="marcador-texto">
                Resultado
            </span>

            <strong class="marcador-resultado">
                ${
                    golesLocal ??
                    0
                }
                <span>
                    -
                </span>
                ${
                    golesVisitante ??
                    0
                }
            </strong>
        `;

    }


    return `
        <span class="partido-hora">
            ${escaparHTML(
                formatearHora(
                    partido.hora
                )
            )}
        </span>

        <strong class="partido-vs">
            VS
        </strong>
    `;

}


function tieneResultado(
    partido
) {

    return (
        partido.estado ===
            "finalizado" ||
        partido.estado ===
            "registrada" ||
        partido.cedulaEstado ===
            "registrada" ||
        partido.cedulaRegistrada ===
            true
    );

}


function normalizarEstado(
    partido
) {

    const estado =
        String(
            partido.estado ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        estado === "finalizado" ||
        estado === "finalizada" ||
        estado === "registrada"
    ) {

        return "finalizado";

    }


    if (
        estado === "cancelado" ||
        estado === "cancelada"
    ) {

        return "cancelado";

    }


    if (
        estado === "en-vivo" ||
        estado === "en vivo" ||
        estado === "envivo"
    ) {

        return "en-vivo";

    }


    if (
        partido.cedulaEstado ===
            "registrada" ||
        partido.cedulaRegistrada ===
            true
    ) {

        return "finalizado";

    }


    return "proximo";

}


function obtenerTextoEstado(
    estado
) {

    switch (estado) {

        case "finalizado":

            return "Finalizado";


        case "cancelado":

            return "Cancelado";


        case "en-vivo":

            return "En vivo";


        case "proximo":

        default:

            return "Próximo";

    }

}


function obtenerNumero(
    valor
) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return null;

    }


    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return null;

    }


    return numero;

}


function formatearFecha(
    valor
) {

    if (!valor) {

        return "Por definir";

    }


    let fecha;


    if (
        typeof valor?.toDate ===
        "function"
    ) {

        fecha =
            valor.toDate();

    } else if (
        typeof valor ===
        "string"
    ) {

        const fechaSimple =
            valor.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (fechaSimple) {

            fecha =
                new Date(
                    Number(
                        fechaSimple[1]
                    ),
                    Number(
                        fechaSimple[2]
                    ) - 1,
                    Number(
                        fechaSimple[3]
                    )
                );

        } else {

            fecha =
                new Date(
                    valor
                );

        }

    } else {

        fecha =
            new Date(
                valor
            );

    }


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return String(
            valor
        );

    }


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        fecha
    );

}


function formatearHora(
    valor
) {

    if (!valor) {

        return "Por definir";

    }


    const hora =
        String(
            valor
        ).trim();


    if (
        /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(
            hora
        )
    ) {

        return hora
            .toUpperCase();

    }


    const coincidencia =
        hora.match(
            /^(\d{1,2}):(\d{2})$/
        );


    if (!coincidencia) {

        return hora;

    }


    let horas =
        Number(
            coincidencia[1]
        );

    const minutos =
        coincidencia[2];


    const periodo =
        horas >= 12
            ? "PM"
            : "AM";


    horas =
        horas % 12 ||
        12;


    return (
        `${horas}:${minutos} ${periodo}`
    );

}


function obtenerFechaOrden(
    partido
) {

    const fecha =
        convertirAFecha(
            partido.fecha,
            partido.hora
        );


    if (!fecha) {

        return 0;

    }


    return fecha.getTime();

}


function convertirAFecha(
    valorFecha,
    valorHora
) {

    if (!valorFecha) {

        return null;

    }


    if (
        typeof valorFecha?.toDate ===
        "function"
    ) {

        const fecha =
            valorFecha.toDate();

        aplicarHora(
            fecha,
            valorHora
        );

        return fecha;

    }


    if (
        typeof valorFecha ===
        "string"
    ) {

        const coincidencia =
            valorFecha.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (coincidencia) {

            const fecha =
                new Date(
                    Number(
                        coincidencia[1]
                    ),
                    Number(
                        coincidencia[2]
                    ) - 1,
                    Number(
                        coincidencia[3]
                    )
                );


            aplicarHora(
                fecha,
                valorHora
            );


            return fecha;

        }

    }


    const fecha =
        new Date(
            valorFecha
        );


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return null;

    }


    aplicarHora(
        fecha,
        valorHora
    );


    return fecha;

}


function aplicarHora(
    fecha,
    valorHora
) {

    if (
        !fecha ||
        !valorHora
    ) {

        return;

    }


    const texto =
        String(
            valorHora
        )
            .trim()
            .toUpperCase();


    let horas;
    let minutos;


    const formato24 =
        texto.match(
            /^(\d{1,2}):(\d{2})$/
        );


    if (formato24) {

        horas =
            Number(
                formato24[1]
            );

        minutos =
            Number(
                formato24[2]
            );

    } else {

        const formato12 =
            texto.match(
                /^(\d{1,2}):(\d{2})\s?(AM|PM)$/
            );


        if (!formato12) {

            return;

        }


        horas =
            Number(
                formato12[1]
            );

        minutos =
            Number(
                formato12[2]
            );


        if (
            formato12[3] === "PM" &&
            horas !== 12
        ) {

            horas += 12;

        }


        if (
            formato12[3] === "AM" &&
            horas === 12
        ) {

            horas = 0;

        }

    }


    fecha.setHours(
        horas,
        minutos,
        0,
        0
    );

}


function mostrarCarga() {

    estadoCarga.hidden =
        false;

    listaPartidos.hidden =
        true;

    sinPartidos.hidden =
        true;

}


function ocultarCarga() {

    estadoCarga.hidden =
        true;

}


function mostrarError() {

    listaPartidos.hidden =
        true;

    sinPartidos.hidden =
        false;


    const titulo =
        sinPartidos.querySelector(
            "h3"
        );

    const texto =
        sinPartidos.querySelector(
            "p"
        );


    if (titulo) {

        titulo.textContent =
            "No pudimos cargar los partidos";

    }


    if (texto) {

        texto.textContent =
            "Ocurrió un problema al consultar la información. Intenta nuevamente.";

    }


    contadorPartidos.textContent =
        "0 partidos";

}


function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
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


function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );

}