import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";


const estadoCarga =
    document.getElementById("estadoCarga");

const estadoError =
    document.getElementById("estadoError");

const estadoErrorTexto =
    document.getElementById("estadoErrorTexto");

const contenidoPartidos =
    document.getElementById("contenidoPartidos");

const btnVolver =
    document.getElementById("btnVolver");

const equipoLogo =
    document.getElementById("equipoLogo");

const equipoNombre =
    document.getElementById("equipoNombre");

const equipoCategoria =
    document.getElementById("equipoCategoria");

const equipoPJ =
    document.getElementById("equipoPJ");

const equipoPG =
    document.getElementById("equipoPG");

const equipoPE =
    document.getElementById("equipoPE");

const equipoPP =
    document.getElementById("equipoPP");

const equipoPTS =
    document.getElementById("equipoPTS");

const equipoDG =
    document.getElementById("equipoDG");

const totalPartidos =
    document.getElementById("totalPartidos");

const totalProximos =
    document.getElementById("totalProximos");

const totalFinalizados =
    document.getElementById("totalFinalizados");

const filtroPartidos =
    document.getElementById("filtroPartidos");

const sinPartidos =
    document.getElementById("sinPartidos");

const listaPartidos =
    document.getElementById("listaPartidos");

const modalPartido =
    document.getElementById("modalPartido");

const modalTitulo =
    document.getElementById("modalTitulo");

const modalLogoLocal =
    document.getElementById("modalLogoLocal");

const modalLogoVisitante =
    document.getElementById("modalLogoVisitante");

const modalLocal =
    document.getElementById("modalLocal");

const modalVisitante =
    document.getElementById("modalVisitante");

const modalJornada =
    document.getElementById("modalJornada");

const modalResultado =
    document.getElementById("modalResultado");

const modalEstado =
    document.getElementById("modalEstado");

const modalFecha =
    document.getElementById("modalFecha");

const modalHora =
    document.getElementById("modalHora");

const modalCampo =
    document.getElementById("modalCampo");

const modalArbitro =
    document.getElementById("modalArbitro");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const btnCerrarDetalle =
    document.getElementById("btnCerrarDetalle");


let usuarioActual = null;

let equipoActual = null;

let equipos = [];

let partidos = [];

let filtroActual = "todos";


const usuario =
    await protegerPagina([
        "jefeEquipo",
        "admin"
    ]);


if (usuario) {

    usuarioActual = usuario;

    activarEventos();

    await iniciar();

}


function activarEventos() {

    filtroPartidos.addEventListener(
        "change",
        () => {

            filtroActual =
                filtroPartidos.value;

            aplicarFiltro();

        }
    );


    btnCerrarModal.addEventListener(
        "click",
        cerrarModal
    );


    btnCerrarDetalle.addEventListener(
        "click",
        cerrarModal
    );


    modalPartido.addEventListener(
        "click",
        event => {

            if (
                event.target === modalPartido
            ) {

                cerrarModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !modalPartido.classList.contains("oculto")
            ) {

                cerrarModal();

            }

        }
    );

}


async function iniciar() {

    try {

        await cargarEquipos();

        resolverEquipoActual();


        if (!equipoActual) {

            mostrarError(
                "Tu cuenta todavía no tiene un equipo asignado."
            );

            return;

        }


        validarAcceso();


        configurarBotonVolver();

        cargarDatosEquipo();

        await cargarPartidos();


        actualizarResumenGeneral();

        calcularEstadisticasEquipo();

        aplicarFiltro();


        estadoCarga.classList.add(
            "oculto"
        );


        contenidoPartidos.classList.remove(
            "oculto"
        );

    } catch (error) {

        console.error(
            "Error cargando partidos del equipo:",
            error
        );


        mostrarError(
            error.message ||
            "No fue posible cargar los partidos."
        );

    }

}


async function cargarEquipos() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "equipos"
            )
        );


    equipos =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );

}


