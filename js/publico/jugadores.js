import {
    protegerPagina
} from "../roles.js";


const perfilInicial = document.getElementById("perfilInicial");
const btnPerfil = document.getElementById("btnPerfil");

const buscarJugador = document.getElementById("buscarJugador");
const categoriaSelect = document.getElementById("categoriaSelect");
const equipoSelect = document.getElementById("equipoSelect");

const tituloListado = document.getElementById("tituloListado");
const contadorJugadores = document.getElementById("contadorJugadores");
const listaJugadores = document.getElementById("listaJugadores");


const usuario = await protegerPagina([
    "publico"
]);


if (usuario) {

    cargarUsuario(usuario);
    activarEventos();
    cargarCategoria();

}


const datosJugadores = {

    libre: [
        {
            nombre: "Juan Pérez",
            iniciales: "JP",
            dorsal: 10,
            equipo: "Juárez",
            posicion: "Delantero",
            pj: 4,
            goles: 5,
            amarillas: 1,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Carlos López",
            iniciales: "CL",
            dorsal: 8,
            equipo: "Juárez",
            posicion: "Mediocampista",
            pj: 4,
            goles: 2,
            amarillas: 0,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Miguel Díaz",
            iniciales: "MD",
            dorsal: 5,
            equipo: "Juárez",
            posicion: "Defensa",
            pj: 4,
            goles: 0,
            amarillas: 1,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Pedro Santos",
            iniciales: "PS",
            dorsal: 1,
            equipo: "Juárez",
            posicion: "Portero",
            pj: 4,
            goles: 0,
            amarillas: 0,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Andrés García",
            iniciales: "AG",
            dorsal: 7,
            equipo: "Juárez",
            posicion: "Mediocampista",
            pj: 4,
            goles: 1,
            amarillas: 2,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Roberto López",
            iniciales: "RL",
            dorsal: 9,
            equipo: "Juárez",
            posicion: "Delantero",
            pj: 4,
            goles: 1,
            amarillas: 3,
            rojas: 1,
            estado: "suspendido"
        },

        {
            nombre: "José Ramírez",
            iniciales: "JR",
            dorsal: 11,
            equipo: "Santos FC",
            posicion: "Delantero",
            pj: 4,
            goles: 4,
            amarillas: 1,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Mario Cruz",
            iniciales: "MC",
            dorsal: 6,
            equipo: "Santos FC",
            posicion: "Mediocampista",
            pj: 4,
            goles: 2,
            amarillas: 2,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Daniel Hernández",
            iniciales: "DH",
            dorsal: 4,
            equipo: "Chacales",
            posicion: "Defensa",
            pj: 4,
            goles: 0,
            amarillas: 1,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Luis Martínez",
            iniciales: "LM",
            dorsal: 9,
            equipo: "Chacales",
            posicion: "Delantero",
            pj: 4,
            goles: 3,
            amarillas: 0,
            rojas: 0,
            estado: "activo"
        }
    ],

    juvenil: [
        {
            nombre: "Ángel Torres",
            iniciales: "AT",
            dorsal: 10,
            equipo: "Costa Azul",
            posicion: "Delantero",
            pj: 3,
            goles: 5,
            amarillas: 0,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Mateo García",
            iniciales: "MG",
            dorsal: 8,
            equipo: "Costa Azul",
            posicion: "Mediocampista",
            pj: 3,
            goles: 2,
            amarillas: 1,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Emiliano López",
            iniciales: "EL",
            dorsal: 9,
            equipo: "La Soledad",
            posicion: "Delantero",
            pj: 3,
            goles: 3,
            amarillas: 0,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Santiago Díaz",
            iniciales: "SD",
            dorsal: 5,
            equipo: "Juárez Juvenil",
            posicion: "Defensa",
            pj: 3,
            goles: 0,
            amarillas: 2,
            rojas: 0,
            estado: "activo"
        }
    ],

    infantil: [
        {
            nombre: "Diego Santos",
            iniciales: "DS",
            dorsal: 10,
            equipo: "Chacales Infantil",
            posicion: "Delantero",
            pj: 2,
            goles: 4,
            amarillas: 0,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Gael López",
            iniciales: "GL",
            dorsal: 7,
            equipo: "Santos Infantil",
            posicion: "Mediocampista",
            pj: 2,
            goles: 2,
            amarillas: 0,
            rojas: 0,
            estado: "activo"
        },

        {
            nombre: "Ian Pérez",
            iniciales: "IP",
            dorsal: 1,
            equipo: "Costa Azul Infantil",
            posicion: "Portero",
            pj: 2,
            goles: 0,
            amarillas: 0,
            rojas: 0,
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
        () => {

            cargarCategoria();

        }
    );


    equipoSelect.addEventListener(
        "change",
        aplicarFiltros
    );


    buscarJugador.addEventListener(
        "input",
        aplicarFiltros
    );


    btnPerfil.addEventListener(
        "click",
        () => {

            window.location.href =
                "publico.html";

        }
    );

}


function cargarCategoria() {

    const categoria =
        categoriaSelect.value;

    const textoCategoria =
        categoriaSelect.options[
            categoriaSelect.selectedIndex
        ].textContent.trim();

    tituloListado.textContent =
        textoCategoria;


    cargarEquiposSelector(
        datosJugadores[categoria] || []
    );


    aplicarFiltros();

}


function cargarEquiposSelector(jugadores) {

    equipoSelect.innerHTML = `
        <option value="todos">
            Todos los equipos
        </option>
    `;


    const equipos =
        [
            ...new Set(
                jugadores.map(
                    jugador =>
                        jugador.equipo
                )
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "es"
                )
        );


    equipos.forEach((equipo) => {

        const option =
            document.createElement("option");

        option.value =
            equipo;

        option.textContent =
            equipo;

        equipoSelect.appendChild(
            option
        );

    });

}


function aplicarFiltros() {

    const categoria =
        categoriaSelect.value;

    const equipo =
        equipoSelect.value;

    const busqueda =
        normalizarTexto(
            buscarJugador.value
        );


    const jugadoresBase =
        datosJugadores[categoria] || [];


    const jugadoresFiltrados =
        jugadoresBase.filter(
            (jugador) => {

                const coincideEquipo =
                    equipo === "todos" ||
                    jugador.equipo === equipo;


                const coincideNombre =
                    normalizarTexto(
                        jugador.nombre
                    ).includes(
                        busqueda
                    );


                return (
                    coincideEquipo &&
                    coincideNombre
                );

            }
        );


    actualizarTitulo(
        categoria,
        equipo
    );


    actualizarContador(
        jugadoresFiltrados.length
    );


    renderizarJugadores(
        jugadoresFiltrados
    );

}


function actualizarTitulo(
    categoria,
    equipo
) {

    const textoCategoria =
        categoriaSelect.options[
            categoriaSelect.selectedIndex
        ].textContent.trim();


    if (equipo === "todos") {

        tituloListado.textContent =
            textoCategoria;

        return;

    }


    tituloListado.textContent =
        equipo;

}


function actualizarContador(total) {

    contadorJugadores.textContent =
        `${total} ${
            total === 1
                ? "jugador"
                : "jugadores"
        }`;

}


function renderizarJugadores(jugadores) {

    listaJugadores.innerHTML = "";


    if (!jugadores.length) {

        listaJugadores.innerHTML = `
            <div
                style="
                    padding:26px 18px;
                    text-align:center;
                    background:#ffffff;
                    border:1px solid #e4e7ec;
                    border-radius:18px;
                    color:#667085;
                    line-height:1.5;
                "
            >
                No encontramos jugadores con los filtros seleccionados.
            </div>
        `;

        return;

    }


    jugadores.forEach((jugador) => {

        const tarjeta =
            document.createElement("article");


        tarjeta.className =
            jugador.estado === "suspendido"
                ? "jugador-card jugador-suspendido"
                : "jugador-card";


        const suspensionBadge =
            jugador.estado === "suspendido"
                ? `
                    <div class="suspension-badge">
                        Suspendido
                    </div>
                `
                : "";


        const avisoSuspension =
            jugador.estado === "suspendido"
                ? `
                    <div class="aviso-suspension">

                        <span>
                            ⛔
                        </span>

                        <p>
                            No disponible para el próximo partido.
                        </p>

                    </div>
                `
                : "";


        tarjeta.innerHTML = `

            ${suspensionBadge}


            <a
                href="jugador.html"
                class="jugador-contenido"
            >

                <div class="foto-jugador">

                    <span>
                        ${jugador.iniciales}
                    </span>

                    <div class="numero-jugador">
                        ${jugador.dorsal}
                    </div>

                </div>


                <div class="jugador-info">

                    <span class="equipo-jugador">
                        ${jugador.equipo}
                    </span>

                    <h3>
                        ${jugador.nombre}
                    </h3>

                    <span class="posicion-jugador">
                        ${jugador.posicion}
                    </span>

                </div>

            </a>


            <div class="estadisticas-jugador">

                <div>

                    <span>
                        PJ
                    </span>

                    <strong>
                        ${jugador.pj}
                    </strong>

                </div>


                <div>

                    <span>
                        Goles
                    </span>

                    <strong>
                        ${jugador.goles}
                    </strong>

                </div>


                <div>

                    <span>
                        🟨
                    </span>

                    <strong>
                        ${jugador.amarillas}
                    </strong>

                </div>


                <div>

                    <span>
                        🟥
                    </span>

                    <strong class="${
                        jugador.rojas > 0
                            ? "roja"
                            : ""
                    }">
                        ${jugador.rojas}
                    </strong>

                </div>

            </div>


            ${avisoSuspension}


            <a
                href="jugador.html"
                class="btn-ver-jugador"
            >
                Ver perfil
            </a>

        `;


        listaJugadores.appendChild(
            tarjeta
        );

    });

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