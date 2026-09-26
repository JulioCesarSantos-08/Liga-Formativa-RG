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

const selectorJornadas =
    document.getElementById("selectorJornadas");

const categoriaActual =
    document.getElementById("categoriaActual");

const tituloJornada =
    document.getElementById("tituloJornada");

const estadoJornada =
    document.getElementById("estadoJornada");

const listaPartidos =
    document.getElementById("listaPartidos");


let categorias = [];
let jornadas = [];
let partidos = [];
let equipos = [];

let categoriaSeleccionadaId = "";
let jornadaSeleccionadaId = "";


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

    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );


    categoriaSelect.addEventListener(
        "change",
        async () => {

            categoriaSeleccionadaId =
                categoriaSelect.value;

            jornadaSeleccionadaId = "";

            actualizarNombreCategoria();

            renderizarJornadas();

        }
    );

}


async function cargarInformacion() {

    mostrarCargandoGeneral();

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
                        "jornadas"
                    )
                ),
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
                )
            ]);


        categorias =
            resultados[0].docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        jornadas =
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


        equipos =
            resultados[3].docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        ordenarInformacion();

        renderizarCategorias();

    } catch (error) {

        console.error(
            "Error cargando jornadas:",
            error
        );

        mostrarErrorGeneral();

    }

}


