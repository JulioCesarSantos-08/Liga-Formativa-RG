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

const categoriaSelect =
    document.getElementById(
        "categoriaSelect"
    );

const tituloCategoria =
    document.getElementById(
        "tituloCategoria"
    );

const totalEquipos =
    document.getElementById(
        "totalEquipos"
    );

const listaEquipos =
    document.getElementById(
        "listaEquipos"
    );

const estadoCargaEquipos =
    document.getElementById(
        "estadoCargaEquipos"
    );

const estadoVacioEquipos =
    document.getElementById(
        "estadoVacioEquipos"
    );

const estadoErrorEquipos =
    document.getElementById(
        "estadoErrorEquipos"
    );


let categorias = [];

let equipos = [];

let usuarioActual = null;


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


async function cargarDatos() {

    mostrarCarga();


    try {

        const [
            snapshotCategorias,
            snapshotEquipos
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


        llenarCategorias();

        cargarCategoriaActual();

    } catch (error) {

        console.error(
            "Error cargando equipos:",
            error
        );


        mostrarError();

    }

}


function llenarCategorias() {

    categoriaSelect.innerHTML =
        "";


    const categoriasConEquipos =
        categorias.filter(
            categoria =>
                equipos.some(
                    equipo =>
                        equipo.categoriaId ===
                        categoria.id
                )
        );


    const lista =
        categoriasConEquipos.length
            ? categoriasConEquipos
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


    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const categoriaURL =
        parametros.get(
            "categoria"
        );


    if (
        categoriaURL &&
        lista.some(
            categoria =>
                categoria.id ===
                categoriaURL
        )
    ) {

        categoriaSelect.value =
            categoriaURL;

    }

}


function cargarCategoriaActual() {

    const categoriaId =
        categoriaSelect.value;


    if (!categoriaId) {

        tituloCategoria.textContent =
            "Equipos";


        totalEquipos.textContent =
            "0 equipos";


        mostrarVacio();

        return;

    }


    const categoria =
        categorias.find(
            item =>
                item.id ===
                categoriaId
        );


    const categoriaNombre =
        categoria?.nombre ||
        "Categoría";


    tituloCategoria.textContent =
        categoriaNombre;


    let equiposCategoria =
        equipos.filter(
            equipo =>
                equipo.categoriaId ===
                categoriaId
        );


    equiposCategoria =
        ordenarEquipos(
            equiposCategoria
        );


    totalEquipos.textContent =
        `${equiposCategoria.length} ${
            equiposCategoria.length === 1
                ? "equipo"
                : "equipos"
        }`;


    actualizarURL(
        categoriaId
    );


    renderizarEquipos(
        equiposCategoria,
        categoriaNombre
    );

}


function ordenarEquipos(
    lista
) {

    return [...lista].sort(
        (a, b) => {

            const estadoA =
                obtenerEstadoEquipo(
                    a
                );

            const estadoB =
                obtenerEstadoEquipo(
                    b
                );


            if (
                estadoA ===
                    "descalificado" &&
                estadoB !==
                    "descalificado"
            ) {

                return 1;

            }


            if (
                estadoB ===
                    "descalificado" &&
                estadoA !==
                    "descalificado"
            ) {

                return -1;

            }


            const puntosA =
                numeroSeguro(
                    a.pts
                );

            const puntosB =
                numeroSeguro(
                    b.pts
                );


            if (
                puntosB !==
                puntosA
            ) {

                return (
                    puntosB -
                    puntosA
                );

            }


            const dgA =
                numeroSeguro(
                    a.dg
                );

            const dgB =
                numeroSeguro(
                    b.dg
                );


            if (
                dgB !==
                dgA
            ) {

                return (
                    dgB -
                    dgA
                );

            }


            const gfA =
                numeroSeguro(
                    a.gf
                );

            const gfB =
                numeroSeguro(
                    b.gf
                );


            if (
                gfB !==
                gfA
            ) {

                return (
                    gfB -
                    gfA
                );

            }


            return String(
                a.nombre || ""
            ).localeCompare(
                String(
                    b.nombre || ""
                ),
                "es"
            );

        }
    );

}


function renderizarEquipos(
    lista,
    categoriaNombre
) {

    listaEquipos.innerHTML =
        "";


    if (!lista.length) {

        mostrarVacio();

        return;

    }


    estadoCargaEquipos.hidden =
        true;

    estadoVacioEquipos.hidden =
        true;

    estadoErrorEquipos.hidden =
        true;

    listaEquipos.hidden =
        false;


    lista.forEach(
        (equipo, index) => {

            const posicion =
                index + 1;


            const estado =
                obtenerEstadoEquipo(
                    equipo
                );


            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                estado ===
                    "descalificado"
                    ? "equipo-card equipo-descalificado"
                    : "equipo-card";


            const estadoHTML =
                obtenerEstadoHTML(
                    estado
                );


            const motivoHTML =
                estado ===
                    "descalificado"
                    ? `
                        <p class="motivo-descalificacion">
                            ${escaparHTML(
                                equipo.motivoDescalificacion ||
                                "Equipo fuera de competición"
                            )}
                        </p>
                    `
                    : "";


            tarjeta.innerHTML = `

                <div class="equipo-card-top">

                    <div class="escudo-equipo">

                        ${obtenerEscudoHTML(
                            equipo
                        )}

                    </div>


                    <span class="posicion-badge">
                        #${posicion}
                    </span>

                </div>


                <div class="equipo-card-info">

                    <h3>
                        ${escaparHTML(
                            equipo.nombre ||
                            "Equipo"
                        )}
                    </h3>


                    <span>
                        ${escaparHTML(
                            equipo.categoriaNombre ||
                            categoriaNombre
                        )}
                    </span>

                </div>


                <div class="equipo-estadisticas">

                    <div>

                        <span>
                            PJ
                        </span>

                        <strong>
                            ${numeroSeguro(
                                equipo.pj
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            PTS
                        </span>

                        <strong>
                            ${numeroSeguro(
                                equipo.pts
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            DG
                        </span>

                        <strong
                            class="${claseDiferencia(
                                numeroSeguro(
                                    equipo.dg
                                )
                            )}"
                        >
                            ${formatearDiferencia(
                                numeroSeguro(
                                    equipo.dg
                                )
                            )}
                        </strong>

                    </div>

                </div>


                <div class="equipo-meta">

                    <span>
                        👥
                        ${numeroSeguro(
                            equipo.totalJugadores
                        )}
                        ${
                            numeroSeguro(
                                equipo.totalJugadores
                            ) === 1
                                ? "jugador"
                                : "jugadores"
                        }
                    </span>


                    ${estadoHTML}

                </div>


                ${motivoHTML}


                <a
                    href="equipo.html?id=${encodeURIComponent(
                        equipo.id
                    )}"
                    class="btn-ver-equipo"
                >
                    ${
                        estado ===
                            "descalificado"
                            ? "Ver historial"
                            : "Ver equipo"
                    }
                </a>

            `;


            listaEquipos.appendChild(
                tarjeta
            );

        }
    );

}


function obtenerEscudoHTML(
    equipo
) {

    const logo =
        equipo.logoUrl ||
        "";


    if (logo) {

        return `
            <img
                src="${escaparAtributo(
                    logo
                )}"
                alt="${escaparAtributo(
                    equipo.nombre ||
                    "Equipo"
                )}"
                loading="lazy"
            >
        `;

    }


    return escaparHTML(
        obtenerInicial(
            equipo.nombre
        )
    );

}


function obtenerInicial(
    nombre
) {

    const texto =
        String(
            nombre || ""
        ).trim();


    if (!texto) {

        return "E";

    }


    return texto
        .charAt(0)
        .toUpperCase();

}


function obtenerEstadoEquipo(
    equipo
) {

    if (
        equipo.estado ===
            "descalificado" ||
        equipo.descalificado ===
            true
    ) {

        return "descalificado";

    }


    if (
        equipo.estado ===
            "inactivo" ||
        equipo.activo ===
            false
    ) {

        return "inactivo";

    }


    return "activo";

}


function obtenerEstadoHTML(
    estado
) {

    if (
        estado ===
        "descalificado"
    ) {

        return `
            <span class="estado-descalificado">
                ● Descalificado
            </span>
        `;

    }


    if (
        estado ===
        "inactivo"
    ) {

        return `
            <span class="estado-descalificado">
                ● Inactivo
            </span>
        `;

    }


    return `
        <span class="estado-activo">
            ● Activo
        </span>
    `;

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


function formatearDiferencia(
    diferencia
) {

    if (
        diferencia > 0
    ) {

        return (
            `+${diferencia}`
        );

    }


    return String(
        diferencia
    );

}


function claseDiferencia(
    diferencia
) {

    if (
        diferencia > 0
    ) {

        return "positivo";

    }


    if (
        diferencia < 0
    ) {

        return "negativo";

    }


    return "";

}


function actualizarURL(
    categoriaId
) {

    const url =
        new URL(
            window.location.href
        );


    url.searchParams.set(
        "categoria",
        categoriaId
    );


    window.history.replaceState(
        {},
        "",
        url
    );

}


function mostrarCarga() {

    estadoCargaEquipos.hidden =
        false;

    estadoVacioEquipos.hidden =
        true;

    estadoErrorEquipos.hidden =
        true;

    listaEquipos.hidden =
        true;

}


function mostrarVacio() {

    estadoCargaEquipos.hidden =
        true;

    estadoVacioEquipos.hidden =
        false;

    estadoErrorEquipos.hidden =
        true;

    listaEquipos.hidden =
        true;

}


function mostrarError() {

    estadoCargaEquipos.hidden =
        true;

    estadoVacioEquipos.hidden =
        true;

    estadoErrorEquipos.hidden =
        false;

    listaEquipos.hidden =
        true;


    totalEquipos.textContent =
        "0 equipos";

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