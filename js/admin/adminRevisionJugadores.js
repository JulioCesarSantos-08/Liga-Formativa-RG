import {
    protegerPagina
} from "../roles.js";

import {
    consultarRevisionJugadores,
    guardarRevisionJugador,
    revisionConfirmada,
    nombreRevision,
    dorsalRevision,
    urlCurpRevision
} from "./revisionJugadoresDatos.js";

import { guardarAlertaJugador } from "./alertasRevisionJugadores.js";

const alertaActiva = jugador =>
    jugador?.alertaRevisionIdentidad?.activa === true;

const el = nombre =>
    document.getElementById("rj" + nombre);

const controles = [
    "Actualizar",
    "Buscar",
    "Categoria",
    "Equipo",
    "Estado"
];

let jugadores = [];
let equipos = new Map();
let categorias = new Map();

let seleccionado = null;
let ocupado = false;
let pagina = 1;
let listo = false;

const porPagina = 30;

const texto = valor =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

function crear(tag, clase, contenido) {
    const nodo = document.createElement(tag);

    if (clase) {
        nodo.className = clase;
    }

    if (contenido !== undefined) {
        nodo.textContent = contenido;
    }

    return nodo;
}

function aviso(nombre, mensaje, tipo = "info") {
    el(nombre).textContent = mensaje;
    el(nombre).dataset.tipo = tipo;
    el(nombre).hidden = !mensaje;
}

function errorLegible(error) {
    const codigo = String(error?.code || "");

    if (codigo.includes("permission-denied")) {
        return "No se permitió guardar o consultar los datos. Revisa tu sesión administradora y los permisos de acceso.";
    }

    if (
        /unavailable|deadline-exceeded|network-request-failed/.test(codigo)
    ) {
        return "No se pudo completar la comunicación con el servidor. Revisa la conexión y actualiza la lista antes de repetir la operación.";
    }

    return error?.message ||
        "No se completó la operación. Actualiza la lista e intenta nuevamente.";
}

function bloquear(valor) {
    ocupado = valor;

    controles.forEach(id => {
        el(id).disabled = valor || !listo;
    });

    [
        "Cerrar",
        "Guardar",
        "Confirmar",
        "Reabrir",
        "Nombre",
        "Dorsal",
        "MarcarAlerta",
        "ResolverAlerta",
        "MotivoAlerta"
    ].forEach(id => {
        el(id).disabled = valor;
    });

    el("Confirmar").disabled =
        valor || alertaActiva(seleccionado);

    document.querySelectorAll(".rj-revisar").forEach(
        boton => boton.disabled = valor
    );

    el("Anterior").disabled =
        valor || pagina <= 1;

    el("Siguiente").disabled =
        valor || pagina * porPagina >= filtrar().length;
}

function categoriaId(jugador) {
    return String(
        jugador.categoriaId ||
        equipos.get(jugador.equipoId)?.categoriaId ||
        ""
    );
}

function categoriaNombre(jugador) {
    return categorias.get(categoriaId(jugador))?.nombre ||
        jugador.categoriaNombre ||
        equipos.get(jugador.equipoId)?.categoriaNombre ||
        "Sin categoría";
}

function equipoNombre(jugador) {
    return equipos.get(jugador.equipoId)?.nombre ||
        jugador.equipoNombre ||
        "Sin equipo";
}

function filtrar() {
    const buscar = texto(el("Buscar").value);
    const estado = el("Estado").value;

    return jugadores.filter(jugador =>
        (
            !el("Categoria").value ||
            categoriaId(jugador) === el("Categoria").value
        ) &&
        (
            !el("Equipo").value ||
            jugador.equipoId === el("Equipo").value
        ) &&
        (
            estado === "todos" ||
            (
                estado === "alertas"
                    ? alertaActiva(jugador)
                    : revisionConfirmada(jugador) ===
                        (estado === "confirmados")
            )
        ) &&
        texto(
            [
                nombreRevision(jugador),
                jugador.curp,
                dorsalRevision(jugador),
                jugador.alertaRevisionIdentidad?.activa
                    ? jugador.alertaRevisionIdentidad.motivo
                    : ""
            ].join(" ")
        ).includes(buscar)
    );
}

