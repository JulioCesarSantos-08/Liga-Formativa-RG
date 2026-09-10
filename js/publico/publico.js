import {
    protegerPaginaPublica,
    obtenerPanelSegunRol,
    cerrarSesion
} from "../roles.js";


const nombreUsuario =
    document.getElementById(
        "nombreUsuario"
    );

const menuNombreUsuario =
    document.getElementById(
        "menuNombreUsuario"
    );

const perfilInicial =
    document.getElementById(
        "perfilInicial"
    );


const btnMas =
    document.getElementById(
        "btnMas"
    );

const menuMas =
    document.getElementById(
        "menuMas"
    );

const btnCerrarMenu =
    document.getElementById(
        "btnCerrarMenu"
    );

const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );

const btnPerfil =
    document.getElementById(
        "btnPerfil"
    );


const btnVolverPanel =
    document.getElementById(
        "btnVolverPanel"
    );

const iconoVolverPanel =
    document.getElementById(
        "iconoVolverPanel"
    );

const textoVolverPanel =
    document.getElementById(
        "textoVolverPanel"
    );


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    cargarDatosUsuario(
        usuario
    );

    configurarPanelUsuario(
        usuario
    );

    activarEventos();

}


function cargarDatosUsuario(
    usuario
) {

    const nombre =
        usuario.nombre?.trim() ||
        usuario.firebaseUser
            ?.displayName
            ?.trim() ||
        "Usuario";


    nombreUsuario.textContent =
        nombre;

    menuNombreUsuario.textContent =
        nombre;

    perfilInicial.textContent =
        obtenerInicial(
            nombre
        );

}


function configurarPanelUsuario(
    usuario
) {

    const panel =
        obtenerPanelSegunRol(
            usuario.rol
        );


    if (!panel) {

        btnVolverPanel.classList.add(
            "hidden"
        );

        btnVolverPanel.removeAttribute(
            "href"
        );

        return;

    }


    btnVolverPanel.href =
        panel.url;

    iconoVolverPanel.textContent =
        panel.icono;

    textoVolverPanel.textContent =
        panel.texto;

    btnVolverPanel.classList.remove(
        "hidden"
    );

}


function obtenerInicial(
    nombre
) {

    const nombreLimpio =
        nombre.trim();


    if (!nombreLimpio) {

        return "U";

    }


    return nombreLimpio
        .charAt(0)
        .toUpperCase();

}


function activarEventos() {

    btnMas.addEventListener(
        "click",
        abrirMenu
    );


    btnCerrarMenu.addEventListener(
        "click",
        cerrarMenu
    );


    menuMas.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                menuMas
            ) {

                cerrarMenu();

            }

        }
    );


    btnCerrarSesion.addEventListener(
        "click",
        cerrarSesionDesdeMenu
    );


    btnPerfil.addEventListener(
        "click",
        abrirMenu
    );


    if (btnVolverPanel) {

        btnVolverPanel.addEventListener(
            "click",
            () => {

                cerrarMenu();

            }
        );

    }


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                    "Escape" &&
                !menuMas.classList.contains(
                    "hidden"
                )
            ) {

                cerrarMenu();

            }

        }
    );

}


async function cerrarSesionDesdeMenu() {

    btnCerrarSesion.disabled =
        true;

    btnCerrarSesion.textContent =
        "Cerrando sesión...";


    try {

        await cerrarSesion();

    } catch (error) {

        console.error(
            "Error cerrando sesión:",
            error
        );


        btnCerrarSesion.disabled =
            false;

        btnCerrarSesion.textContent =
            "Cerrar sesión";

    }

}


function abrirMenu() {

    menuMas.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";

}


function cerrarMenu() {

    menuMas.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";

}