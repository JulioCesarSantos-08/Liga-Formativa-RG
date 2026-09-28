import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";


const estadoCarga =
    document.getElementById("estadoCarga");

const estadoValido =
    document.getElementById("estadoValido");

const estadoNoEncontrado =
    document.getElementById("estadoNoEncontrado");

const estadoError =
    document.getElementById("estadoError");

const estadoEnlaceInvalido =
    document.getElementById("estadoEnlaceInvalido");

const btnReintentar =
    document.getElementById("btnReintentar");

const jugadorFoto =
    document.getElementById("jugadorFoto");

const jugadorInicial =
    document.getElementById("jugadorInicial");

const jugadorNombre =
    document.getElementById("jugadorNombre");

const jugadorFolio =
    document.getElementById("jugadorFolio");

const jugadorEquipo =
    document.getElementById("jugadorEquipo");

const jugadorCategoria =
    document.getElementById("jugadorCategoria");

const jugadorNumero =
    document.getElementById("jugadorNumero");

const jugadorTemporada =
    document.getElementById("jugadorTemporada");

const estadoJugador =
    document.getElementById("estadoJugador");

const estadoJugadorTexto =
    document.getElementById("estadoJugadorTexto");


let tokenVerificacion = "";

let credencialActual = null;


iniciar();


function iniciar() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    tokenVerificacion =
        String(
            parametros.get("v") ||
            ""
        ).trim();


    if (
        !tokenVerificacion ||
        !tokenValido(
            tokenVerificacion
        )
    ) {

        mostrarEstado(
            "enlaceInvalido"
        );

        return;

    }


    verificarCredencial();

}


async function verificarCredencial() {

    mostrarEstado(
        "carga"
    );


    credencialActual =
        null;


    try {

        const referencia =
            doc(
                db,
                "credencialesPublicas",
                tokenVerificacion
            );


        const snapshot =
            await getDoc(
                referencia
            );


        if (!snapshot.exists()) {

            mostrarEstado(
                "noEncontrado"
            );

            return;

        }


        credencialActual = {
            id: snapshot.id,
            ...snapshot.data()
        };


        if (
            !credencialTieneDatosValidos(
                credencialActual
            )
        ) {

            mostrarEstado(
                "noEncontrado"
            );

            return;

        }


        cargarDatosCredencial();


        mostrarEstado(
            "valido"
        );

    } catch (error) {

        console.error(
            "Error verificando credencial:",
            error
        );


        mostrarEstado(
            "error"
        );

    }

}


function tokenValido(
    token
) {

    return /^[a-f0-9]{48}$/i.test(
        token
    );

}


function credencialTieneDatosValidos(
    credencial
) {

    if (
        !credencial ||
        typeof credencial !== "object"
    ) {

        return false;

    }


    const nombre =
        String(
            credencial.nombre ||
            ""
        ).trim();


    const equipo =
        String(
            credencial.equipoNombre ||
            ""
        ).trim();


    if (
        !nombre ||
        !equipo
    ) {

        return false;

    }


    return true;

}


function cargarDatosCredencial() {

    const nombre =
        obtenerTextoSeguro(
            credencialActual.nombre,
            "Jugador registrado"
        );


    const folio =
        obtenerTextoSeguro(
            credencialActual.folio,
            "Sin folio"
        );


    const equipo =
        obtenerTextoSeguro(
            credencialActual.equipoNombre,
            "Equipo registrado"
        );


    const categoria =
        obtenerTextoSeguro(
            credencialActual.categoriaNombre,
            "Categoría registrada"
        );


    const numero =
        obtenerNumeroJugador();


    const temporada =
        obtenerTextoSeguro(
            credencialActual.temporada,
            "Temporada actual"
        );


    jugadorNombre.textContent =
        nombre;


    jugadorFolio.textContent =
        folio;


    jugadorEquipo.textContent =
        equipo;


    jugadorCategoria.textContent =
        categoria;


    jugadorNumero.textContent =
        numero;


    jugadorTemporada.textContent =
        temporada;


    cargarFotoJugador(
        nombre
    );


    cargarEstadoCredencial();

}


