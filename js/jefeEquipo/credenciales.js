import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    setDoc,
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

let temporadaActual = null;

let toastTimer = null;

let promesaLibreriaQr = null;


const CREDENCIALES_POR_HOJA = 9;

const URL_BASE =
    "https://liga-formativa-rg.vercel.app";


const usuario =
    await protegerPagina([
        "jefeEquipo",
        "admin"
    ]);


if (usuario) {

    usuarioActual =
        usuario;

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
            cargarTemporadaActual(),
            cargarLibreriaQr()
        ]);


        await prepararCredencialesPublicas();


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


        if (
            error &&
            error.message &&
            error.message.includes("QR")
        ) {

            try {

                configurarBotonVolver();

                cargarDatosEquipo();

                renderizarCredenciales();

                estadoCarga.classList.add(
                    "oculto"
                );

                contenidoCredenciales.classList.remove(
                    "oculto"
                );

                mostrarToast(
                    "error",
                    "QR no disponible",
                    "Las credenciales se cargaron, pero el generador QR no pudo iniciarse."
                );

                return;

            } catch (errorSecundario) {

                console.error(
                    "Error cargando la interfaz:",
                    errorSecundario
                );

            }

        }


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

        equipoActual =
            null;

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


async function cargarTemporadaActual() {

    temporadaActual =
        null;


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "temporadas"
                )
            );


        const temporadas =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        temporadaActual =
            temporadas.find(
                temporada =>
                    temporada.activa === true ||
                    normalizarTexto(
                        temporada.estado
                    ) === "activa"
            ) ||
            temporadas.find(
                temporada =>
                    normalizarTexto(
                        temporada.estado
                    ) === "proxima"
            ) ||
            null;

    } catch (error) {

        console.warn(
            "No se pudo obtener la temporada actual:",
            error
        );

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


    const logo =
        obtenerLogoEquipo();


    if (logo) {

        equipoLogo.innerHTML =
            "";


        const imagen =
            document.createElement(
                "img"
            );


        imagen.src =
            logo;


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
        obtenerNombreJugador(
            jugador
        );


    const numero =
        jugador.numero ??
        jugador.dorsal ??
        "-";


    const categoria =
        equipoActual.categoriaNombre ||
        jugador.categoriaNombre ||
        "Sin categoría";


    const folio =
        obtenerFolioJugador(
            jugador
        );


    const temporada =
        obtenerNombreTemporada();


    credencial.dataset.jugadorId =
        jugador.id;


    const nombreElemento =
        credencial.querySelector(
            ".credencial-nombre"
        );


    const equipoElemento =
        credencial.querySelector(
            ".credencial-equipo"
        );


    const categoriaElemento =
        credencial.querySelector(
            ".credencial-categoria"
        );


    const dorsalElemento =
        credencial.querySelector(
            ".credencial-dorsal"
        );


    const folioElemento =
        credencial.querySelector(
            ".credencial-folio-texto"
        );


    const temporadaElemento =
        credencial.querySelector(
            ".credencial-temporada"
        );


    if (nombreElemento) {

        nombreElemento.textContent =
            nombre;

    }


    if (equipoElemento) {

        equipoElemento.textContent =
            equipoActual.nombre ||
            "Equipo";

    }


    if (categoriaElemento) {

        categoriaElemento.textContent =
            categoria;

    }


    if (dorsalElemento) {

        dorsalElemento.textContent =
            numero;

    }


    if (folioElemento) {

        folioElemento.textContent =
            folio;

    }


    if (temporadaElemento) {

        temporadaElemento.textContent =
            temporada;

    }


    cargarFotoJugador(
        credencial,
        jugador,
        nombre
    );


    generarQrJugador(
        credencial,
        jugador
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
        !imagen ||
        !inicial
    ) {

        return;

    }


    const foto =
        jugador.fotoUrl ||
        jugador.fotoURL ||
        jugador.foto ||
        jugador.imagenUrl ||
        jugador.imagen ||
        "";


    if (!foto) {

        inicial.textContent =
            obtenerInicial(
                nombre
            );

        return;

    }


    imagen.src =
        foto;


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


async function generarQrJugador(
    credencial,
    jugador
) {

    const canvas =
        credencial.querySelector(
            ".credencial-qr-canvas"
        );


    if (!canvas) {

        return;

    }


    const url =
        obtenerUrlVerificacion(
            jugador
        );


    try {

        await cargarLibreriaQr();


        if (
            !window.QRCode ||
            typeof window.QRCode.toCanvas !== "function"
        ) {

            throw new Error(
                "El generador QR no está disponible."
            );

        }


        await new Promise(
            (resolve, reject) => {

                window.QRCode.toCanvas(
                    canvas,
                    url,
                    {
                        width: 220,
                        margin: 2,
                        errorCorrectionLevel: "H",
                        color: {
                            dark: "#000000",
                            light: "#ffffff"
                        }
                    },
                    error => {

                        if (error) {

                            reject(
                                error
                            );

                            return;

                        }


                        canvas.dataset.qrListo =
                            "true";


                        resolve();

                    }
                );

            }
        );

    } catch (error) {

        console.error(
            "Error generando QR del jugador:",
            jugador.id,
            error
        );


        canvas.dataset.qrError =
            "true";


        mostrarQrNoDisponible(
            canvas
        );

    }

}


function cargarLibreriaQr() {

    if (
        window.QRCode &&
        typeof window.QRCode.toCanvas === "function"
    ) {

        return Promise.resolve();

    }


    if (promesaLibreriaQr) {

        return promesaLibreriaQr;

    }


    promesaLibreriaQr =
        new Promise(
            (resolve, reject) => {

                const scriptExistente =
                    document.querySelector(
                        'script[data-libreria-qr="true"]'
                    );


                if (scriptExistente) {

                    const comprobar =
                        () => {

                            if (
                                window.QRCode &&
                                typeof window.QRCode.toCanvas === "function"
                            ) {

                                resolve();

                            } else {

                                reject(
                                    new Error(
                                        "La librería QR cargó pero el generador no está disponible."
                                    )
                                );

                            }

                        };


                    if (
                        scriptExistente.dataset.cargado ===
                        "true"
                    ) {

                        comprobar();

                        return;

                    }


                    scriptExistente.addEventListener(
                        "load",
                        comprobar,
                        {
                            once: true
                        }
                    );


                    scriptExistente.addEventListener(
                        "error",
                        () => {

                            reject(
                                new Error(
                                    "No fue posible cargar la librería QR."
                                )
                            );

                        },
                        {
                            once: true
                        }
                    );


                    return;

                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "/js/libs/qrcode.min.js";


                script.async =
                    true;


                script.dataset.libreriaQr =
                    "true";


                script.onload =
                    () => {

                        script.dataset.cargado =
                            "true";


                        if (
                            window.QRCode &&
                            typeof window.QRCode.toCanvas === "function"
                        ) {

                            resolve();

                        } else {

                            reject(
                                new Error(
                                    "La librería QR no expuso el generador esperado."
                                )
                            );

                        }

                    };


                script.onerror =
                    () => {

                        promesaLibreriaQr =
                            null;


                        reject(
                            new Error(
                                "No fue posible cargar la librería QR."
                            )
                        );

                    };


                document.head.appendChild(
                    script
                );

            }
        );


    return promesaLibreriaQr;

}


function mostrarQrNoDisponible(
    canvas
) {

    const contexto =
        canvas.getContext(
            "2d"
        );


    if (!contexto) {

        return;

    }


    canvas.width =
        220;


    canvas.height =
        220;


    contexto.fillStyle =
        "#ffffff";


    contexto.fillRect(
        0,
        0,
        220,
        220
    );


    contexto.strokeStyle =
        "#102b28";


    contexto.lineWidth =
        5;


    contexto.strokeRect(
        8,
        8,
        204,
        204
    );


    contexto.fillStyle =
        "#102b28";


    contexto.font =
        "bold 18px Arial";


    contexto.textAlign =
        "center";


    contexto.textBaseline =
        "middle";


    contexto.fillText(
        "QR NO",
        110,
        96
    );


    contexto.fillText(
        "DISPONIBLE",
        110,
        124
    );

}


async function prepararCredencialesPublicas() {

    for (const jugador of jugadores) {

        let token =
            String(
                jugador.credencialToken ||
                ""
            ).trim();


        if (!token) {

            token =
                generarTokenCredencial();


            await updateDoc(
                doc(
                    db,
                    "jugadores",
                    jugador.id
                ),
                {
                    credencialToken: token,
                    credencialTokenCreadoEn: serverTimestamp()
                }
            );


            jugador.credencialToken =
                token;

        }


        await publicarCredencialJugador(
            jugador
        );

    }

}


async function publicarCredencialJugador(
    jugador
) {

    const token =
        String(
            jugador.credencialToken ||
            ""
        ).trim();


    if (!token) {

        throw new Error(
            "No fue posible crear el código de verificación de la credencial."
        );

    }


    const nombre =
        obtenerNombreJugador(
            jugador
        );


    const numero =
        jugador.numero ??
        jugador.dorsal ??
        jugador.numeroJugador ??
        "";


    const fotoUrl =
        jugador.fotoUrl ||
        jugador.fotoURL ||
        jugador.foto ||
        jugador.imagenUrl ||
        jugador.imagen ||
        "";


    const suspendido =
        jugador.suspendido === true ||
        Number(
            jugador.partidosSuspensionPendientes ||
            0
        ) > 0;


    const activo =
        jugador.activo !== false;


    await setDoc(
        doc(
            db,
            "credencialesPublicas",
            token
        ),
        {
            nombre,
            numero,
            equipoNombre:
                equipoActual.nombre ||
                "Equipo",
            categoriaNombre:
                equipoActual.categoriaNombre ||
                jugador.categoriaNombre ||
                "Sin categoría",
            fotoUrl,
            temporada:
                obtenerNombreTemporada(),
            folio:
                obtenerFolioJugador(
                    jugador
                ),
            activa:
                activo,
            suspendido,
            vigente:
                activo &&
                !suspendido,
            actualizadoEn:
                serverTimestamp()
        },
        {
            merge: true
        }
    );

}


function generarTokenCredencial() {

    const bytes =
        new Uint8Array(
            24
        );


    crypto.getRandomValues(
        bytes
    );


    return Array.from(
        bytes,
        byte =>
            byte
                .toString(16)
                .padStart(2, "0")
    ).join(
        ""
    );

}


function obtenerUrlVerificacion(
    jugador
) {

    const token =
        String(
            jugador.credencialToken ||
            ""
        ).trim();


    const url =
        new URL(
            "/verificarJugador.html",
            URL_BASE
        );


    url.searchParams.set(
        "v",
        token
    );


    return url.toString();

}


function obtenerNombreTemporada() {

    if (!temporadaActual) {

        return "TEMPORADA ACTUAL";

    }


    return temporadaActual.nombre ||
        temporadaActual.temporada ||
        temporadaActual.titulo ||
        "TEMPORADA ACTUAL";

}


function obtenerNombreJugador(
    jugador
) {

    if (
        jugador.nombreCompleto
    ) {

        return jugador.nombreCompleto;

    }


    const partes = [
        jugador.nombre,
        jugador.apellidoPaterno,
        jugador.apellidoMaterno
    ]
        .filter(Boolean)
        .map(
            valor =>
                String(valor).trim()
        )
        .filter(Boolean);


    if (partes.length) {

        return partes.join(
            " "
        );

    }


    return jugador.nombre ||
        "Jugador";

}


function obtenerLogoEquipo() {

    return equipoActual.logoUrl ||
        equipoActual.logoURL ||
        equipoActual.logo ||
        equipoActual.escudoUrl ||
        equipoActual.escudoURL ||
        equipoActual.escudo ||
        equipoActual.imagenUrl ||
        equipoActual.imagen ||
        "";

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


        await esperarQr();


        const qrConError =
            hojasCredenciales.querySelector(
                '.credencial-qr-canvas[data-qr-error="true"]'
            );


        if (qrConError) {

            throw new Error(
                "Uno o más códigos QR no pudieron generarse."
            );

        }


        setTimeout(
            () => {

                window.print();

            },
            180
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
            error.message ||
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
        lista.map(
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
                            serverTimestamp(),

                        credencialUrlVerificacion:
                            obtenerUrlVerificacion(
                                jugador
                            )
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


async function esperarQr() {

    const canvases =
        Array.from(
            hojasCredenciales.querySelectorAll(
                ".credencial-qr-canvas"
            )
        );


    if (!canvases.length) {

        return;

    }


    const inicio =
        Date.now();


    while (
        Date.now() - inicio <
        6000
    ) {

        const terminados =
            canvases.every(
                canvas =>
                    canvas.dataset.qrListo ===
                        "true" ||
                    canvas.dataset.qrError ===
                        "true"
            );


        if (terminados) {

            return;

        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    80
                )
        );

    }


    throw new Error(
        "Los códigos QR tardaron demasiado en generarse."
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
        obtenerNombreJugador(
            a
        );


    const nombreB =
        obtenerNombreJugador(
            b
        );


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


function normalizarTexto(
    valor
) {

    return String(
        valor ||
        ""
    )
        .trim()
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );

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