function tarjeta(jugador) {
    const nodo = crear("article", "rj-tarjeta");
    const alerta = alertaActiva(jugador);

    nodo.dataset.alerta = String(alerta);

    const confirmado = revisionConfirmada(jugador);

    const insignia = crear(
        "span",
        "rj-insignia",
        alerta
            ? "ALERTA DE IDENTIDAD"
            : confirmado
                ? "Revision confirmada"
                : "Pendiente de revision"
    );

    insignia.dataset.confirmado = String(confirmado);
    insignia.dataset.alerta = String(alerta);

    nodo.append(
        insignia,
        crear("h3", "", nombreRevision(jugador))
    );

    if (alerta) {
        nodo.append(
            crear(
                "p",
                "rj-motivo-alerta",
                jugador.alertaRevisionIdentidad.motivo ||
                    "Identidad pendiente de aclarar"
            )
        );
    }

    nodo.append(
        crear(
            "p",
            "",
            equipoNombre(jugador) +
            " / " +
            categoriaNombre(jugador)
        ),
        crear(
            "p",
            "",
            "Dorsal: " +
            (
                dorsalRevision(jugador) === ""
                    ? "Sin asignar"
                    : dorsalRevision(jugador)
            )
        ),
        crear(
            "p",
            "rj-nota",
            (
                urlCurpRevision(jugador)
                    ? "PDF de CURP registrado"
                    : "Sin PDF de CURP"
            ) +
            (
                jugador.activo === false
                    ? " / Jugador inactivo"
                    : ""
            )
        )
    );

    const boton = crear(
        "button",
        "rj-boton rj-secundario rj-revisar",
        "Revisar / editar"
    );

    boton.type = "button";

    boton.addEventListener(
        "click",
        () => abrir(jugador)
    );

    nodo.append(boton);

    return nodo;
}

function renderizar() {
    const visibles = filtrar().sort((a, b) =>
        Number(alertaActiva(b)) -
            Number(alertaActiva(a)) ||
        nombreRevision(a).localeCompare(
            nombreRevision(b),
            "es"
        ) ||
        a.id.localeCompare(b.id)
    );

    const paginas = Math.max(
        1,
        Math.ceil(visibles.length / porPagina)
    );

    pagina = Math.min(pagina, paginas);

    el("Lista").replaceChildren(
        ...visibles
            .slice(
                (pagina - 1) * porPagina,
                pagina * porPagina
            )
            .map(tarjeta)
    );

    el("SinResultados").hidden =
        !listo || visibles.length > 0;

    el("Pagina").textContent = listo
        ? "Página " + pagina +
            " de " + paginas +
            " · " + visibles.length +
            " resultados"
        : "";

    const confirmados = jugadores.filter(
        revisionConfirmada
    ).length;

    el("Total").textContent = listo
        ? String(jugadores.length)
        : "—";

    el("Confirmados").textContent = listo
        ? String(confirmados)
        : "—";

    el("Pendientes").textContent = listo
        ? String(jugadores.length - confirmados)
        : "—";

    bloquear(ocupado);
}

function llenarFiltros() {
    const anteriores = [
        el("Categoria").value,
        el("Equipo").value
    ];

    for (const [id, mapa, primera] of [
        ["Categoria", categorias, "Todas las categorías"],
        ["Equipo", equipos, "Todos los equipos"]
    ]) {
        el(id).replaceChildren(
            new Option(primera, "")
        );

        [...mapa.values()]
            .sort((a, b) =>
                String(a.nombre || "").localeCompare(
                    String(b.nombre || ""),
                    "es"
                )
            )
            .forEach(item => {
                const etiqueta = id === "Equipo"
                    ? (item.nombre || "Sin nombre") +
                        " · " +
                        (
                            categorias.get(
                                String(item.categoriaId)
                            )?.nombre ||
                            item.categoriaNombre ||
                            "Sin categoría"
                        )
                    : item.nombre || "Sin nombre";

                el(id).add(
                    new Option(etiqueta, item.id)
                );
            });
    }

    ["Categoria", "Equipo"].forEach((id, indice) => {
        if (
            [...el(id).options].some(
                opcion =>
                    opcion.value === anteriores[indice]
            )
        ) {
            el(id).value = anteriores[indice];
        }
    });
}

