import {
    protegerPagina
} from "../roles.js";


const perfilInicial = document.getElementById("perfilInicial");
const btnPerfil = document.getElementById("btnPerfil");

const categoriaSelect = document.getElementById("categoriaSelect");
const tituloCategoria = document.getElementById("tituloCategoria");
const totalEquipos = document.getElementById("totalEquipos");
const listaEquipos = document.getElementById("listaEquipos");


const usuario = await protegerPagina([
    "publico"
]);


if (usuario) {

    cargarUsuario(usuario);
    activarEventos();
    cargarCategoriaActual();

}


const datosCategorias = {

    libre: [
        {
            nombre: "Juárez",
            inicial: "J",
            posicion: 1,
            pj: 4,
            pts: 10,
            dg: 6,
            jugadores: 26,
            estado: "activo"
        },

        {
            nombre: "Santos FC",
            inicial: "S",
            posicion: 2,
            pj: 4,
            pts: 9,
            dg: 4,
            jugadores: 24,
            estado: "activo"
        },

        {
            nombre: "Chacales",
            inicial: "C",
            posicion: 3,
            pj: 4,
            pts: 7,
            dg: 2,
            jugadores: 26,
            estado: "activo"
        },

        {
            nombre: "Pumas",
            inicial: "P",
            posicion: 4,
            pj: 4,
            pts: 5,
            dg: 0,
            jugadores: 22,
            estado: "activo"
        },

        {
            nombre: "La Roma",
            inicial: "R",
            posicion: 5,
            pj: 4,
            pts: 3,
            dg: -4,
            jugadores: 26,
            estado: "activo"
        },

        {
            nombre: "Atlas",
            inicial: "A",
            posicion: 6,
            pj: 4,
            pts: 0,
            dg: -8,
            jugadores: 20,
            estado: "descalificado",
            motivo: "Sanción administrativa"
        }
    ],

    juvenil: [
        {
            nombre: "Costa Azul",
            inicial: "C",
            posicion: 1,
            pj: 3,
            pts: 9,
            dg: 8,
            jugadores: 25,
            estado: "activo"
        },

        {
            nombre: "La Soledad",
            inicial: "S",
            posicion: 2,
            pj: 3,
            pts: 7,
            dg: 4,
            jugadores: 23,
            estado: "activo"
        },

        {
            nombre: "Juárez Juvenil",
            inicial: "J",
            posicion: 3,
            pj: 3,
            pts: 4,
            dg: 0,
            jugadores: 24,
            estado: "activo"
        },

        {
            nombre: "Pumas Juvenil",
            inicial: "P",
            posicion: 4,
            pj: 3,
            pts: 3,
            dg: -2,
            jugadores: 21,
            estado: "activo"
        },

        {
            nombre: "Roma Juvenil",
            inicial: "R",
            posicion: 5,
            pj: 3,
            pts: 0,
            dg: -10,
            jugadores: 19,
            estado: "activo"
        }
    ],

    infantil: [
        {
            nombre: "Chacales Infantil",
            inicial: "C",
            posicion: 1,
            pj: 2,
            pts: 6,
            dg: 7,
            jugadores: 18,
            estado: "activo"
        },

        {
            nombre: "Santos Infantil",
            inicial: "S",
            posicion: 2,
            pj: 2,
            pts: 4,
            dg: 3,
            jugadores: 17,
            estado: "activo"
        },

        {
            nombre: "Costa Azul Infantil",
            inicial: "C",
            posicion: 3,
            pj: 2,
            pts: 3,
            dg: 0,
            jugadores: 20,
            estado: "activo"
        },

        {
            nombre: "Juárez Infantil",
            inicial: "J",
            posicion: 4,
            pj: 2,
            pts: 1,
            dg: -3,
            jugadores: 16,
            estado: "activo"
        },

        {
            nombre: "Pumas Infantil",
            inicial: "P",
            posicion: 5,
            pj: 2,
            pts: 0,
            dg: -7,
            jugadores: 15,
            estado: "activo"
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

    categoriaSelect.addEventListener(
        "change",
        cargarCategoriaActual
    );


    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );

}


function cargarCategoriaActual() {

    const categoria =
        categoriaSelect.value;

    const textoCategoria =
        categoriaSelect.options[
            categoriaSelect.selectedIndex
        ].textContent.trim();

    tituloCategoria.textContent =
        textoCategoria;


    const equipos =
        datosCategorias[categoria] || [];


    totalEquipos.textContent =
        `${equipos.length} ${
            equipos.length === 1
                ? "equipo"
                : "equipos"
        }`;


    renderizarEquipos(
        equipos,
        textoCategoria
    );

}


function renderizarEquipos(
    equipos,
    categoriaTexto
) {

    listaEquipos.innerHTML = "";


    if (!equipos.length) {

        listaEquipos.innerHTML = `
            <div
                style="
                    padding:24px;
                    text-align:center;
                    background:#ffffff;
                    border:1px solid #e4e7ec;
                    border-radius:18px;
                    color:#667085;
                "
            >
                No hay equipos registrados en esta categoría.
            </div>
        `;

        return;

    }


    equipos.forEach((equipo) => {

        const tarjeta =
            document.createElement("article");

        tarjeta.className =
            equipo.estado === "descalificado"
                ? "equipo-card equipo-descalificado"
                : "equipo-card";


        const estadoHTML =
            equipo.estado === "descalificado"
                ? `
                    <span class="estado-descalificado">
                        ● Descalificado
                    </span>
                `
                : `
                    <span class="estado-activo">
                        ● Activo
                    </span>
                `;


        const motivoHTML =
            equipo.estado === "descalificado"
                ? `
                    <p class="motivo-descalificacion">
                        ${
                            equipo.motivo ||
                            "Equipo fuera de competición"
                        }
                    </p>
                `
                : "";


        tarjeta.innerHTML = `

            <div class="equipo-card-top">

                <div class="escudo-equipo">
                    ${equipo.inicial}
                </div>

                <span class="posicion-badge">
                    #${equipo.posicion}
                </span>

            </div>


            <div class="equipo-card-info">

                <h3>
                    ${equipo.nombre}
                </h3>

                <span>
                    ${categoriaTexto}
                </span>

            </div>


            <div class="equipo-estadisticas">

                <div>

                    <span>
                        PJ
                    </span>

                    <strong>
                        ${equipo.pj}
                    </strong>

                </div>


                <div>

                    <span>
                        PTS
                    </span>

                    <strong>
                        ${equipo.pts}
                    </strong>

                </div>


                <div>

                    <span>
                        DG
                    </span>

                    <strong class="${claseDiferencia(equipo.dg)}">
                        ${formatearDiferencia(equipo.dg)}
                    </strong>

                </div>

            </div>


            <div class="equipo-meta">

                <span>
                    👥 ${equipo.jugadores}
                    ${
                        equipo.jugadores === 1
                            ? "jugador"
                            : "jugadores"
                    }
                </span>

                ${estadoHTML}

            </div>


            ${motivoHTML}


            <a
                href="equipo.html"
                class="btn-ver-equipo"
            >
                ${
                    equipo.estado === "descalificado"
                        ? "Ver historial"
                        : "Ver equipo"
                }
            </a>

        `;


        listaEquipos.appendChild(
            tarjeta
        );

    });

}


function formatearDiferencia(diferencia) {

    if (diferencia > 0) {
        return `+${diferencia}`;
    }

    return String(diferencia);

}


function claseDiferencia(diferencia) {

    if (diferencia > 0) {
        return "positivo";
    }

    if (diferencia < 0) {
        return "negativo";
    }

    return "";

}