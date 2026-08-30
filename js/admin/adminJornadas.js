import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";


const adminInicial = document.getElementById("adminInicial");

const totalJornadas = document.getElementById("totalJornadas");
const totalProximas = document.getElementById("totalProximas");
const totalEnCurso = document.getElementById("totalEnCurso");
const totalFinalizadas = document.getElementById("totalFinalizadas");

const buscarJornada = document.getElementById("buscarJornada");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroEstado = document.getElementById("filtroEstado");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");
const gridJornadas = document.getElementById("gridJornadas");

const btnNuevaJornada = document.getElementById("btnNuevaJornada");

const modalJornada = document.getElementById("modalJornada");
const modalTitulo = document.getElementById("modalTitulo");

const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarModal = document.getElementById("btnCancelarModal");
const btnGuardarJornada = document.getElementById("btnGuardarJornada");

const formJornada = document.getElementById("formJornada");

const categoriaJornada = document.getElementById("categoriaJornada");
const numeroJornada = document.getElementById("numeroJornada");
const nombreJornada = document.getElementById("nombreJornada");
const fechaInicio = document.getElementById("fechaInicio");
const fechaFin = document.getElementById("fechaFin");
const descripcionJornada = document.getElementById("descripcionJornada");

const btnEstadoProxima = document.getElementById("btnEstadoProxima");
const btnEstadoEnCurso = document.getElementById("btnEstadoEnCurso");
const btnEstadoFinalizada = document.getElementById("btnEstadoFinalizada");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let jornadas = [];
let categorias = [];

let jornadaSeleccionada = null;
let estadoSeleccionado = "proxima";

let toastTimer = null;


const usuario = await protegerPagina([
    "admin"
]);


if (usuario) {

    cargarAdministrador(usuario);
    activarEventos();

    await cargarCategorias();
    await cargarJornadas();

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

    btnNuevaJornada.addEventListener(
        "click",
        abrirModalNuevaJornada
    );


    buscarJornada.addEventListener(
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


    modalJornada.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modalJornada
            ) {

                cerrarModal();

            }

        }
    );


    formJornada.addEventListener(
        "submit",
        guardarJornada
    );


    btnEstadoProxima.addEventListener(
        "click",
        () => {

            seleccionarEstado(
                "proxima"
            );

        }
    );


    btnEstadoEnCurso.addEventListener(
        "click",
        () => {

            seleccionarEstado(
                "enCurso"
            );

        }
    );


    btnEstadoFinalizada.addEventListener(
        "click",
        () => {

            seleccionarEstado(
                "finalizada"
            );

        }
    );


    numeroJornada.addEventListener(
        "input",
        actualizarNombreAutomatico
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !modalJornada.classList.contains("oculto")
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


async function cargarJornadas() {

    mostrarCarga();


    try {

        const referencia =
            collection(
                db,
                "jornadas"
            );


        const snapshot =
            await getDocs(
                referencia
            );


        jornadas =
            snapshot.docs.map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            );


        jornadas.sort(
            ordenarJornadas
        );


        actualizarResumen();
        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando jornadas:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        gridJornadas.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            "No pudimos cargar las jornadas";


        estadoVacio.querySelector(
            "p"
        ).textContent =
            "Revisa la conexión con Firebase e intenta nuevamente.";

    }

}