function resolverEquipoActual() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const equipoIdURL =
        parametros.get("equipo");


    if (
        usuarioActual.rol === "admin" &&
        equipoIdURL
    ) {

        equipoActual =
            equipos.find(
                equipo =>
                    equipo.id === equipoIdURL
            ) || null;

        return;

    }


    const usuarioId =
        usuarioActual.uid ||
        usuarioActual.id;


    equipoActual =
        equipos.find(
            equipo =>
                equipo.responsableId === usuarioId
        ) || null;

}


function validarAcceso() {

    if (
        usuarioActual.rol === "admin"
    ) {

        return;

    }


    const usuarioId =
        usuarioActual.uid ||
        usuarioActual.id;


    if (
        equipoActual.responsableId !== usuarioId
    ) {

        throw new Error(
            "No tienes permiso para consultar los partidos de este equipo."
        );

    }

}


function configurarBotonVolver() {

    if (
        usuarioActual.rol === "admin"
    ) {

        btnVolver.href =
            `jefeEquipo.html?equipo=${encodeURIComponent(
                equipoActual.id
            )}`;

        return;

    }


    btnVolver.href =
        "jefeEquipo.html";

}


function cargarDatosEquipo() {

    equipoNombre.textContent =
        equipoActual.nombre ||
        "Equipo";


    equipoCategoria.textContent =
        equipoActual.categoriaNombre ||
        "Sin categoría";


    cargarLogo(
        equipoLogo,
        equipoActual,
        equipoActual.nombre,
        "E"
    );

}


async function cargarPartidos() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "partidos"
            )
        );


    partidos =
        snapshot.docs
            .map(
                documento => ({
                    id: documento.id,
                    ...documento.data()
                })
            )
            .filter(
                partido =>
                    partido.localId === equipoActual.id ||
                    partido.visitanteId === equipoActual.id
            )
            .sort(
                ordenarPartidos
            );

}


function actualizarResumenGeneral() {

    totalPartidos.textContent =
        partidos.length;


    totalProximos.textContent =
        partidos.filter(
            partido =>
                partido.estado === "proximo"
        ).length;


    totalFinalizados.textContent =
        partidos.filter(
            partido =>
                partido.estado === "finalizado"
        ).length;

}


function calcularEstadisticasEquipo() {

    let pj = 0;
    let pg = 0;
    let pe = 0;
    let pp = 0;
    let gf = 0;
    let gc = 0;


    partidos
        .filter(
            partido =>
                partido.estado === "finalizado" &&
                partido.resultadoRegistrado === true
        )
        .forEach(
            partido => {

                const esLocal =
                    partido.localId === equipoActual.id;


                const golesFavor =
                    esLocal
                        ? numeroSeguro(
                            partido.golesLocal
                        )
                        : numeroSeguro(
                            partido.golesVisitante
                        );


                const golesContra =
                    esLocal
                        ? numeroSeguro(
                            partido.golesVisitante
                        )
                        : numeroSeguro(
                            partido.golesLocal
                        );


                pj++;

                gf += golesFavor;

                gc += golesContra;


                if (
                    golesFavor > golesContra
                ) {

                    pg++;

                } else if (
                    golesFavor === golesContra
                ) {

                    pe++;

                } else {

                    pp++;

                }

            }
        );


    const puntos =
        (pg * 3) +
        pe;


    const diferencia =
        gf - gc;


    equipoPJ.textContent =
        pj;


    equipoPG.textContent =
        pg;


    equipoPE.textContent =
        pe;


    equipoPP.textContent =
        pp;


    equipoPTS.textContent =
        puntos;


    equipoDG.textContent =
        diferencia > 0
            ? `+${diferencia}`
            : diferencia;

}


function aplicarFiltro() {

    let filtrados =
        [...partidos];


    if (
        filtroActual === "proximos"
    ) {

        filtrados =
            partidos.filter(
                partido =>
                    partido.estado === "proximo"
            );

    }


    if (
        filtroActual === "finalizados"
    ) {

        filtrados =
            partidos.filter(
                partido =>
                    partido.estado === "finalizado"
            );

    }


    if (
        filtroActual === "cancelados"
    ) {

        filtrados =
            partidos.filter(
                partido =>
                    partido.estado === "cancelado"
            );

    }


    renderizarPartidos(
        filtrados
    );

}


