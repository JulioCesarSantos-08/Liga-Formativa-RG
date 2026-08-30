import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";


const estadoPartidoTop = document.getElementById("estadoPartidoTop");

const estadoCarga = document.getElementById("estadoCarga");
const estadoError = document.getElementById("estadoError");
const estadoErrorTexto = document.getElementById("estadoErrorTexto");
const contenidoPartido = document.getElementById("contenidoPartido");

const heroCategoria = document.getElementById("heroCategoria");
const heroJornada = document.getElementById("heroJornada");

const logoLocal = document.getElementById("logoLocal");
const logoVisitante = document.getElementById("logoVisitante");

const nombreLocal = document.getElementById("nombreLocal");
const nombreVisitante = document.getElementById("nombreVisitante");

const heroFecha = document.getElementById("heroFecha");
const heroHora = document.getElementById("heroHora");
const heroCampo = document.getElementById("heroCampo");

const estadoCedulaIcono = document.getElementById("estadoCedulaIcono");
const estadoCedulaTitulo = document.getElementById("estadoCedulaTitulo");
const estadoCedulaTexto = document.getElementById("estadoCedulaTexto");
const estadoCedulaBadge = document.getElementById("estadoCedulaBadge");

const datoFecha = document.getElementById("datoFecha");
const datoHora = document.getElementById("datoHora");
const datoCampo = document.getElementById("datoCampo");
const datoCategoria = document.getElementById("datoCategoria");
const datoJornada = document.getElementById("datoJornada");
const datoArbitro = document.getElementById("datoArbitro");

const seccionAsistencia = document.getElementById("seccionAsistencia");
const estadoAsistencia = document.getElementById("estadoAsistencia");

const asistenciaLogoLocal = document.getElementById("asistenciaLogoLocal");
const asistenciaLogoVisitante = document.getElementById("asistenciaLogoVisitante");

const asistenciaNombreLocal = document.getElementById("asistenciaNombreLocal");
const asistenciaNombreVisitante = document.getElementById("asistenciaNombreVisitante");

const contadorLocal = document.getElementById("contadorLocal");
const contadorVisitante = document.getElementById("contadorVisitante");

const btnTodosLocal = document.getElementById("btnTodosLocal");
const btnNingunoLocal = document.getElementById("btnNingunoLocal");

const btnTodosVisitante = document.getElementById("btnTodosVisitante");
const btnNingunoVisitante = document.getElementById("btnNingunoVisitante");

const listaJugadoresLocal = document.getElementById("listaJugadoresLocal");
const listaJugadoresVisitante = document.getElementById("listaJugadoresVisitante");

const resumenPresentesLocal = document.getElementById("resumenPresentesLocal");
const resumenPresentesVisitante = document.getElementById("resumenPresentesVisitante");
const resumenPresentesTotal = document.getElementById("resumenPresentesTotal");

const btnGuardarAsistencia = document.getElementById("btnGuardarAsistencia");

const seccionAsistenciaGuardada = document.getElementById("seccionAsistenciaGuardada");
const textoAsistenciaGuardada = document.getElementById("textoAsistenciaGuardada");
const btnEditarAsistencia = document.getElementById("btnEditarAsistencia");

const textoAccionCedula = document.getElementById("textoAccionCedula");
const btnIrCedula = document.getElementById("btnIrCedula");

const modalConfirmarAsistencia = document.getElementById("modalConfirmarAsistencia");

const confirmarLocal = document.getElementById("confirmarLocal");
const confirmarVisitante = document.getElementById("confirmarVisitante");
const confirmarTotal = document.getElementById("confirmarTotal");

const btnCancelarAsistencia = document.getElementById("btnCancelarAsistencia");
const btnConfirmarAsistencia = document.getElementById("btnConfirmarAsistencia");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let usuarioActual = null;

let partido = null;
let equipoLocalData = null;
let equipoVisitanteData = null;

let jugadoresLocal = [];
let jugadoresVisitante = [];

let presentesLocal = new Set();
let presentesVisitante = new Set();

let asistenciaGuardada = false;
let edicionAsistencia = false;

let toastTimer = null;


const usuario = await protegerPagina([
    "arbitro",
    "admin"
]);


if (usuario) {

    usuarioActual = usuario;

    activarEventos();

    await iniciarPagina();

}


