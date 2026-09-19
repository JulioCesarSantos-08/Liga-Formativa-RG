import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    protegerPagina,
    cerrarSesion
} from "../roles.js";


const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const btnAbrirSidebar =
    document.getElementById("btnAbrirSidebar");

const btnCerrarSidebar =
    document.getElementById("btnCerrarSidebar");

const btnCerrarSesionSidebar =
    document.getElementById("btnCerrarSesionSidebar");

const btnPerfilAdmin =
    document.getElementById("btnPerfilAdmin");

const adminInicial =
    document.getElementById("adminInicial");

const adminInicialSidebar =
    document.getElementById("adminInicialSidebar");

const adminNombreSidebar =
    document.getElementById("adminNombreSidebar");

const saludoAdmin =
    document.getElementById("saludoAdmin");

const botonesModulo =
    document.querySelectorAll("[data-modulo]");

const botonesAccion =
    document.querySelectorAll("[data-accion]");

const temporadaActualNombre =
    document.getElementById("temporadaActualNombre");

const temporadaActualEstado =
    document.getElementById("temporadaActualEstado");

const statEquipos =
    document.getElementById("statEquipos");

const statJugadores =
    document.getElementById("statJugadores");

const statArbitros =
    document.getElementById("statArbitros");

const statPartidos =
    document.getElementById("statPartidos");

const statCedulas =
    document.getElementById("statCedulas");

const statSuspendidos =
    document.getElementById("statSuspendidos");

const badgeCedulas =
    document.getElementById("badgeCedulas");

const listaProximosPartidos =
    document.getElementById("listaProximosPartidos");

const pendienteCedulasTexto =
    document.getElementById("pendienteCedulasTexto");

const pendienteUsuariosTexto =
    document.getElementById("pendienteUsuariosTexto");

const pendienteSuspendidosTexto =
    document.getElementById("pendienteSuspendidosTexto");

const listaUltimasAcciones =
    document.getElementById("listaUltimasAcciones");


let usuarioActual = null;

let equipos = [];
let jugadores = [];
let usuarios = [];
let partidos = [];
let cedulas = [];
let temporadas = [];
let auditoria = [];


iniciar();


async function iniciar() {

    try {

        usuarioActual =
            await protegerPagina([
                "admin"
            ]);

        if (!usuarioActual) {
            return;
        }

        cargarAdministrador(
            usuarioActual
        );

        activarEventos();

        await cargarDashboard();

    } catch (error) {

        console.error(
            "Error iniciando dashboard:",
            error
        );

        mostrarErrorDashboard();

    }

}


function cargarAdministrador(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        usuario.nombreCompleto?.trim() ||
        usuario.email?.trim() ||
        "Administrador";

    const inicial =
        obtenerInicial(
            nombre
        );

    if (adminInicial) {
        adminInicial.textContent =
            inicial;
    }

    if (adminInicialSidebar) {
        adminInicialSidebar.textContent =
            inicial;
    }

    if (adminNombreSidebar) {
        adminNombreSidebar.textContent =
            nombre;
    }

    if (saludoAdmin) {

        saludoAdmin.textContent =
            `Bienvenido, ${obtenerPrimerNombre(nombre)}`;

    }

}


async function cargarDashboard() {

    establecerEstadoCarga();

    const resultados =
        await Promise.allSettled([
            obtenerColeccion("equipos"),
            obtenerColeccion("jugadores"),
            obtenerColeccion("usuarios"),
            obtenerColeccion("partidos"),
            obtenerColeccion("cedulas"),
            obtenerColeccion("temporadas"),
            obtenerColeccion("auditoria")
        ]);

    equipos =
        obtenerResultado(
            resultados[0],
            "equipos"
        );

    jugadores =
        obtenerResultado(
            resultados[1],
            "jugadores"
        );

    usuarios =
        obtenerResultado(
            resultados[2],
            "usuarios"
        );

    partidos =
        obtenerResultado(
            resultados[3],
            "partidos"
        );

    cedulas =
        obtenerResultado(
            resultados[4],
            "cedulas"
        );

    temporadas =
        obtenerResultado(
            resultados[5],
            "temporadas"
        );

    auditoria =
        obtenerResultado(
            resultados[6],
            "auditoria"
        );

    actualizarTemporada();

    actualizarEstadisticas();

    actualizarPendientes();

    renderizarProximosPartidos();

    renderizarUltimasAcciones();

}


