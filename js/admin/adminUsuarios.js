import {
    collection,
    getDocs,
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

const totalUsuarios = document.getElementById("totalUsuarios");
const totalPublico = document.getElementById("totalPublico");
const totalArbitros = document.getElementById("totalArbitros");
const totalJefes = document.getElementById("totalJefes");
const totalAdmins = document.getElementById("totalAdmins");

const buscarUsuario = document.getElementById("buscarUsuario");
const filtroRol = document.getElementById("filtroRol");
const filtroEstado = document.getElementById("filtroEstado");

const estadoCarga = document.getElementById("estadoCarga");
const estadoVacio = document.getElementById("estadoVacio");

const contenedorTabla = document.getElementById("contenedorTabla");
const tablaUsuarios = document.getElementById("tablaUsuarios");

const listaUsuariosMovil = document.getElementById("listaUsuariosMovil");

const modalUsuario = document.getElementById("modalUsuario");

const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarModal = document.getElementById("btnCancelarModal");
const btnGuardarUsuario = document.getElementById("btnGuardarUsuario");

const modalInicial = document.getElementById("modalInicial");
const modalNombre = document.getElementById("modalNombre");
const modalCorreo = document.getElementById("modalCorreo");

const modalRol = document.getElementById("modalRol");

const btnEstadoActivo = document.getElementById("btnEstadoActivo");
const btnEstadoInactivo = document.getElementById("btnEstadoInactivo");

const toast = document.getElementById("toast");
const toastIcono = document.getElementById("toastIcono");
const toastTitulo = document.getElementById("toastTitulo");
const toastTexto = document.getElementById("toastTexto");


let usuarios = [];

let usuarioSeleccionado = null;

let estadoSeleccionado = true;

let usuarioAdminActual = null;

let toastTimer = null;


const usuario = await protegerPagina([
    "admin"
]);


if (usuario) {

    usuarioAdminActual = usuario;

    cargarAdministrador(usuario);

    activarEventos();

    await cargarUsuarios();

}


function cargarAdministrador(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Administrador";


    adminInicial.textContent =
        obtenerInicial(nombre);

}


function activarEventos() {

    buscarUsuario.addEventListener(
        "input",
        aplicarFiltros
    );


    filtroRol.addEventListener(
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


    modalUsuario.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modalUsuario
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


    btnGuardarUsuario.addEventListener(
        "click",
        guardarCambiosUsuario
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !modalUsuario.classList.contains("oculto")
            ) {

                cerrarModal();

            }

        }
    );

}


