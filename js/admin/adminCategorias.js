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


const adminInicial = document.getElementById("adminInicial");

const totalCategorias = document.getElementById("totalCategorias");
const totalActivas = document.getElementById("totalActivas");
const totalInactivas = document.getElementById("totalInactivas");

const buscarCategoria = document.getElementById("buscarCategoria");
const filtroEstado = document.getElementById("filtroEstado");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const gridCategorias = document.getElementById("gridCategorias");

const btnNuevaCategoria = document.getElementById("btnNuevaCategoria");

const modalCategoria = document.getElementById("modalCategoria");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarModal = document.getElementById("btnCancelarModal");

const formCategoria = document.getElementById("formCategoria");
const modalTitulo = document.getElementById("modalTitulo");

const nombreCategoria = document.getElementById("nombreCategoria");
const descripcionCategoria = document.getElementById("descripcionCategoria");
const edadMinima = document.getElementById("edadMinima");
const edadMaxima = document.getElementById("edadMaxima");

const btnEstadoActivo = document.getElementById("btnEstadoActivo");
const btnEstadoInactivo = document.getElementById("btnEstadoInactivo");

const btnGuardarCategoria = document.getElementById("btnGuardarCategoria");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let categorias = [];

let categoriaSeleccionada = null;

let estadoSeleccionado = true;

let toastTimer = null;


const usuario = await protegerPagina([
    "admin"
]);


if (usuario) {

    cargarAdministrador(usuario);
    activarEventos();
    await cargarCategorias();

}


function cargarAdministrador(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Administrador";


    adminInicial.textContent =
        obtenerInicial(nombre);

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


    modalCategoria.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modalCategoria
            ) {

                cerrarModal();

            }

        }
    );


    btnEstadoActivo.addEventListener(
        "click",
        () => {

            seleccionarEstado(true);

        }
    );


    btnEstadoInactivo.addEventListener(
        "click",
        () => {

            seleccionarEstado(false);

        }
    );


    formCategoria.addEventListener(
        "submit",
        guardarCategoria
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !modalCategoria.classList.contains("oculto")
            ) {

                cerrarModal();

            }

        }
    );


    const parametros =
        new URLSearchParams(
            window.location.search
        );


    if (
        parametros.get("accion") === "nueva"
    ) {

        abrirModalNuevaCategoria();

    }

}


async function cargarCategorias() {

    mostrarCarga();


    try {

        const referencia =
            collection(
                db,
                "categorias"
            );


        let snapshot;


        try {

            const consulta =
                query(
                    referencia,
                    orderBy(
                        "creadoEn",
                        "asc"
                    )
                );


            snapshot =
                await getDocs(
                    consulta
                );

        } catch (errorOrden) {

            snapshot =
                await getDocs(
                    referencia
                );

        }


        categorias =
            snapshot.docs.map(
                (documento) => {

                    return {
                        id: documento.id,
                        ...documento.data()
                    };

                }
            );


        categorias.sort(
            (a, b) => {

                const nombreA =
                    a.nombre || "";

                const nombreB =
                    b.nombre || "";


                return nombreA.localeCompare(
                    nombreB,
                    "es"
                );

            }
        );


        actualizarResumen();
        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando categorías:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        gridCategorias.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            "No pudimos cargar las categorías";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            "Revisa la conexión con Firebase e intenta nuevamente.";

    }

}


function mostrarCarga() {

    estadoCarga.classList.remove(
        "oculto"
    );


    estadoVacio.classList.add(
        "oculto"
    );


    gridCategorias.classList.add(
        "oculto"
    );

}


function actualizarResumen() {

    totalCategorias.textContent =
        categorias.length;


    totalActivas.textContent =
        categorias.filter(
            categoria =>
                categoria.activo !== false
        ).length;


    totalInactivas.textContent =
        categorias.filter(
            categoria =>
                categoria.activo === false
        ).length;

}


function aplicarFiltros() {

    const busqueda =
        normalizarTexto(
            buscarCategoria.value
        );


    const estado =
        filtroEstado.value;


    const filtradas =
        categorias.filter(
            (categoria) => {

                const nombre =
                    normalizarTexto(
                        categoria.nombre || ""
                    );


                const descripcion =
                    normalizarTexto(
                        categoria.descripcion || ""
                    );


                const coincideBusqueda =
                    !busqueda ||
                    nombre.includes(busqueda) ||
                    descripcion.includes(busqueda);


                let coincideEstado = true;


                if (estado === "activo") {

                    coincideEstado =
                        categoria.activo !== false;

                }


                if (estado === "inactivo") {

                    coincideEstado =
                        categoria.activo === false;

                }


                return (
                    coincideBusqueda &&
                    coincideEstado
                );

            }
        );


    renderizarCategorias(
        filtradas
    );

}