async function obtenerColeccion(nombre) {

    const snapshot =
        await getDocs(
            collection(
                db,
                nombre
            )
        );

    return snapshot.docs.map(
        documento => ({
            id: documento.id,
            ...documento.data()
        })
    );

}


function obtenerResultado(
    resultado,
    nombre
) {

    if (
        resultado.status ===
        "fulfilled"
    ) {

        return resultado.value;

    }

    console.error(
        `Error cargando ${nombre}:`,
        resultado.reason
    );

    return [];

}


function establecerEstadoCarga() {

    if (temporadaActualNombre) {
        temporadaActualNombre.textContent =
            "—";
    }

    if (temporadaActualEstado) {
        temporadaActualEstado.textContent =
            "Cargando...";
    }

    if (statEquipos) {
        statEquipos.textContent =
            "—";
    }

    if (statJugadores) {
        statJugadores.textContent =
            "—";
    }

    if (statArbitros) {
        statArbitros.textContent =
            "—";
    }

    if (statPartidos) {
        statPartidos.textContent =
            "—";
    }

    if (statCedulas) {
        statCedulas.textContent =
            "—";
    }

    if (statSuspendidos) {
        statSuspendidos.textContent =
            "—";
    }

}


function actualizarTemporada() {

    const temporadaActiva =
        temporadas.find(
            temporada =>
                esTemporadaActiva(
                    temporada
                )
        );

    if (!temporadaActiva) {

        temporadaActualNombre.textContent =
            "Sin temporada";

        temporadaActualEstado.textContent =
            "No hay una activa";

        return;

    }

    temporadaActualNombre.textContent =
        temporadaActiva.nombre ||
        obtenerAnioTemporada(
            temporadaActiva
        ) ||
        "Temporada";

    temporadaActualEstado.textContent =
        "En curso";

}


function actualizarEstadisticas() {

    const totalEquipos =
        equipos.filter(
            equipo =>
                equipo.activo !== false
        ).length;

    const totalJugadores =
        jugadores.filter(
            jugador =>
                jugador.activo !== false
        ).length;

    const totalArbitros =
        usuarios.filter(
            usuario =>
                normalizarRol(
                    usuario.rol
                ) === "arbitro" &&
                usuario.activo !== false
        ).length;

    const totalPartidos =
        obtenerPartidosTemporadaActual()
            .length;

    const cedulasPendientes =
        calcularCedulasPendientes();

    const suspendidos =
        calcularSuspendidos();

    statEquipos.textContent =
        totalEquipos;

    statJugadores.textContent =
        totalJugadores;

    statArbitros.textContent =
        totalArbitros;

    statPartidos.textContent =
        totalPartidos;

    statCedulas.textContent =
        cedulasPendientes;

    statSuspendidos.textContent =
        suspendidos;

    if (badgeCedulas) {

        badgeCedulas.textContent =
            cedulasPendientes;

        badgeCedulas.style.display =
            cedulasPendientes > 0
                ? ""
                : "none";

    }

}


function obtenerPartidosTemporadaActual() {

    const temporadaActiva =
        temporadas.find(
            temporada =>
                esTemporadaActiva(
                    temporada
                )
        );

    if (!temporadaActiva) {

        return partidos;

    }

    const partidosConTemporada =
        partidos.filter(
            partido =>
                partido.temporadaId
        );

    if (!partidosConTemporada.length) {

        return partidos;

    }

    return partidos.filter(
        partido =>
            partido.temporadaId ===
            temporadaActiva.id
    );

}


