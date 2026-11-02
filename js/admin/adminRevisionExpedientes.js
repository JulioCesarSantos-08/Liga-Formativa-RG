import { protegerPagina } from "../roles.js";

import {
    consultarRevisionExpedientes,
    urlDocumentoValida
} from "./datosRevisionExpedientes.js";

import {
    corregirExpediente
} from "./corregirExpediente.js";

const elemento = id =>
    document.getElementById("re" + id);

const detalle = elemento("Detalle");
const confirmacion = elemento("Confirmacion");

const controles = [
    "Actualizar",
    "Buscar",
    "FiltroEstado",
    "FiltroCargo"
];

let registros = [];
let seleccionado = null;
let accionPendiente = null;
let ocupado = false;

function avisar(destino, mensaje, tipo = "info") {
    destino.textContent = mensaje;
    destino.dataset.tipo = tipo;
    destino.hidden = !mensaje;
}

function mensajeError(error) {
    const codigo = String(error?.code || "");

    if (codigo.includes("permission-denied")) {
        return "No tienes permiso para realizar esta operación. Verifica la sesión administradora y las reglas de acceso.";
    }

    if (
        /unavailable|deadline-exceeded|network-request-failed/.test(
            codigo
        )
    ) {
        return "No se pudo completar la comunicación con el servidor. Revisa tu conexión y actualiza la lista antes de volver a intentarlo.";
    }

    return error?.message ||
        "Ocurrió un problema inesperado. Actualiza la lista e intenta nuevamente.";
}

function bloquear(valor) {
    ocupado = valor;

    controles.forEach(id => {
        elemento(id).disabled = valor;
    });

    [
        "CerrarDetalle",
        "CerrarConfirmacion",
        "CancelarCorreccion",
        "ConfirmarCorreccion"
    ].forEach(id => {
        elemento(id).disabled = valor;
    });

    actualizarAcciones();
}

function actualizarAcciones() {
    const datos = seleccionado?.datos || {};

    elemento("RetirarFoto").disabled =
        ocupado ||
        !(datos.fotoUrl || datos.fotoPublicId);

    elemento("RetirarPdf").disabled =
        ocupado ||
        !(datos.curpPdfUrl || datos.curpPdfPublicId);

    elemento("VaciarDocumentacion").disabled =
        ocupado ||
        !(
            datos.fotoUrl ||
            datos.fotoPublicId ||
            datos.curpPdfUrl ||
            datos.curpPdfPublicId ||
            datos.curp
        );
}

function normalizar(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);

    if (clase) {
        nodo.className = clase;
    }

    if (texto !== undefined) {
        nodo.textContent = texto;
    }

    return nodo;
}

function mostrarFoto(imagen, alternativa, url) {
    imagen.hidden = true;
    imagen.removeAttribute("src");
    alternativa.hidden = false;

    imagen.onerror = () => {
        imagen.hidden = true;
        alternativa.hidden = false;
    };

    imagen.onload = () => {
        imagen.hidden = false;
        alternativa.hidden = true;
    };

    if (urlDocumentoValida(url)) {
        imagen.src = url;
    }
}

function tarjeta(registro) {
    const contenedor = crear(
        "article",
        "re-tarjeta"
    );

    const cabecera = crear(
        "div",
        "re-tarjeta-cabecera"
    );

    const miniatura = crear(
        "div",
        "re-miniatura"
    );

    const iniciales = registro.nombre
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0] || "")
        .join("");

    const alternativa = crear(
        "span",
        "",
        iniciales
    );

    const foto = crear("img");

    foto.alt = "Fotografía de " + registro.nombre;
    foto.loading = "lazy";

    miniatura.append(foto, alternativa);

    mostrarFoto(
        foto,
        alternativa,
        registro.datos.fotoUrl
    );

    const datos = crear(
        "div",
        "re-tarjeta-datos"
    );

    datos.append(
        crear("p", "re-cargo", registro.cargo),
        crear("h3", "", registro.nombre),
        crear(
            "p",
            "re-asignacion",
            registro.asignacion
        )
    );

    cabecera.append(miniatura, datos);

    const estado = crear(
        "span",
        "re-insignia",
        registro.completo
            ? "Documentación completa"
            : "Documentación pendiente"
    );

    estado.dataset.estado = registro.completo
        ? "completo"
        : "pendiente";

    contenedor.append(cabecera, estado);

    if (!registro.activo) {
        const inactivo = crear(
            "span",
            "re-insignia",
            "Cuenta o asignación inactiva"
        );

        inactivo.dataset.estado = "inactivo";
        contenedor.append(inactivo);
    }

    const requisitos = crear(
        "div",
        "re-requisitos"
    );

    for (const [nombre, valido] of [
        [
            "Fotografía",
            urlDocumentoValida(registro.datos.fotoUrl)
        ],
        [
            "PDF de CURP",
            urlDocumentoValida(registro.datos.curpPdfUrl)
        ],
        [
            "CURP",
            /^[A-Z0-9]{18}$/.test(registro.datos.curp)
        ]
    ]) {
        const etiqueta = crear(
            "span",
            "re-requisito",
            nombre + (
                valido
                    ? ": registrado"
                    : ": pendiente"
            )
        );

        etiqueta.dataset.pendiente = String(!valido);
        requisitos.append(etiqueta);
    }

    const boton = crear(
        "button",
        "re-boton re-boton-secundario",
        "Revisar expediente"
    );

    boton.type = "button";
    boton.disabled = ocupado;

    boton.addEventListener(
        "click",
        () => abrirDetalle(registro)
    );

    contenedor.append(requisitos, boton);

    return contenedor;
}