function llenarSelectCategorias() {

    categoriaJornada.innerHTML = `
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
                categoria.nombre ||
                "Sin nombre";

            categoriaJornada.appendChild(
                optionModal
            );


            const optionFiltro =
                document.createElement("option");

            optionFiltro.value =
                categoria.id;

            optionFiltro.textContent =
                categoria.nombre ||
                "Sin nombre";

            filtroCategoria.appendChild(
                optionFiltro
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


    gridJornadas.classList.add(
        "oculto"
    );

}


function actualizarResumen() {

    totalJornadas.textContent =
        jornadas.length;


    totalProximas.textContent =
        jornadas.filter(
            jornada =>
                jornada.estado === "proxima"
        ).length;


    totalEnCurso.textContent =
        jornadas.filter(
            jornada =>
                jornada.estado === "enCurso"
        ).length;


    totalFinalizadas.textContent =
        jornadas.filter(
            jornada =>
                jornada.estado === "finalizada"
        ).length;

}


function aplicarFiltros() {

    const texto =
        normalizarTexto(
            buscarJornada.value
        );


    const categoria =
        filtroCategoria.value;


    const estado =
        filtroEstado.value;


    const lista =
        jornadas.filter(
            (jornada) => {

                const coincideTexto =
                    !texto ||
                    normalizarTexto(
                        jornada.nombre || ""
                    ).includes(texto) ||
                    normalizarTexto(
                        jornada.descripcion || ""
                    ).includes(texto);


                const coincideCategoria =
                    categoria === "todas" ||
                    jornada.categoriaId === categoria;


                const coincideEstado =
                    estado === "todos" ||
                    jornada.estado === estado;


                return (
                    coincideTexto &&
                    coincideCategoria &&
                    coincideEstado
                );

            }
        );


    renderizarJornadas(
        lista
    );

}


function renderizarJornadas(lista) {

    estadoCarga.classList.add(
        "oculto"
    );


    gridJornadas.innerHTML =
        "";


    if (!lista.length) {

        gridJornadas.classList.add(
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


    gridJornadas.classList.remove(
        "oculto"
    );


    lista.forEach(
        (jornada) => {

            const categoria =
                categorias.find(
                    item =>
                        item.id === jornada.categoriaId
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "jornada-card";


            const estado =
                jornada.estado ||
                "proxima";


            card.innerHTML = `

                <div class="jornada-card-top">

                    <div class="jornada-icono">
                        📅
                    </div>


                    <span class="jornada-estado ${estado}">
                        ${textoEstado(estado)}
                    </span>

                </div>


                <h3>
                    ${escaparHTML(
                        jornada.nombre ||
                        `Jornada ${jornada.numero || ""}`
                    )}
                </h3>


                <span class="jornada-categoria">
                    ${escaparHTML(
                        categoria?.nombre ||
                        jornada.categoriaNombre ||
                        "Categoría no disponible"
                    )}
                </span>


                <p class="jornada-descripcion">
                    ${escaparHTML(
                        jornada.descripcion ||
                        "Sin observaciones"
                    )}
                </p>


                <div class="jornada-meta">

                    <div>

                        <span>
                            Inicio
                        </span>

                        <strong>
                            ${formatearFecha(
                                jornada.fechaInicio
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Cierre
                        </span>

                        <strong>
                            ${formatearFecha(
                                jornada.fechaFin
                            )}
                        </strong>

                    </div>

                </div>


                <div class="jornada-partidos">

                    <span>
                        Partidos registrados
                    </span>

                    <strong>
                        ${Number(
                            jornada.totalPartidos || 0
                        )}
                    </strong>

                </div>


                <div class="jornada-acciones">

                    <button
                        type="button"
                        class="btn-editar-jornada"
                    >
                        Editar
                    </button>


                    <a
                        href="adminPartidos.html?jornada=${jornada.id}"
                        class="btn-ver-partidos"
                    >
                        Ver partidos
                    </a>

                </div>

            `;


            card.querySelector(
                ".btn-editar-jornada"
            ).addEventListener(
                "click",
                () => {

                    abrirModalEditarJornada(
                        jornada.id
                    );

                }
            );


            gridJornadas.appendChild(
                card
            );

        }
    );

}


function abrirModalNuevaJornada() {

    jornadaSeleccionada =
        null;


    formJornada.reset();


    modalTitulo.textContent =
        "Nueva jornada";


    seleccionarEstado(
        "proxima"
    );


    abrirModal();


    setTimeout(
        () => {

            categoriaJornada.focus();

        },
        100
    );

}


function abrirModalEditarJornada(id) {

    const jornada =
        jornadas.find(
            item =>
                item.id === id
        );


    if (!jornada) {
        return;
    }


    jornadaSeleccionada =
        jornada;


    modalTitulo.textContent =
        "Editar jornada";


    categoriaJornada.value =
        jornada.categoriaId || "";


    numeroJornada.value =
        jornada.numero ?? "";


    nombreJornada.value =
        jornada.nombre || "";


    fechaInicio.value =
        jornada.fechaInicio || "";


    fechaFin.value =
        jornada.fechaFin || "";


    descripcionJornada.value =
        jornada.descripcion || "";


    seleccionarEstado(
        jornada.estado ||
        "proxima"
    );


    abrirModal();

}


function abrirModal() {

    modalJornada.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarModal() {

    modalJornada.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";


    jornadaSeleccionada =
        null;

}


function seleccionarEstado(estado) {

    estadoSeleccionado =
        estado;


    btnEstadoProxima.classList.toggle(
        "activo",
        estado === "proxima"
    );


    btnEstadoEnCurso.classList.toggle(
        "activo",
        estado === "enCurso"
    );


    btnEstadoFinalizada.classList.toggle(
        "activo",
        estado === "finalizada"
    );

}


function actualizarNombreAutomatico() {

    if (
        nombreJornada.value.trim()
    ) {
        return;
    }


    const numero =
        numeroJornada.value;


    if (!numero) {
        return;
    }


    nombreJornada.value =
        `Jornada ${numero}`;

}


async function guardarJornada(event) {

    event.preventDefault();


    const categoriaId =
        categoriaJornada.value;


    const numero =
        Number(
            numeroJornada.value
        );


    const nombre =
        (
            nombreJornada.value.trim() ||
            `Jornada ${numero}`
        )
            .replace(/\s+/g, " ");


    const inicio =
        fechaInicio.value;


    const fin =
        fechaFin.value;


    const descripcion =
        descripcionJornada.value
            .trim()
            .replace(/\s+/g, " ");


    if (!categoriaId) {

        mostrarToast(
            "error",
            "Categoría requerida",
            "Selecciona la categoría de la jornada."
        );

        return;

    }


    if (
        !numero ||
        numero < 1
    ) {

        mostrarToast(
            "error",
            "Número incorrecto",
            "Escribe un número de jornada válido."
        );

        return;

    }


    if (
        inicio &&
        fin &&
        fin < inicio
    ) {

        mostrarToast(
            "error",
            "Fechas incorrectas",
            "La fecha de cierre no puede ser anterior a la fecha de inicio."
        );

        return;

    }


    const jornadaDuplicada =
        jornadas.some(
            (jornada) => {

                if (
                    jornadaSeleccionada &&
                    jornada.id === jornadaSeleccionada.id
                ) {

                    return false;

                }


                return (
                    jornada.categoriaId === categoriaId &&
                    Number(
                        jornada.numero
                    ) === numero
                );

            }
        );


    if (jornadaDuplicada) {

        mostrarToast(
            "error",
            "Jornada existente",
            "Ya existe esa jornada dentro de la categoría seleccionada."
        );

        return;

    }


    const categoria =
        categorias.find(
            item =>
                item.id === categoriaId
        );


    bloquearGuardado(
        true
    );


    try {

        const datos = {
            categoriaId,
            categoriaNombre:
                categoria?.nombre || "",
            numero,
            nombre,
            fechaInicio:
                inicio || "",
            fechaFin:
                fin || "",
            descripcion,
            estado:
                estadoSeleccionado,
            actualizadoEn:
                serverTimestamp()
        };


        if (jornadaSeleccionada) {

            const referencia =
                doc(
                    db,
                    "jornadas",
                    jornadaSeleccionada.id
                );


            await updateDoc(
                referencia,
                datos
            );


            Object.assign(
                jornadaSeleccionada,
                datos
            );


            mostrarToast(
                "exito",
                "Jornada actualizada",
                "Los cambios fueron guardados correctamente."
            );

        } else {

            const referencia =
                collection(
                    db,
                    "jornadas"
                );


            const documento =
                await addDoc(
                    referencia,
                    {
                        ...datos,
                        totalPartidos: 0,
                        creadoEn:
                            serverTimestamp()
                    }
                );


            jornadas.push(
                {
                    id: documento.id,
                    ...datos,
                    totalPartidos: 0
                }
            );


            mostrarToast(
                "exito",
                "Jornada creada",
                "La jornada ya quedó registrada en el calendario."
            );

        }


        jornadas.sort(
            ordenarJornadas
        );


        actualizarResumen();
        aplicarFiltros();
        cerrarModal();

    } catch (error) {

        console.error(
            "Error guardando jornada:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al guardar la jornada."
        );

    } finally {

        bloquearGuardado(
            false
        );

    }

}


function ordenarJornadas(a, b) {

    if (
        a.categoriaId !== b.categoriaId
    ) {

        return (
            a.categoriaNombre || ""
        ).localeCompare(
            b.categoriaNombre || "",
            "es"
        );

    }


    return (
        Number(a.numero || 0) -
        Number(b.numero || 0)
    );

}


function revisarAccionURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    if (
        parametros.get("accion") ===
        "nueva"
    ) {

        abrirModalNuevaJornada();

    }

}


function textoEstado(estado) {

    switch (estado) {

        case "enCurso":
            return "En curso";

        case "finalizada":
            return "Finalizada";

        case "proxima":
        default:
            return "Próxima";

    }

}


function formatearFecha(fecha) {

    if (!fecha) {
        return "Sin definir";
    }


    const partes =
        String(fecha).split("-");


    if (
        partes.length !== 3
    ) {
        return fecha;
    }


    const anio =
        Number(partes[0]);

    const mes =
        Number(partes[1]) - 1;

    const dia =
        Number(partes[2]);


    const objetoFecha =
        new Date(
            anio,
            mes,
            dia
        );


    return objetoFecha.toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function bloquearGuardado(bloquear) {

    btnGuardarJornada.disabled =
        bloquear;


    btnGuardarJornada.textContent =
        bloquear
            ? "Guardando..."
            : "Guardar jornada";

}


function obtenerInicial(nombre) {

    const texto =
        String(nombre || "")
            .trim();


    if (!texto) {
        return "A";
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