import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    protegerPagina
} from "../roles.js";


const estadoCarga =
    document.getElementById("estadoCarga");

const contenidoPrincipal =
    document.getElementById("contenidoPrincipal");

const btnVolver =
    document.getElementById("btnVolver");

const encabezadoLogoEquipo =
    document.getElementById("encabezadoLogoEquipo");

const encabezadoNombreEquipo =
    document.getElementById("encabezadoNombreEquipo");

const encabezadoCategoriaEquipo =
    document.getElementById("encabezadoCategoriaEquipo");

const contadorJugadores =
    document.getElementById("contadorJugadores");

const buscarJugador =
    document.getElementById("buscarJugador");

const listaJugadores =
    document.getElementById("listaJugadores");

const sinJugadores =
    document.getElementById("sinJugadores");

const panelCredencial =
    document.getElementById("panelCredencial");

const tituloJugadorSeleccionado =
    document.getElementById("tituloJugadorSeleccionado");

const estadoCredencial =
    document.getElementById("estadoCredencial");

const avisoDireccion =
    document.getElementById("avisoDireccion");

const btnRegistrarDireccion =
    document.getElementById("btnRegistrarDireccion");

const credencialFoto =
    document.getElementById("credencialFoto");

const credencialCategoria =
    document.getElementById("credencialCategoria");

const credencialNombre =
    document.getElementById("credencialNombre");

const credencialCurp =
    document.getElementById("credencialCurp");

const credencialDireccion =
    document.getElementById("credencialDireccion");

const credencialTemporada =
    document.getElementById("credencialTemporada");

const credencialQr =
    document.getElementById("credencialQr");

const btnCambiarJugador =
    document.getElementById("btnCambiarJugador");

const btnImprimirCredencial =
    document.getElementById("btnImprimirCredencial");

const modalDireccion =
    document.getElementById("modalDireccion");

const btnCerrarDireccion =
    document.getElementById("btnCerrarDireccion");

const btnCancelarDireccion =
    document.getElementById("btnCancelarDireccion");

const formDireccion =
    document.getElementById("formDireccion");

const direccionJugadorFoto =
    document.getElementById("direccionJugadorFoto");

const direccionJugadorNombre =
    document.getElementById("direccionJugadorNombre");

const direccionJugadorCurp =
    document.getElementById("direccionJugadorCurp");

const direccionJugador =
    document.getElementById("direccionJugador");

const btnGuardarDireccion =
    document.getElementById("btnGuardarDireccion");

const toast =
    document.getElementById("toast");

const toastIcono =
    document.getElementById("toastIcono");

const toastTitulo =
    document.getElementById("toastTitulo");

const toastTexto =
    document.getElementById("toastTexto");


let usuario = null;

let equipos = [];

let equipoActual = null;

let todosLosJugadores = [];

let jugadores = [];

let jugadorSeleccionado = null;

let temporadas = [];

let temporadaActual = null;

let libreriaQrLista = false;

let temporizadorToast = null;


iniciar();


async function iniciar() {

    try {

        usuario =
            await protegerPagina([
                "jefeEquipo",
                "admin"
            ]);

        await Promise.all([
            cargarEquipos(),
            cargarJugadores(),
            cargarTemporadas()
        ]);

        resolverEquipoActual();

        filtrarJugadoresEquipo();

        actualizarEncabezado();

        renderizarJugadores();

        activarEventos();

        await cargarLibreriaQr();

        estadoCarga?.classList.add(
            "oculto"
        );

        contenidoPrincipal?.classList.remove(
            "oculto"
        );

    } catch (error) {

        console.error(error);

        estadoCarga?.classList.add(
            "oculto"
        );

        contenidoPrincipal?.classList.remove(
            "oculto"
        );

        mostrarToast(
            "error",
            "No pudimos cargar el módulo",
            "Actualiza la página e inténtalo nuevamente."
        );

    }

}


async function cargarEquipos() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );

    const lista =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

    if (
        usuario?.rol === "admin"
    ) {

        equipos = lista;

        return;

    }

    equipos =
        lista.filter(
            equipo =>
                String(
                    equipo.responsableId || ""
                ) === String(
                    usuario?.uid || ""
                )
        );

}


async function cargarJugadores() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "jugadores"
            )
        );

    todosLosJugadores =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

}


