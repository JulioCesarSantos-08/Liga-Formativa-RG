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


const contenidoJugador =
    document.getElementById(
        "contenidoJugador"
    );

const estadoCargaJugador =
    document.getElementById(
        "estadoCargaJugador"
    );

const estadoErrorJugador =
    document.getElementById(
        "estadoErrorJugador"
    );

const tituloErrorJugador =
    document.getElementById(
        "tituloErrorJugador"
    );

const textoErrorJugador =
    document.getElementById(
        "textoErrorJugador"
    );


const topbarNombreJugador =
    document.getElementById(
        "topbarNombreJugador"
    );


const enlaceEquipo =
    document.getElementById(
        "enlaceEquipo"
    );

const clubEscudo =
    document.getElementById(
        "clubEscudo"
    );

const clubNombre =
    document.getElementById(
        "clubNombre"
    );

const dorsalGrande =
    document.getElementById(
        "dorsalGrande"
    );


const fotoJugador =
    document.getElementById(
        "fotoJugador"
    );

const estadoJugador =
    document.getElementById(
        "estadoJugador"
    );

const categoriaJugador =
    document.getElementById(
        "categoriaJugador"
    );

const nombreJugador =
    document.getElementById(
        "nombreJugador"
    );

const posicionJugador =
    document.getElementById(
        "posicionJugador"
    );


const resumenPartidos =
    document.getElementById(
        "resumenPartidos"
    );

const resumenGoles =
    document.getElementById(
        "resumenGoles"
    );

const resumenAmarillas =
    document.getElementById(
        "resumenAmarillas"
    );

const resumenRojas =
    document.getElementById(
        "resumenRojas"
    );


const rendimientoGoles =
    document.getElementById(
        "rendimientoGoles"
    );

const textoGolesPartidos =
    document.getElementById(
        "textoGolesPartidos"
    );

const promedioGoles =
    document.getElementById(
        "promedioGoles"
    );

const rendimientoPartidos =
    document.getElementById(
        "rendimientoPartidos"
    );

const rendimientoDorsal =
    document.getElementById(
        "rendimientoDorsal"
    );


const disciplinaAmarillas =
    document.getElementById(
        "disciplinaAmarillas"
    );

const disciplinaRojas =
    document.getElementById(
        "disciplinaRojas"
    );

const estadoDisciplina =
    document.getElementById(
        "estadoDisciplina"
    );

const estadoDisciplinaIcono =
    document.getElementById(
        "estadoDisciplinaIcono"
    );

const estadoDisciplinaTitulo =
    document.getElementById(
        "estadoDisciplinaTitulo"
    );

const estadoDisciplinaTexto =
    document.getElementById(
        "estadoDisciplinaTexto"
    );


const datoEquipo =
    document.getElementById(
        "datoEquipo"
    );

const datoCategoria =
    document.getElementById(
        "datoCategoria"
    );

const datoPosicion =
    document.getElementById(
        "datoPosicion"
    );

const datoNumero =
    document.getElementById(
        "datoNumero"
    );


const historialJugador =
    document.getElementById(
        "historialJugador"
    );


let usuarioActual = null;

let jugador = null;

let equipo = null;

let cedulas = [];

let partidos = [];

let historial = [];


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


    const jugadorId =
        parametros.get(
            "id"
        );


    if (!jugadorId) {

        mostrarError(
            "Jugador no encontrado",
            "No se recibió el identificador del jugador."
        );

        return;

    }


    try {

        const snapshotJugador =
            await getDoc(
                doc(
                    db,
                    "jugadores",
                    jugadorId
                )
            );


        if (
            !snapshotJugador.exists()
        ) {

            mostrarError(
                "Jugador no encontrado",
                "El jugador solicitado no existe o ya no está disponible."
            );

            return;

        }


        jugador = {
            id:
                snapshotJugador.id,

            ...snapshotJugador.data()
        };


        await cargarInformacionRelacionada();

        construirHistorial();

        renderizarJugador();

        mostrarContenido();

    } catch (error) {

        console.error(
            "Error cargando jugador:",
            error
        );


        mostrarError(
            "No pudimos cargar al jugador",
            "Ocurrió un problema al consultar la información."
        );

    }

}


