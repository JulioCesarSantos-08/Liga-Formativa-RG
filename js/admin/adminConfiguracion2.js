import {
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    protegerPagina
} from "../roles.js";

import {
    registrarAuditoria
} from "../auditoria.js";


const CONFIGURACION_ID = "general";


const metaPagoTemporada =
    document.getElementById("metaPagoTemporada");

const btnGuardarMetaPago =
    document.getElementById("btnGuardarMetaPago");

const resumenMetaPago =
    document.getElementById("resumenMetaPago");

const resumenEquiposPagados =
    document.getElementById("resumenEquiposPagados");

const resumenEquiposAdeudo =
    document.getElementById("resumenEquiposAdeudo");

const buscarEquipoPago =
    document.getElementById("buscarEquipoPago");

const listaPagosEquipos =
    document.getElementById("listaPagosEquipos");

const modalPagoEquipo =
    document.getElementById("modalPagoEquipo");

const btnCerrarPagoEquipo =
    document.getElementById("btnCerrarPagoEquipo");

const pagoEquipoTitulo =
    document.getElementById("pagoEquipoTitulo");

const pagoEquipoSubtitulo =
    document.getElementById("pagoEquipoSubtitulo");

const pagoEquipoMeta =
    document.getElementById("pagoEquipoMeta");

const pagoEquipoPagado =
    document.getElementById("pagoEquipoPagado");

const pagoEquipoSaldo =
    document.getElementById("pagoEquipoSaldo");

const pagoEquipoEstado =
    document.getElementById("pagoEquipoEstado");

const formRegistrarPago =
    document.getElementById("formRegistrarPago");

const pagoCantidad =
    document.getElementById("pagoCantidad");

const pagoFecha =
    document.getElementById("pagoFecha");

const pagoConcepto =
    document.getElementById("pagoConcepto");

const btnRegistrarPago =
    document.getElementById("btnRegistrarPago");

const totalMovimientosPago =
    document.getElementById("totalMovimientosPago");

const historialPagosEquipo =
    document.getElementById("historialPagosEquipo");


let usuarioActual = null;

let temporadaActual = null;

let configuracion = {};

let equipos = [];

let pagos = [];

let equipoSeleccionado = null;

let iniciado = false;


const usuario =
    await protegerPagina([
        "admin"
    ]);


if (usuario) {

    usuarioActual =
        usuario;

    activarEventos();

    iniciarPagos();

}


function activarEventos() {

    if (btnGuardarMetaPago) {

        btnGuardarMetaPago.addEventListener(
            "click",
            guardarMetaPago
        );

    }


    if (buscarEquipoPago) {

        buscarEquipoPago.addEventListener(
            "input",
            renderizarEquiposPagos
        );

    }


    if (btnCerrarPagoEquipo) {

        btnCerrarPagoEquipo.addEventListener(
            "click",
            cerrarModalPago
        );

    }


    if (modalPagoEquipo) {

        modalPagoEquipo.addEventListener(
            "click",
            evento => {

                if (
                    evento.target ===
                    modalPagoEquipo
                ) {

                    cerrarModalPago();

                }

            }
        );

    }


    if (formRegistrarPago) {

        formRegistrarPago.addEventListener(
            "submit",
            registrarPago
        );

    }


    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key === "Escape" &&
                modalPagoEquipo &&
                !modalPagoEquipo.classList.contains(
                    "oculto"
                )
            ) {

                cerrarModalPago();

            }

        }
    );

}


async function iniciarPagos() {

    if (iniciado) {
        return;
    }


    iniciado =
        true;


    try {

        await Promise.all([
            cargarTemporada(),
            cargarEquipos(),
            cargarConfiguracion(),
            cargarPagos()
        ]);


        renderizarMeta();

        renderizarResumenPagos();

        renderizarEquiposPagos();

        establecerFechaActual();

    } catch (error) {

        console.error(
            "Error cargando módulo de pagos:",
            error
        );


        iniciado =
            false;


        mostrarToastLocal(
            "error",
            "No se pudieron cargar los pagos",
            error.message ||
            "Ocurrió un problema al consultar la información financiera."
        );

    }

}


