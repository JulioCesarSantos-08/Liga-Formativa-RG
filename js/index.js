import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


const CLAVE_INTRO =
    "ligaRioGrande_intro_v1";


const introApp =
    document.getElementById(
        "introApp"
    );

const balonIntro =
    document.getElementById(
        "balonIntro"
    );

const ondaImpacto =
    document.getElementById(
        "ondaImpacto"
    );

const introEmblema =
    document.querySelector(
        ".intro-emblema"
    );

const introSuperior =
    document.querySelector(
        ".intro-superior"
    );

const tituloRio =
    document.querySelector(
        ".titulo-rio"
    );

const tituloGrande =
    document.querySelector(
        ".titulo-grande"
    );

const tituloLinea =
    document.querySelector(
        ".titulo-linea"
    );

const introUbicacion =
    document.querySelector(
        ".intro-ubicacion"
    );

const introMensaje =
    document.querySelector(
        ".intro-mensaje"
    );

const marcadorIntro =
    document.querySelector(
        ".marcador-intro"
    );

const introCarga =
    document.querySelector(
        ".intro-carga"
    );

const barraCarga =
    document.getElementById(
        "barraCarga"
    );

const textoCarga =
    document.getElementById(
        "textoCarga"
    );

const introFinal =
    document.getElementById(
        "introFinal"
    );

const pantallaSalida =
    document.getElementById(
        "pantallaSalida"
    );


registrarServiceWorker();

iniciarAplicacion();


async function iniciarAplicacion() {

    const introVista =
        obtenerIntroVista();


    if (introVista) {

        await resolverEntradaRapida();

        return;

    }


    await reproducirIntroCompleta();

}


function obtenerIntroVista() {

    try {

        return (
            localStorage.getItem(
                CLAVE_INTRO
            ) === "true"
        );

    } catch (error) {

        return false;

    }

}