async function cargarTemporadas() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "temporadas"
                )
            );

        temporadas =
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
                    String(
                        temporada.estado || ""
                    ).toLowerCase() ===
                        "activa"
            ) || null;

    } catch (error) {

        console.error(error);

        temporadas = [];

        temporadaActual = null;

    }

}


function resolverEquipoActual() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const equipoId =
        parametros.get("equipo");

    if (equipoId) {

        equipoActual =
            equipos.find(
                equipo =>
                    equipo.id === equipoId
            ) || null;

    }

    if (!equipoActual) {

        equipoActual =
            equipos[0] || null;

    }

    if (!equipoActual) {

        throw new Error(
            "No hay equipos disponibles."
        );

    }

}


function filtrarJugadoresEquipo() {

    jugadores =
        todosLosJugadores
            .filter(
                jugador =>
                    String(
                        jugador.equipoId || ""
                    ) ===
                        String(
                            equipoActual?.id || ""
                        ) &&
                    jugador.activo !== false
            )
            .sort(
                (a, b) =>
                    obtenerNombreJugador(a)
                        .localeCompare(
                            obtenerNombreJugador(b),
                            "es",
                            {
                                sensitivity: "base"
                            }
                        )
            );

}


function actualizarEncabezado() {

    if (!equipoActual) {
        return;
    }

    encabezadoNombreEquipo.textContent =
        equipoActual.nombre ||
        equipoActual.nombreEquipo ||
        "Equipo";

    encabezadoCategoriaEquipo.textContent =
        equipoActual.categoriaNombre ||
        equipoActual.categoria ||
        "Categoría";

    const logo =
        equipoActual.logoUrl ||
        equipoActual.logo ||
        "";

    if (
        encabezadoLogoEquipo &&
        logo
    ) {

        encabezadoLogoEquipo.src =
            logo;

    }

}


function renderizarJugadores(
    filtro = ""
) {

    if (!listaJugadores) {
        return;
    }

    const busqueda =
        String(
            filtro || ""
        )
            .trim()
            .toLowerCase();

    const filtrados =
        jugadores.filter(
            jugador => {

                if (!busqueda) {
                    return true;
                }

                const nombre =
                    obtenerNombreJugador(
                        jugador
                    ).toLowerCase();

                const curp =
                    String(
                        jugador.curp || ""
                    ).toLowerCase();

                return (
                    nombre.includes(
                        busqueda
                    ) ||
                    curp.includes(
                        busqueda
                    )
                );

            }
        );

    contadorJugadores.textContent =
        `${jugadores.length} ${
            jugadores.length === 1
                ? "jugador"
                : "jugadores"
        }`;

    listaJugadores.innerHTML =
        "";

    if (
        filtrados.length === 0
    ) {

        sinJugadores?.classList.remove(
            "oculto"
        );

        return;

    }

    sinJugadores?.classList.add(
        "oculto"
    );

    filtrados.forEach(
        jugador => {

            const tarjeta =
                document.createElement(
                    "div"
                );

            tarjeta.className =
                "jugador-opcion";

            if (
                jugadorSeleccionado?.id ===
                jugador.id
            ) {

                tarjeta.classList.add(
                    "seleccionado"
                );

            }

            const nombre =
                obtenerNombreJugador(
                    jugador
                );

            const categoria =
                jugador.categoriaNombre ||
                equipoActual?.categoriaNombre ||
                equipoActual?.categoria ||
                "Sin categoría";

            const foto =
                obtenerFotoJugador(
                    jugador
                );

            tarjeta.innerHTML = `
                <div class="jugador-opcion-foto">
                    ${
                        foto
                            ? `
                                <img
                                    src="${escaparHTML(foto)}"
                                    alt="${escaparHTML(nombre)}"
                                >
                            `
                            : escaparHTML(
                                obtenerInicial(
                                    nombre
                                )
                            )
                    }
                </div>

                <div class="jugador-opcion-info">

                    <strong>
                        ${escaparHTML(nombre)}
                    </strong>

                    <span>
                        ${escaparHTML(categoria)}
                    </span>

                </div>

                <button
                    type="button"
                    data-jugador="${jugador.id}"
                >
                    Ver
                </button>
            `;

            tarjeta
                .querySelector(
                    "button"
                )
                ?.addEventListener(
                    "click",
                    () =>
                        seleccionarJugador(
                            jugador.id
                        )
                );

            listaJugadores.appendChild(
                tarjeta
            );

        }
    );

}


