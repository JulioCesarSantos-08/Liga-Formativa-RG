import {
    collection,
    doc,
    getDoc,
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


const contenidoEquipo =
    document.getElementById(
        "contenidoEquipo"
    );

const estadoCargaEquipo =
    document.getElementById(
        "estadoCargaEquipo"
    );

const estadoErrorEquipo =
    document.getElementById(
        "estadoErrorEquipo"
    );

const tituloErrorEquipo =
    document.getElementById(
        "tituloErrorEquipo"
    );

const textoErrorEquipo =
    document.getElementById(
        "textoErrorEquipo"
    );


const topbarNombreEquipo =
    document.getElementById(
        "topbarNombreEquipo"
    );

const heroEscudo =
    document.getElementById(
        "heroEscudo"
    );

const heroCategoria =
    document.getElementById(
        "heroCategoria"
    );

const nombreEquipo =
    document.getElementById(
        "nombreEquipo"
    );

const estadoEquipo =
    document.getElementById(
        "estadoEquipo"
    );


const posicionEquipo =
    document.getElementById(
        "posicionEquipo"
    );

const puntosEquipo =
    document.getElementById(
        "puntosEquipo"
    );

const partidosEquipo =
    document.getElementById(
        "partidosEquipo"
    );

const diferenciaEquipo =
    document.getElementById(
        "diferenciaEquipo"
    );


const statPJ =
    document.getElementById(
        "statPJ"
    );

const statPG =
    document.getElementById(
        "statPG"
    );

const statPE =
    document.getElementById(
        "statPE"
    );

const statPP =
    document.getElementById(
        "statPP"
    );

const statGF =
    document.getElementById(
        "statGF"
    );

const statGC =
    document.getElementById(
        "statGC"
    );


const proximoPartidoContenido =
    document.getElementById(
        "proximoPartidoContenido"
    );

const listaResultados =
    document.getElementById(
        "listaResultados"
    );


const contadorPlantilla =
    document.getElementById(
        "contadorPlantilla"
    );

const listaJugadores =
    document.getElementById(
        "listaJugadores"
    );


let usuarioActual = null;

let equipo = null;

let equipos = [];

let jugadores = [];

let partidos = [];


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    usuarioActual =
        usuario;

    cargarUsuario(
        usuario
    );

    activarEventos();

    await iniciar();

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

    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );

}


async function iniciar() {

    mostrarCarga();


    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const equipoId =
        parametros.get(
            "id"
        );


    if (!equipoId) {

        mostrarError(
            "Equipo no encontrado",
            "No se recibió el identificador del equipo."
        );

        return;

    }


    try {

        const [
            snapshotEquipo,
            snapshotEquipos,
            snapshotJugadores,
            snapshotPartidos
        ] = await Promise.all([

            getDoc(
                doc(
                    db,
                    "equipos",
                    equipoId
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
                    "jugadores"
                )
            ),

            getDocs(
                collection(
                    db,
                    "partidos"
                )
            )

        ]);


        if (
            !snapshotEquipo.exists()
        ) {

            mostrarError(
                "Equipo no encontrado",
                "El equipo solicitado no existe o ya no está disponible."
            );

            return;

        }


        equipo = {
            id:
                snapshotEquipo.id,

            ...snapshotEquipo.data()
        };


        equipos =
            snapshotEquipos.docs.map(
                documento => ({
                    id:
                        documento.id,

                    ...documento.data()
                })
            );


        jugadores =
            snapshotJugadores.docs.map(
                documento => ({
                    id:
                        documento.id,

                    ...documento.data()
                })
            );


        partidos =
            snapshotPartidos.docs.map(
                documento => ({
                    id:
                        documento.id,

                    ...documento.data()
                })
            );


        renderizarEquipo();

        mostrarContenido();

    } catch (error) {

        console.error(
            "Error cargando equipo:",
            error
        );


        mostrarError(
            "No pudimos cargar el equipo",
            "Ocurrió un problema al consultar la información."
        );

    }

}


function renderizarEquipo() {

    renderizarHero();

    renderizarEstadisticas();

    renderizarProximoPartido();

    renderizarResultados();

    renderizarPlantilla();

}