async function cargar() {
    if (ocupado) return;

    bloquear(true);

    aviso(
        "Aviso",
        "Consultando jugadores y avance de revisión…"
    );

    try {
        const datos =
            await consultarRevisionJugadores();

        jugadores = datos.jugadores.sort((a, b) =>
            nombreRevision(a).localeCompare(
                nombreRevision(b),
                "es"
            ) ||
            a.id.localeCompare(b.id)
        );

        equipos = new Map(
            datos.equipos.map(equipo => [
                equipo.id,
                equipo
            ])
        );

        categorias = new Map(
            datos.categorias.map(categoria => [
                categoria.id,
                categoria
            ])
        );

        llenarFiltros();

        listo = true;

        aviso(
            "Aviso",
            "Lista actualizada. Los contadores corresponden a todos los jugadores; los filtros solo cambian los resultados visibles."
        );
    } catch (error) {
        jugadores = [];
        listo = false;

        aviso(
            "Aviso",
            errorLegible(error),
            "error"
        );
    } finally {
        ocupado = false;
        renderizar();
        el("Actualizar").disabled = false;
    }
}

function abrir(jugador) {
    if (ocupado) return;

    seleccionado = jugador;

    el("TituloDetalle").textContent =
        nombreRevision(jugador);

    el("Asignacion").textContent =
        equipoNombre(jugador) +
        " · " +
        categoriaNombre(jugador);

    el("CurpTexto").textContent =
        "CURP: " +
        (jugador.curp || "No registrada");

    el("Nombre").value =
        nombreRevision(jugador) === "Sin nombre"
            ? ""
            : nombreRevision(jugador);

    el("Dorsal").value =
        dorsalRevision(jugador);

    el("VerCurp").disabled =
        !urlCurpRevision(jugador);

    el("SinCurp").hidden =
        Boolean(urlCurpRevision(jugador));

    el("Reabrir").hidden =
        !revisionConfirmada(jugador);

    el("MotivoAlerta").value =
        jugador.alertaRevisionIdentidad?.motivo || "";

    el("ResolverAlerta").hidden =
        !alertaActiva(jugador);

    el("MarcarAlerta").textContent =
        alertaActiva(jugador)
            ? "Actualizar motivo de alerta"
            : "Guardar alerta";

    el("EstadoAlerta").textContent =
        alertaActiva(jugador)
            ? "ALERTA ACTIVA: el registro permanece pendiente hasta aclarar el problema."
            : "Marca este registro si su identidad o documentacion requiere aclaracion.";

    bloquear(false);

    aviso("DetalleAviso", "");

    el("Detalle").showModal();
}

async function guardar(accion) {
    if (ocupado || !seleccionado) return;

    if (
        accion !== "pendiente" &&
        !el("Dorsal").checkValidity()
    ) {
        el("Dorsal").reportValidity();
        return;
    }

    bloquear(true);

    aviso(
        "DetalleAviso",
        "Guardando revisión…"
    );

    try {
        const resultado = await guardarRevisionJugador(
            seleccionado,
            {
                nombre: el("Nombre").value,
                numero: el("Dorsal").value
            },
            accion
        );

        jugadores = jugadores
            .map(jugador =>
                jugador.id === resultado.id
                    ? resultado
                    : jugador
            )
            .sort((a, b) =>
                nombreRevision(a).localeCompare(
                    nombreRevision(b),
                    "es"
                )
            );

        el("Detalle").close();

        seleccionado = null;

        aviso(
            "Aviso",
            nombreRevision(resultado) +
            (
                accion === "confirmar"
                    ? ": revisión confirmada."
                    : accion === "pendiente"
                        ? ": volvió a pendientes. Los campos del formulario no se modificaron."
                        : ": nombre y dorsal guardados. Falta confirmar su revisión."
            ),
            "exito"
        );
    } catch (error) {
        aviso(
            "DetalleAviso",
            errorLegible(error),
            "error"
        );
    } finally {
        ocupado = false;
        renderizar();
    }
}

