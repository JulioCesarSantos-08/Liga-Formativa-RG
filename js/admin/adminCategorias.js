
import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";

import {
    registrarAuditoria
} from "../auditoria.js";

const $ = id => document.getElementById(id);

const adminInicial = $("adminInicial");

const totalCategorias = $("totalCategorias");
const totalActivas = $("totalActivas");
const totalInactivas = $("totalInactivas");

const buscarCategoria = $("buscarCategoria");
const filtroEstado = $("filtroEstado");

const estadoCarga = $("estadoCarga");
const estadoVacio = $("estadoVacio");
const gridCategorias = $("gridCategorias");

const btnNuevaCategoria = $("btnNuevaCategoria");

const modalCategoria = $("modalCategoria");
const btnCerrarModal = $("btnCerrarModal");
const btnCancelarModal = $("btnCancelarModal");

const formCategoria = $("formCategoria");
const modalTitulo = $("modalTitulo");

const nombreCategoria = $("nombreCategoria");
const descripcionCategoria = $("descripcionCategoria");

const anioNacimientoDesde = $("anioNacimientoDesde");
const anioNacimientoHasta = $("anioNacimientoHasta");

const modalidadCategoria = $("modalidadCategoria");
const jugadoresEnCancha = $("jugadoresEnCancha");

const edadMinima = $("edadMinima");
const edadMaxima = $("edadMaxima");

const btnEstadoActivo = $("btnEstadoActivo");
const btnEstadoInactivo = $("btnEstadoInactivo");

const btnGuardarCategoria = $("btnGuardarCategoria");

const toast = $("toast");
const toastIcono = $("toastIcono");
const toastTitulo = $("toastTitulo");
const toastTexto = $("toastTexto");

let categorias = [];
let categoriaSeleccionada = null;
let estadoSeleccionado = true;
let toastTimer = null;
let guardando = false;

const usuario = await protegerPagina(["admin"]);

if (usuario) {
    cargarAdministrador(usuario);
    activarEventos();
    await cargarCategorias();
}

function cargarAdministrador(datosUsuario) {
    const nombre = datosUsuario.nombre?.trim() || "Administrador";

    adminInicial.textContent = nombre
        .charAt(0)
        .toUpperCase();
}

function activarEventos() {
    btnNuevaCategoria.addEventListener(
        "click",
        abrirModalNuevaCategoria
    );

    buscarCategoria.addEventListener(
        "input",
        aplicarFiltros
    );

    filtroEstado.addEventListener(
        "change",
        aplicarFiltros
    );

    btnCerrarModal.addEventListener(
        "click",
        cerrarModal
    );

    btnCancelarModal.addEventListener(
        "click",
        cerrarModal
    );

    modalCategoria.addEventListener("click", event => {
        if (event.target === modalCategoria) {
            cerrarModal();
        }
    });

    btnEstadoActivo.addEventListener("click", () => {
        seleccionarEstado(true);
    });

    btnEstadoInactivo.addEventListener("click", () => {
        seleccionarEstado(false);
    });

    formCategoria.addEventListener(
        "submit",
        guardarCategoria
    );

    nombreCategoria.addEventListener("blur", () => {
        nombreCategoria.value = limpiarEspacios(
            nombreCategoria.value
        );
    });

    [
        anioNacimientoDesde,
        anioNacimientoHasta
    ].forEach(campo => {
        campo.addEventListener(
            "input",
            validarRangoNacimiento
        );

        campo.addEventListener(
            "change",
            validarRangoNacimiento
        );
    });

    [
        edadMinima,
        edadMaxima
    ].forEach(campo => {
        campo.addEventListener(
            "input",
            validarRangoEdad
        );

        campo.addEventListener(
            "change",
            validarRangoEdad
        );
    });

    modalidadCategoria.addEventListener(
        "change",
        actualizarAyudaModalidad
    );

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            !modalCategoria.classList.contains("oculto")
        ) {
            cerrarModal();
        }
    });

    const parametros = new URLSearchParams(
        window.location.search
    );

    if (parametros.get("accion") === "nueva") {
        abrirModalNuevaCategoria();
    }
}

