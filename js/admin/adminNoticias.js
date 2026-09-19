import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
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


const btnNuevaNoticia =
    document.getElementById("btnNuevaNoticia");

const btnNuevaNoticiaHero =
    document.getElementById("btnNuevaNoticiaHero");

const buscarNoticia =
    document.getElementById("buscarNoticia");

const filtroTipo =
    document.getElementById("filtroTipo");

const filtroEstado =
    document.getElementById("filtroEstado");


const totalNoticias =
    document.getElementById("totalNoticias");

const totalActivas =
    document.getElementById("totalActivas");

const totalDestacadas =
    document.getElementById("totalDestacadas");

const totalInactivas =
    document.getElementById("totalInactivas");

const contadorListado =
    document.getElementById("contadorListado");


const estadoCarga =
    document.getElementById("estadoCarga");

const estadoVacio =
    document.getElementById("estadoVacio");

const listaNoticiasAdmin =
    document.getElementById("listaNoticiasAdmin");


const modalNoticia =
    document.getElementById("modalNoticia");

const modalTitulo =
    document.getElementById("modalTitulo");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCancelarModal =
    document.getElementById("btnCancelarModal");

const formNoticia =
    document.getElementById("formNoticia");

const noticiaId =
    document.getElementById("noticiaId");


const tituloNoticia =
    document.getElementById("tituloNoticia");

const tipoNoticia =
    document.getElementById("tipoNoticia");

const estadoNoticia =
    document.getElementById("estadoNoticia");

const resumenNoticia =
    document.getElementById("resumenNoticia");

const contenidoNoticia =
    document.getElementById("contenidoNoticia");

const imagenNoticia =
    document.getElementById("imagenNoticia");

const previewPlaceholder =
    document.getElementById("previewPlaceholder");

const previewImagenArchivo =
    document.getElementById("previewImagenArchivo");

const estadoImagen =
    document.getElementById("estadoImagen");

const noticiaDestacada =
    document.getElementById("noticiaDestacada");


const tipoEnlace =
    document.getElementById("tipoEnlace");

const grupoPartido =
    document.getElementById("grupoPartido");

const grupoEquipo =
    document.getElementById("grupoEquipo");

const grupoJugador =
    document.getElementById("grupoJugador");

const grupoEnlacePersonalizado =
    document.getElementById("grupoEnlacePersonalizado");

const partidoNoticia =
    document.getElementById("partidoNoticia");

const equipoNoticia =
    document.getElementById("equipoNoticia");

const jugadorNoticia =
    document.getElementById("jugadorNoticia");

const enlaceNoticia =
    document.getElementById("enlaceNoticia");

const textoBoton =
    document.getElementById("textoBoton");

const btnGuardarNoticia =
    document.getElementById("btnGuardarNoticia");


const modalEliminar =
    document.getElementById("modalEliminar");

const btnCancelarEliminar =
    document.getElementById("btnCancelarEliminar");

const btnConfirmarEliminar =
    document.getElementById("btnConfirmarEliminar");


const toast =
    document.getElementById("toast");

const toastIcono =
    document.getElementById("toastIcono");

const toastTitulo =
    document.getElementById("toastTitulo");

const toastTexto =
    document.getElementById("toastTexto");


let noticias = [];

let partidos = [];

let equipos = [];

let jugadores = [];

let noticiaSeleccionada = null;

let noticiaEliminar = null;

let imagenSeleccionada = null;

let previewTemporalURL = null;

let toastTimer = null;


const usuario =
    await protegerPagina([
        "admin"
    ]);


if (usuario) {

    activarEventos();

    await cargarDatos();

}


function activarEventos() {

    btnNuevaNoticia.addEventListener(
        "click",
        abrirNuevaNoticia
    );


    btnNuevaNoticiaHero.addEventListener(
        "click",
        abrirNuevaNoticia
    );


    btnCerrarModal.addEventListener(
        "click",
        cerrarModalNoticia
    );


    btnCancelarModal.addEventListener(
        "click",
        cerrarModalNoticia
    );


    modalNoticia.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalNoticia
            ) {

                cerrarModalNoticia();

            }

        }
    );


    buscarNoticia.addEventListener(
        "input",
        aplicarFiltros
    );


    filtroTipo.addEventListener(
        "change",
        aplicarFiltros
    );


    filtroEstado.addEventListener(
        "change",
        aplicarFiltros
    );


    tipoEnlace.addEventListener(
        "change",
        actualizarCamposEnlace
    );


    imagenNoticia.addEventListener(
        "change",
        manejarImagen
    );


    formNoticia.addEventListener(
        "submit",
        guardarNoticia
    );


    btnCancelarEliminar.addEventListener(
        "click",
        cerrarModalEliminar
    );


    btnConfirmarEliminar.addEventListener(
        "click",
        eliminarNoticia
    );


    modalEliminar.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalEliminar
            ) {

                cerrarModalEliminar();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;

            }


            if (
                !modalEliminar.hidden
            ) {

                cerrarModalEliminar();

                return;

            }


            if (
                !modalNoticia.hidden
            ) {

                cerrarModalNoticia();

            }

        }
    );

}


