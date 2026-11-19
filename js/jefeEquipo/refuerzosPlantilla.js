import {guardarDorsalRefuerzo} from "./dorsalRefuerzoDatos.js";
import {estadoCategoria,textoDisciplina,dorsalRefuerzo,temporadaDisciplina} from "../disciplinaCategoria.js";
import {cargarHistorialDisciplina} from "../disciplinaCategoriaDatos.js";
let historialDisciplina = [];

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { protegerPagina } from "../roles.js";
import { db } from "../firebase.js";

const panelJugadores = document.querySelector(".panel-jugadores");
const contenidoEquipo = document.getElementById("contenidoEquipo");

let usuarioActual = null;
let equiposPermitidos = [];
let equiposLiga = [];
let ultimaCarga = 0;
let equipoMostrado = "";

const usuario = await protegerPagina(["jefeEquipo", "admin"]);

if (usuario && panelJugadores && contenidoEquipo) {
    usuarioActual = usuario;
    crearPanelRefuerzos();
    activarActualizaciones();
    await cargarEquiposRefuerzos();
    await actualizarRefuerzos();
}

function crearPanelRefuerzos() {
    if (document.getElementById("panelRefuerzosAprobados")) {
        return;
    }

    const estilo = document.createElement("style");

    estilo.textContent = `
        .panel-refuerzos {
            margin: 22px 0;
            padding: 20px;
            border: 1px solid #a7d7ce;
            border-radius: 18px;
            background: #f2faf7;
            box-shadow: 0 8px 24px rgba(10,70,61,.06);
        }

        .refuerzos-encabezado {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }

        .refuerzos-encabezado h2 {
            font-size: 1.16rem;
            color: #12483f;
            margin: 4px 0;
        }

        .refuerzos-encabezado p {
            color: #58736c;
            font-size: .87rem;
            margin: 0;
            line-height: 1.5;
        }

        .refuerzos-cantidad {
            background: #d9f2e9;
            color: #085c4b;
            border-radius: 99px;
            padding: 8px 12px;
            font-weight: 800;
            font-size: .8rem;
        }

        .refuerzos-lista {
            display: grid;
            grid-template-columns: repeat(
                auto-fit,
                minmax(min(100%,270px),1fr)
            );
            gap: 12px;
        }

        .refuerzo-tarjeta {
            border: 1px solid #d2e7e0;
            background: #fff;
            border-radius: 14px;
            padding: 14px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
            min-width: 0;
        }

        .refuerzo-foto {
            width: 60px;
            height: 70px;
            flex: none;
            border-radius: 10px;
            object-fit: cover;
            background: #e1eee9;
            display: grid;
            place-items: center;
            color: #0b756d;
            font-weight: 900;
            font-size: 1.4rem;
        }

        .refuerzo-info {
            min-width: 0;
            flex: 1;
        }

        .refuerzo-info strong {
            display: block;
            overflow-wrap: anywhere;
            font-size: .9rem;
            color: #18392f;
        }

        .refuerzo-info span {
            display: block;
            color: #61766f;
            margin-top: 5px;
            font-size: .79rem;
            line-height: 1.4;
        }

        .refuerzo-distintivo {
            display: inline-block;
            margin-top: 8px;
            background: #dceafe;
            color: #2456a0;
            font-weight: 800;
            border-radius: 8px;
            padding: 4px 8px;
            font-size: .7rem;
        }

        .refuerzos-mensaje {
            padding: 15px;
            background: #fff;
            border: 1px dashed #c9ddd5;
            border-radius: 12px;
            color: #546c62;
            font-size: .89rem;
            line-height: 1.5;
        }

        @media (max-width: 560px) {
            .panel-refuerzos {
                padding: 14px;
                margin: 16px 0;
            }

            .refuerzo-tarjeta {
                padding: 12px;
            }
        }
    `;

    document.head.appendChild(estilo);

    const seccion = document.createElement("section");

    seccion.id = "panelRefuerzosAprobados";
    seccion.className = "panel-refuerzos";
    seccion.hidden = true;

    seccion.innerHTML = `
        <div class="refuerzos-encabezado">
            <div>
                <h2>🔵 Refuerzos autorizados</h2>
                <p>
                    Jugadores de otras categorías del mismo club,
                    aprobados por la liga.
                </p>
            </div>

            <span
                id="cantidadRefuerzosAprobados"
                class="refuerzos-cantidad"
            >
                0 refuerzos
            </span>
        </div>

        <div
            id="listaRefuerzosAprobados"
            class="refuerzos-lista"
        ></div>
    `;

    panelJugadores.insertAdjacentElement(
        "beforebegin",
        seccion
    );
}

