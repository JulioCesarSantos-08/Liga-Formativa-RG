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


const contenidoPartido =
    document.getElementById(
        "contenidoPartido"
    );

const estadoCargaPartido =
    document.getElementById(
        "estadoCargaPartido"
    );

const estadoErrorPartido =
    document.getElementById(
        "estadoErrorPartido"
    );

const tituloErrorPartido =
    document.getElementById(
        "tituloErrorPartido"
    );

const textoErrorPartido =
    document.getElementById(
        "textoErrorPartido"
    );


const categoriaPartido =
    document.getElementById(
        "categoriaPartido"
    );

const jornadaPartido =
    document.getElementById(
        "jornadaPartido"
    );

const estadoPartido =
    document.getElementById(
        "estadoPartido"
    );


const escudoLocal =
    document.getElementById(
        "escudoLocal"
    );

const escudoVisitante =
    document.getElementById(
        "escudoVisitante"
    );

const nombreLocal =
    document.getElementById(
        "nombreLocal"
    );

const nombreVisitante =
    document.getElementById(
        "nombreVisitante"
    );


const textoMarcador =
    document.getElementById(
        "textoMarcador"
    );

const resultadoPartido =
    document.getElementById(
        "resultadoPartido"
    );

const fechaPartido =
    document.getElementById(
        "fechaPartido"
    );


const horaPartido =
    document.getElementById(
        "horaPartido"
    );

const campoPartido =
    document.getElementById(
        "campoPartido"
    );

const arbitroPartido =
    document.getElementById(
        "arbitroPartido"
    );


const totalGoles =
    document.getElementById(
        "totalGoles"
    );

const totalAmarillas =
    document.getElementById(
        "totalAmarillas"
    );

const totalRojas =
    document.getElementById(
        "totalRojas"
    );

const totalParticipantes =
    document.getElementById(
        "totalParticipantes"
    );


const listaGoles =
    document.getElementById(
        "listaGoles"
    );

const listaTarjetas =
    document.getElementById(
        "listaTarjetas"
    );

const textoIncidencias =
    document.getElementById(
        "textoIncidencias"
    );


const escudoLocalPequeno =
    document.getElementById(
        "escudoLocalPequeno"
    );

const escudoVisitantePequeno =
    document.getElementById(
        "escudoVisitantePequeno"
    );

const alineacionNombreLocal =
    document.getElementById(
        "alineacionNombreLocal"
    );

const alineacionNombreVisitante =
    document.getElementById(
        "alineacionNombreVisitante"
    );

const alineacionLocal =
    document.getElementById(
        "alineacionLocal"
    );

const alineacionVisitante =
    document.getElementById(
        "alineacionVisitante"
    );


const textoAvisoOficial =
    document.getElementById(
        "textoAvisoOficial"
    );


let usuarioActual = null;

let partido = null;

let cedula = null;

let equipoLocal = null;

let equipoVisitante = null;

let jugadores = [];


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


    const partidoId =
        parametros.get(
            "id"
        );


    if (!partidoId) {

        mostrarError(
            "Partido no encontrado",
            "No se recibió el identificador del partido."
        );

        return;

    }


    try {

        const snapshotPartido =
            await getDoc(
                doc(
                    db,
                    "partidos",
                    partidoId
                )
            );


        if (!snapshotPartido.exists()) {

            mostrarError(
                "Partido no encontrado",
                "El encuentro solicitado no existe o ya no está disponible."
            );

            return;

        }


        partido = {
            id:
                snapshotPartido.id,

            ...snapshotPartido.data()
        };


        await cargarDatosRelacionados();

        renderizarPartido();

        mostrarContenido();

    } catch (error) {

        console.error(
            "Error cargando partido:",
            error
        );


        mostrarError(
            "No pudimos cargar el partido",
            "Ocurrió un problema al consultar la información del encuentro."
        );

    }

}