async function cargarInformacionRelacionada() {

    const promesas = [

        getDocs(
            collection(
                db,
                "cedulas"
            )
        ),

        getDocs(
            collection(
                db,
                "partidos"
            )
        )

    ];


    if (
        jugador.equipoId
    ) {

        promesas.push(
            getDoc(
                doc(
                    db,
                    "equipos",
                    jugador.equipoId
                )
            )
        );

    }


    const resultados =
        await Promise.all(
            promesas
        );


    const snapshotCedulas =
        resultados[0];

    const snapshotPartidos =
        resultados[1];


    cedulas =
        snapshotCedulas.docs.map(
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


    if (
        jugador.equipoId &&
        resultados[2] &&
        resultados[2].exists()
    ) {

        equipo = {
            id:
                resultados[2].id,

            ...resultados[2].data()
        };

    }

}


function construirHistorial() {

    historial = [];


    cedulas.forEach(
        cedula => {

            if (
                cedula.estado !==
                "registrada"
            ) {

                return;

            }


            const presentesLocal =
                Array.isArray(
                    cedula.presentesLocal
                )
                    ? cedula.presentesLocal
                    : [];


            const presentesVisitante =
                Array.isArray(
                    cedula.presentesVisitante
                )
                    ? cedula.presentesVisitante
                    : [];


            const estuvoPresente =
                presentesLocal.includes(
                    jugador.id
                ) ||
                presentesVisitante.includes(
                    jugador.id
                );


            if (!estuvoPresente) {

                return;

            }


            const partido =
                partidos.find(
                    item =>
                        item.id ===
                        cedula.partidoId ||
                        item.id ===
                        cedula.id
                ) ||
                null;


            const goles =
                filtrarEventosJugador(
                    cedula.goles
                );


            const amarillas =
                filtrarEventosJugador(
                    cedula.amarillas
                );


            const rojas =
                filtrarEventosJugador(
                    cedula.rojas
                );


            historial.push({

                cedula,

                partido,

                goles,

                amarillas,

                rojas

            });

        }
    );


    historial.sort(
        (a, b) => {

            const fechaA =
                convertirFechaPartido(
                    a.partido
                );


            const fechaB =
                convertirFechaPartido(
                    b.partido
                );


            return (
                (fechaB?.getTime() || 0) -
                (fechaA?.getTime() || 0)
            );

        }
    );

}


function filtrarEventosJugador(
    eventos
) {

    if (
        !Array.isArray(
            eventos
        )
    ) {

        return [];

    }


    return eventos.filter(
        evento =>
            evento.jugadorId ===
            jugador.id
    );

}


function renderizarJugador() {

    renderizarCabecera();

    renderizarEstadisticas();

    renderizarDisciplina();

    renderizarInformacion();

    renderizarHistorial();

}


function renderizarCabecera() {

    const nombre =
        obtenerNombreJugador();


    const numero =
        obtenerNumeroJugador();


    const categoria =
        jugador.categoriaNombre ||
        equipo?.categoriaNombre ||
        "Sin categoría";


    const posicion =
        jugador.posicion ||
        "Jugador";


    topbarNombreJugador.textContent =
        nombre;


    document.title =
        `${nombre} | Liga Deportiva Río Grande`;


    nombreJugador.textContent =
        nombre;


    categoriaJugador.textContent =
        categoria;


    posicionJugador.textContent =
        posicion;


    dorsalGrande.textContent =
        numero !== null
            ? `#${numero}`
            : "#-";


    renderizarFotoJugador(
        nombre
    );


    renderizarEquipoCabecera();

    renderizarEstadoJugador();

}


function renderizarEquipoCabecera() {

    const nombreEquipo =
        equipo?.nombre ||
        jugador.equipoNombre ||
        "Sin equipo";


    clubNombre.textContent =
        nombreEquipo;


    datoEquipo.textContent =
        nombreEquipo;


    if (
        equipo?.id
    ) {

        enlaceEquipo.href =
            `equipo.html?id=${encodeURIComponent(
                equipo.id
            )}`;

    } else {

        enlaceEquipo.href =
            "equipos.html";

    }


    if (
        equipo?.logoUrl
    ) {

        clubEscudo.innerHTML = `
            <img
                src="${escaparAtributo(
                    equipo.logoUrl
                )}"
                alt="${escaparAtributo(
                    nombreEquipo
                )}"
                loading="lazy"
            >
        `;

        return;

    }


    clubEscudo.textContent =
        obtenerIniciales(
            nombreEquipo
        );

}


function renderizarFotoJugador(
    nombre
) {

    if (
        jugador.fotoUrl
    ) {

        fotoJugador.innerHTML = `
            <img
                src="${escaparAtributo(
                    jugador.fotoUrl
                )}"
                alt="${escaparAtributo(
                    nombre
                )}"
            >
        `;

        return;

    }


    fotoJugador.textContent =
        obtenerIniciales(
            nombre
        );

}


function renderizarEstadoJugador() {

    const suspendido =
        estaSuspendido();


    if (suspendido) {

        estadoJugador.textContent =
            "Suspendido";

        estadoJugador.className =
            "estado-jugador suspendido";

        return;

    }


    if (
        jugador.activo ===
        false
    ) {

        estadoJugador.textContent =
            "Inactivo";

        estadoJugador.className =
            "estado-jugador suspendido";

        return;

    }


    estadoJugador.textContent =
        "Activo";

    estadoJugador.className =
        "estado-jugador activo";

}


function renderizarEstadisticas() {

    const partidosJugados =
        historial.length;


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


    const numero =
        obtenerNumeroJugador();


    const promedio =
        partidosJugados > 0
            ? goles / partidosJugados
            : 0;


    resumenPartidos.textContent =
        partidosJugados;


    resumenGoles.textContent =
        goles;


    resumenAmarillas.textContent =
        amarillas;


    resumenRojas.textContent =
        rojas;


    rendimientoGoles.textContent =
        goles;


    rendimientoPartidos.textContent =
        partidosJugados;


    rendimientoDorsal.textContent =
        numero !== null
            ? `#${numero}`
            : "#-";


    promedioGoles.textContent =
        promedio.toFixed(
            2
        );


    textoGolesPartidos.textContent =
        `En ${partidosJugados} ${
            partidosJugados === 1
                ? "partido"
                : "partidos"
        }`;

}


function renderizarDisciplina() {

    const amarillas =
        numeroSeguro(
            jugador.amarillas
        );


    const rojas =
        numeroSeguro(
            jugador.rojas
        );


    disciplinaAmarillas.textContent =
        amarillas;


    disciplinaRojas.textContent =
        rojas;


    const suspendido =
        estaSuspendido();


    if (suspendido) {

        const pendientes =
            numeroSeguro(
                jugador.partidosSuspensionPendientes
            );


        estadoDisciplina.className =
            "estado-disciplina sancionado";


        estadoDisciplinaIcono.textContent =
            "⛔";


        estadoDisciplinaTitulo.textContent =
            "Jugador suspendido";


        if (
            pendientes > 0
        ) {

            estadoDisciplinaTexto.textContent =
                `Tiene ${
                    pendientes
                } ${
                    pendientes === 1
                        ? "partido de suspensión pendiente."
                        : "partidos de suspensión pendientes."
                }`;

        } else {

            estadoDisciplinaTexto.textContent =
                "Este jugador tiene una suspensión activa.";

        }


        return;

    }


    estadoDisciplina.className =
        "estado-disciplina correcto";


    estadoDisciplinaIcono.textContent =
        "✓";


    estadoDisciplinaTitulo.textContent =
        "Disponible para jugar";


    estadoDisciplinaTexto.textContent =
        "Actualmente este jugador no tiene ninguna suspensión activa.";

}


function renderizarInformacion() {

    const categoria =
        jugador.categoriaNombre ||
        equipo?.categoriaNombre ||
        "Sin categoría";


    const posicion =
        jugador.posicion ||
        "Jugador";


    const numero =
        obtenerNumeroJugador();


    datoCategoria.textContent =
        categoria;


    datoPosicion.textContent =
        posicion;


    datoNumero.textContent =
        numero !== null
            ? `#${numero}`
            : "-";

}


function renderizarHistorial() {

    historialJugador.innerHTML =
        "";


    if (!historial.length) {

        historialJugador.innerHTML = `
            <div
                style="
                    padding:22px;
                    border:1px solid #baa676;
                    border-radius:13px;
                    background:rgba(255,248,232,.88);
                    color:#68746e;
                    font-size:.72rem;
                    line-height:1.5;
                    text-align:center;
                "
            >
                Este jugador todavía no tiene partidos oficiales
                registrados en su historial.
            </div>
        `;

        return;

    }


    const recientes =
        historial.slice(
            0,
            8
        );


    recientes.forEach(
        registro => {

            const {
                cedula,
                partido,
                goles,
                amarillas,
                rojas
            } = registro;


            const esLocal =
                cedula.localId ===
                jugador.equipoId;


            const rival =
                esLocal
                    ? (
                        cedula.visitanteNombre ||
                        partido?.visitanteNombre ||
                        "Rival"
                    )
                    : (
                        cedula.localNombre ||
                        partido?.localNombre ||
                        "Rival"
                    );


            const golesLocal =
                numeroSeguro(
                    cedula.golesLocal
                );


            const golesVisitante =
                numeroSeguro(
                    cedula.golesVisitante
                );


            const golesEquipo =
                esLocal
                    ? golesLocal
                    : golesVisitante;


            const golesRival =
                esLocal
                    ? golesVisitante
                    : golesLocal;


            const resultado =
                obtenerResultado(
                    golesEquipo,
                    golesRival
                );


            const tarjeta =
                document.createElement(
                    "a"
                );


            tarjeta.className =
                "historial-card";


            tarjeta.href =
                `partido.html?id=${encodeURIComponent(
                    cedula.partidoId ||
                    cedula.id
                )}`;


            tarjeta.innerHTML = `

                <div class="historial-jornada">

                    <strong>
                        ${escaparHTML(
                            obtenerJornada(
                                cedula,
                                partido
                            )
                        )}
                    </strong>

                    <span>
                        vs
                        ${escaparHTML(
                            rival
                        )}
                    </span>

                </div>


                <div class="historial-resultado">

                    <span class="${resultado.clase}">
                        ${golesEquipo}
                        -
                        ${golesRival}
                    </span>

                    <small>
                        ${resultado.texto}
                    </small>

                </div>


                <div class="historial-eventos">

                    ${
                        goles.length
                            ? `
                                <span>
                                    ⚽ ${goles.length}
                                </span>
                            `
                            : ""
                    }

                    ${
                        amarillas.length
                            ? `
                                <span>
                                    🟨 ${amarillas.length}
                                </span>
                            `
                            : ""
                    }

                    ${
                        rojas.length
                            ? `
                                <span>
                                    🟥 ${rojas.length}
                                </span>
                            `
                            : ""
                    }

                    ${
                        !goles.length &&
                        !amarillas.length &&
                        !rojas.length
                            ? `
                                <span>
                                    Sin eventos
                                </span>
                            `
                            : ""
                    }

                </div>

            `;


            historialJugador.appendChild(
                tarjeta
            );

        }
    );

}


function obtenerResultado(
    golesEquipo,
    golesRival
) {

    if (
        golesEquipo >
        golesRival
    ) {

        return {
            clase:
                "victoria",

            texto:
                "Victoria"
        };

    }


    if (
        golesEquipo ===
        golesRival
    ) {

        return {
            clase:
                "empate",

            texto:
                "Empate"
        };

    }


    return {
        clase:
            "derrota",

        texto:
            "Derrota"
    };

}


function obtenerJornada(
    cedula,
    partido
) {

    const nombre =
        cedula.jornadaNombre ||
        partido?.jornadaNombre ||
        "";


    if (nombre) {

        return nombre;

    }


    const numero =
        partido?.jornadaNumero ??
        partido?.numeroJornada ??
        null;


    if (
        numero !== null
    ) {

        return `J${numero}`;

    }


    return "Jornada";

}


function convertirFechaPartido(
    partido
) {

    if (
        !partido ||
        !partido.fecha
    ) {

        return null;

    }


    const valor =
        partido.fecha;


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


function obtenerNombreJugador() {

    return (
        jugador.nombreCompleto ||
        jugador.nombre ||
        "Jugador"
    );

}


function obtenerNumeroJugador() {

    const valor =
        jugador.numero ??
        jugador.dorsal ??
        null;


    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return null;

    }


    return valor;

}


function estaSuspendido() {

    return (
        jugador.suspendido ===
            true ||
        numeroSeguro(
            jugador.partidosSuspensionPendientes
        ) > 0
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

        return "J";

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


function mostrarCarga() {

    contenidoJugador.hidden =
        true;

    estadoCargaJugador.hidden =
        false;

    estadoErrorJugador.hidden =
        true;

}


function mostrarContenido() {

    estadoCargaJugador.hidden =
        true;

    estadoErrorJugador.hidden =
        true;

    contenidoJugador.hidden =
        false;

}


function mostrarError(
    titulo,
    texto
) {

    contenidoJugador.hidden =
        true;

    estadoCargaJugador.hidden =
        true;

    estadoErrorJugador.hidden =
        false;


    tituloErrorJugador.textContent =
        titulo;


    textoErrorJugador.textContent =
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