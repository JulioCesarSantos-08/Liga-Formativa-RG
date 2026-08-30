import {
    protegerPagina,
    cerrarSesion
} from "../roles.js";


const nombreUsuario = document.getElementById("nombreUsuario");
const menuNombreUsuario = document.getElementById("menuNombreUsuario");
const perfilInicial = document.getElementById("perfilInicial");

const btnMas = document.getElementById("btnMas");
const menuMas = document.getElementById("menuMas");
const btnCerrarMenu = document.getElementById("btnCerrarMenu");

const btnCerrarSesion = document.getElementById("btnCerrarSesion");
const btnPerfil = document.getElementById("btnPerfil");


const usuario = await protegerPagina([
    "publico"
]);


if (usuario) {

    cargarDatosUsuario(usuario);
    activarEventos();

}


function cargarDatosUsuario(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Usuario";

    nombreUsuario.textContent =
        nombre;

    menuNombreUsuario.textContent =
        nombre;

    perfilInicial.textContent =
        obtenerInicial(nombre);

}


function obtenerInicial(nombre) {

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

            if (event.target === menuMas) {
                cerrarMenu();
            }

        }
    );


    btnCerrarSesion.addEventListener(
        "click",
        async () => {

            btnCerrarSesion.disabled =
                true;

            btnCerrarSesion.textContent =
                "Cerrando sesión...";

            await cerrarSesion();

        }
    );


    btnPerfil.addEventListener(
        "click",
        abrirMenu
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !menuMas.classList.contains("hidden")
            ) {

                cerrarMenu();

            }

        }
    );

}


function abrirMenu() {

    menuMas.classList.remove("hidden");

    document.body.style.overflow =
        "hidden";

}


function cerrarMenu() {

    menuMas.classList.add("hidden");

    document.body.style.overflow =
        "";

}
