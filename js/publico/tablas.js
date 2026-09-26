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


const perfilInicial =
    document.getElementById("perfilInicial");

const btnPerfil =
    document.getElementById("btnPerfil");

const categoriaSelect =
    document.getElementById("categoriaSelect");

const tituloCategoria =
    document.getElementById("tituloCategoria");

const tablaEquiposDesktop =
    document.getElementById("tablaEquiposDesktop");

const tablaEquiposMobile =
    document.getElementById("tablaEquiposMobile");

const contenedorTablaDesktop =
    document.getElementById("contenedorTablaDesktop");

const estadoTabla =
    document.getElementById("estadoTabla");


let categorias = [];
let equipos = [];
let partidos = [];

let categoriaSeleccionadaId = "";


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    cargarUsuario(usuario);

    activarEventos();

    await cargarInformacion();

}


function cargarUsuario(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        usuario.nombreCompleto?.trim() ||
        usuario.email?.trim() ||
        "Usuario";

    perfilInicial.textContent =
        nombre.charAt(0).toUpperCase();

}


function activarEventos() {

    categoriaSelect.addEventListener(
        "change",
        () => {

            categoriaSeleccionadaId =
                categoriaSelect.value;

            cargarCategoriaActual();

        }
    );


    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
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


        ordenarDatos();

        renderizarCategorias();

    } catch (error) {

        console.error(
            "Error cargando tabla:",
            error
        );

        mostrarError();

    }

}


function ordenarDatos() {

    categorias.sort(
        (a, b) =>
            obtenerNombreCategoria(a)
                .localeCompare(
                    obtenerNombreCategoria(b),
                    "es",
                    {
                        sensitivity: "base"
                    }
                )
    );


    equipos.sort(
        (a, b) =>
            obtenerNombreEquipo(a)
                .localeCompare(
                    obtenerNombreEquipo(b),
                    "es",
                    {
                        sensitivity: "base"
                    }
                )
    );

}


function renderizarCategorias() {

    categoriaSelect.innerHTML = "";


    if (!categorias.length) {

        categoriaSelect.innerHTML = `
            <option value="">
                No hay categorías registradas
            </option>
        `;

        categoriaSelect.disabled = true;

        tituloCategoria.textContent =
            "Sin categorías";

        mostrarEstado(
            "⚽",
            "No hay categorías registradas",
            "Cuando se creen categorías aparecerán automáticamente aquí."
        );

        return;

    }


    const categoriasConEquipos =
        categorias.filter(
            categoria =>
                obtenerEquiposCategoria(
                    categoria.id
                ).length > 0
        );


    const categoriasMostrar =
        categoriasConEquipos.length
            ? categoriasConEquipos
            : categorias;


    categoriasMostrar.forEach(
        categoria => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                categoria.id;

            option.textContent =
                obtenerNombreCategoria(
                    categoria
                );

            categoriaSelect.appendChild(
                option
            );

        }
    );


    categoriaSelect.disabled = false;

    categoriaSeleccionadaId =
        categoriasMostrar[0].id;

    categoriaSelect.value =
        categoriaSeleccionadaId;

    cargarCategoriaActual();

}


function cargarCategoriaActual() {

    const categoria =
        categorias.find(
            item =>
                item.id ===
                categoriaSeleccionadaId
        );


    if (!categoria) {

        tituloCategoria.textContent =
            "Categoría";

        mostrarEstado(
            "⚽",
            "Categoría no disponible",
            "No pudimos encontrar la categoría seleccionada."
        );

        return;

    }


    tituloCategoria.textContent =
        obtenerNombreCategoria(
            categoria
        );


    const equiposCategoria =
        obtenerEquiposCategoria(
            categoria.id
        );


    const tabla =
        calcularTabla(
            equiposCategoria,
            categoria.id
        );


    renderizarTabla(
        tabla
    );

}


