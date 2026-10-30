import { doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db, auth } from "../firebase.js";
import { cerrarSesion, usuarioTieneRol } from "../roles.js";
import { subirFotoResponsable, subirCurpResponsable } from "../cloudinary.js";

function expedienteCompleto(datos) {
    return /^https:\/\//.test(datos.fotoUrl || "") &&
        /^https:\/\//.test(datos.curpPdfUrl || "") &&
        /^[A-Z0-9]{18}$/.test(datos.curp || "");
}

async function guardarExpediente(uid, version, cambios) {
    return runTransaction(db, async transaccion => {
        const referencia = doc(db, "usuarios", uid);
        const snapshot = await transaccion.get(referencia);

        if (
            auth.currentUser?.uid !== uid ||
            !snapshot.exists() ||
            !usuarioTieneRol(snapshot.data(), "jefeEquipo") ||
            snapshot.data().activo === false
        ) {
            throw new Error("Tu sesión debe corresponder a un Director Técnico activo.");
        }

        const actual = snapshot.data().documentacionJefeEquipo || {};

        if (Number(actual.version || 0) !== version) {
            throw new Error("Tu expediente cambió en otra sesión. Recarga la página antes de guardar.");
        }

        const nuevo = { ...actual, ...cambios };

        if (!expedienteCompleto(nuevo)) {
            throw new Error("Completa fotografía, CURP de 18 caracteres y documento PDF.");
        }

        transaccion.update(referencia, {
            documentacionJefeEquipo: {
                ...nuevo,
                version: version + 1,
                actualizadoEn: serverTimestamp(),
                actualizadoPor: uid
            }
        });
    });
}