function ordenarInformacion() {

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


    jornadas.sort(
        (a, b) =>
            obtenerNumeroJornada(a) -
            obtenerNumeroJornada(b)
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

        categoriaActual.textContent =
            "Sin categorías";

        tituloJornada.textContent =
            "Jornadas";

        estadoJornada.textContent =
            "Sin información";

        selectorJornadas.innerHTML = "";

        mostrarVacio(
            "No hay categorías registradas",
            "Cuando el administrador cree categorías aparecerán aquí."
        );

        return;

    }


    categorias.forEach(
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
        categorias[0].id;

    categoriaSelect.value =
        categoriaSeleccionadaId;


    actualizarNombreCategoria();

    renderizarJornadas();

}


function actualizarNombreCategoria() {

    const categoria =
        obtenerCategoriaPorId(
            categoriaSeleccionadaId
        );


    categoriaActual.textContent =
        categoria
            ? obtenerNombreCategoria(
                categoria
            )
            : "Categoría";

}


function renderizarJornadas() {

    selectorJornadas.innerHTML = "";


    const jornadasDisponibles =
        obtenerJornadasCategoria(
            categoriaSeleccionadaId
        );


    if (!jornadasDisponibles.length) {

        jornadaSeleccionadaId = "";

        tituloJornada.textContent =
            "Sin jornadas";

        estadoJornada.textContent =
            "Sin partidos";

        mostrarVacio(
            "No hay jornadas disponibles",
            "Todavía no existen partidos registrados para esta categoría."
        );

        return;

    }


    let jornadaInicial = null;


    if (jornadaSeleccionadaId) {

        jornadaInicial =
            jornadasDisponibles.find(
                jornada =>
                    jornada.id ===
                    jornadaSeleccionadaId
            );

    }


    if (!jornadaInicial) {

        jornadaInicial =
            obtenerJornadaPreferida(
                jornadasDisponibles
            );

    }


    jornadaSeleccionadaId =
        jornadaInicial.id;


    jornadasDisponibles.forEach(
        jornada => {

            const boton =
                document.createElement(
                    "button"
                );

            boton.type =
                "button";

            boton.className =
                "jornada-tab";

            boton.dataset.jornadaId =
                jornada.id;

            boton.textContent =
                obtenerNombreJornada(
                    jornada
                );


            if (
                jornada.id ===
                jornadaSeleccionadaId
            ) {

                boton.classList.add(
                    "active"
                );

            }


            boton.addEventListener(
                "click",
                () => {

                    jornadaSeleccionadaId =
                        jornada.id;

                    document
                        .querySelectorAll(
                            ".jornada-tab"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    boton.classList.add(
                        "active"
                    );

                    cargarJornadaSeleccionada();

                }
            );


            selectorJornadas.appendChild(
                boton
            );

        }
    );


    cargarJornadaSeleccionada();

}


function obtenerJornadasCategoria(
    categoriaId
) {

    const idsJornadas =
        new Set();


    partidos.forEach(
        partido => {

            if (
                !partidoPerteneceCategoria(
                    partido,
                    categoriaId
                )
            ) {

                return;

            }


            const jornadaId =
                obtenerJornadaIdPartido(
                    partido
                );


            if (jornadaId) {

                idsJornadas.add(
                    jornadaId
                );

            }

        }
    );


    let resultado =
        jornadas.filter(
            jornada =>
                idsJornadas.has(
                    jornada.id
                ) ||
                jornadaPerteneceCategoria(
                    jornada,
                    categoriaId
                )
        );


    if (!resultado.length) {

        resultado =
            jornadas.filter(
                jornada => {

                    const categoriaJornada =
                        obtenerCategoriaIdJornada(
                            jornada
                        );

                    return !categoriaJornada;

                }
            );

    }


    resultado.sort(
        (a, b) =>
            obtenerNumeroJornada(a) -
            obtenerNumeroJornada(b)
    );


    return resultado;

}


function obtenerJornadaPreferida(
    jornadasDisponibles
) {

    const conPartidos =
        jornadasDisponibles.map(
            jornada => {

                const partidosJornada =
                    obtenerPartidosJornada(
                        jornada.id,
                        categoriaSeleccionadaId
                    );

                return {
                    jornada,
                    partidos:
                        partidosJornada
                };

            }
        );


    const enCurso =
        conPartidos.find(
            item =>
                obtenerEstadoGeneralJornada(
                    item.partidos
                ) === "En curso"
        );


    if (enCurso) {

        return enCurso.jornada;

    }


    const proxima =
        conPartidos.find(
            item =>
                obtenerEstadoGeneralJornada(
                    item.partidos
                ) === "Próxima"
        );


    if (proxima) {

        return proxima.jornada;

    }


    return jornadasDisponibles[
        jornadasDisponibles.length - 1
    ];

}


function cargarJornadaSeleccionada() {

    const jornada =
        jornadas.find(
            item =>
                item.id ===
                jornadaSeleccionadaId
        );


    if (!jornada) {

        tituloJornada.textContent =
            "Jornada";

        estadoJornada.textContent =
            "Sin información";

        mostrarVacio(
            "Jornada no disponible",
            "No fue posible encontrar la jornada seleccionada."
        );

        return;

    }


    tituloJornada.textContent =
        obtenerNombreJornada(
            jornada
        );


    const partidosJornada =
        obtenerPartidosJornada(
            jornada.id,
            categoriaSeleccionadaId
        );


    actualizarEstadoJornada(
        partidosJornada
    );

    renderizarPartidos(
        partidosJornada
    );

}


function obtenerPartidosJornada(
    jornadaId,
    categoriaId
) {

    const resultado =
        partidos.filter(
            partido => {

                const mismoJornada =
                    obtenerJornadaIdPartido(
                        partido
                    ) === jornadaId;


                const mismaCategoria =
                    partidoPerteneceCategoria(
                        partido,
                        categoriaId
                    );


                return (
                    mismoJornada &&
                    mismaCategoria
                );

            }
        );


    resultado.sort(
        (a, b) => {

            const fechaA =
                obtenerFechaOrdenable(
                    a
                );

            const fechaB =
                obtenerFechaOrdenable(
                    b
                );


            if (fechaA !== fechaB) {

                return fechaA - fechaB;

            }


            return obtenerHoraPartido(a)
                .localeCompare(
                    obtenerHoraPartido(b)
                );

        }
    );


    return resultado;

}


function actualizarEstadoJornada(
    partidosJornada
) {

    const estado =
        obtenerEstadoGeneralJornada(
            partidosJornada
        );


    estadoJornada.textContent =
        estado;


    estadoJornada.className =
        "badge-jornada";


    if (
        estado === "Finalizada"
    ) {

        estadoJornada.classList.add(
            "finalizada"
        );

    }


    if (
        estado === "En curso"
    ) {

        estadoJornada.classList.add(
            "en-curso"
        );

    }


    if (
        estado === "Próxima"
    ) {

        estadoJornada.classList.add(
            "proxima"
        );

    }

}


function obtenerEstadoGeneralJornada(
    partidosJornada
) {

    if (!partidosJornada.length) {

        return "Sin partidos";

    }


    const estados =
        partidosJornada.map(
            partido =>
                normalizarEstadoPartido(
                    partido
                )
        );


    const todosFinalizados =
        estados.every(
            estado =>
                estado ===
                "finalizado"
        );


    if (todosFinalizados) {

        return "Finalizada";

    }


    const algunoEnVivo =
        estados.some(
            estado =>
                estado ===
                "en-vivo"
        );


    if (algunoEnVivo) {

        return "En curso";

    }


    const algunoFinalizado =
        estados.some(
            estado =>
                estado ===
                "finalizado"
        );


    if (algunoFinalizado) {

        return "En curso";

    }


    return "Próxima";

}


function renderizarPartidos(
    partidosJornada
) {

    listaPartidos.innerHTML = "";


    if (!partidosJornada.length) {

        mostrarVacio(
            "No hay partidos registrados",
            "Esta jornada todavía no tiene encuentros registrados para la categoría seleccionada."
        );

        return;

    }


    partidosJornada.forEach(
        partido => {

            const equipoLocal =
                obtenerEquipoPartido(
                    partido,
                    "local"
                );


            const equipoVisitante =
                obtenerEquipoPartido(
                    partido,
                    "visitante"
                );


            const nombreLocal =
                obtenerNombreEquipoPartido(
                    partido,
                    equipoLocal,
                    "local"
                );


            const nombreVisitante =
                obtenerNombreEquipoPartido(
                    partido,
                    equipoVisitante,
                    "visitante"
                );


            const logoLocal =
                obtenerLogoEquipo(
                    equipoLocal
                );


            const logoVisitante =
                obtenerLogoEquipo(
                    equipoVisitante
                );


            const estado =
                normalizarEstadoPartido(
                    partido
                );


            const fecha =
                formatearFechaPartido(
                    partido
                );


            const hora =
                formatearHoraPartido(
                    partido
                );


            const campo =
                obtenerCampoPartido(
                    partido
                );


            const marcador =
                obtenerMarcador(
                    partido
                );


            const articulo =
                document.createElement(
                    "article"
                );


            articulo.className =
                "partido-card";


            articulo.innerHTML = `

                <div class="partido-superior">

                    <span>
                        ${escaparHTML(fecha)}
                    </span>

                    <span class="estado-partido ${estado}">
                        ${escaparHTML(
                            obtenerTextoEstado(
                                estado
                            )
                        )}
                    </span>

                </div>


                <div class="partido-principal">

                    <div class="equipo">

                        ${crearEscudoHTML(
                            logoLocal,
                            nombreLocal
                        )}

                        <strong>
                            ${escaparHTML(
                                nombreLocal
                            )}
                        </strong>

                    </div>


                    <div class="partido-centro">

                        <span class="hora">
                            ${escaparHTML(
                                hora
                            )}
                        </span>

                        ${
                            marcador
                                ? `
                                    <strong class="resultado">
                                        ${escaparHTML(
                                            marcador
                                        )}
                                    </strong>
                                `
                                : `
                                    <strong>
                                        VS
                                    </strong>
                                `
                        }

                        <span>
                            ${escaparHTML(
                                campo
                            )}
                        </span>

                    </div>


                    <div class="equipo">

                        ${crearEscudoHTML(
                            logoVisitante,
                            nombreVisitante
                        )}

                        <strong>
                            ${escaparHTML(
                                nombreVisitante
                            )}
                        </strong>

                    </div>

                </div>


                <a
                    href="partido.html?id=${encodeURIComponent(
                        partido.id
                    )}"
                    class="btn-detalle"
                >
                    ${
                        estado ===
                        "finalizado"
                            ? "Ver resultado"
                            : "Ver partido"
                    }
                </a>

            `;


            listaPartidos.appendChild(
                articulo
            );

        }
    );

}


function crearEscudoHTML(
    logo,
    nombre
) {

    if (logo) {

        return `
            <div class="escudo escudo-con-logo">
                <img
                    src="${escaparHTML(
                        logo
                    )}"
                    alt="${escaparHTML(
                        nombre
                    )}"
                    loading="lazy"
                >
            </div>
        `;

    }


    const inicial =
        nombre
            ?.trim()
            ?.charAt(0)
            ?.toUpperCase() ||
        "?";


    return `
        <div class="escudo">
            ${escaparHTML(
                inicial
            )}
        </div>
    `;

}


function obtenerEquipoPartido(
    partido,
    tipo
) {

    const posiblesIds =
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
        posiblesIds.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    if (!id) {

        return null;

    }


    return equipos.find(
        equipo =>
            equipo.id === id
    ) || null;

}


function obtenerNombreEquipoPartido(
    partido,
    equipo,
    tipo
) {

    if (equipo) {

        return obtenerNombreEquipo(
            equipo
        );

    }


    const posibles =
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
        posibles.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    return nombre?.trim() ||
        "Equipo";

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

    if (!equipo) {

        return "";

    }


    const posibles = [
        equipo.logo,
        equipo.logoUrl,
        equipo.logoURL,
        equipo.escudo,
        equipo.escudoUrl,
        equipo.imagen,
        equipo.imagenUrl
    ];


    return (
        posibles.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        ) || ""
    ).trim();

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


function obtenerCategoriaPorId(
    categoriaId
) {

    return categorias.find(
        categoria =>
            categoria.id ===
            categoriaId
    ) || null;

}


function obtenerNombreJornada(
    jornada
) {

    const nombre =
        jornada?.nombre ||
        jornada?.nombreJornada ||
        jornada?.titulo;


    if (
        typeof nombre ===
            "string" &&
        nombre.trim()
    ) {

        return nombre.trim();

    }


    const numero =
        obtenerNumeroJornada(
            jornada
        );


    if (numero) {

        return `Jornada ${numero}`;

    }


    return "Jornada";

}


function obtenerNumeroJornada(
    jornada
) {

    const posibles = [
        jornada?.numero,
        jornada?.numeroJornada,
        jornada?.jornada,
        jornada?.orden
    ];


    for (
        const valor of posibles
    ) {

        const numero =
            Number(valor);


        if (
            Number.isFinite(numero) &&
            numero > 0
        ) {

            return numero;

        }

    }


    const texto =
        jornada?.nombre ||
        jornada?.nombreJornada ||
        "";


    const coincidencia =
        texto
            .toString()
            .match(/\d+/);


    if (coincidencia) {

        return Number(
            coincidencia[0]
        );

    }


    return 999999;

}


function obtenerJornadaIdPartido(
    partido
) {

    const posibles = [
        partido.jornadaId,
        partido.idJornada,
        partido.jornada?.id
    ];


    const id =
        posibles.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    if (id) {

        return id.trim();

    }


    const numeroPartido =
        Number(
            partido.numeroJornada ||
            partido.jornada
        );


    if (
        Number.isFinite(
            numeroPartido
        )
    ) {

        const jornada =
            jornadas.find(
                item =>
                    obtenerNumeroJornada(
                        item
                    ) ===
                    numeroPartido
            );


        return jornada?.id || "";

    }


    return "";

}


function obtenerCategoriaIdJornada(
    jornada
) {

    const posibles = [
        jornada.categoriaId,
        jornada.idCategoria,
        jornada.categoria?.id
    ];


    return (
        posibles.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        ) || ""
    ).trim();

}


function jornadaPerteneceCategoria(
    jornada,
    categoriaId
) {

    const id =
        obtenerCategoriaIdJornada(
            jornada
        );


    if (!id) {

        return false;

    }


    return id === categoriaId;

}


function partidoPerteneceCategoria(
    partido,
    categoriaId
) {

    const posiblesIds = [
        partido.categoriaId,
        partido.idCategoria,
        partido.categoria?.id
    ];


    const id =
        posiblesIds.find(
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
        obtenerCategoriaPorId(
            categoriaId
        );


    if (!categoria) {

        return false;

    }


    const nombreCategoria =
        obtenerNombreCategoria(
            categoria
        )
            .toLowerCase()
            .trim();


    const posiblesNombres = [
        partido.categoria,
        partido.nombreCategoria,
        partido.categoriaNombre
    ];


    return posiblesNombres.some(
        valor =>
            typeof valor ===
                "string" &&
            valor
                .toLowerCase()
                .trim() ===
                nombreCategoria
    );

}


function normalizarEstadoPartido(
    partido
) {

    const estadoOriginal =
        (
            partido.estado ||
            partido.estatus ||
            partido.status ||
            ""
        )
            .toString()
            .toLowerCase()
            .trim();


    const estado =
        estadoOriginal
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /_/g,
                "-"
            )
            .replace(
                /\s+/g,
                "-"
            );


    if (
        [
            "finalizado",
            "finalizada",
            "terminado",
            "terminada",
            "registrada",
            "jugado"
        ].includes(estado)
    ) {

        return "finalizado";

    }


    if (
        [
            "en-vivo",
            "envivo",
            "jugando",
            "curso",
            "en-curso"
        ].includes(estado)
    ) {

        return "en-vivo";

    }


    if (
        [
            "cancelado",
            "cancelada",
            "suspendido",
            "suspendida"
        ].includes(estado)
    ) {

        return "cancelado";

    }


    const marcador =
        obtenerMarcador(
            partido
        );


    if (marcador) {

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

        case "en-vivo":
            return "En vivo";

        case "cancelado":
            return "Cancelado";

        case "proximo":
        default:
            return "Próximo";

    }

}


function obtenerMarcador(
    partido
) {

    const golesLocal =
        obtenerNumeroSeguro([
            partido.golesLocal,
            partido.marcadorLocal,
            partido.resultadoLocal,
            partido.localGoles
        ]);


    const golesVisitante =
        obtenerNumeroSeguro([
            partido.golesVisitante,
            partido.marcadorVisitante,
            partido.resultadoVisitante,
            partido.visitanteGoles
        ]);


    if (
        golesLocal !== null &&
        golesVisitante !== null
    ) {

        return `${golesLocal} - ${golesVisitante}`;

    }


    if (
        typeof partido.resultado ===
            "string" &&
        partido.resultado.trim()
    ) {

        return partido.resultado.trim();

    }


    if (
        typeof partido.marcador ===
            "string" &&
        partido.marcador.trim()
    ) {

        return partido.marcador.trim();

    }


    return "";

}


function obtenerNumeroSeguro(
    valores
) {

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
                )
            ) {

                return numero;

            }

        }

    }


    return null;

}