function calcularCedulasPendientes() {

    const partidosAplicables =
        obtenerPartidosTemporadaActual();

    return partidosAplicables.filter(
        partido => {

            const estado =
                normalizarEstadoPartido(
                    partido.estado
                );

            if (
                estado !== "finalizado"
            ) {

                return false;

            }

            const cedula =
                cedulas.find(
                    item =>
                        item.partidoId ===
                            partido.id ||
                        item.id ===
                            partido.id
                );

            if (!cedula) {
                return true;
            }

            const estadoCedula =
                normalizarTexto(
                    cedula.estado
                );

            return ![
                "registrada",
                "finalizada",
                "final",
                "enviada"
            ].includes(
                estadoCedula
            );

        }
    ).length;

}


function calcularSuspendidos() {

    return jugadores.filter(
        jugador => {

            const pendientes =
                Number(
                    jugador.partidosSuspensionPendientes ||
                    0
                );

            return (
                jugador.suspendido === true ||
                pendientes > 0
            );

        }
    ).length;

}


function actualizarPendientes() {

    const cedulasPendientes =
        calcularCedulasPendientes();

    const suspendidos =
        calcularSuspendidos();

    const totalUsuarios =
        usuarios.length;

    pendienteCedulasTexto.textContent =
        `${cedulasPendientes} ${
            cedulasPendientes === 1
                ? "cédula pendiente"
                : "cédulas pendientes"
        }`;

    pendienteUsuariosTexto.textContent =
        `${totalUsuarios} ${
            totalUsuarios === 1
                ? "usuario registrado"
                : "usuarios registrados"
        }`;

    pendienteSuspendidosTexto.textContent =
        `${suspendidos} ${
            suspendidos === 1
                ? "jugador suspendido"
                : "jugadores suspendidos"
        }`;

}


function renderizarProximosPartidos() {

    if (!listaProximosPartidos) {
        return;
    }

    const ahora =
        new Date();

    const proximos =
        obtenerPartidosTemporadaActual()
            .filter(
                partido => {

                    const estado =
                        normalizarEstadoPartido(
                            partido.estado
                        );

                    if (
                        estado === "finalizado" ||
                        estado === "cancelado"
                    ) {

                        return false;

                    }

                    const fecha =
                        obtenerFechaPartido(
                            partido
                        );

                    if (!fecha) {
                        return false;
                    }

                    return (
                        fecha.getTime() >=
                        ahora.getTime() -
                        6 * 60 * 60 * 1000
                    );

                }
            )
            .sort(
                (a, b) => {

                    const fechaA =
                        obtenerFechaPartido(a);

                    const fechaB =
                        obtenerFechaPartido(b);

                    return (
                        fechaA.getTime() -
                        fechaB.getTime()
                    );

                }
            )
            .slice(
                0,
                3
            );

    if (!proximos.length) {

        listaProximosPartidos.innerHTML = `
            <div class="estado-dashboard">
                No hay próximos partidos programados.
            </div>
        `;

        return;

    }

    listaProximosPartidos.innerHTML =
        proximos
            .map(
                crearTarjetaPartido
            )
            .join("");

    listaProximosPartidos
        .querySelectorAll(
            "[data-editar-partido]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const id =
                            boton.dataset
                                .editarPartido;

                        window.location.href =
                            `adminPartidos.html?partido=${encodeURIComponent(id)}`;

                    }
                );

            }
        );

}


