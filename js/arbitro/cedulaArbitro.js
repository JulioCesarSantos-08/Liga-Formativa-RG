import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";


const btnVolverPartido =
    document.getElementById("btnVolverPartido");

const estadoCedulaTop =
    document.getElementById("estadoCedulaTop");

const estadoCarga =
    document.getElementById("estadoCarga");

const estadoError =
    document.getElementById("estadoError");

const estadoErrorTexto =
    document.getElementById("estadoErrorTexto");

const contenidoCedula =
    document.getElementById("contenidoCedula");


const heroCategoria =
    document.getElementById("heroCategoria");

const heroJornada =
    document.getElementById("heroJornada");

const logoLocal =
    document.getElementById("logoLocal");

const logoVisitante =
    document.getElementById("logoVisitante");

const nombreLocal =
    document.getElementById("nombreLocal");

const nombreVisitante =
    document.getElementById("nombreVisitante");

const heroFecha =
    document.getElementById("heroFecha");

const heroHora =
    document.getElementById("heroHora");

const heroCampo =
    document.getElementById("heroCampo");


const arbitroCentral =
    document.getElementById("arbitroCentral");

const arbitroAsistente1 =
    document.getElementById("arbitroAsistente1");

const arbitroAsistente2 =
    document.getElementById("arbitroAsistente2");


const plantillaNombreLocal =
    document.getElementById("plantillaNombreLocal");

const plantillaNombreVisitante =
    document.getElementById("plantillaNombreVisitante");

const totalPresentesLocal =
    document.getElementById("totalPresentesLocal");

const totalPresentesVisitante =
    document.getElementById("totalPresentesVisitante");

const listaJugadoresLocal =
    document.getElementById("listaJugadoresLocal");

const listaJugadoresVisitante =
    document.getElementById("listaJugadoresVisitante");


const inicioPrimerTiempo =
    document.getElementById("inicioPrimerTiempo");

const finPrimerTiempo =
    document.getElementById("finPrimerTiempo");

const inicioSegundoTiempo =
    document.getElementById("inicioSegundoTiempo");

const finSegundoTiempo =
    document.getElementById("finSegundoTiempo");


const marcadorNombreLocal =
    document.getElementById("marcadorNombreLocal");

const marcadorNombreVisitante =
    document.getElementById("marcadorNombreVisitante");

const golesLocal =
    document.getElementById("golesLocal");

const golesVisitante =
    document.getElementById("golesVisitante");


const huboPenales =
    document.getElementById("huboPenales");

const bloquePenales =
    document.getElementById("bloquePenales");

const penalesNombreLocal =
    document.getElementById("penalesNombreLocal");

const penalesNombreVisitante =
    document.getElementById("penalesNombreVisitante");

const penalesLocal =
    document.getElementById("penalesLocal");

const penalesVisitante =
    document.getElementById("penalesVisitante");


const btnAgregarGol =
    document.getElementById("btnAgregarGol");

const listaGoles =
    document.getElementById("listaGoles");

const sinGoles =
    document.getElementById("sinGoles");


const btnAgregarAmarilla =
    document.getElementById("btnAgregarAmarilla");

const listaAmarillas =
    document.getElementById("listaAmarillas");

const sinAmarillas =
    document.getElementById("sinAmarillas");


const btnAgregarRoja =
    document.getElementById("btnAgregarRoja");

const listaRojas =
    document.getElementById("listaRojas");

const sinRojas =
    document.getElementById("sinRojas");


const entrenadorLocal =
    document.getElementById("entrenadorLocal");

const medicoLocal =
    document.getElementById("medicoLocal");

const auxiliarLocal =
    document.getElementById("auxiliarLocal");

const entrenadorVisitante =
    document.getElementById("entrenadorVisitante");

const medicoVisitante =
    document.getElementById("medicoVisitante");

const auxiliarVisitante =
    document.getElementById("auxiliarVisitante");

const tecnicoNombreLocal =
    document.getElementById("tecnicoNombreLocal");

const tecnicoNombreVisitante =
    document.getElementById("tecnicoNombreVisitante");


const capitanLocal =
    document.getElementById("capitanLocal");

const capitanVisitante =
    document.getElementById("capitanVisitante");


const estadoTerreno =
    document.getElementById("estadoTerreno");

const contadorTerreno =
    document.getElementById("contadorTerreno");


const conductaNombreLocal =
    document.getElementById("conductaNombreLocal");

const conductaNombreVisitante =
    document.getElementById("conductaNombreVisitante");

const conductaPublicoLocal =
    document.getElementById("conductaPublicoLocal");

const conductaPublicoVisitante =
    document.getElementById("conductaPublicoVisitante");

const observacionPublicoLocal =
    document.getElementById("observacionPublicoLocal");

const observacionPublicoVisitante =
    document.getElementById("observacionPublicoVisitante");


const incidencias =
    document.getElementById("incidencias");

const contadorIncidencias =
    document.getElementById("contadorIncidencias");


const resumenResultado =
    document.getElementById("resumenResultado");

const resumenGoles =
    document.getElementById("resumenGoles");

const resumenAmarillas =
    document.getElementById("resumenAmarillas");

const resumenRojas =
    document.getElementById("resumenRojas");

const resumenJugadores =
    document.getElementById("resumenJugadores");

const resumenArbitro =
    document.getElementById("resumenArbitro");

const resumenPenalesContenedor =
    document.getElementById("resumenPenalesContenedor");

const resumenPenales =
    document.getElementById("resumenPenales");


const confirmarInformacion =
    document.getElementById("confirmarInformacion");


const btnGuardarBorrador =
    document.getElementById("btnGuardarBorrador");

const btnEnviarCedula =
    document.getElementById("btnEnviarCedula");


const modalEvento =
    document.getElementById("modalEvento");

const modalEventoMini =
    document.getElementById("modalEventoMini");

const modalEventoTitulo =
    document.getElementById("modalEventoTitulo");

const btnCerrarEvento =
    document.getElementById("btnCerrarEvento");

const eventoEquipo =
    document.getElementById("eventoEquipo");

const eventoJugador =
    document.getElementById("eventoJugador");

const eventoMinuto =
    document.getElementById("eventoMinuto");

