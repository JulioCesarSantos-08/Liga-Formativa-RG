import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";

import {
    subirLogoEquipo
} from "../cloudinary.js";

import {
    registrarAuditoria
} from "../auditoria.js";


const adminInicial = document.getElementById("adminInicial");

const totalEquipos = document.getElementById("totalEquipos");
const totalActivos = document.getElementById("totalActivos");
const totalDescalificados = document.getElementById("totalDescalificados");
const totalConResponsable = document.getElementById("totalConResponsable");

const buscarEquipo = document.getElementById("buscarEquipo");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroEstado = document.getElementById("filtroEstado");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const gridEquipos = document.getElementById("gridEquipos");

const btnNuevoEquipo = document.getElementById("btnNuevoEquipo");

const modalEquipo = document.getElementById("modalEquipo");
const modalTitulo = document.getElementById("modalTitulo");

const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarModal = document.getElementById("btnCancelarModal");
const btnGuardarEquipo = document.getElementById("btnGuardarEquipo");

const formEquipo = document.getElementById("formEquipo");

const nombreEquipo = document.getElementById("nombreEquipo");
const categoriaEquipo = document.getElementById("categoriaEquipo");
const responsableEquipo = document.getElementById("responsableEquipo");
const descripcionEquipo = document.getElementById("descripcionEquipo");

const logoEquipo = document.getElementById("logoEquipo");
const previewLogo = document.getElementById("previewLogo");
const previewInicial = document.getElementById("previewInicial");
const previewLogoImagen = document.getElementById("previewLogoImagen");

const btnEstadoActivo = document.getElementById("btnEstadoActivo");
const btnEstadoInactivo = document.getElementById("btnEstadoInactivo");
const btnEstadoDescalificado = document.getElementById("btnEstadoDescalificado");

const grupoMotivoDescalificacion = document.getElementById("grupoMotivoDescalificacion");
const motivoDescalificacion = document.getElementById("motivoDescalificacion");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let equipos = [];
let categorias = [];
let responsables = [];

let equipoSeleccionado = null;
let estadoSeleccionado = "activo";

let logoSeleccionado = null;
let previewLogoURL = null;

let toastTimer = null;


const usuario = await protegerPagina([
    "admin"
]);


if (usuario) {

    cargarAdministrador(usuario);
    activarEventos();

    await Promise.all([
        cargarCategorias(),
        cargarResponsables()
    ]);

    await cargarEquipos();

    revisarAccionURL();

}


function cargarAdministrador(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Administrador";

    adminInicial.textContent =
        obtenerInicial(nombre);

}


function activarEventos() {

    btnNuevoEquipo.addEventListener(
        "click",
        abrirModalNuevoEquipo
    );


    buscarEquipo.addEventListener(
        "input",
        aplicarFiltros
    );


    filtroCategoria.addEventListener(
        "change",
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


    modalEquipo.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modalEquipo
            ) {

                cerrarModal();

            }

        }
    );


    formEquipo.addEventListener(
        "submit",
        guardarEquipo
    );


    btnEstadoActivo.addEventListener(
        "click",
        () => {

            seleccionarEstado(
                "activo"
            );

        }
    );


    btnEstadoInactivo.addEventListener(
        "click",
        () => {

            seleccionarEstado(
                "inactivo"
            );

        }
    );


    btnEstadoDescalificado.addEventListener(
        "click",
        () => {

            seleccionarEstado(
                "descalificado"
            );

        }
    );


    logoEquipo.addEventListener(
        "change",
        manejarSeleccionLogo
    );


    nombreEquipo.addEventListener(
        "input",
        actualizarInicialPreview
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !modalEquipo.classList.contains("oculto")
            ) {

                cerrarModal();

            }

        }
    );

}


