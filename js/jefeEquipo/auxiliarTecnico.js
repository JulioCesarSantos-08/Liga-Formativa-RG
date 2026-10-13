import { doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db, auth } from "../firebase.js";
import { cerrarSesion } from "../roles.js";
import { subirFotoResponsable, subirCurpResponsable } from "../cloudinary.js";

function completo(datos) {
    return String(datos.nombre || "").trim().length >= 3 &&
        /^[A-Z0-9]{18}$/.test(datos.curp || "") &&
        /^https:\/\//.test(datos.fotoUrl || "") &&
        /^https:\/\//.test(datos.curpPdfUrl || "");
}

async function guardarAuxiliar(
    uid,
    equipoId,
    categoriaId,
    version,
    cambios
) {
    return runTransaction(db, async transaccion => {
        const referencia = doc(db, "equipos", equipoId);

        const [usuario, equipo] = await Promise.all([
            transaccion.get(doc(db, "usuarios", uid)),
            transaccion.get(referencia)
        ]);

        if (
            auth.currentUser?.uid !== uid ||
            !usuario.exists() ||
            usuario.data().rol !== "jefeEquipo" ||
            usuario.data().activo === false
        ) {
            throw new Error("Se requiere la sesión activa del Director Técnico.");
        }

        if (
            !equipo.exists() ||
            equipo.data().responsableId !== uid
        ) {
            throw new Error("Este equipo ya no está asignado a tu cuenta.");
        }

        if (
            String(equipo.data().categoriaId || "") !==
            String(categoriaId || "")
        ) {
            throw new Error("La categoría cambió. Recarga el panel antes de continuar.");
        }

        const actual = equipo.data().auxiliarTecnico || {};

        if (Number(actual.version || 0) !== version) {
            throw new Error("El expediente cambió en otra sesión. Recarga el panel.");
        }

        if (
            actual.curp &&
            actual.curp !== cambios.curp &&
            (!cambios.fotoUrl || !cambios.curpPdfUrl)
        ) {
            throw new Error("Para registrar otra CURP, adjunta la fotografía y el PDF del nuevo auxiliar.");
        }

        const nuevo = { ...actual, ...cambios };

        if (!completo(nuevo)) {
            throw new Error("Completa nombre, fotografía, CURP y PDF del Auxiliar Técnico.");
        }

        transaccion.update(referencia, {
            auxiliarTecnico: {
                ...nuevo,
                version: version + 1,
                actualizadoEn: serverTimestamp(),
                actualizadoPor: uid
            }
        });
    });
}

