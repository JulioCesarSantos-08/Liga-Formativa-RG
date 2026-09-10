import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    protegerPaginaPublica
} from "../roles.js";


const perfilInicial =
    document.getElementById(
        "perfilInicial"
    );

const btnPerfil =
    document.getElementById(
        "btnPerfil"
    );


const buscarJugador =
    document.getElementById(
        "buscarJugador"
    );

const categoriaSelect =
    document.getElementById(
        "categoriaSelect"
    );

const equipoSelect =
    document.getElementById(
        "equipoSelect"
    );


const tituloListado =
    document.getElementById(
        "tituloListado"
    );

const contadorJugadores =
    document.getElementById(
        "contadorJugadores"
    );

const listaJugadores =
    document.getElementById(
        "listaJugadores"
    );


const estadoCargaJugadores =
    document.getElementById(
        "estadoCargaJugadores"
    );

const estadoVacioJugadores =
    document.getElementById(
        "estadoVacioJugadores"
    );


let usuarioActual = null;

let categorias = [];

let equipos = [];

let jugadores = [];


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    usuarioActual =
        usuario;

    cargarUsuario(
        usuario
    );

    activarEventos();

    await cargarDatos();

}


function cargarUsuario(
    usuario
) {

    const nombre =
        usuario.nombre?.trim() ||
        usuario.firebaseUser
            ?.displayName
            ?.trim() ||
        "Usuario";


    perfilInicial.textContent =
        nombre
            .charAt(0)
            .toUpperCase();

}


function activarEventos() {

    categoriaSelect.addEventListener(
        "change",
        () => {

            cargarEquiposSelector();

            aplicarFiltros();

            actualizarURL();

        }
    );


    equipoSelect.addEventListener(
        "change",
        () => {

            aplicarFiltros();

            actualizarURL();

        }
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


async function cargarDatos() {

    mostrarCarga();


    try {

        const [
            snapshotCategorias,
            snapshotEquipos,
            snapshotJugadores
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "categorias"
                )
            ),

            getDocs(
                collection(
                    db,
                    "equipos"
                )
            ),

            getDocs(
                collection(
                    db,
                    "jugadores"
                )
            )

        ]);


        categorias =
            snapshotCategorias.docs.map(
                documento => ({
                    id:
                        documento.id,

                    ...documento.data()
                })
            );


        equipos =
            snapshotEquipos.docs.map(
                documento => ({
                    id:
                        documento.id,

                    ...documento.data()
                })
            );


        jugadores =
            snapshotJugadores.docs.map(
                documento => ({
                    id:
                        documento.id,

                    ...documento.data()
                })
            );


        ordenarDatos();

        llenarCategorias();

        cargarValoresURL();

        cargarEquiposSelector(
            true
        );

        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando jugadores:",
            error
        );


        mostrarVacio(
            "No pudimos cargar los jugadores."
        );

    }

}


function ordenarDatos() {

    categorias.sort(
        (a, b) =>
            String(
                a.nombre || ""
            ).localeCompare(
                String(
                    b.nombre || ""
                ),
                "es"
            )
    );


    equipos.sort(
        (a, b) =>
            String(
                a.nombre || ""
            ).localeCompare(
                String(
                    b.nombre || ""
                ),
                "es"
            )
    );


    jugadores.sort(
        (a, b) =>
            obtenerNombreJugador(
                a
            ).localeCompare(
                obtenerNombreJugador(
                    b
                ),
                "es"
            )
    );

}


function llenarCategorias() {

    categoriaSelect.innerHTML =
        "";


    const categoriasDisponibles =
        categorias.filter(
            categoria =>
                jugadores.some(
                    jugador =>
                        jugador.categoriaId ===
                        categoria.id
                )
        );


    const lista =
        categoriasDisponibles.length
            ? categoriasDisponibles
            : categorias;


    if (!lista.length) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            "";

        option.textContent =
            "Sin categorías";


        categoriaSelect.appendChild(
            option
        );


        categoriaSelect.disabled =
            true;

        return;

    }


    categoriaSelect.disabled =
        false;


    lista.forEach(
        categoria => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                categoria.id;

            option.textContent =
                categoria.nombre ||
                "Sin nombre";


            categoriaSelect.appendChild(
                option
            );

        }
    );

}


function cargarValoresURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const categoriaId =
        parametros.get(
            "categoria"
        );


    const equipoId =
        parametros.get(
            "equipo"
        );


    if (
        categoriaId &&
        existeOpcion(
            categoriaSelect,
            categoriaId
        )
    ) {

        categoriaSelect.value =
            categoriaId;

    }


    equipoSelect.dataset.equipoUrl =
        equipoId || "";

}


function cargarEquiposSelector(
    usarURL = false
) {

    const categoriaId =
        categoriaSelect.value;


    const equipoSeleccionadoAnterior =
        equipoSelect.value;


    const equipoURL =
        usarURL
            ? equipoSelect.dataset.equipoUrl
            : "";


    equipoSelect.innerHTML = `
        <option value="">
            Todos los equipos
        </option>
    `;


    const equiposCategoria =
        equipos.filter(
            equipo =>
                !categoriaId ||
                equipo.categoriaId ===
                    categoriaId
        );


    equiposCategoria.forEach(
        equipo => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                equipo.id;

            option.textContent =
                equipo.nombre ||
                "Equipo";


            equipoSelect.appendChild(
                option
            );

        }
    );


    if (
        equipoURL &&
        existeOpcion(
            equipoSelect,
            equipoURL
        )
    ) {

        equipoSelect.value =
            equipoURL;

        equipoSelect.dataset.equipoUrl =
            "";

        return;

    }


    if (
        equipoSeleccionadoAnterior &&
        existeOpcion(
            equipoSelect,
            equipoSeleccionadoAnterior
        )
    ) {

        equipoSelect.value =
            equipoSeleccionadoAnterior;

    }

}


function aplicarFiltros() {

    const categoriaId =
        categoriaSelect.value;


    const equipoId =
        equipoSelect.value;


    const busqueda =
        normalizarTexto(
            buscarJugador.value
        );


    const jugadoresFiltrados =
        jugadores.filter(
            jugador => {

                const coincideCategoria =
                    !categoriaId ||
                    jugador.categoriaId ===
                        categoriaId;


                const coincideEquipo =
                    !equipoId ||
                    jugador.equipoId ===
                        equipoId;


                const nombre =
                    normalizarTexto(
                        obtenerNombreJugador(
                            jugador
                        )
                    );


                const equipo =
                    normalizarTexto(
                        obtenerNombreEquipoJugador(
                            jugador
                        )
                    );


                const dorsal =
                    String(
                        jugador.numero ??
                        jugador.dorsal ??
                        ""
                    );


                const coincideBusqueda =
                    !busqueda ||
                    nombre.includes(
                        busqueda
                    ) ||
                    equipo.includes(
                        busqueda
                    ) ||
                    dorsal.includes(
                        busqueda
                    );


                return (
                    coincideCategoria &&
                    coincideEquipo &&
                    coincideBusqueda
                );

            }
        );


    jugadoresFiltrados.sort(
        ordenarJugadores
    );


    actualizarTitulo();

    actualizarContador(
        jugadoresFiltrados.length
    );


    renderizarJugadores(
        jugadoresFiltrados
    );

}


function ordenarJugadores(
    a,
    b
) {

    const suspendidoA =
        estaSuspendido(
            a
        );

    const suspendidoB =
        estaSuspendido(
            b
        );


    if (
        suspendidoA !==
        suspendidoB
    ) {

        return suspendidoA
            ? 1
            : -1;

    }


    const equipoA =
        obtenerNombreEquipoJugador(
            a
        );


    const equipoB =
        obtenerNombreEquipoJugador(
            b
        );


    const comparacionEquipo =
        equipoA.localeCompare(
            equipoB,
            "es"
        );


    if (
        comparacionEquipo !== 0
    ) {

        return comparacionEquipo;

    }


    const numeroA =
        obtenerNumeroOrden(
            a
        );


    const numeroB =
        obtenerNumeroOrden(
            b
        );


    if (
        numeroA !==
        numeroB
    ) {

        return (
            numeroA -
            numeroB
        );

    }


    return obtenerNombreJugador(
        a
    ).localeCompare(
        obtenerNombreJugador(
            b
        ),
        "es"
    );

}