const eventoTipoRoja =
    document.getElementById("eventoTipoRoja");

const eventoMotivo =
    document.getElementById("eventoMotivo");

const grupoTipoRoja =
    document.getElementById("grupoTipoRoja");

const btnCancelarEvento =
    document.getElementById("btnCancelarEvento");

const btnGuardarEvento =
    document.getElementById("btnGuardarEvento");


const modalConfirmarEnvio =
    document.getElementById("modalConfirmarEnvio");

const confirmarResultado =
    document.getElementById("confirmarResultado");

const confirmarPenalesContenedor =
    document.getElementById("confirmarPenalesContenedor");

const confirmarPenales =
    document.getElementById("confirmarPenales");

const btnCancelarEnvio =
    document.getElementById("btnCancelarEnvio");

const btnConfirmarEnvio =
    document.getElementById("btnConfirmarEnvio");


const toast =
    document.getElementById("toast");

const toastIcono =
    document.getElementById("toastIcono");

const toastTitulo =
    document.getElementById("toastTitulo");

const toastTexto =
    document.getElementById("toastTexto");


let usuarioActual = null;

let partido = null;

let equipoLocalData = null;
let equipoVisitanteData = null;

let asistencia = null;

let jugadores = [];
let jugadoresLocal = [];
let jugadoresVisitante = [];

let eventosGoles = [];
let eventosAmarillas = [];
let eventosRojas = [];

let tipoEventoActual = null;

let cedulaEnviada = false;

let toastTimer = null;


const usuario = await protegerPagina([
    "arbitro",
    "admin"
]);


if (usuario) {

    usuarioActual =
        usuario;

    activarEventos();

    await iniciarCedula();

}


function activarEventos() {

    golesLocal.addEventListener(
        "input",
        () => {

            normalizarMarcador(
                golesLocal
            );

            actualizarResumen();

        }
    );


    golesVisitante.addEventListener(
        "input",
        () => {

            normalizarMarcador(
                golesVisitante
            );

            actualizarResumen();

        }
    );


    penalesLocal.addEventListener(
        "input",
        () => {

            normalizarMarcador(
                penalesLocal
            );

            actualizarResumen();

        }
    );


    penalesVisitante.addEventListener(
        "input",
        () => {

            normalizarMarcador(
                penalesVisitante
            );

            actualizarResumen();

        }
    );


    huboPenales.addEventListener(
        "change",
        () => {

            actualizarBloquePenales();

            actualizarResumen();

        }
    );


    incidencias.addEventListener(
        "input",
        () => {

            contadorIncidencias.textContent =
                incidencias.value.length;

        }
    );


    estadoTerreno.addEventListener(
        "input",
        () => {

            contadorTerreno.textContent =
                estadoTerreno.value.length;

        }
    );


    btnAgregarGol.addEventListener(
        "click",
        () => {

            abrirModalEvento(
                "gol"
            );

        }
    );


    btnAgregarAmarilla.addEventListener(
        "click",
        () => {

            abrirModalEvento(
                "amarilla"
            );

        }
    );


    btnAgregarRoja.addEventListener(
        "click",
        () => {

            abrirModalEvento(
                "roja"
            );

        }
    );


    eventoEquipo.addEventListener(
        "change",
        cargarJugadoresModal
    );


    btnCerrarEvento.addEventListener(
        "click",
        cerrarModalEvento
    );


    btnCancelarEvento.addEventListener(
        "click",
        cerrarModalEvento
    );


    modalEvento.addEventListener(
        "click",
        event => {

            if (
                event.target === modalEvento
            ) {

                cerrarModalEvento();

            }

        }
    );


    btnGuardarEvento.addEventListener(
        "click",
        guardarEventoTemporal
    );


    btnGuardarBorrador.addEventListener(
        "click",
        guardarBorrador
    );


    btnEnviarCedula.addEventListener(
        "click",
        prepararEnvioCedula
    );


    btnCancelarEnvio.addEventListener(
        "click",
        cerrarConfirmacionEnvio
    );


    btnConfirmarEnvio.addEventListener(
        "click",
        enviarCedulaOficial
    );


    modalConfirmarEnvio.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalConfirmarEnvio
            ) {

                cerrarConfirmacionEnvio();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {

                return;

            }


            if (
                !modalEvento.classList.contains(
                    "oculto"
                )
            ) {

                cerrarModalEvento();

                return;

            }


            if (
                !modalConfirmarEnvio.classList.contains(
                    "oculto"
                )
            ) {

                cerrarConfirmacionEnvio();

            }

        }
    );

}


async function iniciarCedula() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const partidoId =
        parametros.get("id");


    if (!partidoId) {

        mostrarError(
            "No se recibió el identificador del partido."
        );

        return;

    }


    btnVolverPartido.href =
        `partidoArbitro.html?id=${encodeURIComponent(partidoId)}`;


    try {

        const snapshotPartido =
            await getDoc(
                doc(
                    db,
                    "partidos",
                    partidoId
                )
            );


        if (
            !snapshotPartido.exists()
        ) {

            mostrarError(
                "El partido solicitado no existe."
            );

            return;

        }


        partido = {
            id:
                snapshotPartido.id,

            ...snapshotPartido.data()
        };


        if (
            !tienePermisoPartido()
        ) {

            mostrarError(
                "Este partido no está asignado a tu cuenta."
            );

            return;

        }


        await cargarAsistencia();


        if (!asistencia) {

            mostrarError(
                "Este partido todavía no tiene un pase de lista registrado."
            );

            return;

        }


        await Promise.all([
            cargarEquipos(),
            cargarJugadores()
        ]);


        cargarInformacionPartido();

        cargarPlantillas();

        cargarCapitanes();


        await cargarCedulaExistente();


        renderizarTodo();


        estadoCarga.classList.add(
            "oculto"
        );


        contenidoCedula.classList.remove(
            "oculto"
        );

    } catch (error) {

        console.error(
            "Error cargando cédula:",
            error
        );


        mostrarError(
            "Ocurrió un problema al cargar la cédula del encuentro."
        );

    }

}