async function cargarCategorias() {

    try {

        const referencia =
            collection(
                db,
                "categorias"
            );


        const snapshot =
            await getDocs(
                referencia
            );


        categorias =
            snapshot.docs
                .map(
                    documento => ({
                        id: documento.id,
                        ...documento.data()
                    })
                )
                .filter(
                    categoria =>
                        categoria.activo !== false
                )
                .sort(
                    (a, b) =>
                        (a.nombre || "")
                            .localeCompare(
                                b.nombre || "",
                                "es"
                            )
                );


        llenarSelectCategorias();

    } catch (error) {

        console.error(
            "Error cargando categorías:",
            error
        );

        mostrarToast(
            "error",
            "No se cargaron las categorías",
            "Revisa Firestore e intenta nuevamente."
        );

    }

}


async function cargarResponsables() {

    try {

        const referencia =
            collection(
                db,
                "usuarios"
            );


        const consulta =
            query(
                referencia,
                where(
                    "rol",
                    "==",
                    "jefeEquipo"
                )
            );


        const snapshot =
            await getDocs(
                consulta
            );


        responsables =
            snapshot.docs
                .map(
                    documento => ({
                        id: documento.id,
                        ...documento.data()
                    })
                )
                .filter(
                    usuario =>
                        usuario.activo !== false
                )
                .sort(
                    (a, b) =>
                        (a.nombre || "")
                            .localeCompare(
                                b.nombre || "",
                                "es"
                            )
                );


        llenarSelectResponsables();

    } catch (error) {

        console.error(
            "Error cargando responsables:",
            error
        );

    }

}


async function cargarEquipos() {

    mostrarCarga();


    try {

        const referencia =
            collection(
                db,
                "equipos"
            );


        const snapshot =
            await getDocs(
                referencia
            );


        equipos =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        equipos.sort(
            (a, b) =>
                (a.nombre || "")
                    .localeCompare(
                        b.nombre || "",
                        "es"
                    )
        );


        actualizarResumen();
        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando equipos:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        gridEquipos.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            "No pudimos cargar los equipos";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            "Revisa la conexión con Firebase e intenta nuevamente.";

    }

}


function llenarSelectCategorias() {

    categoriaEquipo.innerHTML = `
        <option value="">
            Selecciona una categoría
        </option>
    `;


    filtroCategoria.innerHTML = `
        <option value="todas">
            Todas las categorías
        </option>
    `;


    categorias.forEach(
        (categoria) => {

            const optionModal =
                document.createElement("option");

            optionModal.value =
                categoria.id;

            optionModal.textContent =
                categoria.nombre || "Sin nombre";


            categoriaEquipo.appendChild(
                optionModal
            );


            const optionFiltro =
                document.createElement("option");

            optionFiltro.value =
                categoria.id;

            optionFiltro.textContent =
                categoria.nombre || "Sin nombre";


            filtroCategoria.appendChild(
                optionFiltro
            );

        }
    );

}


function llenarSelectResponsables() {

    responsableEquipo.innerHTML = `
        <option value="">
            Sin responsable asignado
        </option>
    `;


    responsables.forEach(
        (responsable) => {

            const option =
                document.createElement("option");

            option.value =
                responsable.id;

            option.textContent =
                responsable.nombre ||
                responsable.email ||
                "Usuario";


            responsableEquipo.appendChild(
                option
            );

        }
    );

}


function mostrarCarga() {

    estadoCarga.classList.remove(
        "oculto"
    );


    estadoVacio.classList.add(
        "oculto"
    );


    gridEquipos.classList.add(
        "oculto"
    );

}


function actualizarResumen() {

    totalEquipos.textContent =
        equipos.length;


    totalActivos.textContent =
        equipos.filter(
            equipo =>
                obtenerEstadoEquipo(equipo) ===
                "activo"
        ).length;


    totalDescalificados.textContent =
        equipos.filter(
            equipo =>
                obtenerEstadoEquipo(equipo) ===
                "descalificado"
        ).length;


    totalConResponsable.textContent =
        equipos.filter(
            equipo =>
                Boolean(
                    equipo.responsableId
                )
        ).length;

}