async function cargarCategorias() {
    mostrarCarga();

    try {
        const referencia = collection(
            db,
            "categorias"
        );

        let snapshot;

        try {
            snapshot = await getDocs(
                query(
                    referencia,
                    orderBy("creadoEn", "asc")
                )
            );
        } catch (errorOrden) {
            snapshot = await getDocs(referencia);
        }

        categorias = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        ordenarCategorias();
        actualizarResumen();
        aplicarFiltros();
    } catch (error) {
        console.error(
            "Error cargando categorías:",
            error
        );

        estadoCarga.classList.add("oculto");
        gridCategorias.classList.add("oculto");
        estadoVacio.classList.remove("oculto");

        estadoVacio.querySelector("strong").textContent =
            "No pudimos cargar las categorías";

        estadoVacio.querySelector("p").textContent =
            "Revisa la conexión con Firebase e intenta nuevamente.";
    }
}

function mostrarCarga() {
    estadoCarga.classList.remove("oculto");
    estadoVacio.classList.add("oculto");
    gridCategorias.classList.add("oculto");
}

function ordenarCategorias() {
    categorias.sort((a, b) => {
        return (a.nombre || "").localeCompare(
            b.nombre || "",
            "es"
        );
    });
}

function actualizarResumen() {
    totalCategorias.textContent = categorias.length;

    totalActivas.textContent = categorias.filter(
        categoria => categoria.activo !== false
    ).length;

    totalInactivas.textContent = categorias.filter(
        categoria => categoria.activo === false
    ).length;
}

function aplicarFiltros() {
    const busqueda = normalizarTexto(
        buscarCategoria.value
    );

    const estado = filtroEstado.value;

    const filtradas = categorias.filter(categoria => {
        const texto = normalizarTexto(
            [
                categoria.nombre || "",
                categoria.descripcion || "",
                categoria.modalidad || "",
                categoria.anioNacimientoDesde ?? "",
                categoria.anioNacimientoHasta ?? ""
            ].join(" ")
        );

        const coincideBusqueda =
            !busqueda || texto.includes(busqueda);

        let coincideEstado = true;

        if (estado === "activo") {
            coincideEstado = categoria.activo !== false;
        }

        if (estado === "inactivo") {
            coincideEstado = categoria.activo === false;
        }

        return coincideBusqueda && coincideEstado;
    });

    renderizarCategorias(filtradas);
}

