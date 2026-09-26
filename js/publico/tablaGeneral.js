import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPaginaPublica
} from "../roles.js";

import {
    db
} from "../firebase.js";


const estadoCarga =
    document.getElementById("estadoCarga");

const contenidoRanking =
    document.getElementById("contenidoRanking");

const estadoVacio =
    document.getElementById("estadoVacio");

const podioGeneral =
    document.getElementById("podioGeneral");

const totalEquipos =
    document.getElementById("totalEquipos");

const totalCategorias =
    document.getElementById("totalCategorias");

const totalPartidos =
    document.getElementById("totalPartidos");

const totalGoles =
    document.getElementById("totalGoles");

const buscarEquipo =
    document.getElementById("buscarEquipo");

const btnLimpiarBusqueda =
    document.getElementById("btnLimpiarBusqueda");

const resultadoBusqueda =
    document.getElementById("resultadoBusqueda");

const cantidadRanking =
    document.getElementById("cantidadRanking");

const rankingDesktop =
    document.getElementById("rankingDesktop");

const rankingMobile =
    document.getElementById("rankingMobile");

const sinResultados =
    document.getElementById("sinResultados");

const textoActualizacion =
    document.getElementById("textoActualizacion");


let categorias = [];
let equipos = [];
let partidos = [];

let rankingGeneral = [];
let rankingFiltrado = [];


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    activarEventos();

    await cargarInformacion();

}


function activarEventos() {

    buscarEquipo.addEventListener(
        "input",
        aplicarBusqueda
    );


    btnLimpiarBusqueda.addEventListener(
        "click",
        limpiarBusqueda
    );

}


async function cargarInformacion() {

    mostrarCargando();

    try {

        const resultados =
            await Promise.all([
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
                ),
                getDocs(
                    collection(
                        db,
                        "partidos"
                    )
                )
            ]);


        categorias =
            resultados[0].docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        equipos =
            resultados[1].docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        partidos =
            resultados[2].docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        categorias =
            categorias.filter(
                categoria =>
                    categoria.activa !== false
            );


        equipos =
            equipos.filter(
                equipo =>
                    equipo.activo !== false
            );


        if (!equipos.length) {

            mostrarVacio();

            return;

        }


        rankingGeneral =
            construirRankingGeneral();


        rankingFiltrado = [
            ...rankingGeneral
        ];


        renderizarPagina();

    } catch (error) {

        console.error(
            "Error cargando ranking general:",
            error
        );

        mostrarError();

    }

}