function crearTarjetaPartido(
    partido
) {

    const fecha =
        obtenerFechaPartido(
            partido
        );

    const dia =
        fecha
            ? String(
                fecha.getDate()
            ).padStart(
                2,
                "0"
            )
            : "--";

    const mes =
        fecha
            ? fecha
                .toLocaleDateString(
                    "es-MX",
                    {
                        month:
                            "short"
                    }
                )
                .replace(
                    ".",
                    ""
                )
                .toUpperCase()
            : "---";

    const categoria =
        partido.categoriaNombre ||
        obtenerNombreCategoria(
            partido.categoriaId
        ) ||
        "Sin categoría";

    const jornada =
        partido.jornadaNombre ||
        "";

    const local =
        partido.localNombre ||
        obtenerNombreEquipo(
            partido.localId
        ) ||
        "Equipo local";

    const visitante =
        partido.visitanteNombre ||
        obtenerNombreEquipo(
            partido.visitanteId
        ) ||
        "Equipo visitante";

    const hora =
        formatearHoraPartido(
            partido
        );

    const campo =
        partido.campo ||
        partido.sede ||
        partido.lugar ||
        "Sede por definir";

    const arbitro =
        partido.arbitroNombre ||
        obtenerNombreUsuario(
            partido.arbitroId
        ) ||
        "Sin asignar";

    const encabezado =
        jornada
            ? `${categoria} · ${jornada}`
            : categoria;

    return `
        <article class="partido-admin-card">

            <div class="partido-admin-fecha">
                <strong>
                    ${escaparHTML(dia)}
                </strong>

                <span>
                    ${escaparHTML(mes)}
                </span>
            </div>

            <div class="partido-admin-info">

                <span>
                    ${escaparHTML(encabezado)}
                </span>

                <strong>
                    ${escaparHTML(local)}
                    vs
                    ${escaparHTML(visitante)}
                </strong>

                <small>
                    ${escaparHTML(hora)}
                    ·
                    ${escaparHTML(campo)}
                </small>

            </div>

            <div class="partido-admin-arbitro">

                <span>
                    Árbitro
                </span>

                <strong>
                    ${escaparHTML(arbitro)}
                </strong>

            </div>

            <button
                type="button"
                class="btn-editar-partido"
                data-editar-partido="${escaparHTML(partido.id)}"
            >
                Editar
            </button>

        </article>
    `;

}


function renderizarUltimasAcciones() {

    if (!listaUltimasAcciones) {
        return;
    }

    const acciones =
        [...auditoria]
            .sort(
                (a, b) =>
                    obtenerTiempoAuditoria(b) -
                    obtenerTiempoAuditoria(a)
            )
            .slice(
                0,
                4
            );

    if (!acciones.length) {

        listaUltimasAcciones.innerHTML = `
            <div class="estado-dashboard">
                Todavía no hay acciones registradas.
            </div>
        `;

        return;

    }

    listaUltimasAcciones.innerHTML =
        acciones
            .map(
                accion =>
                    crearActividad(
                        accion
                    )
            )
            .join("");

}


function crearActividad(
    accion
) {

    const nombre =
        accion.usuarioNombre ||
        accion.usuario ||
        "Administrador";

    const descripcion =
        accion.descripcion ||
        textoAccion(
            accion.accion
        );

    const tiempo =
        formatearTiempoRelativo(
            obtenerFechaAuditoria(
                accion
            )
        );

    return `
        <article class="actividad-item">

            <div class="actividad-punto"></div>

            <div>

                <strong>
                    ${escaparHTML(nombre)}
                </strong>

                <p>
                    ${escaparHTML(descripcion)}
                </p>

                <span>
                    ${escaparHTML(tiempo)}
                </span>

            </div>

        </article>
    `;

}


function obtenerFechaPartido(
    partido
) {

    const fecha =
        partido.fecha ||
        partido.fechaPartido ||
        "";

    if (!fecha) {
        return null;
    }

    const hora =
        partido.hora ||
        partido.horaPartido ||
        "00:00";

    const fechaCompleta =
        new Date(
            `${fecha}T${normalizarHora(hora)}`
        );

    if (
        Number.isNaN(
            fechaCompleta.getTime()
        )
    ) {

        return null;

    }

    return fechaCompleta;

}


function normalizarHora(
    hora
) {

    const valor =
        String(
            hora ||
            "00:00"
        ).trim();

    if (
        /^\d{2}:\d{2}$/.test(
            valor
        )
    ) {

        return `${valor}:00`;

    }

    if (
        /^\d{2}:\d{2}:\d{2}$/.test(
            valor
        )
    ) {

        return valor;

    }

    return "00:00:00";

}


function formatearHoraPartido(
    partido
) {

    const hora =
        partido.hora ||
        partido.horaPartido ||
        "";

    if (!hora) {
        return "Hora por definir";
    }

    const partes =
        String(hora)
            .split(":");

    const horas =
        Number(
            partes[0]
        );

    const minutos =
        Number(
            partes[1] ||
            0
        );

    if (
        Number.isNaN(horas)
    ) {

        return hora;

    }

    const fecha =
        new Date();

    fecha.setHours(
        horas,
        minutos,
        0,
        0
    );

    return fecha.toLocaleTimeString(
        "es-MX",
        {
            hour:
                "numeric",
            minute:
                "2-digit"
        }
    );

}


