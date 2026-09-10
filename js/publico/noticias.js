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


const filtros =
    document.querySelectorAll(
        ".filtro-noticia"
    );


const seccionDestacada =
    document.getElementById(
        "seccionDestacada"
    );

const destacadaImagen =
    document.getElementById(
        "destacadaImagen"
    );

const destacadaTipo =
    document.getElementById(
        "destacadaTipo"
    );

const destacadaFecha =
    document.getElementById(
        "destacadaFecha"
    );

const destacadaTitulo =
    document.getElementById(
        "destacadaTitulo"
    );

const destacadaResumen =
    document.getElementById(
        "destacadaResumen"
    );

const destacadaEnlace =
    document.getElementById(
        "destacadaEnlace"
    );


const estadoCargaNoticias =
    document.getElementById(
        "estadoCargaNoticias"
    );

const listaNoticias =
    document.getElementById(
        "listaNoticias"
    );

const estadoSinNoticias =
    document.getElementById(
        "estadoSinNoticias"
    );


let noticias = [];

let filtroActual =
    "todas";


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    cargarUsuario(
        usuario
    );

    activarEventos();

    await cargarNoticias();

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

    filtros.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    filtros.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    boton.classList.add(
                        "active"
                    );


                    filtroActual =
                        boton.dataset.filtro ||
                        "todas";


                    aplicarFiltro();

                }
            );

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


async function cargarNoticias() {

    mostrarCarga();


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "noticias"
                )
            );


        noticias =
            snapshot.docs.map(
                documento => ({
                    id:
                        documento.id,

                    ...documento.data()
                })
            );


        noticias =
            noticias
                .filter(
                    noticia =>
                        noticia.activa !== false
                )
                .sort(
                    ordenarNoticias
                );


        renderizarDestacada();

        aplicarFiltro();

    } catch (error) {

        console.error(
            "Error cargando noticias:",
            error
        );


        mostrarError();

    }

}


function ordenarNoticias(
    a,
    b
) {

    const fechaA =
        obtenerFechaNoticia(
            a
        );


    const fechaB =
        obtenerFechaNoticia(
            b
        );


    return (
        (fechaB?.getTime() || 0) -
        (fechaA?.getTime() || 0)
    );

}


function aplicarFiltro() {

    let filtradas =
        noticias;


    if (
        filtroActual !==
        "todas"
    ) {

        filtradas =
            noticias.filter(
                noticia =>
                    normalizarTipo(
                        noticia.tipo
                    ) ===
                    filtroActual
            );

    }


    renderizarNoticias(
        filtradas
    );

}


function renderizarDestacada() {

    const destacada =
        noticias.find(
            noticia =>
                noticia.destacada === true
        ) ||
        noticias[0] ||
        null;


    if (!destacada) {

        seccionDestacada.hidden =
            true;

        return;

    }


    seccionDestacada.hidden =
        false;


    const tipo =
        normalizarTipo(
            destacada.tipo
        );


    destacadaTipo.textContent =
        obtenerNombreTipo(
            tipo
        );


    destacadaTipo.className =
        `tipo-noticia ${tipo}`;


    destacadaFecha.textContent =
        formatearFecha(
            obtenerFechaNoticia(
                destacada
            )
        );


    destacadaTitulo.textContent =
        destacada.titulo ||
        "Publicación oficial";


    destacadaResumen.textContent =
        destacada.resumen ||
        destacada.descripcion ||
        destacada.contenido ||
        "";


    destacadaImagen.innerHTML =
        obtenerImagenNoticia(
            destacada,
            true
        );


    configurarEnlace(
        destacadaEnlace,
        destacada
    );

}