function construirRankingGeneral() {

    const ranking =
        equipos.map(
            equipo => {

                const categoria =
                    obtenerCategoriaEquipo(
                        equipo
                    );


                return {
                    id: equipo.id,
                    nombre:
                        obtenerNombreEquipo(
                            equipo
                        ),
                    logo:
                        obtenerLogoEquipo(
                            equipo
                        ),
                    categoriaId:
                        categoria?.id || "",
                    categoriaNombre:
                        categoria
                            ? obtenerNombreCategoria(
                                categoria
                            )
                            : obtenerNombreCategoriaEquipo(
                                equipo
                            ),
                    pj: 0,
                    pg: 0,
                    pe: 0,
                    pp: 0,
                    gf: 0,
                    gc: 0,
                    dg: 0,
                    pts: 0,
                    rendimiento: 0,
                    posicion: 0
                };

            }
        );


    const mapaEquipos =
        new Map(
            ranking.map(
                equipo => [
                    equipo.id,
                    equipo
                ]
            )
        );


    partidos.forEach(
        partido => {

            if (
                !partidoCuentaParaRanking(
                    partido
                )
            ) {

                return;

            }


            const localId =
                obtenerEquipoIdPartido(
                    partido,
                    "local"
                );


            const visitanteId =
                obtenerEquipoIdPartido(
                    partido,
                    "visitante"
                );


            const local =
                mapaEquipos.get(
                    localId
                );


            const visitante =
                mapaEquipos.get(
                    visitanteId
                );


            if (
                !local ||
                !visitante
            ) {

                return;

            }


            const golesLocal =
                obtenerGoles(
                    partido,
                    "local"
                );


            const golesVisitante =
                obtenerGoles(
                    partido,
                    "visitante"
                );


            if (
                golesLocal === null ||
                golesVisitante === null
            ) {

                return;

            }


            local.pj += 1;
            visitante.pj += 1;


            local.gf +=
                golesLocal;

            local.gc +=
                golesVisitante;


            visitante.gf +=
                golesVisitante;

            visitante.gc +=
                golesLocal;


            if (
                golesLocal >
                golesVisitante
            ) {

                local.pg += 1;
                local.pts += 3;

                visitante.pp += 1;

            } else if (
                golesLocal <
                golesVisitante
            ) {

                visitante.pg += 1;
                visitante.pts += 3;

                local.pp += 1;

            } else {

                local.pe += 1;
                visitante.pe += 1;

                local.pts += 1;
                visitante.pts += 1;

            }

        }
    );


    ranking.forEach(
        equipo => {

            equipo.dg =
                equipo.gf -
                equipo.gc;


            if (
                equipo.pj > 0
            ) {

                equipo.rendimiento =
                    (
                        equipo.pts /
                        (
                            equipo.pj *
                            3
                        )
                    ) *
                    100;

            } else {

                equipo.rendimiento =
                    0;

            }

        }
    );


    ranking.sort(
        compararEquipos
    );


    ranking.forEach(
        (equipo, index) => {

            equipo.posicion =
                index + 1;

        }
    );


    return ranking;

}


function compararEquipos(
    a,
    b
) {

    const aJugado =
        a.pj > 0;

    const bJugado =
        b.pj > 0;


    if (
        aJugado !==
        bJugado
    ) {

        return aJugado
            ? -1
            : 1;

    }


    if (
        b.rendimiento !==
        a.rendimiento
    ) {

        return (
            b.rendimiento -
            a.rendimiento
        );

    }


    if (
        b.dg !==
        a.dg
    ) {

        return (
            b.dg -
            a.dg
        );

    }


    if (
        b.gf !==
        a.gf
    ) {

        return (
            b.gf -
            a.gf
        );

    }


    if (
        b.pg !==
        a.pg
    ) {

        return (
            b.pg -
            a.pg
        );

    }


    if (
        b.pts !==
        a.pts
    ) {

        return (
            b.pts -
            a.pts
        );

    }


    return a.nombre.localeCompare(
        b.nombre,
        "es",
        {
            sensitivity: "base"
        }
    );

}


function renderizarPagina() {

    estadoCarga.hidden =
        true;

    estadoVacio.hidden =
        true;

    contenidoRanking.hidden =
        false;


    actualizarResumen();

    renderizarPodio();

    renderizarRanking(
        rankingFiltrado
    );

    actualizarTextoActualizacion();

}


function actualizarResumen() {

    totalEquipos.textContent =
        rankingGeneral.length;


    const categoriasUsadas =
        new Set(
            rankingGeneral
                .map(
                    equipo =>
                        equipo.categoriaId ||
                        normalizarTexto(
                            equipo.categoriaNombre
                        )
                )
                .filter(Boolean)
        );


    totalCategorias.textContent =
        categoriasUsadas.size;


    const partidosValidos =
        obtenerPartidosValidos();


    totalPartidos.textContent =
        partidosValidos.length;


    const goles =
        partidosValidos.reduce(
            (
                acumulado,
                partido
            ) => {

                const golesLocal =
                    obtenerGoles(
                        partido,
                        "local"
                    );


                const golesVisitante =
                    obtenerGoles(
                        partido,
                        "visitante"
                    );


                if (
                    golesLocal === null ||
                    golesVisitante === null
                ) {

                    return acumulado;

                }


                return (
                    acumulado +
                    golesLocal +
                    golesVisitante
                );

            },
            0
        );


    totalGoles.textContent =
        goles;

}


