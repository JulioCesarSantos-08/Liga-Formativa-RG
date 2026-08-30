import {
    protegerPagina
} from "../roles.js";


const perfilInicial = document.getElementById("perfilInicial");
const btnPerfil = document.getElementById("btnPerfil");

const categoriaSelect = document.getElementById("categoriaSelect");
const tituloCategoria = document.getElementById("tituloCategoria");

const tablaEquiposDesktop = document.getElementById("tablaEquiposDesktop");
const tablaEquiposMobile = document.getElementById("tablaEquiposMobile");


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
            pj: 4,
            pg: 3,
            pe: 1,
            pp: 0,
            gf: 9,
            gc: 3,
            pts: 10
        },

        {
            nombre: "Santos FC",
            inicial: "S",
            pj: 4,
            pg: 3,
            pe: 0,
            pp: 1,
            gf: 8,
            gc: 4,
            pts: 9
        },

        {
            nombre: "Chacales",
            inicial: "C",
            pj: 4,
            pg: 2,
            pe: 1,
            pp: 1,
            gf: 7,
            gc: 5,
            pts: 7
        },

        {
            nombre: "Pumas",
            inicial: "P",
            pj: 4,
            pg: 1,
            pe: 2,
            pp: 1,
            gf: 5,
            gc: 5,
            pts: 5
        },

        {
            nombre: "La Roma",
            inicial: "R",
            pj: 4,
            pg: 1,
            pe: 0,
            pp: 3,
            gf: 4,
            gc: 8,
            pts: 3
        },

        {
            nombre: "Atlas",
            inicial: "A",
            pj: 4,
            pg: 0,
            pe: 0,
            pp: 4,
            gf: 2,
            gc: 10,
            pts: 0
        }
    ],

    juvenil: [
        {
            nombre: "Costa Azul",
            inicial: "C",
            pj: 3,
            pg: 3,
            pe: 0,
            pp: 0,
            gf: 10,
            gc: 2,
            pts: 9
        },

        {
            nombre: "La Soledad",
            inicial: "S",
            pj: 3,
            pg: 2,
            pe: 1,
            pp: 0,
            gf: 7,
            gc: 3,
            pts: 7
        },

        {
            nombre: "Juárez Juvenil",
            inicial: "J",
            pj: 3,
            pg: 1,
            pe: 1,
            pp: 1,
            gf: 5,
            gc: 5,
            pts: 4
        },

        {
            nombre: "Pumas Juvenil",
            inicial: "P",
            pj: 3,
            pg: 1,
            pe: 0,
            pp: 2,
            gf: 4,
            gc: 6,
            pts: 3
        },

        {
            nombre: "Roma Juvenil",
            inicial: "R",
            pj: 3,
            pg: 0,
            pe: 0,
            pp: 3,
            gf: 2,
            gc: 12,
            pts: 0
        }
    ],

    infantil: [
        {
            nombre: "Chacales Infantil",
            inicial: "C",
            pj: 2,
            pg: 2,
            pe: 0,
            pp: 0,
            gf: 8,
            gc: 1,
            pts: 6
        },

        {
            nombre: "Santos Infantil",
            inicial: "S",
            pj: 2,
            pg: 1,
            pe: 1,
            pp: 0,
            gf: 5,
            gc: 2,
            pts: 4
        },

        {
            nombre: "Costa Azul Infantil",
            inicial: "C",
            pj: 2,
            pg: 1,
            pe: 0,
            pp: 1,
            gf: 4,
            gc: 4,
            pts: 3
        },

        {
            nombre: "Juárez Infantil",
            inicial: "J",
            pj: 2,
            pg: 0,
            pe: 1,
            pp: 1,
            gf: 2,
            gc: 5,
            pts: 1
        },

        {
            nombre: "Pumas Infantil",
            inicial: "P",
            pj: 2,
            pg: 0,
            pe: 0,
            pp: 2,
            gf: 1,
            gc: 8,
            pts: 0
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

    const equiposOriginales =
        datosCategorias[categoria] || [];

    const equipos =
        prepararTabla(equiposOriginales);

    renderizarDesktop(equipos);
    renderizarMobile(equipos);

}


function prepararTabla(equipos) {

    return equipos
        .map((equipo) => {

            return {
                ...equipo,
                dg: equipo.gf - equipo.gc
            };

        })
        .sort((a, b) => {

            if (b.pts !== a.pts) {
                return b.pts - a.pts;
            }

            if (b.dg !== a.dg) {
                return b.dg - a.dg;
            }

            if (b.gf !== a.gf) {
                return b.gf - a.gf;
            }

            return a.nombre.localeCompare(
                b.nombre,
                "es"
            );

        });

}


function renderizarDesktop(equipos) {

    tablaEquiposDesktop.innerHTML = "";


    if (!equipos.length) {

        tablaEquiposDesktop.innerHTML = `
            <tr>
                <td colspan="10">
                    No hay equipos registrados en esta categoría.
                </td>
            </tr>
        `;

        return;

    }


    equipos.forEach((equipo, index) => {

        const posicion =
            index + 1;

        const fila =
            document.createElement("tr");

        fila.innerHTML = `

            <td>

                <span class="posicion ${
                    posicion <= 2
                        ? "top"
                        : ""
                }">
                    ${posicion}
                </span>

            </td>


            <td class="equipo-tabla">

                <div class="escudo-mini">
                    ${equipo.inicial}
                </div>

                <a href="equipo.html">
                    ${equipo.nombre}
                </a>

            </td>


            <td>
                ${equipo.pj}
            </td>

            <td>
                ${equipo.pg}
            </td>

            <td>
                ${equipo.pe}
            </td>

            <td>
                ${equipo.pp}
            </td>

            <td>
                ${equipo.gf}
            </td>

            <td>
                ${equipo.gc}
            </td>

            <td class="${claseDiferencia(equipo.dg)}">
                ${formatearDiferencia(equipo.dg)}
            </td>

            <td class="puntos">
                ${equipo.pts}
            </td>

        `;


        tablaEquiposDesktop.appendChild(
            fila
        );

    });

}


function renderizarMobile(equipos) {

    tablaEquiposMobile.innerHTML = "";


    if (!equipos.length) {

        tablaEquiposMobile.innerHTML = `
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


    equipos.forEach((equipo, index) => {

        const posicion =
            index + 1;

        const tarjeta =
            document.createElement("article");

        tarjeta.className =
            "equipo-posicion-card";


        tarjeta.innerHTML = `

            <div class="equipo-posicion-superior">

                <div class="equipo-identidad">

                    <span class="posicion-mobile ${
                        posicion <= 2
                            ? "top"
                            : ""
                    }">
                        ${posicion}
                    </span>


                    <div class="escudo-mobile">
                        ${equipo.inicial}
                    </div>


                    <div>

                        <strong>
                            ${equipo.nombre}
                        </strong>

                        <span>
                            ${equipo.pj}
                            ${
                                equipo.pj === 1
                                    ? "partido jugado"
                                    : "partidos jugados"
                            }
                        </span>

                    </div>

                </div>


                <div class="puntos-mobile">

                    <strong>
                        ${equipo.pts}
                    </strong>

                    <span>
                        PTS
                    </span>

                </div>

            </div>


            <div class="estadisticas-mobile">

                <div>
                    <span>PJ</span>
                    <strong>
                        ${equipo.pj}
                    </strong>
                </div>

                <div>
                    <span>PG</span>
                    <strong>
                        ${equipo.pg}
                    </strong>
                </div>

                <div>
                    <span>PE</span>
                    <strong>
                        ${equipo.pe}
                    </strong>
                </div>

                <div>
                    <span>PP</span>
                    <strong>
                        ${equipo.pp}
                    </strong>
                </div>

                <div>

                    <span>DG</span>

                    <strong class="${claseDiferencia(equipo.dg)}">
                        ${formatearDiferencia(equipo.dg)}
                    </strong>

                </div>

            </div>


            <a
                href="equipo.html"
                class="btn-ver-equipo"
            >
                Ver equipo
            </a>

        `;


        tablaEquiposMobile.appendChild(
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