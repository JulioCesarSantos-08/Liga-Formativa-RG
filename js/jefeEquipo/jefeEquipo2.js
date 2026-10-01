import {
    collection,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";

const CONFIGURACION_ID = "general";

let usuarioActualPagos = null;
let equiposAsignadosPagos = [];
let todosLosEquiposPagos = [];
let pagosEquipos = [];
let configuracionPagos = {};
let temporadaActualPagos = null;
let equipoActualPagos = null;

const usuarioPagos = await protegerPagina([
    "jefeEquipo",
    "admin"
]);

if (usuarioPagos) {
    usuarioActualPagos = usuarioPagos;

    try {
        await iniciarModuloPagos();
    } catch (error) {
        console.error(
            "Error iniciando módulo de pagos:",
            error
        );
    }
}

async function iniciarModuloPagos() {
    await Promise.all([
        cargarConfiguracionPagos(),
        cargarTemporadaActualPagos(),
        cargarEquiposPagos(),
        cargarPagosEquipos()
    ]);

    determinarEquiposAsignadosPagos();
    determinarEquipoActualPagos();
    crearEstilosPagos();
    crearSeccionPagos();
    observarCambioEquipo();
}

async function cargarConfiguracionPagos() {
    try {
        const referencia = doc(
            db,
            "configuracionLiga",
            CONFIGURACION_ID
        );

        const snapshot = await getDoc(
            referencia
        );

        if (snapshot.exists()) {
            configuracionPagos = {
                ...snapshot.data()
            };
        } else {
            configuracionPagos = {};
        }
    } catch (error) {
        console.warn(
            "No se pudo cargar la configuración financiera:",
            error
        );

        configuracionPagos = {};
    }
}

async function cargarTemporadaActualPagos() {
    try {
        const snapshot = await getDocs(
            collection(
                db,
                "temporadas"
            )
        );

        const temporadas = snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

        temporadaActualPagos =
            temporadas.find(
                temporada =>
                    temporada.activa === true
            ) ||
            temporadas.find(
                temporada =>
                    normalizarTexto(
                        temporada.estado
                    ) === "activa"
            ) ||
            null;
    } catch (error) {
        console.warn(
            "No se pudo cargar la temporada activa:",
            error
        );

        temporadaActualPagos = null;
    }
}

async function cargarEquiposPagos() {
    const snapshot = await getDocs(
        collection(
            db,
            "equipos"
        )
    );

    todosLosEquiposPagos =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );
}

async function cargarPagosEquipos() {
    try {
        const snapshot = await getDocs(
            collection(
                db,
                "pagosEquipos"
            )
        );

        pagosEquipos =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );
    } catch (error) {
        console.warn(
            "No se pudieron cargar los pagos:",
            error
        );

        pagosEquipos = [];
    }
}

function determinarEquiposAsignadosPagos() {
    if (
        usuarioActualPagos.rol === "admin"
    ) {
        equiposAsignadosPagos = [
            ...todosLosEquiposPagos
        ];

        return;
    }

    const usuarioId =
        usuarioActualPagos.uid ||
        usuarioActualPagos.id ||
        "";

    equiposAsignadosPagos =
        todosLosEquiposPagos.filter(
            equipo =>
                equipo.responsableId === usuarioId
        );
}

function determinarEquipoActualPagos() {
    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const equipoId =
        parametros.get("equipo");

    if (equipoId) {
        const encontrado =
            todosLosEquiposPagos.find(
                equipo =>
                    equipo.id === equipoId
            );

        if (
            encontrado &&
            puedeConsultarEquipo(
                encontrado
            )
        ) {
            equipoActualPagos =
                encontrado;

            return;
        }
    }

    equipoActualPagos =
        equiposAsignadosPagos[0] ||
        null;
}

function puedeConsultarEquipo(
    equipo
) {
    if (!equipo) {
        return false;
    }

    if (
        usuarioActualPagos.rol === "admin"
    ) {
        return true;
    }

    const usuarioId =
        usuarioActualPagos.uid ||
        usuarioActualPagos.id ||
        "";

    return (
        equipo.responsableId ===
        usuarioId
    );
}