async function cargarTemporada() {

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

}


async function cargarEquipos() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );


    equipos =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            )
            .sort(
                (a, b) =>
                    String(
                        a.nombre ||
                        ""
                    ).localeCompare(
                        String(
                            b.nombre ||
                            ""
                        ),
                        "es"
                    )
            );

}


async function cargarConfiguracion() {

    const referencia =
        doc(
            db,
            "configuracionLiga",
            CONFIGURACION_ID
        );


    const snapshot =
        await getDoc(
            referencia
        );


    if (snapshot.exists()) {

        configuracion = {
            id: snapshot.id,
            ...snapshot.data()
        };

        return;

    }


    configuracion = {};


    await setDoc(
        referencia,
        {
            creadoEn:
                serverTimestamp(),

            actualizadoEn:
                serverTimestamp(),

            actualizadoPor:
                obtenerUsuarioId(),

            actualizadoPorNombre:
                obtenerNombreUsuario()
        },
        {
            merge: true
        }
    );

}


async function cargarPagos() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "pagosEquipos"
            )
        );


    pagos =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

}


function obtenerMetaActual() {

    if (!temporadaActual) {

        return null;

    }


    const metas =
        configuracion.metasPagoTemporada;


    if (
        metas &&
        typeof metas === "object" &&
        !Array.isArray(
            metas
        )
    ) {

        const valor =
            Number(
                metas[
                    temporadaActual.id
                ]
            );


        if (
            Number.isFinite(
                valor
            ) &&
            valor >= 0
        ) {

            return valor;

        }

    }


    if (
        configuracion.metaPagoTemporadaId ===
        temporadaActual.id
    ) {

        const valor =
            Number(
                configuracion.metaPagoTemporada
            );


        if (
            Number.isFinite(
                valor
            ) &&
            valor >= 0
        ) {

            return valor;

        }

    }


    return null;

}


function renderizarMeta() {

    if (!metaPagoTemporada) {
        return;
    }


    const meta =
        obtenerMetaActual();


    if (meta === null) {

        metaPagoTemporada.value =
            "";

        if (resumenMetaPago) {

            resumenMetaPago.textContent =
                "No configurada";

        }

        return;

    }


    metaPagoTemporada.value =
        String(
            meta
        );


    if (resumenMetaPago) {

        resumenMetaPago.textContent =
            formatearDinero(
                meta
            );

    }

}