async function reproducirIntroCompleta() {

    await esperar(
        500
    );


    if (balonIntro) {

        balonIntro.classList.add(
            "activo"
        );

    }


    await esperar(
        860
    );


    if (ondaImpacto) {

        ondaImpacto.classList.add(
            "activa"
        );

    }


    await esperar(
        220
    );


    if (introEmblema) {

        introEmblema.classList.add(
            "activo"
        );

    }


    await esperar(
        610
    );


    if (introSuperior) {

        introSuperior.classList.add(
            "activo"
        );

    }


    await esperar(
        230
    );


    if (tituloRio) {

        tituloRio.classList.add(
            "activo"
        );

    }


    await esperar(
        120
    );


    if (tituloGrande) {

        tituloGrande.classList.add(
            "activo"
        );

    }


    await esperar(
        310
    );


    if (tituloLinea) {

        tituloLinea.classList.add(
            "activo"
        );

    }


    await esperar(
        170
    );


    if (introUbicacion) {

        introUbicacion.classList.add(
            "activo"
        );

    }


    await esperar(
        320
    );


    if (introMensaje) {

        introMensaje.classList.add(
            "activo"
        );

    }


    await esperar(
        330
    );


    if (marcadorIntro) {

        marcadorIntro.classList.add(
            "activo"
        );

    }


    await esperar(
        300
    );


    if (introCarga) {

        introCarga.classList.add(
            "activo"
        );

    }


    await esperar(
        420
    );


    await actualizarCarga(
        14,
        "Preparando la cancha..."
    );


    await esperar(
        480
    );


    await actualizarCarga(
        29,
        "Encendiendo los reflectores..."
    );


    await esperar(
        510
    );


    await actualizarCarga(
        46,
        "Reuniendo a los equipos..."
    );


    await esperar(
        520
    );


    await actualizarCarga(
        63,
        "Preparando la jornada..."
    );


    await esperar(
        500
    );


    await actualizarCarga(
        79,
        "Revisando resultados y tablas..."
    );


    await esperar(
        480
    );


    await actualizarCarga(
        92,
        "Todo está listo..."
    );


    await esperar(
        430
    );


    await actualizarCarga(
        100,
        "Bienvenido a Río Grande"
    );


    await esperar(
        620
    );


    if (introApp) {

        introApp.classList.add(
            "saliendo"
        );

    }


    await esperar(
        570
    );


    if (introFinal) {

        introFinal.classList.add(
            "activa"
        );

        introFinal.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    await esperar(
        1900
    );


    guardarIntroVista();


    if (pantallaSalida) {

        pantallaSalida.classList.add(
            "activa"
        );

    }


    document.body.classList.add(
        "intro-finalizada"
    );


    await esperar(
        720
    );


    await redirigirDespuesDeIntro();

}


async function actualizarCarga(
    porcentaje,
    mensaje
) {

    if (barraCarga) {

        barraCarga.style.width =
            `${porcentaje}%`;

    }


    if (!textoCarga) {

        return;

    }


    textoCarga.classList.add(
        "cambiando"
    );


    await esperar(
        150
    );


    textoCarga.textContent =
        mensaje;


    textoCarga.classList.remove(
        "cambiando"
    );

}


function guardarIntroVista() {

    try {

        localStorage.setItem(
            CLAVE_INTRO,
            "true"
        );

    } catch (error) {

        console.warn(
            "No se pudo guardar el estado de la intro:",
            error
        );

    }

}


async function redirigirDespuesDeIntro() {

    const usuarioFirebase =
        await obtenerEstadoSesion();


    if (!usuarioFirebase) {

        window.location.replace(
            "login.html"
        );

        return;

    }


    await redirigirUsuarioPorRol(
        usuarioFirebase
    );

}


async function resolverEntradaRapida() {

    const usuarioFirebase =
        await obtenerEstadoSesion();


    if (!usuarioFirebase) {

        window.location.replace(
            "login.html"
        );

        return;

    }


    await redirigirUsuarioPorRol(
        usuarioFirebase
    );

}


async function redirigirUsuarioPorRol(
    usuarioFirebase
) {

    try {

        const referenciaUsuario =
            doc(
                db,
                "usuarios",
                usuarioFirebase.uid
            );


        const snapshotUsuario =
            await getDoc(
                referenciaUsuario
            );


        if (!snapshotUsuario.exists()) {

            window.location.replace(
                "publico.html"
            );

            return;

        }


        const datosUsuario =
            snapshotUsuario.data();


        const rol =
            String(
                datosUsuario.rol ||
                "publico"
            )
                .trim()
                .toLowerCase();


        const activo =
            datosUsuario.activo !==
            false;


        if (!activo) {

            window.location.replace(
                "login.html"
            );

            return;

        }


        if (
            rol === "admin"
        ) {

            window.location.replace(
                "admin.html"
            );

            return;

        }


        if (
            rol === "arbitro"
        ) {

            window.location.replace(
                "arbitro.html"
            );

            return;

        }


        if (
            rol === "jefeequipo"
        ) {

            window.location.replace(
                "jefeEquipo.html"
            );

            return;

        }


        window.location.replace(
            "publico.html"
        );

    } catch (error) {

        console.error(
            "Error obteniendo el rol del usuario:",
            error
        );


        window.location.replace(
            "publico.html"
        );

    }

}


function obtenerEstadoSesion() {

    return new Promise(
        resolve => {

            let terminado =
                false;


            let cancelarObservador =
                () => {};


            const finalizar =
                usuarioFirebase => {

                    if (terminado) {

                        return;

                    }


                    terminado =
                        true;


                    clearTimeout(
                        temporizador
                    );


                    cancelarObservador();


                    resolve(
                        usuarioFirebase ||
                        null
                    );

                };


            const temporizador =
                setTimeout(
                    () => {

                        finalizar(
                            null
                        );

                    },
                    4000
                );


            cancelarObservador =
                onAuthStateChanged(
                    auth,
                    usuarioFirebase => {

                        finalizar(
                            usuarioFirebase
                        );

                    },
                    error => {

                        console.error(
                            "Error comprobando la sesión:",
                            error
                        );


                        finalizar(
                            null
                        );

                    }
                );

        }
    );

}


function esperar(
    tiempo
) {

    return new Promise(
        resolve => {

            setTimeout(
                resolve,
                tiempo
            );

        }
    );

}


function registrarServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {

        return;

    }


    window.addEventListener(
        "load",
        async () => {

            try {

                const registro =
                    await navigator.serviceWorker.register(
                        "./service-worker.js",
                        {
                            updateViaCache:
                                "none"
                        }
                    );


                await registro
                    .update()
                    .catch(
                        () => {}
                    );

            } catch (error) {

                console.error(
                    "Error registrando Service Worker:",
                    error
                );

            }

        }
    );

}