function activarActualizaciones() {
    window.addEventListener(
        "popstate",
        actualizarRefuerzos
    );

    document.addEventListener("change", event => {
        if (event.target?.id === "selectorEquipoJefe") {
            setTimeout(actualizarRefuerzos, 0);
        }
    });

    window.addEventListener("focus", () => {
        if (!document.hidden) {
            actualizarRefuerzos();
        }
    });
}

async function cargarEquiposRefuerzos() {
    try {
        const snapshot = await getDocs(
            collection(db, "equipos")
        );

        equiposLiga = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        const idUsuario = String(
            usuarioActual.uid ||
            usuarioActual.id ||
            ""
        );

        equiposPermitidos = usuarioActual.rol === "admin"
            ? equiposLiga
            : equiposLiga.filter(
                equipo => equipo.responsableId === idUsuario
            );
    } catch (error) {
        console.error(
            "Error consultando equipos para refuerzos:",
            error
        );

        equiposLiga = [];
        equiposPermitidos = [];
    }
}

function obtenerEquipoSeleccionado() {
    const idURL = new URLSearchParams(
        window.location.search
    ).get("equipo");

    if (usuarioActual?.rol === "admin") {
        return equiposPermitidos.find(
            equipo => equipo.id === idURL
        ) || null;
    }

    return equiposPermitidos.find(
        equipo => equipo.id === idURL
    ) || (
        !idURL ? equiposPermitidos[0] : null
    ) || null;
}

function esPrestamoVigente(prestamo) {
    if (!prestamo || prestamo.activo === false) {
        return false;
    }

    const estado = String(prestamo.estado || "")
        .trim()
        .toLowerCase();

    if ([
        "cancelado",
        "cancelada",
        "finalizado",
        "finalizada",
        "rechazado",
        "rechazada",
        "pendiente",
        "inactivo"
    ].includes(estado)) {
        return false;
    }

    return prestamo.activo === true ||
        ["activo", "aprobado", "aprobada"].includes(estado);
}

async function actualizarRefuerzos() {
    const panel = document.getElementById(
        "panelRefuerzosAprobados"
    );

    const lista = document.getElementById(
        "listaRefuerzosAprobados"
    );

    const cantidad = document.getElementById(
        "cantidadRefuerzosAprobados"
    );

    if (!panel || !lista || !cantidad || !usuarioActual) {
        return;
    }

    const equipo = obtenerEquipoSeleccionado();
    const token = ++ultimaCarga;

    if (!equipo) {
        panel.hidden = true;
        equipoMostrado = "";
        return;
    }

    equipoMostrado = equipo.id;
    panel.hidden = false;

    lista.classList.remove("refuerzos-lista");
    lista.classList.add("refuerzos-mensaje");
    lista.textContent = "Consultando refuerzos autorizados...";

    try {
        const [
            snapshotPrestamos,
            snapshotJugadores,
            historial
        ] = await Promise.all([
            getDocs(collection(db, "prestamosJugadores")),
            getDocs(collection(db, "jugadores")),
            cargarHistorialDisciplina()
        ]);
        historialDisciplina = historial;

        if (
            token !== ultimaCarga ||
            equipoMostrado !== equipo.id
        ) {
            return;
        }

        const jugadores = new Map(
            snapshotJugadores.docs.map(documento => [
                documento.id,
                {
                    id: documento.id,
                    ...documento.data()
                }
            ])
        );

        const encontrados = new Map();

        snapshotPrestamos.docs.forEach(documento => {
            const prestamo = {...documento.data(), id:documento.id};

            const destinoId =
                prestamo.equipoDestinoId ||
                prestamo.equipoId;

            if (
                destinoId !== equipo.id ||
                !esPrestamoVigente(prestamo)
            ) {
                return;
            }

            const jugador = jugadores.get(
                prestamo.jugadorId
            );

            if (!jugador || jugador.activo === false) {
                return;
            }

            const origenId = prestamo.equipoOrigenId;

            if (
                !origenId ||
                jugador.equipoId !== origenId ||
                origenId === equipo.id
            ) {
                return;
            }

            if (!encontrados.has(jugador.id)) {
                encontrados.set(jugador.id, {
                    jugador,
                    prestamo,
                    equipoOrigen: equiposLiga.find(
                        item => item.id === origenId
                    )
                });
            }
        });

        const refuerzos = [
            ...encontrados.values()
        ].sort((a, b) =>
            String(
                a.jugador.nombre ||
                a.jugador.nombreCompleto ||
                ""
            ).localeCompare(
                String(
                    b.jugador.nombre ||
                    b.jugador.nombreCompleto ||
                    ""
                ),
                "es"
            )
        );

        cantidad.textContent =
            `${refuerzos.length} ${
                refuerzos.length === 1
                    ? "refuerzo"
                    : "refuerzos"
            }`;

        lista.replaceChildren();
        lista.classList.remove("refuerzos-mensaje");
        lista.classList.add("refuerzos-lista");

        if (!refuerzos.length) {
            lista.classList.remove("refuerzos-lista");
            lista.classList.add("refuerzos-mensaje");

            lista.textContent =
                "Este equipo todavía no tiene préstamos activos autorizados.";

            return;
        }

        refuerzos.forEach(({
            jugador,
            prestamo,
            equipoOrigen
        }) => {
            lista.appendChild(
                crearTarjetaRefuerzo(
                    jugador,
                    prestamo,
                    equipoOrigen
                )
            );
        });
    } catch (error) {
        if (token !== ultimaCarga) {
            return;
        }

        console.error(
            "Error cargando refuerzos:",
            error
        );

        cantidad.textContent = "Sin verificar";

        lista.classList.remove("refuerzos-lista");
        lista.classList.add("refuerzos-mensaje");

        lista.textContent =
            "No pudimos consultar los préstamos. Verifica los permisos de Firebase o vuelve a intentarlo.";
    }
}