function tienePermisoPartido() {

    if (
        usuarioActual.rol === "admin"
    ) {

        return true;

    }


    return (
        partido.arbitroId ===
            usuarioActual.uid ||
        partido.arbitroId ===
            usuarioActual.id
    );

}


async function cargarAsistencia() {

    const snapshot =
        await getDoc(
            doc(
                db,
                "asistenciasPartidos",
                partido.id
            )
        );


    if (
        !snapshot.exists()
    ) {

        asistencia =
            null;

        return;

    }


    asistencia = {
        id:
            snapshot.id,

        ...snapshot.data()
    };

}


async function cargarEquipos() {

    const [
        snapshotLocal,
        snapshotVisitante
    ] = await Promise.all([

        getDoc(
            doc(
                db,
                "equipos",
                partido.localId
            )
        ),

        getDoc(
            doc(
                db,
                "equipos",
                partido.visitanteId
            )
        )

    ]);


    if (
        snapshotLocal.exists()
    ) {

        equipoLocalData = {
            id:
                snapshotLocal.id,

            ...snapshotLocal.data()
        };

    }


    if (
        snapshotVisitante.exists()
    ) {

        equipoVisitanteData = {
            id:
                snapshotVisitante.id,

            ...snapshotVisitante.data()
        };

    }

}


async function cargarJugadores() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "jugadores"
            )
        );


    const todos =
        snapshot.docs.map(
            documento => ({
                id:
                    documento.id,

                ...documento.data()
            })
        );


    const presentesLocal =
        new Set(
            Array.isArray(
                asistencia.presentesLocal
            )
                ? asistencia.presentesLocal
                : []
        );


    const presentesVisitante =
        new Set(
            Array.isArray(
                asistencia.presentesVisitante
            )
                ? asistencia.presentesVisitante
                : []
        );


    jugadoresLocal =
        todos
            .filter(
                jugador =>
                    jugador.equipoId ===
                        partido.localId &&
                    presentesLocal.has(
                        jugador.id
                    )
            )
            .sort(
                ordenarJugadores
            );


    jugadoresVisitante =
        todos
            .filter(
                jugador =>
                    jugador.equipoId ===
                        partido.visitanteId &&
                    presentesVisitante.has(
                        jugador.id
                    )
            )
            .sort(
                ordenarJugadores
            );


    jugadores = [
        ...jugadoresLocal,
        ...jugadoresVisitante
    ];

}


function cargarInformacionPartido() {

    const nombreEquipoLocal =
        partido.localNombre ||
        equipoLocalData?.nombre ||
        "Equipo local";


    const nombreEquipoVisitante =
        partido.visitanteNombre ||
        equipoVisitanteData?.nombre ||
        "Equipo visitante";


    const nombreArbitro =
        partido.arbitroNombre ||
        usuarioActual.nombre ||
        "Árbitro";


    heroCategoria.textContent =
        partido.categoriaNombre ||
        "Sin categoría";


    heroJornada.textContent =
        partido.jornadaNombre ||
        "Sin jornada";


    nombreLocal.textContent =
        nombreEquipoLocal;


    nombreVisitante.textContent =
        nombreEquipoVisitante;


    marcadorNombreLocal.textContent =
        nombreEquipoLocal;


    marcadorNombreVisitante.textContent =
        nombreEquipoVisitante;


    penalesNombreLocal.textContent =
        nombreEquipoLocal;


    penalesNombreVisitante.textContent =
        nombreEquipoVisitante;


    plantillaNombreLocal.textContent =
        nombreEquipoLocal;


    plantillaNombreVisitante.textContent =
        nombreEquipoVisitante;


    tecnicoNombreLocal.textContent =
        nombreEquipoLocal;


    tecnicoNombreVisitante.textContent =
        nombreEquipoVisitante;


    conductaNombreLocal.textContent =
        nombreEquipoLocal;


    conductaNombreVisitante.textContent =
        nombreEquipoVisitante;


    heroFecha.textContent =
        formatearFecha(
            partido.fecha
        );


    heroHora.textContent =
        formatearHora(
            partido.hora
        );


    heroCampo.textContent =
        partido.campo ||
        "Campo por definir";


    arbitroCentral.value =
        nombreArbitro;


    resumenArbitro.textContent =
        nombreArbitro;


    cargarLogo(
        logoLocal,
        equipoLocalData,
        nombreEquipoLocal,
        "L"
    );


    cargarLogo(
        logoVisitante,
        equipoVisitanteData,
        nombreEquipoVisitante,
        "V"
    );

}


function cargarPlantillas() {

    totalPresentesLocal.textContent =
        jugadoresLocal.length;


    totalPresentesVisitante.textContent =
        jugadoresVisitante.length;


    renderizarPlantilla(
        listaJugadoresLocal,
        jugadoresLocal
    );


    renderizarPlantilla(
        listaJugadoresVisitante,
        jugadoresVisitante
    );

}


function renderizarPlantilla(
    contenedor,
    lista
) {

    contenedor.innerHTML =
        "";


    if (
        !lista.length
    ) {

        const vacio =
            document.createElement(
                "div"
            );


        vacio.className =
            "jugador-cedula-vacio";


        vacio.textContent =
            "No hay jugadores registrados como presentes.";


        contenedor.appendChild(
            vacio
        );

        return;

    }


    lista.forEach(
        jugador => {

            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "jugador-cedula-item";


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "-";


            const nombre =
                jugador.nombre ||
                jugador.nombreCompleto ||
                "Jugador";


            elemento.innerHTML = `

                <span class="jugador-cedula-numero">
                    #${escaparHTML(numero)}
                </span>

                <strong>
                    ${escaparHTML(nombre)}
                </strong>

            `;


            contenedor.appendChild(
                elemento
            );

        }
    );

}


function cargarCapitanes() {

    llenarSelectJugadores(
        capitanLocal,
        jugadoresLocal
    );


    llenarSelectJugadores(
        capitanVisitante,
        jugadoresVisitante
    );

}


function llenarSelectJugadores(
    select,
    lista
) {

    select.innerHTML = `

        <option value="">
            Selecciona al capitán
        </option>

    `;


    lista.forEach(
        jugador => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                jugador.id;


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "";


            const nombre =
                jugador.nombre ||
                jugador.nombreCompleto ||
                "Jugador";


            option.textContent =
                numero !== ""
                    ? `#${numero} - ${nombre}`
                    : nombre;


            select.appendChild(
                option
            );

        }
    );

}