async function cargarUsuarios() {

    mostrarCarga();


    try {

        const referencia =
            collection(
                db,
                "usuarios"
            );


        const snapshot =
            await getDocs(
                referencia
            );


        usuarios =
            snapshot.docs.map(
                (documento) => {

                    return {
                        id: documento.id,
                        ...documento.data()
                    };

                }
            );


        usuarios.sort(
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
            "Error cargando usuarios:",
            error
        );


        estadoCarga.classList.add(
            "oculto"
        );


        contenedorTabla.classList.add(
            "oculto"
        );


        listaUsuariosMovil.classList.add(
            "oculto"
        );


        estadoVacio.classList.remove(
            "oculto"
        );


        estadoVacio.querySelector(
            "strong"
        ).textContent =
            "No pudimos cargar los usuarios";


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


    contenedorTabla.classList.add(
        "oculto"
    );


    listaUsuariosMovil.classList.add(
        "oculto"
    );

}


function actualizarResumen() {

    totalUsuarios.textContent =
        usuarios.length;


    totalPublico.textContent =
        usuarios.filter(
            usuario =>
                usuario.rol === "publico"
        ).length;


    totalArbitros.textContent =
        usuarios.filter(
            usuario =>
                usuario.rol === "arbitro"
        ).length;


    totalJefes.textContent =
        usuarios.filter(
            usuario =>
                usuario.rol === "jefeEquipo"
        ).length;


    totalAdmins.textContent =
        usuarios.filter(
            usuario =>
                usuario.rol === "admin"
        ).length;

}


function aplicarFiltros() {

    const busqueda =
        normalizarTexto(
            buscarUsuario.value
        );


    const rol =
        filtroRol.value;


    const estado =
        filtroEstado.value;


    const filtrados =
        usuarios.filter(
            (usuario) => {

                const nombre =
                    normalizarTexto(
                        usuario.nombre || ""
                    );


                const email =
                    normalizarTexto(
                        usuario.email || ""
                    );


                const coincideBusqueda =
                    !busqueda ||
                    nombre.includes(busqueda) ||
                    email.includes(busqueda);


                const coincideRol =
                    rol === "todos" ||
                    usuario.rol === rol;


                let coincideEstado = true;


                if (estado === "activo") {

                    coincideEstado =
                        usuario.activo !== false;

                }


                if (estado === "inactivo") {

                    coincideEstado =
                        usuario.activo === false;

                }


                return (
                    coincideBusqueda &&
                    coincideRol &&
                    coincideEstado
                );

            }
        );


    renderizarUsuarios(
        filtrados
    );

}


function renderizarUsuarios(lista) {

    estadoCarga.classList.add(
        "oculto"
    );


    tablaUsuarios.innerHTML =
        "";


    listaUsuariosMovil.innerHTML =
        "";


    if (!lista.length) {

        contenedorTabla.classList.add(
            "oculto"
        );


        listaUsuariosMovil.classList.add(
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


    contenedorTabla.classList.remove(
        "oculto"
    );


    listaUsuariosMovil.classList.remove(
        "oculto"
    );


    lista.forEach(
        (usuario) => {

            crearFilaDesktop(
                usuario
            );


            crearCardMovil(
                usuario
            );

        }
    );

}


function crearFilaDesktop(usuario) {

    const fila =
        document.createElement("tr");


    const nombre =
        usuario.nombre ||
        "Sin nombre";


    const correo =
        usuario.email ||
        "Sin correo";


    const rol =
        usuario.rol ||
        "publico";


    const activo =
        usuario.activo !== false;


    fila.innerHTML = `

        <td>

            <div class="usuario-tabla">

                <div class="usuario-avatar">
                    ${obtenerInicial(nombre)}
                </div>


                <div class="usuario-tabla-info">

                    <strong>
                        ${escaparHTML(nombre)}
                    </strong>

                    <span>
                        ${usuario.uid === usuarioAdminActual.uid
                            ? "Tu cuenta"
                            : "Usuario registrado"}
                    </span>

                </div>

            </div>

        </td>


        <td class="correo-tabla">
            ${escaparHTML(correo)}
        </td>


        <td>

            <span class="badge-rol ${claseRol(rol)}">
                ${textoRol(rol)}
            </span>

        </td>


        <td>

            <span class="badge-estado ${
                activo
                    ? "estado-activo"
                    : "estado-inactivo"
            }">

                ${
                    activo
                        ? "Activo"
                        : "Desactivado"
                }

            </span>

        </td>


        <td>
            ${formatearFecha(usuario.creadoEn)}
        </td>


        <td>

            <button
                type="button"
                class="btn-editar-usuario"
                data-id="${usuario.id}"
            >
                Editar
            </button>

        </td>

    `;


    fila.querySelector(
        ".btn-editar-usuario"
    ).addEventListener(
        "click",
        () => {

            abrirModal(
                usuario.id
            );

        }
    );


    tablaUsuarios.appendChild(
        fila
    );

}


function crearCardMovil(usuario) {

    const card =
        document.createElement("article");


    card.className =
        "usuario-card-movil";


    const nombre =
        usuario.nombre ||
        "Sin nombre";


    const correo =
        usuario.email ||
        "Sin correo";


    const rol =
        usuario.rol ||
        "publico";


    const activo =
        usuario.activo !== false;


    card.innerHTML = `

        <div class="usuario-card-header">

            <div class="usuario-card-identidad">

                <div class="usuario-avatar">
                    ${obtenerInicial(nombre)}
                </div>


                <div class="usuario-card-datos">

                    <strong>
                        ${escaparHTML(nombre)}
                    </strong>

                    <span>
                        ${escaparHTML(correo)}
                    </span>

                </div>

            </div>


            <span class="badge-estado ${
                activo
                    ? "estado-activo"
                    : "estado-inactivo"
            }">

                ${
                    activo
                        ? "Activo"
                        : "Desactivado"
                }

            </span>

        </div>


        <div class="usuario-card-meta">

            <div>

                <span>
                    Rol
                </span>

                <strong>
                    ${textoRol(rol)}
                </strong>

            </div>


            <div>

                <span>
                    Registro
                </span>

                <strong>
                    ${formatearFecha(usuario.creadoEn)}
                </strong>

            </div>

        </div>


        <button
            type="button"
            class="btn-editar-usuario-movil"
            data-id="${usuario.id}"
        >
            Administrar usuario
        </button>

    `;


    card.querySelector(
        ".btn-editar-usuario-movil"
    ).addEventListener(
        "click",
        () => {

            abrirModal(
                usuario.id
            );

        }
    );


    listaUsuariosMovil.appendChild(
        card
    );

}


function abrirModal(id) {

    const usuario =
        usuarios.find(
            item =>
                item.id === id
        );


    if (!usuario) {
        return;
    }


    usuarioSeleccionado =
        usuario;


    const nombre =
        usuario.nombre ||
        "Sin nombre";


    modalInicial.textContent =
        obtenerInicial(nombre);


    modalNombre.textContent =
        nombre;


    modalCorreo.textContent =
        usuario.email ||
        "Sin correo";


    modalRol.value =
        usuario.rol ||
        "publico";


    estadoSeleccionado =
        usuario.activo !== false;


    seleccionarEstado(
        estadoSeleccionado
    );


    modalUsuario.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarModal() {

    modalUsuario.classList.add(
        "oculto"
    );


    usuarioSeleccionado =
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


async function guardarCambiosUsuario() {

    if (!usuarioSeleccionado) {
        return;
    }


    const nuevoRol =
        modalRol.value;


    if (
        usuarioSeleccionado.uid ===
            usuarioAdminActual.uid &&
        nuevoRol !== "admin"
    ) {

        mostrarToast(
            "error",
            "Cambio no permitido",
            "No puedes quitarte tu propio rol de administrador desde esta pantalla."
        );

        return;

    }


    if (
        usuarioSeleccionado.uid ===
            usuarioAdminActual.uid &&
        estadoSeleccionado === false
    ) {

        mostrarToast(
            "error",
            "Cambio no permitido",
            "No puedes desactivar tu propia cuenta administrativa."
        );

        return;

    }


    btnGuardarUsuario.disabled =
        true;


    btnGuardarUsuario.textContent =
        "Guardando...";


    try {

        const referencia =
            doc(
                db,
                "usuarios",
                usuarioSeleccionado.id
            );


        await updateDoc(
            referencia,
            {
                rol: nuevoRol,
                activo: estadoSeleccionado,
                actualizadoEn:
                    serverTimestamp()
            }
        );


        usuarioSeleccionado.rol =
            nuevoRol;


        usuarioSeleccionado.activo =
            estadoSeleccionado;


        actualizarResumen();

        aplicarFiltros();

        cerrarModal();


        mostrarToast(
            "exito",
            "Cambios guardados",
            "El usuario fue actualizado correctamente."
        );

    } catch (error) {

        console.error(
            "Error actualizando usuario:",
            error
        );


        mostrarToast(
            "error",
            "No se pudo guardar",
            "Ocurrió un problema al actualizar el usuario."
        );

    } finally {

        btnGuardarUsuario.disabled =
            false;


        btnGuardarUsuario.textContent =
            "Guardar cambios";

    }

}


function textoRol(rol) {

    switch (rol) {

        case "admin":
            return "Administrador";

        case "arbitro":
            return "Árbitro";

        case "jefeEquipo":
            return "Jefe de equipo";

        case "publico":
        default:
            return "Público";

    }

}


function claseRol(rol) {

    switch (rol) {

        case "admin":
            return "rol-admin";

        case "arbitro":
            return "rol-arbitro";

        case "jefeEquipo":
            return "rol-jefe";

        case "publico":
        default:
            return "rol-publico";

    }

}


function formatearFecha(valor) {

    if (!valor) {
        return "Sin fecha";
    }


    let fecha;


    if (
        typeof valor.toDate ===
        "function"
    ) {

        fecha =
            valor.toDate();

    } else {

        fecha =
            new Date(valor);

    }


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return "Sin fecha";

    }


    return fecha.toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


function obtenerInicial(nombre) {

    if (!nombre) {
        return "U";
    }


    return nombre
        .trim()
        .charAt(0)
        .toUpperCase();

}


function normalizarTexto(texto) {

    return texto
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
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            "\"",
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

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