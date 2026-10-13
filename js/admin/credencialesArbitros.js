import { prepararQrCredencialArbitro } from "./qrCredencialArbitro.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db, auth } from "../firebase.js";
import { protegerPagina } from "../roles.js";

function urlSegura(valor) {
    try {
        const url = new URL(valor);
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function completo(arbitro) {
    const datos = arbitro.documentacionArbitro || {};

    return Boolean(
        urlSegura(datos.fotoUrl) &&
        urlSegura(datos.curpPdfUrl) &&
        /^[A-Z0-9]{18}$/.test(datos.curp || "")
    );
}

function imprimible(arbitro) {
    return arbitro.rol === "arbitro" &&
        arbitro.activo !== false &&
        completo(arbitro);
}

function dividirHojas(lista) {
    const hojas = [];

    for (let i = 0; i < lista.length; i += 9) {
        hojas.push(lista.slice(i, i + 9));
    }

    return hojas;
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

async function consultarArbitros() {
    const snapshot = await getDocs(
        query(
            collection(db, "usuarios"),
            where("rol", "==", "arbitro")
        )
    );

    return snapshot.docs
        .map(item => ({
            ...item.data(),
            id: item.id
        }))
        .sort((a, b) =>
            String(a.nombre || "").localeCompare(
                String(b.nombre || ""),
                "es"
            )
        );
}

async function consultarTemporada() {
    const snapshot = await getDocs(
        collection(db, "temporadas")
    );

    const temporadas = snapshot.docs.map(item => item.data());

    const normalizar = valor =>
        String(valor || "").trim().toLowerCase();

    const actual = temporadas.find(item =>
        item.activa === true ||
        normalizar(item.estado) === "activa"
    ) || temporadas.find(item =>
        normalizar(item.estado) === "proxima"
    );

    return actual?.nombre ||
        actual?.temporada ||
        actual?.titulo ||
        "Temporada vigente";
}

function crearCredencial(arbitro, temporada) {
    const contenedor = document.createElement("div");
    contenedor.className = "ca-preview";
    contenedor.dataset.arbitroId = arbitro.id;

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

    contenedor.innerHTML = `
        <article class="ca-card">
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
                        alt="Liga Municipal de Fútbol Río Grande"
                    >

                    <div class="ca-titulos">
                        <strong>
                            LIGA MUNICIPAL<br>DE FÚTBOL
                        </strong>
                        <span>
                            RÍO GRANDE<br>
                            VILLA DE TUTUTEPEC, OAXACA
                        </span>
                    </div>
                </header>

                <div class="ca-temporada"></div>
                <div class="ca-rol">ÁRBITRO</div>

                <div class="ca-identidad">
                    <div class="ca-foto-marco">
                        <img class="ca-foto" alt="Fotografía del árbitro">
                    </div>

                    <div class="ca-datos">
                        <small>NOMBRE</small>
                        <strong class="ca-nombre"></strong>
                        <small>ACREDITACIÓN</small>
                        <span>CUERPO<br>ARBITRAL</span>
                    </div>
                </div>

                <div class="ca-frase">
                    RESPETO · IMPARCIALIDAD<br>
                    COMPROMISO CON EL DEPORTE
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

                <div class="ca-folio"></div>

                <div class="ca-pie">
                    LIGA MUNICIPAL · RÍO GRANDE
                </div>
            </div>
        </article>
    `;

    const nombre = String(arbitro.nombre || "Árbitro")
        .trim()
        .toUpperCase();

    const elemento = contenedor.querySelector(".ca-nombre");
    elemento.textContent = nombre;

    if (nombre.length > 42) {
        elemento.style.fontSize = "3.2cqw";
    }

    contenedor.querySelector(".ca-temporada").textContent =
        String(temporada).toUpperCase();

    contenedor.querySelector(".ca-foto").src =
        urlSegura(arbitro.documentacionArbitro.fotoUrl);

    contenedor.querySelector(".ca-folio").textContent =
        "FOLIO AR · " + arbitro.id;

    return contenedor;
}

async function esperarImagenes(contenedor) {
    await Promise.all(
        [...contenedor.querySelectorAll("img")].map(
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
                    new Error("No se pudo cargar una fotografía o el logo. Intenta nuevamente.")
                );

                if (imagen.complete) {
                    return imagen.naturalWidth ? resolve() : fallar();
                }

                imagen.addEventListener("load", cargar);
                imagen.addEventListener("error", fallar);

                timer = setTimeout(
                    () => terminar(
                        new Error("La carga de imágenes tardó demasiado. Intenta nuevamente.")
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
    const principal = document.querySelector(".arbitros-contenido");

    if (
        !principal ||
        document.getElementById("credencialesArbitrosPanel")
    ) {
        return;
    }

    const panel = document.createElement("section");
    panel.id = "credencialesArbitrosPanel";
    panel.className = "ca-panel";

    panel.innerHTML = `
        <header class="ca-cabecera">
            <small>ADMINISTRACIÓN · CUERPO ARBITRAL</small>
            <h2>Expedientes y credenciales</h2>
            <p>
                Credenciales individuales o por lote.
                Hasta nueve por hoja A4.
            </p>
        </header>

        <div class="ca-contenido">
            <div class="ca-controles">
                <label>
                    Consultar árbitro
                    <select aria-label="Seleccionar árbitro"></select>
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

                    <p>
                        Primera impresión gratuita.
                        Las reposiciones se gestionan desde administración.
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
                    En la ventana de impresión puedes elegir Guardar como PDF
                    para descargar el documento completo.
                </p>
            </section>
        </div>
    `;

    principal.insertBefore(
        panel,
        principal.querySelector(".resumen-arbitros")
    );

    const selector = panel.querySelector("select");
    const estado = panel.querySelector("[role=status]");
    const expediente = panel.querySelector(".ca-expediente");
    const lista = panel.querySelector(".ca-lista");
    const elegidos = new Set();

    let arbitros = [];
    let temporada = "Temporada vigente";
    let ocupada = false;
    let autorizado = false;

    function sincronizar() {
        panel.querySelectorAll("button,select,input").forEach(control => {
            control.disabled = ocupada || !autorizado;
        });

        panel.querySelector("[data-actualizar]").disabled = ocupada;

        panel.querySelectorAll("input[data-id]").forEach(control => {
            const arbitro = arbitros.find(
                item => item.id === control.dataset.id
            );

            control.disabled =
                ocupada ||
                !autorizado ||
                !imprimible(arbitro);

            control.checked = elegidos.has(control.dataset.id);
        });

        const actual = arbitros.find(
            item => item.id === selector.value
        );

        panel.querySelector("[data-uno]").disabled =
            ocupada ||
            !autorizado ||
            !actual ||
            !imprimible(actual);

        panel.querySelector("[data-elegidos]").disabled =
            ocupada ||
            !autorizado ||
            !elegidos.size;

        const completos = arbitros.filter(imprimible).length;

        panel.querySelector("[data-todos]").disabled =
            ocupada ||
            !autorizado ||
            !completos;

        panel.querySelector("[data-resumen]").textContent =
            `${completos} listos para imprimir · ${elegidos.size} seleccionados · ${arbitros.length - completos} pendientes o inactivos`;
    }

    function mostrarSeleccion() {
        const arbitro = arbitros.find(
            item => item.id === selector.value
        );

        expediente.hidden = !arbitro;

        const preview = panel.querySelector("[data-preview]");
        preview.replaceChildren();

        if (arbitro) {
            const datos = arbitro.documentacionArbitro || {};

            panel.querySelector("[data-nombre]").textContent =
                arbitro.nombre || "Árbitro";

            panel.querySelector("[data-curp]").textContent =
                "CURP: " + (datos.curp || "Pendiente");

            const enlace = panel.querySelector("[data-pdf]");

            enlace.hidden = !urlSegura(datos.curpPdfUrl);
            enlace.removeAttribute("href");

            if (!enlace.hidden) {
                enlace.href = urlSegura(datos.curpPdfUrl);
            }

            if (imprimible(arbitro)) {
                const tarjeta = crearCredencial(arbitro, temporada);
                preview.appendChild(tarjeta);

                prepararQrCredencialArbitro(
                    tarjeta,
                    arbitro,
                    temporada
                ).catch(error => {
                    if (
                        tarjeta.isConnected &&
                        selector.value === arbitro.id
                    ) {
                        estado.textContent =
                            "No se pudo preparar el QR: " + error.message;
                    }
                });
            }

            estado.textContent = imprimible(arbitro)
                ? "Expediente completo. Puedes imprimir esta credencial o incluirla en un lote."
                : "Cuenta inactiva o expediente incompleto. Los documentos los completa el árbitro desde su panel.";
        }

        sincronizar();
    }

    function renderizarLista() {
        lista.replaceChildren();

        arbitros.forEach(arbitro => {
            const fila = document.createElement("label");
            fila.className = "ca-opcion";

            const check = document.createElement("input");
            check.type = "checkbox";
            check.dataset.id = arbitro.id;

            const texto = document.createElement("span");

            texto.textContent =
                (arbitro.nombre || "Árbitro") +
                (
                    imprimible(arbitro)
                        ? " · Completo"
                        : arbitro.activo === false
                            ? " · Inactivo"
                            : " · Pendiente"
                );

            check.addEventListener("change", () => {
                check.checked
                    ? elegidos.add(arbitro.id)
                    : elegidos.delete(arbitro.id);

                sincronizar();
            });

            fila.append(check, texto);
            lista.appendChild(fila);
        });
    }

    async function cargar() {
        if (ocupada) return;

        ocupada = true;
        autorizado = false;
        sincronizar();

        estado.textContent = "Consultando expedientes…";

        try {
            await validarAdmin(uid);

            const resultados = await Promise.allSettled([
                consultarArbitros(),
                consultarTemporada()
            ]);

            if (resultados[0].status === "rejected") {
                throw resultados[0].reason;
            }

            arbitros = resultados[0].value;

            temporada = resultados[1].status === "fulfilled"
                ? resultados[1].value
                : "Temporada vigente";

            await validarAdmin(uid);

            autorizado = true;

            const anterior = selector.value;

            selector.replaceChildren(
                new Option("Selecciona un árbitro", "")
            );

            arbitros.forEach(arbitro => {
                selector.add(
                    new Option(
                        arbitro.nombre || "Árbitro",
                        arbitro.id
                    )
                );
            });

            selector.value = anterior;

            for (const id of elegidos) {
                if (
                    !arbitros.some(
                        item => item.id === id && imprimible(item)
                    )
                ) {
                    elegidos.delete(id);
                }
            }

            renderizarLista();
            mostrarSeleccion();

            if (!selector.value) {
                estado.textContent = arbitros.length
                    ? "Selecciona un árbitro o prepara una impresión por lote."
                    : "No hay árbitros registrados.";
            }
        } catch (error) {
            expediente.hidden = true;
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

            const frescos = await consultarArbitros();

            const seleccionados = modo === "todos"
                ? frescos.filter(imprimible)
                : ids.map(id =>
                    frescos.find(item => item.id === id)
                );

            if (!seleccionados.length) {
                throw new Error("Selecciona al menos un árbitro con expediente completo.");
            }

            if (
                seleccionados.some(
                    item => !item || !imprimible(item)
                )
            ) {
                throw new Error("Un expediente seleccionado cambió o está incompleto. Actualiza la lista antes de imprimir.");
            }

            const nombreTemporada = await consultarTemporada();

            document.getElementById(
                "impresionCredencialesArbitros"
            )?.remove();

            raiz = document.createElement("div");
            raiz.id = "impresionCredencialesArbitros";

            const hojas = dividirHojas(seleccionados);

            hojas.forEach(grupo => {
                const hoja = document.createElement("section");
                hoja.className = "ca-hoja";

                grupo.forEach(arbitro => {
                    hoja.appendChild(
                        crearCredencial(
                            arbitro,
                            nombreTemporada
                        )
                    );
                });

                raiz.appendChild(hoja);
            });

            document.body.appendChild(raiz);

            await Promise.all(
                [...raiz.querySelectorAll(".ca-preview")].map(tarjeta => {
                    const arbitro = seleccionados.find(
                        item => item.id === tarjeta.dataset.arbitroId
                    );

                    return prepararQrCredencialArbitro(
                        tarjeta,
                        arbitro,
                        nombreTemporada
                    );
                })
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
                `${seleccionados.length} credenciales preparadas en ${hojas.length} hoja(s). Elige Guardar como PDF o tu impresora.`;
        } catch (error) {
            raiz?.remove();
            document.body.classList.remove("ca-imprimiendo");
            estado.textContent = error.message;
        } finally {
            ocupada = false;
            sincronizar();
        }
    }

    selector.addEventListener("change", mostrarSeleccion);

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
            arbitros.filter(imprimible).forEach(item => {
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
        "No se pudo iniciar el panel de credenciales:",
        error
    );
});