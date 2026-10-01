import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";

const totalJugadores =
    document.getElementById(
        "totalJugadores"
    );

const totalConDocumento =
    document.getElementById(
        "totalConDocumento"
    );

const totalSinDocumento =
    document.getElementById(
        "totalSinDocumento"
    );

const totalDuplicados =
    document.getElementById(
        "totalDuplicados"
    );

const contadorResultados =
    document.getElementById(
        "contadorResultados"
    );

const buscarJugador =
    document.getElementById(
        "buscarJugador"
    );

const filtroEquipo =
    document.getElementById(
        "filtroEquipo"
    );

const filtroDocumento =
    document.getElementById(
        "filtroDocumento"
    );

const alertaDuplicados =
    document.getElementById(
        "alertaDuplicados"
    );

const estadoCarga =
    document.getElementById(
        "estadoCarga"
    );

const listaDocumentos =
    document.getElementById(
        "listaDocumentos"
    );

const sinResultados =
    document.getElementById(
        "sinResultados"
    );

const modalDocumento =
    document.getElementById(
        "modalDocumento"
    );

const btnCerrarDocumento =
    document.getElementById(
        "btnCerrarDocumento"
    );

const btnCerrarDocumentoFooter =
    document.getElementById(
        "btnCerrarDocumentoFooter"
    );

const modalNombreJugador =
    document.getElementById(
        "modalNombreJugador"
    );

const modalCurpJugador =
    document.getElementById(
        "modalCurpJugador"
    );

const modalEquipoJugador =
    document.getElementById(
        "modalEquipoJugador"
    );

const modalAlertaDuplicado =
    document.getElementById(
        "modalAlertaDuplicado"
    );

const cargandoDocumento =
    document.getElementById(
        "cargandoDocumento"
    );

const iframeDocumento =
    document.getElementById(
        "iframeDocumento"
    );

const documentoNoDisponible =
    document.getElementById(
        "documentoNoDisponible"
    );

const btnAbrirDocumento =
    document.getElementById(
        "btnAbrirDocumento"
    );

const toast =
    document.getElementById(
        "toast"
    );

const toastIcono =
    document.getElementById(
        "toastIcono"
    );

const toastTitulo =
    document.getElementById(
        "toastTitulo"
    );

const toastMensaje =
    document.getElementById(
        "toastMensaje"
    );

let usuarioActual = null;
let jugadores = [];
let jugadoresFiltrados = [];
let equipos = [];
let curpsDuplicadas = new Map();
let toastTimeout = null;

const usuario =
    await protegerPagina([
        "admin"
    ]);

if (usuario) {
    usuarioActual = usuario;

    activarEventos();

    try {
        await iniciar();
    } catch (error) {
        console.error(
            "Error cargando documentos de jugadores:",
            error
        );

        mostrarErrorCarga();
    }
}

async function iniciar() {
    mostrarCarga();

    await Promise.all([
        cargarJugadores(),
        cargarEquipos()
    ]);

    completarDatosEquipos();
    detectarDuplicados();
    cargarFiltroEquipos();
    actualizarResumen();
    aplicarFiltros();
}

async function cargarJugadores() {
    const snapshot =
        await getDocs(
            collection(
                db,
                "jugadores"
            )
        );

    jugadores =
        snapshot.docs.map(
            documento => ({
                id: documento.id,
                ...documento.data()
            })
        );
}

async function cargarEquipos() {
    try {
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
    } catch (error) {
        console.warn(
            "No se pudieron cargar los equipos:",
            error
        );

        equipos = [];
    }
}

function completarDatosEquipos() {
    jugadores =
        jugadores.map(
            jugador => {
                const equipo =
                    equipos.find(
                        item =>
                            item.id ===
                            jugador.equipoId
                    );

                return {
                    ...jugador,
                    equipoNombreVisual:
                        jugador.equipoNombre ||
                        equipo?.nombre ||
                        "Sin equipo",
                    categoriaNombreVisual:
                        jugador.categoriaNombre ||
                        equipo?.categoriaNombre ||
                        "Sin categoría"
                };
            }
        );
}