function obtenerPartidosValidos() {

    return partidos.filter(
        partido => {

            if (
                !partidoCuentaParaRanking(
                    partido
                )
            ) {

                return false;

            }


            const localId =
                obtenerEquipoIdPartido(
                    partido,
                    "local"
                );


            const visitanteId =
                obtenerEquipoIdPartido(
                    partido,
                    "visitante"
                );


            if (
                !localId ||
                !visitanteId
            ) {

                return false;

            }


            const golesLocal =
                obtenerGoles(
                    partido,
                    "local"
                );


            const golesVisitante =
                obtenerGoles(
                    partido,
                    "visitante"
                );


            return (
                golesLocal !== null &&
                golesVisitante !== null
            );

        }
    );

}


function renderizarPodio() {

    podioGeneral.innerHTML =
        "";


    const equiposConPartidos =
        rankingGeneral.filter(
            equipo =>
                equipo.pj > 0
        );


    const mejores =
        equiposConPartidos.slice(
            0,
            3
        );


    if (!mejores.length) {

        podioGeneral.innerHTML = `
            <div class="podio-vacio">

                <span>
                    🏆
                </span>

                <strong>
                    El podio está esperando resultados
                </strong>

                <p>
                    Los primeros lugares aparecerán cuando
                    comiencen a registrarse partidos oficiales.
                </p>

            </div>
        `;

        return;

    }


    const posicionesVisuales = [
        {
            indice: 1,
            clase: "segundo",
            medalla: "🥈"
        },
        {
            indice: 0,
            clase: "primero",
            medalla: "🥇"
        },
        {
            indice: 2,
            clase: "tercero",
            medalla: "🥉"
        }
    ];


    posicionesVisuales.forEach(
        configuracion => {

            const equipo =
                mejores[
                    configuracion.indice
                ];


            if (!equipo) {

                return;

            }


            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                `podio-card ${configuracion.clase}`;


            tarjeta.innerHTML = `

                <span class="podio-medalla">
                    ${configuracion.medalla}
                </span>


                <div class="podio-escudo">

                    ${crearContenidoLogo(
                        equipo
                    )}

                </div>


                <span class="podio-posicion">
                    #${equipo.posicion}
                </span>


                <strong class="podio-nombre">
                    ${escaparHTML(
                        equipo.nombre
                    )}
                </strong>


                <span class="podio-categoria">
                    ${escaparHTML(
                        equipo.categoriaNombre ||
                        "Sin categoría"
                    )}
                </span>


                <div class="podio-rendimiento">

                    <strong>
                        ${formatearRendimiento(
                            equipo.rendimiento
                        )}
                    </strong>

                    <span>
                        rendimiento
                    </span>

                </div>


                <div class="podio-datos">

                    <span>
                        ${equipo.pj} PJ
                    </span>

                    <span>
                        ${equipo.pts} PTS
                    </span>

                    <span>
                        ${formatearDiferencia(
                            equipo.dg
                        )} DG
                    </span>

                </div>


                <a
                    href="equipo.html?id=${encodeURIComponent(
                        equipo.id
                    )}"
                    class="podio-ver-equipo"
                >
                    Ver equipo
                </a>

            `;


            podioGeneral.appendChild(
                tarjeta
            );

        }
    );

}


function renderizarRanking(
    ranking
) {

    rankingDesktop.innerHTML =
        "";

    rankingMobile.innerHTML =
        "";


    cantidadRanking.textContent =
        ranking.length;


    if (!ranking.length) {

        sinResultados.hidden =
            false;

        return;

    }


    sinResultados.hidden =
        true;


    ranking.forEach(
        equipo => {

            renderizarFilaDesktop(
                equipo
            );

            renderizarTarjetaMobile(
                equipo
            );

        }
    );

}