async function cargarDatos() {

    mostrarCarga();


    try {

        const [
            snapshotNoticias,
            snapshotPartidos,
            snapshotEquipos,
            snapshotJugadores
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "noticias"
                )
            ),

            getDocs(
                collection(
                    db,
                    "partidos"
                )
            ),

            getDocs(
                collection(
                    db,
                    "equipos"
                )
            ),

            getDocs(
                collection(
                    db,
                    "jugadores"
                )
            )

        ]);


        noticias =
            snapshotNoticias.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        partidos =
            snapshotPartidos.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        equipos =
            snapshotEquipos.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        jugadores =
            snapshotJugadores.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        ordenarDatos();

        llenarSelectores();

        actualizarResumen();

        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando noticias:",
            error
        );


        estadoCarga.hidden =
            true;

        listaNoticiasAdmin.hidden =
            true;

        estadoVacio.hidden =
            false;


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            "No pudimos cargar las noticias";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            "Revisa la conexión o los permisos de Firestore.";

    }

}


function ordenarDatos() {

    noticias.sort(
        (a, b) => {

            const fechaA =
                obtenerFechaNoticia(
                    a
                );


            const fechaB =
                obtenerFechaNoticia(
                    b
                );


            return (
                (fechaB?.getTime() || 0) -
                (fechaA?.getTime() || 0)
            );

        }
    );


    equipos.sort(
        (a, b) =>
            String(
                a.nombre || ""
            ).localeCompare(
                String(
                    b.nombre || ""
                ),
                "es"
            )
    );


    jugadores.sort(
        (a, b) =>
            obtenerNombreJugador(
                a
            ).localeCompare(
                obtenerNombreJugador(
                    b
                ),
                "es"
            )
    );


    partidos.sort(
        (a, b) => {

            const fechaA =
                convertirFecha(
                    a.fecha
                );


            const fechaB =
                convertirFecha(
                    b.fecha
                );


            return (
                (fechaB?.getTime() || 0) -
                (fechaA?.getTime() || 0)
            );

        }
    );

}


function llenarSelectores() {

    partidoNoticia.innerHTML = `
        <option value="">
            Selecciona un partido
        </option>
    `;


    partidos.forEach(
        partido => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                partido.id;


            option.textContent =
                obtenerTextoPartido(
                    partido
                );


            partidoNoticia.appendChild(
                option
            );

        }
    );


    equipoNoticia.innerHTML = `
        <option value="">
            Selecciona un equipo
        </option>
    `;


    equipos.forEach(
        equipo => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                equipo.id;


            option.textContent =
                equipo.nombre ||
                "Equipo";


            equipoNoticia.appendChild(
                option
            );

        }
    );


    jugadorNoticia.innerHTML = `
        <option value="">
            Selecciona un jugador
        </option>
    `;


    jugadores.forEach(
        jugador => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                jugador.id;


            option.textContent =
                `${obtenerNombreJugador(
                    jugador
                )} · ${
                    jugador.equipoNombre ||
                    "Sin equipo"
                }`;


            jugadorNoticia.appendChild(
                option
            );

        }
    );

}


function abrirNuevaNoticia() {

    noticiaSeleccionada =
        null;


    formNoticia.reset();


    noticiaId.value =
        "";


    modalTitulo.textContent =
        "Nueva noticia";


    estadoNoticia.value =
        "activa";


    tipoNoticia.value =
        "comunicado";


    tipoEnlace.value =
        "ninguno";


    noticiaDestacada.checked =
        false;


    imagenSeleccionada =
        null;


    limpiarPreviewTemporal();

    limpiarPreviewImagen();

    actualizarCamposEnlace();


    estadoImagen.textContent =
        "";


    btnGuardarNoticia.textContent =
        "Guardar publicación";


    modalNoticia.hidden =
        false;


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            tituloNoticia.focus();

        },
        100
    );

}