function cargarFotoJugador(
    nombre
) {

    const foto =
        String(
            credencialActual.fotoUrl ||
            ""
        ).trim();


    jugadorFoto.classList.add(
        "oculto"
    );


    jugadorInicial.classList.remove(
        "oculto"
    );


    jugadorInicial.textContent =
        obtenerInicial(
            nombre
        );


    jugadorFoto.removeAttribute(
        "src"
    );


    jugadorFoto.alt =
        `Fotografía de ${nombre}`;


    if (!foto) {

        return;

    }


    jugadorFoto.onload =
        () => {

            jugadorFoto.classList.remove(
                "oculto"
            );


            jugadorInicial.classList.add(
                "oculto"
            );

        };


    jugadorFoto.onerror =
        () => {

            jugadorFoto.classList.add(
                "oculto"
            );


            jugadorInicial.classList.remove(
                "oculto"
            );


            jugadorFoto.removeAttribute(
                "src"
            );

        };


    jugadorFoto.src =
        foto;

}


function cargarEstadoCredencial() {

    const activa =
        credencialActual.activa !==
        false;


    const suspendido =
        credencialActual.suspendido ===
        true;


    const vigente =
        credencialActual.vigente !==
        false;


    estadoJugador.classList.remove(
        "estado-jugador-activo",
        "estado-jugador-inactivo"
    );


    if (!activa) {

        estadoJugador.classList.add(
            "estado-jugador-inactivo"
        );


        estadoJugadorTexto.textContent =
            "REGISTRO INACTIVO";


        return;

    }


    if (suspendido) {

        estadoJugador.classList.add(
            "estado-jugador-inactivo"
        );


        estadoJugadorTexto.textContent =
            "JUGADOR SUSPENDIDO";


        return;

    }


    if (!vigente) {

        estadoJugador.classList.add(
            "estado-jugador-inactivo"
        );


        estadoJugadorTexto.textContent =
            "CREDENCIAL NO VIGENTE";


        return;

    }


    estadoJugador.classList.add(
        "estado-jugador-activo"
    );


    estadoJugadorTexto.textContent =
        "CREDENCIAL VIGENTE";

}


function obtenerNumeroJugador() {

    const numero =
        credencialActual.numero;


    if (
        numero === undefined ||
        numero === null ||
        numero === ""
    ) {

        return "-";

    }


    return String(
        numero
    );

}


function obtenerTextoSeguro(
    valor,
    respaldo
) {

    const texto =
        String(
            valor ??
            ""
        ).trim();


    if (!texto) {

        return respaldo;

    }


    return texto;

}


function obtenerInicial(
    texto
) {

    const valor =
        String(
            texto ||
            ""
        ).trim();


    if (!valor) {

        return "J";

    }


    return valor
        .charAt(0)
        .toUpperCase();

}


function mostrarEstado(
    estado
) {

    estadoCarga.classList.add(
        "oculto"
    );


    estadoValido.classList.add(
        "oculto"
    );


    estadoNoEncontrado.classList.add(
        "oculto"
    );


    estadoError.classList.add(
        "oculto"
    );


    estadoEnlaceInvalido.classList.add(
        "oculto"
    );


    if (
        estado === "carga"
    ) {

        estadoCarga.classList.remove(
            "oculto"
        );

        return;

    }


    if (
        estado === "valido"
    ) {

        estadoValido.classList.remove(
            "oculto"
        );

        return;

    }


    if (
        estado === "noEncontrado"
    ) {

        estadoNoEncontrado.classList.remove(
            "oculto"
        );

        return;

    }


    if (
        estado === "error"
    ) {

        estadoError.classList.remove(
            "oculto"
        );

        return;

    }


    estadoEnlaceInvalido.classList.remove(
        "oculto"
    );

}


if (btnReintentar) {

    btnReintentar.addEventListener(
        "click",
        verificarCredencial
    );

}