function crearSeccionPagos() {
    const contenidoEquipo =
        document.getElementById(
            "contenidoEquipo"
        );

    const panelJugadores =
        document.querySelector(
            ".panel-jugadores"
        );

    if (
        !contenidoEquipo ||
        !panelJugadores
    ) {
        setTimeout(
            crearSeccionPagos,
            250
        );

        return;
    }

    let seccion =
        document.getElementById(
            "panelFinancieroEquipo"
        );

    if (!seccion) {
        seccion =
            document.createElement(
                "section"
            );

        seccion.id =
            "panelFinancieroEquipo";

        seccion.className =
            "panel-financiero-equipo";

        panelJugadores.insertAdjacentElement(
            "beforebegin",
            seccion
        );
    }

    renderizarPanelFinanciero();
}

function renderizarPanelFinanciero() {
    const seccion =
        document.getElementById(
            "panelFinancieroEquipo"
        );

    if (!seccion) {
        return;
    }

    if (!equipoActualPagos) {
        seccion.innerHTML = `
            <div class="finanzas-vacio">
                <div class="finanzas-vacio-icono">
                    $
                </div>

                <div>
                    <strong>
                        Información financiera no disponible
                    </strong>

                    <p>
                        No encontramos un equipo disponible para consultar sus pagos.
                    </p>
                </div>
            </div>
        `;

        return;
    }

    const informacion =
        obtenerInformacionFinancieraEquipo(
            equipoActualPagos.id
        );

    const estado =
        obtenerEstadoFinanciero(
            informacion
        );

    seccion.innerHTML = `
        <div class="finanzas-header">
            <div>
                <span class="finanzas-mini">
                    ESTADO FINANCIERO
                </span>

                <h2>
                    Pagos de mi equipo
                </h2>

                <p>
                    Consulta los abonos registrados por la liga y el saldo actual de tu equipo.
                </p>
            </div>

            <span class="finanzas-estado ${estado.clase}">
                ${estado.texto}
            </span>
        </div>

        <div class="finanzas-equipo">
            <div class="finanzas-equipo-logo">
                ${obtenerLogoEquipo(
                    equipoActualPagos
                )}
            </div>

            <div>
                <span>
                    EQUIPO
                </span>

                <strong>
                    ${escaparHTML(
                        equipoActualPagos.nombre ||
                        "Equipo"
                    )}
                </strong>

                <small>
                    ${escaparHTML(
                        equipoActualPagos.categoriaNombre ||
                        "Sin categoría"
                    )}
                </small>
            </div>
        </div>

        <div class="finanzas-resumen">
            <article class="finanzas-resumen-card">
                <span>
                    Meta de temporada
                </span>

                <strong>
                    ${
                        informacion.metaConfigurada
                            ? formatoMoneda(
                                informacion.meta
                            )
                            : "Sin configurar"
                    }
                </strong>

                <small>
                    ${
                        temporadaActualPagos
                            ? escaparHTML(
                                temporadaActualPagos.nombre ||
                                "Temporada actual"
                            )
                            : "Temporada actual"
                    }
                </small>
            </article>

            <article class="finanzas-resumen-card">
                <span>
                    Total pagado
                </span>

                <strong>
                    ${formatoMoneda(
                        informacion.pagado
                    )}
                </strong>

                <small>
                    ${informacion.abonos.length}
                    ${
                        informacion.abonos.length === 1
                            ? "abono registrado"
                            : "abonos registrados"
                    }
                </small>
            </article>

            <article class="finanzas-resumen-card">
                <span>
                    Saldo pendiente
                </span>

                <strong>
                    ${
                        informacion.metaConfigurada
                            ? formatoMoneda(
                                informacion.saldo
                            )
                            : "-"
                    }
                </strong>

                <small>
                    ${
                        informacion.metaConfigurada
                            ? informacion.saldo <= 0
                                ? "Meta cubierta"
                                : "Pendiente por cubrir"
                            : "Esperando meta de la liga"
                    }
                </small>
            </article>
        </div>

        <div class="finanzas-aviso">
            <span>
                ℹ️
            </span>

            <div>
                <strong>
                    Información de consulta
                </strong>

                <p>
                    Los pagos son registrados por la administración de la liga. Si detectas un abono faltante o un dato incorrecto, comunícate con la administración.
                </p>
            </div>
        </div>

        <div class="finanzas-historial">
            <div class="finanzas-historial-header">
                <div>
                    <span>
                        HISTORIAL
                    </span>

                    <h3>
                        Abonos registrados
                    </h3>
                </div>

                <strong>
                    ${informacion.abonos.length}
                </strong>
            </div>

            <div
                id="listaPagosJefe"
                class="finanzas-lista"
            >
                ${crearHTMLHistorialPagos(
                    informacion.abonos
                )}
            </div>
        </div>
    `;
}

