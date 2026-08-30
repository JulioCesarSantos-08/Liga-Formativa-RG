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
    prepararPartidoDesdeURL();

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


function prepararPartidoDesdeURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const partidoId =
        parametros.get("id");


    if (partidoId) {

        console.log(
            "Partido solicitado:",
            partidoId
        );

    }

}