function obtenerCampoPartido(
    partido
) {

    const posibles = [
        partido.campo,
        partido.cancha,
        partido.lugar,
        partido.sede,
        partido.nombreCampo
    ];


    const campo =
        posibles.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    return campo?.trim() ||
        "Campo por definir";

}


function obtenerFechaPartido(
    partido
) {

    return (
        partido.fecha ||
        partido.fechaPartido ||
        partido.dia ||
        partido.fechaHora ||
        null
    );

}


function formatearFechaPartido(
    partido
) {

    const valor =
        obtenerFechaPartido(
            partido
        );


    const fecha =
        convertirAFecha(
            valor
        );


    if (!fecha) {

        if (
            typeof valor ===
                "string" &&
            valor.trim()
        ) {

            return valor.trim();

        }


        return "Fecha por definir";

    }


    const texto =
        new Intl.DateTimeFormat(
            "es-MX",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        ).format(fecha);


    return texto.charAt(0)
        .toUpperCase() +
        texto.slice(1);

}


function obtenerHoraPartido(
    partido
) {

    const posibles = [
        partido.hora,
        partido.horaPartido,
        partido.horario
    ];


    const hora =
        posibles.find(
            valor =>
                typeof valor ===
                    "string" &&
                valor.trim()
        );


    return hora?.trim() || "";

}