function activarEventos() {

    btnTodosLocal.addEventListener(
        "click",
        () => {

            presentesLocal =
                new Set(
                    jugadoresLocal
                        .filter(jugador => puedeJugar(jugador))
                        .map(jugador => jugador.id)
                );

            renderizarJugadoresLocal();
            actualizarResumenAsistencia();

        }
    );


    btnNingunoLocal.addEventListener(
        "click",
        () => {

            presentesLocal.clear();

            renderizarJugadoresLocal();
            actualizarResumenAsistencia();

        }
    );


    btnTodosVisitante.addEventListener(
        "click",
        () => {

            presentesVisitante =
                new Set(
                    jugadoresVisitante
                        .filter(jugador => puedeJugar(jugador))
                        .map(jugador => jugador.id)
                );

            renderizarJugadoresVisitante();
            actualizarResumenAsistencia();

        }
    );


    btnNingunoVisitante.addEventListener(
        "click",
        () => {

            presentesVisitante.clear();

            renderizarJugadoresVisitante();
            actualizarResumenAsistencia();

        }
    );


    btnGuardarAsistencia.addEventListener(
        "click",
        abrirConfirmacionAsistencia
    );


    btnCancelarAsistencia.addEventListener(
        "click",
        cerrarConfirmacion
    );


    btnConfirmarAsistencia.addEventListener(
        "click",
        guardarAsistencia
    );


    modalConfirmarAsistencia.addEventListener(
        "click",
        event => {

            if (
                event.target === modalConfirmarAsistencia
            ) {

                cerrarConfirmacion();

            }

        }
    );


    btnEditarAsistencia.addEventListener(
        "click",
        () => {

            edicionAsistencia = true;

            seccionAsistencia.classList.remove(
                "oculto"
            );

            seccionAsistenciaGuardada.classList.add(
                "oculto"
            );

            estadoAsistencia.textContent =
                "Editando";

            estadoAsistencia.classList.remove(
                "guardada"
            );

            estadoAsistencia.classList.add(
                "pendiente"
            );

            btnGuardarAsistencia.textContent =
                "Actualizar pase de lista";

            window.scrollTo({
                top: seccionAsistencia.offsetTop - 80,
                behavior: "smooth"
            });

        }
    );


    btnIrCedula.addEventListener(
        "click",
        () => {

            if (
                !partido ||
                !asistenciaGuardada
            ) {
                return;
            }

            window.location.href =
                `cedulaArbitro.html?id=${partido.id}`;

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !modalConfirmarAsistencia.classList.contains("oculto")
            ) {

                cerrarConfirmacion();

            }

        }
    );

}


async function iniciarPagina() {

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


    try {

        const referenciaPartido =
            doc(
                db,
                "partidos",
                partidoId
            );


        const snapshotPartido =
            await getDoc(
                referenciaPartido
            );


        if (!snapshotPartido.exists()) {

            mostrarError(
                "El partido solicitado no existe."
            );

            return;

        }


        partido = {
            id: snapshotPartido.id,
            ...snapshotPartido.data()
        };


        if (!tienePermisoPartido()) {

            mostrarError(
                "Este partido no está asignado a tu cuenta de árbitro."
            );

            return;

        }


        await cargarEquipos();

        await cargarJugadores();

        await cargarAsistenciaExistente();

        cargarInformacionPartido();

        renderizarJugadoresLocal();
        renderizarJugadoresVisitante();

        actualizarResumenAsistencia();
        actualizarEstadoCedula();

        estadoCarga.classList.add(
            "oculto"
        );

        contenidoPartido.classList.remove(
            "oculto"
        );

    } catch (error) {

        console.error(
            "Error abriendo partido:",
            error
        );


        mostrarError(
            "Ocurrió un problema al cargar la información del encuentro."
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
        partido.arbitroId === usuarioActual.uid ||
        partido.arbitroId === usuarioActual.id
    );

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


    if (snapshotLocal.exists()) {

        equipoLocalData = {
            id: snapshotLocal.id,
            ...snapshotLocal.data()
        };

    }


    if (snapshotVisitante.exists()) {

        equipoVisitanteData = {
            id: snapshotVisitante.id,
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
                id: documento.id,
                ...documento.data()
            })
        );


    jugadoresLocal =
        todos
            .filter(
                jugador =>
                    jugador.equipoId === partido.localId &&
                    jugador.activo !== false
            )
            .sort(
                ordenarJugadores
            );


    jugadoresVisitante =
        todos
            .filter(
                jugador =>
                    jugador.equipoId === partido.visitanteId &&
                    jugador.activo !== false
            )
            .sort(
                ordenarJugadores
            );

}