function aplicarFiltros() {

    const texto =
        normalizarTexto(
            buscarEquipo.value
        );


    const categoria =
        filtroCategoria.value;


    const estado =
        filtroEstado.value;


    const lista =
        equipos.filter(
            (equipo) => {

                const coincideTexto =
                    !texto ||
                    normalizarTexto(
                        equipo.nombre || ""
                    ).includes(texto) ||
                    normalizarTexto(
                        equipo.descripcion || ""
                    ).includes(texto);


                const coincideCategoria =
                    categoria === "todas" ||
                    equipo.categoriaId === categoria;


                const estadoEquipo =
                    obtenerEstadoEquipo(
                        equipo
                    );


                const coincideEstado =
                    estado === "todos" ||
                    estadoEquipo === estado;


                return (
                    coincideTexto &&
                    coincideCategoria &&
                    coincideEstado
                );

            }
        );


    renderizarEquipos(
        lista
    );

}


function renderizarEquipos(lista) {

    estadoCarga.classList.add(
        "oculto"
    );


    gridEquipos.innerHTML =
        "";


    if (!lista.length) {

        gridEquipos.classList.add(
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


    gridEquipos.classList.remove(
        "oculto"
    );


    lista.forEach(
        (equipo) => {

            const categoria =
                categorias.find(
                    item =>
                        item.id === equipo.categoriaId
                );


            const responsable =
                responsables.find(
                    item =>
                        item.id === equipo.responsableId
                );


            const estado =
                obtenerEstadoEquipo(
                    equipo
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                `equipo-card ${estado}`;


            const logoHTML =
                equipo.logoUrl
                    ? `
                        <img
                            src="${escaparHTML(equipo.logoUrl)}"
                            alt="${escaparHTML(equipo.nombre || "Equipo")}"
                        >
                    `
                    : escaparHTML(
                        obtenerInicial(
                            equipo.nombre || "E"
                        )
                    );


            const motivoHTML =
                estado === "descalificado"
                    ? `
                        <div class="motivo-descalificacion">
                            <strong>Motivo:</strong>
                            ${escaparHTML(
                                equipo.motivoDescalificacion ||
                                "Sin motivo registrado"
                            )}
                        </div>
                    `
                    : "";


            card.innerHTML = `

                <div class="equipo-card-top">

                    <div class="equipo-logo">
                        ${logoHTML}
                    </div>


                    <span class="equipo-estado ${estado}">
                        ${textoEstado(estado)}
                    </span>

                </div>


                <h3>
                    ${escaparHTML(
                        equipo.nombre ||
                        "Sin nombre"
                    )}
                </h3>


                <span class="equipo-categoria">
                    ${escaparHTML(
                        categoria?.nombre ||
                        "Categoría no disponible"
                    )}
                </span>


                <p class="equipo-descripcion">
                    ${escaparHTML(
                        equipo.descripcion ||
                        "Sin descripción"
                    )}
                </p>


                <div class="equipo-meta">

                    <div>

                        <span>
                            Responsable
                        </span>

                        <strong>
                            ${escaparHTML(
                                responsable?.nombre ||
                                equipo.responsableNombre ||
                                "Sin asignar"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Jugadores
                        </span>

                        <strong>
                            ${Number(
                                equipo.totalJugadores || 0
                            )} / 26
                        </strong>

                    </div>

                </div>


                ${motivoHTML}


                <div class="equipo-acciones">

                    <button
                        type="button"
                        class="btn-editar-equipo"
                    >
                        Editar
                    </button>


                    <a
                        href="equipo.html?id=${equipo.id}"
                        class="btn-ver-equipo"
                    >
                        Ver equipo
                    </a>

                </div>

            `;


            card.querySelector(
                ".btn-editar-equipo"
            ).addEventListener(
                "click",
                () => {

                    abrirModalEditarEquipo(
                        equipo.id
                    );

                }
            );


            gridEquipos.appendChild(
                card
            );

        }
    );

}


function abrirModalNuevoEquipo() {

    equipoSeleccionado =
        null;


    formEquipo.reset();


    modalTitulo.textContent =
        "Nuevo equipo";


    seleccionarEstado(
        "activo"
    );


    limpiarPreviewLogo();


    grupoMotivoDescalificacion.classList.add(
        "oculto"
    );


    abrirModal();


    setTimeout(
        () => {

            nombreEquipo.focus();

        },
        100
    );

}


function abrirModalEditarEquipo(id) {

    const equipo =
        equipos.find(
            item =>
                item.id === id
        );


    if (!equipo) {
        return;
    }


    equipoSeleccionado =
        equipo;


    modalTitulo.textContent =
        "Editar equipo";


    nombreEquipo.value =
        equipo.nombre || "";


    categoriaEquipo.value =
        equipo.categoriaId || "";


    responsableEquipo.value =
        equipo.responsableId || "";


    descripcionEquipo.value =
        equipo.descripcion || "";


    motivoDescalificacion.value =
        equipo.motivoDescalificacion || "";


    seleccionarEstado(
        obtenerEstadoEquipo(
            equipo
        )
    );


    limpiarPreviewLogo();


    if (equipo.logoUrl) {

        previewLogoImagen.src =
            equipo.logoUrl;


        previewLogoImagen.classList.remove(
            "oculto"
        );


        previewInicial.classList.add(
            "oculto"
        );

    } else {

        previewInicial.textContent =
            obtenerInicial(
                equipo.nombre || "E"
            );

    }


    abrirModal();

}


function abrirModal() {

    modalEquipo.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarModal() {

    modalEquipo.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";


    equipoSeleccionado =
        null;


    limpiarPreviewTemporal();

}


function seleccionarEstado(estado) {

    estadoSeleccionado =
        estado;


    btnEstadoActivo.classList.toggle(
        "activo",
        estado === "activo"
    );


    btnEstadoInactivo.classList.toggle(
        "activo",
        estado === "inactivo"
    );


    btnEstadoDescalificado.classList.toggle(
        "activo",
        estado === "descalificado"
    );


    grupoMotivoDescalificacion.classList.toggle(
        "oculto",
        estado !== "descalificado"
    );

}


function manejarSeleccionLogo() {

    const archivo =
        logoEquipo.files?.[0];


    if (!archivo) {

        logoSeleccionado =
            null;

        return;

    }


    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !tiposPermitidos.includes(
            archivo.type
        )
    ) {

        mostrarToast(
            "error",
            "Imagen no válida",
            "Selecciona una imagen JPG, PNG o WEBP."
        );


        logoEquipo.value =
            "";


        logoSeleccionado =
            null;

        return;

    }


    const maximo =
        5 * 1024 * 1024;


    if (
        archivo.size > maximo
    ) {

        mostrarToast(
            "error",
            "Imagen demasiado grande",
            "Selecciona una imagen menor a 5 MB."
        );


        logoEquipo.value =
            "";


        logoSeleccionado =
            null;

        return;

    }


    logoSeleccionado =
        archivo;


    limpiarPreviewTemporal();


    previewLogoURL =
        URL.createObjectURL(
            archivo
        );


    previewLogoImagen.src =
        previewLogoURL;


    previewLogoImagen.classList.remove(
        "oculto"
    );


    previewInicial.classList.add(
        "oculto"
    );

}


function actualizarInicialPreview() {

    if (
        !previewLogoImagen.classList.contains(
            "oculto"
        )
    ) {
        return;
    }


    previewInicial.textContent =
        obtenerInicial(
            nombreEquipo.value ||
            "E"
        );

}


async function guardarEquipo(event) {

    event.preventDefault();

    const nombre =
        nombreEquipo.value
            .trim()
            .replace(/\s+/g, " ");

    const categoriaId =
        categoriaEquipo.value;

    const responsableId =
        responsableEquipo.value;

    const descripcion =
        descripcionEquipo.value
            .trim()
            .replace(/\s+/g, " ");

    const motivo =
        motivoDescalificacion.value
            .trim()
            .replace(/\s+/g, " ");

    if (!nombre) {

        mostrarToast(
            "error",
            "Nombre requerido",
            "Escribe el nombre del equipo."
        );

        return;

    }

    if (!categoriaId) {

        mostrarToast(
            "error",
            "Categoría requerida",
            "Selecciona la categoría del equipo."
        );

        return;

    }

    if (
        estadoSeleccionado === "descalificado" &&
        !motivo
    ) {

        mostrarToast(
            "error",
            "Motivo requerido",
            "Escribe el motivo de la descalificación."
        );

        return;

    }

    const nombreDuplicado =
        equipos.some(
            (equipo) => {

                if (
                    equipoSeleccionado &&
                    equipo.id === equipoSeleccionado.id
                ) {

                    return false;

                }

                return (
                    equipo.categoriaId === categoriaId &&
                    normalizarTexto(
                        equipo.nombre || ""
                    ) ===
                    normalizarTexto(
                        nombre
                    )
                );

            }
        );

    if (nombreDuplicado) {

        mostrarToast(
            "error",
            "Equipo existente",
            "Ya existe un equipo con ese nombre en la categoría seleccionada."
        );

        return;

    }

    const categoria =
        categorias.find(
            item =>
                item.id === categoriaId
        );

    const responsable =
        responsables.find(
            item =>
                item.id === responsableId
        );

    const esEdicion =
        Boolean(equipoSeleccionado);

    const datosAnteriores =
        equipoSeleccionado
            ? {
                id:
                    equipoSeleccionado.id,
                nombre:
                    equipoSeleccionado.nombre || "",
                categoriaId:
                    equipoSeleccionado.categoriaId || "",
                categoriaNombre:
                    equipoSeleccionado.categoriaNombre || "",
                responsableId:
                    equipoSeleccionado.responsableId || "",
                responsableNombre:
                    equipoSeleccionado.responsableNombre || "",
                descripcion:
                    equipoSeleccionado.descripcion || "",
                estado:
                    obtenerEstadoEquipo(
                        equipoSeleccionado
                    ),
                motivoDescalificacion:
                    equipoSeleccionado.motivoDescalificacion || "",
                logoUrl:
                    equipoSeleccionado.logoUrl || null
            }
            : null;

    bloquearGuardado(
        true
    );

    try {

        let logoUrl =
            equipoSeleccionado?.logoUrl ||
            null;

        let logoPublicId =
            equipoSeleccionado?.logoPublicId ||
            null;

        const cambioLogo =
            Boolean(logoSeleccionado);

        if (logoSeleccionado) {

            btnGuardarEquipo.textContent =
                "Subiendo logo...";

            const resultadoLogo =
                await subirLogoEquipo(
                    logoSeleccionado
                );

            logoUrl =
                resultadoLogo.url;

            logoPublicId =
                resultadoLogo.publicId;

            btnGuardarEquipo.textContent =
                "Guardando equipo...";

        }

        const datos = {
            nombre,
            categoriaId,
            categoriaNombre:
                categoria?.nombre || "",
            responsableId:
                responsableId || null,
            responsableNombre:
                responsable?.nombre || "",
            descripcion,
            estado:
                estadoSeleccionado,
            activo:
                estadoSeleccionado === "activo",
            descalificado:
                estadoSeleccionado === "descalificado",
            motivoDescalificacion:
                estadoSeleccionado === "descalificado"
                    ? motivo
                    : "",
            logoUrl,
            logoPublicId,
            actualizadoEn:
                serverTimestamp()
        };

        let equipoId = "";

        if (equipoSeleccionado) {

            equipoId =
                equipoSeleccionado.id;

            const referencia =
                doc(
                    db,
                    "equipos",
                    equipoSeleccionado.id
                );

            await updateDoc(
                referencia,
                datos
            );

            Object.assign(
                equipoSeleccionado,
                datos
            );

            const cambios =
                obtenerCambiosAuditoriaEquipo(
                    datosAnteriores,
                    datos,
                    cambioLogo
                );

            let accion =
                "equipo_actualizado";

            let descripcionAuditoria =
                `Se actualizó el equipo ${nombre}.`;

            if (
                datosAnteriores.estado !==
                estadoSeleccionado
            ) {

                if (
                    estadoSeleccionado ===
                    "descalificado"
                ) {

                    accion =
                        "equipo_descalificado";

                    descripcionAuditoria =
                        `Se descalificó al equipo ${nombre}. Motivo: ${motivo}`;

                } else if (
                    datosAnteriores.estado ===
                    "descalificado"
                ) {

                    accion =
                        "equipo_reactivado";

                    descripcionAuditoria =
                        `El equipo ${nombre} dejó de estar descalificado y cambió a estado ${textoEstado(estadoSeleccionado).toLowerCase()}.`;

                } else {

                    accion =
                        "estado_equipo_actualizado";

                    descripcionAuditoria =
                        `El equipo ${nombre} cambió de ${textoEstado(datosAnteriores.estado).toLowerCase()} a ${textoEstado(estadoSeleccionado).toLowerCase()}.`;

                }

            } else if (
                datosAnteriores.responsableId !==
                (responsableId || "")
            ) {

                accion =
                    "responsable_actualizado";

                const responsableAnterior =
                    datosAnteriores.responsableNombre ||
                    "Sin responsable";

                const responsableNuevo =
                    responsable?.nombre ||
                    "Sin responsable";

                descripcionAuditoria =
                    `Se cambió el responsable del equipo ${nombre} de ${responsableAnterior} a ${responsableNuevo}.`;

            } else if (
                datosAnteriores.categoriaId !==
                categoriaId
            ) {

                accion =
                    "categoria_equipo_actualizada";

                descripcionAuditoria =
                    `El equipo ${nombre} cambió de categoría de ${datosAnteriores.categoriaNombre || "Sin categoría"} a ${categoria?.nombre || "Sin categoría"}.`;

            } else if (cambioLogo) {

                accion =
                    "logo_equipo_actualizado";

                descripcionAuditoria =
                    `Se actualizó el logo del equipo ${nombre}.`;

            } else if (cambios.length) {

                descripcionAuditoria =
                    `Se actualizó el equipo ${nombre}. Cambios: ${cambios.join(", ")}.`;

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
                    "equipos",
                accion,
                descripcion:
                    descripcionAuditoria,
                entidadTipo:
                    "equipo",
                entidadId:
                    equipoId,
                entidadNombre:
                    nombre
            });

            mostrarToast(
                "exito",
                "Equipo actualizado",
                logoSeleccionado
                    ? "El equipo y su nuevo logo se guardaron correctamente."
                    : "Los cambios se guardaron correctamente."
            );

        } else {

            const referencia =
                collection(
                    db,
                    "equipos"
                );

            const documento =
                await addDoc(
                    referencia,
                    {
                        ...datos,
                        totalJugadores: 0,
                        pj: 0,
                        pg: 0,
                        pe: 0,
                        pp: 0,
                        gf: 0,
                        gc: 0,
                        dg: 0,
                        pts: 0,
                        creadoEn:
                            serverTimestamp()
                    }
                );

            equipoId =
                documento.id;

            equipos.push(
                {
                    id:
                        documento.id,
                    ...datos,
                    totalJugadores: 0,
                    pj: 0,
                    pg: 0,
                    pe: 0,
                    pp: 0,
                    gf: 0,
                    gc: 0,
                    dg: 0,
                    pts: 0
                }
            );

            let descripcionAuditoria =
                `Se creó el equipo ${nombre} en la categoría ${categoria?.nombre || "Sin categoría"}.`;

            if (responsable?.nombre) {

                descripcionAuditoria +=
                    ` Responsable asignado: ${responsable.nombre}.`;

            }

            if (
                estadoSeleccionado ===
                "descalificado"
            ) {

                descripcionAuditoria +=
                    ` El equipo fue registrado como descalificado. Motivo: ${motivo}.`;

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
                    "equipos",
                accion:
                    "equipo_creado",
                descripcion:
                    descripcionAuditoria,
                entidadTipo:
                    "equipo",
                entidadId:
                    documento.id,
                entidadNombre:
                    nombre
            });

            mostrarToast(
                "exito",
                "Equipo creado",
                logoSeleccionado
                    ? "El equipo y su logo ya quedaron registrados."
                    : "El equipo ya quedó registrado en la liga."
            );

        }

        equipos.sort(
            (a, b) =>
                (a.nombre || "")
                    .localeCompare(
                        b.nombre || "",
                        "es"
                    )
        );

        logoSeleccionado =
            null;

        actualizarResumen();
        aplicarFiltros();
        cerrarModal();

    } catch (error) {

        console.error(
            "Error guardando equipo:",
            error
        );

        let mensaje =
            "Ocurrió un problema al guardar el equipo.";

        if (
            error?.message
        ) {

            mensaje =
                error.message;

        }

        mostrarToast(
            "error",
            "No se pudo guardar",
            mensaje
        );

    } finally {

        bloquearGuardado(
            false
        );

    }

}

function obtenerCambiosAuditoriaEquipo(
    anterior,
    nuevo,
    cambioLogo
) {

    if (!anterior) {
        return [];
    }

    const cambios = [];

    if (
        normalizarTexto(anterior.nombre) !==
        normalizarTexto(nuevo.nombre)
    ) {

        cambios.push(
            `nombre de "${anterior.nombre}" a "${nuevo.nombre}"`
        );

    }

    if (
        anterior.categoriaId !==
        nuevo.categoriaId
    ) {

        cambios.push(
            `categoría de "${anterior.categoriaNombre || "Sin categoría"}" a "${nuevo.categoriaNombre || "Sin categoría"}"`
        );

    }

    const responsableAnterior =
        anterior.responsableId || "";

    const responsableNuevo =
        nuevo.responsableId || "";

    if (
        responsableAnterior !==
        responsableNuevo
    ) {

        cambios.push(
            `responsable de "${anterior.responsableNombre || "Sin responsable"}" a "${nuevo.responsableNombre || "Sin responsable"}"`
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
        anterior.estado !==
        nuevo.estado
    ) {

        cambios.push(
            `estado de "${textoEstado(anterior.estado)}" a "${textoEstado(nuevo.estado)}"`
        );

    }

    if (
        normalizarTexto(
            anterior.motivoDescalificacion
        ) !==
        normalizarTexto(
            nuevo.motivoDescalificacion
        )
    ) {

        cambios.push(
            "motivo de descalificación"
        );

    }

    if (cambioLogo) {

        cambios.push(
            "logo"
        );

    }

    return cambios;

}


function revisarAccionURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    if (
        parametros.get("accion") ===
        "nuevo"
    ) {

        abrirModalNuevoEquipo();

    }

}


function obtenerEstadoEquipo(equipo) {

    if (
        equipo.estado === "descalificado" ||
        equipo.descalificado === true
    ) {

        return "descalificado";

    }


    if (
        equipo.estado === "inactivo" ||
        equipo.activo === false
    ) {

        return "inactivo";

    }


    return "activo";

}


function textoEstado(estado) {

    switch (estado) {

        case "descalificado":
            return "Descalificado";

        case "inactivo":
            return "Inactivo";

        case "activo":
        default:
            return "Activo";

    }

}


function limpiarPreviewLogo() {

    limpiarPreviewTemporal();


    logoSeleccionado =
        null;


    logoEquipo.value =
        "";


    previewLogoImagen.removeAttribute(
        "src"
    );


    previewLogoImagen.classList.add(
        "oculto"
    );


    previewInicial.classList.remove(
        "oculto"
    );


    previewInicial.textContent =
        obtenerInicial(
            nombreEquipo.value ||
            "E"
        );

}


function limpiarPreviewTemporal() {

    if (previewLogoURL) {

        URL.revokeObjectURL(
            previewLogoURL
        );


        previewLogoURL =
            null;

    }

}


function bloquearGuardado(bloquear) {

    btnGuardarEquipo.disabled =
        bloquear;


    btnGuardarEquipo.textContent =
        bloquear
            ? "Guardando..."
            : "Guardar equipo";

}


function obtenerInicial(nombre) {

    const texto =
        String(nombre || "")
            .trim();


    if (!texto) {
        return "E";
    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function normalizarTexto(texto) {

    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

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