function abrirEditarNoticia(
    id
) {

    const noticia =
        noticias.find(
            item =>
                item.id === id
        );


    if (!noticia) {

        return;

    }


    noticiaSeleccionada =
        noticia;


    formNoticia.reset();


    noticiaId.value =
        noticia.id;


    modalTitulo.textContent =
        "Editar noticia";


    tituloNoticia.value =
        noticia.titulo ||
        "";


    tipoNoticia.value =
        normalizarTipo(
            noticia.tipo
        );


    estadoNoticia.value =
        noticia.activa === false
            ? "inactiva"
            : "activa";


    resumenNoticia.value =
        noticia.resumen ||
        noticia.descripcion ||
        "";


    contenidoNoticia.value =
        noticia.contenido ||
        "";


    noticiaDestacada.checked =
        noticia.destacada ===
        true;


    textoBoton.value =
        noticia.textoBoton ||
        "";


    imagenSeleccionada =
        null;


    limpiarPreviewTemporal();


    if (
        noticia.imagenUrl
    ) {

        previewImagenArchivo.src =
            noticia.imagenUrl;


        previewImagenArchivo.hidden =
            false;


        previewPlaceholder.hidden =
            true;


        estadoImagen.textContent =
            "Imagen actual";

    } else {

        limpiarPreviewImagen();

        estadoImagen.textContent =
            "";

    }


    configurarEnlaceEdicion(
        noticia
    );


    btnGuardarNoticia.textContent =
        "Guardar cambios";


    modalNoticia.hidden =
        false;


    document.body.style.overflow =
        "hidden";

}


function configurarEnlaceEdicion(
    noticia
) {

    partidoNoticia.value =
        "";


    equipoNoticia.value =
        "";


    jugadorNoticia.value =
        "";


    enlaceNoticia.value =
        "";


    if (
        noticia.partidoId
    ) {

        tipoEnlace.value =
            "partido";


        partidoNoticia.value =
            noticia.partidoId;

    } else if (
        noticia.equipoId
    ) {

        tipoEnlace.value =
            "equipo";


        equipoNoticia.value =
            noticia.equipoId;

    } else if (
        noticia.jugadorId
    ) {

        tipoEnlace.value =
            "jugador";


        jugadorNoticia.value =
            noticia.jugadorId;

    } else if (
        noticia.enlace ||
        noticia.url
    ) {

        tipoEnlace.value =
            "personalizado";


        enlaceNoticia.value =
            noticia.enlace ||
            noticia.url ||
            "";

    } else {

        tipoEnlace.value =
            "ninguno";

    }


    actualizarCamposEnlace();

}


function actualizarCamposEnlace() {

    const tipo =
        tipoEnlace.value;


    grupoPartido.hidden =
        tipo !== "partido";


    grupoEquipo.hidden =
        tipo !== "equipo";


    grupoJugador.hidden =
        tipo !== "jugador";


    grupoEnlacePersonalizado.hidden =
        tipo !== "personalizado";

}


function manejarImagen() {

    const archivo =
        imagenNoticia.files?.[0];


    if (!archivo) {

        imagenSeleccionada =
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


        imagenNoticia.value =
            "";


        imagenSeleccionada =
            null;

        return;

    }


    const maximo =
        5 * 1024 * 1024;


    if (
        archivo.size >
        maximo
    ) {

        mostrarToast(
            "error",
            "Imagen demasiado grande",
            "La imagen debe pesar menos de 5 MB."
        );


        imagenNoticia.value =
            "";


        imagenSeleccionada =
            null;

        return;

    }


    imagenSeleccionada =
        archivo;


    limpiarPreviewTemporal();


    previewTemporalURL =
        URL.createObjectURL(
            archivo
        );


    previewImagenArchivo.src =
        previewTemporalURL;


    previewImagenArchivo.hidden =
        false;


    previewPlaceholder.hidden =
        true;


    estadoImagen.textContent =
        archivo.name;

}