function detectarDuplicados() {
    curpsDuplicadas =
        new Map();

    const grupos =
        new Map();

    jugadores.forEach(
        jugador => {
            const curp =
                normalizarCurp(
                    jugador.curp
                );

            if (!curp) {
                return;
            }

            if (
                !grupos.has(
                    curp
                )
            ) {
                grupos.set(
                    curp,
                    []
                );
            }

            grupos
                .get(curp)
                .push(jugador);
        }
    );

    grupos.forEach(
        (
            registros,
            curp
        ) => {
            if (
                registros.length > 1
            ) {
                curpsDuplicadas.set(
                    curp,
                    registros
                );
            }
        }
    );
}

function cargarFiltroEquipos() {
    if (!filtroEquipo) {
        return;
    }

    const nombres =
        [
            ...new Set(
                jugadores
                    .map(
                        jugador =>
                            String(
                                jugador.equipoNombreVisual ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (
                a,
                b
            ) =>
                a.localeCompare(
                    b,
                    "es",
                    {
                        sensitivity:
                            "base"
                    }
                )
        );

    filtroEquipo.innerHTML = `
        <option value="">
            Todos los equipos
        </option>

        ${nombres.map(
            nombre => `
                <option value="${escaparAtributo(
                    nombre
                )}">
                    ${escaparHTML(
                        nombre
                    )}
                </option>
            `
        ).join("")}
    `;
}

function actualizarResumen() {
    const conDocumento =
        jugadores.filter(
            jugador =>
                obtenerUrlDocumento(
                    jugador
                )
        ).length;

    const sinDocumento =
        jugadores.length -
        conDocumento;

    const registrosDuplicados =
        jugadores.filter(
            jugador =>
                esJugadorDuplicado(
                    jugador
                )
        ).length;

    if (totalJugadores) {
        totalJugadores.textContent =
            jugadores.length;
    }

    if (totalConDocumento) {
        totalConDocumento.textContent =
            conDocumento;
    }

    if (totalSinDocumento) {
        totalSinDocumento.textContent =
            sinDocumento;
    }

    if (totalDuplicados) {
        totalDuplicados.textContent =
            registrosDuplicados;
    }

    if (alertaDuplicados) {
        alertaDuplicados.classList.toggle(
            "oculto",
            curpsDuplicadas.size === 0
        );
    }
}

function activarEventos() {
    buscarJugador?.addEventListener(
        "input",
        aplicarFiltros
    );

    filtroEquipo?.addEventListener(
        "change",
        aplicarFiltros
    );

    filtroDocumento?.addEventListener(
        "change",
        aplicarFiltros
    );

    listaDocumentos?.addEventListener(
        "click",
        event => {
            const boton =
                event.target.closest(
                    "[data-ver-documento]"
                );

            if (!boton) {
                return;
            }

            abrirDocumento(
                boton.dataset.verDocumento
            );
        }
    );

    btnCerrarDocumento?.addEventListener(
        "click",
        cerrarDocumento
    );

    btnCerrarDocumentoFooter?.addEventListener(
        "click",
        cerrarDocumento
    );

    modalDocumento?.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                modalDocumento
            ) {
                cerrarDocumento();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modalDocumento &&
                !modalDocumento.classList.contains(
                    "oculto"
                )
            ) {
                cerrarDocumento();
            }
        }
    );
}

function aplicarFiltros() {
    const busqueda =
        normalizarTexto(
            buscarJugador?.value ||
            ""
        );

    const equipoSeleccionado =
        String(
            filtroEquipo?.value ||
            ""
        ).trim();

    const documentoSeleccionado =
        filtroDocumento?.value ||
        "";

    jugadoresFiltrados =
        jugadores.filter(
            jugador => {
                const nombre =
                    normalizarTexto(
                        obtenerNombreJugador(
                            jugador
                        )
                    );

                const curp =
                    normalizarTexto(
                        jugador.curp
                    );

                const equipo =
                    String(
                        jugador.equipoNombreVisual ||
                        ""
                    ).trim();

                const tieneDocumento =
                    Boolean(
                        obtenerUrlDocumento(
                            jugador
                        )
                    );

                const duplicado =
                    esJugadorDuplicado(
                        jugador
                    );

                const coincideBusqueda =
                    !busqueda ||
                    nombre.includes(
                        busqueda
                    ) ||
                    curp.includes(
                        busqueda
                    );

                const coincideEquipo =
                    !equipoSeleccionado ||
                    equipo ===
                    equipoSeleccionado;

                let coincideDocumento =
                    true;

                if (
                    documentoSeleccionado ===
                    "con"
                ) {
                    coincideDocumento =
                        tieneDocumento;
                }

                if (
                    documentoSeleccionado ===
                    "sin"
                ) {
                    coincideDocumento =
                        !tieneDocumento;
                }

                if (
                    documentoSeleccionado ===
                    "duplicado"
                ) {
                    coincideDocumento =
                        duplicado;
                }

                return (
                    coincideBusqueda &&
                    coincideEquipo &&
                    coincideDocumento
                );
            }
        );

    jugadoresFiltrados.sort(
        ordenarJugadores
    );

    renderizarJugadores();
}

