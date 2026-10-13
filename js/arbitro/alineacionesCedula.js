import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { evaluarJugadorCategoria, validarCupoNinasMayores, limiteNinasMayores } from "../reglasParticipacion.js";

export async function crearControlAlineaciones({
    db, partido, jugadoresLocal, jugadoresVisitante,
    contenedorLocal, contenedorVisitante, bloqueada = false,
    avisar = () => {}
}) {
    const [categoriaSnapshot, cedulaSnapshot] = await Promise.all([
        partido.categoriaId
            ? getDoc(doc(db, "categorias", partido.categoriaId))
            : Promise.resolve(null),
        getDoc(doc(db, "cedulas", partido.id))
    ]);

    const categoria = categoriaSnapshot?.exists()
        ? categoriaSnapshot.data() : {};

    const categoriaParticipacion = {
        ...categoria,
        nombre: partido.categoriaNombre || categoria.nombre || ""
    };

    const cedula = cedulaSnapshot.exists()
        ? cedulaSnapshot.data() : {};

    const guardada = cedula.alineaciones || {};

    const nombre = String(partido.categoriaNombre || categoria.nombre || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const superBebe = nombre === "super bebe";
    const baseGuardada = Number(guardada.jugadoresEnCanchaBase);

    const base = superBebe ? 5 : [5, 9, 11].includes(baseGuardada)
        ? baseGuardada : Number(categoria.jugadoresEnCancha || 0);

    const opciones = superBebe
        ? [5, 6, 7]
        : [5, 9, 11].includes(base) ? [base] : [];

    let limite = opciones.includes(Number(guardada.jugadoresEnCancha))
        ? Number(guardada.jugadoresEnCancha) : base;

    let acuerdo = guardada.acuerdoSuperBebe === true;
    let cerrada = bloqueada || ["registrada", "enviada"].includes(cedula.estado);
    let historicaSinClasificar = cerrada && !Array.isArray(guardada.titularesLocal);

    const lados = [
        { clave: "Local", lista: jugadoresLocal, contenedor: contenedorLocal },
        { clave: "Visitante", lista: jugadoresVisitante, contenedor: contenedorVisitante }
    ].map(lado => {
        const disponibles = new Set(lado.lista.map(jugador => jugador.id));
        const almacenados = Array.isArray(guardada["titulares" + lado.clave])
            ? guardada["titulares" + lado.clave] : [];

        return {
            ...lado,
            titulares: new Set(almacenados.filter(id => disponibles.has(id))),
            controles: []
        };
    });

    if (!document.getElementById("estilosAlineacionesCedula")) {
        const estilos = document.createElement("style");
        estilos.id = "estilosAlineacionesCedula";
        estilos.textContent = `
            .alineacion-resumen {
                padding:10px 12px;
                border-bottom:1px solid #cbd5d1;
                font-size:.72rem;
                font-weight:800;
                color:#07574f;
            }
            .alineacion-config {
                display:flex;
                flex-wrap:wrap;
                gap:8px;
                padding:10px 12px;
                font-size:.72rem;
                align-items:center;
            }
            .alineacion-config select {
                min-height:42px;
                padding:6px;
                border:1px solid #bba87b;
                border-radius:8px;
                background:#fff8e8;
            }
            .alineacion-acuerdo {
                display:flex;
                align-items:center;
                gap:8px;
                width:100%;
            }
            .alineacion-opcion {
                display:flex;
                align-items:center;
                gap:5px;
                margin-left:auto;
                padding:5px 7px;
                border-radius:8px;
                background:#e7ece9;
                font-size:.65rem;
                white-space:nowrap;
            }
            .alineacion-opcion:has(input:checked) {
                background:#d7ece6;
                color:#07574f;
            }
            .alineacion-opcion input,
            .alineacion-acuerdo input {
                width:20px;
                height:20px;
                accent-color:#0b756d;
            }
            .jugador-cedula-item:has(.alineacion-opcion) {
                flex-wrap:wrap;
            }
            .alineacion-resumen-error {
                color:#923a2c;
                background:#fff0e8;
            }
            .alineacion-cupo {
                display:block;
                margin-top:6px;
                font-size:.68rem;
                line-height:1.5;
            }
            .alineacion-nina-mayor {
                padding:5px 8px;
                border:1px solid #d7bd7c;
                border-radius:8px;
                background:#fff0c7;
                color:#765820;
                font-size:.64rem;
                font-weight:800;
                line-height:1.4;
            }
            @media(max-width:600px) {
                .alineacion-resumen {
                    padding:12px;
                    line-height:1.6;
                }
                .alineacion-opcion {
                    min-height:40px;
                    padding:8px 10px;
                }
                .alineacion-nina-mayor {
                    white-space:normal;
                }
            }
            @media print {
                .alineacion-config {
                    display:none!important;
                }
                .alineacion-opcion input {
                    display:none!important;
                }
                .alineacion-opcion,
                .alineacion-resumen {
                    break-inside:avoid;
                }
            }
        `;
        document.head.appendChild(estilos);
    }

    let selector = null;
    let confirmarAcuerdo = null;

    if (superBebe) {
        const configuracion = document.createElement("div");
        configuracion.className = "alineacion-config";

        const etiqueta = document.createElement("label");
        etiqueta.textContent = "Jugadores en cancha ";

        selector = document.createElement("select");
        selector.setAttribute(
            "aria-label",
            "Jugadores en cancha para ambos equipos"
        );

        opciones.forEach(numero => {
            const opcion = document.createElement("option");
            opcion.value = String(numero);
            opcion.textContent = `${numero} contra ${numero}`;
            selector.appendChild(opcion);
        });

        selector.value = String(limite);
        etiqueta.appendChild(selector);

        const etiquetaAcuerdo = document.createElement("label");
        etiquetaAcuerdo.className = "alineacion-acuerdo";

        confirmarAcuerdo = document.createElement("input");
        confirmarAcuerdo.type = "checkbox";
        confirmarAcuerdo.checked = acuerdo;

        const texto = document.createElement("span");
        texto.textContent =
            "Ambos jefes acordaron jugar 6 contra 6 o 7 contra 7.";

        etiquetaAcuerdo.append(confirmarAcuerdo, texto);
        configuracion.append(etiqueta, etiquetaAcuerdo);
        contenedorLocal.prepend(configuracion);

        selector.addEventListener("change", () => {
            const propuesto = Number(selector.value);

            if (
                cerrada ||
                lados.some(lado => lado.titulares.size > propuesto)
            ) {
                selector.value = String(limite);

                if (!cerrada) {
                    avisar(
                        "Desmarca los titulares adicionales antes de reducir el número en cancha."
                    );
                }

                return;
            }

            limite = propuesto;
            actualizar();
        });

        confirmarAcuerdo.addEventListener("change", () => {
            if (cerrada) {
                confirmarAcuerdo.checked = acuerdo;
                return;
            }

            acuerdo = confirmarAcuerdo.checked;
            actualizar();
        });
    }

    lados.forEach(lado => {
        lado.resumen = document.createElement("div");
        lado.resumen.className = "alineacion-resumen";
        lado.resumen.setAttribute("aria-live", "polite");
        lado.contenedor.prepend(lado.resumen);

        const filas = lado.contenedor.querySelectorAll(
            ".jugador-cedula-item"
        );

        if (filas.length !== lado.lista.length) {
            throw new Error(
                "La plantilla visible no coincide con los jugadores del pase de lista."
            );
        }

        lado.lista.forEach((jugador, indice) => {
            const etiqueta = document.createElement("label");
            etiqueta.className = "alineacion-opcion";

            const entrada = document.createElement("input");
            entrada.type = "checkbox";
            entrada.checked = lado.titulares.has(jugador.id);

            entrada.setAttribute(
                "aria-label",
                `Marcar titular: ${jugador.nombreCompleto || jugador.nombre || "Jugador"}`
            );

            const texto = document.createElement("span");
            etiqueta.append(entrada, texto);
            filas[indice].appendChild(etiqueta);

            const participacion = evaluarJugadorCategoria(
                jugador,
                categoriaParticipacion,
                { permitirMenores: true }
            );

            if (
                participacion.valido &&
                participacion.esNinaMayor
            ) {
                const distintivo = document.createElement("span");
                distintivo.className = "alineacion-nina-mayor";
                distintivo.textContent = "Niña del año adicional";
                filas[indice].appendChild(distintivo);
            }

            lado.controles.push({
                entrada,
                texto,
                id: jugador.id
            });

            entrada.addEventListener("change", () => {
                if (cerrada) {
                    actualizar();
                    return;
                }

                if (
                    entrada.checked &&
                    (
                        !opciones.length ||
                        lado.titulares.size >= limite
                    )
                ) {
                    entrada.checked = false;

                    avisar(
                        opciones.length
                            ? `El máximo es de ${limite} titulares por equipo.`
                            : "Configura los jugadores en cancha de esta categoría."
                    );

                    return;
                }

                if (entrada.checked) {
                    const propuestos = lado.lista.filter(
                        elemento =>
                            lado.titulares.has(elemento.id) ||
                            elemento.id === jugador.id
                    );

                    const resultado = validarCupoNinasMayores(
                        propuestos,
                        categoriaParticipacion
                    );

                    if (!resultado.valido) {
                        entrada.checked = false;
                        avisar(resultado.mensaje);
                        actualizar();
                        return;
                    }

                    lado.titulares.add(jugador.id);
                } else {
                    lado.titulares.delete(jugador.id);
                }

                actualizar();
            });
        });
    });

    function actualizar() {
        lados.forEach(lado => {
            lado.resumen.textContent = historicaSinClasificar
                ? "Cédula anterior sin titulares registrados."
                : opciones.length
                    ? `${lado.titulares.size}/${limite} titulares · ${lado.lista.length - lado.titulares.size} suplentes${superBebe && limite > 5 ? acuerdo ? " · Acuerdo de ambos jefes registrado" : " · Falta confirmar el acuerdo" : ""}`
                    : "Falta configurar los jugadores en cancha de la categoría.";

            const enCancha = lado.lista.filter(
                jugador => lado.titulares.has(jugador.id)
            );

            const resultado = validarCupoNinasMayores(
                enCancha,
                categoriaParticipacion
            );

            lado.resumen.classList.toggle(
                "alineacion-resumen-error",
                !historicaSinClasificar && !resultado.valido
            );

            if (
                !historicaSinClasificar &&
                opciones.length
            ) {
                const contador = document.createElement("span");
                contador.className = "alineacion-cupo";

                contador.textContent = resultado.valido
                    ? "Niñas del año adicional en cancha: " +
                        resultado.cantidad + "/" +
                        limiteNinasMayores(categoriaParticipacion)
                    : resultado.mensaje;

                lado.resumen.appendChild(contador);
            }

            lado.controles.forEach(control => {
                control.entrada.checked =
                    lado.titulares.has(control.id);

                control.entrada.disabled =
                    cerrada || !opciones.length;

                control.texto.textContent =
                    historicaSinClasificar
                        ? "Sin clasificación"
                        : control.entrada.checked
                            ? "Titular"
                            : "Suplente";
            });
        });

        if (selector) selector.disabled = cerrada;
        if (confirmarAcuerdo) confirmarAcuerdo.disabled = cerrada;
    }

    actualizar();

    return {
        obtenerDatos() {
            const datos = {
                version: 1,
                jugadoresEnCanchaBase: base,
                jugadoresEnCancha: limite,
                acuerdoSuperBebe:
                    superBebe && limite > 5 && acuerdo
            };

            lados.forEach(lado => {
                datos["titulares" + lado.clave] = lado.lista
                    .filter(j => lado.titulares.has(j.id))
                    .map(j => j.id);

                datos["suplentes" + lado.clave] = lado.lista
                    .filter(j => !lado.titulares.has(j.id))
                    .map(j => j.id);
            });

            return datos;
        },

        validar() {
            if (!opciones.length) {
                return {
                    ok: false,
                    mensaje:
                        "Configura los jugadores en cancha de la categoría antes de enviar la cédula."
                };
            }

            if (superBebe && limite > 5 && !acuerdo) {
                return {
                    ok: false,
                    mensaje:
                        "Confirma el acuerdo de ambos jefes para jugar 6 contra 6 o 7 contra 7."
                };
            }

            for (const lado of lados) {
                if (lado.titulares.size > limite) {
                    return {
                        ok: false,
                        mensaje:
                            `El equipo ${lado.clave.toLowerCase()} supera los ${limite} titulares permitidos.`
                    };
                }

                const resultado = validarCupoNinasMayores(
                    lado.lista.filter(
                        jugador =>
                            lado.titulares.has(jugador.id)
                    ),
                    categoriaParticipacion
                );

                if (!resultado.valido) {
                    return {
                        ok: false,
                        mensaje:
                            "Equipo " +
                            lado.clave.toLowerCase() +
                            ": " +
                            resultado.mensaje
                    };
                }

                if (
                    lado.lista.length &&
                    !lado.titulares.size
                ) {
                    return {
                        ok: false,
                        mensaje:
                            `Marca los titulares del equipo ${lado.clave.toLowerCase()}.`
                    };
                }
            }

            return { ok: true };
        },

        bloquear() {
            cerrada = true;
            historicaSinClasificar = false;
            actualizar();
        }
    };
}