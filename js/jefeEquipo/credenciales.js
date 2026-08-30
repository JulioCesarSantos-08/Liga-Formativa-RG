import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";


const estadoCarga =
    document.getElementById("estadoCarga");

const estadoError =
    document.getElementById("estadoError");

const estadoErrorTexto =
    document.getElementById("estadoErrorTexto");

const contenidoCredenciales =
    document.getElementById("contenidoCredenciales");

const btnVolver =
    document.getElementById("btnVolver");

const btnImprimirTop =
    document.getElementById("btnImprimirTop");

const btnImprimir =
    document.getElementById("btnImprimir");

const filtroJugadores =
    document.getElementById("filtroJugadores");

const equipoLogo =
    document.getElementById("equipoLogo");

const equipoNombre =
    document.getElementById("equipoNombre");

const equipoCategoria =
    document.getElementById("equipoCategoria");

const totalCredenciales =
    document.getElementById("totalCredenciales");

const sinJugadores =
    document.getElementById("sinJugadores");

const hojasCredenciales =
    document.getElementById("hojasCredenciales");

const plantillaCredencial =
    document.getElementById("plantillaCredencial");

const toast =
    document.getElementById("toast");

const toastIcono =
    document.getElementById("toastIcono");

const toastTitulo =
    document.getElementById("toastTitulo");

const toastTexto =
    document.getElementById("toastTexto");


let usuarioActual = null;

let equipoActual = null;

let jugadores = [];

let firmaLigaUrl = null;

let toastTimer = null;


const CREDENCIALES_POR_HOJA = 10;


const usuario =
    await protegerPagina([
        "jefeEquipo",
        "admin"
    ]);


if (usuario) {

    usuarioActual = usuario;

    activarEventos();

    await iniciar();

}


function activarEventos() {

    btnImprimir.addEventListener(
        "click",
        imprimirCredenciales
    );


    btnImprimirTop.addEventListener(
        "click",
        imprimirCredenciales
    );


    filtroJugadores.addEventListener(
        "change",
        renderizarCredenciales
    );

}


async function iniciar() {

    try {

        const equipoId =
            obtenerEquipoId();


        if (!equipoId) {

            throw new Error(
                "No se recibió el identificador del equipo."
            );

        }


        await cargarEquipo(
            equipoId
        );


        if (!equipoActual) {

            throw new Error(
                "El equipo solicitado no existe."
            );

        }


        validarAccesoEquipo();


        await Promise.all([
            cargarJugadores(),
            cargarConfiguracionLiga()
        ]);


        configurarBotonVolver();

        cargarDatosEquipo();

        renderizarCredenciales();


        estadoCarga.classList.add(
            "oculto"
        );


        contenidoCredenciales.classList.remove(
            "oculto"
        );

    } catch (error) {

        console.error(
            "Error cargando credenciales:",
            error
        );


        mostrarError(
            error.message ||
            "No fue posible cargar la información."
        );

    }

}


function obtenerEquipoId() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    return parametros.get(
        "equipo"
    );

}


async function cargarEquipo(
    equipoId
) {

    const referencia =
        doc(
            db,
            "equipos",
            equipoId
        );


    const snapshot =
        await getDoc(
            referencia
        );


    if (!snapshot.exists()) {

        equipoActual = null;

        return;

    }


    equipoActual = {
        id: snapshot.id,
        ...snapshot.data()
    };

}


function validarAccesoEquipo() {

    if (
        usuarioActual.rol === "admin"
    ) {

        return;

    }


    const responsableId =
        equipoActual.responsableId;


    const usuarioId =
        usuarioActual.uid ||
        usuarioActual.id;


    if (
        !responsableId ||
        responsableId !== usuarioId
    ) {

        throw new Error(
            "No tienes permiso para generar credenciales de este equipo."
        );

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


    jugadores =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            )
            .filter(
                jugador =>
                    jugador.equipoId ===
                    equipoActual.id
            )
            .sort(
                ordenarJugadores
            );

}