async function guardarNoticia(
    event
) {

    event.preventDefault();


    const titulo =
        tituloNoticia.value
            .trim()
            .replace(
                /\s+/g,
                " "
            );


    const tipo =
        normalizarTipo(
            tipoNoticia.value
        );


    const resumen =
        resumenNoticia.value
            .trim()
            .replace(
                /\s+/g,
                " "
            );


    const contenido =
        contenidoNoticia.value
            .trim();


    const activa =
        estadoNoticia.value ===
        "activa";


    const destacada =
        noticiaDestacada.checked;


    const boton =
        textoBoton.value
            .trim()
            .replace(
                /\s+/g,
                " "
            );


    if (!titulo) {

        mostrarToast(
            "error",
            "Título requerido",
            "Escribe el título de la publicación."
        );

        return;

    }


    if (!resumen) {

        mostrarToast(
            "error",
            "Resumen requerido",
            "Escribe un resumen para la publicación."
        );

        return;

    }


    const datosEnlace =
        obtenerDatosEnlace();


    if (
        datosEnlace.error
    ) {

        mostrarToast(
            "error",
            "Enlace incompleto",
            datosEnlace.error
        );

        return;

    }


    btnGuardarNoticia.disabled =
        true;


    btnGuardarNoticia.textContent =
        imagenSeleccionada
            ? "Subiendo imagen..."
            : "Guardando...";


    try {

        let imagenUrl =
            noticiaSeleccionada
                ?.imagenUrl ||
            "";


        if (
            imagenSeleccionada
        ) {

            estadoImagen.textContent =
                "Subiendo imagen...";


            imagenUrl =
                await subirImagenCloudinary(
                    imagenSeleccionada
                );


            estadoImagen.textContent =
                "Imagen subida correctamente.";


            btnGuardarNoticia.textContent =
                "Guardando publicación...";

        }


        if (
            destacada
        ) {

            await quitarDestacadasAnteriores(
                noticiaSeleccionada?.id ||
                null
            );

        }


        const datos = {

            titulo,

            tipo,

            resumen,

            contenido,

            imagenUrl,

            activa,

            destacada,

            textoBoton:
                boton,

            partidoId:
                datosEnlace.partidoId,

            equipoId:
                datosEnlace.equipoId,

            jugadorId:
                datosEnlace.jugadorId,

            enlace:
                datosEnlace.enlace,

            actualizadoEn:
                serverTimestamp()

        };


if (
    noticiaSeleccionada
) {

    const noticiaAnterior = {
        ...noticiaSeleccionada
    };

    const cambios = [];

    if (
        (noticiaAnterior.titulo || "") !==
        titulo
    ) {
        cambios.push(
            "título"
        );
    }

    if (
        normalizarTipo(
            noticiaAnterior.tipo
        ) !== tipo
    ) {
        cambios.push(
            "tipo"
        );
    }

    if (
        (
            noticiaAnterior.resumen ||
            noticiaAnterior.descripcion ||
            ""
        ) !== resumen
    ) {
        cambios.push(
            "resumen"
        );
    }

    if (
        (noticiaAnterior.contenido || "") !==
        contenido
    ) {
        cambios.push(
            "contenido"
        );
    }

    if (
        (noticiaAnterior.imagenUrl || "") !==
        imagenUrl
    ) {
        cambios.push(
            "imagen"
        );
    }

    if (
        (noticiaAnterior.activa !== false) !==
        activa
    ) {
        cambios.push(
            activa
                ? "publicación activada"
                : "publicación ocultada"
        );
    }

    if (
        (noticiaAnterior.destacada === true) !==
        destacada
    ) {
        cambios.push(
            destacada
                ? "marcada como destacada"
                : "destaque retirado"
        );
    }

    if (
        (noticiaAnterior.textoBoton || "") !==
        boton
    ) {
        cambios.push(
            "texto del botón"
        );
    }

    if (
        (noticiaAnterior.partidoId || null) !==
        datosEnlace.partidoId
    ) {
        cambios.push(
            "partido relacionado"
        );
    }

    if (
        (noticiaAnterior.equipoId || null) !==
        datosEnlace.equipoId
    ) {
        cambios.push(
            "equipo relacionado"
        );
    }

    if (
        (noticiaAnterior.jugadorId || null) !==
        datosEnlace.jugadorId
    ) {
        cambios.push(
            "jugador relacionado"
        );
    }

    if (
        (noticiaAnterior.enlace || "") !==
        datosEnlace.enlace
    ) {
        cambios.push(
            "enlace"
        );
    }

    await updateDoc(
        doc(
            db,
            "noticias",
            noticiaSeleccionada.id
        ),
        datos
    );

    if (
        cambios.length
    ) {

        await registrarAuditoria({
            usuarioId:
                usuario.uid,

            usuarioNombre:
                usuario.nombre ||
                usuario.email ||
                "Administrador",

            usuarioRol:
                usuario.rol ||
                "admin",

            modulo:
                "noticias",

            accion:
                "noticia_actualizada",

            descripcion:
                `Se actualizó la noticia "${titulo}". Cambios: ${cambios.join(", ")}.`,

            entidadTipo:
                "noticia",

            entidadId:
                noticiaSeleccionada.id,

            entidadNombre:
                titulo
        });

    }

    mostrarToast(
        "exito",
        "Noticia actualizada",
        "Los cambios fueron guardados correctamente."
    );

} else {

            await addDoc(
                collection(
                    db,
                    "noticias"
                ),
                {
                    ...datos,

                    creadoEn:
                        serverTimestamp(),

                    publicadoEn:
                        serverTimestamp()
                }
            );


            mostrarToast(
                "exito",
                "Noticia publicada",
                activa
                    ? "La publicación ya está disponible para los usuarios."
                    : "La publicación fue guardada como oculta."
            );

        }


        cerrarModalNoticia();

        await recargarNoticias();

    } catch (error) {

        console.error(
            "Error guardando noticia:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al guardar la publicación."
        );

    } finally {

        btnGuardarNoticia.disabled =
            false;


        btnGuardarNoticia.textContent =
            noticiaSeleccionada
                ? "Guardar cambios"
                : "Guardar publicación";

    }

}