async function cargarAsistenciaExistente() {

    const referencia =
        doc(
            db,
            "asistenciasPartidos",
            partido.id
        );


    const snapshot =
        await getDoc(
            referencia
        );


    if (!snapshot.exists()) {

        asistenciaGuardada =
            partido.asistenciaRegistrada === true;

        return;

    }


    const datos =
        snapshot.data();


    presentesLocal =
        new Set(
            Array.isArray(datos.presentesLocal)
                ? datos.presentesLocal
                : []
        );


    presentesVisitante =
        new Set(
            Array.isArray(datos.presentesVisitante)
                ? datos.presentesVisitante
                : []
        );


    asistenciaGuardada =
        true;


    mostrarAsistenciaGuardada(
        datos
    );

}


function cargarInformacionPartido() {

    heroCategoria.textContent =
        partido.categoriaNombre ||
        "Sin categoría";


    heroJornada.textContent =
        partido.jornadaNombre ||
        "Sin jornada";


    nombreLocal.textContent =
        partido.localNombre ||
        "Equipo local";


    nombreVisitante.textContent =
        partido.visitanteNombre ||
        "Equipo visitante";


    asistenciaNombreLocal.textContent =
        partido.localNombre ||
        "Equipo local";


    asistenciaNombreVisitante.textContent =
        partido.visitanteNombre ||
        "Equipo visitante";


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


    datoFecha.textContent =
        formatearFecha(
            partido.fecha
        );


    datoHora.textContent =
        formatearHora(
            partido.hora
        );


    datoCampo.textContent =
        partido.campo ||
        "Sin definir";


    datoCategoria.textContent =
        partido.categoriaNombre ||
        "Sin categoría";


    datoJornada.textContent =
        partido.jornadaNombre ||
        "Sin jornada";


    datoArbitro.textContent =
        partido.arbitroNombre ||
        usuarioActual.nombre ||
        "Árbitro";


    estadoPartidoTop.textContent =
        textoEstadoPartido(
            partido.estado
        );


    estadoPartidoTop.className =
        `estado-top ${partido.estado || "proximo"}`;


    cargarLogo(
        logoLocal,
        equipoLocalData,
        partido.localNombre,
        "L"
    );


    cargarLogo(
        logoVisitante,
        equipoVisitanteData,
        partido.visitanteNombre,
        "V"
    );


    cargarLogo(
        asistenciaLogoLocal,
        equipoLocalData,
        partido.localNombre,
        "L"
    );


    cargarLogo(
        asistenciaLogoVisitante,
        equipoVisitanteData,
        partido.visitanteNombre,
        "V"
    );

}


function renderizarJugadoresLocal() {

    renderizarJugadores(
        jugadoresLocal,
        presentesLocal,
        listaJugadoresLocal,
        "local"
    );

}


function renderizarJugadoresVisitante() {

    renderizarJugadores(
        jugadoresVisitante,
        presentesVisitante,
        listaJugadoresVisitante,
        "visitante"
    );

}


function renderizarJugadores(
    jugadores,
    presentes,
    contenedor,
    equipo
) {

    contenedor.innerHTML =
        "";


    if (!jugadores.length) {

        contenedor.innerHTML = `
            <div class="sin-jugadores">
                Este equipo todavía no tiene jugadores registrados.
            </div>
        `;

        return;

    }


    jugadores.forEach(
        jugador => {

            const habilitado =
                puedeJugar(
                    jugador
                );


            const presente =
                presentes.has(
                    jugador.id
                );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                `jugador-item ${presente ? "presente" : ""}`;


            if (!habilitado) {

                item.style.opacity =
                    ".55";

                item.style.cursor =
                    "not-allowed";

            }


            const foto =
                jugador.fotoUrl
                    ? `
                        <img
                            src="${escaparHTML(jugador.fotoUrl)}"
                            alt="${escaparHTML(jugador.nombre || "Jugador")}"
                        >
                    `
                    : escaparHTML(
                        obtenerInicial(
                            jugador.nombre ||
                            "J"
                        )
                    );


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "";


            let estadoTexto =
                numero
                    ? `#${numero}`
                    : "Jugador registrado";


            if (!habilitado) {

                estadoTexto =
                    motivoNoDisponible(
                        jugador
                    );

            }


            item.innerHTML = `

                <div class="jugador-foto">
                    ${foto}
                </div>


                <div class="jugador-info">

                    <strong>
                        ${escaparHTML(
                            jugador.nombre ||
                            jugador.nombreCompleto ||
                            "Jugador"
                        )}
                    </strong>

                    <span>
                        ${escaparHTML(
                            estadoTexto
                        )}
                    </span>

                </div>


                <div class="jugador-check">
                    ✓
                </div>

            `;


            if (habilitado) {

                item.addEventListener(
                    "click",
                    () => {

                        alternarJugador(
                            jugador.id,
                            equipo
                        );

                    }
                );

            }


            contenedor.appendChild(
                item
            );

        }
    );

}