function obtenerInformacionFinancieraEquipo(
    equipoId
) {
    const registros =
        pagosEquipos.filter(
            pago =>
                pago.equipoId === equipoId &&
                perteneceTemporadaActual(
                    pago
                )
        );

    const abonos =
        registros
            .filter(
                registro =>
                    esRegistroAbono(
                        registro
                    )
            )
            .sort(
                ordenarPagosDescendente
            );

    const pagado =
        abonos.reduce(
            (
                acumulado,
                pago
            ) =>
                acumulado +
                obtenerMontoPago(
                    pago
                ),
            0
        );

    const meta =
        obtenerMetaEquipo(
            equipoId,
            registros
        );

    const metaConfigurada =
        Number.isFinite(meta) &&
        meta > 0;

    const saldo =
        metaConfigurada
            ? Math.max(
                0,
                meta - pagado
            )
            : null;

    return {
        registros,
        abonos,
        pagado,
        meta,
        metaConfigurada,
        saldo
    };
}

function obtenerMetaEquipo(
    equipoId,
    registros
) {
    const equipo =
        todosLosEquiposPagos.find(
            item =>
                item.id === equipoId
        );

    const posibles = [
        equipo?.metaPagoTemporada,
        equipo?.metaPago,
        equipo?.montoTemporada,
        equipo?.cuotaTemporada,
        configuracionPagos.metaPagoTemporada,
        configuracionPagos.metaPagoEquipos,
        configuracionPagos.metaPagoEquipo,
        configuracionPagos.montoPagoTemporada,
        configuracionPagos.cuotaTemporada,
        ...registros.map(
            registro =>
                registro.metaTemporada ??
                registro.metaPago ??
                registro.meta
        )
    ];

    for (
        const valor of posibles
    ) {
        const numero =
            convertirNumero(
                valor
            );

        if (
            Number.isFinite(numero) &&
            numero > 0
        ) {
            return numero;
        }
    }

    return null;
}

function perteneceTemporadaActual(
    pago
) {
    if (
        !temporadaActualPagos
    ) {
        return true;
    }

    const temporadaPago =
        pago.temporadaId ||
        pago.idTemporada ||
        "";

    if (!temporadaPago) {
        return true;
    }

    return (
        temporadaPago ===
        temporadaActualPagos.id
    );
}

function esRegistroAbono(
    registro
) {
    const estado =
        normalizarTexto(
            registro.estado ||
            ""
        );

    if (
        estado === "cancelado" ||
        estado === "cancelada" ||
        estado === "anulado" ||
        estado === "anulada"
    ) {
        return false;
    }

    const tipo =
        normalizarTexto(
            registro.tipo ||
            registro.movimiento ||
            registro.tipoMovimiento ||
            ""
        );

    if (
        tipo === "cancelacion" ||
        tipo === "anulacion"
    ) {
        return false;
    }

    return (
        obtenerMontoPago(
            registro
        ) > 0
    );
}

function obtenerMontoPago(
    pago
) {
    return Math.max(
        0,
        convertirNumero(
            pago.monto ??
            pago.cantidad ??
            pago.importe ??
            pago.abono ??
            pago.total ??
            0
        ) || 0
    );
}

