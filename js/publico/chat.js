import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
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

const listaMensajes =
    document.getElementById(
        "listaMensajes"
    );

const formMensaje =
    document.getElementById(
        "formMensaje"
    );

const mensajeTexto =
    document.getElementById(
        "mensajeTexto"
    );

const contadorCaracteres =
    document.getElementById(
        "contadorCaracteres"
    );

const btnEnviar =
    document.getElementById(
        "btnEnviar"
    );

const estadoConexion =
    document.getElementById(
        "estadoConexion"
    );


let usuarioActual = null;

let primeraCarga = true;

let fechaAnteriorRender = "";


const usuario =
    await protegerPaginaPublica();


if (usuario) {

    usuarioActual =
        usuario;

    cargarUsuario(
        usuario
    );

    activarEventos();

    actualizarContador();

    actualizarEstadoBoton();

    escucharMensajes();

}


function cargarUsuario(
    usuario
) {

    const nombre =
        obtenerNombreUsuario(
            usuario
        );


    perfilInicial.textContent =
        obtenerInicial(
            nombre
        );

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
        async event => {

            event.preventDefault();

            await enviarMensaje();

        }
    );


    mensajeTexto.addEventListener(
        "keydown",
        async event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (
                    !btnEnviar.disabled
                ) {

                    await enviarMensaje();

                }

            }

        }
    );

}


function escucharMensajes() {

    estadoConexion.textContent =
        "Conectando...";


    const referencia =
        query(
            collection(
                db,
                "chatMensajes"
            ),
            orderBy(
                "creadoEn",
                "desc"
            ),
            limit(
                100
            )
        );


    onSnapshot(
        referencia,
        snapshot => {

            const mensajes =
                snapshot.docs
                    .map(
                        documento => ({
                            id:
                                documento.id,

                            ...documento.data()
                        })
                    )
                    .reverse();


            renderizarMensajes(
                mensajes
            );


            estadoConexion.textContent =
                "En línea";


            if (
                primeraCarga
            ) {

                primeraCarga =
                    false;

                irAlUltimoMensaje(
                    false
                );

            } else {

                irAlUltimoMensaje(
                    true
                );

            }

        },
        error => {

            console.error(
                "Error escuchando chat:",
                error
            );


            estadoConexion.textContent =
                "Sin conexión";


            listaMensajes.innerHTML = `
                <div
                    style="
                        min-height:320px;
                        display:flex;
                        flex-direction:column;
                        align-items:center;
                        justify-content:center;
                        gap:8px;
                        padding:20px;
                        text-align:center;
                        color:#68746e;
                    "
                >
                    <span
                        style="
                            font-size:1.8rem;
                        "
                    >
                        ⚠️
                    </span>

                    <strong>
                        No pudimos cargar el chat
                    </strong>

                    <span
                        style="
                            max-width:330px;
                            font-size:.7rem;
                            line-height:1.4;
                        "
                    >
                        Verifica tu conexión o los permisos de Firestore.
                    </span>
                </div>
            `;

        }
    );

}


async function enviarMensaje() {

    if (
        !usuarioActual
    ) {

        return;

    }


    const texto =
        mensajeTexto.value
            .trim()
            .replace(
                /\s+/g,
                " "
            );


    if (!texto) {

        return;

    }


    if (
        texto.length > 400
    ) {

        return;

    }


    btnEnviar.disabled =
        true;


    const textoBotonAnterior =
        btnEnviar.textContent;


    btnEnviar.textContent =
        "…";


    try {

        await addDoc(
            collection(
                db,
                "chatMensajes"
            ),
            {
                usuarioId:
                    usuarioActual.uid ||
                    usuarioActual.id ||
                    null,

                nombre:
                    obtenerNombreUsuario(
                        usuarioActual
                    ),

                rol:
                    usuarioActual.rol ||
                    "publico",

                texto,

                creadoEn:
                    serverTimestamp()
            }
        );


        mensajeTexto.value =
            "";


        mensajeTexto.style.height =
            "48px";


        actualizarContador();

        actualizarEstadoBoton();

        mensajeTexto.focus();

    } catch (error) {

        console.error(
            "Error enviando mensaje:",
            error
        );


        alert(
            "No se pudo enviar el mensaje. Intenta nuevamente."
        );

    } finally {

        btnEnviar.textContent =
            textoBotonAnterior ||
            "➤";


        actualizarEstadoBoton();

    }

}


