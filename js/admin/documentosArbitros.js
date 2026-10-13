import {
    collection, query, where, getDocs, doc, getDoc,
    runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db, auth } from "../firebase.js";
import { protegerPagina } from "../roles.js";
import {
    subirFotoResponsable,
    subirCurpResponsable
} from "../cloudinary.js";

function validarCuentas(admin, arbitro, adminUid) {
    if (
        auth.currentUser?.uid !== adminUid ||
        !admin.exists() ||
        admin.data().rol !== "admin" ||
        admin.data().activo === false
    ) {
        throw new Error("Se requiere una sesión administradora activa.");
    }

    if (!arbitro.exists() || arbitro.data().rol !== "arbitro") {
        throw new Error(
            "La cuenta seleccionada ya no corresponde a un árbitro."
        );
    }
}

async function guardarDocumentacion({
    adminUid,
    arbitroId,
    version,
    cambios
}) {
    return runTransaction(db, async transaccion => {
        const referencia = doc(db, "usuarios", arbitroId);

        const [admin, arbitro] = await Promise.all([
            transaccion.get(doc(db, "usuarios", adminUid)),
            transaccion.get(referencia)
        ]);

        validarCuentas(admin, arbitro, adminUid);

        const actual = arbitro.data().documentacionArbitro || {};

        if (Number(actual.version || 0) !== version) {
            throw new Error(
                "La documentación cambió en otra sesión. Selecciona nuevamente al árbitro antes de guardar."
            );
        }

        transaccion.update(referencia, {
            documentacionArbitro: {
                ...actual,
                ...cambios,
                version: version + 1,
                actualizadoEn: serverTimestamp(),
                actualizadoPor: adminUid
            }
        });
    });
}