function alternarJugador(
    jugadorId,
    equipo
) {

    const coleccion =
        equipo === "local"
            ? presentesLocal
            : presentesVisitante;


    if (
        coleccion.has(
            jugadorId
        )
    ) {

        coleccion.delete(
            jugadorId
        );

    } else {

        coleccion.add(
            jugadorId
        );

    }


    if (
        equipo === "local"
    ) {

        renderizarJugadoresLocal();

    } else {

        renderizarJugadoresVisitante();

    }


    actualizarResumenAsistencia();

}


function puedeJugar(jugador) {

    if (
        jugador.activo === false
    ) {
        return false;
    }


    if (
        jugador.suspendido === true
    ) {
        return false;
    }


    if (
        Number(
            jugador.partidosSuspensionPendientes || 0
        ) > 0
    ) {
        return false;
    }


    return true;

}


function motivoNoDisponible(jugador) {

    if (
        jugador.suspendido === true ||
        Number(
            jugador.partidosSuspensionPendientes || 0
        ) > 0
    ) {

        return "Suspendido";

    }


    if (
        jugador.activo === false
    ) {

        return "Jugador inactivo";

    }


    return "No disponible";

}


function actualizarResumenAsistencia() {

    const local =
        presentesLocal.size;


    const visitante =
        presentesVisitante.size;


    const total =
        local + visitante;


    contadorLocal.textContent =
        local;


    contadorVisitante.textContent =
        visitante;


    resumenPresentesLocal.textContent =
        `${local} ${local === 1 ? "jugador" : "jugadores"}`;


    resumenPresentesVisitante.textContent =
        `${visitante} ${visitante === 1 ? "jugador" : "jugadores"}`;


    resumenPresentesTotal.textContent =
        `${total} ${total === 1 ? "jugador" : "jugadores"}`;

}