function convertirNumero(
    valor
) {
    if (
        typeof valor === "number"
    ) {
        return valor;
    }

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return NaN;
    }

    const limpio =
        String(valor)
            .replace(/\$/g, "")
            .replace(/,/g, "")
            .trim();

    return Number(
        limpio
    );
}

function obtenerEstadoFinanciero(
    informacion
) {
    if (
        !informacion.metaConfigurada
    ) {
        return {
            texto:
                "SIN CONFIGURAR",
            clase:
                "sin-configurar"
        };
    }

    if (
        informacion.saldo <= 0
    ) {
        return {
            texto:
                "PAGADO",
            clase:
                "pagado"
        };
    }

    return {
        texto:
            "ADEUDO",
        clase:
            "adeudo"
    };
}

function crearHTMLHistorialPagos(
    abonos
) {
    if (!abonos.length) {
        return `
            <div class="finanzas-sin-pagos">
                <div>
                    $
                </div>

                <strong>
                    Sin pagos registrados
                </strong>

                <p>
                    Cuando la administración registre un abono aparecerá aquí.
                </p>
            </div>
        `;
    }

    return abonos.map(
        pago => {
            const fecha =
                obtenerFechaPago(
                    pago
                );

            const concepto =
                pago.concepto ||
                pago.descripcion ||
                pago.detalle ||
                "Abono de temporada";

            const referencia =
                pago.referencia ||
                pago.folio ||
                "";

            return `
                <article class="finanzas-pago-item">
                    <div class="finanzas-pago-icono">
                        $
                    </div>

                    <div class="finanzas-pago-info">
                        <strong>
                            ${escaparHTML(
                                concepto
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                fecha
                            )}
                        </span>

                        ${
                            referencia
                                ? `
                                    <small>
                                        Referencia: ${escaparHTML(
                                            referencia
                                        )}
                                    </small>
                                `
                                : ""
                        }
                    </div>

                    <div class="finanzas-pago-monto">
                        <span>
                            ABONO
                        </span>

                        <strong>
                            + ${formatoMoneda(
                                obtenerMontoPago(
                                    pago
                                )
                            )}
                        </strong>
                    </div>
                </article>
            `;
        }
    ).join("");
}

function obtenerFechaPago(
    pago
) {
    const posibles = [
        pago.fechaPago,
        pago.fecha,
        pago.creadoEn,
        pago.registradoEn,
        pago.createdAt
    ];

    for (
        const valor of posibles
    ) {
        const fecha =
            convertirFecha(
                valor
            );

        if (fecha) {
            return fecha.toLocaleDateString(
                "es-MX",
                {
                    day:
                        "2-digit",
                    month:
                        "long",
                    year:
                        "numeric"
                }
            );
        }
    }

    return "Fecha no disponible";
}

function convertirFecha(
    valor
) {
    if (!valor) {
        return null;
    }

    if (
        typeof valor?.toDate ===
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
        typeof valor === "object" &&
        Number.isFinite(
            valor.seconds
        )
    ) {
        return new Date(
            valor.seconds *
            1000
        );
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
        typeof valor === "string"
    ) {
        const fecha =
            new Date(
                valor.length === 10
                    ? `${valor}T12:00:00`
                    : valor
            );

        return Number.isNaN(
            fecha.getTime()
        )
            ? null
            : fecha;
    }

    return null;
}

function ordenarPagosDescendente(
    a,
    b
) {
    const fechaA =
        obtenerFechaOrdenable(
            a
        );

    const fechaB =
        obtenerFechaOrdenable(
            b
        );

    return (
        fechaB -
        fechaA
    );
}

function obtenerFechaOrdenable(
    pago
) {
    const posibles = [
        pago.fechaPago,
        pago.fecha,
        pago.creadoEn,
        pago.registradoEn,
        pago.createdAt
    ];

    for (
        const valor of posibles
    ) {
        const fecha =
            convertirFecha(
                valor
            );

        if (fecha) {
            return fecha.getTime();
        }
    }

    return 0;
}