async function guardarMetaPago() {

    if (!temporadaActual) {

        mostrarToastLocal(
            "error",
            "Sin temporada activa",
            "Primero debes crear o activar una temporada."
        );

        return;

    }


    const texto =
        String(
            metaPagoTemporada?.value ||
            ""
        ).trim();


    if (!texto) {

        mostrarToastLocal(
            "error",
            "Escribe una cantidad",
            "Indica la meta total que deberá cubrir cada equipo."
        );

        return;

    }


    const cantidad =
        Number(
            texto
        );


    if (
        !Number.isFinite(
            cantidad
        ) ||
        cantidad <= 0
    ) {

        mostrarToastLocal(
            "error",
            "Cantidad inválida",
            "La meta de pago debe ser mayor a $0."
        );

        return;

    }


    if (cantidad > 10000000) {

        mostrarToastLocal(
            "error",
            "Cantidad demasiado alta",
            "Revisa la cantidad escrita antes de continuar."
        );

        return;

    }


    btnGuardarMetaPago.disabled =
        true;


    const textoOriginal =
        btnGuardarMetaPago.textContent;


    btnGuardarMetaPago.textContent =
        "Guardando...";


    try {

        const metasActuales =
            configuracion.metasPagoTemporada &&
            typeof configuracion.metasPagoTemporada ===
                "object" &&
            !Array.isArray(
                configuracion.metasPagoTemporada
            )
                ? {
                    ...configuracion.metasPagoTemporada
                }
                : {};


        metasActuales[
            temporadaActual.id
        ] =
            cantidad;


        await setDoc(
            doc(
                db,
                "configuracionLiga",
                CONFIGURACION_ID
            ),
            {
                metaPagoTemporada:
                    cantidad,

                metaPagoTemporadaId:
                    temporadaActual.id,

                metaPagoTemporadaNombre:
                    obtenerNombreTemporada(),

                metasPagoTemporada:
                    metasActuales,

                metaPagoActualizadaEn:
                    serverTimestamp(),

                metaPagoActualizadaPor:
                    obtenerUsuarioId(),

                metaPagoActualizadaPorNombre:
                    obtenerNombreUsuario(),

                actualizadoEn:
                    serverTimestamp()
            },
            {
                merge: true
            }
        );


        configuracion.metaPagoTemporada =
            cantidad;

        configuracion.metaPagoTemporadaId =
            temporadaActual.id;

        configuracion.metaPagoTemporadaNombre =
            obtenerNombreTemporada();

        configuracion.metasPagoTemporada =
            metasActuales;


        await registrarAuditoria({
            usuarioId:
                obtenerUsuarioId(),

            usuarioNombre:
                obtenerNombreUsuario(),

            usuarioRol:
                usuarioActual?.rol ||
                "admin",

            modulo:
                "CONFIGURACIÓN - PAGOS",

            accion:
                "META DE PAGO ACTUALIZADA",

            descripcion:
                `Se estableció una meta de ${formatearDinero(cantidad)} por equipo para la temporada ${obtenerNombreTemporada()}.`,

            entidadTipo:
                "configuracionLiga",

            entidadId:
                CONFIGURACION_ID,

            entidadNombre:
                obtenerNombreTemporada()
        });


        renderizarMeta();

        renderizarResumenPagos();

        renderizarEquiposPagos();


        if (
            equipoSeleccionado &&
            modalPagoEquipo &&
            !modalPagoEquipo.classList.contains(
                "oculto"
            )
        ) {

            renderizarModalPago();

        }


        mostrarToastLocal(
            "exito",
            "Meta actualizada",
            `La meta por equipo quedó establecida en ${formatearDinero(cantidad)}.`
        );

    } catch (error) {

        console.error(
            "Error guardando meta de pago:",
            error
        );


        mostrarToastLocal(
            "error",
            "No se pudo guardar",
            error.message ||
            "Ocurrió un problema al guardar la meta de pago."
        );

    } finally {

        btnGuardarMetaPago.disabled =
            false;


        btnGuardarMetaPago.textContent =
            textoOriginal;

    }

}


function obtenerPagosTemporada() {

    if (!temporadaActual) {

        return [];

    }


    return pagos.filter(
        pago =>
            String(
                pago.temporadaId ||
                ""
            ) ===
            String(
                temporadaActual.id
            )
    );

}


function obtenerPagosEquipo(
    equipoId
) {

    return obtenerPagosTemporada()
        .filter(
            pago =>
                String(
                    pago.equipoId ||
                    ""
                ) ===
                String(
                    equipoId
                )
        );

}


function obtenerTotalPagado(
    equipoId
) {

    return obtenerPagosEquipo(
        equipoId
    ).reduce(
        (total, pago) => {

            const cantidad =
                Number(
                    pago.cantidad
                );


            return total +
                (
                    Number.isFinite(
                        cantidad
                    )
                        ? cantidad
                        : 0
                );

        },
        0
    );

}


function obtenerEstadoFinanciero(
    equipoId
) {

    const meta =
        obtenerMetaActual();


    const pagado =
        obtenerTotalPagado(
            equipoId
        );


    if (meta === null) {

        return {
            estado:
                "sin_configurar",

            texto:
                "SIN CONFIGURAR",

            clase:
                "sin-configurar",

            meta:
                null,

            pagado,

            saldo:
                null
        };

    }


    const saldo =
        Math.max(
            meta - pagado,
            0
        );


    if (pagado >= meta) {

        return {
            estado:
                "pagado",

            texto:
                "PAGADO",

            clase:
                "pagado",

            meta,

            pagado,

            saldo:
                0
        };

    }


    return {
        estado:
            "adeudo",

        texto:
            "ADEUDO",

        clase:
            "adeudo",

        meta,

        pagado,

        saldo
    };

}