async function cargarCedulaExistente() {

    const snapshot =
        await getDoc(
            doc(
                db,
                "cedulas",
                partido.id
            )
        );


    if (
        !snapshot.exists()
    ) {

        estadoCedulaTop.textContent =
            "Pendiente";


        estadoCedulaTop.className =
            "estado-top pendiente";


        actualizarContadoresTexto();

        actualizarBloquePenales();

        return;

    }


    const datos =
        snapshot.data();


    golesLocal.value =
        numeroSeguro(
            datos.golesLocal
        );


    golesVisitante.value =
        numeroSeguro(
            datos.golesVisitante
        );


    arbitroAsistente1.value =
        datos.arbitroAsistente1 ||
        "";


    arbitroAsistente2.value =
        datos.arbitroAsistente2 ||
        "";


    inicioPrimerTiempo.value =
        datos.inicioPrimerTiempo ||
        "";


    finPrimerTiempo.value =
        datos.finPrimerTiempo ||
        "";


    inicioSegundoTiempo.value =
        datos.inicioSegundoTiempo ||
        "";


    finSegundoTiempo.value =
        datos.finSegundoTiempo ||
        "";


    huboPenales.checked =
        datos.huboPenales === true;


    penalesLocal.value =
        numeroSeguro(
            datos.penalesLocal
        );


    penalesVisitante.value =
        numeroSeguro(
            datos.penalesVisitante
        );


    entrenadorLocal.value =
        datos.entrenadorLocal ||
        "";


    medicoLocal.value =
        datos.medicoLocal ||
        "";


    auxiliarLocal.value =
        datos.auxiliarLocal ||
        "";


    entrenadorVisitante.value =
        datos.entrenadorVisitante ||
        "";


    medicoVisitante.value =
        datos.medicoVisitante ||
        "";


    auxiliarVisitante.value =
        datos.auxiliarVisitante ||
        "";


    estadoTerreno.value =
        datos.estadoTerreno ||
        "";


    conductaPublicoLocal.value =
        datos.conductaPublicoLocal ||
        "";


    conductaPublicoVisitante.value =
        datos.conductaPublicoVisitante ||
        "";


    observacionPublicoLocal.value =
        datos.observacionPublicoLocal ||
        "";


    observacionPublicoVisitante.value =
        datos.observacionPublicoVisitante ||
        "";


    incidencias.value =
        datos.incidencias ||
        "";


    eventosGoles =
        Array.isArray(
            datos.goles
        )
            ? datos.goles
            : [];


    eventosAmarillas =
        Array.isArray(
            datos.amarillas
        )
            ? datos.amarillas
            : [];


    eventosRojas =
        Array.isArray(
            datos.rojas
        )
            ? datos.rojas
            : [];


    if (
        datos.capitanLocalId
    ) {

        capitanLocal.value =
            datos.capitanLocalId;

    }


    if (
        datos.capitanVisitanteId
    ) {

        capitanVisitante.value =
            datos.capitanVisitanteId;

    }


    confirmarInformacion.checked =
        datos.confirmadoPorArbitro === true;


    cedulaEnviada =
        datos.estado === "registrada" ||
        datos.estado === "enviada";


    actualizarContadoresTexto();

    actualizarBloquePenales();


    if (
        cedulaEnviada
    ) {

        estadoCedulaTop.textContent =
            "Registrada";


        estadoCedulaTop.className =
            "estado-top registrada";


        bloquearCedula();

    } else {

        estadoCedulaTop.textContent =
            "Borrador";


        estadoCedulaTop.className =
            "estado-top borrador";

    }

}


function actualizarContadoresTexto() {

    contadorIncidencias.textContent =
        incidencias.value.length;


    contadorTerreno.textContent =
        estadoTerreno.value.length;

}


function actualizarBloquePenales() {

    bloquePenales.classList.toggle(
        "oculto",
        !huboPenales.checked
    );


    resumenPenalesContenedor.classList.toggle(
        "oculto",
        !huboPenales.checked
    );


    confirmarPenalesContenedor.classList.toggle(
        "oculto",
        !huboPenales.checked
    );

}


function abrirModalEvento(
    tipo
) {

    if (
        cedulaEnviada
    ) {

        mostrarToast(
            "error",
            "Cédula cerrada",
            "La cédula oficial ya fue enviada."
        );

        return;

    }


    tipoEventoActual =
        tipo;


    eventoEquipo.value =
        "local";


    eventoJugador.value =
        "";


    eventoMinuto.value =
        "";


    eventoMotivo.value =
        "";


    grupoTipoRoja.classList.add(
        "oculto"
    );


    if (
        tipo === "gol"
    ) {

        modalEventoMini.textContent =
            "GOL";


        modalEventoTitulo.textContent =
            "Registrar anotación";


        btnGuardarEvento.textContent =
            "Agregar gol";

    }


    if (
        tipo === "amarilla"
    ) {

        modalEventoMini.textContent =
            "AMONESTACIÓN";


        modalEventoTitulo.textContent =
            "Registrar tarjeta amarilla";


        btnGuardarEvento.textContent =
            "Agregar amarilla";

    }


    if (
        tipo === "roja"
    ) {

        modalEventoMini.textContent =
            "EXPULSIÓN";


        modalEventoTitulo.textContent =
            "Registrar tarjeta roja";


        btnGuardarEvento.textContent =
            "Agregar roja";


        grupoTipoRoja.classList.remove(
            "oculto"
        );


        eventoTipoRoja.value =
            "directa";

    }


    cargarJugadoresModal();


    modalEvento.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cargarJugadoresModal() {

    const lista =
        eventoEquipo.value === "local"
            ? jugadoresLocal
            : jugadoresVisitante;


    eventoJugador.innerHTML = `

        <option value="">
            Selecciona un jugador
        </option>

    `;


    lista.forEach(
        jugador => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                jugador.id;


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "";


            const nombre =
                jugador.nombre ||
                jugador.nombreCompleto ||
                "Jugador";


            option.textContent =
                numero !== ""
                    ? `#${numero} - ${nombre}`
                    : nombre;


            eventoJugador.appendChild(
                option
            );

        }
    );

}