function renderizarCategorias(lista) {
    estadoCarga.classList.add("oculto");
    gridCategorias.innerHTML = "";

    if (!lista.length) {
        gridCategorias.classList.add("oculto");
        estadoVacio.classList.remove("oculto");

        const hayBusqueda =
            buscarCategoria.value.trim() ||
            filtroEstado.value !== "todos";

        estadoVacio.querySelector("strong").textContent =
            hayBusqueda
                ? "No encontramos coincidencias"
                : "No hay categorías";

        estadoVacio.querySelector("p").textContent =
            hayBusqueda
                ? "Prueba con otro nombre o cambia los filtros."
                : "Crea la primera categoría para comenzar a organizar la competencia.";

        return;
    }

    estadoVacio.classList.add("oculto");
    gridCategorias.classList.remove("oculto");

    lista.forEach(categoria => {
        const card = document.createElement("article");

        const activa = categoria.activo !== false;

        card.className = activa
            ? "categoria-card"
            : "categoria-card inactiva";

        const descripcion =
            categoria.descripcion?.trim() ||
            "Sin descripción";

        const modalidad =
            categoria.modalidad === "femenil"
                ? "Femenil"
                : categoria.modalidad === "general"
                    ? "General / Mixta"
                    : "Sin configurar";

        const rangoNacimiento = obtenerRangoNacimiento(
            categoria.anioNacimientoDesde,
            categoria.anioNacimientoHasta
        );

        const cantidadCancha = Number(
            categoria.jugadoresEnCancha
        );

        const cancha =
            numeroValido(categoria.jugadoresEnCancha) &&
            [5, 9, 11].includes(cantidadCancha)
                ? `${cantidadCancha} vs. ${cantidadCancha}`
                : "Sin configurar";

        card.innerHTML = `
            <div class="categoria-card-top">
                <div class="categoria-icono">
                    🗂️
                </div>

                <span class="categoria-estado ${activa ? "activa" : "inactiva"}">
                    ${activa ? "Activa" : "Inactiva"}
                </span>
            </div>

            <h3>
                ${escaparHTML(categoria.nombre || "Sin nombre")}
            </h3>

            <p>
                ${escaparHTML(descripcion)}
            </p>

            <div class="categoria-meta">
                <div>
                    <span>Edad mínima</span>

                    <strong>
                        ${escaparHTML(formatearEdad(categoria.edadMinima))}
                    </strong>
                </div>

                <div>
                    <span>Edad máxima</span>

                    <strong>
                        ${escaparHTML(formatearEdad(categoria.edadMaxima))}
                    </strong>
                </div>
            </div>

            <div
                style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px;"
            >
                <div
                    style="padding:10px;border-radius:10px;background:rgba(11,117,109,.07);"
                >
                    <span
                        style="display:block;color:#68746e;font-size:.68rem;margin-bottom:5px;"
                    >
                        Años de nacimiento
                    </span>

                    <strong
                        style="display:block;color:#102b28;font-size:.78rem;"
                    >
                        ${escaparHTML(rangoNacimiento)}
                    </strong>
                </div>

                <div
                    style="padding:10px;border-radius:10px;background:rgba(11,117,109,.07);"
                >
                    <span
                        style="display:block;color:#68746e;font-size:.68rem;margin-bottom:5px;"
                    >
                        Modalidad
                    </span>

                    <strong
                        style="display:block;color:#102b28;font-size:.78rem;"
                    >
                        ${escaparHTML(modalidad)}
                    </strong>
                </div>

                <div
                    style="padding:10px;border-radius:10px;background:rgba(11,117,109,.07);"
                >
                    <span
                        style="display:block;color:#68746e;font-size:.68rem;margin-bottom:5px;"
                    >
                        Jugadores en cancha
                    </span>

                    <strong
                        style="display:block;color:#102b28;font-size:.78rem;"
                    >
                        ${escaparHTML(cancha)}
                    </strong>
                </div>

                <div
                    style="padding:10px;border-radius:10px;background:rgba(11,117,109,.07);"
                >
                    <span
                        style="display:block;color:#68746e;font-size:.68rem;margin-bottom:5px;"
                    >
                        Límite de plantilla
                    </span>

                    <strong
                        style="display:block;color:#102b28;font-size:.72rem;"
                    >
                        Configuración general
                    </strong>
                </div>
            </div>

            <div class="categoria-acciones">
                <button
                    type="button"
                    class="btn-editar-categoria"
                >
                    Editar
                </button>

                <button
                    type="button"
                    class="btn-estado-categoria"
                >
                    ${activa ? "Desactivar" : "Activar"}
                </button>
            </div>
        `;

        card.querySelector(
            ".btn-editar-categoria"
        ).addEventListener("click", () => {
            abrirModalEditarCategoria(categoria.id);
        });

        card.querySelector(
            ".btn-estado-categoria"
        ).addEventListener("click", () => {
            cambiarEstadoRapido(categoria.id);
        });

        gridCategorias.appendChild(card);
    });
}

function abrirModalNuevaCategoria() {
    if (guardando) {
        return;
    }

    categoriaSeleccionada = null;

    modalTitulo.textContent =
        "Nueva categoría";

    formCategoria.reset();

    modalidadCategoria.value = "general";
    jugadoresEnCancha.value = "";

    seleccionarEstado(true);
    limpiarValidaciones();
    actualizarAyudaModalidad();

    abrirModal();

    setTimeout(() => {
        nombreCategoria.focus();
    }, 100);
}