function renderizarResumenPagos() {

    const meta =
        obtenerMetaActual();


    if (resumenMetaPago) {

        resumenMetaPago.textContent =
            meta === null
                ? "No configurada"
                : formatearDinero(
                    meta
                );

    }


    if (meta === null) {

        if (resumenEquiposPagados) {

            resumenEquiposPagados.textContent =
                "0";

        }


        if (resumenEquiposAdeudo) {

            resumenEquiposAdeudo.textContent =
                "0";

        }

        return;

    }


    let pagados =
        0;

    let adeudo =
        0;


    equipos.forEach(
        equipo => {

            const estado =
                obtenerEstadoFinanciero(
                    equipo.id
                );


            if (
                estado.estado ===
                "pagado"
            ) {

                pagados +=
                    1;

            } else if (
                estado.estado ===
                "adeudo"
            ) {

                adeudo +=
                    1;

            }

        }
    );


    if (resumenEquiposPagados) {

        resumenEquiposPagados.textContent =
            String(
                pagados
            );

    }


    if (resumenEquiposAdeudo) {

        resumenEquiposAdeudo.textContent =
            String(
                adeudo
            );

    }

}


function renderizarEquiposPagos() {

    if (!listaPagosEquipos) {
        return;
    }


    const busqueda =
        normalizarTexto(
            buscarEquipoPago?.value ||
            ""
        );


    const lista =
        equipos.filter(
            equipo => {

                const texto =
                    normalizarTexto(
                        [
                            equipo.nombre,
                            equipo.categoriaNombre,
                            equipo.comunidad,
                            equipo.club
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                " "
                            )
                    );


                return texto.includes(
                    busqueda
                );

            }
        );


    listaPagosEquipos.innerHTML =
        "";


    if (!lista.length) {

        listaPagosEquipos.innerHTML =
            crearMensajeVacio(
                busqueda
                    ? "No se encontraron equipos con esa búsqueda."
                    : "No hay equipos registrados."
            );

        return;

    }


    lista.forEach(
        equipo => {

            const estado =
                obtenerEstadoFinanciero(
                    equipo.id
                );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "pago-equipo-item";


            const logo =
                obtenerLogoEquipo(
                    equipo
                );


            const inicial =
                obtenerInicial(
                    equipo.nombre ||
                    "E"
                );


            const metaTexto =
                estado.meta === null
                    ? "No configurada"
                    : formatearDinero(
                        estado.meta
                    );


            const saldoTexto =
                estado.saldo === null
                    ? "-"
                    : formatearDinero(
                        estado.saldo
                    );


            item.innerHTML = `
                <div class="pago-equipo-identidad">
                    <div class="pago-equipo-logo">
                        ${
                            logo
                                ? `<img src="${escaparAtributo(logo)}" alt="">`
                                : escaparHtml(inicial)
                        }
                    </div>

                    <div class="pago-equipo-nombre">
                        <strong>
                            ${escaparHtml(equipo.nombre || "Equipo")}
                        </strong>

                        <span>
                            ${escaparHtml(equipo.categoriaNombre || "Sin categoría")}
                        </span>
                    </div>
                </div>

                <div class="pago-equipo-dato">
                    <span>Meta</span>
                    <strong>${escaparHtml(metaTexto)}</strong>
                </div>

                <div class="pago-equipo-dato">
                    <span>Pagado</span>
                    <strong>${escaparHtml(formatearDinero(estado.pagado))}</strong>
                </div>

                <div class="pago-equipo-dato">
                    <span>Saldo</span>
                    <strong>${escaparHtml(saldoTexto)}</strong>
                </div>

                <div>
                    <span class="estado-pago ${escaparAtributo(estado.clase)}">
                        ${escaparHtml(estado.texto)}
                    </span>
                </div>

                <button
                    class="btn-ver-pagos"
                    type="button"
                >
                    Ver pagos
                </button>
            `;


            item
                .querySelector(
                    ".btn-ver-pagos"
                )
                .addEventListener(
                    "click",
                    () =>
                        abrirModalPago(
                            equipo
                        )
                );


            listaPagosEquipos.appendChild(
                item
            );

        }
    );

}