async function seleccionarJugador(
    jugadorId
) {

    const jugador =
        jugadores.find(
            item =>
                item.id === jugadorId
        );

    if (!jugador) {
        return;
    }

    jugadorSeleccionado =
        jugador;

    renderizarJugadores(
        buscarJugador?.value || ""
    );

    await actualizarCredencial();

    panelCredencial?.classList.remove(
        "oculto"
    );

    setTimeout(
        () => {

            panelCredencial?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        },
        80
    );

}


async function actualizarCredencial() {

    if (!jugadorSeleccionado) {
        return;
    }

    const jugador =
        jugadorSeleccionado;

    const nombre =
        obtenerNombreJugador(
            jugador
        );

    const curp =
        String(
            jugador.curp || ""
        )
            .trim()
            .toUpperCase();

    const direccion =
        obtenerDireccionJugador(
            jugador
        );

    const categoria =
        jugador.categoriaNombre ||
        equipoActual?.categoriaNombre ||
        equipoActual?.categoria ||
        "Sin categoría";

    const foto =
        obtenerFotoJugador(
            jugador
        );

    tituloJugadorSeleccionado.textContent =
        nombre;

    credencialNombre.textContent =
        nombre.toUpperCase();

    credencialCurp.textContent =
        curp || "SIN CURP";

    credencialCategoria.textContent =
        String(
            categoria
        ).toUpperCase();

    credencialTemporada.textContent =
        obtenerNombreTemporada();

    actualizarFoto(
        credencialFoto,
        foto,
        nombre
    );

    if (direccion) {

        credencialDireccion.textContent =
            direccion.toUpperCase();

        avisoDireccion?.classList.add(
            "oculto"
        );

        estadoCredencial.textContent =
            "LISTA PARA GENERAR";

        estadoCredencial.className =
            "estado-credencial lista";

        btnImprimirCredencial.disabled =
            false;

    } else {

        credencialDireccion.textContent =
            "PENDIENTE DE REGISTRO";

        avisoDireccion?.classList.remove(
            "oculto"
        );

        estadoCredencial.textContent =
            "FALTA DIRECCIÓN";

        estadoCredencial.className =
            "estado-credencial pendiente";

        btnImprimirCredencial.disabled =
            true;

    }

    await generarQrJugador(
        jugador
    );

}


function activarEventos() {

    btnVolver?.addEventListener(
        "click",
        () => {

            if (
                window.history.length > 1
            ) {

                window.history.back();

                return;

            }

            window.location.href =
                equipoActual?.id
                    ? `jefeEquipo.html?equipo=${encodeURIComponent(
                        equipoActual.id
                    )}`
                    : "jefeEquipo.html";

        }
    );


    buscarJugador?.addEventListener(
        "input",
        () => {

            renderizarJugadores(
                buscarJugador.value
            );

        }
    );


    btnCambiarJugador?.addEventListener(
        "click",
        () => {

            panelCredencial?.classList.add(
                "oculto"
            );

            jugadorSeleccionado =
                null;

            renderizarJugadores(
                buscarJugador?.value || ""
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    btnRegistrarDireccion?.addEventListener(
        "click",
        abrirModalDireccion
    );


    btnCerrarDireccion?.addEventListener(
        "click",
        cerrarModalDireccion
    );


    btnCancelarDireccion?.addEventListener(
        "click",
        cerrarModalDireccion
    );


    modalDireccion?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalDireccion
            ) {

                cerrarModalDireccion();

            }

        }
    );


    formDireccion?.addEventListener(
        "submit",
        guardarDireccion
    );


    btnImprimirCredencial?.addEventListener(
        "click",
        imprimirCredencial
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !modalDireccion?.classList.contains(
                    "oculto"
                )
            ) {

                cerrarModalDireccion();

            }

        }
    );

}


function abrirModalDireccion() {

    if (!jugadorSeleccionado) {
        return;
    }

    const nombre =
        obtenerNombreJugador(
            jugadorSeleccionado
        );

    const foto =
        obtenerFotoJugador(
            jugadorSeleccionado
        );

    direccionJugadorNombre.textContent =
        nombre;

    direccionJugadorCurp.textContent =
        String(
            jugadorSeleccionado.curp ||
            "Sin CURP"
        ).toUpperCase();

    direccionJugador.value =
        obtenerDireccionJugador(
            jugadorSeleccionado
        );

    actualizarFoto(
        direccionJugadorFoto,
        foto,
        nombre
    );

    modalDireccion?.classList.remove(
        "oculto"
    );

    document.body.style.overflow =
        "hidden";

    setTimeout(
        () => {

            direccionJugador?.focus();

        },
        100
    );

}