function obtenerDatosEnlace() {

    const tipo =
        tipoEnlace.value;


    const resultado = {

        partidoId:
            null,

        equipoId:
            null,

        jugadorId:
            null,

        enlace:
            ""

    };


    if (
        tipo === "ninguno"
    ) {

        return resultado;

    }


    if (
        tipo === "partido"
    ) {

        if (
            !partidoNoticia.value
        ) {

            return {
                error:
                    "Selecciona el partido relacionado."
            };

        }


        resultado.partidoId =
            partidoNoticia.value;


        return resultado;

    }


    if (
        tipo === "equipo"
    ) {

        if (
            !equipoNoticia.value
        ) {

            return {
                error:
                    "Selecciona el equipo relacionado."
            };

        }


        resultado.equipoId =
            equipoNoticia.value;


        return resultado;

    }


    if (
        tipo === "jugador"
    ) {

        if (
            !jugadorNoticia.value
        ) {

            return {
                error:
                    "Selecciona el jugador relacionado."
            };

        }


        resultado.jugadorId =
            jugadorNoticia.value;


        return resultado;

    }


    if (
        tipo === "personalizado"
    ) {

        const enlace =
            enlaceNoticia.value.trim();


        if (!enlace) {

            return {
                error:
                    "Escribe la dirección del enlace."
            };

        }


        resultado.enlace =
            enlace;


        return resultado;

    }


    return resultado;

}


async function quitarDestacadasAnteriores(
    idActual
) {

    const destacadas =
        noticias.filter(
            noticia =>
                noticia.destacada ===
                    true &&
                noticia.id !==
                    idActual
        );


    await Promise.all(
        destacadas.map(
            noticia =>
                updateDoc(
                    doc(
                        db,
                        "noticias",
                        noticia.id
                    ),
                    {
                        destacada:
                            false,

                        actualizadoEn:
                            serverTimestamp()
                    }
                )
        )
    );

}


async function alternarVisibilidad(
    id
) {

    const noticia =
        noticias.find(
            item =>
                item.id === id
        );


    if (!noticia) {

        return;

    }


    const nuevaActiva =
        noticia.activa === false;


    try {

        await updateDoc(
            doc(
                db,
                "noticias",
                id
            ),
            {
                activa:
                    nuevaActiva,

                actualizadoEn:
                    serverTimestamp()
            }
        );


        mostrarToast(
            "exito",
            nuevaActiva
                ? "Noticia publicada"
                : "Noticia ocultada",
            nuevaActiva
                ? "La publicación vuelve a ser visible."
                : "La publicación ya no aparece en la sección pública."
        );


        await recargarNoticias();

    } catch (error) {

        console.error(
            "Error actualizando visibilidad:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo actualizar",
            "Intenta nuevamente."
        );

    }

}


