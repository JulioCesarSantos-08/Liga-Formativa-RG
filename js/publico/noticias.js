import {
    protegerPagina
} from "../roles.js";


const perfilInicial = document.getElementById("perfilInicial");
const btnPerfil = document.getElementById("btnPerfil");

const filtros = document.querySelectorAll(".filtro-noticia");
const noticias = document.querySelectorAll(".noticia-card");


const usuario = await protegerPagina([
    "publico"
]);


if (usuario) {

    cargarUsuario(usuario);
    activarEventos();

}


function cargarUsuario(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Usuario";

    perfilInicial.textContent =
        nombre.charAt(0).toUpperCase();

}


function activarEventos() {

    filtros.forEach((boton) => {

        boton.addEventListener(
            "click",
            () => {

                filtros.forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                boton.classList.add(
                    "active"
                );


                const filtro =
                    boton.dataset.filtro;


                filtrarNoticias(
                    filtro
                );

            }
        );

    });


    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );

}


function filtrarNoticias(filtro) {

    noticias.forEach((noticia) => {

        const tipo =
            noticia.dataset.tipo;


        if (
            filtro === "todas" ||
            tipo === filtro
        ) {

            noticia.classList.remove(
                "noticia-oculta"
            );

            return;

        }


        noticia.classList.add(
            "noticia-oculta"
        );

    });

}