function cerrarModalDireccion() {

    modalDireccion?.classList.add(
        "oculto"
    );

    document.body.style.overflow =
        "";

}


async function guardarDireccion(
    event
) {

    event.preventDefault();

    if (!jugadorSeleccionado) {
        return;
    }

    const direccion =
        String(
            direccionJugador?.value || ""
        )
            .trim()
            .replace(/\s+/g, " ");

    if (
        direccion.length < 8
    ) {

        mostrarToast(
            "error",
            "Dirección incompleta",
            "Escribe una dirección válida antes de continuar."
        );

        direccionJugador?.focus();

        return;

    }

    const textoOriginal =
        btnGuardarDireccion.textContent;

    btnGuardarDireccion.disabled =
        true;

    btnGuardarDireccion.textContent =
        "Guardando...";

    try {

        await updateDoc(
            doc(
                db,
                "jugadores",
                jugadorSeleccionado.id
            ),
            {
                direccion,
                direccionActualizadaEn:
                    serverTimestamp(),
                direccionActualizadaPor:
                    usuario?.uid || ""
            }
        );

        jugadorSeleccionado.direccion =
            direccion;

        const indiceGeneral =
            todosLosJugadores.findIndex(
                jugador =>
                    jugador.id ===
                    jugadorSeleccionado.id
            );

        if (
            indiceGeneral !== -1
        ) {

            todosLosJugadores[
                indiceGeneral
            ].direccion =
                direccion;

        }

        const indiceEquipo =
            jugadores.findIndex(
                jugador =>
                    jugador.id ===
                    jugadorSeleccionado.id
            );

        if (
            indiceEquipo !== -1
        ) {

            jugadores[
                indiceEquipo
            ].direccion =
                direccion;

        }

        cerrarModalDireccion();

        await actualizarCredencial();

        mostrarToast(
            "exito",
            "Dirección registrada",
            "La credencial ya puede generarse."
        );

    } catch (error) {

        console.error(error);

        mostrarToast(
            "error",
            "No pudimos guardar",
            "La dirección no pudo actualizarse. Inténtalo nuevamente."
        );

    } finally {

        btnGuardarDireccion.disabled =
            false;

        btnGuardarDireccion.textContent =
            textoOriginal;

    }

}


async function generarQrJugador(
    jugador
) {

    if (!credencialQr) {
        return;
    }

    credencialQr.innerHTML =
        "";

    const token =
        String(
            jugador.credencialToken || ""
        ).trim();

    if (!token) {

        credencialQr.innerHTML =
            "<span>QR pendiente</span>";

        mostrarToast(
            "error",
            "Jugador sin verificación",
            "Este jugador todavía no cuenta con un código público de verificación."
        );

        return;

    }

    const url =
        construirUrlVerificacion(
            token
        );

    if (!libreriaQrLista) {

        const cargada =
            await cargarLibreriaQr();

        if (!cargada) {

            credencialQr.innerHTML =
                "<span>QR no disponible</span>";

            return;

        }

    }

    try {

        if (
            typeof window.QRCode ===
            "function"
        ) {

            new window.QRCode(
                credencialQr,
                {
                    text: url,
                    width: 220,
                    height: 220,
                    correctLevel:
                        window.QRCode
                            .CorrectLevel
                            ?.M
                }
            );

            return;

        }

        if (
            window.QRCode &&
            typeof window.QRCode.toCanvas ===
                "function"
        ) {

            const canvas =
                document.createElement(
                    "canvas"
                );

            credencialQr.appendChild(
                canvas
            );

            await window.QRCode.toCanvas(
                canvas,
                url,
                {
                    width: 220,
                    margin: 1
                }
            );

            return;

        }

        throw new Error(
            "Formato de QR no compatible."
        );

    } catch (error) {

        console.error(error);

        credencialQr.innerHTML =
            "<span>QR no disponible</span>";

    }

}


function construirUrlVerificacion(
    token
) {

    return new URL(
        `verificarJugador.html?token=${encodeURIComponent(
            token
        )}`,
        window.location.origin
    ).href;

}