async function cargarDatosRelacionados() {

    const tareas = [];


    if (partido.localId) {

        tareas.push(
            getDoc(
                doc(
                    db,
                    "equipos",
                    partido.localId
                )
            )
        );

    } else {

        tareas.push(
            Promise.resolve(
                null
            )
        );

    }


    if (partido.visitanteId) {

        tareas.push(
            getDoc(
                doc(
                    db,
                    "equipos",
                    partido.visitanteId
                )
            )
        );

    } else {

        tareas.push(
            Promise.resolve(
                null
            )
        );

    }


    tareas.push(
        getDoc(
            doc(
                db,
                "cedulas",
                partido.id
            )
        )
    );


    tareas.push(
        getDocs(
            collection(
                db,
                "jugadores"
            )
        )
    );


    const [
        snapshotLocal,
        snapshotVisitante,
        snapshotCedula,
        snapshotJugadores
    ] = await Promise.all(
        tareas
    );


    if (
        snapshotLocal &&
        snapshotLocal.exists()
    ) {

        equipoLocal = {
            id:
                snapshotLocal.id,

            ...snapshotLocal.data()
        };

    }


    if (
        snapshotVisitante &&
        snapshotVisitante.exists()
    ) {

        equipoVisitante = {
            id:
                snapshotVisitante.id,

            ...snapshotVisitante.data()
        };

    }


    if (
        snapshotCedula &&
        snapshotCedula.exists()
    ) {

        cedula = {
            id:
                snapshotCedula.id,

            ...snapshotCedula.data()
        };

    }


    jugadores =
        snapshotJugadores.docs.map(
            documento => ({
                id:
                    documento.id,

                ...documento.data()
            })
        );

}


function renderizarPartido() {

    const estado =
        normalizarEstadoPartido();


    categoriaPartido.textContent =
        partido.categoriaNombre ||
        equipoLocal?.categoriaNombre ||
        equipoVisitante?.categoriaNombre ||
        "Sin categoría";


    jornadaPartido.textContent =
        obtenerNombreJornada();


    estadoPartido.textContent =
        obtenerTextoEstado(
            estado
        );

    estadoPartido.className =
        `estado ${estado}`;


    nombreLocal.textContent =
        partido.localNombre ||
        equipoLocal?.nombre ||
        "Local";


    nombreVisitante.textContent =
        partido.visitanteNombre ||
        equipoVisitante?.nombre ||
        "Visitante";


    alineacionNombreLocal.textContent =
        partido.localNombre ||
        equipoLocal?.nombre ||
        "Local";


    alineacionNombreVisitante.textContent =
        partido.visitanteNombre ||
        equipoVisitante?.nombre ||
        "Visitante";


    renderizarEscudo(
        escudoLocal,
        equipoLocal,
        partido.localNombre ||
        "Local"
    );


    renderizarEscudo(
        escudoVisitante,
        equipoVisitante,
        partido.visitanteNombre ||
        "Visitante"
    );


    renderizarEscudo(
        escudoLocalPequeno,
        equipoLocal,
        partido.localNombre ||
        "Local"
    );


    renderizarEscudo(
        escudoVisitantePequeno,
        equipoVisitante,
        partido.visitanteNombre ||
        "Visitante"
    );


    fechaPartido.textContent =
        formatearFecha(
            partido.fecha
        );


    horaPartido.textContent =
        formatearHora(
            partido.hora
        );


    campoPartido.textContent =
        partido.campo ||
        "Por definir";


    arbitroPartido.textContent =
        partido.arbitroNombre ||
        cedula?.arbitroNombre ||
        "Por asignar";


    renderizarMarcador(
        estado
    );


    renderizarResumen();

    renderizarGoles();

    renderizarTarjetas();

    renderizarIncidencias();

    renderizarAlineaciones();

    actualizarAviso(
        estado
    );

}


function renderizarEscudo(
    contenedor,
    equipo,
    nombre
) {

    const logo =
        equipo?.logoUrl ||
        equipo?.escudoUrl ||
        equipo?.imagenUrl ||
        equipo?.logo ||
        "";


    contenedor.innerHTML =
        "";


    if (logo) {

        const imagen =
            document.createElement(
                "img"
            );


        imagen.src =
            logo;

        imagen.alt =
            nombre;

        imagen.loading =
            "lazy";

        imagen.style.width =
            "100%";

        imagen.style.height =
            "100%";

        imagen.style.objectFit =
            "contain";

        imagen.style.padding =
            "4px";


        contenedor.appendChild(
            imagen
        );

        return;

    }


    contenedor.textContent =
        obtenerInicial(
            nombre
        );

}