function ordenarJugadores(
    a,
    b
) {
    const duplicadoA =
        esJugadorDuplicado(
            a
        );

    const duplicadoB =
        esJugadorDuplicado(
            b
        );

    if (
        duplicadoA !==
        duplicadoB
    ) {
        return duplicadoA
            ? -1
            : 1;
    }

    const nombreA =
        obtenerNombreJugador(
            a
        );

    const nombreB =
        obtenerNombreJugador(
            b
        );

    return nombreA.localeCompare(
        nombreB,
        "es",
        {
            sensitivity:
                "base"
        }
    );
}

function renderizarJugadores() {
    ocultarCarga();

    if (contadorResultados) {
        contadorResultados.textContent =
            `${jugadoresFiltrados.length} ${
                jugadoresFiltrados.length === 1
                    ? "resultado"
                    : "resultados"
            }`;
    }

    if (
        jugadoresFiltrados.length ===
        0
    ) {
        listaDocumentos?.classList.add(
            "oculto"
        );

        sinResultados?.classList.remove(
            "oculto"
        );

        return;
    }

    sinResultados?.classList.add(
        "oculto"
    );

    listaDocumentos?.classList.remove(
        "oculto"
    );

    listaDocumentos.innerHTML =
        jugadoresFiltrados
            .map(
                crearTarjetaJugador
            )
            .join("");
}

function crearTarjetaJugador(
    jugador
) {
    const nombre =
        obtenerNombreJugador(
            jugador
        );

    const curp =
        normalizarCurp(
            jugador.curp
        );

    const documento =
        obtenerUrlDocumento(
            jugador
        );

    const duplicado =
        esJugadorDuplicado(
            jugador
        );

    const clases = [
        "documento-card"
    ];

    if (duplicado) {
        clases.push(
            "duplicado"
        );
    }

    if (!documento) {
        clases.push(
            "sin-documento"
        );
    }

    let estadoClase = "";
    let estadoTexto =
        "DOCUMENTO CARGADO";

    if (!documento) {
        estadoClase = "sin";
        estadoTexto =
            "SIN DOCUMENTO";
    }

    if (duplicado) {
        estadoClase =
            "duplicado";

        estadoTexto =
            "CURP DUPLICADA";
    }

    return `
        <article class="${clases.join(
            " "
        )}">
            <div class="documento-card-top">

                <div class="documento-jugador">

                    <div class="documento-foto">
                        ${crearFotoJugador(
                            jugador,
                            nombre
                        )}
                    </div>

                    <div class="documento-jugador-info">
                        <span>
                            JUGADOR
                        </span>

                        <h3 title="${escaparAtributo(
                            nombre
                        )}">
                            ${escaparHTML(
                                nombre
                            )}
                        </h3>

                        <p>
                            ${escaparHTML(
                                jugador.equipoNombreVisual ||
                                "Sin equipo"
                            )}
                        </p>
                    </div>

                </div>

                <span class="documento-estado ${estadoClase}">
                    ${estadoTexto}
                </span>

            </div>

            <div class="documento-datos">

                <div class="documento-dato">
                    <span>
                        CURP
                    </span>

                    <strong title="${escaparAtributo(
                        curp ||
                        "Sin CURP"
                    )}">
                        ${escaparHTML(
                            curp ||
                            "Sin CURP"
                        )}
                    </strong>
                </div>

                <div class="documento-dato">
                    <span>
                        Categoría
                    </span>

                    <strong title="${escaparAtributo(
                        jugador.categoriaNombreVisual ||
                        "Sin categoría"
                    )}">
                        ${escaparHTML(
                            jugador.categoriaNombreVisual ||
                            "Sin categoría"
                        )}
                    </strong>
                </div>

            </div>

            ${
                duplicado
                    ? crearAlertaDuplicado(
                        jugador
                    )
                    : ""
            }

            <div class="documento-acciones">
                <button
                    type="button"
                    class="btn-ver-documento"
                    data-ver-documento="${escaparAtributo(
                        jugador.id
                    )}"
                    ${documento ? "" : "disabled"}
                >
                    ${
                        documento
                            ? "📄 Ver CURP"
                            : "Documento no disponible"
                    }
                </button>
            </div>

        </article>
    `;
}