function renderizarMensajes(
    mensajes
) {

    listaMensajes.innerHTML =
        "";


    fechaAnteriorRender =
        "";


    if (!mensajes.length) {

        listaMensajes.innerHTML = `
            <div
                style="
                    min-height:320px;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    gap:8px;
                    padding:20px;
                    text-align:center;
                    color:#68746e;
                "
            >

                <span
                    style="
                        font-size:2rem;
                    "
                >
                    💬
                </span>

                <strong>
                    Todavía no hay mensajes
                </strong>

                <span
                    style="
                        max-width:320px;
                        font-size:.7rem;
                        line-height:1.4;
                    "
                >
                    Sé el primero en escribir en la comunidad.
                </span>

            </div>
        `;

        return;

    }


    mensajes.forEach(
        mensaje => {

            agregarSeparadorFecha(
                mensaje
            );


            renderizarMensaje(
                mensaje
            );

        }
    );

}


function agregarSeparadorFecha(
    mensaje
) {

    const fecha =
        obtenerFechaMensaje(
            mensaje
        );


    const claveFecha =
        obtenerClaveFecha(
            fecha
        );


    if (
        claveFecha ===
        fechaAnteriorRender
    ) {

        return;

    }


    fechaAnteriorRender =
        claveFecha;


    const separador =
        document.createElement(
            "div"
        );


    separador.className =
        "separador-fecha";


    separador.innerHTML = `
        <span>
            ${escaparHTML(
                formatearEtiquetaFecha(
                    fecha
                )
            )}
        </span>
    `;


    listaMensajes.appendChild(
        separador
    );

}


function renderizarMensaje(
    mensaje
) {

    const esPropio =
        esMensajePropio(
            mensaje
        );


    const nombre =
        mensaje.nombre ||
        "Usuario";


    const articulo =
        document.createElement(
            "article"
        );


    articulo.className =
        esPropio
            ? "mensaje mensaje-propio"
            : "mensaje mensaje-otro";


    const avatar = `
        <div class="avatar ${
            esPropio
                ? "propio"
                : ""
        }">
            ${escaparHTML(
                obtenerInicial(
                    nombre
                )
            )}
        </div>
    `;


    const contenido = `
        <div class="mensaje-contenido">

            <div class="mensaje-meta">

                <strong>
                    ${
                        esPropio
                            ? "Tú"
                            : escaparHTML(
                                nombre
                            )
                    }
                </strong>

                <span>
                    ${escaparHTML(
                        formatearHoraMensaje(
                            mensaje
                        )
                    )}
                </span>

            </div>


            <div class="burbuja">
                ${escaparHTML(
                    mensaje.texto ||
                    ""
                )}
            </div>

        </div>
    `;


    if (esPropio) {

        articulo.innerHTML = `
            ${contenido}
            ${avatar}
        `;

    } else {

        articulo.innerHTML = `
            ${avatar}
            ${contenido}
        `;

    }


    listaMensajes.appendChild(
        articulo
    );

}


function esMensajePropio(
    mensaje
) {

    const usuarioIdActual =
        usuarioActual?.uid ||
        usuarioActual?.id ||
        "";


    return (
        mensaje.usuarioId ===
        usuarioIdActual
    );

}


function obtenerFechaMensaje(
    mensaje
) {

    const valor =
        mensaje.creadoEn;


    if (
        valor &&
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


    if (valor) {

        const fecha =
            new Date(
                valor
            );


        if (
            !Number.isNaN(
                fecha.getTime()
            )
        ) {

            return fecha;

        }

    }


    return new Date();

}


function formatearHoraMensaje(
    mensaje
) {

    const fecha =
        obtenerFechaMensaje(
            mensaje
        );


    return fecha.toLocaleTimeString(
        "es-MX",
        {
            hour:
                "numeric",

            minute:
                "2-digit",

            hour12:
                true
        }
    );

}


function formatearEtiquetaFecha(
    fecha
) {

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


function obtenerClaveFecha(
    fecha
) {

    return [
        fecha.getFullYear(),
        String(
            fecha.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),
        String(
            fecha.getDate()
        ).padStart(
            2,
            "0"
        )
    ].join(
        "-"
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


function obtenerNombreUsuario(
    usuario
) {

    return (
        usuario.nombre?.trim() ||
        usuario.firebaseUser
            ?.displayName
            ?.trim() ||
        "Usuario"
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


    if (
        total >= 380
    ) {

        contadorCaracteres.style.color =
            "#b84535";

        return;

    }


    if (
        total >= 330
    ) {

        contadorCaracteres.style.color =
            "#85391f";

        return;

    }


    contadorCaracteres.style.color =
        "#81775e";

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


function irAlUltimoMensaje(
    suave = true
) {

    requestAnimationFrame(
        () => {

            listaMensajes.scrollTo({
                top:
                    listaMensajes.scrollHeight,

                behavior:
                    suave
                        ? "smooth"
                        : "auto"
            });

        }
    );

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