function renderizarFilaDesktop(
    equipo
) {

    const fila =
        document.createElement(
            "tr"
        );


    fila.innerHTML = `

        <td>

            ${crearPosicion(
                equipo.posicion,
                "desktop"
            )}

        </td>


        <td class="equipo-ranking">

            <div class="equipo-ranking-logo">

                ${crearContenidoLogo(
                    equipo
                )}

            </div>

            <div class="equipo-ranking-info">

                <a
                    href="equipo.html?id=${encodeURIComponent(
                        equipo.id
                    )}"
                >
                    ${escaparHTML(
                        equipo.nombre
                    )}
                </a>

                <span>
                    #${equipo.posicion} de
                    ${rankingGeneral.length}
                </span>

            </div>

        </td>


        <td class="categoria-ranking">

            <span>
                ${escaparHTML(
                    equipo.categoriaNombre ||
                    "Sin categoría"
                )}
            </span>

        </td>


        <td>
            ${equipo.pj}
        </td>

        <td>
            ${equipo.pg}
        </td>

        <td>
            ${equipo.pe}
        </td>

        <td>
            ${equipo.pp}
        </td>

        <td>
            ${equipo.gf}
        </td>

        <td>
            ${equipo.gc}
        </td>

        <td class="${claseDiferencia(
            equipo.dg
        )}">
            ${formatearDiferencia(
                equipo.dg
            )}
        </td>

        <td class="puntos-ranking">
            ${equipo.pts}
        </td>

        <td>

            ${crearRendimiento(
                equipo
            )}

        </td>

    `;


    rankingDesktop.appendChild(
        fila
    );

}


function renderizarTarjetaMobile(
    equipo
) {

    const tarjeta =
        document.createElement(
            "article"
        );


    tarjeta.className =
        "ranking-card";


    tarjeta.innerHTML = `

        <div class="ranking-card-superior">

            <div class="ranking-card-identidad">

                ${crearPosicion(
                    equipo.posicion,
                    "mobile"
                )}


                <div class="ranking-card-logo">

                    ${crearContenidoLogo(
                        equipo
                    )}

                </div>


                <div class="ranking-card-nombre">

                    <strong>
                        ${escaparHTML(
                            equipo.nombre
                        )}
                    </strong>

                    <span>
                        ${escaparHTML(
                            equipo.categoriaNombre ||
                            "Sin categoría"
                        )}
                    </span>

                </div>

            </div>


            <div class="ranking-card-rendimiento">

                <strong>
                    ${formatearRendimiento(
                        equipo.rendimiento
                    )}
                </strong>

                <span>
                    REND.
                </span>

            </div>

        </div>


        <div class="ranking-card-barra">

            <div
                class="ranking-card-barra-progreso"
                style="width:${limitarPorcentaje(
                    equipo.rendimiento
                )}%"
            >
            </div>

        </div>


        <div class="ranking-card-estadisticas">

            <div>
                <span>PJ</span>
                <strong>
                    ${equipo.pj}
                </strong>
            </div>

            <div>
                <span>PG</span>
                <strong>
                    ${equipo.pg}
                </strong>
            </div>

            <div>
                <span>DG</span>
                <strong class="${claseDiferencia(
                    equipo.dg
                )}">
                    ${formatearDiferencia(
                        equipo.dg
                    )}
                </strong>
            </div>

            <div>
                <span>PTS</span>
                <strong>
                    ${equipo.pts}
                </strong>
            </div>

        </div>


        <div class="ranking-card-inferior">

            <span>
                Posición
                <strong>
                    #${equipo.posicion}
                </strong>
                de
                ${rankingGeneral.length}
            </span>

            <a
                href="equipo.html?id=${encodeURIComponent(
                    equipo.id
                )}"
            >
                Ver equipo →
            </a>

        </div>

    `;


    rankingMobile.appendChild(
        tarjeta
    );

}