function crearFotoJugador(
    jugador,
    nombre
) {
    const foto =
        jugador.fotoUrl ||
        jugador.foto ||
        jugador.imagenUrl ||
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

    return escaparHTML(
        obtenerIniciales(
            nombre
        )
    );
}

function crearAlertaDuplicado(
    jugador
) {
    const curp =
        normalizarCurp(
            jugador.curp
        );

    const grupo =
        curpsDuplicadas.get(
            curp
        ) ||
        [];

    const otros =
        grupo.filter(
            item =>
                item.id !==
                jugador.id
        );

    if (!otros.length) {
        return "";
    }

    const equiposOtros =
        [
            ...new Set(
                otros.map(
                    item =>
                        item.equipoNombreVisual ||
                        "Sin equipo"
                )
            )
        ];

    return `
        <div class="documento-alerta">
            <span>
                ⚠
            </span>

            <span>
                Esta CURP aparece ${
                    grupo.length
                } veces. También está registrada en:
                ${escaparHTML(
                    equiposOtros.join(
                        ", "
                    )
                )}
            </span>
        </div>
    `;
}

function abrirDocumento(
    jugadorId
) {
    const jugador =
        jugadores.find(
            item =>
                item.id ===
                jugadorId
        );

    if (!jugador) {
        mostrarToast(
            "error",
            "Jugador no encontrado",
            "No pudimos encontrar este registro."
        );

        return;
    }

    const nombre =
        obtenerNombreJugador(
            jugador
        );

    const curp =
        normalizarCurp(
            jugador.curp
        );

    const url =
        obtenerUrlDocumento(
            jugador
        );

    if (modalNombreJugador) {
        modalNombreJugador.textContent =
            nombre;
    }

    if (modalCurpJugador) {
        modalCurpJugador.textContent =
            curp ||
            "Sin CURP";
    }

    if (modalEquipoJugador) {
        modalEquipoJugador.textContent =
            jugador.equipoNombreVisual ||
            "Sin equipo";
    }

    if (modalAlertaDuplicado) {
        modalAlertaDuplicado.classList.toggle(
            "oculto",
            !esJugadorDuplicado(
                jugador
            )
        );
    }

    prepararVisorDocumento();

    modalDocumento?.classList.remove(
        "oculto"
    );

    document.body.style.overflow =
        "hidden";

    if (!url) {
        mostrarDocumentoNoDisponible();

        return;
    }

    if (btnAbrirDocumento) {
        btnAbrirDocumento.href =
            url;

        btnAbrirDocumento.classList.remove(
            "oculto"
        );
    }

    cargarDocumentoEnVisor(
        url
    );
}

function prepararVisorDocumento() {
    cargandoDocumento?.classList.remove(
        "oculto"
    );

    iframeDocumento?.classList.add(
        "oculto"
    );

    documentoNoDisponible?.classList.add(
        "oculto"
    );

    btnAbrirDocumento?.classList.add(
        "oculto"
    );

    if (iframeDocumento) {
        iframeDocumento.removeAttribute(
            "src"
        );
    }
}

function cargarDocumentoEnVisor(
    url
) {
    if (!iframeDocumento) {
        return;
    }

    let finalizado = false;

    const mostrar = () => {
        if (finalizado) {
            return;
        }

        finalizado = true;

        cargandoDocumento?.classList.add(
            "oculto"
        );

        iframeDocumento.classList.remove(
            "oculto"
        );
    };

    iframeDocumento.onload =
        mostrar;

    iframeDocumento.src =
        url;

    setTimeout(
        mostrar,
        1800
    );
}