function renderizarHero() {

    const nombre =
        equipo.nombre ||
        "Equipo";


    topbarNombreEquipo.textContent =
        nombre;


    nombreEquipo.textContent =
        nombre;


    heroCategoria.textContent =
        equipo.categoriaNombre ||
        "Sin categoría";


    renderizarEscudo(
        heroEscudo,
        equipo,
        nombre
    );


    const estado =
        obtenerEstadoEquipo(
            equipo
        );


    if (
        estado ===
        "descalificado"
    ) {

        estadoEquipo.textContent =
            "● Descalificado";

        estadoEquipo.className =
            "estado-activo";

        estadoEquipo.style.background =
            "rgba(243,214,208,.16)";

        estadoEquipo.style.borderColor =
            "rgba(255,184,170,.40)";

        estadoEquipo.style.color =
            "#ffe1db";

        return;

    }


    if (
        estado ===
        "inactivo"
    ) {

        estadoEquipo.textContent =
            "● Inactivo";

        estadoEquipo.className =
            "estado-activo";

        estadoEquipo.style.background =
            "rgba(240,215,154,.15)";

        estadoEquipo.style.borderColor =
            "rgba(240,215,154,.40)";

        estadoEquipo.style.color =
            "#f7e6ba";

        return;

    }


    estadoEquipo.textContent =
        "● Activo";

    estadoEquipo.className =
        "estado-activo";

}


function renderizarEstadisticas() {

    const pj =
        numeroSeguro(
            equipo.pj
        );

    const pg =
        numeroSeguro(
            equipo.pg
        );

    const pe =
        numeroSeguro(
            equipo.pe
        );

    const pp =
        numeroSeguro(
            equipo.pp
        );

    const gf =
        numeroSeguro(
            equipo.gf
        );

    const gc =
        numeroSeguro(
            equipo.gc
        );

    const dg =
        numeroSeguro(
            equipo.dg
        );

    const pts =
        numeroSeguro(
            equipo.pts
        );


    posicionEquipo.textContent =
        obtenerPosicion();


    puntosEquipo.textContent =
        pts;


    partidosEquipo.textContent =
        pj;


    diferenciaEquipo.textContent =
        formatearDiferencia(
            dg
        );


    diferenciaEquipo.className =
        claseDiferencia(
            dg
        );


    statPJ.textContent =
        pj;

    statPG.textContent =
        pg;

    statPE.textContent =
        pe;

    statPP.textContent =
        pp;

    statGF.textContent =
        gf;

    statGC.textContent =
        gc;

}


function obtenerPosicion() {

    const categoriaId =
        equipo.categoriaId;


    if (!categoriaId) {

        return "-";

    }


    const equiposCategoria =
        equipos.filter(
            item =>
                item.categoriaId ===
                categoriaId
        );


    equiposCategoria.sort(
        (a, b) => {

            const puntosA =
                numeroSeguro(
                    a.pts
                );

            const puntosB =
                numeroSeguro(
                    b.pts
                );


            if (
                puntosB !==
                puntosA
            ) {

                return (
                    puntosB -
                    puntosA
                );

            }


            const dgA =
                numeroSeguro(
                    a.dg
                );

            const dgB =
                numeroSeguro(
                    b.dg
                );


            if (
                dgB !==
                dgA
            ) {

                return (
                    dgB -
                    dgA
                );

            }


            const gfA =
                numeroSeguro(
                    a.gf
                );

            const gfB =
                numeroSeguro(
                    b.gf
                );


            if (
                gfB !==
                gfA
            ) {

                return (
                    gfB -
                    gfA
                );

            }


            return String(
                a.nombre ||
                ""
            ).localeCompare(
                String(
                    b.nombre ||
                    ""
                ),
                "es"
            );

        }
    );


    const posicion =
        equiposCategoria.findIndex(
            item =>
                item.id ===
                equipo.id
        );


    if (
        posicion === -1
    ) {

        return "-";

    }


    return `${posicion + 1}°`;

}