function obtenerNombreEquipo(
    id
) {

    if (!id) {
        return "";
    }

    const equipo =
        equipos.find(
            item =>
                item.id === id
        );

    return (
        equipo?.nombre ||
        ""
    );

}


function obtenerNombreCategoria(
    id
) {

    if (!id) {
        return "";
    }

    const equipo =
        equipos.find(
            item =>
                item.categoriaId === id &&
                item.categoriaNombre
        );

    return (
        equipo?.categoriaNombre ||
        ""
    );

}


function obtenerNombreUsuario(
    id
) {

    if (!id) {
        return "";
    }

    const usuario =
        usuarios.find(
            item =>
                item.id === id
        );

    return (
        usuario?.nombre ||
        usuario?.nombreCompleto ||
        usuario?.email ||
        ""
    );

}


function esTemporadaActiva(
    temporada
) {

    const estado =
        normalizarTexto(
            temporada.estado
        );

    return (
        temporada.activa === true ||
        estado === "activa" ||
        estado === "activo" ||
        estado === "encurso" ||
        estado === "en curso"
    );

}


function obtenerAnioTemporada(
    temporada
) {

    const fecha =
        temporada.fechaInicio ||
        "";

    if (
        /^\d{4}/.test(
            fecha
        )
    ) {

        return fecha.substring(
            0,
            4
        );

    }

    return "";

}


function normalizarEstadoPartido(
    estado
) {

    const valor =
        normalizarTexto(
            estado
        );

    if (
        [
            "finalizado",
            "finalizada",
            "terminado",
            "terminada"
        ].includes(valor)
    ) {

        return "finalizado";

    }

    if (
        [
            "cancelado",
            "cancelada"
        ].includes(valor)
    ) {

        return "cancelado";

    }

    if (
        [
            "en juego",
            "enjuego",
            "en curso",
            "encurso"
        ].includes(valor)
    ) {

        return "enJuego";

    }

    return "proximo";

}


function normalizarRol(
    rol
) {

    return normalizarTexto(
        rol
    )
        .replace(
            /\s+/g,
            ""
        );

}