function renderizarMarcador(
    estado
) {

    const golesLocal =
        obtenerGolesLocal();


    const golesVisitante =
        obtenerGolesVisitante();


    if (
        estado === "finalizado" &&
        cedula
    ) {

        textoMarcador.textContent =
            "Resultado final";


        resultadoPartido.innerHTML = `
            ${golesLocal}
            <span>-</span>
            ${golesVisitante}
        `;

        return;

    }


    textoMarcador.textContent =
        estado === "en-vivo"
            ? "Partido en curso"
            : estado === "cancelado"
                ? "Partido cancelado"
                : "Próximo partido";


    resultadoPartido.innerHTML = `
        <span>VS</span>
    `;

}


function renderizarResumen() {

    const goles =
        Array.isArray(
            cedula?.goles
        )
            ? cedula.goles
            : [];


    const amarillas =
        Array.isArray(
            cedula?.amarillas
        )
            ? cedula.amarillas
            : [];


    const rojas =
        Array.isArray(
            cedula?.rojas
        )
            ? cedula.rojas
            : [];


    const presentesLocal =
        obtenerPresentesLocal();


    const presentesVisitante =
        obtenerPresentesVisitante();


    totalGoles.textContent =
        goles.length ||
        (
            obtenerGolesLocal() +
            obtenerGolesVisitante()
        );


    totalAmarillas.textContent =
        amarillas.length;


    totalRojas.textContent =
        rojas.length;


    totalParticipantes.textContent =
        presentesLocal.length +
        presentesVisitante.length;

}


function renderizarGoles() {

    listaGoles.innerHTML =
        "";


    const goles =
        Array.isArray(
            cedula?.goles
        )
            ? cedula.goles
            : [];


    if (!goles.length) {

        listaGoles.innerHTML = `
            <article class="evento-card">

                <div class="evento-icono gol">
                    ⚽
                </div>

                <div class="evento-info">

                    <strong>
                        Sin goles registrados
                    </strong>

                    <span>
                        No hay eventos de gol disponibles.
                    </span>

                </div>

            </article>
        `;

        return;

    }


    const golesOrdenados =
        [...goles].sort(
            (a, b) =>
                obtenerMinuto(
                    a
                ) -
                obtenerMinuto(
                    b
                )
        );


    let marcadorLocal =
        0;

    let marcadorVisitante =
        0;


    golesOrdenados.forEach(
        evento => {

            const equipoEvento =
                obtenerEquipoEvento(
                    evento
                );


            if (
                equipoEvento ===
                "local"
            ) {

                marcadorLocal++;

            }


            if (
                equipoEvento ===
                "visitante"
            ) {

                marcadorVisitante++;

            }


            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "evento-card";


            tarjeta.innerHTML = `
                <div class="evento-minuto">
                    ${escaparHTML(
                        formatearMinuto(
                            evento
                        )
                    )}
                </div>

                <div class="evento-icono gol">
                    ⚽
                </div>

                <div class="evento-info">

                    <strong>
                        ${escaparHTML(
                            obtenerNombreJugadorEvento(
                                evento
                            )
                        )}
                    </strong>

                    <span>
                        ${escaparHTML(
                            obtenerNombreEquipoEvento(
                                evento
                            )
                        )}
                    </span>

                </div>

                <div class="evento-marcador">
                    ${marcadorLocal} - ${marcadorVisitante}
                </div>
            `;


            listaGoles.appendChild(
                tarjeta
            );

        }
    );

}


function renderizarTarjetas() {

    listaTarjetas.innerHTML =
        "";


    const amarillas =
        Array.isArray(
            cedula?.amarillas
        )
            ? cedula.amarillas
            : [];


    const rojas =
        Array.isArray(
            cedula?.rojas
        )
            ? cedula.rojas
            : [];


    const eventos = [
        ...amarillas.map(
            evento => ({
                ...evento,
                tipoTarjeta:
                    "amarilla"
            })
        ),

        ...rojas.map(
            evento => ({
                ...evento,
                tipoTarjeta:
                    "roja"
            })
        )
    ];


    eventos.sort(
        (a, b) =>
            obtenerMinuto(a) -
            obtenerMinuto(b)
    );


    if (!eventos.length) {

        listaTarjetas.innerHTML = `
            <article class="tarjeta-evento">

                <div class="tarjeta-info">

                    <strong>
                        Sin tarjetas registradas
                    </strong>

                    <span>
                        No hay sanciones registradas.
                    </span>

                </div>

            </article>
        `;

        return;

    }


    eventos.forEach(
        evento => {

            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                evento.tipoTarjeta ===
                    "roja"
                    ? "tarjeta-evento tarjeta-roja-evento"
                    : "tarjeta-evento";


            tarjeta.innerHTML = `
                <div
                    class="tarjeta-visual ${evento.tipoTarjeta}"
                >
                </div>

                <div class="tarjeta-info">

                    <strong>
                        ${escaparHTML(
                            obtenerNombreJugadorEvento(
                                evento
                            )
                        )}
                    </strong>

                    <span>
                        ${escaparHTML(
                            obtenerNombreEquipoEvento(
                                evento
                            )
                        )}
                    </span>

                    <small>
                        ${escaparHTML(
                            `Minuto ${formatearMinuto(
                                evento
                            )}`
                        )}
                    </small>

                </div>
            `;


            listaTarjetas.appendChild(
                tarjeta
            );

        }
    );

}