function abrirConfirmacionAsistencia() {

    const local =
        presentesLocal.size;


    const visitante =
        presentesVisitante.size;


    const total =
        local + visitante;


    if (
        local === 0 ||
        visitante === 0
    ) {

        mostrarToast(
            "error",
            "Pase de lista incompleto",
            "Debes registrar al menos un jugador presente de cada equipo."
        );

        return;

    }


    confirmarLocal.textContent =
        local;


    confirmarVisitante.textContent =
        visitante;


    confirmarTotal.textContent =
        total;


    modalConfirmarAsistencia.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarConfirmacion() {

    modalConfirmarAsistencia.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";

}


async function guardarAsistencia() {

    if (!partido) {
        return;
    }


    btnConfirmarAsistencia.disabled =
        true;


    btnConfirmarAsistencia.textContent =
        "Guardando...";


    try {

        const localIds =
            [...presentesLocal];


        const visitanteIds =
            [...presentesVisitante];


        const referenciaAsistencia =
            doc(
                db,
                "asistenciasPartidos",
                partido.id
            );


        await setDoc(
            referenciaAsistencia,
            {
                partidoId:
                    partido.id,

                categoriaId:
                    partido.categoriaId || null,

                jornadaId:
                    partido.jornadaId || null,

                localId:
                    partido.localId,

                visitanteId:
                    partido.visitanteId,

                arbitroId:
                    partido.arbitroId,

                arbitroNombre:
                    partido.arbitroNombre ||
                    usuarioActual.nombre ||
                    "",

                presentesLocal:
                    localIds,

                presentesVisitante:
                    visitanteIds,

                totalPresentesLocal:
                    localIds.length,

                totalPresentesVisitante:
                    visitanteIds.length,

                totalPresentes:
                    localIds.length +
                    visitanteIds.length,

                actualizadoEn:
                    serverTimestamp(),

                registradoEn:
                    serverTimestamp()
            },
            {
                merge: true
            }
        );


        await updateDoc(
            doc(
                db,
                "partidos",
                partido.id
            ),
            {
                asistenciaRegistrada:
                    true,

                asistenciaActualizadaEn:
                    serverTimestamp()
            }
        );


        partido.asistenciaRegistrada =
            true;


        asistenciaGuardada =
            true;


        edicionAsistencia =
            false;


        cerrarConfirmacion();


        mostrarAsistenciaGuardada({
            totalPresentesLocal:
                localIds.length,

            totalPresentesVisitante:
                visitanteIds.length
        });


        actualizarEstadoCedula();


        mostrarToast(
            "exito",
            "Asistencia guardada",
            "El pase de lista quedó registrado correctamente."
        );

    } catch (error) {

        console.error(
            "Error guardando asistencia:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al registrar la asistencia."
        );

    } finally {

        btnConfirmarAsistencia.disabled =
            false;


        btnConfirmarAsistencia.textContent =
            "Confirmar y guardar";

    }

}


function mostrarAsistenciaGuardada(datos = {}) {

    asistenciaGuardada =
        true;


    estadoAsistencia.textContent =
        "Guardada";


    estadoAsistencia.classList.remove(
        "pendiente"
    );


    estadoAsistencia.classList.add(
        "guardada"
    );


    seccionAsistencia.classList.add(
        "oculto"
    );


    seccionAsistenciaGuardada.classList.remove(
        "oculto"
    );


    const local =
        Number(
            datos.totalPresentesLocal ??
            presentesLocal.size
        );


    const visitante =
        Number(
            datos.totalPresentesVisitante ??
            presentesVisitante.size
        );


    textoAsistenciaGuardada.textContent =
        `${local} jugadores del local y ${visitante} del visitante quedaron registrados.`;


    btnGuardarAsistencia.textContent =
        "Actualizar pase de lista";


    btnIrCedula.disabled =
        false;


    textoAccionCedula.textContent =
        "El pase de lista está completo. Ya puedes continuar con la cédula oficial.";

}


function actualizarEstadoCedula() {

    const cedulaRegistrada =
        partido.cedulaCreada === true ||
        partido.resultadoRegistrado === true;


    if (cedulaRegistrada) {

        estadoCedulaIcono.textContent =
            "✓";


        estadoCedulaTitulo.textContent =
            "Cédula registrada";


        estadoCedulaTexto.textContent =
            "La información oficial de este partido ya fue enviada.";


        estadoCedulaBadge.textContent =
            "Registrada";


        estadoCedulaBadge.className =
            "estado-cedula-badge registrada";


        btnIrCedula.disabled =
            false;


        btnIrCedula.querySelector(
            "strong"
        ).textContent =
            "Ver cédula";


        textoAccionCedula.textContent =
            "La cédula ya fue registrada. Puedes consultarla desde aquí.";

        return;

    }


    estadoCedulaIcono.textContent =
        "📋";


    estadoCedulaTitulo.textContent =
        "Pendiente";


    estadoCedulaBadge.textContent =
        "Pendiente";


    estadoCedulaBadge.className =
        "estado-cedula-badge pendiente";


    if (asistenciaGuardada) {

        estadoCedulaTexto.textContent =
            "El pase de lista está completo. Ya puedes llenar la cédula.";


        btnIrCedula.disabled =
            false;


        textoAccionCedula.textContent =
            "El pase de lista está completo. Ya puedes continuar con la cédula oficial.";

    } else {

        estadoCedulaTexto.textContent =
            "Primero registra la asistencia de los jugadores.";


        btnIrCedula.disabled =
            true;


        textoAccionCedula.textContent =
            "Guarda primero el pase de lista para continuar.";

    }

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


function ordenarJugadores(a, b) {

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
        numeroA !== numeroB
    ) {

        return numeroA - numeroB;

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


function mostrarError(texto) {

    estadoCarga.classList.add(
        "oculto"
    );


    contenidoPartido.classList.add(
        "oculto"
    );


    estadoErrorTexto.textContent =
        texto;


    estadoError.classList.remove(
        "oculto"
    );

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


function obtenerInicial(nombre) {

    const texto =
        String(nombre || "")
            .trim();


    if (!texto) {
        return "J";
    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function escaparHTML(texto) {

    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");

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