async function alternarDestacada(
    id
) {

    const noticia =
        noticias.find(
            item =>
                item.id === id
        );


    if (!noticia) {

        return;

    }


    const nuevaDestacada =
        noticia.destacada !==
        true;


    try {

        if (
            nuevaDestacada
        ) {

            await quitarDestacadasAnteriores(
                id
            );

        }


        await updateDoc(
            doc(
                db,
                "noticias",
                id
            ),
            {
                destacada:
                    nuevaDestacada,

                actualizadoEn:
                    serverTimestamp()
            }
        );


        mostrarToast(
            "exito",
            nuevaDestacada
                ? "Noticia destacada"
                : "Destacada retirada",
            nuevaDestacada
                ? "Esta publicación aparecerá como principal."
                : "La publicación dejó de estar destacada."
        );


        await recargarNoticias();

    } catch (error) {

        console.error(
            "Error actualizando destacada:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo actualizar",
            "Intenta nuevamente."
        );

    }

}


function abrirEliminarNoticia(
    id
) {

    const noticia =
        noticias.find(
            item =>
                item.id === id
        );


    if (!noticia) {

        return;

    }


    noticiaEliminar =
        noticia;


    modalEliminar.hidden =
        false;


    document.body.style.overflow =
        "hidden";

}


async function eliminarNoticia() {

    if (
        !noticiaEliminar
    ) {

        return;

    }


    btnConfirmarEliminar.disabled =
        true;


    btnConfirmarEliminar.textContent =
        "Eliminando...";


    try {

        await deleteDoc(
            doc(
                db,
                "noticias",
                noticiaEliminar.id
            )
        );


        mostrarToast(
            "exito",
            "Noticia eliminada",
            "La publicación fue eliminada permanentemente."
        );


        cerrarModalEliminar();

        await recargarNoticias();

    } catch (error) {

        console.error(
            "Error eliminando noticia:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo eliminar",
            "Intenta nuevamente."
        );

    } finally {

        btnConfirmarEliminar.disabled =
            false;


        btnConfirmarEliminar.textContent =
            "Eliminar";

    }

}


async function recargarNoticias() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "noticias"
            )
        );


    noticias =
        snapshot.docs.map(
            documento => ({
                id:
                    documento.id,

                ...documento.data()
            })
        );


    ordenarDatos();

    actualizarResumen();

    aplicarFiltros();

}


function actualizarResumen() {

    totalNoticias.textContent =
        noticias.length;


    totalActivas.textContent =
        noticias.filter(
            noticia =>
                noticia.activa !==
                false
        ).length;


    totalInactivas.textContent =
        noticias.filter(
            noticia =>
                noticia.activa ===
                false
        ).length;


    totalDestacadas.textContent =
        noticias.filter(
            noticia =>
                noticia.destacada ===
                true
        ).length;

}


function aplicarFiltros() {

    const texto =
        normalizarTexto(
            buscarNoticia.value
        );


    const tipo =
        filtroTipo.value;


    const estado =
        filtroEstado.value;


    let filtradas =
        noticias.filter(
            noticia => {

                const busqueda =
                    normalizarTexto(
                        [
                            noticia.titulo,
                            noticia.resumen,
                            noticia.contenido
                        ].join(
                            " "
                        )
                    );


                const coincideTexto =
                    !texto ||
                    busqueda.includes(
                        texto
                    );


                const coincideTipo =
                    tipo === "todas" ||
                    normalizarTipo(
                        noticia.tipo
                    ) ===
                    tipo;


                let coincideEstado =
                    true;


                if (
                    estado ===
                    "activas"
                ) {

                    coincideEstado =
                        noticia.activa !==
                        false;

                }


                if (
                    estado ===
                    "inactivas"
                ) {

                    coincideEstado =
                        noticia.activa ===
                        false;

                }


                if (
                    estado ===
                    "destacadas"
                ) {

                    coincideEstado =
                        noticia.destacada ===
                        true;

                }


                return (
                    coincideTexto &&
                    coincideTipo &&
                    coincideEstado
                );

            }
        );


    renderizarNoticias(
        filtradas
    );

}