function renderizarProximoPartido() {

    const proximos =
        partidos.filter(
            partido => {

                const pertenece =
                    partido.localId ===
                        equipo.id ||
                    partido.visitanteId ===
                        equipo.id;


                if (!pertenece) {

                    return false;

                }


                const estado =
                    normalizarEstadoPartido(
                        partido
                    );


                if (
                    estado !==
                    "proximo"
                ) {

                    return false;

                }


                const fecha =
                    convertirFechaPartido(
                        partido
                    );


                if (!fecha) {

                    return true;

                }


                return (
                    fecha.getTime() >=
                    inicioHoy().getTime()
                );

            }
        );


    proximos.sort(
        (a, b) => {

            const fechaA =
                convertirFechaPartido(
                    a
                );

            const fechaB =
                convertirFechaPartido(
                    b
                );


            if (
                fechaA &&
                fechaB
            ) {

                return (
                    fechaA.getTime() -
                    fechaB.getTime()
                );

            }


            if (fechaA) {

                return -1;

            }


            if (fechaB) {

                return 1;

            }


            return 0;

        }
    );


    const proximo =
        proximos[0];


    if (!proximo) {

        proximoPartidoContenido.innerHTML = `
            <article class="partido-card">

                <div
                    style="
                        min-height:145px;
                        display:flex;
                        flex-direction:column;
                        align-items:center;
                        justify-content:center;
                        gap:7px;
                        text-align:center;
                    "
                >

                    <span
                        style="
                            font-size:1.5rem;
                        "
                    >
                        📅
                    </span>

                    <strong>
                        Sin próximo partido
                    </strong>

                    <span
                        style="
                            color:#68746e;
                            font-size:.70rem;
                        "
                    >
                        Todavía no hay otro encuentro programado.
                    </span>

                </div>

            </article>
        `;

        return;

    }


    const local =
        buscarEquipo(
            proximo.localId
        );

    const visitante =
        buscarEquipo(
            proximo.visitanteId
        );


    proximoPartidoContenido.innerHTML = `
        <a
            href="partido.html?id=${encodeURIComponent(
                proximo.id
            )}"
            class="partido-card"
            style="
                display:block;
            "
        >

            <div class="partido-superior">

                <span>
                    ${escaparHTML(
                        obtenerNombreJornada(
                            proximo
                        )
                    )}
                </span>

                <span class="estado-partido">
                    Próximo
                </span>

            </div>


            <div class="partido-principal">

                <div class="equipo-partido">

                    <div class="escudo-partido">

                        ${obtenerEscudoHTML(
                            local,
                            proximo.localNombre ||
                            "Local"
                        )}

                    </div>

                    <strong>
                        ${escaparHTML(
                            proximo.localNombre ||
                            local?.nombre ||
                            "Local"
                        )}
                    </strong>

                </div>


                <div class="partido-centro">

                    <span class="hora">
                        ${escaparHTML(
                            formatearHora(
                                proximo.hora
                            )
                        )}
                    </span>

                    <strong>
                        VS
                    </strong>

                    <span>
                        ${escaparHTML(
                            formatearFechaLarga(
                                proximo.fecha
                            )
                        )}
                    </span>

                </div>


                <div class="equipo-partido">

                    <div class="escudo-partido">

                        ${obtenerEscudoHTML(
                            visitante,
                            proximo.visitanteNombre ||
                            "Visitante"
                        )}

                    </div>

                    <strong>
                        ${escaparHTML(
                            proximo.visitanteNombre ||
                            visitante?.nombre ||
                            "Visitante"
                        )}
                    </strong>

                </div>

            </div>


            <div class="partido-campo">
                📍
                ${escaparHTML(
                    proximo.campo ||
                    "Campo por definir"
                )}
            </div>

        </a>
    `;

}