async function iniciar() {
    const usuario = await protegerPagina(["admin"]);

    if (!usuario) return;

    const adminUid = usuario.firebaseUser?.uid || usuario.uid;
    const contenedor = document.querySelector(".arbitros-contenido");

    if (
        !adminUid ||
        !contenedor ||
        document.getElementById("documentosArbitrosPanel")
    ) {
        return;
    }

    let documentacion = {};
    let idCargado = "";
    let secuencia = 0;
    let ocupada = false;
    let previewUrl = "";
    let fotoSubida = null;
    let pdfSubido = null;

    const estilos = document.createElement("style");

    estilos.textContent = `
        .documentos-arbitros {
            margin:18px 0;
            border:1px solid #cbd5d1;
            border-radius:20px;
            overflow:hidden;
            background:#fff8e8;
            box-shadow:0 8px 24px rgba(38,67,48,.07);
        }
        .documentos-arbitros-cabecera {
            padding:20px;
            background:linear-gradient(120deg,#07574f,#0b756d);
            color:white;
        }
        .documentos-arbitros-cabecera h2 {
            margin:0 0 7px;
            color:white;
            font-size:1.1rem;
        }
        .documentos-arbitros p {
            font-size:.82rem;
            line-height:1.6;
        }
        .documentos-arbitros-cabecera p {
            margin:0;
            color:#d8ede6;
        }
        .documentos-arbitros form {
            padding:20px;
        }
        .documentos-arbitros label {
            display:block;
            font-size:.82rem;
            font-weight:800;
            color:#07574f;
        }
        .documentos-arbitros input,
        .documentos-arbitros select {
            display:block;
            width:100%;
            min-height:46px;
            margin-top:8px;
            padding:11px;
            border:1px solid #bba87b;
            border-radius:11px;
            background:white;
            color:#17332e;
            font:inherit;
            box-sizing:border-box;
        }
        .documentos-arbitros input[type=file] {
            font-size:.75rem;
        }
        .documentos-arbitros-grid {
            display:grid;
            grid-template-columns:160px 1fr 1fr;
            gap:18px;
            margin-top:18px;
            align-items:start;
        }
        .documentos-arbitros-foto {
            text-align:center;
        }
        .documentos-arbitros-foto img {
            display:block;
            width:120px;
            height:120px;
            margin:auto;
            border:3px solid #d7ece6;
            border-radius:16px;
            object-fit:cover;
            background:white;
        }
        .documentos-arbitros-foto small {
            display:block;
            margin-top:8px;
            color:#68746e;
        }
        .documentos-arbitros a {
            display:inline-block;
            margin-top:10px;
            color:#07574f;
            font-size:.82rem;
            font-weight:800;
        }
        .documentos-arbitros [hidden] {
            display:none!important;
        }
        .documentos-arbitros button {
            min-height:46px;
            margin-top:18px;
            padding:12px 18px;
            border:0;
            border-radius:11px;
            background:#0b756d;
            color:white;
            font-weight:800;
            cursor:pointer;
        }
        .documentos-arbitros button:disabled {
            opacity:.6;
            cursor:default;
        }
        .documentos-arbitros-estado {
            padding:12px;
            border-radius:10px;
            background:#e5efea;
            color:#07574f;
        }
        .documentos-arbitros-estado.error {
            background:#f9ded8;
            color:#982d24;
        }
        .documentos-arbitros .campo-curp {
            margin-top:18px;
        }
        @media(max-width:750px) {
            .documentos-arbitros-grid {
                grid-template-columns:1fr;
            }
            .documentos-arbitros-foto {
                text-align:left;
            }
            .documentos-arbitros-foto img {
                margin:0;
            }
            .documentos-arbitros form {
                padding:16px;
            }
            .documentos-arbitros button {
                width:100%;
            }
        }
    `;

    document.head.appendChild(estilos);

    const panel = document.createElement("section");
    panel.id = "documentosArbitrosPanel";
    panel.className = "documentos-arbitros";

    panel.innerHTML = `
        <div class="documentos-arbitros-cabecera">
            <h2>Documentación de árbitros</h2>
            <p>
                Fotografía y documento PDF de CURP para su expediente
                y credencial.
            </p>
        </div>
        <form>
            <label>
                Árbitro
                <select data-documento="arbitro" disabled>
                    <option value="">Cargando árbitros...</option>
                </select>
            </label>

            <div class="documentos-arbitros-grid">
                <div class="documentos-arbitros-foto">
                    <img
                        data-documento="preview"
                        src="imagenes/logo.png"
                        alt="Vista previa de fotografía"
                    >
                    <small data-documento="fotoEstado">
                        Sin fotografía seleccionada
                    </small>
                </div>

                <div>
                    <label>
                        Fotografía
                        <input
                            data-documento="foto"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled
                        >
                    </label>
                    <p>JPG, PNG o WEBP. Máximo 5 MB.</p>
                </div>

                <div>
                    <label>
                        Documento CURP
                        <input
                            data-documento="pdf"
                            type="file"
                            accept="application/pdf"
                            disabled
                        >
                    </label>
                    <p>PDF. Máximo 10 MB.</p>
                    <a
                        data-documento="enlace"
                        target="_blank"
                        rel="noopener noreferrer"
                        hidden
                    >
                        Ver PDF guardado
                    </a>
                </div>
            </div>

            <label class="campo-curp">
                CURP, si ya está disponible
                <input
                    data-documento="curp"
                    type="text"
                    maxlength="18"
                    autocomplete="off"
                    disabled
                >
            </label>

            <button type="submit" disabled>
                Guardar documentación
            </button>

            <p
                data-documento="estado"
                class="documentos-arbitros-estado"
                role="status"
                aria-live="polite"
            >
                Selecciona un árbitro.
            </p>
        </form>
    `;

    const resumen = contenedor.querySelector(".resumen-arbitros");

    if (resumen) {
        contenedor.insertBefore(panel, resumen);
    } else {
        contenedor.appendChild(panel);
    }

    const campo = nombre =>
        panel.querySelector('[data-documento="' + nombre + '"]');

    const selector = campo("arbitro");
    const foto = campo("foto");
    const pdf = campo("pdf");
    const curp = campo("curp");
    const guardar = panel.querySelector("button");
    const estado = campo("estado");

    function informar(mensaje, error = false) {
        estado.textContent = mensaje;
        estado.classList.toggle("error", error);
    }

    function habilitar() {
        selector.disabled = ocupada;

        [foto, pdf, curp, guardar].forEach(control => {
            control.disabled = ocupada || !idCargado;
        });
    }

    function liberarPreview() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = "";
    }

    function mostrarDocumentos(actualizarCurp = true) {
        liberarPreview();

        campo("preview").src =
            documentacion.fotoUrl || "imagenes/logo.png";

        campo("fotoEstado").textContent = documentacion.fotoUrl
            ? "Fotografía guardada" : "Falta fotografía";

        campo("enlace").hidden = true;
        campo("enlace").removeAttribute("href");

        try {
            const url = new URL(documentacion.curpPdfUrl || "");

            if (url.protocol === "https:") {
                campo("enlace").href = url.href;
                campo("enlace").hidden = false;
            }
        } catch {}

        if (actualizarCurp) {
            curp.value = documentacion.curp || "";
        }
    }

    async function cargarSeleccion() {
        const turno = ++secuencia;
        const id = selector.value;

        idCargado = "";
        documentacion = {};
        foto.value = "";
        pdf.value = "";
        fotoSubida = null;
        pdfSubido = null;

        mostrarDocumentos();
        habilitar();

        if (!id) {
            informar("Selecciona un árbitro.");
            return;
        }

        informar("Cargando documentación...");

        try {
            const snapshot = await getDoc(doc(db, "usuarios", id));

            if (turno !== secuencia || selector.value !== id) return;

            if (
                !snapshot.exists() ||
                snapshot.data().rol !== "arbitro"
            ) {
                throw new Error("El árbitro ya no está disponible.");
            }

            documentacion = snapshot.data().documentacionArbitro || {};
            idCargado = id;

            mostrarDocumentos();

            informar(
                documentacion.fotoUrl && documentacion.curpPdfUrl
                    ? "Fotografía y PDF registrados."
                    : "Documentación incompleta: falta fotografía o PDF de CURP."
            );
        } catch (error) {
            if (turno === secuencia) {
                informar(
                    error.message || "No se pudo cargar la documentación.",
                    true
                );
            }
        } finally {
            if (turno === secuencia) habilitar();
        }
    }

    selector.addEventListener("change", cargarSeleccion);

    curp.addEventListener("input", () => {
        curp.value = curp.value.toUpperCase().replace(/\s/g, "");
    });

    pdf.addEventListener("change", () => {
        pdfSubido = null;
    });

    foto.addEventListener("change", () => {
        fotoSubida = null;
        liberarPreview();

        const archivo = foto.files[0];

        if (!archivo) {
            mostrarDocumentos(false);
            return;
        }

        if (
            !["image/jpeg", "image/png", "image/webp"].includes(archivo.type) ||
            archivo.size > 5 * 1024 * 1024
        ) {
            foto.value = "";

            campo("preview").src =
                documentacion.fotoUrl || "imagenes/logo.png";

            campo("fotoEstado").textContent = documentacion.fotoUrl
                ? "Fotografía guardada" : "Falta fotografía";

            informar(
                "Selecciona una imagen JPG, PNG o WEBP de hasta 5 MB.",
                true
            );

            return;
        }

        previewUrl = URL.createObjectURL(archivo);
        campo("preview").src = previewUrl;
        campo("fotoEstado").textContent =
            "Fotografía nueva, pendiente de guardar";
    });

    panel.querySelector("form").addEventListener("submit", async evento => {
        evento.preventDefault();

        if (ocupada || !idCargado) return;

        const id = idCargado;
        const version = Number(documentacion.version || 0);
        const valorCurp = curp.value.trim().toUpperCase();

        if (valorCurp && !/^[A-Z0-9]{18}$/.test(valorCurp)) {
            informar(
                "La CURP debe tener 18 caracteres, usando letras y números.",
                true
            );
            return;
        }

        const archivoFoto = foto.files[0];
        const archivoPdf = pdf.files[0];

        if (
            !archivoFoto &&
            !archivoPdf &&
            valorCurp === (documentacion.curp || "")
        ) {
            informar(
                "Selecciona un archivo nuevo o actualiza la CURP antes de guardar."
            );
            return;
        }

        ocupada = true;
        habilitar();
        informar("Verificando y guardando documentación...");

        try {
            const [admin, arbitro] = await Promise.all([
                getDoc(doc(db, "usuarios", adminUid)),
                getDoc(doc(db, "usuarios", id))
            ]);

            validarCuentas(admin, arbitro, adminUid);

            if (
                Number(arbitro.data().documentacionArbitro?.version || 0) !==
                version
            ) {
                throw new Error(
                    "La documentación cambió. Selecciona nuevamente al árbitro."
                );
            }

            if (archivoFoto && !fotoSubida) {
                fotoSubida = await subirFotoResponsable(
                    archivoFoto,
                    "arbitros"
                );
            }

            if (archivoPdf && !pdfSubido) {
                pdfSubido = await subirCurpResponsable(
                    archivoPdf,
                    "arbitros"
                );
            }

            const cambios = { curp: valorCurp };

            if (archivoFoto) {
                Object.assign(cambios, {
                    fotoUrl: fotoSubida.url,
                    fotoPublicId: fotoSubida.publicId
                });
            }

            if (archivoPdf) {
                Object.assign(cambios, {
                    curpPdfUrl: pdfSubido.url,
                    curpPdfPublicId: pdfSubido.publicId
                });
            }

            await guardarDocumentacion({
                adminUid,
                arbitroId: id,
                version,
                cambios
            });

            documentacion = {
                ...documentacion,
                ...cambios,
                version: version + 1
            };

            foto.value = "";
            pdf.value = "";
            fotoSubida = null;
            pdfSubido = null;

            mostrarDocumentos();

            informar(
                "Documentación guardada correctamente." +
                (
                    documentacion.fotoUrl && documentacion.curpPdfUrl
                        ? " Fotografía y PDF completos."
                        : " Todavía falta fotografía o PDF."
                )
            );
        } catch (error) {
            console.error("Error guardando documentación arbitral:", error);

            informar(
                error.message || "No se pudo guardar la documentación.",
                true
            );
        } finally {
            ocupada = false;
            habilitar();
        }
    });

    window.addEventListener("pagehide", liberarPreview, { once: true });

    try {
        const snapshot = await getDocs(
            query(
                collection(db, "usuarios"),
                where("rol", "==", "arbitro")
            )
        );

        selector.replaceChildren();

        const vacia = document.createElement("option");
        vacia.value = "";
        vacia.textContent = "Selecciona un árbitro";
        selector.appendChild(vacia);

        snapshot.docs
            .map(d => ({ ...d.data(), id: d.id }))
            .sort((a, b) =>
                String(a.nombre || "").localeCompare(
                    String(b.nombre || ""),
                    "es"
                )
            )
            .forEach(arbitro => {
                const opcion = document.createElement("option");
                opcion.value = arbitro.id;
                opcion.textContent = `${arbitro.nombre || "Árbitro"}${arbitro.email ? " · " + arbitro.email : ""}${arbitro.activo === false ? " (inactivo)" : ""}`;
                selector.appendChild(opcion);
            });

        selector.value = "";
        habilitar();
    } catch (error) {
        console.error("Error cargando árbitros:", error);

        informar(
            "No se pudo cargar la lista de árbitros. Recarga la página.",
            true
        );
    }
}

await iniciar();