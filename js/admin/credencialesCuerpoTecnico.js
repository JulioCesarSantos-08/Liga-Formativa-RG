import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db, auth } from "../firebase.js";
import { protegerPagina, usuarioTieneRol } from "../roles.js";
import { prepararQrTecnico } from "./qrCredencialTecnico.js";

function urlSegura(valor) {
    try {
        const url = new URL(valor);
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function completo(datos) {
    return Boolean(
        urlSegura(datos.fotoUrl) &&
        urlSegura(datos.curpPdfUrl) &&
        /^[A-Z0-9]{18}$/.test(datos.curp || "")
    );
}

function activo(equipo) {
    return equipo.activo !== false &&
        equipo.descalificado !== true &&
        !["inactivo", "descalificado"].includes(
            String(equipo.estado || "").toLowerCase()
        );
}

function construirRegistros(usuarios, equipos) {
    const registros = [];

    usuarios.forEach(usuario => {
        const asignados = equipos.filter(
            equipo =>
                equipo.responsableId === usuario.id &&
                activo(equipo)
        );

        const grupos = new Map();

        asignados.forEach(equipo => {
            const clave = equipo.clubId
                ? "club_" + equipo.clubId
                : "equipo_" + equipo.id;

            if (!grupos.has(clave)) {
                grupos.set(clave, []);
            }

            grupos.get(clave).push(equipo);
        });

        grupos.forEach((grupo, clave) => {
            const datos = usuario.documentacionJefeEquipo || {};

            const categorias = [
                ...new Set(
                    grupo.map(
                        equipo =>
                            String(equipo.categoriaNombre || "").trim()
                    ).filter(Boolean)
                )
            ];

            registros.push({
                id: "D|" + usuario.id + "|" + clave,
                tipo: "director",
                clave,
                cargo: "Director Técnico",
                responsableId: usuario.id,
                nombre: String(
                    usuario.nombre ||
                    usuario.nombreCompleto ||
                    "Director Técnico"
                ).trim().toUpperCase(),
                equipoNombre: grupo[0].clubNombre ||
                    [
                        ...new Set(
                            grupo.map(
                                equipo => equipo.nombre || "Equipo"
                            )
                        )
                    ].join(" / "),
                equipos: grupo,
                categorias,
                datos,
                version: Number(datos.version || 0),
                listo:
                    usuario.activo !== false &&
                    completo(datos) &&
                    categorias.length > 0 &&
                    grupo.every(
                        equipo =>
                            equipo.categoriaId &&
                            equipo.categoriaNombre
                    )
            });
        });

        asignados.forEach(equipo => {
            const datos = equipo.auxiliarTecnico || {};

            registros.push({
                id: "A|" + equipo.id,
                tipo: "auxiliar",
                cargo: "Auxiliar Técnico",
                responsableId: usuario.id,
                nombre: String(
                    datos.nombre || "Auxiliar pendiente"
                ).trim().toUpperCase(),
                equipoNombre:
                    equipo.nombre ||
                    equipo.clubNombre ||
                    "Equipo",
                equipos: [equipo],
                categorias: equipo.categoriaNombre
                    ? [equipo.categoriaNombre]
                    : [],
                datos,
                version: Number(datos.version || 0),
                listo:
                    usuario.activo !== false &&
                    String(datos.nombre || "").trim().length >= 3 &&
                    completo(datos) &&
                    Boolean(
                        equipo.categoriaId &&
                        equipo.categoriaNombre
                    )
            });
        });
    });

    return registros.sort(
        (a, b) =>
            a.nombre.localeCompare(b.nombre, "es") ||
            a.equipoNombre.localeCompare(b.equipoNombre, "es")
    );
}

async function validarAdmin(uid) {
    const snapshot = await getDoc(doc(db, "usuarios", uid));

    if (
        auth.currentUser?.uid !== uid ||
        !snapshot.exists() ||
        snapshot.data().rol !== "admin" ||
        snapshot.data().activo === false
    ) {
        throw new Error("Se requiere una sesión administradora activa.");
    }
}

async function consultarUsuariosJefesEquipo() {
    const referencia = collection(db, "usuarios");

    const resultados = await Promise.allSettled([
        getDocs(
            query(
                referencia,
                where("rol", "==", "jefeEquipo")
            )
        ),
        getDocs(
            query(
                referencia,
                where("roles", "array-contains", "jefeEquipo")
            )
        )
    ]);

    const fallo = resultados.find(
        resultado =>
            resultado.status === "rejected"
    );

    if (fallo) {
        throw fallo.reason;
    }

    const unicos = new Map();

    for (const resultado of resultados) {
        for (const documento of resultado.value.docs) {
            if (
                usuarioTieneRol(
                    documento.data(),
                    "jefeEquipo"
                )
            ) {
                unicos.set(
                    documento.id,
                    documento
                );
            }
        }
    }

    return {
        docs: [...unicos.values()]
    };
}

async function consultar() {
    const [usuarios, equipos, temporadas] = await Promise.all([
        consultarUsuariosJefesEquipo(),
        getDocs(collection(db, "equipos")),
        getDocs(collection(db, "temporadas"))
    ]);

    const listaTemporadas = temporadas.docs.map(
        item => item.data()
    );

    const actual = listaTemporadas.find(
        item =>
            item.activa === true ||
            String(item.estado || "").toLowerCase() === "activa"
    ) || listaTemporadas.find(
        item =>
            String(item.estado || "").toLowerCase() === "proxima"
    );

    return {
        registros: construirRegistros(
            usuarios.docs.map(
                item => ({ ...item.data(), id: item.id })
            ),
            equipos.docs.map(
                item => ({ ...item.data(), id: item.id })
            )
        ),
        temporada:
            actual?.nombre ||
            actual?.temporada ||
            actual?.titulo ||
            "Temporada vigente"
    };
}

function crearTarjeta(registro, temporada) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "ca-preview";

    const greca = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M2 22V2H22V18H8V8H16V12H12"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linejoin="round"
            />
        </svg>
    `;

    tarjeta.innerHTML = `
        <article class="ca-card ct-card ${registro.tipo === "auxiliar" ? "ct-aux" : ""}">
            <div class="ca-marco">
                <img class="ca-marca" src="imagenes/logo.png" alt="">
                <div class="ca-greca g1">${greca}</div>
                <div class="ca-greca g2">${greca}</div>
                <div class="ca-greca g3">${greca}</div>
                <div class="ca-greca g4">${greca}</div>

                <header class="ca-encabezado">
                    <img
                        class="ca-logo"
                        src="imagenes/logo.png"
                        alt="Liga Río Grande"
                    >
                    <div class="ca-titulos">
                        <strong>LIGA MUNICIPAL<br>DE FÚTBOL</strong>
                        <span>
                            RÍO GRANDE<br>
                            VILLA DE TUTUTEPEC, OAXACA
                        </span>
                    </div>
                </header>

                <div class="ca-temporada"></div>
                <div class="ca-rol"></div>

                <div class="ca-identidad">
                    <div class="ca-foto-marco">
                        <img
                            class="ca-foto"
                            alt="Fotografía del integrante del cuerpo técnico"
                        >
                    </div>
                    <div class="ca-datos">
                        <small>NOMBRE</small>
                        <strong class="ca-nombre"></strong>
                        <small>EQUIPO / CLUB</small>
                        <span class="ct-equipo"></span>
                    </div>
                </div>

                <div class="ct-autorizaciones">
                    <strong>CATEGORÍAS AUTORIZADAS</strong>
                    <span class="ct-categorias"></span>
                </div>

                <div class="ca-validacion">
                    <div class="ca-qr-bloque">
                        <canvas
                            class="ca-qr-canvas"
                            width="300"
                            height="300"
                        ></canvas>
                        <span>ESCANEA PARA VERIFICAR</span>
                    </div>

                    <div class="ca-firma-bloque">
                        <div>
                            <img
                                class="ca-sello"
                                src="imagenes/sello.png"
                                alt="Sello de la liga"
                            >
                            <img
                                class="ca-firma"
                                src="imagenes/firma.png"
                                alt="Firma del presidente"
                            >
                        </div>
                        <strong>PRESIDENTE DE LA LIGA</strong>
                        <span>FIRMA Y SELLO OFICIAL</span>
                    </div>
                </div>

                <div class="ca-folio">PREPARANDO CÓDIGO</div>
                <div class="ca-pie">LIGA MUNICIPAL · RÍO GRANDE</div>
            </div>
        </article>
    `;

    tarjeta.querySelector(".ca-temporada").textContent =
        String(temporada).toUpperCase();

    tarjeta.querySelector(".ca-rol").textContent =
        registro.cargo.toUpperCase();

    tarjeta.querySelector(".ca-nombre").textContent =
        registro.nombre;

    tarjeta.querySelector(".ct-equipo").textContent =
        registro.equipoNombre;

    tarjeta.querySelector(".ct-categorias").textContent =
        registro.categorias.join(" · ");

    tarjeta.querySelector(".ca-foto").src =
        urlSegura(registro.datos.fotoUrl);

    return tarjeta;
}

async function esperarImagenes(raiz) {
    await Promise.all(
        [...raiz.querySelectorAll("img")].map(
            imagen => new Promise((resolve, reject) => {
                let timer;

                const terminar = error => {
                    clearTimeout(timer);
                    imagen.removeEventListener("load", cargar);
                    imagen.removeEventListener("error", fallar);

                    error ? reject(error) : resolve();
                };

                const cargar = () => terminar();

                const fallar = () => terminar(
                    new Error("No se pudo cargar una fotografía, el logo, la firma o el sello.")
                );

                if (imagen.complete) {
                    return imagen.naturalWidth
                        ? resolve()
                        : fallar();
                }

                imagen.addEventListener("load", cargar);
                imagen.addEventListener("error", fallar);

                timer = setTimeout(
                    () => terminar(
                        new Error("La carga de imágenes tardó demasiado.")
                    ),
                    12000
                );
            })
        )
    );
}

async function iniciar() {
    const usuario = await protegerPagina(["admin"]);
    if (!usuario) return;

    const uid = usuario.firebaseUser?.uid || usuario.uid;
    const principal = document.querySelector(".jefes-contenido");

    if (
        !principal ||
        document.getElementById("credencialesCuerpoTecnicoPanel")
    ) {
        return;
    }

    const estilos = document.createElement("style");

    estilos.textContent = `
        .ct-card .ca-marco {
            grid-template-rows: 16fr 3fr 5fr 25fr 13fr 32fr 3fr 3fr;
        }

        .ct-card .ca-logo {
            width: 16cqw;
            height: 16cqw;
            flex-basis: 16cqw;
        }

        .ct-card .ca-titulos strong {
            font-size: 3.7cqw;
        }

        .ct-card .ca-rol {
            font-size: 2.8cqw;
            letter-spacing: .03em;
        }

        .ct-card .ca-nombre {
            font-size: 3cqw;
        }

        .ct-card .ca-datos {
            gap: .5cqw;
        }

        .ct-card .ct-equipo {
            font-size: 2.7cqw;
            font-weight: 800;
        }

        .ct-card .ca-datos small {
            font-size: 1.8cqw;
        }

        .ct-autorizaciones {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: .8cqw;
            padding: 1cqw 2cqw;
            border: 1px solid #c6ae78;
            border-radius: .7cqw;
            background: #faf1db;
        }

        .ct-autorizaciones strong {
            font-size: 1.9cqw;
            line-height: 1.2;
            color: #0d5048;
        }

        .ct-card .ct-categorias {
            display: block;
            font-size: 2.4cqw;
            line-height: 1.25;
            font-weight: 700;
            color: #274c54;
            overflow-wrap: anywhere;
        }

        .ct-aux .ca-rol {
            background: linear-gradient(110deg,#164563,#6c4829);
        }
    `;

    document.head.appendChild(estilos);

    const panel = document.createElement("section");
    panel.id = "credencialesCuerpoTecnicoPanel";
    panel.className = "ca-panel";

    panel.innerHTML = `
        <header class="ca-cabecera">
            <small>ADMINISTRACIÓN · CUERPO TÉCNICO</small>
            <h2>Expedientes y credenciales</h2>
            <p>
                Directores por club y categorías asignadas.
                Auxiliares por equipo y categoría.
            </p>
        </header>

        <div class="ca-contenido">
            <div class="ca-controles">
                <label>
                    Consultar expediente
                    <select
                        aria-label="Consultar integrante del cuerpo técnico"
                    ></select>
                </label>

                <button type="button" data-actualizar>
                    Actualizar expedientes
                </button>
            </div>

            <p class="ca-estado" role="status" aria-live="polite">
                Consultando expedientes…
            </p>

            <div class="ca-expediente" hidden>
                <div class="ca-info">
                    <strong data-nombre></strong>
                    <p data-cargo></p>
                    <p data-equipo></p>
                    <p data-categorias></p>
                    <p data-curp></p>

                    <p>
                        <a
                            data-pdf
                            target="_blank"
                            rel="noopener noreferrer"
                            hidden
                        >
                            Consultar PDF de CURP
                        </a>
                    </p>

                    <button type="button" data-uno>
                        Imprimir esta credencial
                    </button>
                </div>

                <div data-preview></div>
            </div>

            <section class="ca-lote">
                <h3>Impresión por lote</h3>
                <p data-resumen></p>

                <div class="ca-acciones">
                    <button
                        type="button"
                        class="ca-secundario"
                        data-marcar
                    >
                        Seleccionar completos
                    </button>

                    <button
                        type="button"
                        class="ca-secundario"
                        data-limpiar
                    >
                        Quitar selección
                    </button>
                </div>

                <div class="ca-lista"></div>

                <div class="ca-acciones">
                    <button type="button" data-elegidos>
                        Imprimir seleccionados
                    </button>

                    <button type="button" data-todos>
                        Imprimir todos los completos
                    </button>
                </div>

                <p>
                    Hasta nueve credenciales por hoja A4.
                    Elige Guardar como PDF para descargar el lote.
                    Primera impresión gratuita; las reposiciones
                    se gestionan desde administración.
                </p>
            </section>
        </div>
    `;

    principal.insertBefore(
        panel,
        principal.querySelector(".resumen-jefes")
    );

    const selector = panel.querySelector("select");
    const estado = panel.querySelector("[role=status]");
    const expediente = panel.querySelector(".ca-expediente");
    const lista = panel.querySelector(".ca-lista");
    const elegidos = new Set();

    let registros = [];
    let temporada = "Temporada vigente";
    let ocupada = false;
    let autorizado = false;
    let vista = 0;

    function sincronizar() {
        panel.querySelectorAll("button,select,input").forEach(
            control => {
                control.disabled = ocupada || !autorizado;
            }
        );

        panel.querySelector("[data-actualizar]").disabled = ocupada;

        panel.querySelectorAll("input[data-id]").forEach(control => {
            control.checked = elegidos.has(control.dataset.id);

            control.disabled =
                ocupada ||
                !autorizado ||
                !registros.find(
                    item => item.id === control.dataset.id
                )?.listo;
        });

        panel.querySelector("[data-uno]").disabled =
            ocupada ||
            !autorizado ||
            !registros.find(
                item => item.id === selector.value
            )?.listo;

        panel.querySelector("[data-elegidos]").disabled =
            ocupada || !autorizado || !elegidos.size;

        const completos = registros.filter(
            item => item.listo
        ).length;

        panel.querySelector("[data-todos]").disabled =
            ocupada || !autorizado || !completos;

        panel.querySelector("[data-resumen]").textContent =
            `${completos} completos · ${elegidos.size} seleccionados · ${registros.length - completos} pendientes`;
    }

    function mostrar() {
        const turno = ++vista;

        const registro = registros.find(
            item => item.id === selector.value
        );

        const preview = panel.querySelector("[data-preview]");

        expediente.hidden = !registro;
        preview.replaceChildren();

        if (registro) {
            panel.querySelector("[data-nombre]").textContent =
                registro.nombre;

            panel.querySelector("[data-cargo]").textContent =
                registro.cargo;

            panel.querySelector("[data-equipo]").textContent =
                "Equipo / Club: " + registro.equipoNombre;

            panel.querySelector("[data-categorias]").textContent =
                "Categorías: " +
                (registro.categorias.join(", ") || "Pendientes");

            panel.querySelector("[data-curp]").textContent =
                "CURP: " + (registro.datos.curp || "Pendiente");

            const pdf = panel.querySelector("[data-pdf]");

            pdf.hidden = !urlSegura(registro.datos.curpPdfUrl);
            pdf.removeAttribute("href");

            if (!pdf.hidden) {
                pdf.href = urlSegura(registro.datos.curpPdfUrl);
            }

            estado.textContent = registro.listo
                ? "Expediente completo. Preparando el QR…"
                : "Expediente o asignación pendiente. Los datos se completan desde el panel del Director Técnico.";

            if (registro.listo) {
                const tarjeta = crearTarjeta(registro, temporada);
                preview.appendChild(tarjeta);

                prepararQrTecnico(
                    tarjeta,
                    registro,
                    temporada
                ).then(() => {
                    if (turno === vista) {
                        estado.textContent =
                            "Credencial lista para imprimir.";
                    }
                }).catch(error => {
                    if (turno === vista) {
                        estado.textContent = error.message;
                    }
                });
            }
        }

        sincronizar();
    }

    async function cargar() {
        if (ocupada) return;

        ocupada = true;
        autorizado = false;
        ++vista;

        sincronizar();
        expediente.hidden = true;
        estado.textContent = "Consultando expedientes…";

        try {
            await validarAdmin(uid);

            const datos = await consultar();

            await validarAdmin(uid);

            registros = datos.registros;
            temporada = datos.temporada;
            autorizado = true;

            const anterior = selector.value;

            selector.replaceChildren(
                new Option("Selecciona un expediente", "")
            );

            registros.forEach(item => {
                selector.add(
                    new Option(
                        item.nombre + " · " +
                        item.cargo + " · " +
                        item.equipoNombre,
                        item.id
                    )
                );
            });

            selector.value = anterior;

            for (const id of elegidos) {
                if (
                    !registros.some(
                        item => item.id === id && item.listo
                    )
                ) {
                    elegidos.delete(id);
                }
            }

            lista.replaceChildren();

            registros.forEach(item => {
                const fila = document.createElement("label");
                fila.className = "ca-opcion";

                const check = document.createElement("input");
                check.type = "checkbox";
                check.dataset.id = item.id;

                const texto = document.createElement("span");

                texto.textContent =
                    item.nombre + " · " +
                    item.cargo + " · " +
                    item.equipoNombre + " · " +
                    item.categorias.join(", ");

                check.addEventListener("change", () => {
                    check.checked
                        ? elegidos.add(item.id)
                        : elegidos.delete(item.id);

                    sincronizar();
                });

                fila.append(check, texto);
                lista.appendChild(fila);
            });

            mostrar();

            if (!selector.value) {
                estado.textContent = registros.length
                    ? "Selecciona un expediente o prepara un lote."
                    : "No hay equipos activos asignados a Directores Técnicos.";
            }
        } catch (error) {
            estado.textContent = error.message;
        } finally {
            ocupada = false;
            sincronizar();
        }
    }

    async function imprimir(modo) {
        if (ocupada || !autorizado) return;

        const ids = modo === "uno"
            ? [selector.value]
            : [...elegidos];

        ocupada = true;
        sincronizar();

        estado.textContent =
            "Verificando expedientes y preparando las hojas…";

        let raiz;

        try {
            await validarAdmin(uid);

            const datos = await consultar();

            const seleccionados = modo === "todos"
                ? datos.registros.filter(item => item.listo)
                : ids.map(
                    id => datos.registros.find(item => item.id === id)
                );

            if (
                !seleccionados.length ||
                seleccionados.some(item => !item?.listo)
            ) {
                throw new Error("Hay expedientes incompletos o asignaciones modificadas. Actualiza la lista.");
            }

            document.getElementById(
                "impresionCredencialesArbitros"
            )?.remove();

            raiz = document.createElement("div");
            raiz.id = "impresionCredencialesArbitros";

            const trabajos = [];

            for (let i = 0; i < seleccionados.length; i += 9) {
                const hoja = document.createElement("section");
                hoja.className = "ca-hoja";

                seleccionados.slice(i, i + 9).forEach(item => {
                    const tarjeta = crearTarjeta(
                        item,
                        datos.temporada
                    );

                    hoja.appendChild(tarjeta);
                    trabajos.push({ tarjeta, item });
                });

                raiz.appendChild(hoja);
            }

            document.body.appendChild(raiz);

            await Promise.all(
                trabajos.map(({ tarjeta, item }) =>
                    prepararQrTecnico(
                        tarjeta,
                        item,
                        datos.temporada
                    )
                )
            );

            await esperarImagenes(raiz);
            await validarAdmin(uid);

            const limpiar = () => {
                raiz.remove();
                document.body.classList.remove("ca-imprimiendo");
            };

            document.body.classList.add("ca-imprimiendo");

            window.addEventListener(
                "afterprint",
                limpiar,
                { once: true }
            );

            window.print();

            estado.textContent =
                `${seleccionados.length} credenciales preparadas en ${Math.ceil(seleccionados.length / 9)} hoja(s). Elige Guardar como PDF o tu impresora.`;
        } catch (error) {
            raiz?.remove();
            document.body.classList.remove("ca-imprimiendo");
            estado.textContent = error.message;
        } finally {
            ocupada = false;
            sincronizar();
        }
    }

    selector.addEventListener("change", mostrar);

    panel.querySelector("[data-actualizar]").addEventListener(
        "click",
        cargar
    );

    panel.querySelector("[data-uno]").addEventListener(
        "click",
        () => imprimir("uno")
    );

    panel.querySelector("[data-elegidos]").addEventListener(
        "click",
        () => imprimir("elegidos")
    );

    panel.querySelector("[data-todos]").addEventListener(
        "click",
        () => imprimir("todos")
    );

    panel.querySelector("[data-marcar]").addEventListener(
        "click",
        () => {
            registros.filter(item => item.listo).forEach(item => {
                elegidos.add(item.id);
            });

            sincronizar();
        }
    );

    panel.querySelector("[data-limpiar]").addEventListener(
        "click",
        () => {
            elegidos.clear();
            sincronizar();
        }
    );

    await cargar();
}

iniciar().catch(error => {
    console.error(
        "No se pudo iniciar el panel de credenciales técnicas:",
        error
    );
});