function abrirModalEditarCategoria(id) {
    if (guardando) {
        return;
    }

    const categoria = categorias.find(
        item => item.id === id
    );

    if (!categoria) {
        mostrarToast(
            "error",
            "Categoría no encontrada",
            "No pudimos localizar la categoría seleccionada."
        );

        return;
    }

    categoriaSeleccionada = categoria;

    modalTitulo.textContent =
        "Editar categoría";

    nombreCategoria.value =
        categoria.nombre || "";

    descripcionCategoria.value =
        categoria.descripcion || "";

    anioNacimientoDesde.value =
        categoria.anioNacimientoDesde ?? "";

    anioNacimientoHasta.value =
        categoria.anioNacimientoHasta ?? "";

    modalidadCategoria.value =
        categoria.modalidad === "femenil"
            ? "femenil"
            : "general";

    const cancha = Number(
        categoria.jugadoresEnCancha
    );

    jugadoresEnCancha.value =
        numeroValido(categoria.jugadoresEnCancha) &&
        [5, 9, 11].includes(cancha)
            ? String(cancha)
            : "";

    edadMinima.value =
        categoria.edadMinima ?? "";

    edadMaxima.value =
        categoria.edadMaxima ?? "";

    seleccionarEstado(
        categoria.activo !== false
    );

    limpiarValidaciones();
    actualizarAyudaModalidad();

    abrirModal();
}

function abrirModal() {
    modalCategoria.classList.remove("oculto");

    document.body.style.overflow =
        "hidden";
}

function cerrarModal() {
    if (guardando) {
        return;
    }

    modalCategoria.classList.add("oculto");

    categoriaSeleccionada = null;

    document.body.style.overflow = "";
}

function seleccionarEstado(activo) {
    estadoSeleccionado = activo;

    btnEstadoActivo.classList.toggle(
        "activo",
        activo
    );

    btnEstadoInactivo.classList.toggle(
        "activo",
        !activo
    );
}

function limpiarValidaciones() {
    [
        anioNacimientoDesde,
        anioNacimientoHasta,
        edadMinima,
        edadMaxima
    ].forEach(campo => {
        campo.setCustomValidity("");
    });
}

function actualizarAyudaModalidad() {
    const esFemenil =
        modalidadCategoria.value === "femenil";

    modalidadCategoria.title = esFemenil
        ? "Categoría destinada a equipos femeniles."
        : "Categoría general o mixta.";
}

function validarRangoNacimiento() {
    anioNacimientoDesde.setCustomValidity("");
    anioNacimientoHasta.setCustomValidity("");

    const desde = convertirNumeroOpcional(
        anioNacimientoDesde.value
    );

    const hasta = convertirNumeroOpcional(
        anioNacimientoHasta.value
    );

    if (desde === null && hasta === null) {
        return true;
    }

    if (desde === null || hasta === null) {
        const mensaje =
            "Debes escribir ambos años de nacimiento.";

        if (desde === null) {
            anioNacimientoDesde.setCustomValidity(
                mensaje
            );
        } else {
            anioNacimientoHasta.setCustomValidity(
                mensaje
            );
        }

        return false;
    }

    if (
        !Number.isInteger(desde) ||
        !Number.isInteger(hasta) ||
        desde < 1900 ||
        desde > 2100 ||
        hasta < 1900 ||
        hasta > 2100 ||
        desde > hasta
    ) {
        anioNacimientoHasta.setCustomValidity(
            "Revisa el rango: el año inicial debe ser menor o igual al final."
        );

        return false;
    }

    return true;
}

