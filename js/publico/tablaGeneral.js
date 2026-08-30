import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";


const categoriaTabla =
    document.getElementById("categoriaTabla");

const estadoCarga =
    document.getElementById("estadoCarga");

const estadoVacio =
    document.getElementById("estadoVacio");

const contenidoTabla =
    document.getElementById("contenidoTabla");

const totalEquipos =
    document.getElementById("totalEquipos");

const totalJugados =
    document.getElementById("totalJugados");

const totalGoles =
    document.getElementById("totalGoles");

const nombreCategoria =
    document.getElementById("nombreCategoria");

const tablaEquipos =
    document.getElementById("tablaEquipos");


let categorias = [];

let equipos = [];

let partidos = [];

let categoriaActual = null;


activarEventos();

await iniciar();


function activarEventos() {

    categoriaTabla.addEventListener(
        "change",
        () => {

            const categoriaId =
                categoriaTabla.value;


            categoriaActual =
                categorias.find(
                    categoria =>
                        categoria.id === categoriaId
                ) || null;


            actualizarTabla();

        }
    );

}


async function iniciar() {

    try {

        await Promise.all([
            cargarCategorias(),
            cargarEquipos(),
            cargarPartidos()
        ]);


        llenarSelectorCategorias();


        seleccionarCategoriaInicial();


        estadoCarga.classList.add(
            "oculto"
        );


        actualizarTabla();

    } catch (error) {

        console.error(
            "Error cargando tabla general:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        mostrarVacio();

    }

}


async function cargarCategorias() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "categorias"
            )
        );


    categorias =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            )
            .filter(
                categoria =>
                    categoria.activa !== false
            )
            .sort(
                (a, b) => {

                    const ordenA =
                        Number(
                            a.orden ?? 999
                        );


                    const ordenB =
                        Number(
                            b.orden ?? 999
                        );


                    if (
                        ordenA !== ordenB
                    ) {

                        return ordenA - ordenB;

                    }


                    return String(
                        a.nombre || ""
                    ).localeCompare(
                        String(
                            b.nombre || ""
                        ),
                        "es"
                    );

                }
            );

}


async function cargarEquipos() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );


    equipos =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

}


async function cargarPartidos() {

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

}


function llenarSelectorCategorias() {

    categoriaTabla.innerHTML =
        `
            <option value="">
                Selecciona una categoría
            </option>
        `;


    categorias.forEach(
        categoria => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                categoria.id;


            option.textContent =
                categoria.nombre ||
                "Categoría";


            categoriaTabla.appendChild(
                option
            );

        }
    );

}


function seleccionarCategoriaInicial() {

    if (!categorias.length) {

        categoriaActual =
            null;

        return;

    }


    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const categoriaURL =
        parametros.get(
            "categoria"
        );


    if (categoriaURL) {

        const encontrada =
            categorias.find(
                categoria =>
                    categoria.id === categoriaURL
            );


        if (encontrada) {

            categoriaActual =
                encontrada;


            categoriaTabla.value =
                encontrada.id;

            return;

        }

    }


    categoriaActual =
        categorias[0];


    categoriaTabla.value =
        categoriaActual.id;

}


function actualizarTabla() {

    if (!categoriaActual) {

        mostrarVacio();

        return;

    }


    const equiposCategoria =
        obtenerEquiposCategoria();


    if (!equiposCategoria.length) {

        mostrarVacio();

        return;

    }


    const tabla =
        calcularTabla(
            equiposCategoria
        );


    renderizarTabla(
        tabla
    );


    actualizarResumen(
        tabla
    );


    nombreCategoria.textContent =
        categoriaActual.nombre ||
        "Categoría";


    estadoVacio.classList.add(
        "oculto"
    );


    contenidoTabla.classList.remove(
        "oculto"
    );

}