function guardarEventoTemporal() {

    if (
        !tipoEventoActual
    ) {

        return;

    }


    const jugadorId =
        eventoJugador.value;


    if (
        !jugadorId
    ) {

        mostrarToast(
            "error",
            "Selecciona un jugador",
            "Debes indicar a qué jugador corresponde el evento."
        );

        return;

    }


    const jugador =
        jugadores.find(
            item =>
                item.id ===
                jugadorId
        );


    if (
        !jugador
    ) {

        mostrarToast(
            "error",
            "Jugador no disponible",
            "No pudimos encontrar al jugador seleccionado."
        );

        return;

    }


    const minuto =
        normalizarMinuto(
            eventoMinuto.value
        );


    const equipo =
        eventoEquipo.value;


    const evento = {

        id:
            crearIdTemporal(),

        jugadorId:
            jugador.id,

        jugadorNombre:
            jugador.nombre ||
            jugador.nombreCompleto ||
            "Jugador",

        numero:
            jugador.numero ??
            jugador.dorsal ??
            null,

        equipoId:
            equipo === "local"
                ? partido.localId
                : partido.visitanteId,

        equipo,

        equipoNombre:
            equipo === "local"
                ? partido.localNombre
                : partido.visitanteNombre,

        minuto,

        motivo:
            eventoMotivo.value
                .trim()
                .slice(
                    0,
                    250
                )

    };


    if (
        tipoEventoActual === "gol"
    ) {

        eventosGoles.push(
            evento
        );

    }


    if (
        tipoEventoActual === "amarilla"
    ) {

        eventosAmarillas.push(
            evento
        );

    }


    if (
        tipoEventoActual === "roja"
    ) {

        evento.tipoRoja =
            eventoTipoRoja.value;


        eventosRojas.push(
            evento
        );

    }


    cerrarModalEvento();

    renderizarTodo();

}


function renderizarTodo() {

    renderizarEventos(
        eventosGoles,
        listaGoles,
        sinGoles,
        "gol"
    );


    renderizarEventos(
        eventosAmarillas,
        listaAmarillas,
        sinAmarillas,
        "amarilla"
    );


    renderizarEventos(
        eventosRojas,
        listaRojas,
        sinRojas,
        "roja"
    );


    actualizarResumen();

}


function renderizarEventos(
    eventos,
    contenedor,
    estadoVacio,
    tipo
) {

    contenedor.innerHTML =
        "";


    estadoVacio.classList.toggle(
        "oculto",
        eventos.length > 0
    );


    eventos.forEach(
        evento => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "evento-card";


            let icono =
                "⚽";


            let claseIcono =
                "";


            if (
                tipo === "amarilla"
            ) {

                icono =
                    "🟨";


                claseIcono =
                    "amarilla";

            }


            if (
                tipo === "roja"
            ) {

                icono =
                    "🟥";


                claseIcono =
                    "roja";

            }


            let detalle =
                evento.equipoNombre ||
                "Equipo";


            if (
                evento.numero !== null &&
                evento.numero !== undefined
            ) {

                detalle +=
                    ` · #${evento.numero}`;

            }


            if (
                evento.minuto !== null
            ) {

                detalle +=
                    ` · ${evento.minuto}'`;

            }


            if (
                tipo === "roja"
            ) {

                detalle +=
                    evento.tipoRoja ===
                    "dobleAmarilla"
                        ? " · Doble amarilla"
                        : " · Roja directa";

            }


            card.innerHTML = `

                <div class="evento-icono ${claseIcono}">
                    ${icono}
                </div>


                <div class="evento-info">

                    <strong>
                        ${escaparHTML(
                            evento.jugadorNombre ||
                            "Jugador"
                        )}
                    </strong>

                    <span>
                        ${escaparHTML(detalle)}
                    </span>

                    ${
                        evento.motivo
                            ? `
                                <small>
                                    ${escaparHTML(evento.motivo)}
                                </small>
                            `
                            : ""
                    }

                </div>


                <button
                    type="button"
                    class="btn-eliminar-evento"
                    aria-label="Eliminar evento"
                    ${cedulaEnviada ? "disabled" : ""}
                >
                    ×
                </button>

            `;


            const boton =
                card.querySelector(
                    ".btn-eliminar-evento"
                );


            if (
                !cedulaEnviada
            ) {

                boton.addEventListener(
                    "click",
                    () => {

                        eliminarEvento(
                            tipo,
                            evento.id
                        );

                    }
                );

            }


            contenedor.appendChild(
                card
            );

        }
    );

}


function eliminarEvento(
    tipo,
    id
) {

    if (
        cedulaEnviada
    ) {

        return;

    }


    if (
        tipo === "gol"
    ) {

        eventosGoles =
            eventosGoles.filter(
                evento =>
                    evento.id !== id
            );

    }


    if (
        tipo === "amarilla"
    ) {

        eventosAmarillas =
            eventosAmarillas.filter(
                evento =>
                    evento.id !== id
            );

    }


    if (
        tipo === "roja"
    ) {

        eventosRojas =
            eventosRojas.filter(
                evento =>
                    evento.id !== id
            );

    }


    renderizarTodo();

}


function actualizarResumen() {

    const local =
        numeroSeguro(
            golesLocal.value
        );


    const visitante =
        numeroSeguro(
            golesVisitante.value
        );


    resumenResultado.textContent =
        `${local} - ${visitante}`;


    confirmarResultado.textContent =
        `${local} - ${visitante}`;


    resumenGoles.textContent =
        eventosGoles.length;


    resumenAmarillas.textContent =
        eventosAmarillas.length;


    resumenRojas.textContent =
        eventosRojas.length;


    resumenJugadores.textContent =
        jugadoresLocal.length +
        jugadoresVisitante.length;


    if (
        huboPenales.checked
    ) {

        const localPenales =
            numeroSeguro(
                penalesLocal.value
            );


        const visitantePenales =
            numeroSeguro(
                penalesVisitante.value
            );


        resumenPenales.textContent =
            `${localPenales} - ${visitantePenales}`;


        confirmarPenales.textContent =
            `${localPenales} - ${visitantePenales}`;

    }


    actualizarBloquePenales();

}