async function cargarConfiguracionLiga() {

    firmaLigaUrl =
        null;


    const rutasPosibles = [
        ["configuracion", "liga"],
        ["configuracion", "general"],
        ["ajustes", "liga"]
    ];


    for (
        const [coleccion, documento]
        of rutasPosibles
    ) {

        try {

            const snapshot =
                await getDoc(
                    doc(
                        db,
                        coleccion,
                        documento
                    )
                );


            if (!snapshot.exists()) {

                continue;

            }


            const datos =
                snapshot.data();


            const firma =
                datos.firmaUrl ||
                datos.firmaElectronicaUrl ||
                datos.firmaPresidenteUrl ||
                null;


            if (firma) {

                firmaLigaUrl =
                    firma;

                break;

            }

        } catch (error) {

            console.warn(
                `No se pudo consultar ${coleccion}/${documento}:`,
                error
            );

        }

    }

}


function configurarBotonVolver() {

    if (
        usuarioActual.rol === "admin"
    ) {

        btnVolver.href =
            `jefeEquipo.html?equipo=${encodeURIComponent(
                equipoActual.id
            )}`;

        return;

    }


    btnVolver.href =
        "jefeEquipo.html";

}


function cargarDatosEquipo() {

    equipoNombre.textContent =
        equipoActual.nombre ||
        "Equipo";


    equipoCategoria.textContent =
        equipoActual.categoriaNombre ||
        "Sin categoría";


    if (
        equipoActual.logoUrl
    ) {

        equipoLogo.innerHTML = "";


        const imagen =
            document.createElement(
                "img"
            );


        imagen.src =
            equipoActual.logoUrl;


        imagen.alt =
            equipoActual.nombre ||
            "Escudo del equipo";


        imagen.addEventListener(
            "error",
            () => {

                equipoLogo.innerHTML =
                    "";


                equipoLogo.textContent =
                    obtenerInicial(
                        equipoActual.nombre ||
                        "E"
                    );

            }
        );


        equipoLogo.appendChild(
            imagen
        );

    } else {

        equipoLogo.textContent =
            obtenerInicial(
                equipoActual.nombre ||
                "E"
            );

    }

}


function obtenerJugadoresFiltrados() {

    const filtro =
        filtroJugadores.value;


    if (
        filtro === "activos"
    ) {

        return jugadores.filter(
            jugador =>
                jugador.activo !== false &&
                jugador.suspendido !== true &&
                Number(
                    jugador.partidosSuspensionPendientes || 0
                ) <= 0
        );

    }


    if (
        filtro === "sinCredencial"
    ) {

        return jugadores.filter(
            jugador =>
                jugador.credencialGenerada !== true
        );

    }


    return [
        ...jugadores
    ];

}


function renderizarCredenciales() {

    hojasCredenciales.innerHTML =
        "";


    const lista =
        obtenerJugadoresFiltrados();


    totalCredenciales.textContent =
        lista.length;


    if (!lista.length) {

        sinJugadores.classList.remove(
            "oculto"
        );


        btnImprimir.disabled =
            true;


        btnImprimirTop.disabled =
            true;


        return;

    }


    sinJugadores.classList.add(
        "oculto"
    );


    btnImprimir.disabled =
        false;


    btnImprimirTop.disabled =
        false;


    const grupos =
        dividirEnGrupos(
            lista,
            CREDENCIALES_POR_HOJA
        );


    grupos.forEach(
        grupo => {

            const hoja =
                document.createElement(
                    "section"
                );


            hoja.className =
                "hoja-credenciales";


            grupo.forEach(
                jugador => {

                    const credencial =
                        crearCredencial(
                            jugador
                        );


                    hoja.appendChild(
                        credencial
                    );

                }
            );


            hojasCredenciales.appendChild(
                hoja
            );

        }
    );

}


function crearCredencial(
    jugador
) {

    const plantilla =
        plantillaCredencial.querySelector(
            ".credencial"
        );


    const credencial =
        plantilla.cloneNode(
            true
        );


    const nombre =
        jugador.nombre ||
        jugador.nombreCompleto ||
        "Jugador";


    const numero =
        jugador.numero ??
        jugador.dorsal ??
        "-";


    const edad =
        calcularEdad(
            jugador.fechaNacimiento
        );


    const folio =
        obtenerFolioJugador(
            jugador
        );


    credencial.querySelector(
        ".credencial-nombre"
    ).textContent =
        nombre;


    credencial.querySelector(
        ".credencial-equipo"
    ).textContent =
        equipoActual.nombre ||
        "Equipo";


    credencial.querySelector(
        ".credencial-categoria"
    ).textContent =
        equipoActual.categoriaNombre ||
        jugador.categoriaNombre ||
        "Sin categoría";


    credencial.querySelector(
        ".credencial-dorsal"
    ).textContent =
        numero;


    credencial.querySelector(
        ".credencial-edad"
    ).textContent =
        edad !== null
            ? `${edad} años`
            : "-";


    credencial.querySelector(
        ".credencial-curp-texto"
    ).textContent =
        jugador.curp ||
        "SIN CURP";


    credencial.querySelector(
        ".credencial-folio-texto"
    ).textContent =
        folio;


    cargarFotoJugador(
        credencial,
        jugador,
        nombre
    );


    cargarEscudoEquipo(
        credencial
    );


    cargarFirmaLiga(
        credencial
    );


    return credencial;

}