function obtenerEquiposCategoria() {

    return equipos
        .filter(
            equipo => {

                if (
                    equipo.activo === false
                ) {

                    return false;

                }


                if (
                    equipo.categoriaId
                ) {

                    return (
                        equipo.categoriaId ===
                        categoriaActual.id
                    );

                }


                if (
                    equipo.categoriaNombre &&
                    categoriaActual.nombre
                ) {

                    return normalizar(
                        equipo.categoriaNombre
                    ) ===
                    normalizar(
                        categoriaActual.nombre
                    );

                }


                return false;

            }
        )
        .sort(
            (a, b) =>
                String(
                    a.nombre || ""
                ).localeCompare(
                    String(
                        b.nombre || ""
                    ),
                    "es"
                )
        );

}


function calcularTabla(
    equiposCategoria
) {

    const mapa =
        new Map();


    equiposCategoria.forEach(
        equipo => {

            mapa.set(
                equipo.id,
                {
                    id: equipo.id,

                    nombre:
                        equipo.nombre ||
                        "Equipo",

                    logoUrl:
                        equipo.logoUrl ||
                        null,

                    pj: 0,
                    pg: 0,
                    pe: 0,
                    pp: 0,

                    gf: 0,
                    gc: 0,

                    dg: 0,
                    puntos: 0
                }
            );

        }
    );


    const partidosValidos =
        partidos.filter(
            partido => {

                if (
                    partido.estado !== "finalizado"
                ) {

                    return false;

                }


                if (
                    partido.resultadoRegistrado !== true
                ) {

                    return false;

                }


                const perteneceCategoria =
                    partidoPerteneceCategoria(
                        partido
                    );


                if (!perteneceCategoria) {

                    return false;

                }


                if (
                    !mapa.has(
                        partido.localId
                    )
                ) {

                    return false;

                }


                if (
                    !mapa.has(
                        partido.visitanteId
                    )
                ) {

                    return false;

                }


                return true;

            }
        );


    partidosValidos.forEach(
        partido => {

            const local =
                mapa.get(
                    partido.localId
                );


            const visitante =
                mapa.get(
                    partido.visitanteId
                );


            const golesLocal =
                obtenerNumero(
                    partido.golesLocal
                );


            const golesVisitante =
                obtenerNumero(
                    partido.golesVisitante
                );


            local.pj++;

            visitante.pj++;


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

                local.pg++;

                visitante.pp++;


                local.puntos += 3;

            } else if (
                golesLocal <
                golesVisitante
            ) {

                visitante.pg++;

                local.pp++;


                visitante.puntos += 3;

            } else {

                local.pe++;

                visitante.pe++;


                local.puntos++;

                visitante.puntos++;

            }

        }
    );


    const tabla =
        Array.from(
            mapa.values()
        );


    tabla.forEach(
        equipo => {

            equipo.dg =
                equipo.gf -
                equipo.gc;

        }
    );


    tabla.sort(
        ordenarTabla
    );


    return tabla;

}


function partidoPerteneceCategoria(
    partido
) {

    if (
        partido.categoriaId
    ) {

        return (
            partido.categoriaId ===
            categoriaActual.id
        );

    }


    if (
        partido.categoriaNombre &&
        categoriaActual.nombre
    ) {

        return normalizar(
            partido.categoriaNombre
        ) ===
        normalizar(
            categoriaActual.nombre
        );

    }


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


    if (
        !local ||
        !visitante
    ) {

        return false;

    }


    return (
        equipoPerteneceCategoria(
            local
        ) &&
        equipoPerteneceCategoria(
            visitante
        )
    );

}


function equipoPerteneceCategoria(
    equipo
) {

    if (
        equipo.categoriaId
    ) {

        return (
            equipo.categoriaId ===
            categoriaActual.id
        );

    }


    if (
        equipo.categoriaNombre &&
        categoriaActual.nombre
    ) {

        return normalizar(
            equipo.categoriaNombre
        ) ===
        normalizar(
            categoriaActual.nombre
        );

    }


    return false;

}