function renderizar() {
    const busqueda = normalizar(
        elemento("Buscar").value
    );

    const estado = elemento("FiltroEstado").value;
    const cargo = elemento("FiltroCargo").value;

    const visibles = registros.filter(registro =>
        (
            cargo === "todos" ||
            registro.tipo === cargo
        ) &&
        (
            estado === "todos" ||
            (
                estado === "completos"
                    ? registro.completo
                    : !registro.completo
            )
        ) &&
        normalizar(
            [
                registro.nombre,
                registro.cargo,
                registro.asignacion,
                registro.datos.curp
            ].join(" ")
        ).includes(busqueda)
    );

    for (const grupo of ["Arbitros", "Tecnicos"]) {
        const lista = visibles.filter(registro =>
            grupo === "Arbitros"
                ? registro.tipo === "arbitro"
                : registro.tipo !== "arbitro"
        );

        elemento("Lista" + grupo).replaceChildren(
            ...lista.map(tarjeta)
        );

        elemento("Cantidad" + grupo).textContent =
            String(lista.length);

        elemento("Sin" + grupo).hidden =
            lista.length > 0;
    }

    elemento("Total").textContent =
        String(registros.length);

    elemento("Completos").textContent = String(
        registros.filter(
            registro => registro.completo
        ).length
    );

    elemento("Pendientes").textContent = String(
        registros.filter(
            registro => !registro.completo
        ).length
    );
}

async function cargarDatos(mensaje = "") {
    if (ocupado) return;

    bloquear(true);

    elemento("Contenido").hidden = true;

    avisar(
        elemento("Estado"),
        "Consultando expedientes…"
    );

    try {
        registros = await consultarRevisionExpedientes();

        bloquear(false);
        renderizar();

        elemento("Contenido").hidden = false;

        avisar(
            elemento("Estado"),
            mensaje ||
                "Expedientes actualizados. Los indicadores muestran el estado de la documentación; las cuentas inactivas se señalan por separado.",
            mensaje ? "exito" : "info"
        );
    } catch (error) {
        registros = [];
        seleccionado = null;

        bloquear(false);
        renderizar();

        avisar(
            elemento("Estado"),
            (
                mensaje
                    ? mensaje +
                        " Sin embargo, no se pudo actualizar la lista: "
                    : ""
            ) + mensajeError(error),
            "error"
        );
    }
}

function abrirDetalle(registro) {
    if (ocupado) return;

    seleccionado = registro;

    elemento("DetalleNombre").textContent =
        registro.nombre;

    elemento("DetalleCargo").textContent =
        registro.cargo;

    elemento("DetalleAsignacion").textContent =
        registro.asignacion;

    elemento("DetalleEstado").textContent =
        (
            registro.completo
                ? "Documentación completa"
                : "Documentación pendiente"
        ) +
        (
            registro.activo
                ? ""
                : " · Cuenta o asignación inactiva"
        );

    elemento("DetalleCurp").textContent =
        registro.datos.curp || "CURP pendiente";

    elemento("DetalleFoto").alt =
        "Fotografía de " + registro.nombre;

    mostrarFoto(
        elemento("DetalleFoto"),
        elemento("DetalleSinFoto"),
        registro.datos.fotoUrl
    );

    const pdf = elemento("DetallePdf");

    const valido = urlDocumentoValida(
        registro.datos.curpPdfUrl
    );

    pdf.removeAttribute("href");
    pdf.hidden = !valido;

    elemento("DetalleSinPdf").hidden = valido;

    if (valido) {
        pdf.href = registro.datos.curpPdfUrl;
    }

    avisar(elemento("DetalleAviso"), "");

    actualizarAcciones();

    detalle.showModal();
}