export async function exigirDocumentacionJefeEquipo(usuario) {
    if (usuario.rol === "admin") return;

    const uid = usuario.firebaseUser?.uid || usuario.uid;

    if (
        !uid ||
        auth.currentUser?.uid !== uid ||
        !usuarioTieneRol(usuario, "jefeEquipo")
    ) {
        throw new Error("No se pudo verificar tu sesión de Director Técnico.");
    }

    const panel = document.createElement("dialog");

    panel.setAttribute("aria-labelledby", "expedienteJefeEquipoTitulo");

    panel.classList.add("expediente-jefe-dialog");
    panel.style.cssText = "position:fixed;inset:0;margin:auto;width:min(620px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 32px);padding:0;border:0;border-radius:24px;background:#fff;color:#18392f;overflow:auto;box-sizing:border-box;box-shadow:0 28px 90px rgba(0,0,0,.3);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";

    panel.innerHTML = `
        <style>
        .expediente-jefe-dialog::backdrop {
            background: rgba(9,28,22,.74);
            backdrop-filter: blur(6px);
        }

        .expediente-jefe-dialog .exp-jefe,
        .expediente-jefe-dialog .exp-jefe * {
            box-sizing: border-box;
        }

        .expediente-jefe-dialog .exp-jefe {
            padding: 0 26px 22px;
            font-family: inherit;
        }

        .expediente-jefe-dialog .exp-jefe-cabecera {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin: 0 -26px 18px;
            padding: 25px 26px;
            background: linear-gradient(125deg,#083c30,#117660);
            color: #fff;
            border-bottom: 4px solid #dcb565;
        }

        .expediente-jefe-dialog .exp-jefe-cabecera > div {
            min-width: 0;
        }

        .expediente-jefe-dialog .exp-jefe-etiqueta {
            display: block;
            color: #f2d49b;
            font-size: .61rem;
            font-weight: 800;
            letter-spacing: .12em;
            line-height: 1.6;
        }

        .expediente-jefe-dialog .exp-jefe h2 {
            margin: 7px 0;
            color: #fff;
            font-size: clamp(1.2rem,4.5vw,1.65rem);
            line-height: 1.2;
            font-weight: 850;
            letter-spacing: -.035em;
        }

        .expediente-jefe-dialog .exp-jefe-subtitulo {
            display: block;
            font-size: .76rem;
            color: #d8eee4;
            line-height: 1.5;
        }

        .expediente-jefe-dialog .exp-jefe-logo {
            display: block;
            width: 72px;
            height: 72px;
            flex: 0 0 72px;
            object-fit: contain;
            padding: 8px;
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 6px 18px #002c3033;
        }

        .expediente-jefe-dialog .exp-jefe p {
            margin: 0 0 14px;
            color: #586c63;
            font-size: .85rem;
            line-height: 1.65;
        }

        .expediente-jefe-dialog .exp-jefe [role="status"] {
            padding: 12px 14px;
            background: #fff7e6;
            border: 1px solid #ecd8ac;
            border-left: 4px solid #c79943;
            border-radius: 12px;
            color: #73541d;
            font-size: .8rem;
            overflow-wrap: anywhere;
        }

        .expediente-jefe-dialog .exp-jefe label {
            display: block;
            margin-top: 14px;
            color: #23493b;
            font-size: .82rem;
            line-height: 1.5;
            font-weight: 800;
        }

        .expediente-jefe-dialog .exp-jefe input {
            display: block;
            width: 100%;
            min-width: 0;
            min-height: 46px;
            margin-top: 6px;
            padding: 11px 13px;
            border: 1px solid #cedbd4;
            border-radius: 12px;
            background: #f8fbf9;
            color: #1e3b30;
            font: inherit;
            font-size: 16px;
            transition: border-color .18s,box-shadow .18s;
        }

        .expediente-jefe-dialog .exp-jefe input[name="curp"] {
            font-weight: 700;
            letter-spacing: .06em;
            text-transform: uppercase;
        }

        .expediente-jefe-dialog .exp-jefe input[type="file"] {
            padding: 7px;
            font-size: .75rem;
            font-weight: 500;
            overflow: hidden;
        }

        .expediente-jefe-dialog .exp-jefe input::file-selector-button {
            margin-right: 10px;
            padding: 9px 12px;
            border: 0;
            border-radius: 8px;
            background: #e0eee6;
            color: #18533d;
            font: inherit;
            font-weight: 800;
            cursor: pointer;
        }

        .expediente-jefe-dialog .exp-jefe input:focus-visible,
        .expediente-jefe-dialog .exp-jefe button:focus-visible {
            outline: 3px solid #85bfa6;
            outline-offset: 3px;
            border-color: #21835e;
        }

        .expediente-jefe-dialog .exp-jefe small {
            display: block;
            margin-top: 6px;
            color: #6c7c73;
            font-size: .72rem;
            font-weight: 500;
            line-height: 1.5;
        }

        .expediente-jefe-dialog .exp-jefe form > img {
            display: block;
            width: 88px;
            height: 102px;
            object-fit: cover;
            margin-top: 10px;
            padding: 3px;
            border: 1px solid #d2ded6;
            border-radius: 14px;
            background: #fff;
        }

        .expediente-jefe-dialog .exp-jefe button {
            display: block;
            width: 100%;
            min-height: 48px;
            margin-top: 18px;
            padding: 13px 16px;
            border: 1px solid transparent;
            border-radius: 13px;
            background: linear-gradient(110deg,#0a5941,#128665);
            color: #fff;
            font: inherit;
            font-size: .86rem;
            font-weight: 800;
            line-height: 1.4;
            cursor: pointer;
            box-shadow: 0 5px 14px #09644720;
            transition: filter .18s;
        }

        .expediente-jefe-dialog .exp-jefe button[data-salir] {
            min-height: 44px;
            margin-top: 9px;
            background: #fff;
            border-color: #dbe5df;
            color: #5b6f63;
            box-shadow: none;
        }

        .expediente-jefe-dialog .exp-jefe button:disabled {
            opacity: .6;
            cursor: wait;
        }

        .expediente-jefe-dialog .exp-jefe [hidden] {
            display: none !important;
        }

        @media (hover:hover) {
            .expediente-jefe-dialog .exp-jefe button:hover:not(:disabled) {
                filter: brightness(.95);
            }
        }

        @media (max-width:480px) {
            .expediente-jefe-dialog .exp-jefe {
                padding: 0 17px 18px;
            }

            .expediente-jefe-dialog .exp-jefe-cabecera {
                margin-right: -17px;
                margin-left: -17px;
                padding: 21px 17px;
                gap: 10px;
            }

            .expediente-jefe-dialog .exp-jefe-logo {
                width: 56px;
                height: 56px;
                flex-basis: 56px;
                border-radius: 14px;
                padding: 6px;
            }

            .expediente-jefe-dialog .exp-jefe-etiqueta {
                font-size: .53rem;
                letter-spacing: .07em;
            }

            .expediente-jefe-dialog .exp-jefe input::file-selector-button {
                padding-right: 9px;
                padding-left: 9px;
                margin-right: 7px;
            }
        }
    </style>

        <div class="exp-jefe">
            
            <header class="exp-jefe-cabecera">
                <div>
                    <span class="exp-jefe-etiqueta">
                        LIGA MUNICIPAL ? R?O GRANDE
                    </span>
                    <h2 id="expedienteJefeEquipoTitulo">
                        Director T?cnico ? Tu expediente
                    </h2>
                    <span class="exp-jefe-subtitulo">
                        Paso 1 ? Tu expediente personal
                    </span>
                </div>
                <img
                    class="exp-jefe-logo"
                    src="imagenes/logo.png"
                    alt="Liga Municipal de F?tbol R?o Grande"
                >
            </header>

            <p>
                Antes de entrar a tu panel, registra tu fotografía y tu CURP.
                Administración utilizará estos datos para emitir tu credencial.
            </p>

            <p role="status" aria-live="polite">
                Consultando tu expediente…
            </p>

            <form hidden>
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

                <img alt="Tu fotografía" hidden>

                <label>
                    CURP
                    <input
                        name="curp"
                        maxlength="18"
                        minlength="18"
                        pattern="[A-Z0-9]{18}"
                        autocomplete="off"
                        required
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
                    Guardar y continuar
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

    const form = panel.querySelector("form");
    const estado = panel.querySelector("[role=status]");
    const reintentar = panel.querySelector("[data-reintentar]");
    const salir = panel.querySelector("[data-salir]");

    const foto = form.elements.foto;
    const pdf = form.elements.pdf;
    const curp = form.elements.curp;

    let datos = {};
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
            estado.textContent = "Consultando tu expediente…";

            try {
                const snapshot = await getDoc(
                    doc(db, "usuarios", uid)
                );

                if (
                    auth.currentUser?.uid !== uid ||
                    !snapshot.exists() ||
                    !usuarioTieneRol(snapshot.data(), "jefeEquipo") ||
                    snapshot.data().activo === false
                ) {
                    throw new Error("No se pudo verificar una cuenta de jefe de equipo activa.");
                }

                datos = snapshot.data().documentacionJefeEquipo || {};

                if (expedienteCompleto(datos)) {
                    return terminar();
                }

                curp.value = datos.curp || "";
                foto.required = !datos.fotoUrl;
                pdf.required = !datos.curpPdfUrl;

                if (datos.fotoUrl) {
                    panel.querySelector("img").src = datos.fotoUrl;
                    panel.querySelector("img").hidden = false;

                    panel.querySelector("[data-foto]").textContent =
                        "Fotografía guardada. Puedes reemplazarla.";
                }

                if (datos.curpPdfUrl) {
                    panel.querySelector("[data-pdf]").textContent =
                        "PDF guardado. Puedes reemplazarlo.";
                }

                form.hidden = false;

                estado.textContent =
                    "Faltan datos. Completa tu expediente para continuar.";

                curp.focus();
            } catch (error) {
                estado.textContent = error.message;
                reintentar.hidden = false;
            }
        }

        reintentar.addEventListener("click", cargar);
        salir.addEventListener("click", cerrarSesion);

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

            const imagen = panel.querySelector("img");

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
                    throw new Error("Tu sesión cambió. Recarga la página.");
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
                    throw new Error("La foto debe ser JPG, PNG o WEBP de máximo 5 MB.");
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

                estado.textContent =
                    "Subiendo documentos y guardando tu expediente…";

                if (imagen && !fotoSubida) {
                    fotoSubida = await subirFotoResponsable(
                        imagen,
                        "entrenadores"
                    );
                }

                if (documento && !pdfSubido) {
                    pdfSubido = await subirCurpResponsable(
                        documento,
                        "entrenadores"
                    );
                }

                const cambios = {
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

                await guardarExpediente(
                    uid,
                    Number(datos.version || 0),
                    cambios
                );

                terminar();
            } catch (error) {
                estado.textContent =
                    error.message ||
                    "No se pudo guardar. Intenta nuevamente.";
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