function ordenarTabla(
    a,
    b
) {

    if (
        b.puntos !== a.puntos
    ) {

        return (
            b.puntos -
            a.puntos
        );

    }


    if (
        b.dg !== a.dg
    ) {

        return (
            b.dg -
            a.dg
        );

    }


    if (
        b.gf !== a.gf
    ) {

        return (
            b.gf -
            a.gf
        );

    }


    if (
        a.gc !== b.gc
    ) {

        return (
            a.gc -
            b.gc
        );

    }


    if (
        b.pg !== a.pg
    ) {

        return (
            b.pg -
            a.pg
        );

    }


    return String(
        a.nombre
    ).localeCompare(
        String(
            b.nombre
        ),
        "es"
    );

}


function renderizarTabla(
    tabla
) {

    tablaEquipos.innerHTML =
        "";


    tabla.forEach(
        (equipo, index) => {

            const posicion =
                index + 1;


            const fila =
                document.createElement(
                    "tr"
                );


            if (
                posicion === 1
            ) {

                fila.classList.add(
                    "fila-lider"
                );

            }


            const dgClase =
                equipo.dg > 0
                    ? "dg-positivo"
                    : equipo.dg < 0
                        ? "dg-negativo"
                        : "";


            const dgTexto =
                equipo.dg > 0
                    ? `+${equipo.dg}`
                    : equipo.dg;


            fila.innerHTML = `

                <td>

                    <span
                        class="posicion ${
                            posicion <= 3
                                ? `top-${posicion}`
                                : ""
                        }"
                    >
                        ${posicion}
                    </span>

                </td>


                <td class="col-equipo">

                    <div class="equipo-celda">

                        <div
                            class="equipo-logo-tabla"
                        >
                            ${
                                obtenerLogoEquipo(
                                    equipo
                                )
                            }
                        </div>


                        <div class="equipo-info">

                            <strong>
                                ${escaparHTML(
                                    equipo.nombre
                                )}
                            </strong>

                            <span>
                                ${
                                    posicion === 1
                                        ? "Líder"
                                        : `${equipo.puntos} puntos`
                                }
                            </span>

                        </div>

                    </div>

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


                <td class="${dgClase}">
                    ${dgTexto}
                </td>


                <td class="puntos">
                    ${equipo.puntos}
                </td>

            `;


            tablaEquipos.appendChild(
                fila
            );

        }
    );

}


function actualizarResumen(
    tabla
) {

    totalEquipos.textContent =
        tabla.length;


    const partidosJugados =
        tabla.reduce(
            (total, equipo) =>
                total + equipo.pj,
            0
        ) / 2;


    const goles =
        tabla.reduce(
            (total, equipo) =>
                total + equipo.gf,
            0
        );


    totalJugados.textContent =
        partidosJugados;


    totalGoles.textContent =
        goles;

}


function obtenerLogoEquipo(
    equipo
) {

    if (
        equipo.logoUrl
    ) {

        return `
            <img
                src="${escaparHTML(
                    equipo.logoUrl
                )}"
                alt="${escaparHTML(
                    equipo.nombre
                )}"
            >
        `;

    }


    return escaparHTML(
        obtenerInicial(
            equipo.nombre
        )
    );

}


function obtenerNumero(
    valor
) {

    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(numero)
    ) {

        return 0;

    }


    return Math.max(
        0,
        numero
    );

}


function obtenerInicial(
    texto
) {

    const valor =
        String(
            texto ||
            ""
        ).trim();


    if (!valor) {

        return "E";

    }


    return valor
        .charAt(0)
        .toUpperCase();

}


function normalizar(
    texto
) {

    return String(
        texto ||
        ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();

}


function escaparHTML(
    texto
) {

    return String(
        texto ??
        ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");

}


function mostrarVacio() {

    contenidoTabla.classList.add(
        "oculto"
    );


    estadoVacio.classList.remove(
        "oculto"
    );

}