function renderizarPartidos(
    lista
) {

    listaPartidos.innerHTML =
        "";


    if (!lista.length) {

        sinPartidos.classList.remove(
            "oculto"
        );

        return;

    }


    sinPartidos.classList.add(
        "oculto"
    );


    lista.forEach(
        partido => {

            const equipoLocal =
                equipos.find(
                    equipo =>
                        equipo.id === partido.localId
                );


            const equipoVisitante =
                equipos.find(
                    equipo =>
                        equipo.id === partido.visitanteId
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "partido-card";


            const resultado =
                obtenerResultado(
                    partido
                );


            card.innerHTML = `

                <div class="partido-card-top">

                    <div class="partido-meta">

                        <span class="partido-badge">
                            ${escaparHTML(
                                partido.categoriaNombre ||
                                equipoActual.categoriaNombre ||
                                "Sin categoría"
                            )}
                        </span>

                        <span class="partido-badge jornada">
                            ${escaparHTML(
                                partido.jornadaNombre ||
                                "Sin jornada"
                            )}
                        </span>

                    </div>


                    <span class="partido-estado ${partido.estado || "proximo"}">
                        ${textoEstado(
                            partido.estado
                        )}
                    </span>

                </div>


                <div class="partido-enfrentamiento">

                    <div class="equipo-partido">

                        <div class="equipo-partido-logo">
                            ${obtenerLogoHTML(
                                equipoLocal,
                                partido.localNombre,
                                "L"
                            )}
                        </div>

                        <strong>
                            ${escaparHTML(
                                partido.localNombre ||
                                "Local"
                            )}
                        </strong>

                    </div>


                    <div class="partido-resultado">

                        <span>
                            ${
                                partido.estado === "finalizado"
                                    ? "FINAL"
                                    : "VS"
                            }
                        </span>

                        <strong>
                            ${resultado}
                        </strong>

                    </div>


                    <div class="equipo-partido visitante">

                        <div class="equipo-partido-logo">
                            ${obtenerLogoHTML(
                                equipoVisitante,
                                partido.visitanteNombre,
                                "V"
                            )}
                        </div>

                        <strong>
                            ${escaparHTML(
                                partido.visitanteNombre ||
                                "Visitante"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="partido-datos">

                    <div>

                        <span>
                            Fecha
                        </span>

                        <strong>
                            ${formatearFecha(
                                partido.fecha
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Hora
                        </span>

                        <strong>
                            ${formatearHora(
                                partido.hora
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Campo
                        </span>

                        <strong>
                            ${escaparHTML(
                                partido.campo ||
                                "Por definir"
                            )}
                        </strong>

                    </div>

                </div>


                <button
                    type="button"
                    class="btn-ver-partido"
                >
                    Ver detalle
                </button>

            `;


            card.querySelector(
                ".btn-ver-partido"
            ).addEventListener(
                "click",
                () => {

                    abrirDetalle(
                        partido.id
                    );

                }
            );


            listaPartidos.appendChild(
                card
            );

        }
    );

}


function abrirDetalle(
    partidoId
) {

    const partido =
        partidos.find(
            item =>
                item.id === partidoId
        );


    if (!partido) {
        return;
    }


    const local =
        equipos.find(
            equipo =>
                equipo.id === partido.localId
        );


    const visitante =
        equipos.find(
            equipo =>
                equipo.id === partido.visitanteId
        );


    modalTitulo.textContent =
        `${partido.localNombre || "Local"} vs ${partido.visitanteNombre || "Visitante"}`;


    modalLocal.textContent =
        partido.localNombre ||
        "Local";


    modalVisitante.textContent =
        partido.visitanteNombre ||
        "Visitante";


    modalJornada.textContent =
        partido.jornadaNombre ||
        "Sin jornada";


    modalResultado.textContent =
        obtenerResultado(
            partido
        );


    modalEstado.textContent =
        textoEstado(
            partido.estado
        );


    modalFecha.textContent =
        formatearFecha(
            partido.fecha
        );


    modalHora.textContent =
        formatearHora(
            partido.hora
        );


    modalCampo.textContent =
        partido.campo ||
        "Sin definir";


    modalArbitro.textContent =
        partido.arbitroNombre ||
        "Sin asignar";


    cargarLogo(
        modalLogoLocal,
        local,
        partido.localNombre,
        "L"
    );


    cargarLogo(
        modalLogoVisitante,
        visitante,
        partido.visitanteNombre,
        "V"
    );


    modalPartido.classList.remove(
        "oculto"
    );


    document.body.style.overflow =
        "hidden";

}


function cerrarModal() {

    modalPartido.classList.add(
        "oculto"
    );


    document.body.style.overflow =
        "";

}


function obtenerResultado(
    partido
) {

    if (
        partido.estado !== "finalizado" ||
        partido.resultadoRegistrado !== true
    ) {

        return "VS";

    }


    return `${numeroSeguro(partido.golesLocal)} - ${numeroSeguro(partido.golesVisitante)}`;

}


function textoEstado(
    estado
) {

    switch (estado) {

        case "enJuego":
            return "En juego";

        case "finalizado":
            return "Finalizado";

        case "cancelado":
            return "Cancelado";

        case "proximo":
        default:
            return "Próximo";

    }

}


function ordenarPartidos(
    a,
    b
) {

    const fechaA =
        `${a.fecha || "9999-12-31"}T${a.hora || "23:59"}`;


    const fechaB =
        `${b.fecha || "9999-12-31"}T${b.hora || "23:59"}`;


    return fechaA.localeCompare(
        fechaB
    );

}


function cargarLogo(
    contenedor,
    equipo,
    nombre,
    inicial
) {

    if (
        equipo?.logoUrl
    ) {

        contenedor.innerHTML =
            "";


        const img =
            document.createElement(
                "img"
            );


        img.src =
            equipo.logoUrl;


        img.alt =
            nombre ||
            "Equipo";


        img.addEventListener(
            "error",
            () => {

                contenedor.innerHTML =
                    "";


                contenedor.textContent =
                    obtenerInicial(
                        nombre ||
                        inicial
                    );

            }
        );


        contenedor.appendChild(
            img
        );

        return;

    }


    contenedor.textContent =
        obtenerInicial(
            nombre ||
            inicial
        );

}


function obtenerLogoHTML(
    equipo,
    nombre,
    inicial
) {

    if (
        equipo?.logoUrl
    ) {

        return `
            <img
                src="${escaparHTML(equipo.logoUrl)}"
                alt="${escaparHTML(nombre || "Equipo")}"
            >
        `;

    }


    return escaparHTML(
        obtenerInicial(
            nombre ||
            inicial
        )
    );

}


function formatearFecha(
    fecha
) {

    if (!fecha) {

        return "Sin definir";

    }


    const partes =
        String(fecha).split("-");


    if (
        partes.length !== 3
    ) {

        return fecha;

    }


    const objeto =
        new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );


    return objeto.toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function formatearHora(
    hora
) {

    if (!hora) {

        return "Sin definir";

    }


    const partes =
        String(hora).split(":");


    const horas =
        Number(
            partes[0]
        );


    const minutos =
        partes[1] ||
        "00";


    const periodo =
        horas >= 12
            ? "PM"
            : "AM";


    const hora12 =
        horas % 12 ||
        12;


    return `${hora12}:${minutos} ${periodo}`;

}


function numeroSeguro(
    valor
) {

    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(numero)
    ) {

        return 0;

    }


    return numero;

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

        return "E";

    }


    return valor
        .charAt(0)
        .toUpperCase();

}


function escaparHTML(
    texto
) {

    return String(
        texto ||
        ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");

}


function mostrarError(
    mensaje
) {

    estadoCarga.classList.add(
        "oculto"
    );


    contenidoPartidos.classList.add(
        "oculto"
    );


    estadoErrorTexto.textContent =
        mensaje;


    estadoError.classList.remove(
        "oculto"
    );

}