function crearTarjetaRefuerzo(
    jugador,
    prestamo,
    equipoOrigen
) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "refuerzo-tarjeta";

    const foto = String(
        jugador.fotoUrl || ""
    ).trim();

    let fotoElemento;

    if (foto.startsWith("https://")) {
        fotoElemento = document.createElement("img");
        fotoElemento.src = foto;
        fotoElemento.alt = "Fotografía del jugador";
        fotoElemento.loading = "lazy";
        fotoElemento.referrerPolicy = "no-referrer";
    } else {
        fotoElemento = document.createElement("div");

        fotoElemento.textContent = String(
            jugador.nombre ||
            jugador.nombreCompleto ||
            "J"
        ).charAt(0).toUpperCase();
    }

    fotoElemento.className = "refuerzo-foto";

    const informacion = document.createElement("div");
    informacion.className = "refuerzo-info";

    const nombre = document.createElement("strong");

    nombre.textContent =
        jugador.nombre ||
        jugador.nombreCompleto ||
        "Jugador";

    const origen = document.createElement("span");

    origen.textContent =
        `Equipo de origen: ${
            equipoOrigen?.nombre ||
            prestamo.equipoOrigenNombre ||
            "Sin identificar"
        }`;

    const categoria = document.createElement("span");

    categoria.textContent =
        `Categoría de origen: ${
            equipoOrigen?.categoriaNombre ||
            prestamo.categoriaOrigenNombre ||
            "Sin identificar"
        }`;

    const destino = obtenerEquipoSeleccionado();
    const estado = estadoCategoria(jugador,destino.categoriaId,historialDisciplina,temporadaDisciplina(destino));
    const disciplina = document.createElement("span");
    disciplina.textContent = textoDisciplina(estado);
    disciplina.style.color = estado.suspendido ? "#a62e23" : "#075d53";
    disciplina.style.fontWeight = "800";
    const etiquetaNumero = document.createElement("label");
    etiquetaNumero.textContent = "Dorsal en este equipo";
    const numero = document.createElement("input");
    numero.type = "text"; numero.inputMode = "numeric"; numero.maxLength = 3;
    numero.value = String(dorsalRefuerzo(jugador,prestamo));
    numero.setAttribute("aria-label","Dorsal del refuerzo " + nombre.textContent);
    numero.style.cssText = "box-sizing:border-box;width:100%;min-height:44px;margin:6px 0;border:1px solid #9ab6ac;border-radius:8px;padding:8px;background:#fff8e8;color:#163d33";
    const guardar = document.createElement("button");
    guardar.type = "button"; guardar.textContent = "Guardar dorsal";
    guardar.style.cssText = "min-height:44px;padding:8px 12px;background:#075d53;color:#fff;border:0;border-radius:8px";
    const mensaje = document.createElement("span"); mensaje.setAttribute("role","status");
    guardar.onclick = async () => {
        guardar.disabled = true; numero.disabled = true; mensaje.textContent = "Guardando…";
        try {
            prestamo.dorsalRefuerzo = await guardarDorsalRefuerzo(prestamo.id,numero.value);
            mensaje.textContent = "Dorsal actualizado. El de su categoría de origen se conserva. Vuelve a generar su credencial de refuerzo.";
        } catch(e) { mensaje.textContent = e.message; }
        finally { guardar.disabled = false; numero.disabled = false; }
    };
    etiquetaNumero.append(numero);
    const distintivo = document.createElement("span");
    distintivo.className = "refuerzo-distintivo";
    distintivo.textContent = "REFUERZO APROBADO";

    informacion.append(
        nombre,
        origen,
        categoria,
        distintivo,
        disciplina,
        etiquetaNumero,
        guardar,
        mensaje
    );

    tarjeta.append(
        fotoElemento,
        informacion
    );

    return tarjeta;
}
