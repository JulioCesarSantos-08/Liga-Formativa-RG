import {
    protegerPagina,
    cerrarSesion
} from "../roles.js";


const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const btnAbrirSidebar = document.getElementById("btnAbrirSidebar");
const btnCerrarSidebar = document.getElementById("btnCerrarSidebar");

const btnCerrarSesionSidebar = document.getElementById("btnCerrarSesionSidebar");

const btnPerfilAdmin = document.getElementById("btnPerfilAdmin");

const adminInicial = document.getElementById("adminInicial");
const adminInicialSidebar = document.getElementById("adminInicialSidebar");

const adminNombreSidebar = document.getElementById("adminNombreSidebar");
const saludoAdmin = document.getElementById("saludoAdmin");

const botonesModulo = document.querySelectorAll("[data-modulo]");
const botonesAccion = document.querySelectorAll("[data-accion]");


const usuario = await protegerPagina([
    "admin"
]);


if (usuario) {

    cargarAdministrador(usuario);
    activarEventos();

}


function cargarAdministrador(usuario) {

    const nombre =
        usuario.nombre?.trim() ||
        "Administrador";


    const inicial =
        obtenerInicial(nombre);


    adminInicial.textContent =
        inicial;


    adminInicialSidebar.textContent =
        inicial;


    adminNombreSidebar.textContent =
        nombre;


    saludoAdmin.textContent =
        `Bienvenido, ${obtenerPrimerNombre(nombre)}`;

}


function activarEventos() {

    btnAbrirSidebar.addEventListener(
        "click",
        abrirSidebar
    );


    btnCerrarSidebar.addEventListener(
        "click",
        cerrarSidebar
    );


    sidebarOverlay.addEventListener(
        "click",
        cerrarSidebar
    );


    btnCerrarSesionSidebar.addEventListener(
        "click",
        async () => {

            btnCerrarSesionSidebar.disabled =
                true;


            btnCerrarSesionSidebar.textContent =
                "Cerrando sesión...";


            await cerrarSesion();

        }
    );


    btnPerfilAdmin.addEventListener(
        "click",
        () => {

            alert(
                "Más adelante aquí tendremos el perfil y configuración de la cuenta administrativa."
            );

        }
    );


    botonesModulo.forEach((boton) => {

        boton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();


                const modulo =
                    boton.dataset.modulo;


                navegarModulo(
                    modulo
                );

            }
        );

    });


    botonesAccion.forEach((boton) => {

        boton.addEventListener(
            "click",
            () => {

                const accion =
                    boton.dataset.accion;


                navegarModulo(
                    accion
                );

            }
        );

    });


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                sidebar.classList.contains("abierto")
            ) {

                cerrarSidebar();

            }

        }
    );


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth > 850
            ) {

                cerrarSidebar();

            }

        }
    );

}


function abrirSidebar() {

    sidebar.classList.add(
        "abierto"
    );


    sidebarOverlay.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarSidebar() {

    sidebar.classList.remove(
        "abierto"
    );


    sidebarOverlay.classList.add(
        "hidden"
    );


    document.body.style.overflow =
        "";

}


function navegarModulo(modulo) {

    const rutas = {

        categorias:
            "adminCategorias.html",

        crearCategoria:
            "adminCategorias.html?accion=nueva",

        equipos:
            "adminEquipos.html",

        crearEquipo:
            "adminEquipos.html?accion=nuevo",

        jornadas:
            "adminJornadas.html",

        partidos:
            "adminPartidos.html",

        crearPartido:
            "adminPartidos.html?accion=nuevo",

        temporadas:
            "adminTemporadas.html",

        usuarios:
            "adminUsuarios.html",

        jugadores:
            "adminJugadores.html",

        arbitros:
            "adminArbitros.html",

        jefesEquipo:
            "adminJefesEquipo.html",

        solicitudesEquipo:
            "adminJefesEquipo.html?seccion=solicitudes",

        cedulas:
            "adminCedulas.html",

        disciplina:
            "adminDisciplina.html",

        noticias:
            "adminNoticias.html",

        chat:
            "adminComunidad.html",

        auditoria:
            "adminAuditoria.html",

        configuracion:
            "adminConfiguracion.html"

    };


    const ruta =
        rutas[modulo];


    if (!ruta) {

        console.warn(
            `Módulo no encontrado: ${modulo}`
        );

        return;

    }


    window.location.href =
        ruta;

}


function obtenerInicial(nombre) {

    if (!nombre) {
        return "A";
    }


    return nombre
        .trim()
        .charAt(0)
        .toUpperCase();

}


function obtenerPrimerNombre(nombre) {

    if (!nombre) {
        return "Administrador";
    }


    return nombre
        .trim()
        .split(/\s+/)[0];

}