function cargarFotoJugador(
    credencial,
    jugador,
    nombre
) {

    const imagen =
        credencial.querySelector(
            ".credencial-foto-img"
        );


    const inicial =
        credencial.querySelector(
            ".credencial-foto-inicial"
        );


    if (
        !jugador.fotoUrl
    ) {

        inicial.textContent =
            obtenerInicial(
                nombre
            );

        return;

    }


    imagen.src =
        jugador.fotoUrl;


    imagen.alt =
        nombre;


    imagen.classList.remove(
        "oculto"
    );


    inicial.classList.add(
        "oculto"
    );


    imagen.addEventListener(
        "error",
        () => {

            imagen.classList.add(
                "oculto"
            );


            inicial.classList.remove(
                "oculto"
            );


            inicial.textContent =
                obtenerInicial(
                    nombre
                );

        }
    );

}


function cargarEscudoEquipo(
    credencial
) {

    const imagen =
        credencial.querySelector(
            ".credencial-equipo-img"
        );


    const inicial =
        credencial.querySelector(
            ".credencial-equipo-inicial"
        );


    if (
        !equipoActual.logoUrl
    ) {

        inicial.textContent =
            obtenerInicial(
                equipoActual.nombre ||
                "E"
            );

        return;

    }


    imagen.src =
        equipoActual.logoUrl;


    imagen.alt =
        equipoActual.nombre ||
        "Equipo";


    imagen.classList.remove(
        "oculto"
    );


    inicial.classList.add(
        "oculto"
    );


    imagen.addEventListener(
        "error",
        () => {

            imagen.classList.add(
                "oculto"
            );


            inicial.classList.remove(
                "oculto"
            );


            inicial.textContent =
                obtenerInicial(
                    equipoActual.nombre ||
                    "E"
                );

        }
    );

}


function cargarFirmaLiga(
    credencial
) {

    const imagen =
        credencial.querySelector(
            ".firma-img"
        );


    const placeholder =
        credencial.querySelector(
            ".firma-placeholder"
        );


    if (!firmaLigaUrl) {

        placeholder.classList.remove(
            "oculto"
        );

        return;

    }


    imagen.src =
        firmaLigaUrl;


    imagen.classList.remove(
        "oculto"
    );


    placeholder.classList.add(
        "oculto"
    );


    imagen.addEventListener(
        "error",
        () => {

            imagen.classList.add(
                "oculto"
            );


            placeholder.classList.remove(
                "oculto"
            );

        }
    );

}


async function imprimirCredenciales() {

    const lista =
        obtenerJugadoresFiltrados();


    if (!lista.length) {

        mostrarToast(
            "error",
            "Sin credenciales",
            "No hay jugadores disponibles para imprimir."
        );

        return;

    }


    btnImprimir.disabled =
        true;


    btnImprimirTop.disabled =
        true;


    const textoOriginal =
        btnImprimir.innerHTML;


    btnImprimir.textContent =
        "Preparando impresión...";


    try {

        await esperarImagenes();


        setTimeout(
            () => {

                window.print();

            },
            150
        );


        await marcarCredencialesGeneradas(
            lista
        );

    } catch (error) {

        console.error(
            "Error preparando impresión:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo imprimir",
            "Ocurrió un problema al preparar las credenciales."
        );

    } finally {

        btnImprimir.disabled =
            false;


        btnImprimirTop.disabled =
            false;


        btnImprimir.innerHTML =
            textoOriginal;

    }

}


async function marcarCredencialesGeneradas(
    lista
) {

    const actualizaciones =
        lista
            .filter(
                jugador =>
                    jugador.credencialGenerada !== true
            )
            .map(
                jugador =>
                    updateDoc(
                        doc(
                            db,
                            "jugadores",
                            jugador.id
                        ),
                        {
                            credencialGenerada:
                                true,

                            credencialGeneradaEn:
                                serverTimestamp()
                        }
                    )
            );


    if (!actualizaciones.length) {

        return;

    }


    try {

        await Promise.all(
            actualizaciones
        );


        lista.forEach(
            jugador => {

                jugador.credencialGenerada =
                    true;

            }
        );

    } catch (error) {

        console.warn(
            "No se pudo actualizar el estado de algunas credenciales:",
            error
        );

    }

}