function renderizarNoticias(
    lista
) {

    estadoCarga.hidden =
        true;


    listaNoticiasAdmin.innerHTML =
        "";


    contadorListado.textContent =
        `${lista.length} ${
            lista.length === 1
                ? "noticia"
                : "noticias"
        }`;


    if (!lista.length) {

        listaNoticiasAdmin.hidden =
            true;


        estadoVacio.hidden =
            false;


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            noticias.length
                ? "No hay coincidencias"
                : "No hay noticias registradas";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            noticias.length
                ? "Prueba con otros filtros."
                : "Crea la primera publicación oficial de la liga.";


        return;

    }


    estadoVacio.hidden =
        true;


    listaNoticiasAdmin.hidden =
        false;


    lista.forEach(
        noticia => {

            const tipo =
                normalizarTipo(
                    noticia.tipo
                );


            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "noticia-admin-card";


            tarjeta.innerHTML = `

                <div class="noticia-admin-imagen">

                    ${obtenerImagenHTML(
                        noticia
                    )}

                    <span class="estado-badge ${
                        noticia.activa === false
                            ? "inactiva"
                            : "activa"
                    }">
                        ${
                            noticia.activa === false
                                ? "Oculta"
                                : "Publicada"
                        }
                    </span>

                    ${
                        noticia.destacada === true
                            ? `
                                <span class="destacada-badge">
                                    ⭐ Destacada
                                </span>
                            `
                            : ""
                    }

                </div>


                <div class="noticia-admin-body">

                    <div class="noticia-admin-meta">

                        <span class="tipo-admin ${tipo}">
                            ${escaparHTML(
                                obtenerNombreTipo(
                                    tipo
                                )
                            )}
                        </span>

                        <span class="fecha-admin">
                            ${escaparHTML(
                                formatearFecha(
                                    obtenerFechaNoticia(
                                        noticia
                                    )
                                )
                            )}
                        </span>

                    </div>


                    <h3>
                        ${escaparHTML(
                            noticia.titulo ||
                            "Sin título"
                        )}
                    </h3>


                    <p>
                        ${escaparHTML(
                            noticia.resumen ||
                            noticia.contenido ||
                            ""
                        )}
                    </p>


                    <div class="noticia-admin-acciones">

                        <button
                            type="button"
                            class="btn-card btn-editar"
                            data-accion="editar"
                            data-id="${noticia.id}"
                        >
                            ✏️ Editar
                        </button>


                        <button
                            type="button"
                            class="btn-card btn-visibilidad"
                            data-accion="visibilidad"
                            data-id="${noticia.id}"
                        >
                            ${
                                noticia.activa === false
                                    ? "👁️ Publicar"
                                    : "🙈 Ocultar"
                            }
                        </button>


                        <button
                            type="button"
                            class="btn-card btn-destacar"
                            data-accion="destacar"
                            data-id="${noticia.id}"
                        >
                            ${
                                noticia.destacada === true
                                    ? "☆ Quitar destaque"
                                    : "⭐ Destacar"
                            }
                        </button>


                        <button
                            type="button"
                            class="btn-card btn-borrar"
                            data-accion="eliminar"
                            data-id="${noticia.id}"
                        >
                            🗑️ Eliminar
                        </button>

                    </div>

                </div>

            `;


            tarjeta.addEventListener(
                "click",
                manejarAccionTarjeta
            );


            listaNoticiasAdmin.appendChild(
                tarjeta
            );

        }
    );

}


function manejarAccionTarjeta(
    event
) {

    const boton =
        event.target.closest(
            "[data-accion]"
        );


    if (!boton) {

        return;

    }


    const id =
        boton.dataset.id;


    const accion =
        boton.dataset.accion;


    if (
        accion === "editar"
    ) {

        abrirEditarNoticia(
            id
        );

        return;

    }


    if (
        accion === "visibilidad"
    ) {

        alternarVisibilidad(
            id
        );

        return;

    }


    if (
        accion === "destacar"
    ) {

        alternarDestacada(
            id
        );

        return;

    }


    if (
        accion === "eliminar"
    ) {

        abrirEliminarNoticia(
            id
        );

    }

}


function obtenerImagenHTML(
    noticia
) {

    if (
        noticia.imagenUrl
    ) {

        return `
            <img
                src="${escaparAtributo(
                    noticia.imagenUrl
                )}"
                alt="${escaparAtributo(
                    noticia.titulo ||
                    "Noticia"
                )}"
                loading="lazy"
            >
        `;

    }


    const tipo =
        normalizarTipo(
            noticia.tipo
        );


    return `
        <div class="noticia-admin-placeholder ${
            tipo === "sancion"
                ? "sancion"
                : ""
        }">
            ${obtenerIconoTipo(
                tipo
            )}
        </div>
    `;

}


function cerrarModalNoticia() {

    modalNoticia.hidden =
        true;


    document.body.style.overflow =
        "";


    limpiarPreviewTemporal();


    noticiaSeleccionada =
        null;


    imagenSeleccionada =
        null;


    imagenNoticia.value =
        "";

}


function cerrarModalEliminar() {

    modalEliminar.hidden =
        true;


    document.body.style.overflow =
        "";


    noticiaEliminar =
        null;

}