function crearPosicion(
    posicion,
    tipo
) {

    let clase =
        tipo === "desktop"
            ? "ranking-posicion"
            : "ranking-posicion-mobile";


    let contenido =
        `#${posicion}`;


    if (posicion === 1) {

        clase +=
            " posicion-oro";

        contenido =
            "🥇";

    } else if (
        posicion === 2
    ) {

        clase +=
            " posicion-plata";

        contenido =
            "🥈";

    } else if (
        posicion === 3
    ) {

        clase +=
            " posicion-bronce";

        contenido =
            "🥉";

    }


    return `
        <span class="${clase}">
            ${contenido}
        </span>
    `;

}


function crearRendimiento(
    equipo
) {

    const porcentaje =
        limitarPorcentaje(
            equipo.rendimiento
        );


    return `
        <div class="rendimiento-tabla">

            <strong>
                ${formatearRendimiento(
                    equipo.rendimiento
                )}
            </strong>

            <div class="rendimiento-barra">

                <span
                    style="width:${porcentaje}%"
                >
                </span>

            </div>

        </div>
    `;

}


function aplicarBusqueda() {

    const texto =
        normalizarTexto(
            buscarEquipo.value
        );


    btnLimpiarBusqueda.hidden =
        !texto;


    if (!texto) {

        rankingFiltrado = [
            ...rankingGeneral
        ];

        resultadoBusqueda.hidden =
            true;

        renderizarRanking(
            rankingFiltrado
        );

        return;

    }


    rankingFiltrado =
        rankingGeneral.filter(
            equipo => {

                const nombre =
                    normalizarTexto(
                        equipo.nombre
                    );


                const categoria =
                    normalizarTexto(
                        equipo.categoriaNombre
                    );


                return (
                    nombre.includes(
                        texto
                    ) ||
                    categoria.includes(
                        texto
                    )
                );

            }
        );


    actualizarResultadoBusqueda(
        texto
    );


    renderizarRanking(
        rankingFiltrado
    );

}


function actualizarResultadoBusqueda(
    texto
) {

    resultadoBusqueda.hidden =
        false;


    if (
        rankingFiltrado.length === 1
    ) {

        const equipo =
            rankingFiltrado[0];


        resultadoBusqueda.innerHTML = `

            <span>
                Resultado encontrado
            </span>

            <strong>
                ${escaparHTML(
                    equipo.nombre
                )}
                ocupa la posición
                #${equipo.posicion}
                de
                ${rankingGeneral.length}
            </strong>

            <small>
                ${formatearRendimiento(
                    equipo.rendimiento
                )}
                de rendimiento
            </small>

        `;

        return;

    }


    if (
        rankingFiltrado.length > 1
    ) {

        resultadoBusqueda.innerHTML = `

            <span>
                Búsqueda
            </span>

            <strong>
                ${rankingFiltrado.length}
                equipos encontrados
            </strong>

            <small>
                Resultados para
                "${escaparHTML(
                    buscarEquipo.value.trim()
                )}"
            </small>

        `;

        return;

    }


    resultadoBusqueda.innerHTML = `

        <span>
            Sin coincidencias
        </span>

        <strong>
            No encontramos equipos
        </strong>

        <small>
            No hay resultados para
            "${escaparHTML(
                buscarEquipo.value.trim()
            )}"
        </small>

    `;

}


function limpiarBusqueda() {

    buscarEquipo.value =
        "";

    btnLimpiarBusqueda.hidden =
        true;

    resultadoBusqueda.hidden =
        true;

    rankingFiltrado = [
        ...rankingGeneral
    ];


    renderizarRanking(
        rankingFiltrado
    );


    buscarEquipo.focus();

}