function renderizarResultados() {

    listaResultados.innerHTML =
        "";


    let resultados =
        partidos.filter(
            partido => {

                const pertenece =
                    partido.localId ===
                        equipo.id ||
                    partido.visitanteId ===
                        equipo.id;


                if (!pertenece) {

                    return false;

                }


                return (
                    normalizarEstadoPartido(
                        partido
                    ) ===
                    "finalizado"
                );

            }
        );


    resultados.sort(
        (a, b) => {

            const fechaA =
                convertirFechaPartido(
                    a
                );

            const fechaB =
                convertirFechaPartido(
                    b
                );


            return (
                (fechaB?.getTime() || 0) -
                (fechaA?.getTime() || 0)
            );

        }
    );


    resultados =
        resultados.slice(
            0,
            5
        );


    if (!resultados.length) {

        listaResultados.innerHTML = `
            <article class="resultado-card">

                <div
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        min-height:80px;
                        margin:0;
                        color:#68746e;
                        font-size:.70rem;
                        text-align:center;
                    "
                >
                    Este equipo todavía no tiene resultados registrados.
                </div>

            </article>
        `;

        return;

    }


    resultados.forEach(
        partido => {

            const golesLocal =
                numeroSeguro(
                    partido.golesLocal
                );

            const golesVisitante =
                numeroSeguro(
                    partido.golesVisitante
                );


            const resultado =
                obtenerResultadoEquipo(
                    partido,
                    golesLocal,
                    golesVisitante
                );


            const tarjeta =
                document.createElement(
                    "a"
                );


            tarjeta.href =
                `partido.html?id=${encodeURIComponent(
                    partido.id
                )}`;


            tarjeta.className =
                "resultado-card";


            tarjeta.innerHTML = `

                <div>

                    <span>
                        ${escaparHTML(
                            obtenerNombreJornada(
                                partido
                            )
                        )}
                    </span>

                    <small>
                        ${escaparHTML(
                            formatearFechaCorta(
                                partido.fecha
                            )
                        )}
                    </small>

                </div>


                <div class="resultado-partido">

                    <span>
                        ${escaparHTML(
                            partido.localNombre ||
                            buscarEquipo(
                                partido.localId
                            )?.nombre ||
                            "Local"
                        )}
                    </span>


                    <strong
                        class="${resultado.clase}"
                    >
                        ${golesLocal}
                        -
                        ${golesVisitante}
                    </strong>


                    <span>
                        ${escaparHTML(
                            partido.visitanteNombre ||
                            buscarEquipo(
                                partido.visitanteId
                            )?.nombre ||
                            "Visitante"
                        )}
                    </span>

                </div>

            `;


            listaResultados.appendChild(
                tarjeta
            );

        }
    );

}


function obtenerResultadoEquipo(
    partido,
    golesLocal,
    golesVisitante
) {

    const esLocal =
        partido.localId ===
        equipo.id;


    const golesEquipo =
        esLocal
            ? golesLocal
            : golesVisitante;


    const golesRival =
        esLocal
            ? golesVisitante
            : golesLocal;


    if (
        golesEquipo >
        golesRival
    ) {

        return {
            tipo:
                "victoria",

            clase:
                "resultado-victoria"
        };

    }


    if (
        golesEquipo ===
        golesRival
    ) {

        return {
            tipo:
                "empate",

            clase:
                "resultado-empate"
        };

    }


    return {
        tipo:
            "derrota",

        clase:
            ""
    };

}


function renderizarPlantilla() {

    let plantilla =
        jugadores.filter(
            jugador =>
                jugador.equipoId ===
                equipo.id
        );


    plantilla.sort(
        (a, b) => {

            const numeroA =
                obtenerNumeroJugador(
                    a
                );

            const numeroB =
                obtenerNumeroJugador(
                    b
                );


            if (
                numeroA !==
                numeroB
            ) {

                return (
                    numeroA -
                    numeroB
                );

            }


            return String(
                obtenerNombreJugador(
                    a
                )
            ).localeCompare(
                obtenerNombreJugador(
                    b
                ),
                "es"
            );

        }
    );


    contadorPlantilla.textContent =
        `${plantilla.length} ${
            plantilla.length === 1
                ? "jugador"
                : "jugadores"
        }`;


    listaJugadores.innerHTML =
        "";


    if (!plantilla.length) {

        listaJugadores.innerHTML = `
            <div
                style="
                    padding:22px;
                    border:1px solid #baa676;
                    border-radius:13px;
                    background:rgba(255,248,232,.88);
                    color:#68746e;
                    font-size:.72rem;
                    text-align:center;
                "
            >
                No hay jugadores registrados en este equipo.
            </div>
        `;

        return;

    }


    plantilla.forEach(
        jugador => {

            const suspendido =
                jugador.suspendido ===
                    true ||
                numeroSeguro(
                    jugador.partidosSuspensionPendientes
                ) > 0;


            const enlace =
                document.createElement(
                    "a"
                );


            enlace.href =
                `jugador.html?id=${encodeURIComponent(
                    jugador.id
                )}`;


            enlace.className =
                suspendido
                    ? "jugador-card jugador-suspendido"
                    : "jugador-card";


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "-";


            const goles =
                numeroSeguro(
                    jugador.goles
                );

            const amarillas =
                numeroSeguro(
                    jugador.amarillas
                );

            const rojas =
                numeroSeguro(
                    jugador.rojas
                );


            enlace.innerHTML = `

                <div class="foto-jugador">

                    ${obtenerFotoJugadorHTML(
                        jugador
                    )}

                </div>


                <div class="jugador-info">

                    <strong>
                        ${escaparHTML(
                            obtenerNombreJugador(
                                jugador
                            )
                        )}
                    </strong>


                    <span>
                        #${escaparHTML(
                            numero
                        )}
                    </span>


                    ${
                        suspendido
                            ? `
                                <small class="texto-suspendido">
                                    ⛔ Suspendido
                                </small>
                            `
                            : obtenerResumenJugador(
                                goles,
                                amarillas,
                                rojas
                            )
                    }

                </div>

            `;


            listaJugadores.appendChild(
                enlace
            );

        }
    );

}