function validarRangoEdad() {
    edadMinima.setCustomValidity("");
    edadMaxima.setCustomValidity("");

    const minima = convertirNumeroOpcional(
        edadMinima.value
    );

    const maxima = convertirNumeroOpcional(
        edadMaxima.value
    );

    if (
        minima !== null &&
        (
            !Number.isInteger(minima) ||
            minima < 0 ||
            minima > 100
        )
    ) {
        edadMinima.setCustomValidity(
            "La edad mínima debe ser un número entero entre 0 y 100."
        );

        return false;
    }

    if (
        maxima !== null &&
        (
            !Number.isInteger(maxima) ||
            maxima < 0 ||
            maxima > 100
        )
    ) {
        edadMaxima.setCustomValidity(
            "La edad máxima debe ser un número entero entre 0 y 100."
        );

        return false;
    }

    if (
        minima !== null &&
        maxima !== null &&
        minima > maxima
    ) {
        edadMaxima.setCustomValidity(
            "La edad mínima no puede superar a la máxima."
        );

        return false;
    }

    return true;
}

function obtenerDatosFormulario() {
    const nombre = limpiarEspacios(
        nombreCategoria.value
    );

    const descripcion = limpiarEspacios(
        descripcionCategoria.value
    );

    return {
        nombre,
        descripcion,
        edadMinima: convertirNumeroOpcional(
            edadMinima.value
        ),
        edadMaxima: convertirNumeroOpcional(
            edadMaxima.value
        ),
        anioNacimientoDesde: convertirNumeroOpcional(
            anioNacimientoDesde.value
        ),
        anioNacimientoHasta: convertirNumeroOpcional(
            anioNacimientoHasta.value
        ),
        modalidad:
            modalidadCategoria.value === "femenil"
                ? "femenil"
                : "general",
        jugadoresEnCancha: convertirNumeroOpcional(
            jugadoresEnCancha.value
        ),
        activo: estadoSeleccionado
    };
}

function validarDatosCategoria(datos) {
    if (!datos.nombre) {
        mostrarToast(
            "error",
            "Nombre requerido",
            "Escribe el nombre de la categoría."
        );

        nombreCategoria.focus();
        return false;
    }

    if (!validarRangoNacimiento()) {
        const campo = anioNacimientoDesde.validationMessage
            ? anioNacimientoDesde
            : anioNacimientoHasta;

        mostrarToast(
            "error",
            "Años incorrectos",
            campo.validationMessage
        );

        campo.reportValidity();
        return false;
    }

    if (!validarRangoEdad()) {
        const campo = edadMinima.validationMessage
            ? edadMinima
            : edadMaxima;

        mostrarToast(
            "error",
            "Edades incorrectas",
            campo.validationMessage
        );

        campo.reportValidity();
        return false;
    }

    if (
        datos.jugadoresEnCancha !== null &&
        ![5, 9, 11].includes(datos.jugadoresEnCancha)
    ) {
        mostrarToast(
            "error",
            "Jugadores en cancha",
            "Selecciona 5, 9 u 11 jugadores."
        );

        jugadoresEnCancha.focus();
        return false;
    }

    const existeNombre = categorias.some(categoria => {
        if (
            categoriaSeleccionada &&
            categoria.id === categoriaSeleccionada.id
        ) {
            return false;
        }

        return normalizarTexto(categoria.nombre) ===
            normalizarTexto(datos.nombre);
    });

    if (existeNombre) {
        mostrarToast(
            "error",
            "Categoría existente",
            "Ya existe una categoría registrada con ese nombre."
        );

        nombreCategoria.focus();
        return false;
    }

    return true;
}

async function guardarCategoria(event) {
    event.preventDefault();

    if (guardando) {
        return;
    }

    const datos = obtenerDatosFormulario();

    if (!validarDatosCategoria(datos)) {
        return;
    }

    guardando = true;
    bloquearGuardado(true);

    try {
        if (categoriaSeleccionada) {
            await actualizarCategoria(datos);
        } else {
            await crearCategoria(datos);
        }

        ordenarCategorias();
        actualizarResumen();
        aplicarFiltros();

        guardando = false;
        bloquearGuardado(false);

        cerrarModal();
    } catch (error) {
        console.error(
            "Error guardando categoría:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al guardar la categoría. Intenta nuevamente."
        );
    } finally {
        guardando = false;
        bloquearGuardado(false);
    }
}