function observarCambioEquipo() {
    let ultimoEquipoId =
        equipoActualPagos?.id ||
        "";

    const sincronizar = async () => {
        const parametros =
            new URLSearchParams(
                window.location.search
            );

        const equipoIdURL =
            parametros.get(
                "equipo"
            );

        if (
            !equipoIdURL ||
            equipoIdURL ===
            ultimoEquipoId
        ) {
            return;
        }

        const equipo =
            todosLosEquiposPagos.find(
                item =>
                    item.id ===
                    equipoIdURL
            );

        if (
            !equipo ||
            !puedeConsultarEquipo(
                equipo
            )
        ) {
            return;
        }

        ultimoEquipoId =
            equipo.id;

        equipoActualPagos =
            equipo;

        await recargarInformacionFinanciera();

        renderizarPanelFinanciero();
    };

    window.addEventListener(
        "popstate",
        sincronizar
    );

    setInterval(
        sincronizar,
        600
    );
}

async function recargarInformacionFinanciera() {
    await Promise.all([
        cargarConfiguracionPagos(),
        cargarTemporadaActualPagos(),
        cargarPagosEquipos()
    ]);
}

function obtenerLogoEquipo(
    equipo
) {
    if (
        equipo.logoUrl
    ) {
        return `
            <img
                src="${escaparHTML(
                    equipo.logoUrl
                )}"
                alt="${escaparHTML(
                    equipo.nombre ||
                    "Equipo"
                )}"
            >
        `;
    }

    return escaparHTML(
        obtenerInicial(
            equipo.nombre ||
            "E"
        )
    );
}

function obtenerInicial(
    texto
) {
    return String(
        texto ||
        "E"
    )
        .trim()
        .charAt(0)
        .toUpperCase() ||
        "E";
}

function formatoMoneda(
    cantidad
) {
    const numero =
        Number(
            cantidad
        );

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return "$0.00";
    }

    return new Intl.NumberFormat(
        "es-MX",
        {
            style:
                "currency",
            currency:
                "MXN",
            minimumFractionDigits:
                2,
            maximumFractionDigits:
                2
        }
    ).format(
        numero
    );
}