function actualizarTitulo() {

    const categoriaId =
        categoriaSelect.value;


    const equipoId =
        equipoSelect.value;


    if (equipoId) {

        const equipo =
            equipos.find(
                item =>
                    item.id ===
                    equipoId
            );


        tituloListado.textContent =
            equipo?.nombre ||
            "Equipo";

        return;

    }


    if (categoriaId) {

        const categoria =
            categorias.find(
                item =>
                    item.id ===
                    categoriaId
            );


        tituloListado.textContent =
            categoria?.nombre ||
            "Jugadores";

        return;

    }


    tituloListado.textContent =
        "Jugadores";

}


function actualizarContador(
    total
) {

    contadorJugadores.textContent =
        `${total} ${
            total === 1
                ? "jugador"
                : "jugadores"
        }`;

}


function renderizarJugadores(
    lista
) {

    listaJugadores.innerHTML =
        "";


    estadoCargaJugadores.hidden =
        true;


    if (!lista.length) {

        listaJugadores.hidden =
            true;

        estadoVacioJugadores.hidden =
            false;

        return;

    }


    estadoVacioJugadores.hidden =
        true;

    listaJugadores.hidden =
        false;


    lista.forEach(
        jugador => {

            const tarjeta =
                document.createElement(
                    "article"
                );


            const suspendido =
                estaSuspendido(
                    jugador
                );


            tarjeta.className =
                suspendido
                    ? "jugador-card jugador-suspendido"
                    : "jugador-card";


            const nombre =
                obtenerNombreJugador(
                    jugador
                );


            const equipoNombre =
                obtenerNombreEquipoJugador(
                    jugador
                );


            const numero =
                jugador.numero ??
                jugador.dorsal ??
                "-";


            const suspensionBadge =
                suspendido
                    ? `
                        <div class="suspension-badge">
                            Suspendido
                        </div>
                    `
                    : "";


            const avisoSuspension =
                suspendido
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
                    href="jugador.html?id=${encodeURIComponent(
                        jugador.id
                    )}"
                    class="jugador-contenido"
                >

                    <div class="foto-jugador">

                        ${obtenerFotoHTML(
                            jugador,
                            nombre
                        )}

                        <div class="numero-jugador">
                            ${escaparHTML(
                                numero
                            )}
                        </div>

                    </div>


                    <div class="jugador-info">

                        <span class="equipo-jugador">
                            ${escaparHTML(
                                equipoNombre
                            )}
                        </span>


                        <h3>
                            ${escaparHTML(
                                nombre
                            )}
                        </h3>


                        <span class="posicion-jugador">
                            ${obtenerTextoJugador(
                                jugador
                            )}
                        </span>

                    </div>

                </a>


                <div class="estadisticas-jugador">

                    <div>

                        <span>
                            PJ
                        </span>

                        <strong>
                            ${obtenerPartidosJugador(
                                jugador
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Goles
                        </span>

                        <strong>
                            ${numeroSeguro(
                                jugador.goles
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            🟨
                        </span>

                        <strong>
                            ${numeroSeguro(
                                jugador.amarillas
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            🟥
                        </span>

                        <strong class="${
                            numeroSeguro(
                                jugador.rojas
                            ) > 0
                                ? "roja"
                                : ""
                        }">
                            ${numeroSeguro(
                                jugador.rojas
                            )}
                        </strong>

                    </div>

                </div>


                ${avisoSuspension}


                <a
                    href="jugador.html?id=${encodeURIComponent(
                        jugador.id
                    )}"
                    class="btn-ver-jugador"
                >
                    Ver perfil
                </a>

            `;


            listaJugadores.appendChild(
                tarjeta
            );

        }
    );

}


function obtenerFotoHTML(
    jugador,
    nombre
) {

    const foto =
        jugador.fotoUrl ||
        "";


    if (foto) {

        return `
            <img
                src="${escaparAtributo(
                    foto
                )}"
                alt="${escaparAtributo(
                    nombre
                )}"
                loading="lazy"
            >
        `;

    }


    return `
        <span>
            ${escaparHTML(
                obtenerIniciales(
                    nombre
                )
            )}
        </span>
    `;

}


function obtenerTextoJugador(
    jugador
) {

    if (
        jugador.posicion
    ) {

        return escaparHTML(
            jugador.posicion
        );

    }


    if (
        jugador.activo ===
        false
    ) {

        return "Inactivo";

    }


    return "Jugador";

}


function obtenerNombreJugador(
    jugador
) {

    return (
        jugador.nombreCompleto ||
        jugador.nombre ||
        "Jugador"
    );

}


function obtenerNombreEquipoJugador(
    jugador
) {

    if (
        jugador.equipoNombre
    ) {

        return jugador.equipoNombre;

    }


    const equipo =
        equipos.find(
            item =>
                item.id ===
                jugador.equipoId
        );


    return (
        equipo?.nombre ||
        "Sin equipo"
    );

}


function obtenerPartidosJugador(
    jugador
) {

    const posiblesCampos = [
        jugador.pj,
        jugador.partidos,
        jugador.partidosJugados
    ];


    for (
        const valor of posiblesCampos
    ) {

        const numero =
            Number(
                valor
            );


        if (
            Number.isFinite(
                numero
            )
        ) {

            return numero;

        }

    }


    return 0;

}


function estaSuspendido(
    jugador
) {

    return (
        jugador.suspendido ===
            true ||
        numeroSeguro(
            jugador.partidosSuspensionPendientes
        ) > 0
    );

}


function obtenerNumeroOrden(
    jugador
) {

    const numero =
        Number(
            jugador.numero ??
            jugador.dorsal
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return 999;

    }


    return numero;

}


function obtenerIniciales(
    nombre
) {

    const palabras =
        String(
            nombre || ""
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!palabras.length) {

        return "J";

    }


    if (
        palabras.length === 1
    ) {

        return palabras[0]
            .charAt(0)
            .toUpperCase();

    }


    return (
        palabras[0]
            .charAt(0) +
        palabras[1]
            .charAt(0)
    ).toUpperCase();

}


function actualizarURL() {

    const url =
        new URL(
            window.location.href
        );


    const categoriaId =
        categoriaSelect.value;


    const equipoId =
        equipoSelect.value;


    if (categoriaId) {

        url.searchParams.set(
            "categoria",
            categoriaId
        );

    } else {

        url.searchParams.delete(
            "categoria"
        );

    }


    if (equipoId) {

        url.searchParams.set(
            "equipo",
            equipoId
        );

    } else {

        url.searchParams.delete(
            "equipo"
        );

    }


    window.history.replaceState(
        {},
        "",
        url
    );

}


function existeOpcion(
    select,
    valor
) {

    return Array.from(
        select.options
    ).some(
        option =>
            option.value ===
            valor
    );

}


function mostrarCarga() {

    estadoCargaJugadores.hidden =
        false;

    estadoVacioJugadores.hidden =
        true;

    listaJugadores.hidden =
        true;

}


function mostrarVacio(
    mensaje = ""
) {

    estadoCargaJugadores.hidden =
        true;

    listaJugadores.hidden =
        true;

    estadoVacioJugadores.hidden =
        false;


    if (mensaje) {

        const parrafo =
            estadoVacioJugadores.querySelector(
                "p"
            );


        if (parrafo) {

            parrafo.textContent =
                mensaje;

        }

    }

}


function normalizarTexto(
    texto
) {

    return String(
        texto || ""
    )
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

}


function numeroSeguro(
    valor
) {

    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return 0;

    }


    return numero;

}


function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );

}