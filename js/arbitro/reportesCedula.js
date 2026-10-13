import {
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina
} from "../roles.js";

import {
    db
} from "../firebase.js";

const usuario = await protegerPagina([
    "arbitro",
    "admin"
]);

if (usuario) {
    iniciarReportesCedula();
}

async function iniciarReportesCedula() {
    const partidoId = new URLSearchParams(window.location.search).get("id");
    const plantillas = document.querySelector(".plantillas-cedula");

    if (!partidoId || !plantillas) {
        return;
    }

    const referenciaCedula = doc(db, "cedulas", partidoId);
    const referenciaPartido = doc(db, "partidos", partidoId);
    const snapshotPartido = await getDoc(referenciaPartido);

    if (!snapshotPartido.exists()) {
        return;
    }

    const partido = snapshotPartido.data();
    const bloque = crearBloqueReportes(partido);
    const estado = bloque.querySelector("[data-reportes-estado]");
    const listaReportes = bloque.querySelector("[data-reportes-lista]");

    bloque.querySelectorAll("input[type='checkbox']").forEach(input => {
        input.addEventListener("change", async () => {
            const valorAnterior = !input.checked;
            const campo = input.dataset.campo;

            input.disabled = true;
            estado.textContent = "Guardando autorización...";

            try {
                await setDoc(
                    referenciaCedula,
                    {
                        partidoId,
                        localId: partido.localId || "",
                        localNombre: partido.localNombre || "Equipo local",
                        visitanteId: partido.visitanteId || "",
                        visitanteNombre: partido.visitanteNombre || "Equipo visitante",
                        [campo]: input.checked,
                        reportesHabilitadosActualizadoPor: usuario.uid || usuario.id || "",
                        reportesHabilitadosActualizadoEn: serverTimestamp()
                    },
                    { merge: true }
                );

                estado.textContent = "Autorización guardada.";
            } catch (error) {
                input.checked = valorAnterior;
                estado.textContent = "No se pudo guardar. Intenta de nuevo.";
                console.error("Error guardando permisos de reportes:", error);
            } finally {
                input.disabled = false;
            }
        });
    });

    onSnapshot(
        referenciaCedula,
        snapshot => {
            const datos = snapshot.exists() ? snapshot.data() : {};

            bloque.querySelector("#reporteEquipoLocalHabilitado").checked =
                datos.reportesHabilitadosLocal === true;

            bloque.querySelector("#reporteEquipoVisitanteHabilitado").checked =
                datos.reportesHabilitadosVisitante === true;

            renderizarReportes(listaReportes, datos);
        },
        error => {
            estado.textContent = "No se pudo consultar el estado de los reportes.";
            console.error("Error consultando reportes de la cédula:", error);
        }
    );
}

function crearBloqueReportes(partido) {
    const seccionPlantillas = document.querySelector(".plantillas-cedula").closest(".cedula-bloque");
    const bloque = document.createElement("section");

    bloque.className = "cedula-bloque bloque-reportes-cedula";
    bloque.innerHTML = `
        <div class="seccion-header">
            <div>
                <span>REPORTES DE LOS EQUIPOS</span>
                <h2>Habilitar reporte del entrenador</h2>
                <p>Activa el equipo que podrá enviar un reporte relacionado con este encuentro.</p>
            </div>
        </div>
        <div class="reportes-habilitados-grid">
            <label class="certificacion-check">
                <input id="reporteEquipoLocalHabilitado" type="checkbox" data-campo="reportesHabilitadosLocal">
                <span>
                    <strong>Habilitar reporte local</strong>
                    <small>${escaparHTML(partido.localNombre || "Equipo local")}</small>
                </span>
            </label>
            <label class="certificacion-check">
                <input id="reporteEquipoVisitanteHabilitado" type="checkbox" data-campo="reportesHabilitadosVisitante">
                <span>
                    <strong>Habilitar reporte visitante</strong>
                    <small>${escaparHTML(partido.visitanteNombre || "Equipo visitante")}</small>
                </span>
            </label>
        </div>
        <p class="reportes-estado-cedula" data-reportes-estado aria-live="polite">Selecciona uno o ambos equipos.</p>
        <div class="reportes-lista-cedula" data-reportes-lista></div>
    `;

    seccionPlantillas.insertAdjacentElement("afterend", bloque);
    agregarEstilosReportes();

    return bloque;
}

function renderizarReportes(contenedor, datos) {
    const reportes = [
        {
            etiqueta: datos.localNombre || "Equipo local",
            reporte: datos.reporteEquipoLocal
        },
        {
            etiqueta: datos.visitanteNombre || "Equipo visitante",
            reporte: datos.reporteEquipoVisitante
        }
    ].filter(item => item.reporte && String(item.reporte.texto || "").trim());

    contenedor.innerHTML = "";

    contenedor.closest(".bloque-reportes-cedula")?.classList.toggle(
        "sin-reportes",
        reportes.length === 0
    );

    if (!reportes.length) {
        return;
    }

    const titulo = document.createElement("h3");
    titulo.textContent = "Reportes recibidos";
    contenedor.appendChild(titulo);

    reportes.forEach(item => {
        const articulo = document.createElement("article");
        const equipo = document.createElement("strong");
        const texto = document.createElement("p");
        const autor = document.createElement("small");

        equipo.textContent = item.etiqueta;
        texto.textContent = item.reporte.texto;
        autor.textContent = item.reporte.entrenadorNombre || "Entrenador del equipo";

        articulo.append(equipo, texto, autor);
        contenedor.appendChild(articulo);
    });
}

function agregarEstilosReportes() {
    if (document.getElementById("estilosReportesCedula")) {
        return;
    }

    const estilos = document.createElement("style");
    estilos.id = "estilosReportesCedula";
    estilos.textContent = `
        .reportes-habilitados-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .reportes-estado-cedula{margin:12px 0 0;color:#587069;font-size:.78rem}
        .reportes-lista-cedula{display:grid;gap:10px;margin-top:14px}
        .reportes-lista-cedula h3{margin:0;color:#123d38;font-size:.9rem}
        .reportes-lista-cedula article{display:grid;gap:6px;padding:12px;border:1px solid #d9e5de;border-radius:12px;background:#f8fbf8}
        .reportes-lista-cedula article strong{color:#14574f;font-size:.8rem}
        .reportes-lista-cedula article p{margin:0;color:#34443f;font-size:.78rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
        .reportes-lista-cedula article small{color:#75827b;font-size:.68rem}
        @media(max-width:620px){.reportes-habilitados-grid{grid-template-columns:1fr}}
        @media print{.bloque-reportes-cedula.sin-reportes{display:none!important}.reportes-habilitados-grid,.reportes-estado-cedula,.bloque-reportes-cedula .seccion-header p{display:none!important}.reportes-lista-cedula article{break-inside:avoid}}
    `;

    document.head.appendChild(estilos);
}

function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}