function normalizarTexto(
    valor
) {
    return String(
        valor ||
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();
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

function crearEstilosPagos() {
    if (
        document.getElementById(
            "estilosFinanzasJefe"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "estilosFinanzasJefe";

    style.textContent = `
        .panel-financiero-equipo{
            width:100%;
            box-sizing:border-box;
            margin:0 0 24px;
            padding:22px;
            border:1px solid rgba(186,166,118,.72);
            border-radius:22px;
            background:
                radial-gradient(circle at 92% 10%,rgba(211,161,59,.12),transparent 24%),
                linear-gradient(145deg,rgba(255,248,232,.98),rgba(244,232,197,.96));
            box-shadow:0 10px 28px rgba(55,43,20,.10),0 3px 8px rgba(55,43,20,.05);
        }

        .finanzas-header{
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:18px;
            margin-bottom:18px;
        }

        .finanzas-header > div:first-child{
            min-width:0;
        }

        .finanzas-mini{
            display:block;
            margin-bottom:4px;
            color:#b9542e;
            font-size:10px;
            font-weight:900;
            letter-spacing:.12em;
        }

        .finanzas-header h2{
            margin:0;
            color:#102b28;
            font-size:21px;
            line-height:1.15;
        }

        .finanzas-header p{
            margin:7px 0 0;
            color:#68746e;
            font-size:12px;
            line-height:1.5;
        }

        .finanzas-estado{
            flex:0 0 auto;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            min-height:34px;
            padding:0 13px;
            border-radius:999px;
            font-size:10px;
            font-weight:900;
            letter-spacing:.05em;
        }

        .finanzas-estado.pagado{
            border:1px solid rgba(47,113,76,.24);
            background:#dcebd8;
            color:#2f714c;
        }

        .finanzas-estado.adeudo{
            border:1px solid rgba(184,69,53,.24);
            background:#f3d6d0;
            color:#a43e30;
        }

        .finanzas-estado.sin-configurar{
            border:1px solid rgba(211,161,59,.32);
            background:#f0d79a;
            color:#785a18;
        }

        .finanzas-equipo{
            display:flex;
            align-items:center;
            gap:12px;
            margin-bottom:17px;
            padding:13px 15px;
            border:1px solid rgba(186,166,118,.45);
            border-radius:15px;
            background:rgba(255,255,255,.30);
        }

        .finanzas-equipo-logo{
            width:48px;
            height:48px;
            flex:0 0 48px;
            display:grid;
            place-items:center;
            overflow:hidden;
            border-radius:13px;
            background:#0b756d;
            color:#fff;
            font-size:17px;
            font-weight:900;
        }

        .finanzas-equipo-logo img{
            width:100%;
            height:100%;
            object-fit:cover;
        }

        .finanzas-equipo > div:last-child{
            display:flex;
            min-width:0;
            flex-direction:column;
            gap:2px;
        }

        .finanzas-equipo span{
            color:#b9542e;
            font-size:9px;
            font-weight:900;
            letter-spacing:.09em;
        }

        .finanzas-equipo strong{
            overflow:hidden;
            color:#102b28;
            font-size:14px;
            text-overflow:ellipsis;
            white-space:nowrap;
        }

        .finanzas-equipo small{
            color:#68746e;
            font-size:10px;
            font-weight:700;
        }

        .finanzas-resumen{
            display:grid;
            grid-template-columns:repeat(3,minmax(0,1fr));
            gap:12px;
            margin-bottom:17px;
        }

        .finanzas-resumen-card{
            min-width:0;
            padding:16px;
            border:1px solid rgba(186,166,118,.52);
            border-radius:16px;
            background:rgba(255,248,232,.68);
        }

        .finanzas-resumen-card > span{
            display:block;
            margin-bottom:7px;
            color:#68746e;
            font-size:10px;
            font-weight:800;
            text-transform:uppercase;
            letter-spacing:.04em;
        }

        .finanzas-resumen-card > strong{
            display:block;
            overflow:hidden;
            color:#102b28;
            font-size:20px;
            line-height:1.1;
            text-overflow:ellipsis;
        }

        .finanzas-resumen-card > small{
            display:block;
            margin-top:6px;
            color:#68746e;
            font-size:10px;
            line-height:1.35;
        }

        .finanzas-aviso{
            display:flex;
            align-items:flex-start;
            gap:11px;
            margin-bottom:19px;
            padding:13px 14px;
            border:1px solid rgba(25,126,152,.20);
            border-radius:14px;
            background:rgba(25,126,152,.08);
        }

        .finanzas-aviso > span{
            flex:0 0 auto;
            display:grid;
            place-items:center;
            width:28px;
            height:28px;
            border-radius:50%;
            background:#197e98;
            color:#fff;
            font-size:12px;
            font-weight:900;
        }

        .finanzas-aviso strong{
            display:block;
            margin-bottom:3px;
            color:#102b28;
            font-size:11px;
        }

        .finanzas-aviso p{
            margin:0;
            color:#52645f;
            font-size:10px;
            line-height:1.45;
        }

        .finanzas-historial{
            overflow:hidden;
            border:1px solid rgba(186,166,118,.52);
            border-radius:17px;
            background:rgba(255,248,232,.58);
        }

        .finanzas-historial-header{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            padding:14px 16px;
            border-bottom:1px solid rgba(186,166,118,.38);
        }

        .finanzas-historial-header span{
            display:block;
            margin-bottom:2px;
            color:#b9542e;
            font-size:9px;
            font-weight:900;
            letter-spacing:.10em;
        }

        .finanzas-historial-header h3{
            margin:0;
            color:#102b28;
            font-size:14px;
        }

        .finanzas-historial-header > strong{
            display:grid;
            place-items:center;
            min-width:31px;
            height:31px;
            padding:0 7px;
            border-radius:10px;
            background:#d7ece6;
            color:#07574f;
            font-size:11px;
        }

        .finanzas-lista{
            max-height:390px;
            overflow-y:auto;
        }

        .finanzas-pago-item{
            display:grid;
            grid-template-columns:42px minmax(0,1fr) auto;
            align-items:center;
            gap:11px;
            padding:13px 16px;
            border-bottom:1px solid rgba(186,166,118,.28);
        }

        .finanzas-pago-item:last-child{
            border-bottom:0;
        }

        .finanzas-pago-icono{
            width:38px;
            height:38px;
            display:grid;
            place-items:center;
            border-radius:11px;
            background:#0b756d;
            color:#fff;
            font-size:15px;
            font-weight:900;
        }

        .finanzas-pago-info{
            min-width:0;
        }

        .finanzas-pago-info strong{
            display:block;
            overflow:hidden;
            color:#102b28;
            font-size:11px;
            text-overflow:ellipsis;
            white-space:nowrap;
        }

        .finanzas-pago-info span,
        .finanzas-pago-info small{
            display:block;
            margin-top:3px;
            color:#68746e;
            font-size:9px;
        }

        .finanzas-pago-monto{
            text-align:right;
        }

        .finanzas-pago-monto span{
            display:block;
            margin-bottom:3px;
            color:#68746e;
            font-size:8px;
            font-weight:900;
            letter-spacing:.06em;
        }

        .finanzas-pago-monto strong{
            color:#2f714c;
            font-size:12px;
        }

        .finanzas-sin-pagos{
            display:flex;
            min-height:150px;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            padding:24px;
            text-align:center;
        }

        .finanzas-sin-pagos > div{
            width:43px;
            height:43px;
            display:grid;
            place-items:center;
            margin-bottom:10px;
            border-radius:50%;
            background:#d7ece6;
            color:#07574f;
            font-size:17px;
            font-weight:900;
        }

        .finanzas-sin-pagos strong{
            color:#102b28;
            font-size:12px;
        }

        .finanzas-sin-pagos p{
            max-width:320px;
            margin:5px 0 0;
            color:#68746e;
            font-size:10px;
            line-height:1.45;
        }

        .finanzas-vacio{
            display:flex;
            align-items:center;
            gap:13px;
            min-height:90px;
        }

        .finanzas-vacio-icono{
            width:48px;
            height:48px;
            flex:0 0 48px;
            display:grid;
            place-items:center;
            border-radius:14px;
            background:#d7ece6;
            color:#07574f;
            font-size:17px;
            font-weight:900;
        }

        .finanzas-vacio strong{
            display:block;
            color:#102b28;
            font-size:13px;
        }

        .finanzas-vacio p{
            margin:4px 0 0;
            color:#68746e;
            font-size:10px;
        }

        @media(max-width:760px){
            .panel-financiero-equipo{
                margin-bottom:16px;
                padding:16px;
                border-radius:18px;
            }

            .finanzas-header{
                flex-direction:column;
                gap:10px;
            }

            .finanzas-estado{
                align-self:flex-start;
            }

            .finanzas-resumen{
                grid-template-columns:1fr;
                gap:9px;
            }

            .finanzas-resumen-card{
                padding:13px 14px;
            }

            .finanzas-resumen-card > strong{
                font-size:18px;
            }

            .finanzas-pago-item{
                grid-template-columns:38px minmax(0,1fr);
                padding:12px;
            }

            .finanzas-pago-icono{
                width:36px;
                height:36px;
            }

            .finanzas-pago-monto{
                grid-column:2;
                text-align:left;
            }
        }

        @media(max-width:430px){
            .panel-financiero-equipo{
                padding:14px;
            }

            .finanzas-header h2{
                font-size:18px;
            }

            .finanzas-equipo{
                padding:11px;
            }

            .finanzas-equipo-logo{
                width:43px;
                height:43px;
                flex-basis:43px;
            }

            .finanzas-aviso{
                padding:11px;
            }

            .finanzas-historial-header{
                padding:12px;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}