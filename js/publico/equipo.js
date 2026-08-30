import {
    protegerPagina
} from "../roles.js";


const perfilInicial = document.getElementById("perfilInicial");
const btnPerfil = document.getElementById("btnPerfil");


const usuario = await protegerPagina([
    "publico"
]);


if (usuario) {

    cargarUsuario(usuario);
    activarEventos();
    prepararEquipoDesdeURL();

}


function cargarUsuario(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Usuario";

    perfilInicial.textContent =
        nombre.charAt(0).toUpperCase();

}


function activarEventos() {

    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );

}


function prepararEquipoDesdeURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const equipoId =
        parametros.get("id");


    if (equipoId) {

        console.log(
            "Equipo solicitado:",
            equipoId
        );

    }

}