function abrirModalPago(
    equipo
) {

    if (!modalPagoEquipo) {
        return;
    }


    equipoSeleccionado =
        equipo;


    formRegistrarPago?.reset();

    establecerFechaActual();

    renderizarModalPago();


    modalPagoEquipo.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function renderizarModalPago() {

    if (!equipoSeleccionado) {
        return;
    }


    const estado =
        obtenerEstadoFinanciero(
            equipoSeleccionado.id
        );


    if (pagoEquipoTitulo) {

        pagoEquipoTitulo.textContent =
            equipoSeleccionado.nombre ||
            "Equipo";

    }


    if (pagoEquipoSubtitulo) {

        pagoEquipoSubtitulo.textContent =
            equipoSeleccionado.categoriaNombre
                ? `Categoría ${equipoSeleccionado.categoriaNombre}`
                : "Registra y consulta los pagos de este equipo.";

    }


    if (pagoEquipoMeta) {

        pagoEquipoMeta.textContent =
            estado.meta === null
                ? "NO CONFIGURADA"
                : formatearDinero(
                    estado.meta
                );

    }


    if (pagoEquipoPagado) {

        pagoEquipoPagado.textContent =
            formatearDinero(
                estado.pagado
            );

    }


    if (pagoEquipoSaldo) {

        pagoEquipoSaldo.textContent =
            estado.saldo === null
                ? "-"
                : formatearDinero(
                    estado.saldo
                );

    }


    if (pagoEquipoEstado) {

        pagoEquipoEstado.textContent =
            estado.texto;

    }


    renderizarHistorialPagos();

}


function renderizarHistorialPagos() {

    if (
        !equipoSeleccionado ||
        !historialPagosEquipo
    ) {

        return;

    }


    const lista =
        obtenerPagosEquipo(
            equipoSeleccionado.id
        )
            .slice()
            .sort(
                (a, b) =>
                    obtenerTiempoPago(
                        b
                    ) -
                    obtenerTiempoPago(
                        a
                    )
            );


    if (totalMovimientosPago) {

        totalMovimientosPago.textContent =
            `${lista.length} movimiento${lista.length === 1 ? "" : "s"}`;

    }


    historialPagosEquipo.innerHTML =
        "";


    if (!lista.length) {

        historialPagosEquipo.innerHTML =
            crearMensajeVacio(
                "Este equipo todavía no tiene pagos registrados en la temporada."
            );

        return;

    }


    lista.forEach(
        pago => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "historial-pago-item";


            const fecha =
                formatearFecha(
                    pago.fechaPago ||
                    pago.fecha
                );


            const concepto =
                pago.concepto ||
                "Abono";


            const registradoPor =
                pago.registradoPorNombre ||
                pago.creadoPorNombre ||
                "Administrador";


            item.innerHTML = `
                <div class="historial-pago-fecha">
                    ${escaparHtml(fecha)}
                </div>

                <div class="historial-pago-concepto">
                    <strong>
                        ${escaparHtml(concepto)}
                    </strong>

                    <span>
                        Registrado por ${escaparHtml(registradoPor)}
                    </span>
                </div>

                <div class="historial-pago-cantidad">
                    + ${escaparHtml(formatearDinero(pago.cantidad))}
                </div>
            `;


            historialPagosEquipo.appendChild(
                item
            );

        }
    );

}