async function actualizarCategoria(datos) {
    const anterior = categoriaSeleccionada;
    const categoriaId = anterior.id;

    const datosAnteriores = {
        ...anterior
    };

    const referencia = doc(
        db,
        "categorias",
        categoriaId
    );

    await updateDoc(referencia, {
        ...datos,
        actualizadoEn: serverTimestamp()
    });

    const cambios = obtenerCambiosCategoria(
        datosAnteriores,
        datos
    );

    let accion = "categoria_actualizada";

    let descripcion = cambios.length
        ? `Se actualizó la categoría ${datos.nombre}. Cambios: ${cambios.join(", ")}.`
        : `Se guardó la categoría ${datos.nombre} sin cambios en su configuración.`;

    if (
        datosAnteriores.activo !== datos.activo
    ) {
        accion = datos.activo
            ? "categoria_activada"
            : "categoria_desactivada";

        descripcion = datos.activo
            ? `Se activó la categoría ${datos.nombre}.`
            : `Se desactivó la categoría ${datos.nombre}.`;

        if (cambios.length > 1) {
            descripcion += ` Otros cambios: ${cambios.join(", ")}.`;
        }
    }

    Object.assign(anterior, datos);

    await registrarAuditoriaSegura({
        usuarioId: usuario?.uid || "",
        usuarioNombre:
            usuario?.nombre ||
            usuario?.nombreCompleto ||
            usuario?.email ||
            "Administrador",
        usuarioRol: usuario?.rol || "admin",
        modulo: "categorias",
        accion,
        descripcion,
        entidadTipo: "categoria",
        entidadId: categoriaId,
        entidadNombre: datos.nombre
    });

    mostrarToast(
        "exito",
        "Categoría actualizada",
        "Los datos se guardaron correctamente."
    );
}

async function crearCategoria(datos) {
    const referencia = collection(
        db,
        "categorias"
    );

    const documento = await addDoc(
        referencia,
        {
            ...datos,
            creadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp()
        }
    );

    categorias.push({
        id: documento.id,
        ...datos
    });

    await registrarAuditoriaSegura({
        usuarioId: usuario?.uid || "",
        usuarioNombre:
            usuario?.nombre ||
            usuario?.nombreCompleto ||
            usuario?.email ||
            "Administrador",
        usuarioRol: usuario?.rol || "admin",
        modulo: "categorias",
        accion: "categoria_creada",
        descripcion:
            `Se creó la categoría ${datos.nombre}. ` +
            `Años de nacimiento: ${obtenerRangoNacimiento(
                datos.anioNacimientoDesde,
                datos.anioNacimientoHasta
            )}. ` +
            `Modalidad: ${datos.modalidad}. ` +
            `Jugadores en cancha: ${
                datos.jugadoresEnCancha ?? "sin configurar"
            }.`,
        entidadTipo: "categoria",
        entidadId: documento.id,
        entidadNombre: datos.nombre
    });

    mostrarToast(
        "exito",
        "Categoría creada",
        "La categoría ya está disponible en el sistema."
    );
}

async function cambiarEstadoRapido(id) {
    if (guardando) {
        return;
    }

    const categoria = categorias.find(
        item => item.id === id
    );

    if (!categoria) {
        return;
    }

    const nuevoEstado =
        categoria.activo === false;

    guardando = true;

    try {
        await updateDoc(
            doc(
                db,
                "categorias",
                categoria.id
            ),
            {
                activo: nuevoEstado,
                actualizadoEn: serverTimestamp()
            }
        );

        categoria.activo = nuevoEstado;

        await registrarAuditoriaSegura({
            usuarioId: usuario?.uid || "",
            usuarioNombre:
                usuario?.nombre ||
                usuario?.nombreCompleto ||
                usuario?.email ||
                "Administrador",
            usuarioRol: usuario?.rol || "admin",
            modulo: "categorias",
            accion: nuevoEstado
                ? "categoria_activada"
                : "categoria_desactivada",
            descripcion: nuevoEstado
                ? `Se activó la categoría ${categoria.nombre || "Sin nombre"}.`
                : `Se desactivó la categoría ${categoria.nombre || "Sin nombre"}.`,
            entidadTipo: "categoria",
            entidadId: categoria.id,
            entidadNombre: categoria.nombre || "Sin nombre"
        });

        actualizarResumen();
        aplicarFiltros();

        mostrarToast(
            "exito",
            nuevoEstado
                ? "Categoría activada"
                : "Categoría desactivada",
            nuevoEstado
                ? "La categoría puede volver a utilizarse."
                : "La categoría conservará su historial."
        );
    } catch (error) {
        console.error(
            "Error cambiando estado:",
            error
        );

        mostrarToast(
            "error",
            "No se pudo actualizar",
            "Ocurrió un problema al cambiar el estado de la categoría."
        );
    } finally {
        guardando = false;
    }
}