async function guardarBorrador() {

    if (
        !partido ||
        cedulaEnviada
    ) {

        return;

    }


    btnGuardarBorrador.disabled =
        true;


    btnGuardarBorrador.textContent =
        "Guardando...";


    try {

        await setDoc(
            doc(
                db,
                "cedulas",
                partido.id
            ),
            construirDatosCedula(
                "borrador"
            ),
            {
                merge: true
            }
        );


        estadoCedulaTop.textContent =
            "Borrador";


        estadoCedulaTop.className =
            "estado-top borrador";


        mostrarToast(
            "exito",
            "Borrador guardado",
            "Puedes salir y continuar llenando la cédula más tarde."
        );

    } catch (error) {

        console.error(
            "Error guardando borrador:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al guardar el borrador."
        );

    } finally {

        btnGuardarBorrador.disabled =
            false;


        btnGuardarBorrador.textContent =
            "Guardar borrador";

    }

}


function prepararEnvioCedula() {

    if (
        cedulaEnviada
    ) {

        return;

    }


    const validacion =
        validarCedula();


    if (
        !validacion.ok
    ) {

        mostrarToast(
            "error",
            "Revisa la cédula",
            validacion.mensaje
        );

        return;

    }


    actualizarResumen();


    modalConfirmarEnvio.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function validarCedula() {

    const marcadorLocal =
        numeroSeguro(
            golesLocal.value
        );


    const marcadorVisitante =
        numeroSeguro(
            golesVisitante.value
        );


    const golesEventosLocal =
        eventosGoles.filter(
            evento =>
                evento.equipo ===
                "local"
        ).length;


    const golesEventosVisitante =
        eventosGoles.filter(
            evento =>
                evento.equipo ===
                "visitante"
        ).length;


    if (
        marcadorLocal !==
        golesEventosLocal
    ) {

        return {
            ok:
                false,

            mensaje:
                `El marcador indica ${marcadorLocal} goles del local, pero registraste ${golesEventosLocal} anotadores.`
        };

    }


    if (
        marcadorVisitante !==
        golesEventosVisitante
    ) {

        return {
            ok:
                false,

            mensaje:
                `El marcador indica ${marcadorVisitante} goles del visitante, pero registraste ${golesEventosVisitante} anotadores.`
        };

    }


    const jugadoresRojos =
        new Set();


    for (
        const roja of eventosRojas
    ) {

        if (
            jugadoresRojos.has(
                roja.jugadorId
            )
        ) {

            return {
                ok:
                    false,

                mensaje:
                    `${roja.jugadorNombre} tiene más de una expulsión registrada.`
            };

        }


        jugadoresRojos.add(
            roja.jugadorId
        );

    }


    if (
        !inicioPrimerTiempo.value
    ) {

        return {
            ok:
                false,

            mensaje:
                "Indica la hora de inicio del primer tiempo."
        };

    }


    if (
        !finPrimerTiempo.value
    ) {

        return {
            ok:
                false,

            mensaje:
                "Indica la hora en que terminó el primer tiempo."
        };

    }


    if (
        !inicioSegundoTiempo.value
    ) {

        return {
            ok:
                false,

            mensaje:
                "Indica la hora de inicio del segundo tiempo."
        };

    }


    if (
        !finSegundoTiempo.value
    ) {

        return {
            ok:
                false,

            mensaje:
                "Indica la hora en que terminó el segundo tiempo."
        };

    }


    if (
        huboPenales.checked
    ) {

        const golesPenalesLocal =
            numeroSeguro(
                penalesLocal.value
            );


        const golesPenalesVisitante =
            numeroSeguro(
                penalesVisitante.value
            );


        if (
            golesPenalesLocal ===
            golesPenalesVisitante
        ) {

            return {
                ok:
                    false,

                mensaje:
                    "Una tanda de penales debe terminar con un ganador."
            };

        }

    }


    if (
        !capitanLocal.value
    ) {

        return {
            ok:
                false,

            mensaje:
                "Selecciona al capitán del equipo local."
        };

    }


    if (
        !capitanVisitante.value
    ) {

        return {
            ok:
                false,

            mensaje:
                "Selecciona al capitán del equipo visitante."
        };

    }


    if (
        !confirmarInformacion.checked
    ) {

        return {
            ok:
                false,

            mensaje:
                "Debes confirmar que la información de la cédula es correcta."
        };

    }


    return {
        ok:
            true
    };

}


async function enviarCedulaOficial() {

    if (
        !partido ||
        cedulaEnviada
    ) {

        return;

    }


    const validacion =
        validarCedula();


    if (
        !validacion.ok
    ) {

        cerrarConfirmacionEnvio();


        mostrarToast(
            "error",
            "Revisa la cédula",
            validacion.mensaje
        );

        return;

    }


    btnConfirmarEnvio.disabled =
        true;


    btnConfirmarEnvio.textContent =
        "Enviando...";


    try {

        const referenciaCedula =
            doc(
                db,
                "cedulas",
                partido.id
            );


        await setDoc(
            referenciaCedula,
            construirDatosCedula(
                "registrada"
            ),
            {
                merge: true
            }
        );


        const datosPartido = {

            golesLocal:
                numeroSeguro(
                    golesLocal.value
                ),

            golesVisitante:
                numeroSeguro(
                    golesVisitante.value
                ),

            huboPenales:
                huboPenales.checked,

            penalesLocal:
                huboPenales.checked
                    ? numeroSeguro(
                        penalesLocal.value
                    )
                    : null,

            penalesVisitante:
                huboPenales.checked
                    ? numeroSeguro(
                        penalesVisitante.value
                    )
                    : null,

            estado:
                "finalizado",

            cedulaCreada:
                true,

            resultadoRegistrado:
                true,

            cedulaId:
                partido.id,

            finalizadoEn:
                serverTimestamp(),

            cedulaActualizadaEn:
                serverTimestamp()

        };


        await updateDoc(
            doc(
                db,
                "partidos",
                partido.id
            ),
            datosPartido
        );


        await actualizarEstadisticasJugadores();


        cedulaEnviada =
            true;


        partido.cedulaCreada =
            true;


        partido.resultadoRegistrado =
            true;


        partido.estado =
            "finalizado";


        cerrarConfirmacionEnvio();

        bloquearCedula();

        renderizarTodo();


        estadoCedulaTop.textContent =
            "Registrada";


        estadoCedulaTop.className =
            "estado-top registrada";


        mostrarToast(
            "exito",
            "Cédula enviada",
            "El resultado y todos los datos quedaron registrados oficialmente."
        );

    } catch (error) {

        console.error(
            "Error enviando cédula:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo enviar",
            "La cédula no pudo registrarse. Intenta nuevamente."
        );

    } finally {

        btnConfirmarEnvio.disabled =
            false;


        btnConfirmarEnvio.textContent =
            "Confirmar envío";

    }

}


async function actualizarEstadisticasJugadores() {

    const batch =
        writeBatch(
            db
        );


    const estadisticas =
        new Map();


    jugadores.forEach(
        jugador => {

            estadisticas.set(
                jugador.id,
                {
                    goles:
                        0,

                    amarillas:
                        0,

                    rojas:
                        0
                }
            );

        }
    );


    eventosGoles.forEach(
        evento => {

            const registro =
                estadisticas.get(
                    evento.jugadorId
                );


            if (
                registro
            ) {

                registro.goles +=
                    1;

            }

        }
    );


    eventosAmarillas.forEach(
        evento => {

            const registro =
                estadisticas.get(
                    evento.jugadorId
                );


            if (
                registro
            ) {

                registro.amarillas +=
                    1;

            }

        }
    );


    eventosRojas.forEach(
        evento => {

            const registro =
                estadisticas.get(
                    evento.jugadorId
                );


            if (
                registro
            ) {

                registro.rojas +=
                    1;

            }

        }
    );


    for (
        const [
            jugadorId,
            registro
        ] of estadisticas
    ) {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "jugadores",
                    jugadorId
                )
            );


        if (
            !snapshot.exists()
        ) {

            continue;

        }


        const datosActuales =
            snapshot.data();


        const nuevosDatos = {

            goles:
                numeroSeguro(
                    datosActuales.goles
                ) +
                registro.goles,

            amarillas:
                numeroSeguro(
                    datosActuales.amarillas
                ) +
                registro.amarillas,

            rojas:
                numeroSeguro(
                    datosActuales.rojas
                ) +
                registro.rojas,

            actualizadoEn:
                serverTimestamp()

        };


        if (
            registro.rojas > 0
        ) {

            nuevosDatos.suspendido =
                true;


            nuevosDatos.partidosSuspensionPendientes =
                Math.max(
                    1,
                    numeroSeguro(
                        datosActuales.partidosSuspensionPendientes
                    )
                );

        }


        batch.update(
            doc(
                db,
                "jugadores",
                jugadorId
            ),
            nuevosDatos
        );

    }


    await batch.commit();

}