function partidoCuentaParaRanking(
    partido
) {

    const golesLocal =
        obtenerGoles(
            partido,
            "local"
        );


    const golesVisitante =
        obtenerGoles(
            partido,
            "visitante"
        );


    if (
        golesLocal === null ||
        golesVisitante === null
    ) {

        return false;

    }


    const resultadoRegistrado =
        partido.resultadoRegistrado ===
            true ||
        partido.resultadoRegistrado ===
            "true";


    if (resultadoRegistrado) {

        return true;

    }


    const estado =
        normalizarTexto(
            partido.estado ||
            partido.estatus ||
            partido.status ||
            ""
        );


    const estadosFinalizados = [
        "finalizado",
        "finalizada",
        "terminado",
        "terminada",
        "jugado",
        "jugada",
        "registrado",
        "registrada"
    ];


    return estadosFinalizados.includes(
        estado
    );

}


function obtenerEquipoIdPartido(
    partido,
    tipo
) {

    const valores =
        tipo === "local"
            ? [
                partido.equipoLocalId,
                partido.localId,
                partido.idEquipoLocal,
                partido.equipoLocal?.id
            ]
            : [
                partido.equipoVisitanteId,
                partido.visitanteId,
                partido.idEquipoVisitante,
                partido.equipoVisitante?.id
            ];


    const id =
        valores.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    if (id) {

        return id.trim();

    }


    const nombre =
        obtenerNombreEquipoPartido(
            partido,
            tipo
        );


    if (!nombre) {

        return "";

    }


    const equipo =
        equipos.find(
            item =>
                normalizarTexto(
                    obtenerNombreEquipo(
                        item
                    )
                ) ===
                normalizarTexto(
                    nombre
                )
        );


    return equipo?.id || "";

}


function obtenerNombreEquipoPartido(
    partido,
    tipo
) {

    const valores =
        tipo === "local"
            ? [
                partido.equipoLocalNombre,
                partido.nombreLocal,
                partido.local,
                partido.equipoLocal?.nombre
            ]
            : [
                partido.equipoVisitanteNombre,
                partido.nombreVisitante,
                partido.visitante,
                partido.equipoVisitante?.nombre
            ];


    const nombre =
        valores.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    return nombre?.trim() || "";

}


function obtenerGoles(
    partido,
    tipo
) {

    const valores =
        tipo === "local"
            ? [
                partido.golesLocal,
                partido.marcadorLocal,
                partido.resultadoLocal,
                partido.localGoles,
                partido.golesEquipoLocal
            ]
            : [
                partido.golesVisitante,
                partido.marcadorVisitante,
                partido.resultadoVisitante,
                partido.visitanteGoles,
                partido.golesEquipoVisitante
            ];


    for (
        const valor of valores
    ) {

        if (
            valor === 0 ||
            valor === "0"
        ) {

            return 0;

        }


        if (
            valor !== null &&
            valor !== undefined &&
            valor !== ""
        ) {

            const numero =
                Number(valor);


            if (
                Number.isFinite(
                    numero
                ) &&
                numero >= 0
            ) {

                return numero;

            }

        }

    }


    const marcador =
        partido.marcador ||
        partido.resultado;


    if (
        typeof marcador ===
            "string"
    ) {

        const coincidencia =
            marcador
                .trim()
                .match(
                    /^(\d+)\s*[-–—:]\s*(\d+)$/
                );


        if (coincidencia) {

            return tipo === "local"
                ? Number(
                    coincidencia[1]
                )
                : Number(
                    coincidencia[2]
                );

        }

    }


    return null;

}


function obtenerCategoriaEquipo(
    equipo
) {

    const categoriaId =
        obtenerCategoriaIdEquipo(
            equipo
        );


    if (categoriaId) {

        const categoria =
            categorias.find(
                item =>
                    item.id ===
                    categoriaId
            );


        if (categoria) {

            return categoria;

        }

    }


    const nombre =
        obtenerNombreCategoriaEquipo(
            equipo
        );


    if (!nombre) {

        return null;

    }


    return (
        categorias.find(
            categoria =>
                normalizarTexto(
                    obtenerNombreCategoria(
                        categoria
                    )
                ) ===
                normalizarTexto(
                    nombre
                )
        ) ||
        null
    );

}