function renderizarNoticias(
    lista
) {

    estadoCargaNoticias.hidden =
        true;


    listaNoticias.innerHTML =
        "";


    if (!lista.length) {

        listaNoticias.hidden =
            true;

        estadoSinNoticias.hidden =
            false;

        return;

    }


    estadoSinNoticias.hidden =
        true;

    listaNoticias.hidden =
        false;


    lista.forEach(
        noticia => {

            const tipo =
                normalizarTipo(
                    noticia.tipo
                );


            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "noticia-card";


            tarjeta.dataset.tipo =
                tipo;


            const enlace =
                obtenerURLNoticia(
                    noticia
                );


            tarjeta.innerHTML = `

                <div class="noticia-imagen">

                    ${obtenerImagenNoticia(
                        noticia,
                        false
                    )}

                    <span class="badge-oficial pequeno">
                        OFICIAL
                    </span>

                </div>


                <div class="noticia-contenido">

                    <div class="noticia-meta">

                        <span class="tipo-noticia ${tipo}">
                            ${escaparHTML(
                                obtenerNombreTipo(
                                    tipo
                                )
                            )}
                        </span>

                        <span>
                            ${escaparHTML(
                                formatearFecha(
                                    obtenerFechaNoticia(
                                        noticia
                                    )
                                )
                            )}
                        </span>

                    </div>


                    <h3>
                        ${escaparHTML(
                            noticia.titulo ||
                            "Publicación oficial"
                        )}
                    </h3>


                    <p>
                        ${escaparHTML(
                            noticia.resumen ||
                            noticia.descripcion ||
                            noticia.contenido ||
                            ""
                        )}
                    </p>


                    ${
                        enlace
                            ? `
                                <a
                                    href="${escaparAtributo(
                                        enlace
                                    )}"
                                    class="btn-noticia"
                                >
                                    ${escaparHTML(
                                        obtenerTextoBoton(
                                            noticia
                                        )
                                    )}
                                </a>
                            `
                            : ""
                    }

                </div>

            `;


            listaNoticias.appendChild(
                tarjeta
            );

        }
    );

}


function obtenerImagenNoticia(
    noticia,
    principal = false
) {

    const imagen =
        noticia.imagenUrl ||
        noticia.imagen ||
        "";


    if (imagen) {

        return `
            <img
                src="${escaparAtributo(
                    imagen
                )}"
                alt="${escaparAtributo(
                    noticia.titulo ||
                    "Noticia"
                )}"
                loading="${
                    principal
                        ? "eager"
                        : "lazy"
                }"
            >

            <span class="badge-oficial ${
                principal
                    ? ""
                    : "pequeno"
            }">
                ${
                    principal
                        ? "🛡️ OFICIAL"
                        : "OFICIAL"
                }
            </span>
        `;

    }


    const tipo =
        normalizarTipo(
            noticia.tipo
        );


    const icono =
        obtenerIconoTipo(
            tipo
        );


    const claseExtra =
        tipo === "sancion"
            ? " sancion-img"
            : "";


    return `
        <div class="imagen-placeholder${claseExtra}">
            ${icono}
        </div>

        ${
            principal
                ? `
                    <span class="badge-oficial">
                        🛡️ OFICIAL
                    </span>
                `
                : ""
        }
    `;

}


function configurarEnlace(
    elemento,
    noticia
) {

    const url =
        obtenerURLNoticia(
            noticia
        );


    if (!url) {

        elemento.hidden =
            true;

        elemento.removeAttribute(
            "href"
        );

        return;

    }


    elemento.hidden =
        false;

    elemento.href =
        url;

    elemento.textContent =
        obtenerTextoBoton(
            noticia
        );

}


function obtenerURLNoticia(
    noticia
) {

    if (
        noticia.enlace
    ) {

        return noticia.enlace;

    }


    if (
        noticia.url
    ) {

        return noticia.url;

    }


    if (
        noticia.partidoId
    ) {

        return `partido.html?id=${encodeURIComponent(
            noticia.partidoId
        )}`;

    }


    if (
        noticia.equipoId
    ) {

        return `equipo.html?id=${encodeURIComponent(
            noticia.equipoId
        )}`;

    }


    if (
        noticia.jugadorId
    ) {

        return `jugador.html?id=${encodeURIComponent(
            noticia.jugadorId
        )}`;

    }


    return "";

}