async function esperarImagenes() {

    const imagenes =
        Array.from(
            hojasCredenciales.querySelectorAll(
                "img:not(.oculto)"
            )
        );


    const pendientes =
        imagenes
            .filter(
                imagen =>
                    !imagen.complete
            )
            .map(
                imagen =>
                    new Promise(
                        resolve => {

                            const finalizar =
                                () => {

                                    resolve();

                                };


                            imagen.addEventListener(
                                "load",
                                finalizar,
                                {
                                    once: true
                                }
                            );


                            imagen.addEventListener(
                                "error",
                                finalizar,
                                {
                                    once: true
                                }
                            );


                            setTimeout(
                                finalizar,
                                4000
                            );

                        }
                    )
            );


    await Promise.all(
        pendientes
    );

}


function obtenerFolioJugador(
    jugador
) {

    if (
        jugador.folioCredencial
    ) {

        return jugador.folioCredencial;

    }


    const equipo =
        String(
            equipoActual.nombre ||
            "EQ"
        )
            .replace(
                /[^a-zA-Z0-9]/g,
                ""
            )
            .slice(
                0,
                3
            )
            .toUpperCase();


    const jugadorId =
        String(
            jugador.id ||
            ""
        )
            .replace(
                /[^a-zA-Z0-9]/g,
                ""
            )
            .slice(
                -6
            )
            .toUpperCase();


    return `${equipo}-${jugadorId}`;

}


function calcularEdad(
    fecha
) {

    if (!fecha) {

        return null;

    }


    const nacimiento =
        new Date(
            `${fecha}T00:00:00`
        );


    if (
        Number.isNaN(
            nacimiento.getTime()
        )
    ) {

        return null;

    }


    const hoy =
        new Date();


    let edad =
        hoy.getFullYear() -
        nacimiento.getFullYear();


    const diferenciaMes =
        hoy.getMonth() -
        nacimiento.getMonth();


    if (
        diferenciaMes < 0 ||
        (
            diferenciaMes === 0 &&
            hoy.getDate() <
            nacimiento.getDate()
        )
    ) {

        edad--;

    }


    return Math.max(
        edad,
        0
    );

}


function ordenarJugadores(
    a,
    b
) {

    const numeroA =
        obtenerNumeroOrden(
            a
        );


    const numeroB =
        obtenerNumeroOrden(
            b
        );


    if (
        numeroA !== numeroB
    ) {

        return numeroA -
            numeroB;

    }


    const nombreA =
        a.nombre ||
        a.nombreCompleto ||
        "";


    const nombreB =
        b.nombre ||
        b.nombreCompleto ||
        "";


    return nombreA.localeCompare(
        nombreB,
        "es"
    );

}


function obtenerNumeroOrden(
    jugador
) {

    const valor =
        jugador.numero ??
        jugador.dorsal;


    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return 999;

    }


    const numero =
        Number(
            valor
        );


    return Number.isFinite(
        numero
    )
        ? numero
        : 999;

}


function dividirEnGrupos(
    arreglo,
    cantidad
) {

    const grupos =
        [];


    for (
        let i = 0;
        i < arreglo.length;
        i += cantidad
    ) {

        grupos.push(
            arreglo.slice(
                i,
                i + cantidad
            )
        );

    }


    return grupos;

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

        return "J";

    }


    return valor
        .charAt(0)
        .toUpperCase();

}


function mostrarError(
    mensaje
) {

    estadoCarga.classList.add(
        "oculto"
    );


    contenidoCredenciales.classList.add(
        "oculto"
    );


    estadoErrorTexto.textContent =
        mensaje;


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


    toastTitulo.textContent =
        titulo;


    toastTexto.textContent =
        texto;


    if (
        tipo === "error"
    ) {

        toastIcono.textContent =
            "!";


        toast.style.background =
            "#fff3f2";


        toast.style.borderColor =
            "#f1cbc7";


        toastIcono.style.background =
            "#fee4e2";


        toastIcono.style.color =
            "#b42318";

    } else {

        toastIcono.textContent =
            "✓";


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