function obtenerResumenJugador(
    goles,
    amarillas,
    rojas
) {

    if (
        goles > 0
    ) {

        return `
            <small>
                ⚽ ${goles}
                ${
                    goles === 1
                        ? "gol"
                        : "goles"
                }
            </small>
        `;

    }


    if (
        amarillas > 0
    ) {

        return `
            <small>
                🟨 ${amarillas}
                ${
                    amarillas === 1
                        ? "amarilla"
                        : "amarillas"
                }
            </small>
        `;

    }


    if (
        rojas > 0
    ) {

        return `
            <small>
                🟥 ${rojas}
                ${
                    rojas === 1
                        ? "roja"
                        : "rojas"
                }
            </small>
        `;

    }


    return `
        <small>
            Sin incidencias
        </small>
    `;

}


function obtenerFotoJugadorHTML(
    jugador
) {

    const foto =
        jugador.fotoUrl ||
        "";


    if (foto) {

        return `
            <img
                src="${escaparAtributo(
                    foto
                )}"
                alt="${escaparAtributo(
                    obtenerNombreJugador(
                        jugador
                    )
                )}"
                loading="lazy"
            >
        `;

    }


    return escaparHTML(
        obtenerIniciales(
            obtenerNombreJugador(
                jugador
            )
        )
    );

}


function obtenerNombreJugador(
    jugador
) {

    return (
        jugador.nombreCompleto ||
        jugador.nombre ||
        "Jugador"
    );

}


function obtenerNumeroJugador(
    jugador
) {

    const numero =
        Number(
            jugador.numero ??
            jugador.dorsal
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return 999;

    }


    return numero;

}


function buscarEquipo(
    equipoId
) {

    if (!equipoId) {

        return null;

    }


    return (
        equipos.find(
            item =>
                item.id ===
                equipoId
        ) ||
        null
    );

}


function renderizarEscudo(
    contenedor,
    datosEquipo,
    nombre
) {

    contenedor.innerHTML =
        obtenerEscudoHTML(
            datosEquipo,
            nombre
        );

}


function obtenerEscudoHTML(
    datosEquipo,
    nombre
) {

    const logo =
        datosEquipo?.logoUrl ||
        "";


    if (logo) {

        return `
            <img
                src="${escaparAtributo(
                    logo
                )}"
                alt="${escaparAtributo(
                    nombre ||
                    datosEquipo?.nombre ||
                    "Equipo"
                )}"
                loading="lazy"
            >
        `;

    }


    return escaparHTML(
        obtenerIniciales(
            nombre ||
            datosEquipo?.nombre ||
            "E"
        )
    );

}


function obtenerIniciales(
    nombre
) {

    const palabras =
        String(
            nombre || ""
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!palabras.length) {

        return "E";

    }


    if (
        palabras.length === 1
    ) {

        return palabras[0]
            .charAt(0)
            .toUpperCase();

    }


    return (
        palabras[0]
            .charAt(0) +
        palabras[1]
            .charAt(0)
    ).toUpperCase();

}


function obtenerEstadoEquipo(
    datosEquipo
) {

    if (
        datosEquipo.estado ===
            "descalificado" ||
        datosEquipo.descalificado ===
            true
    ) {

        return "descalificado";

    }


    if (
        datosEquipo.estado ===
            "inactivo" ||
        datosEquipo.activo ===
            false
    ) {

        return "inactivo";

    }


    return "activo";

}


function normalizarEstadoPartido(
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
        partido.resultadoRegistrado ===
            true ||
        partido.cedulaCreada ===
            true
    ) {

        if (
            partido.golesLocal !==
                undefined &&
            partido.golesVisitante !==
                undefined
        ) {

            return "finalizado";

        }

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


    return "proximo";

}