async function registrarPago(
    evento
) {

    evento.preventDefault();


    if (!equipoSeleccionado) {

        mostrarToastLocal(
            "error",
            "Equipo no seleccionado",
            "Selecciona un equipo antes de registrar el pago."
        );

        return;

    }


    if (!temporadaActual) {

        mostrarToastLocal(
            "error",
            "Sin temporada activa",
            "No es posible registrar pagos sin una temporada."
        );

        return;

    }


    const cantidad =
        Number(
            pagoCantidad?.value
        );


    const fecha =
        String(
            pagoFecha?.value ||
            ""
        ).trim();


    const concepto =
        String(
            pagoConcepto?.value ||
            ""
        ).trim();


    if (
        !Number.isFinite(
            cantidad
        ) ||
        cantidad <= 0
    ) {

        mostrarToastLocal(
            "error",
            "Cantidad inválida",
            "Escribe una cantidad de pago mayor a $0."
        );

        return;

    }


    if (cantidad > 10000000) {

        mostrarToastLocal(
            "error",
            "Cantidad demasiado alta",
            "Revisa la cantidad antes de registrar el pago."
        );

        return;

    }


    if (!fecha) {

        mostrarToastLocal(
            "error",
            "Fecha requerida",
            "Selecciona la fecha en la que se realizó el pago."
        );

        return;

    }


    if (!concepto) {

        mostrarToastLocal(
            "error",
            "Concepto requerido",
            "Escribe el concepto o motivo del pago."
        );

        return;

    }


    const totalAntes =
        obtenerTotalPagado(
            equipoSeleccionado.id
        );


    const meta =
        obtenerMetaActual();


    btnRegistrarPago.disabled =
        true;


    const textoOriginal =
        btnRegistrarPago.textContent;


    btnRegistrarPago.textContent =
        "Registrando...";


    try {

        const datos = {
            equipoId:
                equipoSeleccionado.id,

            equipoNombre:
                equipoSeleccionado.nombre ||
                "Equipo",

            categoriaId:
                equipoSeleccionado.categoriaId ||
                "",

            categoriaNombre:
                equipoSeleccionado.categoriaNombre ||
                "",

            temporadaId:
                temporadaActual.id,

            temporadaNombre:
                obtenerNombreTemporada(),

            cantidad,

            fechaPago:
                fecha,

            concepto,

            metaTemporadaAlRegistrar:
                meta,

            totalAnterior:
                totalAntes,

            totalPosterior:
                totalAntes + cantidad,

            registradoPor:
                obtenerUsuarioId(),

            registradoPorNombre:
                obtenerNombreUsuario(),

            registradoPorRol:
                usuarioActual?.rol ||
                "admin",

            creadoEn:
                serverTimestamp()
        };


        const referencia =
            await addDoc(
                collection(
                    db,
                    "pagosEquipos"
                ),
                datos
            );


        pagos.push({
            id:
                referencia.id,
            ...datos,
            creadoEn:
                new Date()
        });


        await registrarAuditoria({
            usuarioId:
                obtenerUsuarioId(),

            usuarioNombre:
                obtenerNombreUsuario(),

            usuarioRol:
                usuarioActual?.rol ||
                "admin",

            modulo:
                "CONFIGURACIÓN - PAGOS",

            accion:
                "PAGO REGISTRADO",

            descripcion:
                `Se registró un pago de ${formatearDinero(cantidad)} para ${equipoSeleccionado.nombre || "el equipo"} por concepto de "${concepto}".`,

            entidadTipo:
                "pagoEquipo",

            entidadId:
                referencia.id,

            entidadNombre:
                equipoSeleccionado.nombre ||
                "Equipo"
        });


        formRegistrarPago.reset();

        establecerFechaActual();

        renderizarResumenPagos();

        renderizarEquiposPagos();

        renderizarModalPago();


        const nuevoEstado =
            obtenerEstadoFinanciero(
                equipoSeleccionado.id
            );


        if (
            nuevoEstado.estado ===
            "pagado"
        ) {

            mostrarToastLocal(
                "exito",
                "Pago registrado",
                `${equipoSeleccionado.nombre || "El equipo"} ya se encuentra PAGADO.`
            );

        } else {

            mostrarToastLocal(
                "exito",
                "Pago registrado",
                `Se registró correctamente el abono de ${formatearDinero(cantidad)}.`
            );

        }

    } catch (error) {

        console.error(
            "Error registrando pago:",
            error
        );


        mostrarToastLocal(
            "error",
            "No se pudo registrar",
            error.message ||
            "Ocurrió un problema al guardar el pago."
        );

    } finally {

        btnRegistrarPago.disabled =
            false;


        btnRegistrarPago.textContent =
            textoOriginal;

    }

}


function cerrarModalPago() {

    if (!modalPagoEquipo) {
        return;
    }


    modalPagoEquipo.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";


    equipoSeleccionado =
        null;


    formRegistrarPago?.reset();

    establecerFechaActual();

}


