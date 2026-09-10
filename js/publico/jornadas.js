import {
    protegerPaginaPublica
} from "../roles.js";


const perfilInicial = document.getElementById("perfilInicial");
const btnPerfil = document.getElementById("btnPerfil");

const categoriaSelect = document.getElementById("categoriaSelect");

const tituloJornada = document.getElementById("tituloJornada");
const estadoJornada = document.getElementById("estadoJornada");

const listaPartidos = document.getElementById("listaPartidos");

const botonesJornada = document.querySelectorAll(".jornada-tab");


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    cargarUsuario(usuario);
    activarEventos();

}


const datosJornadas = {

    1: [
        {
            fecha: "Sábado 29 de agosto",
            hora: "3:00 PM",
            campo: "Campo Municipal",
            local: "Juárez",
            visitante: "Chacales",
            inicialLocal: "J",
            inicialVisitante: "C",
            estado: "proximo",
            resultado: null
        },

        {
            fecha: "Sábado 29 de agosto",
            hora: "5:00 PM",
            campo: "Campo Principal",
            local: "Santos FC",
            visitante: "La Roma",
            inicialLocal: "S",
            inicialVisitante: "R",
            estado: "finalizado",
            resultado: "2 - 1"
        },

        {
            fecha: "Domingo 30 de agosto",
            hora: "11:00 AM",
            campo: "Unidad Deportiva",
            local: "Pumas",
            visitante: "Atlas",
            inicialLocal: "P",
            inicialVisitante: "A",
            estado: "proximo",
            resultado: null
        }
    ],

    2: [
        {
            fecha: "Sábado 5 de septiembre",
            hora: "4:00 PM",
            campo: "Campo Municipal",
            local: "Juárez",
            visitante: "Santos FC",
            inicialLocal: "J",
            inicialVisitante: "S",
            estado: "proximo",
            resultado: null
        },

        {
            fecha: "Sábado 5 de septiembre",
            hora: "6:00 PM",
            campo: "Campo Principal",
            local: "Chacales",
            visitante: "Pumas",
            inicialLocal: "C",
            inicialVisitante: "P",
            estado: "proximo",
            resultado: null
        },

        {
            fecha: "Domingo 6 de septiembre",
            hora: "12:00 PM",
            campo: "Unidad Deportiva",
            local: "La Roma",
            visitante: "Atlas",
            inicialLocal: "R",
            inicialVisitante: "A",
            estado: "proximo",
            resultado: null
        }
    ],

    3: [
        {
            fecha: "Sábado 12 de septiembre",
            hora: "3:00 PM",
            campo: "Campo Municipal",
            local: "Atlas",
            visitante: "Juárez",
            inicialLocal: "A",
            inicialVisitante: "J",
            estado: "proximo",
            resultado: null
        },

        {
            fecha: "Sábado 12 de septiembre",
            hora: "5:00 PM",
            campo: "Campo Principal",
            local: "Pumas",
            visitante: "Santos FC",
            inicialLocal: "P",
            inicialVisitante: "S",
            estado: "proximo",
            resultado: null
        },

        {
            fecha: "Domingo 13 de septiembre",
            hora: "11:00 AM",
            campo: "Unidad Deportiva",
            local: "Chacales",
            visitante: "La Roma",
            inicialLocal: "C",
            inicialVisitante: "R",
            estado: "proximo",
            resultado: null
        }
    ],

    4: [
        {
            fecha: "Sábado 19 de septiembre",
            hora: "3:00 PM",
            campo: "Campo Municipal",
            local: "Juárez",
            visitante: "Pumas",
            inicialLocal: "J",
            inicialVisitante: "P",
            estado: "proximo",
            resultado: null
        },

        {
            fecha: "Sábado 19 de septiembre",
            hora: "5:00 PM",
            campo: "Campo Principal",
            local: "Santos FC",
            visitante: "Chacales",
            inicialLocal: "S",
            inicialVisitante: "C",
            estado: "proximo",
            resultado: null
        },

        {
            fecha: "Domingo 20 de septiembre",
            hora: "12:00 PM",
            campo: "Unidad Deportiva",
            local: "Atlas",
            visitante: "La Roma",
            inicialLocal: "A",
            inicialVisitante: "R",
            estado: "proximo",
            resultado: null
        }
    ]

};