function obtenerCategoriaIdEquipo(
    equipo
) {

    const valores = [
        equipo.categoriaId,
        equipo.idCategoria,
        equipo.categoria?.id
    ];


    const id =
        valores.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    return id?.trim() || "";

}


function obtenerNombreCategoriaEquipo(
    equipo
) {

    const valores = [
        typeof equipo.categoria ===
            "string"
            ? equipo.categoria
            : "",
        equipo.categoriaNombre,
        equipo.nombreCategoria,
        equipo.categoria?.nombre
    ];


    const nombre =
        valores.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    return nombre?.trim() ||
        "Sin categoría";

}


function obtenerNombreCategoria(
    categoria
) {

    return (
        categoria?.nombre ||
        categoria?.nombreCategoria ||
        categoria?.categoria ||
        "Categoría"
    )
        .toString()
        .trim();

}


function obtenerNombreEquipo(
    equipo
) {

    return (
        equipo?.nombre ||
        equipo?.nombreEquipo ||
        equipo?.equipo ||
        "Equipo"
    )
        .toString()
        .trim();

}


function obtenerLogoEquipo(
    equipo
) {

    const valores = [
        equipo?.logo,
        equipo?.logoUrl,
        equipo?.logoURL,
        equipo?.escudo,
        equipo?.escudoUrl,
        equipo?.imagen,
        equipo?.imagenUrl
    ];


    return (
        valores.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        ) || ""
    ).trim();

}


function crearContenidoLogo(
    equipo
) {

    if (equipo.logo) {

        return `
            <img
                src="${escaparHTML(
                    equipo.logo
                )}"
                alt="${escaparHTML(
                    equipo.nombre
                )}"
                loading="lazy"
            >
        `;

    }


    const inicial =
        equipo.nombre
            ?.trim()
            ?.charAt(0)
            ?.toUpperCase() ||
        "?";


    return `
        <span>
            ${escaparHTML(
                inicial
            )}
        </span>
    `;

}


function formatearRendimiento(
    rendimiento
) {

    if (
        !Number.isFinite(
            rendimiento
        )
    ) {

        return "0%";

    }


    if (
        rendimiento === 0
    ) {

        return "0%";

    }


    if (
        Number.isInteger(
            rendimiento
        )
    ) {

        return `${rendimiento}%`;

    }


    return `${rendimiento.toFixed(
        1
    )}%`;

}


function limitarPorcentaje(
    porcentaje
) {

    if (
        !Number.isFinite(
            porcentaje
        )
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            porcentaje
        )
    );

}


function formatearDiferencia(
    diferencia
) {

    if (diferencia > 0) {

        return `+${diferencia}`;

    }


    return String(
        diferencia
    );

}


function claseDiferencia(
    diferencia
) {

    if (diferencia > 0) {

        return "positivo";

    }


    if (diferencia < 0) {

        return "negativo";

    }


    return "";

}


function actualizarTextoActualizacion() {

    const ahora =
        new Date();


    const texto =
        ahora.toLocaleDateString(
            "es-MX",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    textoActualizacion.textContent =
        `Actualizado ${texto}`;

}


function mostrarCargando() {

    estadoCarga.hidden =
        false;

    contenidoRanking.hidden =
        true;

    estadoVacio.hidden =
        true;

}


function mostrarVacio() {

    estadoCarga.hidden =
        true;

    contenidoRanking.hidden =
        true;

    estadoVacio.hidden =
        false;

}


function mostrarError() {

    estadoCarga.hidden =
        false;

    contenidoRanking.hidden =
        true;

    estadoVacio.hidden =
        true;


    estadoCarga.innerHTML = `

        <div class="estado-carga-icono">
            ⚠️
        </div>

        <div>

            <strong>
                No pudimos cargar el ranking
            </strong>

            <span>
                Verifica tu conexión e intenta nuevamente.
            </span>

        </div>

    `;

}


function normalizarTexto(
    valor
) {

    return String(
        valor || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();

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