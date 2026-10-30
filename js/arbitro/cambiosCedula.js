import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { revisarSecuenciaCambios } from "./reglasCambiosCedula.js";

function validarCambio(cambio, listas) {
    const lista = listas[cambio.equipo];

    if (!lista) {
        return "Selecciona el equipo del cambio.";
    }

    if (!lista.some(j => j.id === cambio.saleJugadorId)) {
        return "Selecciona un jugador que sale del equipo indicado.";
    }

    if (!lista.some(j => j.id === cambio.entraJugadorId)) {
        return "Selecciona un jugador que entra del equipo indicado.";
    }

    if (cambio.saleJugadorId === cambio.entraJugadorId) {
        return "El jugador que sale y el que entra deben ser diferentes.";
    }

    if (!/^\d{1,3}(\+\d{1,2})?$/.test(String(cambio.minuto || ""))) {
        return "Indica el minuto: por ejemplo, 15 o 30+2.";
    }

    return "";
}

export async function crearControlCambios({
    db, partido, jugadoresLocal, jugadoresVisitante,
    contenedor, bloqueada = false, avisar = () => {},
    obtenerAlineaciones = null
}) {
    const [snapshot, categoriaSnapshot] = await Promise.all([
        getDoc(doc(db, "cedulas", partido.id)),
        partido.categoriaId
            ? getDoc(doc(db, "categorias", partido.categoriaId))
            : Promise.resolve(null)
    ]);

    const categoria = {
        ...(categoriaSnapshot?.exists()
            ? categoriaSnapshot.data()
            : {}),
        nombre: partido.categoriaNombre ||
            (categoriaSnapshot?.exists()
                ? categoriaSnapshot.data().nombre
                : "")
    };

    const datos = snapshot.exists()
        ? snapshot.data()
        : {};

    let cerrada = bloqueada ||
        ["registrada", "enviada"].includes(datos.estado);

    const cambios = Array.isArray(datos.cambios)
        ? datos.cambios.map(cambio => ({ ...cambio }))
        : [];

    const listas = {
        local: jugadoresLocal,
        visitante: jugadoresVisitante
    };

    const nombres = {
        local: partido.localNombre || "Equipo local",
        visitante: partido.visitanteNombre || "Equipo visitante"
    };

    const bloque = document.createElement("section");
    bloque.className = "cedula-bloque cambios-cedula";

    bloque.innerHTML = `
        <div class="seccion-header">
            <div>
                <span>CAMBIOS</span>
                <h2>Cambios de jugadores</h2>
                <p>
                    Registra quién sale, quién entra y el minuto.
                    Cambios ilimitados.
                </p>
            </div>
        </div>

        <div class="cambios-controles">
            <label>
                Equipo
                <select data-cambio="equipo"></select>
            </label>

            <label>
                Sale
                <select data-cambio="sale"></select>
            </label>

            <label>
                Entra
                <select data-cambio="entra"></select>
            </label>

            <label>
                Minuto
                <input
                    data-cambio="minuto"
                    type="text"
                    maxlength="6"
                    placeholder="15 o 30+2"
                    autocomplete="off"
                >
            </label>

            <button
                type="button"
                class="btn-secundario"
                data-cambio="agregar"
            >
                Registrar cambio
            </button>
        </div>

        <p
            class="cambios-situacion"
            role="status"
            aria-live="polite"
        ></p>

        <div
            class="cambios-lista"
            aria-live="polite"
        ></div>
    `;

    const resumen = contenedor.querySelector(
        ".resumen-cedula"
    );

    if (resumen) {
        contenedor.insertBefore(bloque, resumen);
    } else {
        contenedor.appendChild(bloque);
    }

    if (!document.getElementById("estilosCambiosCedula")) {
        const estilos = document.createElement("style");
        estilos.id = "estilosCambiosCedula";

        estilos.textContent = `
            .cambios-controles {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:12px;
                margin-bottom:14px;
            }
            .cambios-controles label {
                display:flex;
                flex-direction:column;
                gap:6px;
                min-width:0;
                font-size:.75rem;
                font-weight:700;
            }
            .cambios-controles select,
            .cambios-controles input {
                width:100%;
                min-height:44px;
                padding:10px;
                border:1px solid #bba87b;
                border-radius:10px;
                background:#fff8e8;
                color:#102b28;
                font:inherit;
                box-sizing:border-box;
            }
            .cambios-controles button {
                grid-column:1/-1;
            }
            .cambios-lista {
                display:flex;
                flex-direction:column;
                gap:8px;
            }
            .cambio-registro {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                padding:12px;
                border:1px solid #cbd5d1;
                border-radius:10px;
                background:#fff8e8;
                break-inside:avoid;
            }
            .cambio-registro strong,
            .cambio-registro span {
                display:block;
                overflow-wrap:anywhere;
            }
            .cambio-registro strong {
                font-size:.75rem;
                color:#07574f;
            }
            .cambio-registro span,
            .cambios-vacio {
                font-size:.73rem;
                margin-top:5px;
            }
            .cambio-registro button {
                min-height:40px;
                padding:8px;
                border:1px solid #cfb5a9;
                border-radius:8px;
                background:#fff1eb;
                color:#8d3422;
                cursor:pointer;
            }
            .cambios-situacion {
                margin:0 0 16px;
                padding:12px 14px;
                border:1px solid #c8dcd1;
                border-radius:12px;
                background:#eaf3eb;
                color:#135a45;
                font-size:.76rem;
                font-weight:700;
                line-height:1.6;
                overflow-wrap:anywhere;
            }
            .cambios-situacion-error {
                border-color:#dbb3a5;
                background:#fff0e8;
                color:#943b2d;
            }
            .cambios-situacion[hidden] {
                display:none;
            }
            @media(max-width:520px) {
                .cambios-controles {
                    grid-template-columns:1fr;
                }
                .cambio-registro {
                    align-items:flex-start;
                    flex-wrap:wrap;
                }
            }
            @media print {
                .cambios-controles,
                .cambios-situacion,
                .cambio-registro button {
                    display:none!important;
                }
                .cambio-registro {
                    background:#fff!important;
                }
            }
        `;

        document.head.appendChild(estilos);
    }

    const equipo = bloque.querySelector(
        '[data-cambio="equipo"]'
    );

    const sale = bloque.querySelector(
        '[data-cambio="sale"]'
    );

    const entra = bloque.querySelector(
        '[data-cambio="entra"]'
    );

    const minuto = bloque.querySelector(
        '[data-cambio="minuto"]'
    );

    const agregar = bloque.querySelector(
        '[data-cambio="agregar"]'
    );

    const listado = bloque.querySelector(
        ".cambios-lista"
    );

    const situacion = bloque.querySelector(
        ".cambios-situacion"
    );

    Object.entries(nombres).forEach(([valor, nombre]) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = nombre;
        equipo.appendChild(opcion);
    });

    equipo.value = "local";

    function revisar(historial = cambios) {
        return revisarSecuenciaCambios({
            cambios: historial,
            alineaciones:
                typeof obtenerAlineaciones === "function"
                    ? obtenerAlineaciones()
                    : datos.alineaciones,
            listas,
            categoria
        });
    }

    function actualizarEstado() {
        situacion.hidden = cerrada;

        if (cerrada) return;

        const resultado = revisar();

        situacion.classList.toggle(
            "cambios-situacion-error",
            !resultado.ok
        );

        situacion.textContent = resultado.ok
            ? "Niñas mayores en cancha · Local: " +
                resultado.cupos.local.cantidad + "/" +
                resultado.cupos.local.limite +
                " · Visitante: " +
                resultado.cupos.visitante.cantidad + "/" +
                resultado.cupos.visitante.limite
            : resultado.mensaje;
    }

    function cargarOpciones() {
        const resultado = revisar();

        const idsEnCancha = new Set(
            resultado.ok
                ? resultado.enCancha[equipo.value] || []
                : []
        );

        [sale, entra].forEach(select => {
            const anterior = select.value;

            select.replaceChildren();

            const vacia = document.createElement("option");
            vacia.value = "";
            vacia.textContent = "Selecciona un jugador";
            select.appendChild(vacia);

            (listas[equipo.value] || [])
                .filter(jugador =>
                    !resultado.ok ||
                    (
                        select === sale
                            ? idsEnCancha.has(jugador.id)
                            : !idsEnCancha.has(jugador.id)
                    )
                )
                .forEach(jugador => {
                    const opcion = document.createElement("option");
                    opcion.value = jugador.id;

                    opcion.textContent =
                        `#${jugador.numero ?? jugador.dorsal ?? "-"} ${jugador.nombreCompleto || jugador.nombre || "Jugador"}${jugador.esRefuerzo ? " · Refuerzo" : ""}`;

                    select.appendChild(opcion);
                });

            select.value = [...select.options].some(
                opcion => opcion.value === anterior
            )
                ? anterior
                : "";
        });
    }

    function renderizar() {
        listado.replaceChildren();

        if (!cambios.length) {
            const vacio = document.createElement("p");
            vacio.className = "cambios-vacio";
            vacio.textContent =
                "Sin cambios registrados en esta cédula.";
            listado.appendChild(vacio);
        }

        cambios.forEach((cambio, indice) => {
            const fila = document.createElement("div");
            fila.className = "cambio-registro";

            const informacion = document.createElement("div");

            const encabezado = document.createElement("strong");
            encabezado.textContent =
                `${cambio.equipoNombre || nombres[cambio.equipo] || "Equipo"} · Minuto ${cambio.minuto ?? "-"}`;

            const salida = document.createElement("span");
            salida.textContent =
                `Sale: #${cambio.saleNumero ?? "-"} ${cambio.saleJugadorNombre || "Jugador"}${cambio.saleEsRefuerzo ? " · Refuerzo autorizado" : ""}`;

            const entrada = document.createElement("span");
            entrada.textContent =
                `Entra: #${cambio.entraNumero ?? "-"} ${cambio.entraJugadorNombre || "Jugador"}${cambio.entraEsRefuerzo ? " · Refuerzo autorizado" : ""}`;

            informacion.append(
                encabezado,
                salida,
                entrada
            );

            fila.appendChild(informacion);

            if (!cerrada) {
                const quitar = document.createElement("button");
                quitar.type = "button";
                quitar.textContent = "Quitar";

                quitar.setAttribute(
                    "aria-label",
                    `Quitar cambio ${indice + 1}`
                );

                quitar.addEventListener("click", () => {
                    if (cerrada) return;

                    cambios.splice(indice, 1);
                    renderizar();
                });

                fila.appendChild(quitar);
            }

            listado.appendChild(fila);
        });

        [equipo, sale, entra, minuto, agregar].forEach(
            control => {
                control.disabled = cerrada;
            }
        );

        actualizarEstado();
        cargarOpciones();
    }

    equipo.addEventListener("change", cargarOpciones);
    sale.addEventListener("focus", cargarOpciones);
    entra.addEventListener("focus", cargarOpciones);
    bloque.addEventListener("focusin", actualizarEstado);

    agregar.addEventListener("click", () => {
        if (cerrada) return;

        const candidato = {
            equipo: equipo.value,
            saleJugadorId: sale.value,
            entraJugadorId: entra.value,
            minuto: minuto.value.trim()
        };

        const error = validarCambio(candidato, listas);

        if (error) {
            avisar(error);
            return;
        }

        const secuencia = revisar([
            ...cambios,
            candidato
        ]);

        if (!secuencia.ok) {
            avisar(secuencia.mensaje);
            actualizarEstado();
            return;
        }

        const saleJugador = listas[candidato.equipo]
            .find(j => j.id === candidato.saleJugadorId);

        const entraJugador = listas[candidato.equipo]
            .find(j => j.id === candidato.entraJugadorId);

        cambios.push({
            ...candidato,
            id: globalThis.crypto?.randomUUID?.() ||
                `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            equipoId: candidato.equipo === "local"
                ? partido.localId
                : partido.visitanteId,
            equipoNombre: nombres[candidato.equipo],
            saleJugadorNombre:
                saleJugador.nombreCompleto ||
                saleJugador.nombre ||
                "Jugador",
            saleNumero: String(
                saleJugador.numero ??
                saleJugador.dorsal ??
                "-"
            ),
            saleEsRefuerzo:
                saleJugador.esRefuerzo === true,
            entraJugadorNombre:
                entraJugador.nombreCompleto ||
                entraJugador.nombre ||
                "Jugador",
            entraNumero: String(
                entraJugador.numero ??
                entraJugador.dorsal ??
                "-"
            ),
            entraEsRefuerzo:
                entraJugador.esRefuerzo === true
        });

        sale.value = "";
        entra.value = "";
        minuto.value = "";

        renderizar();
    });

    cargarOpciones();
    renderizar();

    return {
        obtenerDatos: () =>
            cambios.map(cambio => ({ ...cambio })),

        actualizar() {
            cargarOpciones();
            actualizarEstado();
        },

        validar() {
            for (
                let indice = 0;
                indice < cambios.length;
                indice++
            ) {
                const error = validarCambio(
                    cambios[indice],
                    listas
                );

                if (error) {
                    return {
                        ok: false,
                        mensaje:
                            `Cambio ${indice + 1}: ${error}`
                    };
                }
            }

            return cambios.length
                ? revisar()
                : { ok: true };
        },

        bloquear() {
            cerrada = true;
            renderizar();
        }
    };
}