function construirDatosCedula(
    estado
) {

    const jugadorCapitanLocal =
        jugadoresLocal.find(
            jugador =>
                jugador.id ===
                capitanLocal.value
        );


    const jugadorCapitanVisitante =
        jugadoresVisitante.find(
            jugador =>
                jugador.id ===
                capitanVisitante.value
        );


    return {

        partidoId:
            partido.id,

        categoriaId:
            partido.categoriaId ||
            null,

        categoriaNombre:
            partido.categoriaNombre ||
            "",

        jornadaId:
            partido.jornadaId ||
            null,

        jornadaNombre:
            partido.jornadaNombre ||
            "",

        fecha:
            partido.fecha ||
            "",

        hora:
            partido.hora ||
            "",

        campo:
            partido.campo ||
            "",


        localId:
            partido.localId,

        localNombre:
            partido.localNombre ||
            "",

        visitanteId:
            partido.visitanteId,

        visitanteNombre:
            partido.visitanteNombre ||
            "",


        arbitroId:
            partido.arbitroId ||
            usuarioActual.uid ||
            usuarioActual.id ||
            null,

        arbitroNombre:
            partido.arbitroNombre ||
            usuarioActual.nombre ||
            "",

        arbitroAsistente1:
            arbitroAsistente1.value
                .trim()
                .slice(
                    0,
                    120
                ),

        arbitroAsistente2:
            arbitroAsistente2.value
                .trim()
                .slice(
                    0,
                    120
                ),


        inicioPrimerTiempo:
            inicioPrimerTiempo.value ||
            "",

        finPrimerTiempo:
            finPrimerTiempo.value ||
            "",

        inicioSegundoTiempo:
            inicioSegundoTiempo.value ||
            "",

        finSegundoTiempo:
            finSegundoTiempo.value ||
            "",


        golesLocal:
            numeroSeguro(
                golesLocal.value
            ),

        golesVisitante:
            numeroSeguro(
                golesVisitante.value
            ),


        huboPenales:
            huboPenales.checked,

        penalesLocal:
            huboPenales.checked
                ? numeroSeguro(
                    penalesLocal.value
                )
                : null,

        penalesVisitante:
            huboPenales.checked
                ? numeroSeguro(
                    penalesVisitante.value
                )
                : null,


        goles:
            eventosGoles,

        amarillas:
            eventosAmarillas,

        rojas:
            eventosRojas,


        presentesLocal:
            Array.isArray(
                asistencia.presentesLocal
            )
                ? asistencia.presentesLocal
                : [],

        presentesVisitante:
            Array.isArray(
                asistencia.presentesVisitante
            )
                ? asistencia.presentesVisitante
                : [],

        totalPresentesLocal:
            jugadoresLocal.length,

        totalPresentesVisitante:
            jugadoresVisitante.length,

        totalPresentes:
            jugadoresLocal.length +
            jugadoresVisitante.length,


        entrenadorLocal:
            entrenadorLocal.value
                .trim()
                .slice(
                    0,
                    120
                ),

        medicoLocal:
            medicoLocal.value
                .trim()
                .slice(
                    0,
                    120
                ),

        auxiliarLocal:
            auxiliarLocal.value
                .trim()
                .slice(
                    0,
                    120
                ),


        entrenadorVisitante:
            entrenadorVisitante.value
                .trim()
                .slice(
                    0,
                    120
                ),

        medicoVisitante:
            medicoVisitante.value
                .trim()
                .slice(
                    0,
                    120
                ),

        auxiliarVisitante:
            auxiliarVisitante.value
                .trim()
                .slice(
                    0,
                    120
                ),


        capitanLocalId:
            capitanLocal.value ||
            null,

        capitanLocalNombre:
            jugadorCapitanLocal
                ? (
                    jugadorCapitanLocal.nombre ||
                    jugadorCapitanLocal.nombreCompleto ||
                    ""
                )
                : "",

        capitanVisitanteId:
            capitanVisitante.value ||
            null,

        capitanVisitanteNombre:
            jugadorCapitanVisitante
                ? (
                    jugadorCapitanVisitante.nombre ||
                    jugadorCapitanVisitante.nombreCompleto ||
                    ""
                )
                : "",


        estadoTerreno:
            estadoTerreno.value
                .trim()
                .slice(
                    0,
                    500
                ),


        conductaPublicoLocal:
            conductaPublicoLocal.value ||
            "",

        observacionPublicoLocal:
            observacionPublicoLocal.value
                .trim()
                .slice(
                    0,
                    300
                ),

        conductaPublicoVisitante:
            conductaPublicoVisitante.value ||
            "",

        observacionPublicoVisitante:
            observacionPublicoVisitante.value
                .trim()
                .slice(
                    0,
                    300
                ),


        incidencias:
            incidencias.value
                .trim()
                .slice(
                    0,
                    2000
                ),


        confirmadoPorArbitro:
            confirmarInformacion.checked,

        confirmadoPorUid:
            estado === "registrada"
                ? (
                    usuarioActual.uid ||
                    usuarioActual.id ||
                    null
                )
                : null,

        confirmadoPorNombre:
            estado === "registrada"
                ? (
                    usuarioActual.nombre ||
                    partido.arbitroNombre ||
                    ""
                )
                : null,


        estado,

        actualizadoEn:
            serverTimestamp(),

        enviadoEn:
            estado === "registrada"
                ? serverTimestamp()
                : null

    };

}