async function gestionarAlerta(activa) {
    if (ocupado || !seleccionado) return;

    bloquear(true);

    aviso(
        "DetalleAviso",
        "Guardando estado de la alerta..."
    );

    try {
        const resultado = await guardarAlertaJugador(
            seleccionado,
            el("MotivoAlerta").value,
            activa
        );

        jugadores = jugadores.map(jugador =>
            jugador.id === resultado.id
                ? resultado
                : jugador
        );

        el("Detalle").close();

        seleccionado = null;
        pagina = 1;

        aviso(
            "Aviso",
            nombreRevision(resultado) +
            (
                activa
                    ? ": alerta guardada. Permanece pendiente y aparece primero entre los resultados que coincidan con tus filtros."
                    : ": alerta resuelta. Su revision permanece pendiente hasta que la confirmes."
            ),
            "exito"
        );
    } catch (error) {
        aviso(
            "DetalleAviso",
            errorLegible(error),
            "error"
        );
    } finally {
        ocupado = false;
        renderizar();
    }
}

async function iniciar() {
    try {
        const usuario =
            await protegerPagina(["admin"]);

        if (!usuario) return;

        el("Actualizar").addEventListener(
            "click",
            cargar
        );

        [
            "Buscar",
            "Categoria",
            "Equipo",
            "Estado"
        ].forEach(id => {
            el(id).addEventListener(
                id === "Buscar" ? "input" : "change",
                () => {
                    pagina = 1;
                    renderizar();
                }
            );
        });

        el("Anterior").addEventListener("click", () => {
            if (!ocupado) {
                pagina--;
                renderizar();
            }
        });

        el("Siguiente").addEventListener("click", () => {
            if (!ocupado) {
                pagina++;
                renderizar();
            }
        });

        el("Cerrar").addEventListener("click", () => {
            if (!ocupado) {
                el("Detalle").close();
            }
        });

        el("Detalle").addEventListener(
            "cancel",
            evento => {
                if (ocupado) {
                    evento.preventDefault();
                }
            }
        );

        el("Detalle").addEventListener("close", () => {
            seleccionado = null;
        });

        el("Guardar").addEventListener(
            "click",
            () => guardar("guardar")
        );

        el("Confirmar").addEventListener(
            "click",
            () => guardar("confirmar")
        );

        el("Reabrir").addEventListener(
            "click",
            () => guardar("pendiente")
        );

        el("MarcarAlerta").addEventListener(
            "click",
            () => gestionarAlerta(true)
        );

        el("ResolverAlerta").addEventListener(
            "click",
            () => gestionarAlerta(false)
        );

        el("VerCurp").addEventListener("click", () => {
            const url = seleccionado &&
                urlCurpRevision(seleccionado);

            if (!url) return;

            el("TituloDocumento").textContent =
                "CURP · " +
                nombreRevision(seleccionado);

            el("Visor").src = url;
            el("AbrirPdf").href = url;

            el("Documento").showModal();
        });

        el("CerrarDocumento").addEventListener(
            "click",
            () => el("Documento").close()
        );

        el("Documento").addEventListener("close", () => {
            el("Visor").removeAttribute("src");
            el("AbrirPdf").removeAttribute("href");
        });

        await cargar();
    } catch (error) {
        aviso(
            "Aviso",
            errorLegible(error),
            "error"
        );
    }
}

iniciar();