function establecerFechaActual() {

    if (!pagoFecha) {
        return;
    }


    const ahora =
        new Date();


    const anio =
        ahora.getFullYear();


    const mes =
        String(
            ahora.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            ahora.getDate()
        ).padStart(
            2,
            "0"
        );


    pagoFecha.value =
        `${anio}-${mes}-${dia}`;

}


function obtenerNombreTemporada() {

    if (!temporadaActual) {

        return "Sin temporada";

    }


    return temporadaActual.nombre ||
        temporadaActual.temporada ||
        temporadaActual.titulo ||
        "Temporada actual";

}


function obtenerUsuarioId() {

    return usuarioActual?.uid ||
        usuarioActual?.id ||
        "";

}


function obtenerNombreUsuario() {

    return usuarioActual?.nombre ||
        usuarioActual?.nombreCompleto ||
        usuarioActual?.email ||
        "Administrador";

}


function obtenerLogoEquipo(
    equipo
) {

    return equipo?.logoUrl ||
        equipo?.logo ||
        equipo?.escudoUrl ||
        equipo?.escudo ||
        "";

}


function obtenerInicial(
    texto
) {

    const limpio =
        String(
            texto ||
            ""
        ).trim();


    if (!limpio) {

        return "E";

    }


    return limpio
        .charAt(
            0
        )
        .toUpperCase();

}


function obtenerTiempoPago(
    pago
) {

    const fecha =
        String(
            pago.fechaPago ||
            pago.fecha ||
            ""
        );


    if (fecha) {

        const tiempo =
            new Date(
                `${fecha}T12:00:00`
            ).getTime();


        if (
            Number.isFinite(
                tiempo
            )
        ) {

            return tiempo;

        }

    }


    const creadoEn =
        pago.creadoEn;


    if (
        creadoEn &&
        typeof creadoEn.toDate ===
            "function"
    ) {

        return creadoEn
            .toDate()
            .getTime();

    }


    if (
        creadoEn instanceof
        Date
    ) {

        return creadoEn.getTime();

    }


    return 0;

}


function formatearFecha(
    valor
) {

    if (!valor) {

        return "Sin fecha";

    }


    let fecha =
        null;


    if (
        valor &&
        typeof valor.toDate ===
            "function"
    ) {

        fecha =
            valor.toDate();

    } else {

        const texto =
            String(
                valor
            );


        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                texto
            )
        ) {

            fecha =
                new Date(
                    `${texto}T12:00:00`
                );

        } else {

            fecha =
                new Date(
                    texto
                );

        }

    }


    if (
        !fecha ||
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return String(
            valor
        );

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


function formatearDinero(
    valor
) {

    const numero =
        Number(
            valor
        );


    const seguro =
        Number.isFinite(
            numero
        )
            ? numero
            : 0;


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
        seguro
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
        .toLowerCase()
        .trim();

}


function crearMensajeVacio(
    mensaje
) {

    return `
        <div class="lista-vacia">
            ${escaparHtml(mensaje)}
        </div>
    `;

}


function escaparHtml(
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


function escaparAtributo(
    valor
) {

    return escaparHtml(
        valor
    );

}


function mostrarToastLocal(
    tipo,
    titulo,
    texto
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const toastIcono =
        document.getElementById(
            "toastIcono"
        );


    const toastTitulo =
        document.getElementById(
            "toastTitulo"
        );


    const toastTexto =
        document.getElementById(
            "toastTexto"
        );


    if (
        !toast ||
        !toastTitulo ||
        !toastTexto
    ) {

        if (
            tipo ===
            "error"
        ) {

            console.error(
                titulo,
                texto
            );

        } else {

            console.log(
                titulo,
                texto
            );

        }

        return;

    }


    toast.classList.remove(
        "oculto",
        "exito",
        "error"
    );


    toast.classList.add(
        tipo === "error"
            ? "error"
            : "exito"
    );


    if (toastIcono) {

        toastIcono.textContent =
            tipo === "error"
                ? "!"
                : "✓";

    }


    toastTitulo.textContent =
        titulo;


    toastTexto.textContent =
        texto;


    window.clearTimeout(
        mostrarToastLocal.timer
    );


    mostrarToastLocal.timer =
        window.setTimeout(
            () => {

                toast.classList.add(
                    "oculto"
                );

            },
            3500
        );

}