function obtenerEquiposCategoria(
    categoriaId
) {

    const categoria =
        categorias.find(
            item =>
                item.id ===
                categoriaId
        );


    const nombreCategoria =
        categoria
            ? normalizarTexto(
                obtenerNombreCategoria(
                    categoria
                )
            )
            : "";


    return equipos.filter(
        equipo => {

            const ids = [
                equipo.categoriaId,
                equipo.idCategoria,
                equipo.categoria?.id
            ];


            const id =
                ids.find(
                    valor =>
                        typeof valor ===
                            "string" &&
                        valor.trim()
                );


            if (id) {

                return id.trim() ===
                    categoriaId;

            }


            const nombres = [
                equipo.categoria,
                equipo.nombreCategoria,
                equipo.categoriaNombre
            ];


            return nombres.some(
                valor =>
                    typeof valor ===
                        "string" &&
                    normalizarTexto(
                        valor
                    ) ===
                    nombreCategoria
            );

        }
    );

}


function calcularTabla(
    equiposCategoria,
    categoriaId
) {

    const tabla =
        equiposCategoria.map(
            equipo => ({
                id: equipo.id,
                nombre:
                    obtenerNombreEquipo(
                        equipo
                    ),
                logo:
                    obtenerLogoEquipo(
                        equipo
                    ),
                pj: 0,
                pg: 0,
                pe: 0,
                pp: 0,
                gf: 0,
                gc: 0,
                dg: 0,
                pts: 0
            })
        );


    const mapaEquipos =
        new Map(
            tabla.map(
                equipo => [
                    equipo.id,
                    equipo
                ]
            )
        );


    const partidosCategoria =
        partidos.filter(
            partido =>
                partidoPerteneceCategoria(
                    partido,
                    categoriaId
                )
        );


    partidosCategoria.forEach(
        partido => {

            if (
                !partidoCuentaParaTabla(
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


    tabla.forEach(
        equipo => {

            equipo.dg =
                equipo.gf -
                equipo.gc;

        }
    );


    tabla.sort(
        (a, b) => {

            if (
                b.pts !==
                a.pts
            ) {

                return (
                    b.pts -
                    a.pts
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


            return a.nombre.localeCompare(
                b.nombre,
                "es",
                {
                    sensitivity: "base"
                }
            );

        }
    );


    return tabla;

}


function partidoCuentaParaTabla(
    partido
) {

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


    const resultadoRegistrado =
        partido.resultadoRegistrado ===
            true ||
        partido.resultadoRegistrado ===
            "true";


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


    const tieneMarcador =
        golesLocal !== null &&
        golesVisitante !== null;


    if (!tieneMarcador) {

        return false;

    }


    if (
        resultadoRegistrado
    ) {

        return true;

    }


    return estadosFinalizados.includes(
        estado
    );

}


function partidoPerteneceCategoria(
    partido,
    categoriaId
) {

    const ids = [
        partido.categoriaId,
        partido.idCategoria,
        partido.categoria?.id
    ];


    const id =
        ids.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    if (id) {

        return id.trim() ===
            categoriaId;

    }


    const categoria =
        categorias.find(
            item =>
                item.id ===
                categoriaId
        );


    if (!categoria) {

        return false;

    }


    const nombreCategoria =
        normalizarTexto(
            obtenerNombreCategoria(
                categoria
            )
        );


    const nombres = [
        partido.categoria,
        partido.nombreCategoria,
        partido.categoriaNombre
    ];


    return nombres.some(
        valor =>
            typeof valor ===
                "string" &&
            normalizarTexto(
                valor
            ) ===
                nombreCategoria
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


function renderizarTabla(
    tabla
) {

    tablaEquiposDesktop.innerHTML =
        "";

    tablaEquiposMobile.innerHTML =
        "";


    if (!tabla.length) {

        contenedorTablaDesktop.hidden =
            true;

        tablaEquiposMobile.hidden =
            true;

        mostrarEstado(
            "⚽",
            "No hay equipos registrados",
            "Todavía no existen equipos en esta categoría."
        );

        return;

    }


    estadoTabla.hidden =
        true;

    contenedorTablaDesktop.hidden =
        false;

    tablaEquiposMobile.hidden =
        false;


    renderizarDesktop(
        tabla
    );

    renderizarMobile(
        tabla
    );

}


function renderizarDesktop(
    tabla
) {

    tabla.forEach(
        (equipo, index) => {

            const posicion =
                index + 1;


            const fila =
                document.createElement(
                    "tr"
                );


            fila.innerHTML = `

                <td>

                    <span class="posicion ${
                        posicion <= 2
                            ? "top"
                            : ""
                    }">
                        ${posicion}
                    </span>

                </td>


                <td class="equipo-tabla">

                    ${crearEscudo(
                        equipo,
                        "mini"
                    )}

                    <a
                        href="equipo.html?id=${encodeURIComponent(
                            equipo.id
                        )}"
                    >
                        ${escaparHTML(
                            equipo.nombre
                        )}
                    </a>

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

                <td class="puntos">
                    ${equipo.pts}
                </td>

            `;


            tablaEquiposDesktop.appendChild(
                fila
            );

        }
    );

}


function renderizarMobile(
    tabla
) {

    tabla.forEach(
        (equipo, index) => {

            const posicion =
                index + 1;


            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "equipo-posicion-card";


            tarjeta.innerHTML = `

                <div class="equipo-posicion-superior">

                    <div class="equipo-identidad">

                        <span class="posicion-mobile ${
                            posicion <= 2
                                ? "top"
                                : ""
                        }">
                            ${posicion}
                        </span>


                        ${crearEscudo(
                            equipo,
                            "mobile"
                        )}


                        <div>

                            <strong>
                                ${escaparHTML(
                                    equipo.nombre
                                )}
                            </strong>

                            <span>
                                ${equipo.pj}
                                ${
                                    equipo.pj === 1
                                        ? "partido jugado"
                                        : "partidos jugados"
                                }
                            </span>

                        </div>

                    </div>


                    <div class="puntos-mobile">

                        <strong>
                            ${equipo.pts}
                        </strong>

                        <span>
                            PTS
                        </span>

                    </div>

                </div>


                <div class="estadisticas-mobile">

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
                        <span>PE</span>
                        <strong>
                            ${equipo.pe}
                        </strong>
                    </div>

                    <div>
                        <span>PP</span>
                        <strong>
                            ${equipo.pp}
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

                </div>


                <a
                    href="equipo.html?id=${encodeURIComponent(
                        equipo.id
                    )}"
                    class="btn-ver-equipo"
                >
                    Ver equipo
                </a>

            `;


            tablaEquiposMobile.appendChild(
                tarjeta
            );

        }
    );

}


function crearEscudo(
    equipo,
    tipo
) {

    const clase =
        tipo === "mini"
            ? "escudo-mini"
            : "escudo-mobile";


    if (equipo.logo) {

        return `
            <div class="${clase} escudo-con-logo">

                <img
                    src="${escaparHTML(
                        equipo.logo
                    )}"
                    alt="${escaparHTML(
                        equipo.nombre
                    )}"
                    loading="lazy"
                >

            </div>
        `;

    }


    const inicial =
        equipo.nombre
            ?.trim()
            ?.charAt(0)
            ?.toUpperCase() ||
        "?";


    return `
        <div class="${clase}">
            ${escaparHTML(
                inicial
            )}
        </div>
    `;

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


function mostrarCargando() {

    categoriaSelect.disabled =
        true;

    categoriaSelect.innerHTML = `
        <option value="">
            Cargando categorías...
        </option>
    `;


    tituloCategoria.textContent =
        "Cargando categoría...";


    contenedorTablaDesktop.hidden =
        true;

    tablaEquiposMobile.hidden =
        true;


    mostrarEstado(
        "⚽",
        "Cargando clasificación",
        "Consultando la información oficial de la liga."
    );

}


function mostrarError() {

    categoriaSelect.disabled =
        true;

    categoriaSelect.innerHTML = `
        <option value="">
            No se pudo cargar
        </option>
    `;


    tituloCategoria.textContent =
        "Error de conexión";


    contenedorTablaDesktop.hidden =
        true;

    tablaEquiposMobile.hidden =
        true;


    mostrarEstado(
        "⚠️",
        "No pudimos cargar la tabla",
        "Verifica tu conexión e intenta nuevamente."
    );

}


function mostrarEstado(
    icono,
    titulo,
    descripcion
) {

    estadoTabla.hidden =
        false;


    estadoTabla.innerHTML = `

        <div class="estado-tabla-icono">
            ${escaparHTML(
                icono
            )}
        </div>

        <div>

            <strong>
                ${escaparHTML(
                    titulo
                )}
            </strong>

            <span>
                ${escaparHTML(
                    descripcion
                )}
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