export async function exigirAuxiliarTecnico(
    usuario,
    equipoActual
) {
    if (usuario.rol === "admin" || !equipoActual?.id) return;

    const uid = usuario.firebaseUser?.uid || usuario.uid;

    if (
        !uid ||
        auth.currentUser?.uid !== uid ||
        usuario.rol !== "jefeEquipo"
    ) {
        throw new Error("No se pudo verificar la sesión del Director Técnico.");
    }

    const panel = document.createElement("dialog");
    panel.className = "at-dialog";
    panel.setAttribute("aria-labelledby", "auxiliarTecnicoTitulo");

    panel.style.cssText = "position:fixed;inset:0;margin:auto;width:min(620px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 32px);padding:0;border:0;border-radius:24px;background:#fff;overflow:auto;box-sizing:border-box;color:#224536;font-family:system-ui,sans-serif;box-shadow:0 25px 80px #0005";

    panel.innerHTML = `
        <style>
            .at-dialog::backdrop {
                background: #09251bd9;
                backdrop-filter: blur(6px);
            }

            .at-dialog * {
                box-sizing: border-box;
            }

            .at-cabecera {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                padding: 23px;
                background: linear-gradient(125deg,#084b40,#164364);
                color: white;
                border-bottom: 4px solid #d1a14b;
            }

            .at-cabecera small {
                color: #f1d294;
                font-size: .65rem;
                letter-spacing: .1em;
                font-weight: 800;
            }

            .at-cabecera h2 {
                color: white;
                margin: 7px 0;
                font-size: 1.35rem;
            }

            .at-cabecera img {
                width: 64px;
                height: 64px;
                padding: 7px;
                object-fit: contain;
                background: white;
                border-radius: 15px;
            }

            .at-contenido {
                padding: 22px;
            }

            .at-contenido p {
                font-size: .84rem;
                line-height: 1.65;
                margin: 0 0 15px;
                color: #587363;
            }

            .at-equipo {
                padding: 13px;
                background: #edf5ef;
                border: 1px solid #d8e6dc;
                border-radius: 12px;
                margin-bottom: 14px;
                font-size: .82rem;
                line-height: 1.7;
            }

            .at-equipo strong {
                display: block;
                color: #285b42;
            }

            .at-dialog label {
                display: block;
                margin-top: 14px;
                font-size: .82rem;
                font-weight: 800;
            }

            .at-dialog input {
                display: block;
                width: 100%;
                min-width: 0;
                margin-top: 6px;
                padding: 11px 12px;
                border: 1px solid #ceded3;
                border-radius: 11px;
                background: #f8fbf9;
                font: inherit;
                font-size: 16px;
            }

            .at-dialog input[type=file] {
                padding: 7px;
                font-size: .75rem;
            }

            .at-dialog input::file-selector-button {
                padding: 9px 11px;
                border: 0;
                border-radius: 8px;
                background: #deeee4;
                color: #195a3e;
                font: inherit;
                font-weight: 800;
                margin-right: 8px;
            }

            .at-dialog form small {
                display: block;
                margin-top: 6px;
                color: #6d7d71;
                font-size: .72rem;
                line-height: 1.5;
            }

            .at-dialog form img {
                width: 90px;
                height: 106px;
                object-fit: cover;
                border-radius: 12px;
                margin-top: 10px;
                border: 1px solid #cadacf;
            }

            .at-dialog [role=status] {
                padding: 12px 14px;
                background: #fff6e4;
                border: 1px solid #e8d4a9;
                border-radius: 12px;
                color: #775524;
                overflow-wrap: anywhere;
            }

            .at-dialog button {
                display: block;
                width: 100%;
                min-height: 47px;
                padding: 12px 16px;
                margin-top: 14px;
                border: 0;
                border-radius: 12px;
                background: #0b6950;
                color: white;
                font: inherit;
                font-size: .85rem;
                font-weight: 800;
                cursor: pointer;
            }

            .at-dialog button[data-salir] {
                margin-top: 9px;
                background: #f1f5f1;
                color: #456650;
            }

            .at-dialog button:disabled {
                opacity: .55;
                cursor: wait;
            }

            .at-dialog input:focus-visible,
            .at-dialog button:focus-visible {
                outline: 3px solid #87c19f;
                outline-offset: 3px;
            }

            .at-dialog [hidden] {
                display: none !important;
            }

            @media (max-width:480px) {
                .at-cabecera {
                    padding: 19px 17px;
                }

                .at-cabecera img {
                    width: 52px;
                    height: 52px;
                }

                .at-cabecera h2 {
                    font-size: 1.15rem;
                }

                .at-contenido {
                    padding: 17px;
                }
            }
        </style>

        <header class="at-cabecera">
            <div>
                <small>PASO 2 · CUERPO TÉCNICO</small>
                <h2 id="auxiliarTecnicoTitulo">Auxiliar Técnico</h2>
            </div>

            <img
                src="imagenes/logo.png"
                alt="Liga Municipal de Fútbol Río Grande"
            >
        </header>

        <div class="at-contenido">
            <p>
                Registra a tu segundo al mando. Su credencial la genera
                administración y corresponde al equipo y categoría
                que se muestran aquí.
            </p>

            <div class="at-equipo">
                <strong data-equipo></strong>
                <span data-categoria></span>
            </div>

            <p role="status" aria-live="polite">
                Consultando expediente…
            </p>

            <form hidden>
                <label>
                    Nombre completo
                    <input
                        name="nombre"
                        minlength="3"
                        maxlength="120"
                        required
                        autocomplete="name"
                    >
                </label>

                <label>
                    Fotografía
                    <input
                        name="foto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                    >
                </label>

                <small data-foto>
                    JPG, PNG o WEBP. Máximo 5 MB.
                </small>

                <img
                    data-preview
                    alt="Fotografía del Auxiliar Técnico"
                    hidden
                >

                <label>
                    CURP
                    <input
                        name="curp"
                        minlength="18"
                        maxlength="18"
                        pattern="[A-Z0-9]{18}"
                        required
                        autocomplete="off"
                    >
                </label>

                <label>
                    Documento de CURP
                    <input
                        name="pdf"
                        type="file"
                        accept="application/pdf"
                    >
                </label>

                <small data-pdf>
                    PDF. Máximo 10 MB.
                </small>

                <button type="submit">
                    Guardar auxiliar y entrar al panel
                </button>
            </form>

            <button type="button" data-reintentar hidden>
                Reintentar consulta
            </button>

            <button type="button" data-salir>
                Cerrar sesión
            </button>
        </div>
    `;

    document.body.appendChild(panel);

    panel.addEventListener("cancel", event => {
        event.preventDefault();
    });

    panel.showModal();

    const estado = panel.querySelector("[role=status]");
    const form = panel.querySelector("form");
    const reintentar = panel.querySelector("[data-reintentar]");

    const nombre = form.elements.nombre;
    const curp = form.elements.curp;
    const foto = form.elements.foto;
    const pdf = form.elements.pdf;

    let datos = {};
    let categoriaId = "";
    let ocupada = false;
    let fotoSubida = null;
    let pdfSubido = null;
    let preview = "";

    return new Promise(resolve => {
        const terminar = () => {
            if (preview) URL.revokeObjectURL(preview);

            panel.close();
            panel.remove();
            resolve();
        };

        async function cargar() {
            reintentar.hidden = true;
            estado.textContent = "Consultando expediente…";

            try {
                const [cuenta, equipo] = await Promise.all([
                    getDoc(doc(db, "usuarios", uid)),
                    getDoc(doc(db, "equipos", equipoActual.id))
                ]);

                if (
                    auth.currentUser?.uid !== uid ||
                    !cuenta.exists() ||
                    cuenta.data().rol !== "jefeEquipo" ||
                    cuenta.data().activo === false ||
                    !equipo.exists() ||
                    equipo.data().responsableId !== uid
                ) {
                    throw new Error("No se pudo verificar tu asignación a este equipo.");
                }

                const actual = equipo.data();

                categoriaId = actual.categoriaId || "";
                datos = actual.auxiliarTecnico || {};

                if (completo(datos)) {
                    return terminar();
                }

                panel.querySelector("[data-equipo]").textContent =
                    actual.nombre || actual.clubNombre || "Equipo";

                panel.querySelector("[data-categoria]").textContent =
                    "Categoría: " +
                    (actual.categoriaNombre || "Sin categoría configurada");

                nombre.value = datos.nombre || "";
                curp.value = datos.curp || "";

                foto.required = !datos.fotoUrl;
                pdf.required = !datos.curpPdfUrl;

                if (datos.fotoUrl) {
                    panel.querySelector("[data-preview]").src =
                        datos.fotoUrl;

                    panel.querySelector("[data-preview]").hidden = false;

                    panel.querySelector("[data-foto]").textContent =
                        "Fotografía guardada. Puedes reemplazarla.";
                }

                if (datos.curpPdfUrl) {
                    panel.querySelector("[data-pdf]").textContent =
                        "PDF guardado. Puedes reemplazarlo.";
                }

                form.hidden = false;

                estado.textContent =
                    "Completa el expediente del Auxiliar Técnico para continuar.";

                nombre.focus();
            } catch (error) {
                estado.textContent = error.message;
                reintentar.hidden = false;
            }
        }

        panel.querySelector("[data-salir]").addEventListener(
            "click",
            cerrarSesion
        );

        reintentar.addEventListener("click", cargar);

        nombre.addEventListener("input", () => {
            nombre.value = nombre.value.toUpperCase();
        });

        curp.addEventListener("input", () => {
            curp.value = curp.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "");
        });

        foto.addEventListener("change", () => {
            fotoSubida = null;

            if (preview) URL.revokeObjectURL(preview);

            preview = foto.files[0]
                ? URL.createObjectURL(foto.files[0])
                : "";

            const imagen = panel.querySelector("[data-preview]");

            imagen.src = preview || datos.fotoUrl || "";
            imagen.hidden = !imagen.getAttribute("src");
        });

        pdf.addEventListener("change", () => {
            pdfSubido = null;
        });

        form.addEventListener("submit", async event => {
            event.preventDefault();

            if (ocupada || !form.reportValidity()) return;

            ocupada = true;

            const controles = [
                ...panel.querySelectorAll("input,button")
            ];

            controles.forEach(control => {
                control.disabled = true;
            });

            try {
                if (auth.currentUser?.uid !== uid) {
                    throw new Error("Tu sesión cambió. Recarga el panel.");
                }

                const imagen = foto.files[0];
                const documento = pdf.files[0];

                if (
                    imagen &&
                    (
                        ![
                            "image/jpeg",
                            "image/png",
                            "image/webp"
                        ].includes(imagen.type) ||
                        imagen.size > 5 * 1024 * 1024
                    )
                ) {
                    throw new Error("La fotografía debe ser JPG, PNG o WEBP de máximo 5 MB.");
                }

                if (
                    documento &&
                    (
                        documento.type !== "application/pdf" ||
                        documento.size > 10 * 1024 * 1024
                    )
                ) {
                    throw new Error("El documento debe ser PDF de máximo 10 MB.");
                }

                if (
                    datos.curp &&
                    datos.curp !== curp.value &&
                    (!imagen || !documento)
                ) {
                    throw new Error("Para otra CURP, selecciona la fotografía y el PDF del nuevo auxiliar.");
                }

                estado.textContent =
                    "Subiendo documentos y guardando el auxiliar…";

                if (imagen && !fotoSubida) {
                    fotoSubida = await subirFotoResponsable(
                        imagen,
                        "auxiliares"
                    );
                }

                if (documento && !pdfSubido) {
                    pdfSubido = await subirCurpResponsable(
                        documento,
                        "auxiliares"
                    );
                }

                const cambios = {
                    nombre: nombre.value
                        .trim()
                        .replace(/\s+/g, " ")
                        .toUpperCase(),
                    curp: curp.value.trim().toUpperCase()
                };

                if (fotoSubida) {
                    Object.assign(cambios, {
                        fotoUrl: fotoSubida.url,
                        fotoPublicId: fotoSubida.publicId
                    });
                }

                if (pdfSubido) {
                    Object.assign(cambios, {
                        curpPdfUrl: pdfSubido.url,
                        curpPdfPublicId: pdfSubido.publicId
                    });
                }

                await guardarAuxiliar(
                    uid,
                    equipoActual.id,
                    categoriaId,
                    Number(datos.version || 0),
                    cambios
                );

                terminar();
            } catch (error) {
                estado.textContent = error.message;
            } finally {
                ocupada = false;

                controles.forEach(control => {
                    control.disabled = false;
                });
            }
        });

        cargar();
    });
}