function renderizarCategorias(lista) {

    estadoCarga.classList.add(
        "oculto"
    );


    gridCategorias.innerHTML =
        "";


    if (!lista.length) {

        gridCategorias.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        return;

    }


    estadoVacio.classList.add(
        "oculto"
    );


    gridCategorias.classList.remove(
        "oculto"
    );


    lista.forEach(
        (categoria) => {

            const card =
                document.createElement(
                    "article"
                );


            const activa =
                categoria.activo !== false;


            card.className =
                activa
                    ? "categoria-card"
                    : "categoria-card inactiva";


            const descripcion =
                categoria.descripcion?.trim() ||
                "Sin descripción";


            card.innerHTML = `

                <div class="categoria-card-top">

                    <div class="categoria-icono">
                        🗂️
                    </div>

                    <span class="categoria-estado ${
                        activa
                            ? "activa"
                            : "inactiva"
                    }">

                        ${
                            activa
                                ? "Activa"
                                : "Inactiva"
                        }

                    </span>

                </div>

                <h3>
                    ${escaparHTML(
                        categoria.nombre ||
                        "Sin nombre"
                    )}
                </h3>

                <p>
                    ${escaparHTML(
                        descripcion
                    )}
                </p>

                <div class="categoria-meta">

                    <div>

                        <span>
                            Edad mínima
                        </span>

                        <strong>
                            ${
                                categoria.edadMinima === null ||
                                categoria.edadMinima === undefined ||
                                categoria.edadMinima === ""
                                    ? "Sin límite"
                                    : `${categoria.edadMinima} años`
                            }
                        </strong>

                    </div>

                    <div>

                        <span>
                            Edad máxima
                        </span>

                        <strong>
                            ${
                                categoria.edadMaxima === null ||
                                categoria.edadMaxima === undefined ||
                                categoria.edadMaxima === ""
                                    ? "Sin límite"
                                    : `${categoria.edadMaxima} años`
                            }
                        </strong>

                    </div>

                </div>

                <div class="categoria-acciones">

                    <button
                        type="button"
                        class="btn-editar-categoria"
                        data-id="${categoria.id}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="btn-estado-categoria"
                        data-id="${categoria.id}"
                    >
                        ${
                            activa
                                ? "Desactivar"
                                : "Activar"
                        }
                    </button>

                </div>

            `;


            card.querySelector(
                ".btn-editar-categoria"
            ).addEventListener(
                "click",
                () => {

                    abrirModalEditarCategoria(
                        categoria.id
                    );

                }
            );


            card.querySelector(
                ".btn-estado-categoria"
            ).addEventListener(
                "click",
                () => {

                    cambiarEstadoRapido(
                        categoria.id
                    );

                }
            );


            gridCategorias.appendChild(
                card
            );

        }
    );

}


function abrirModalNuevaCategoria() {

    categoriaSeleccionada =
        null;


    modalTitulo.textContent =
        "Nueva categoría";


    formCategoria.reset();


    seleccionarEstado(
        true
    );


    abrirModal();


    setTimeout(
        () => {

            nombreCategoria.focus();

        },
        100
    );

}


function abrirModalEditarCategoria(id) {

    const categoria =
        categorias.find(
            item =>
                item.id === id
        );


    if (!categoria) {
        return;
    }


    categoriaSeleccionada =
        categoria;


    modalTitulo.textContent =
        "Editar categoría";


    nombreCategoria.value =
        categoria.nombre || "";


    descripcionCategoria.value =
        categoria.descripcion || "";


    edadMinima.value =
        categoria.edadMinima ?? "";


    edadMaxima.value =
        categoria.edadMaxima ?? "";


    seleccionarEstado(
        categoria.activo !== false
    );


    abrirModal();

}