function renderizarIncidencias() {

    const incidencias =
        String(
            cedula?.incidencias ||
            ""
        ).trim();


    textoIncidencias.textContent =
        incidencias ||
        "Sin incidencias registradas.";

}


function renderizarAlineaciones() {

    const presentesLocal =
        obtenerPresentesLocal();


    const presentesVisitante =
        obtenerPresentesVisitante();


    renderizarListaJugadores(
        alineacionLocal,
        presentesLocal,
        partido.localId
    );


    renderizarListaJugadores(
        alineacionVisitante,
        presentesVisitante,
        partido.visitanteId
    );

}


function renderizarListaJugadores(
    contenedor,
    presentes,
    equipoId
) {

    contenedor.innerHTML =
        "";


    const idsPresentes =
        new Set(
            presentes.map(
                valor =>
                    typeof valor ===
                    "object"
                        ? valor.id ||
                          valor.jugadorId
                        : valor
            )
        );


    let lista =
        jugadores.filter(
            jugador =>
                jugador.equipoId ===
                equipoId
        );


    if (
        idsPresentes.size > 0
    ) {

        lista =
            lista.filter(
                jugador =>
                    idsPresentes.has(
                        jugador.id
                    )
            );

    }


    lista.sort(
        (a, b) => {

            const numeroA =
                Number(
                    a.numero ??
                    a.dorsal ??
                    999
                );


            const numeroB =
                Number(
                    b.numero ??
                    b.dorsal ??
                    999
                );


            return (
                numeroA -
                numeroB
            );

        }
    );


    if (!lista.length) {

        const elemento =
            document.createElement(
                "div"
            );


        elemento.style.padding =
            "14px";

        elemento.style.fontSize =
            ".72rem";

        elemento.style.color =
            "#68746e";

        elemento.textContent =
            "No hay jugadores registrados para mostrar.";


        contenedor.appendChild(
            elemento
        );

        return;

    }


    lista.forEach(
        jugador => {

            const enlace =
                document.createElement(
                    "a"
                );


            enlace.href =
                `jugador.html?id=${encodeURIComponent(
                    jugador.id
                )}`;


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "-";


            enlace.innerHTML = `
                <span>
                    #${escaparHTML(
                        numero
                    )}
                </span>

                ${escaparHTML(
                    jugador.nombreCompleto ||
                    jugador.nombre ||
                    "Jugador"
                )}
            `;


            contenedor.appendChild(
                enlace
            );

        }
    );

}


function obtenerPresentesLocal() {

    if (
        Array.isArray(
            cedula?.presentesLocal
        )
    ) {

        return cedula.presentesLocal;

    }


    return [];

}


function obtenerPresentesVisitante() {

    if (
        Array.isArray(
            cedula?.presentesVisitante
        )
    ) {

        return cedula.presentesVisitante;

    }


    return [];

}


function obtenerGolesLocal() {

    return numeroSeguro(
        cedula?.golesLocal ??
        partido?.golesLocal ??
        0
    );

}


function obtenerGolesVisitante() {

    return numeroSeguro(
        cedula?.golesVisitante ??
        partido?.golesVisitante ??
        0
    );

}


function obtenerNombreJornada() {

    if (
        partido.jornadaNombre
    ) {

        return partido.jornadaNombre;

    }


    if (
        partido.jornadaNumero !==
        undefined
    ) {

        return (
            `Jornada ${partido.jornadaNumero}`
        );

    }


    if (
        partido.numeroJornada !==
        undefined
    ) {

        return (
            `Jornada ${partido.numeroJornada}`
        );

    }


    return "Sin jornada";

}