function cargarUsuario(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Usuario";

    perfilInicial.textContent =
        nombre.charAt(0).toUpperCase();

}


function activarEventos() {

    botonesJornada.forEach((boton) => {

        boton.addEventListener("click", () => {

            botonesJornada.forEach((item) => {
                item.classList.remove("active");
            });

            boton.classList.add("active");

            const jornada =
                Number(boton.dataset.jornada);

            cargarJornada(jornada);

        });

    });


    categoriaSelect.addEventListener(
        "change",
        () => {

            cargarJornadaActual();

        }
    );


    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );

}


function cargarJornadaActual() {

    const botonActivo =
        document.querySelector(
            ".jornada-tab.active"
        );

    const jornada =
        Number(
            botonActivo?.dataset.jornada || 1
        );

    cargarJornada(jornada);

}


function cargarJornada(numeroJornada) {

    tituloJornada.textContent =
        `Jornada ${numeroJornada}`;

    const categoriaTexto =
        categoriaSelect.options[
            categoriaSelect.selectedIndex
        ].textContent;

    document
        .querySelector(".resumen-jornada .seccion-mini")
        .textContent =
        categoriaTexto;


    const partidos =
        datosJornadas[numeroJornada] || [];


    actualizarEstadoJornada(partidos);

    renderizarPartidos(partidos);

}


function actualizarEstadoJornada(partidos) {

    if (!partidos.length) {

        estadoJornada.textContent =
            "Sin partidos";

        estadoJornada.className =
            "badge-jornada";

        return;

    }


    const todosFinalizados =
        partidos.every(
            partido =>
                partido.estado === "finalizado"
        );


    const algunoFinalizado =
        partidos.some(
            partido =>
                partido.estado === "finalizado"
        );


    if (todosFinalizados) {

        estadoJornada.textContent =
            "Finalizada";

        return;

    }


    if (algunoFinalizado) {

        estadoJornada.textContent =
            "En curso";

        return;

    }


    estadoJornada.textContent =
        "Próxima";

}


function renderizarPartidos(partidos) {

    listaPartidos.innerHTML = "";


    if (!partidos.length) {

        listaPartidos.innerHTML = `
            <div style="
                padding:24px;
                text-align:center;
                background:white;
                border-radius:18px;
                border:1px solid #e4e7ec;
                color:#667085;
            ">
                No hay partidos registrados para esta jornada.
            </div>
        `;

        return;

    }


    partidos.forEach((partido) => {

        const articulo =
            document.createElement("article");

        articulo.className =
            "partido-card";


        const textoEstado =
            obtenerTextoEstado(
                partido.estado
            );


        const centro =
            partido.resultado
                ? `
                    <span class="hora">
                        ${partido.hora}
                    </span>

                    <strong class="resultado">
                        ${partido.resultado}
                    </strong>

                    <span>
                        ${partido.campo}
                    </span>
                `
                : `
                    <span class="hora">
                        ${partido.hora}
                    </span>

                    <strong>
                        VS
                    </strong>

                    <span>
                        ${partido.campo}
                    </span>
                `;


        articulo.innerHTML = `

            <div class="partido-superior">

                <span>
                    ${partido.fecha}
                </span>

                <span class="estado-partido ${partido.estado}">
                    ${textoEstado}
                </span>

            </div>


            <div class="partido-principal">

                <div class="equipo">

                    <div class="escudo">
                        ${partido.inicialLocal}
                    </div>

                    <strong>
                        ${partido.local}
                    </strong>

                </div>


                <div class="partido-centro">
                    ${centro}
                </div>


                <div class="equipo">

                    <div class="escudo">
                        ${partido.inicialVisitante}
                    </div>

                    <strong>
                        ${partido.visitante}
                    </strong>

                </div>

            </div>


            <a
                href="partido.html"
                class="btn-detalle"
            >
                ${
                    partido.estado === "finalizado"
                        ? "Ver resultado"
                        : "Ver partido"
                }
            </a>

        `;


        listaPartidos.appendChild(
            articulo
        );

    });

}


function obtenerTextoEstado(estado) {

    switch (estado) {

        case "finalizado":
            return "Finalizado";

        case "en-vivo":
            return "En vivo";

        case "cancelado":
            return "Cancelado";

        case "proximo":
        default:
            return "Próximo";

    }

}


cargarJornada(1);