function abrirModal() {

    modalCategoria.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarModal() {

    modalCategoria.classList.add(
        "oculto"
    );


    categoriaSeleccionada =
        null;


    document.body.style.overflow =
        "";

}


function seleccionarEstado(activo) {

    estadoSeleccionado =
        activo;


    btnEstadoActivo.classList.toggle(
        "activo",
        activo
    );


    btnEstadoInactivo.classList.toggle(
        "activo",
        !activo
    );

}


async function guardarCategoria(event) {

    event.preventDefault();


    const nombre =
        nombreCategoria.value
            .trim()
            .replace(/\s+/g, " ");


    const descripcion =
        descripcionCategoria.value
            .trim()
            .replace(/\s+/g, " ");


    const minima =
        convertirNumeroOpcional(
            edadMinima.value
        );


    const maxima =
        convertirNumeroOpcional(
            edadMaxima.value
        );


    if (!nombre) {

        mostrarToast(
            "error",
            "Nombre requerido",
            "Escribe el nombre de la categoría."
        );

        return;

    }


    if (
        minima !== null &&
        maxima !== null &&
        minima > maxima
    ) {

        mostrarToast(
            "error",
            "Edades incorrectas",
            "La edad mínima no puede ser mayor que la edad máxima."
        );

        return;

    }


    const existeNombre =
        categorias.some(
            (categoria) => {

                if (
                    categoriaSeleccionada &&
                    categoria.id === categoriaSeleccionada.id
                ) {

                    return false;

                }


                return (
                    normalizarTexto(
                        categoria.nombre || ""
                    ) ===
                    normalizarTexto(
                        nombre
                    )
                );

            }
        );


    if (existeNombre) {

        mostrarToast(
            "error",
            "Categoría existente",
            "Ya existe una categoría registrada con ese nombre."
        );

        return;

    }


    bloquearGuardado(true);


    try {

        if (categoriaSeleccionada) {

            const datosAnteriores = {
                nombre:
                    categoriaSeleccionada.nombre || "",
                descripcion:
                    categoriaSeleccionada.descripcion || "",
                edadMinima:
                    categoriaSeleccionada.edadMinima ?? null,
                edadMaxima:
                    categoriaSeleccionada.edadMaxima ?? null,
                activo:
                    categoriaSeleccionada.activo !== false
            };


            const categoriaId =
                categoriaSeleccionada.id;


            const referencia =
                doc(
                    db,
                    "categorias",
                    categoriaId
                );


            await updateDoc(
                referencia,
                {
                    nombre,
                    descripcion,
                    edadMinima: minima,
                    edadMaxima: maxima,
                    activo: estadoSeleccionado,
                    actualizadoEn:
                        serverTimestamp()
                }
            );


            categoriaSeleccionada.nombre =
                nombre;


            categoriaSeleccionada.descripcion =
                descripcion;


            categoriaSeleccionada.edadMinima =
                minima;


            categoriaSeleccionada.edadMaxima =
                maxima;


            categoriaSeleccionada.activo =
                estadoSeleccionado;


            const cambios =
                obtenerCambiosCategoria(
                    datosAnteriores,
                    {
                        nombre,
                        descripcion,
                        edadMinima: minima,
                        edadMaxima: maxima,
                        activo: estadoSeleccionado
                    }
                );


            let accion =
                "categoria_actualizada";


            let descripcionAuditoria =
                `Se actualizó la categoría ${nombre}.`;


            if (
                datosAnteriores.activo !==
                estadoSeleccionado
            ) {

                accion =
                    estadoSeleccionado
                        ? "categoria_activada"
                        : "categoria_desactivada";


                descripcionAuditoria =
                    estadoSeleccionado
                        ? `Se activó la categoría ${nombre}.`
                        : `Se desactivó la categoría ${nombre}.`;

            } else if (cambios.length) {

                descripcionAuditoria =
                    `Se actualizó la categoría ${nombre}. Cambios: ${cambios.join(", ")}.`;

            }


            await registrarAuditoria({
                usuarioId:
                    usuario?.uid || "",
                usuarioNombre:
                    usuario?.nombre ||
                    usuario?.nombreCompleto ||
                    usuario?.email ||
                    "Administrador",
                usuarioRol:
                    usuario?.rol ||
                    "admin",
                modulo:
                    "categorias",
                accion,
                descripcion:
                    descripcionAuditoria,
                entidadTipo:
                    "categoria",
                entidadId:
                    categoriaId,
                entidadNombre:
                    nombre
            });


            mostrarToast(
                "exito",
                "Categoría actualizada",
                "Los cambios se guardaron correctamente."
            );

        } else {

            const referencia =
                collection(
                    db,
                    "categorias"
                );


            const documento =
                await addDoc(
                    referencia,
                    {
                        nombre,
                        descripcion,
                        edadMinima: minima,
                        edadMaxima: maxima,
                        activo: estadoSeleccionado,
                        creadoEn:
                            serverTimestamp(),
                        actualizadoEn:
                            serverTimestamp()
                    }
                );


            categorias.push(
                {
                    id: documento.id,
                    nombre,
                    descripcion,
                    edadMinima: minima,
                    edadMaxima: maxima,
                    activo: estadoSeleccionado
                }
            );


            let descripcionAuditoria =
                `Se creó la categoría ${nombre}.`;


            if (
                minima !== null ||
                maxima !== null
            ) {

                descripcionAuditoria +=
                    ` Rango de edad: ${obtenerRangoEdad(minima, maxima)}.`;

            }


            if (!estadoSeleccionado) {

                descripcionAuditoria +=
                    " Fue registrada como inactiva.";

            }


            await registrarAuditoria({
                usuarioId:
                    usuario?.uid || "",
                usuarioNombre:
                    usuario?.nombre ||
                    usuario?.nombreCompleto ||
                    usuario?.email ||
                    "Administrador",
                usuarioRol:
                    usuario?.rol ||
                    "admin",
                modulo:
                    "categorias",
                accion:
                    "categoria_creada",
                descripcion:
                    descripcionAuditoria,
                entidadTipo:
                    "categoria",
                entidadId:
                    documento.id,
                entidadNombre:
                    nombre
            });


            mostrarToast(
                "exito",
                "Categoría creada",
                "La nueva categoría ya está disponible en el sistema."
            );

        }


        categorias.sort(
            (a, b) =>
                (a.nombre || "").localeCompare(
                    b.nombre || "",
                    "es"
                )
        );


        actualizarResumen();

        aplicarFiltros();

        cerrarModal();

    } catch (error) {

        console.error(
            "Error guardando categoría:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al guardar la categoría."
        );

    } finally {

        bloquearGuardado(false);

    }

}


async function cambiarEstadoRapido(id) {

    const categoria =
        categorias.find(
            item =>
                item.id === id
        );


    if (!categoria) {
        return;
    }


    const nuevoEstado =
        !(categoria.activo !== false);


    try {

        const referencia =
            doc(
                db,
                "categorias",
                categoria.id
            );


        await updateDoc(
            referencia,
            {
                activo: nuevoEstado,
                actualizadoEn:
                    serverTimestamp()
            }
        );


        categoria.activo =
            nuevoEstado;


        await registrarAuditoria({
            usuarioId:
                usuario?.uid || "",
            usuarioNombre:
                usuario?.nombre ||
                usuario?.nombreCompleto ||
                usuario?.email ||
                "Administrador",
            usuarioRol:
                usuario?.rol ||
                "admin",
            modulo:
                "categorias",
            accion:
                nuevoEstado
                    ? "categoria_activada"
                    : "categoria_desactivada",
            descripcion:
                nuevoEstado
                    ? `Se activó la categoría ${categoria.nombre || "Sin nombre"}.`
                    : `Se desactivó la categoría ${categoria.nombre || "Sin nombre"}.`,
            entidadTipo:
                "categoria",
            entidadId:
                categoria.id,
            entidadNombre:
                categoria.nombre || "Sin nombre"
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
                : "La categoría conservará su historial, pero no estará disponible para nuevos registros."
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

    }

}


function obtenerCambiosCategoria(
    anterior,
    nuevo
) {

    const cambios = [];


    if (
        normalizarTexto(anterior.nombre) !==
        normalizarTexto(nuevo.nombre)
    ) {

        cambios.push(
            `nombre de "${anterior.nombre || "Sin nombre"}" a "${nuevo.nombre || "Sin nombre"}"`
        );

    }


    if (
        normalizarTexto(anterior.descripcion) !==
        normalizarTexto(nuevo.descripcion)
    ) {

        cambios.push(
            "descripción"
        );

    }


    if (
        anterior.edadMinima !==
        nuevo.edadMinima
    ) {

        cambios.push(
            `edad mínima de "${formatearEdad(anterior.edadMinima)}" a "${formatearEdad(nuevo.edadMinima)}"`
        );

    }


    if (
        anterior.edadMaxima !==
        nuevo.edadMaxima
    ) {

        cambios.push(
            `edad máxima de "${formatearEdad(anterior.edadMaxima)}" a "${formatearEdad(nuevo.edadMaxima)}"`
        );

    }


    if (
        anterior.activo !==
        nuevo.activo
    ) {

        cambios.push(
            `estado de "${anterior.activo ? "Activa" : "Inactiva"}" a "${nuevo.activo ? "Activa" : "Inactiva"}"`
        );

    }


    return cambios;

}


function obtenerRangoEdad(
    minima,
    maxima
) {

    if (
        minima !== null &&
        maxima !== null
    ) {

        return `${minima} a ${maxima} años`;

    }


    if (minima !== null) {

        return `desde ${minima} años`;

    }


    if (maxima !== null) {

        return `hasta ${maxima} años`;

    }


    return "sin límite";

}


function formatearEdad(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return "Sin límite";

    }


    return `${valor} años`;

}


function bloquearGuardado(bloquear) {

    btnGuardarCategoria.disabled =
        bloquear;


    btnGuardarCategoria.textContent =
        bloquear
            ? "Guardando..."
            : "Guardar categoría";

}


function convertirNumeroOpcional(valor) {

    const texto =
        String(valor).trim();


    if (!texto) {
        return null;
    }


    const numero =
        Number(texto);


    if (
        Number.isNaN(numero)
    ) {

        return null;

    }


    return numero;

}


function obtenerInicial(nombre) {

    if (!nombre) {
        return "A";
    }


    return nombre
        .trim()
        .charAt(0)
        .toUpperCase();

}


function normalizarTexto(texto) {

    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

}


function escaparHTML(texto) {

    return String(texto)
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


    if (tipo === "error") {

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