function obtenerNombreJornada(
    partido
) {

    if (
        partido.jornadaNombre
    ) {

        return partido.jornadaNombre;

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


function convertirFechaPartido(
    partido
) {

    if (
        !partido?.fecha
    ) {

        return null;

    }


    let fecha;


    if (
        typeof partido.fecha?.toDate ===
        "function"
    ) {

        fecha =
            partido.fecha.toDate();

    } else if (
        typeof partido.fecha ===
        "string"
    ) {

        const coincidencia =
            partido.fecha.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (coincidencia) {

            fecha =
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

        } else {

            fecha =
                new Date(
                    partido.fecha
                );

        }

    } else {

        fecha =
            new Date(
                partido.fecha
            );

    }


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return null;

    }


    aplicarHora(
        fecha,
        partido.hora
    );


    return fecha;

}


function aplicarHora(
    fecha,
    hora
) {

    if (
        !hora
    ) {

        return;

    }


    const texto =
        String(
            hora
        )
            .trim()
            .toUpperCase();


    const formato24 =
        texto.match(
            /^(\d{1,2}):(\d{2})$/
        );


    if (formato24) {

        fecha.setHours(
            Number(
                formato24[1]
            ),
            Number(
                formato24[2]
            ),
            0,
            0
        );

        return;

    }


    const formato12 =
        texto.match(
            /^(\d{1,2}):(\d{2})\s?(AM|PM)$/
        );


    if (!formato12) {

        return;

    }


    let horas =
        Number(
            formato12[1]
        );

    const minutos =
        Number(
            formato12[2]
        );


    if (
        formato12[3] ===
            "PM" &&
        horas !== 12
    ) {

        horas += 12;

    }


    if (
        formato12[3] ===
            "AM" &&
        horas === 12
    ) {

        horas = 0;

    }


    fecha.setHours(
        horas,
        minutos,
        0,
        0
    );

}


function inicioHoy() {

    const fecha =
        new Date();


    fecha.setHours(
        0,
        0,
        0,
        0
    );


    return fecha;

}


function formatearFechaLarga(
    valor
) {

    const fecha =
        convertirFechaValor(
            valor
        );


    if (!fecha) {

        return "Fecha por definir";

    }


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            weekday:
                "long",

            day:
                "numeric",

            month:
                "long"
        }
    ).format(
        fecha
    );

}


function formatearFechaCorta(
    valor
) {

    const fecha =
        convertirFechaValor(
            valor
        );


    if (!fecha) {

        return "Fecha sin definir";

    }


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    ).format(
        fecha
    );

}


function convertirFechaValor(
    valor
) {

    if (!valor) {

        return null;

    }


    if (
        typeof valor?.toDate ===
        "function"
    ) {

        return valor.toDate();

    }


    if (
        typeof valor ===
        "string"
    ) {

        const coincidencia =
            valor.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (coincidencia) {

            return new Date(
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

        }

    }


    const fecha =
        new Date(
            valor
        );


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return null;

    }


    return fecha;

}


function formatearHora(
    valor
) {

    if (!valor) {

        return "Hora por definir";

    }


    const texto =
        String(
            valor
        ).trim();


    if (
        /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(
            texto
        )
    ) {

        return texto.toUpperCase();

    }


    const coincidencia =
        texto.match(
            /^(\d{1,2}):(\d{2})$/
        );


    if (!coincidencia) {

        return texto;

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


function numeroSeguro(
    valor
) {

    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return 0;

    }


    return numero;

}


function formatearDiferencia(
    diferencia
) {

    if (
        diferencia > 0
    ) {

        return `+${diferencia}`;

    }


    return String(
        diferencia
    );

}


function claseDiferencia(
    diferencia
) {

    if (
        diferencia > 0
    ) {

        return "positivo";

    }


    if (
        diferencia < 0
    ) {

        return "negativo";

    }


    return "";

}


function mostrarCarga() {

    contenidoEquipo.hidden =
        true;

    estadoCargaEquipo.hidden =
        false;

    estadoErrorEquipo.hidden =
        true;

}


function mostrarContenido() {

    estadoCargaEquipo.hidden =
        true;

    estadoErrorEquipo.hidden =
        true;

    contenidoEquipo.hidden =
        false;

}


function mostrarError(
    titulo,
    texto
) {

    contenidoEquipo.hidden =
        true;

    estadoCargaEquipo.hidden =
        true;

    estadoErrorEquipo.hidden =
        false;


    tituloErrorEquipo.textContent =
        titulo;

    textoErrorEquipo.textContent =
        texto;

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