function prepararCorreccion(accion) {
    if (ocupado || !seleccionado) return;

    accionPendiente = accion;

    const textos = {
        foto: [
            "Pedir nueva fotografía",
            "Se retirará únicamente la fotografía. La persona deberá cargar una nueva foto para completar su expediente."
        ],
        pdf: [
            "Pedir nuevo PDF de CURP",
            "Se retirará únicamente el PDF de CURP. La persona deberá cargar nuevamente ese documento."
        ],
        todo: [
            "Vaciar documentación",
            "Se retirarán la fotografía, el PDF y el texto de la CURP. Se conservarán el nombre, la cuenta y las asignaciones."
        ]
    };

    elemento("ConfirmacionTitulo").textContent =
        textos[accion][0];

    elemento("ConfirmacionPersona").textContent =
        seleccionado.nombre +
        " · " +
        seleccionado.cargo;

    elemento("ConfirmacionDescripcion").textContent =
        textos[accion][1] +
        " Sus credenciales emitidas para este cargo quedarán inhabilitadas. Si tiene otro cargo, su documentación se conservará.";

    avisar(
        elemento("ConfirmacionAviso"),
        ""
    );

    confirmacion.showModal();
}

async function confirmarCorreccion() {
    if (
        ocupado ||
        !seleccionado ||
        !accionPendiente
    ) {
        return;
    }

    const registro = seleccionado;
    const accion = accionPendiente;

    bloquear(true);

    avisar(
        elemento("ConfirmacionAviso"),
        "Guardando corrección…"
    );

    try {
        await corregirExpediente(registro, accion);
    } catch (error) {
        bloquear(false);

        avisar(
            elemento("ConfirmacionAviso"),
            mensajeError(error),
            "error"
        );

        return;
    }

    bloquear(false);

    confirmacion.close();
    detalle.close();

    seleccionado = null;
    accionPendiente = null;

    await cargarDatos(
        "Corrección guardada para " +
        registro.nombre +
        " (" +
        registro.cargo +
        "). El expediente quedó pendiente y sus credenciales anteriores fueron inhabilitadas."
    );
}

async function iniciar() {
    try {
        await protegerPagina(["admin"]);

        elemento("Actualizar").addEventListener(
            "click",
            () => cargarDatos()
        );

        elemento("Buscar").addEventListener(
            "input",
            renderizar
        );

        elemento("FiltroEstado").addEventListener(
            "change",
            renderizar
        );

        elemento("FiltroCargo").addEventListener(
            "change",
            renderizar
        );

        elemento("CerrarDetalle").addEventListener(
            "click",
            () => {
                if (!ocupado) detalle.close();
            }
        );

        for (const id of [
            "CerrarConfirmacion",
            "CancelarCorreccion"
        ]) {
            elemento(id).addEventListener(
                "click",
                () => {
                    if (!ocupado) confirmacion.close();
                }
            );
        }

        for (const dialogo of [detalle, confirmacion]) {
            dialogo.addEventListener(
                "cancel",
                evento => {
                    if (ocupado) {
                        evento.preventDefault();
                    }
                }
            );
        }

        detalle.addEventListener("close", () => {
            seleccionado = null;
            actualizarAcciones();
        });

        confirmacion.addEventListener("close", () => {
            accionPendiente = null;
        });

        elemento("RetirarFoto").addEventListener(
            "click",
            () => prepararCorreccion("foto")
        );

        elemento("RetirarPdf").addEventListener(
            "click",
            () => prepararCorreccion("pdf")
        );

        elemento("VaciarDocumentacion").addEventListener(
            "click",
            () => prepararCorreccion("todo")
        );

        elemento("ConfirmarCorreccion").addEventListener(
            "click",
            confirmarCorreccion
        );

        await cargarDatos();
    } catch (error) {
        avisar(
            elemento("Estado"),
            mensajeError(error),
            "error"
        );
    }
}

iniciar();