function obtenerCambiosCategoria(anterior, nuevo) {
    const campos = [
        ["nombre", "nombre"],
        ["descripcion", "descripción"],
        ["edadMinima", "edad mínima"],
        ["edadMaxima", "edad máxima"],
        ["anioNacimientoDesde", "año inicial de nacimiento"],
        ["anioNacimientoHasta", "año final de nacimiento"],
        ["modalidad", "modalidad"],
        ["jugadoresEnCancha", "jugadores en cancha"],
        ["activo", "estado"]
    ];

    return campos
        .filter(([campo]) => {
            const valorAnterior =
                anterior[campo] ?? null;

            const valorNuevo =
                nuevo[campo] ?? null;

            return valorAnterior !== valorNuevo;
        })
        .map(([, etiqueta]) => etiqueta);
}

async function registrarAuditoriaSegura(datos) {
    try {
        const resultado = await registrarAuditoria(datos);

        if (resultado?.ok === false) {
            console.error(
                "No se pudo completar la auditoría:",
                resultado.error
            );
        }
    } catch (error) {
        console.error(
            "No se pudo registrar la auditoría:",
            error
        );
    }
}

function obtenerRangoNacimiento(desde, hasta) {
    const tieneDesde = numeroValido(desde);
    const tieneHasta = numeroValido(hasta);

    if (tieneDesde && tieneHasta) {
        return Number(desde) === Number(hasta)
            ? String(desde)
            : `${desde} - ${hasta}`;
    }

    if (tieneDesde) {
        return `Desde ${desde}`;
    }

    if (tieneHasta) {
        return `Hasta ${hasta}`;
    }

    return "Sin configurar";
}

function numeroValido(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        valor !== "" &&
        Number.isFinite(Number(valor))
    );
}

function convertirNumeroOpcional(valor) {
    const texto = String(valor ?? "").trim();

    if (!texto) {
        return null;
    }

    const numero = Number(texto);

    return Number.isFinite(numero)
        ? numero
        : null;
}

function formatearEdad(valor) {
    return numeroValido(valor)
        ? `${valor} años`
        : "Sin límite";
}

function limpiarEspacios(valor) {
    return String(valor || "")
        .trim()
        .replace(/\s+/g, " ");
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function bloquearGuardado(bloquear) {
    btnGuardarCategoria.disabled = bloquear;

    btnGuardarCategoria.textContent = bloquear
        ? "Guardando..."
        : "Guardar categoría";
}

function mostrarToast(tipo, titulo, texto) {
    clearTimeout(toastTimer);

    toastIcono.textContent =
        tipo === "error" ? "!" : "✓";

    toastTitulo.textContent = titulo;
    toastTexto.textContent = texto;

    if (tipo === "error") {
        toast.style.background = "#fff3f2";
        toast.style.borderColor = "#f1cbc7";

        toastIcono.style.background = "#fee4e2";
        toastIcono.style.color = "#b42318";
    } else {
        toast.style.background = "#f0faf3";
        toast.style.borderColor = "#cbe7d5";

        toastIcono.style.background = "#d9f2e1";
        toastIcono.style.color = "#18794e";
    }

    toast.classList.remove("oculto");

    toastTimer = setTimeout(() => {
        toast.classList.add("oculto");
    }, 3500);
}