function normalizarTexto(
    texto
) {

    return String(
        texto ||
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();

}


function obtenerFechaAuditoria(
    accion
) {

    const valor =
        accion.creadoEn ||
        accion.fecha ||
        accion.timestamp ||
        accion.actualizadoEn ||
        null;

    if (!valor) {
        return null;
    }

    if (
        typeof valor.toDate ===
        "function"
    ) {

        return valor.toDate();

    }

    if (
        typeof valor.seconds ===
        "number"
    ) {

        return new Date(
            valor.seconds *
            1000
        );

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


function obtenerTiempoAuditoria(
    accion
) {

    const fecha =
        obtenerFechaAuditoria(
            accion
        );

    return fecha
        ? fecha.getTime()
        : 0;

}


function formatearTiempoRelativo(
    fecha
) {

    if (!fecha) {
        return "Recientemente";
    }

    const ahora =
        Date.now();

    const diferencia =
        Math.max(
            0,
            ahora -
            fecha.getTime()
        );

    const minutos =
        Math.floor(
            diferencia /
            60000
        );

    if (
        minutos < 1
    ) {

        return "Ahora";

    }

    if (
        minutos < 60
    ) {

        return `Hace ${minutos} ${
            minutos === 1
                ? "minuto"
                : "minutos"
        }`;

    }

    const horas =
        Math.floor(
            minutos /
            60
        );

    if (
        horas < 24
    ) {

        return `Hace ${horas} ${
            horas === 1
                ? "hora"
                : "horas"
        }`;

    }

    const dias =
        Math.floor(
            horas /
            24
        );

    if (
        dias < 7
    ) {

        return `Hace ${dias} ${
            dias === 1
                ? "día"
                : "días"
        }`;

    }

    return fecha.toLocaleDateString(
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


function textoAccion(
    accion
) {

    if (!accion) {
        return "Realizó una acción administrativa.";
    }

    return String(
        accion
    )
        .replace(
            /_/g,
            " "
        )
        .replace(
            /^\w/,
            letra =>
                letra.toUpperCase()
        ) + ".";

}


function mostrarErrorDashboard() {

    if (temporadaActualNombre) {
        temporadaActualNombre.textContent =
            "—";
    }

    if (temporadaActualEstado) {
        temporadaActualEstado.textContent =
            "No disponible";
    }

    if (listaProximosPartidos) {

        listaProximosPartidos.innerHTML = `
            <div class="estado-dashboard">
                No se pudieron cargar los próximos partidos.
            </div>
        `;

    }

    if (listaUltimasAcciones) {

        listaUltimasAcciones.innerHTML = `
            <div class="estado-dashboard">
                No se pudo cargar la actividad reciente.
            </div>
        `;

    }

}


function activarEventos() {

    btnAbrirSidebar?.addEventListener(
        "click",
        abrirSidebar
    );

    btnCerrarSidebar?.addEventListener(
        "click",
        cerrarSidebar
    );

    sidebarOverlay?.addEventListener(
        "click",
        cerrarSidebar
    );

    btnCerrarSesionSidebar?.addEventListener(
        "click",
        async () => {

            btnCerrarSesionSidebar.disabled =
                true;

            btnCerrarSesionSidebar.textContent =
                "Cerrando sesión...";

            await cerrarSesion();

        }
    );

    btnPerfilAdmin?.addEventListener(
        "click",
        () => {

            alert(
                "Más adelante aquí tendremos el perfil y configuración de la cuenta administrativa."
            );

        }
    );

    botonesModulo.forEach(
        boton => {

            boton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    navegarModulo(
                        boton.dataset.modulo
                    );

                }
            );

        }
    );

    botonesAccion.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    navegarModulo(
                        boton.dataset.accion
                    );

                }
            );

        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                sidebar?.classList.contains(
                    "abierto"
                )
            ) {

                cerrarSidebar();

            }

        }
    );

    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth >
                850
            ) {

                cerrarSidebar();

            }

        }
    );

}


function abrirSidebar() {

    sidebar?.classList.add(
        "abierto"
    );

    sidebarOverlay?.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";

}


function cerrarSidebar() {

    sidebar?.classList.remove(
        "abierto"
    );

    sidebarOverlay?.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";

}


function navegarModulo(
    modulo
) {

    const rutas = {

        categorias:
            "adminCategorias.html",

        crearCategoria:
            "adminCategorias.html?accion=nueva",

        equipos:
            "adminEquipos.html",

        crearEquipo:
            "adminEquipos.html?accion=nuevo",

        jornadas:
            "adminJornadas.html",

        partidos:
            "adminPartidos.html",

        crearPartido:
            "adminPartidos.html?accion=nuevo",

        temporadas:
            "adminTemporadas.html",

        usuarios:
            "adminUsuarios.html",

        jugadores:
            "adminJugadores.html",

        arbitros:
            "adminArbitros.html",

        jefesEquipo:
            "adminJefesEquipo.html",

        solicitudesEquipo:
            "adminJefesEquipo.html?seccion=solicitudes",

        cedulas:
            "adminCedulas.html",

        disciplina:
            "adminDisciplina.html",

        noticias:
            "adminNoticias.html",

        chat:
            "adminComunidad.html",

        auditoria:
            "adminAuditoria.html",

        configuracion:
            "adminConfiguracion.html"

    };

    const ruta =
        rutas[modulo];

    if (!ruta) {

        console.warn(
            `Módulo no encontrado: ${modulo}`
        );

        return;

    }

    window.location.href =
        ruta;

}


function obtenerInicial(
    nombre
) {

    if (!nombre) {
        return "A";
    }

    return nombre
        .trim()
        .charAt(0)
        .toUpperCase();

}


function obtenerPrimerNombre(
    nombre
) {

    if (!nombre) {
        return "Administrador";
    }

    return nombre
        .trim()
        .split(/\s+/)[0];

}


function escaparHTML(
    valor
) {

    return String(
        valor ??
        ""
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