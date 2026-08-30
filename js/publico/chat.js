import {
    protegerPagina
} from "../roles.js";


const perfilInicial = document.getElementById("perfilInicial");
const btnPerfil = document.getElementById("btnPerfil");

const listaMensajes = document.getElementById("listaMensajes");

const formMensaje = document.getElementById("formMensaje");
const mensajeTexto = document.getElementById("mensajeTexto");
const contadorCaracteres = document.getElementById("contadorCaracteres");
const btnEnviar = document.getElementById("btnEnviar");


const usuario = await protegerPagina([
    "publico"
]);


if (usuario) {

    cargarUsuario(usuario);
    activarEventos();
    actualizarContador();
    irAlUltimoMensaje();

}


function cargarUsuario(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Usuario";

    perfilInicial.textContent =
        obtenerInicial(nombre);

}


function activarEventos() {

    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );


    mensajeTexto.addEventListener(
        "input",
        () => {

            ajustarTextarea();
            actualizarContador();
            actualizarEstadoBoton();

        }
    );


    formMensaje.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            enviarMensaje();

        }
    );

}


function enviarMensaje() {

    const texto =
        mensajeTexto.value
            .trim()
            .replace(/\s+/g, " ");


    if (!texto) {
        return;
    }


    if (texto.length > 400) {
        return;
    }


    const nombre =
        usuario.nombre?.trim() ||
        "Usuario";


    const mensaje =
        document.createElement("article");


    mensaje.className =
        "mensaje mensaje-propio";


    mensaje.innerHTML = `

        <div class="mensaje-contenido">

            <div class="mensaje-meta">

                <strong>
                    Tú
                </strong>

                <span>
                    ${obtenerHoraActual()}
                </span>

            </div>


            <div class="burbuja"></div>

        </div>


        <div class="avatar propio">
            ${obtenerInicial(nombre)}
        </div>

    `;


    const burbuja =
        mensaje.querySelector(
            ".burbuja"
        );


    burbuja.textContent =
        texto;


    listaMensajes.appendChild(
        mensaje
    );


    mensajeTexto.value =
        "";


    mensajeTexto.style.height =
        "48px";


    actualizarContador();
    actualizarEstadoBoton();
    irAlUltimoMensaje();

}


function obtenerHoraActual() {

    const ahora =
        new Date();


    return ahora.toLocaleTimeString(
        "es-MX",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


function obtenerInicial(nombre) {

    const texto =
        nombre.trim();


    if (!texto) {
        return "U";
    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function actualizarContador() {

    const total =
        mensajeTexto.value.length;


    contadorCaracteres.textContent =
        `${total}/400`;


    if (total >= 380) {

        contadorCaracteres.style.color =
            "#b42318";

        return;

    }


    if (total >= 330) {

        contadorCaracteres.style.color =
            "#b54708";

        return;

    }


    contadorCaracteres.style.color =
        "#98a2b3";

}


function actualizarEstadoBoton() {

    const texto =
        mensajeTexto.value.trim();


    btnEnviar.disabled =
        texto.length === 0 ||
        texto.length > 400;

}


function ajustarTextarea() {

    mensajeTexto.style.height =
        "48px";


    const altura =
        Math.min(
            mensajeTexto.scrollHeight,
            130
        );


    mensajeTexto.style.height =
        `${altura}px`;

}


function irAlUltimoMensaje() {

    requestAnimationFrame(
        () => {

            const ultimoMensaje =
                listaMensajes.lastElementChild;


            if (!ultimoMensaje) {
                return;
            }


            ultimoMensaje.scrollIntoView({
                behavior: "smooth",
                block: "end"
            });

        }
    );

}