import { collection, getDocs, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { db, auth } from "../firebase.js";

function texto(valor) {
    return String(valor ?? "").trim();
}

function activo(prestamo) {
    const estado = texto(prestamo.estado).toLowerCase();

    return prestamo.activo !== false &&
        ![
            "cancelado",
            "cancelada",
            "finalizado",
            "inactivo",
            "rechazado",
            "rechazada"
        ].includes(estado);
}

export async function cancelarPrestamoJugador(
    prestamoId,
    motivo
) {
    const uid = auth.currentUser?.uid;
    const id = texto(prestamoId);
    const razon = texto(motivo);

    if (
        !uid ||
        !id ||
        razon.length < 5 ||
        razon.length > 500
    ) {
        throw new Error(
            "Escribe un motivo de entre 5 y 500 caracteres y conserva tu sesión activa."
        );
    }

    return runTransaction(db, async tx => {
        const referencia = doc(
            db,
            "prestamosJugadores",
            id
        );

        const [usuario, snapshot] = await Promise.all([
            tx.get(doc(db, "usuarios", uid)),
            tx.get(referencia)
        ]);

        if (
            auth.currentUser?.uid !== uid ||
            !usuario.exists() ||
            usuario.data().rol !== "admin" ||
            usuario.data().activo === false
        ) {
            throw new Error(
                "Solo un administrador activo puede cancelar préstamos."
            );
        }

        if (!snapshot.exists()) {
            throw new Error(
                "El préstamo ya no existe. Actualiza la lista."
            );
        }

        const prestamo = snapshot.data();

        if (!activo(prestamo)) {
            throw new Error(
                "El préstamo ya está cerrado. Actualiza la lista."
            );
        }

        const token = texto(prestamo.credencialToken);

        let publicaRef = null;
        let publica = null;

        if (token) {
            if (!/^[a-f0-9]{48}$/i.test(token)) {
                throw new Error(
                    "El QR tiene un formato diferente. Revisa el préstamo antes de cancelarlo."
                );
            }

            publicaRef = doc(
                db,
                "credencialesPublicas",
                token
            );

            publica = await tx.get(publicaRef);

            if (
                publica.exists() &&
                (
                    publica.data().tipo !== "refuerzo" ||
                    publica.data().folio !==
                        "REF-" + id.toUpperCase()
                )
            ) {
                throw new Error(
                    "El QR no corresponde a este refuerzo. No se modificaron registros."
                );
            }
        }

        tx.update(referencia, {
            activo: false,
            estado: "cancelado",
            motivoCancelacion: razon,
            canceladoPor: uid,
            canceladoPorNombre: texto(
                usuario.data().nombre ||
                usuario.data().nombreCompleto
            ),
            canceladoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp()
        });

        if (publica?.exists()) {
            tx.update(publicaRef, {
                activa: false,
                vigente: false,
                estado: "cancelada",
                actualizadoEn: serverTimestamp()
            });
        }
    });
}

function crearPanel() {
    const nav = document.querySelector(
        ".configuracion-nav"
    );

    const contenido = document.querySelector(
        ".configuracion-contenido"
    );

    if (!nav || !contenido) {
        throw new Error(
            "No se encontró la navegación de Configuración."
        );
    }

    if (
        document.getElementById(
            "seccionGestionPrestamos"
        )
    ) {
        return null;
    }

    const estilo = document.createElement("style");

    estilo.textContent = `
        #seccionGestionPrestamos {
            --gp-verde: #075b51;
            --gp-borde: #dfdfcd;
        }

        #seccionGestionPrestamos .gp-cabecera {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 22px;
        }

        #seccionGestionPrestamos h2 {
            margin: 5px 0 8px;
            color: #073f39;
        }

        #seccionGestionPrestamos .gp-kicker {
            color: #926e24;
            font-size: .73rem;
            font-weight: 800;
            letter-spacing: .12em;
        }

        #seccionGestionPrestamos p {
            margin: 5px 0;
            line-height: 1.5;
        }

        #seccionGestionPrestamos .gp-filtros {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 180px;
            gap: 12px;
            margin-bottom: 18px;
        }

        #seccionGestionPrestamos input,
        #seccionGestionPrestamos select {
            width: 100%;
            min-height: 44px;
            border: 1px solid var(--gp-borde);
            border-radius: 12px;
            padding: 10px 12px;
            background: #fff;
            color: #173c35;
            font: inherit;
            box-sizing: border-box;
        }

        #seccionGestionPrestamos .gp-lista {
            display: grid;
            grid-template-columns:
                repeat(
                    auto-fit,
                    minmax(min(100%, 300px), 1fr)
                );
            gap: 14px;
        }

        #seccionGestionPrestamos article {
            padding: 20px;
            background: linear-gradient(
                145deg,
                #fff,
                #faf8ed
            );
            border: 1px solid var(--gp-borde);
            border-top: 4px solid #148274;
            border-radius: 16px;
            box-shadow: 0 8px 22px #063f3910;
            overflow-wrap: anywhere;
        }

        #seccionGestionPrestamos h3 {
            margin: 12px 0;
            font-size: 1.05rem;
            color: #123f36;
        }

        #seccionGestionPrestamos .gp-estado {
            display: inline-block;
            background: #dfeee9;
            color: #075b51;
            padding: 5px 10px;
            border-radius: 30px;
            font-size: .75rem;
            font-weight: 800;
        }

        #seccionGestionPrestamos .gp-cerrado {
            background: #f3e5df;
            color: #813c31;
        }

        #seccionGestionPrestamos button,
        .gp-dialogo button {
            min-height: 44px;
            padding: 10px 16px;
            border: 0;
            border-radius: 11px;
            background: #075b51;
            color: white;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
        }

        #seccionGestionPrestamos .gp-cancelar {
            margin-top: 16px;
            background: #813c31;
        }

        #seccionGestionPrestamos button:disabled,
        .gp-dialogo button:disabled {
            opacity: .55;
            cursor: wait;
        }

        #seccionGestionPrestamos .gp-mensaje {
            margin: 12px 0;
            color: #075b51;
        }

        #seccionGestionPrestamos .gp-error,
        .gp-dialogo .gp-error {
            color: #9d3428;
        }

        .gp-dialogo {
            width: min(
                460px,
                calc(100vw - 40px)
            );
            max-height: 85dvh;
            overflow: auto;
            box-sizing: border-box;
            padding: 24px;
            border: 1px solid #dacda8;
            border-radius: 20px;
            color: #153e35;
            background: #fffdf5;
            box-shadow: 0 20px 80px #0004;
        }

        .gp-dialogo::backdrop {
            background: #082f2ecc;
        }

        .gp-dialogo h2 {
            margin-top: 0;
        }

        .gp-dialogo p {
            line-height: 1.5;
            overflow-wrap: anywhere;
        }

        .gp-dialogo label {
            display: block;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .gp-dialogo textarea {
            width: 100%;
            box-sizing: border-box;
            min-height: 110px;
            padding: 12px;
            border: 1px solid #c7cebc;
            border-radius: 10px;
            resize: vertical;
            font: inherit;
        }

        .gp-dialogo footer {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 18px;
        }

        .gp-dialogo button[type=submit] {
            background: #813c31;
        }

        .gp-dialogo [data-volver] {
            background: #e7ecdf;
            color: #244b3e;
        }

        @media(max-width: 600px) {
            #seccionGestionPrestamos .gp-filtros {
                grid-template-columns: 1fr;
            }

            #seccionGestionPrestamos article {
                padding: 16px;
            }

            .gp-dialogo {
                padding: 20px;
            }
        }
    `;

    document.head.appendChild(estilo);

    const seccion = document.createElement("section");

    seccion.id = "seccionGestionPrestamos";
    seccion.className = "configuracion-seccion";
    seccion.dataset.seccionContenido =
        "gestionPrestamos";

    seccion.innerHTML = `
        <div class="gp-cabecera">
            <div>
                <span class="gp-kicker">
                    REFUERZOS AUTORIZADOS
                </span>
                <h2>Refuerzos autorizados</h2>
                <p>
                    Consulta las autorizaciones y cancela
                    el préstamo junto con su credencial azul.
                </p>
            </div>
            <button type="button" data-actualizar>
                Actualizar
            </button>
        </div>

        <div class="gp-filtros">
            <input
                type="search"
                aria-label="Buscar jugador o equipo"
                placeholder="Buscar jugador o equipo"
                data-buscar
            >

            <select
                aria-label="Estado del préstamo"
                data-estado
            >
                <option value="activos">Activos</option>
                <option value="cerrados">Cerrados</option>
                <option value="todos">Todos</option>
            </select>
        </div>

        <p
            class="gp-mensaje"
            role="status"
            aria-live="polite"
        ></p>

        <div class="gp-lista"></div>
    `;

    contenido.appendChild(seccion);

    const boton = document.createElement("button");

    boton.type = "button";
    boton.className = "configuracion-nav-btn";
    boton.dataset.seccion = "gestionPrestamos";

    boton.setAttribute(
        "aria-controls",
        seccion.id
    );

    boton.innerHTML = `
        <span class="configuracion-nav-icono">↗</span>
        <span>Refuerzos</span>
    `;

    nav.appendChild(boton);

    boton.addEventListener("click", () => {
        document.querySelectorAll(
            ".configuracion-nav-btn"
        ).forEach(elemento => {
            const elegido = elemento === boton;

            elemento.classList.toggle(
                "activo",
                elegido
            );

            elemento.setAttribute(
                "aria-selected",
                String(elegido)
            );
        });

        document.querySelectorAll(
            ".configuracion-seccion"
        ).forEach(elemento => {
            elemento.classList.toggle(
                "activo",
                elemento === seccion
            );
        });
    });

    function desplazarGestionPrestamos() {
        requestAnimationFrame(() => {
            const posicion = parseFloat(
                window.getComputedStyle(nav).top
            ) || 0;

            const margen = Math.max(0, posicion) +
                nav.offsetHeight + 20;

            seccion.style.scrollMarginTop =
                margen + "px";

            const reducir = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            seccion.scrollIntoView({
                block: "start",
                behavior: reducir ? "auto" : "smooth"
            });
        });
    }

    boton.addEventListener(
        "click",
        desplazarGestionPrestamos
    );

    const dialogo = document.createElement("dialog");

    dialogo.className = "gp-dialogo";

    dialogo.innerHTML = `
        <form>
            <h2>Cancelar préstamo</h2>

            <p data-jugador></p>

            <p>
                El refuerzo dejará de estar autorizado
                para el receptor y su QR azul quedará
                inactivo. Su registro y credencial
                de origen se conservarán.
            </p>

            <label for="gpMotivoCancelacion">
                Motivo de cancelación
            </label>

            <textarea
                id="gpMotivoCancelacion"
                required
                minlength="5"
                maxlength="500"
            ></textarea>

            <p class="gp-error" role="alert"></p>

            <footer>
                <button type="button" data-volver>
                    Volver
                </button>

                <button type="submit">
                    Cancelar préstamo
                </button>
            </footer>
        </form>
    `;

    document.body.appendChild(dialogo);

    return { seccion, boton, dialogo };
}

const panel = crearPanel();

if (panel) {
    const { seccion, boton, dialogo } = panel;

    const lista = seccion.querySelector(".gp-lista");
    const mensaje = seccion.querySelector(".gp-mensaje");

    const actualizar = seccion.querySelector(
        "[data-actualizar]"
    );

    const buscar = seccion.querySelector(
        "[data-buscar]"
    );

    const estado = seccion.querySelector(
        "[data-estado]"
    );

    const formulario = dialogo.querySelector("form");
    const motivo = dialogo.querySelector("textarea");

    let prestamos = [];
    let seleccionado = null;
    let guardando = false;
    let revision = 0;

    function avisar(contenido, error = false) {
        mensaje.textContent = contenido;

        mensaje.classList.toggle(
            "gp-error",
            error
        );
    }

    function agregar(destino, etiqueta, valor) {
        const linea = document.createElement("p");
        const titulo = document.createElement("strong");

        titulo.textContent = etiqueta + ": ";

        linea.append(
            titulo,
            document.createTextNode(
                texto(valor) || "Sin registrar"
            )
        );

        destino.appendChild(linea);
    }

    function renderizar() {
        lista.replaceChildren();

        const termino = texto(
            buscar.value
        ).toLocaleLowerCase("es");

        const visibles = prestamos.filter(
            prestamo => {
                const coincide = [
                    prestamo.jugadorNombre,
                    prestamo.nombreJugador,
                    prestamo.equipoOrigenNombre,
                    prestamo.equipoDestinoNombre,
                    prestamo.equipoNombre
                ].some(valor =>
                    texto(valor)
                        .toLocaleLowerCase("es")
                        .includes(termino)
                );

                const coincideEstado =
                    estado.value === "todos" ||
                    (
                        estado.value === "activos"
                            ? activo(prestamo)
                            : !activo(prestamo)
                    );

                return coincide && coincideEstado;
            }
        );

        for (const prestamo of visibles) {
            const tarjeta = document.createElement(
                "article"
            );

            const etiqueta = document.createElement(
                "span"
            );

            etiqueta.className =
                "gp-estado" +
                (
                    activo(prestamo)
                        ? ""
                        : " gp-cerrado"
                );

            etiqueta.textContent = activo(prestamo)
                ? "PRÉSTAMO ACTIVO"
                : texto(prestamo.estado).toUpperCase() ||
                    "CERRADO";

            const nombre = document.createElement("h3");

            nombre.textContent = texto(
                prestamo.jugadorNombre ||
                prestamo.nombreJugador
            ) || "Jugador registrado";

            tarjeta.append(etiqueta, nombre);

            agregar(
                tarjeta,
                "Origen",
                prestamo.equipoOrigenNombre
            );

            agregar(
                tarjeta,
                "Receptor",
                prestamo.equipoDestinoNombre ||
                prestamo.equipoNombre
            );

            agregar(
                tarjeta,
                "Categoría receptora",
                prestamo.categoriaDestinoNombre
            );

            agregar(
                tarjeta,
                "Temporada",
                prestamo.temporadaNombre
            );

            if (prestamo.motivoCancelacion) {
                agregar(
                    tarjeta,
                    "Cancelación",
                    prestamo.motivoCancelacion
                );
            }

            if (activo(prestamo)) {
                const cancelar = document.createElement(
                    "button"
                );

                cancelar.type = "button";
                cancelar.className = "gp-cancelar";
                cancelar.textContent = "Cancelar préstamo";

                cancelar.addEventListener(
                    "click",
                    () => {
                        seleccionado = prestamo.id;
                        motivo.value = "";

                        dialogo.querySelector(
                            ".gp-error"
                        ).textContent = "";

                        dialogo.querySelector(
                            "[data-jugador]"
                        ).textContent = nombre.textContent;

                        dialogo.showModal();
                        motivo.focus();
                    }
                );

                tarjeta.appendChild(cancelar);
            }

            lista.appendChild(tarjeta);
        }

        if (!visibles.length) {
            const vacio = document.createElement("p");

            vacio.textContent =
                "No hay préstamos para estos filtros.";

            lista.appendChild(vacio);
        }
    }

    async function cargar() {
        const uid = auth.currentUser?.uid;
        const turno = ++revision;

        actualizar.disabled = true;
        avisar("Consultando préstamos…");

        try {
            if (!uid) {
                throw new Error(
                    "Inicia sesión como administrador."
                );
            }

            const usuario = await runTransaction(
                db,
                tx => tx.get(
                    doc(db, "usuarios", uid)
                )
            );

            if (
                !usuario.exists() ||
                usuario.data().rol !== "admin" ||
                usuario.data().activo === false
            ) {
                throw new Error(
                    "Se requiere una cuenta administradora activa."
                );
            }

            const snapshot = await getDocs(
                collection(db, "prestamosJugadores")
            );

            if (
                turno !== revision ||
                auth.currentUser?.uid !== uid
            ) {
                return;
            }

            prestamos = snapshot.docs.map(
                documento => ({
                    ...documento.data(),
                    id: documento.id
                })
            );

            renderizar();

            avisar(
                prestamos.filter(activo).length +
                " préstamos activos."
            );
        } catch (error) {
            if (turno !== revision) return;

            prestamos = [];
            lista.replaceChildren();

            avisar(error.message, true);
        } finally {
            if (turno === revision) {
                actualizar.disabled = false;
            }
        }
    }

    buscar.addEventListener("input", renderizar);
    estado.addEventListener("change", renderizar);
    actualizar.addEventListener("click", cargar);
    boton.addEventListener("click", cargar);

    dialogo.querySelector(
        "[data-volver]"
    ).addEventListener(
        "click",
        () => dialogo.close()
    );

    dialogo.addEventListener("cancel", evento => {
        if (guardando) {
            evento.preventDefault();
        }
    });

    formulario.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            if (
                guardando ||
                !seleccionado ||
                !formulario.reportValidity()
            ) {
                return;
            }

            guardando = true;

            formulario.querySelectorAll(
                "button"
            ).forEach(elemento => {
                elemento.disabled = true;
            });

            try {
                await cancelarPrestamoJugador(
                    seleccionado,
                    motivo.value
                );

                dialogo.close();

                await cargar();

                avisar(
                    "Préstamo cancelado. Su QR azul quedó inactivo."
                );
            } catch (error) {
                dialogo.querySelector(
                    ".gp-error"
                ).textContent = error.message;
            } finally {
                guardando = false;

                formulario.querySelectorAll(
                    "button"
                ).forEach(elemento => {
                    elemento.disabled = false;
                });
            }
        }
    );

    onAuthStateChanged(auth, () => {
        revision++;
        prestamos = [];

        lista.replaceChildren();

        if (dialogo.open && !guardando) {
            dialogo.close();
        }

        if (auth.currentUser) {
            cargar();
        } else {
            avisar(
                "Inicia sesión como administrador.",
                true
            );
        }
    });
}