function obtenerTextoBoton(
    noticia
) {

    if (
        noticia.textoBoton
    ) {

        return noticia.textoBoton;

    }


    if (
        noticia.partidoId
    ) {

        return "Ver partido";

    }


    if (
        noticia.equipoId
    ) {

        return "Ver equipo";

    }


    if (
        noticia.jugadorId
    ) {

        return "Ver jugador";

    }


    return "Ver publicación";

}


function normalizarTipo(
    tipo
) {

    const valor =
        String(
            tipo || ""
        )
            .trim()
            .toLowerCase();


    if (
        valor === "sancion" ||
        valor === "sanción"
    ) {

        return "sancion";

    }


    if (
        valor === "partido" ||
        valor === "resultado"
    ) {

        return "partido";

    }


    if (
        valor === "comunicado" ||
        valor === "aviso"
    ) {

        return "comunicado";

    }


    return "general";

}


function obtenerNombreTipo(
    tipo
) {

    switch (tipo) {

        case "comunicado":
            return "Comunicado";

        case "sancion":
            return "Sanción";

        case "partido":
            return "Partido";

        default:
            return "General";

    }

}


function obtenerIconoTipo(
    tipo
) {

    switch (tipo) {

        case "comunicado":
            return "📢";

        case "sancion":
            return "🟥";

        case "partido":
            return "⚽";

        default:
            return "📰";

    }

}


function obtenerFechaNoticia(
    noticia
) {

    const posiblesValores = [
        noticia.publicadoEn,
        noticia.creadoEn,
        noticia.fecha,
        noticia.actualizadoEn
    ];


    for (
        const valor of posiblesValores
    ) {

        const fecha =
            convertirFecha(
                valor
            );


        if (fecha) {

            return fecha;

        }

    }


    return null;

}


function convertirFecha(
    valor
) {

    if (!valor) {

        return null;

    }


    if (
        typeof valor.toDate ===
        "function"
    ) {

        return valor.toDate();

    }


    if (
        valor instanceof Date
    ) {

        return valor;

    }


    if (
        typeof valor ===
        "string"
    ) {

        const coincidencia =
            valor.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (coincidencia) {

            return new Date(
                Number(
                    coincidencia[1]
                ),
                Number(
                    coincidencia[2]
                ) - 1,
                Number(
                    coincidencia[3]
                )
            );

        }

    }


    const fecha =
        new Date(
            valor
        );


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return null;

    }


    return fecha;

}


function formatearFecha(
    fecha
) {

    if (!fecha) {

        return "Sin fecha";

    }


    const hoy =
        new Date();


    const ayer =
        new Date(
            hoy
        );


    ayer.setDate(
        hoy.getDate() - 1
    );


    if (
        mismaFecha(
            fecha,
            hoy
        )
    ) {

        return "Hoy";

    }


    if (
        mismaFecha(
            fecha,
            ayer
        )
    ) {

        return "Ayer";

    }


    return fecha.toLocaleDateString(
        "es-MX",
        {
            day:
                "numeric",

            month:
                "short",

            year:
                fecha.getFullYear() !==
                hoy.getFullYear()
                    ? "numeric"
                    : undefined
        }
    );

}


function mismaFecha(
    fechaA,
    fechaB
) {

    return (
        fechaA.getFullYear() ===
            fechaB.getFullYear() &&
        fechaA.getMonth() ===
            fechaB.getMonth() &&
        fechaA.getDate() ===
            fechaB.getDate()
    );

}


function mostrarCarga() {

    estadoCargaNoticias.hidden =
        false;

    listaNoticias.hidden =
        true;

    estadoSinNoticias.hidden =
        true;

    seccionDestacada.hidden =
        true;

}


function mostrarError() {

    estadoCargaNoticias.hidden =
        true;

    listaNoticias.hidden =
        true;

    estadoSinNoticias.hidden =
        false;

    seccionDestacada.hidden =
        true;


    const titulo =
        estadoSinNoticias.querySelector(
            "strong"
        );


    const texto =
        estadoSinNoticias.querySelector(
            "p"
        );


    if (titulo) {

        titulo.textContent =
            "No pudimos cargar las noticias";

    }


    if (texto) {

        texto.textContent =
            "Verifica tu conexión o los permisos de Firestore.";

    }

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