function limpiarPreviewImagen() {

    previewImagenArchivo.hidden =
        true;


    previewImagenArchivo.removeAttribute(
        "src"
    );


    previewPlaceholder.hidden =
        false;

}


function limpiarPreviewTemporal() {

    if (
        previewTemporalURL
    ) {

        URL.revokeObjectURL(
            previewTemporalURL
        );


        previewTemporalURL =
            null;

    }

}


async function subirImagenCloudinary(
    archivo
) {

    const cloudName =
        "apzsxnnh";


    const uploadPreset =
        "liga_rio_grande";


    const formulario =
        new FormData();


    formulario.append(
        "file",
        archivo
    );


    formulario.append(
        "upload_preset",
        uploadPreset
    );


    formulario.append(
        "folder",
        "liga-rio-grande/noticias"
    );


    const respuesta =
        await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method:
                    "POST",

                body:
                    formulario
            }
        );


    const resultado =
        await respuesta.json();


    if (
        !respuesta.ok ||
        !resultado.secure_url
    ) {

        console.error(
            "Error Cloudinary:",
            resultado
        );


        throw new Error(
            resultado.error?.message ||
            "No se pudo subir la imagen."
        );

    }


    return resultado.secure_url;

}


function obtenerTextoPartido(
    partido
) {

    const local =
        partido.localNombre ||
        obtenerNombreEquipo(
            partido.localId
        ) ||
        "Local";


    const visitante =
        partido.visitanteNombre ||
        obtenerNombreEquipo(
            partido.visitanteId
        ) ||
        "Visitante";


    const jornada =
        partido.jornadaNombre ||
        "Jornada";


    return `${jornada} · ${local} vs ${visitante}`;

}


function obtenerNombreEquipo(
    id
) {

    return equipos.find(
        equipo =>
            equipo.id === id
    )?.nombre ||
    "";

}


function obtenerNombreJugador(
    jugador
) {

    return (
        jugador.nombreCompleto ||
        jugador.nombre ||
        "Jugador"
    );

}


function normalizarTipo(
    tipo
) {

    const valor =
        normalizarTexto(
            tipo
        );


    if (
        valor === "comunicado" ||
        valor === "aviso"
    ) {

        return "comunicado";

    }


    if (
        valor === "sancion"
    ) {

        return "sancion";

    }


    if (
        valor === "partido" ||
        valor === "resultado"
    ) {

        return "partido";

    }


    return "general";

}


function obtenerNombreTipo(
    tipo
) {

    switch (tipo) {

        case "comunicado":
            return "Comunicado";

        case "sancion":
            return "Sanción";

        case "partido":
            return "Partido";

        default:
            return "General";

    }

}


function obtenerIconoTipo(
    tipo
) {

    switch (tipo) {

        case "comunicado":
            return "📢";

        case "sancion":
            return "🟥";

        case "partido":
            return "⚽";

        default:
            return "📰";

    }

}


function obtenerFechaNoticia(
    noticia
) {

    return (
        convertirFecha(
            noticia.publicadoEn
        ) ||
        convertirFecha(
            noticia.creadoEn
        ) ||
        convertirFecha(
            noticia.fecha
        ) ||
        convertirFecha(
            noticia.actualizadoEn
        )
    );

}


function convertirFecha(
    valor
) {

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
        valor instanceof Date
    ) {

        return valor;

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


function formatearFecha(
    fecha
) {

    if (!fecha) {

        return "Sin fecha";

    }


    return fecha.toLocaleDateString(
        "es-MX",
        {
            day:
                "numeric",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


function normalizarTexto(
    texto
) {

    return String(
        texto || ""
    )
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

}


function mostrarCarga() {

    estadoCarga.hidden =
        false;


    estadoVacio.hidden =
        true;


    listaNoticiasAdmin.hidden =
        true;

}


function mostrarToast(
    tipo,
    titulo,
    texto
) {

    if (
        toastTimer
    ) {

        clearTimeout(
            toastTimer
        );

    }


    toast.hidden =
        false;


    toastTitulo.textContent =
        titulo;


    toastTexto.textContent =
        texto;


    if (
        tipo === "error"
    ) {

        toastIcono.textContent =
            "⚠️";

    } else {

        toastIcono.textContent =
            "✓";

    }


    toastTimer =
        setTimeout(
            () => {

                toast.hidden =
                    true;

            },
            3500
        );

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


function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );

}