function mostrarDocumentoNoDisponible() {
    cargandoDocumento?.classList.add(
        "oculto"
    );

    iframeDocumento?.classList.add(
        "oculto"
    );

    documentoNoDisponible?.classList.remove(
        "oculto"
    );

    btnAbrirDocumento?.classList.add(
        "oculto"
    );
}

function cerrarDocumento() {
    modalDocumento?.classList.add(
        "oculto"
    );

    document.body.style.overflow =
        "";

    if (iframeDocumento) {
        iframeDocumento.removeAttribute(
            "src"
        );

        iframeDocumento.onload =
            null;
    }

    prepararVisorDocumento();
}

function obtenerUrlDocumento(
    jugador
) {
    const posibles = [
        jugador.curpArchivoUrl,
        jugador.curpUrl,
        jugador.documentoCurpUrl,
        jugador.archivoCurpUrl,
        jugador.pdfCurpUrl
    ];

    for (
        const valor of posibles
    ) {
        if (
            typeof valor ===
                "string" &&
            valor.trim()
        ) {
            return valor.trim();
        }
    }

    return "";
}

function esJugadorDuplicado(
    jugador
) {
    const curp =
        normalizarCurp(
            jugador.curp
        );

    if (!curp) {
        return false;
    }

    return curpsDuplicadas.has(
        curp
    );
}

function obtenerNombreJugador(
    jugador
) {
    return String(
        jugador.nombreCompleto ||
        jugador.nombre ||
        [
            jugador.nombres,
            jugador.apellidoPaterno,
            jugador.apellidoMaterno
        ]
            .filter(Boolean)
            .join(" ") ||
        "Jugador sin nombre"
    ).trim();
}

function normalizarCurp(
    valor
) {
    return String(
        valor ||
        ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /\s+/g,
            ""
        );
}

function normalizarTexto(
    valor
) {
    return String(
        valor ||
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();
}

function obtenerIniciales(
    nombre
) {
    const partes =
        String(
            nombre ||
            ""
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (!partes.length) {
        return "J";
    }

    if (
        partes.length === 1
    ) {
        return partes[0]
            .charAt(0)
            .toUpperCase();
    }

    return (
        partes[0]
            .charAt(0) +
        partes[1]
            .charAt(0)
    ).toUpperCase();
}

function mostrarCarga() {
    estadoCarga?.classList.remove(
        "oculto"
    );

    listaDocumentos?.classList.add(
        "oculto"
    );

    sinResultados?.classList.add(
        "oculto"
    );
}

function ocultarCarga() {
    estadoCarga?.classList.add(
        "oculto"
    );
}

function mostrarErrorCarga() {
    estadoCarga?.classList.add(
        "oculto"
    );

    listaDocumentos?.classList.add(
        "oculto"
    );

    sinResultados?.classList.remove(
        "oculto"
    );

    if (sinResultados) {
        sinResultados.innerHTML = `
            <div>
                ⚠
            </div>

            <strong>
                No pudimos cargar los documentos
            </strong>

            <p>
                Revisa tu conexión e intenta actualizar la página.
            </p>
        `;
    }

    mostrarToast(
        "error",
        "Error de carga",
        "No fue posible consultar los jugadores."
    );
}

function mostrarToast(
    tipo,
    titulo,
    mensaje
) {
    if (
        !toast ||
        !toastTitulo ||
        !toastMensaje
    ) {
        return;
    }

    clearTimeout(
        toastTimeout
    );

    toastTitulo.textContent =
        titulo;

    toastMensaje.textContent =
        mensaje;

    if (toastIcono) {
        if (
            tipo === "error"
        ) {
            toastIcono.textContent =
                "!";

            toastIcono.style.background =
                "#f3d6d0";

            toastIcono.style.color =
                "#b84535";
        } else {
            toastIcono.textContent =
                "✓";

            toastIcono.style.background =
                "#dcebd8";

            toastIcono.style.color =
                "#2f714c";
        }
    }

    toast.classList.remove(
        "oculto"
    );

    toastTimeout =
        setTimeout(
            () => {
                toast.classList.add(
                    "oculto"
                );
            },
            3500
        );
}

function escaparHTML(
    valor
) {
    return String(
        valor ??
        ""
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