function bloquearCedula() {

    const campos =
        contenidoCedula.querySelectorAll(
            "input, textarea, select"
        );


    campos.forEach(
        campo => {

            campo.disabled =
                true;

        }
    );


    btnAgregarGol.disabled =
        true;


    btnAgregarAmarilla.disabled =
        true;


    btnAgregarRoja.disabled =
        true;


    btnGuardarBorrador.disabled =
        true;


    btnEnviarCedula.disabled =
        true;


    btnGuardarBorrador.textContent =
        "Cédula registrada";


    btnEnviarCedula.textContent =
        "Enviada oficialmente";

}


function cerrarModalEvento() {

    modalEvento.classList.add(
        "oculto"
    );


    tipoEventoActual =
        null;


    document.body.style.overflow =
        "";

}


function cerrarConfirmacionEnvio() {

    modalConfirmarEnvio.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";

}


function normalizarMarcador(
    input
) {

    let valor =
        Number(
            input.value
        );


    if (
        !Number.isFinite(valor) ||
        valor < 0
    ) {

        valor =
            0;

    }


    if (
        valor > 99
    ) {

        valor =
            99;

    }


    input.value =
        Math.floor(
            valor
        );

}


function normalizarMinuto(
    valor
) {

    if (
        valor === "" ||
        valor === null ||
        valor === undefined
    ) {

        return null;

    }


    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(numero)
    ) {

        return null;

    }


    return Math.max(
        0,
        Math.min(
            180,
            Math.floor(numero)
        )
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
        !Number.isFinite(numero) ||
        numero < 0
    ) {

        return 0;

    }


    return Math.floor(
        numero
    );

}


function crearIdTemporal() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
            "function"
    ) {

        return window.crypto.randomUUID();

    }


    return `${
        Date.now()
    }-${
        Math.random()
            .toString(36)
            .slice(2)
    }`;

}


function ordenarJugadores(
    a,
    b
) {

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


    if (
        numeroA !==
        numeroB
    ) {

        return numeroA -
            numeroB;

    }


    return (
        a.nombre ||
        a.nombreCompleto ||
        ""
    ).localeCompare(
        b.nombre ||
        b.nombreCompleto ||
        "",
        "es"
    );

}


function cargarLogo(
    contenedor,
    equipo,
    nombre,
    inicial
) {

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
            inicial
        );

}


function formatearFecha(
    fecha
) {

    if (
        !fecha
    ) {

        return "Sin definir";

    }


    const partes =
        String(
            fecha
        ).split("-");


    if (
        partes.length !== 3
    ) {

        return String(
            fecha
        );

    }


    const objeto =
        new Date(
            Number(
                partes[0]
            ),
            Number(
                partes[1]
            ) - 1,
            Number(
                partes[2]
            )
        );


    return objeto.toLocaleDateString(
        "es-MX",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


function formatearHora(
    hora
) {

    if (
        !hora
    ) {

        return "Sin definir";

    }


    const partes =
        String(
            hora
        ).split(":");


    const horas =
        Number(
            partes[0]
        );


    const minutos =
        partes[1] ||
        "00";


    if (
        !Number.isFinite(horas)
    ) {

        return String(
            hora
        );

    }


    const periodo =
        horas >= 12
            ? "PM"
            : "AM";


    const hora12 =
        horas % 12 ||
        12;


    return `${
        hora12
    }:${
        minutos
    } ${
        periodo
    }`;

}


function obtenerInicial(
    nombre
) {

    const texto =
        String(
            nombre ||
            ""
        ).trim();


    if (
        !texto
    ) {

        return "E";

    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function escaparHTML(
    texto
) {

    return String(
        texto ??
        ""
    )
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


function mostrarError(
    texto
) {

    estadoCarga.classList.add(
        "oculto"
    );


    contenidoCedula.classList.add(
        "oculto"
    );


    estadoErrorTexto.textContent =
        texto;


    estadoError.classList.remove(
        "oculto"
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
            4000
        );

}