async function cargarLibreriaQr() {

    if (
        typeof window.QRCode !==
        "undefined"
    ) {

        libreriaQrLista =
            true;

        return true;

    }

    const existente =
        document.querySelector(
            'script[data-liga-qr="true"]'
        );

    if (existente) {

        return new Promise(
            resolve => {

                if (
                    typeof window.QRCode !==
                    "undefined"
                ) {

                    libreriaQrLista =
                        true;

                    resolve(true);

                    return;

                }

                existente.addEventListener(
                    "load",
                    () => {

                        libreriaQrLista =
                            typeof window.QRCode !==
                            "undefined";

                        resolve(
                            libreriaQrLista
                        );

                    },
                    {
                        once: true
                    }
                );

                existente.addEventListener(
                    "error",
                    () =>
                        resolve(false),
                    {
                        once: true
                    }
                );

            }
        );

    }

    return new Promise(
        resolve => {

            const script =
                document.createElement(
                    "script"
                );

            script.src =
                "/js/libs/qrcode.min.js";

            script.dataset.ligaQr =
                "true";

            script.onload =
                () => {

                    libreriaQrLista =
                        typeof window.QRCode !==
                        "undefined";

                    resolve(
                        libreriaQrLista
                    );

                };

            script.onerror =
                () => {

                    libreriaQrLista =
                        false;

                    resolve(false);

                };

            document.head.appendChild(
                script
            );

        }
    );

}


function imprimirCredencial() {

    if (!jugadorSeleccionado) {
        return;
    }

    const direccion =
        obtenerDireccionJugador(
            jugadorSeleccionado
        );

    if (!direccion) {

        mostrarToast(
            "error",
            "Falta la dirección",
            "Registra la dirección del jugador antes de imprimir."
        );

        abrirModalDireccion();

        return;

    }

    const token =
        String(
            jugadorSeleccionado
                .credencialToken || ""
        ).trim();

    if (!token) {

        mostrarToast(
            "error",
            "Falta verificación",
            "El jugador todavía no tiene un código de verificación disponible."
        );

        return;

    }

    window.print();

}


function obtenerNombreJugador(
    jugador
) {

    return String(
        jugador?.nombre ||
        jugador?.nombreCompleto ||
        [
            jugador?.nombres,
            jugador?.apellidoPaterno,
            jugador?.apellidoMaterno
        ]
            .filter(Boolean)
            .join(" ") ||
        "Jugador"
    ).trim();

}


function obtenerFotoJugador(
    jugador
) {

    return String(
        jugador?.fotoUrl ||
        jugador?.fotoURL ||
        jugador?.foto ||
        jugador?.imagenUrl ||
        ""
    ).trim();

}


function obtenerDireccionJugador(
    jugador
) {

    return String(
        jugador?.direccion ||
        jugador?.domicilio ||
        ""
    ).trim();

}


function obtenerNombreTemporada() {

    if (!temporadaActual) {

        return "TEMPORADA ACTUAL";

    }

    return String(
        temporadaActual.nombre ||
        "TEMPORADA ACTUAL"
    ).toUpperCase();

}


function actualizarFoto(
    contenedor,
    foto,
    nombre
) {

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML =
        "";

    if (foto) {

        const imagen =
            document.createElement(
                "img"
            );

        imagen.src =
            foto;

        imagen.alt =
            nombre;

        imagen.addEventListener(
            "error",
            () => {

                contenedor.innerHTML =
                    "";

                contenedor.textContent =
                    obtenerInicial(
                        nombre
                    );

            },
            {
                once: true
            }
        );

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


function obtenerInicial(
    texto
) {

    const limpio =
        String(
            texto || "J"
        ).trim();

    return (
        limpio.charAt(0) || "J"
    ).toUpperCase();

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


function mostrarToast(
    tipo,
    titulo,
    texto
) {

    if (
        !toast ||
        !toastTitulo ||
        !toastTexto
    ) {
        return;
    }

    clearTimeout(
        temporizadorToast
    );

    toast.classList.remove(
        "oculto",
        "error"
    );

    if (
        tipo === "error"
    ) {

        toast.classList.add(
            "error"
        );

        if (toastIcono) {
            toastIcono.textContent =
                "!";
        }

    } else {

        if (toastIcono) {
            toastIcono.textContent =
                "✓";
        }

    }

    toastTitulo.textContent =
        titulo;

    toastTexto.textContent =
        texto;

    temporizadorToast =
        setTimeout(
            () => {

                toast.classList.add(
                    "oculto"
                );

            },
            4200
        );

}