function formatearHoraPartido(
    partido
) {

    const hora =
        obtenerHoraPartido(
            partido
        );


    if (hora) {

        const coincidencia =
            hora.match(
                /^(\d{1,2}):(\d{2})$/
            );


        if (coincidencia) {

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
                horas % 12 || 12;


            return `${horas}:${minutos} ${periodo}`;

        }


        return hora;

    }


    const fecha =
        convertirAFecha(
            obtenerFechaPartido(
                partido
            )
        );


    if (fecha) {

        const horas =
            fecha.getHours();

        const minutos =
            fecha.getMinutes();


        if (
            horas !== 0 ||
            minutos !== 0
        ) {

            return new Intl.DateTimeFormat(
                "es-MX",
                {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            ).format(fecha);

        }

    }


    return "Hora por definir";

}


function obtenerFechaOrdenable(
    partido
) {

    const fecha =
        convertirAFecha(
            obtenerFechaPartido(
                partido
            )
        );


    if (!fecha) {

        return Number.MAX_SAFE_INTEGER;

    }


    return fecha.getTime();

}


function convertirAFecha(
    valor
) {

    if (!valor) {

        return null;

    }


    if (
        typeof valor.toDate ===
        "function"
    ) {

        const fecha =
            valor.toDate();

        return Number.isNaN(
            fecha.getTime()
        )
            ? null
            : fecha;

    }


    if (
        typeof valor ===
            "object" &&
        typeof valor.seconds ===
            "number"
    ) {

        const fecha =
            new Date(
                valor.seconds *
                1000
            );

        return Number.isNaN(
            fecha.getTime()
        )
            ? null
            : fecha;

    }


    if (
        valor instanceof Date
    ) {

        return Number.isNaN(
            valor.getTime()
        )
            ? null
            : valor;

    }


    if (
        typeof valor ===
            "string"
    ) {

        const texto =
            valor.trim();


        if (!texto) {

            return null;

        }


        const coincidencia =
            texto.match(
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


            return Number.isNaN(
                fecha.getTime()
            )
                ? null
                : fecha;

        }


        const fecha =
            new Date(texto);


        return Number.isNaN(
            fecha.getTime()
        )
            ? null
            : fecha;

    }


    return null;

}


function mostrarCargandoGeneral() {

    categoriaSelect.disabled =
        true;

    categoriaSelect.innerHTML = `
        <option value="">
            Cargando categorías...
        </option>
    `;


    selectorJornadas.innerHTML = `
        <span class="jornadas-cargando">
            Cargando jornadas...
        </span>
    `;


    categoriaActual.textContent =
        "Consultando información";

    tituloJornada.textContent =
        "Jornadas";

    estadoJornada.textContent =
        "Cargando";


    listaPartidos.innerHTML = `
        <div class="estado-carga">
            <div class="estado-carga-icono">
                ⚽
            </div>

            <strong>
                Cargando calendario
            </strong>

            <span>
                Estamos consultando las jornadas oficiales.
            </span>
        </div>
    `;

}


function mostrarErrorGeneral() {

    categoriaSelect.disabled =
        true;

    categoriaSelect.innerHTML = `
        <option value="">
            No se pudo cargar
        </option>
    `;


    selectorJornadas.innerHTML = "";


    categoriaActual.textContent =
        "Error de conexión";

    tituloJornada.textContent =
        "Jornadas";

    estadoJornada.textContent =
        "Error";


    mostrarVacio(
        "No pudimos cargar el calendario",
        "Verifica tu conexión e intenta nuevamente."
    );

}


function mostrarVacio(
    titulo,
    descripcion
) {

    listaPartidos.innerHTML = `
        <div class="estado-carga estado-vacio">

            <div class="estado-carga-icono">
                ⚽
            </div>

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