function normalizarEstadoPartido() {

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
        cedula?.estado ===
        "registrada"
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


function actualizarAviso(
    estado
) {

    if (
        cedula?.estado ===
        "registrada"
    ) {

        textoAvisoOficial.textContent =
            "Los datos mostrados provienen de la cédula oficial registrada por el árbitro asignado al encuentro.";

        return;

    }


    if (
        cedula?.estado ===
        "borrador"
    ) {

        textoAvisoOficial.textContent =
            "La cédula arbitral de este partido todavía se encuentra en borrador. La información oficial puede cambiar.";

        return;

    }


    if (
        estado === "proximo"
    ) {

        textoAvisoOficial.textContent =
            "Este encuentro aún no cuenta con una cédula arbitral registrada.";

        return;

    }


    textoAvisoOficial.textContent =
        "La información mostrada corresponde al registro disponible del encuentro.";

}


function obtenerEquipoEvento(
    evento
) {

    const equipo =
        String(
            evento.equipo ||
            evento.lado ||
            evento.tipoEquipo ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        equipo === "local"
    ) {

        return "local";

    }


    if (
        equipo === "visitante"
    ) {

        return "visitante";

    }


    if (
        evento.equipoId ===
        partido.localId
    ) {

        return "local";

    }


    if (
        evento.equipoId ===
        partido.visitanteId
    ) {

        return "visitante";

    }


    const jugadorId =
        evento.jugadorId ||
        evento.idJugador;


    if (jugadorId) {

        const jugador =
            jugadores.find(
                item =>
                    item.id ===
                    jugadorId
            );


        if (
            jugador?.equipoId ===
            partido.localId
        ) {

            return "local";

        }


        if (
            jugador?.equipoId ===
            partido.visitanteId
        ) {

            return "visitante";

        }

    }


    return "";

}


function obtenerNombreEquipoEvento(
    evento
) {

    const lado =
        obtenerEquipoEvento(
            evento
        );


    if (
        lado === "local"
    ) {

        return (
            partido.localNombre ||
            equipoLocal?.nombre ||
            "Local"
        );

    }


    if (
        lado === "visitante"
    ) {

        return (
            partido.visitanteNombre ||
            equipoVisitante?.nombre ||
            "Visitante"
        );

    }


    return (
        evento.equipoNombre ||
        "Equipo"
    );

}


function obtenerNombreJugadorEvento(
    evento
) {

    if (
        evento.jugadorNombre
    ) {

        return evento.jugadorNombre;

    }


    if (
        evento.nombreJugador
    ) {

        return evento.nombreJugador;

    }


    const jugadorId =
        evento.jugadorId ||
        evento.idJugador;


    if (jugadorId) {

        const jugador =
            jugadores.find(
                item =>
                    item.id ===
                    jugadorId
            );


        if (jugador) {

            return (
                jugador.nombreCompleto ||
                jugador.nombre ||
                "Jugador"
            );

        }

    }


    return "Jugador";

}


function obtenerMinuto(
    evento
) {

    const valor =
        evento.minuto ??
        evento.min ??
        0;


    const numero =
        parseInt(
            valor,
            10
        );


    if (
        Number.isNaN(
            numero
        )
    ) {

        return 0;

    }


    return numero;

}


function formatearMinuto(
    evento
) {

    const minuto =
        obtenerMinuto(
            evento
        );


    return `${minuto}'`;

}


function obtenerInicial(
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
        ) ||
        numero < 0
    ) {

        return 0;

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

        const coincidencia =
            valor.match(
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

        return hora.toUpperCase();

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


function mostrarCarga() {

    contenidoPartido.hidden =
        true;

    estadoCargaPartido.hidden =
        false;

    estadoErrorPartido.hidden =
        true;

}


function mostrarContenido() {

    estadoCargaPartido.hidden =
        true;

    estadoErrorPartido.hidden =
        true;

    contenidoPartido.hidden =
        false;

}


function mostrarError(
    titulo,
    mensaje
) {

    contenidoPartido.hidden =
        true;

    estadoCargaPartido.hidden =
        true;

    estadoErrorPartido.hidden =
        false;


    tituloErrorPartido.textContent =
        titulo;


    textoErrorPartido.textContent =
        mensaje;

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