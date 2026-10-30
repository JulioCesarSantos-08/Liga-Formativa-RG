import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    protegerPagina,
    usuarioTieneRol
} from "../roles.js";

import {
    db
} from "../firebase.js";

const usuario = await protegerPagina([
    "jefeEquipo",
    "admin"
]);

if (usuario) {
    iniciarReportesEquipo();
}

async function iniciarReportesEquipo() {
    const contenedorPartidos = document.getElementById("contenidoPartidos");

    if (!contenedorPartidos || !usuarioTieneRol(usuario, "jefeEquipo")) {
        return;
    }

    const equipos = await obtenerEquiposUsuario();
    const equipo = resolverEquipoUsuario(equipos);

    if (!equipo) {
        return;
    }

    const reportes = await obtenerCedulasHabilitadas(equipo);

    if (!reportes.length) {
        return;
    }

    const panel = crearPanelReportes();
    const lista = panel.querySelector("[data-lista-reportes-equipo]");

    reportes.forEach(item => {
        lista.appendChild(crearFormularioReporte(item, equipo));
    });

    contenedorPartidos.appendChild(panel);
    agregarEstilosReportes();
}

async function obtenerEquiposUsuario() {
    const snapshot = await getDocs(collection(db, "equipos"));
    const usuarioId = usuario.uid || usuario.id;
    const todos = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));

    return todos.filter(equipo =>
        equipo.responsableId === usuarioId
    );
}

function resolverEquipoUsuario(equipos) {
    const equipoIdURL = new URLSearchParams(window.location.search).get("equipo");

    if (equipoIdURL) {
        return equipos.find(equipo => equipo.id === equipoIdURL) || null;
    }

    return equipos[0] || null;
}

async function obtenerCedulasHabilitadas(equipo) {
    const consultas = await Promise.all([
        getDocs(
            query(
                collection(db, "cedulas"),
                where("localId", "==", equipo.id)
            )
        ),
        getDocs(
            query(
                collection(db, "cedulas"),
                where("visitanteId", "==", equipo.id)
            )
        )
    ]);

    const documentos = new Map();

    consultas.forEach(snapshot => {
        snapshot.docs.forEach(documento => {
            documentos.set(documento.id, {
                id: documento.id,
                ...documento.data()
            });
        });
    });

    return [...documentos.values()]
        .map(cedula => {
            const esLocal = cedula.localId === equipo.id;
            const habilitado = esLocal
                ? cedula.reportesHabilitadosLocal === true
                : cedula.reportesHabilitadosVisitante === true;

            return habilitado
                ? {
                    cedula,
                    esLocal,
                    campoReporte: esLocal
                        ? "reporteEquipoLocal"
                        : "reporteEquipoVisitante"
                }
                : null;
        })
        .filter(Boolean)
        .sort((a, b) => {
            const fechaA = String(a.cedula.fecha || "9999-12-31");
            const fechaB = String(b.cedula.fecha || "9999-12-31");
            return fechaB.localeCompare(fechaA);
        });
}

function crearPanelReportes() {
    const panel = document.createElement("section");
    panel.className = "panel-partidos panel-reportes-equipo";
    panel.innerHTML = `
        <div class="panel-header">
            <div>
                <span class="panel-mini">SEGUIMIENTO DEL ENCUENTRO</span>
                <h2>Reportes habilitados</h2>
            </div>
        </div>
        <p class="reportes-equipo-intro">El árbitro habilitó un espacio para que tu equipo registre un reporte de este partido.</p>
        <div class="reportes-equipo-lista" data-lista-reportes-equipo></div>
    `;

    return panel;
}

function crearFormularioReporte(item, equipo) {
    const { cedula, esLocal, campoReporte } = item;
    const reporteGuardado = cedula[campoReporte];
    const articulo = document.createElement("article");
    const titulo = document.createElement("h3");
    const datos = document.createElement("p");
    const contenedor = document.createElement("div");

    articulo.className = "reporte-equipo-card";
    titulo.textContent = `${cedula.localNombre || "Local"} vs ${cedula.visitanteNombre || "Visitante"}`;
    datos.textContent = `${cedula.categoriaNombre || "Partido"} · ${cedula.jornadaNombre || "Sin jornada"} · ${esLocal ? "Equipo local" : "Equipo visitante"}`;

    articulo.append(titulo, datos);

    if (reporteGuardado && String(reporteGuardado.texto || "").trim()) {
        const estado = document.createElement("strong");
        const texto = document.createElement("p");
        const autor = document.createElement("small");

        estado.className = "reporte-equipo-enviado";
        estado.textContent = "Reporte enviado y agregado a la cédula";
        texto.className = "reporte-equipo-texto";
        texto.textContent = reporteGuardado.texto;
        autor.textContent = `Enviado por ${reporteGuardado.entrenadorNombre || "el entrenador"}`;

        contenedor.append(estado, texto, autor);
        articulo.appendChild(contenedor);
        return articulo;
    }

    const etiqueta = document.createElement("label");
    const area = document.createElement("textarea");
    const contador = document.createElement("small");
    const boton = document.createElement("button");
    const estado = document.createElement("p");

    etiqueta.textContent = "Describe lo ocurrido durante el encuentro";
    etiqueta.htmlFor = `reporte-${cedula.id}`;

    area.id = `reporte-${cedula.id}`;
    area.className = "reporte-equipo-area";
    area.maxLength = 2000;
    area.rows = 5;
    area.placeholder = "Escribe el reporte para que quede agregado a la cédula del partido.";
    area.setAttribute("aria-label", "Reporte del equipo");

    contador.className = "reporte-equipo-contador";
    contador.textContent = "0 / 2000";

    boton.type = "button";
    boton.className = "btn-principal reporte-equipo-enviar";
    boton.textContent = "Guardar y adjuntar a la cédula";
    boton.disabled = true;

    estado.className = "reporte-equipo-mensaje";
    estado.setAttribute("aria-live", "polite");

    area.addEventListener("input", () => {
        contador.textContent = `${area.value.length} / 2000`;
        boton.disabled = !area.value.trim();
    });

    boton.addEventListener("click", async () => {
        const texto = area.value.trim();

        if (!texto) {
            estado.textContent = "Escribe el reporte antes de guardarlo.";
            return;
        }

        boton.disabled = true;
        area.disabled = true;
        boton.textContent = "Guardando...";
        estado.textContent = "";

        try {
            const nombre = usuario.nombre || usuario.nombreCompleto || "Entrenador";

            await setDoc(
                doc(db, "cedulas", cedula.id),
                {
                    [campoReporte]: {
                        equipoId: equipo.id,
                        equipoNombre: equipo.nombre || "Equipo",
                        entrenadorId: usuario.uid || usuario.id || "",
                        entrenadorNombre: nombre,
                        texto,
                        estado: "enviado",
                        enviadoEn: serverTimestamp()
                    }
                },
                { merge: true }
            );

            boton.textContent = "Reporte guardado";
            estado.textContent = "El reporte quedó agregado a la cédula del partido.";
            area.readOnly = true;
        } catch (error) {
            area.disabled = false;
            boton.disabled = false;
            boton.textContent = "Guardar y adjuntar a la cédula";
            estado.textContent = "No se pudo guardar el reporte. Intenta de nuevo.";
            console.error("Error guardando reporte del equipo:", error);
        }
    });

    contenedor.className = "reporte-equipo-formulario";
    contenedor.append(etiqueta, area, contador, boton, estado);
    articulo.appendChild(contenedor);

    return articulo;
}

function agregarEstilosReportes() {
    if (document.getElementById("estilosReportesEquipo")) {
        return;
    }

    const estilos = document.createElement("style");
    estilos.id = "estilosReportesEquipo";
    estilos.textContent = [
        ".panel-reportes-equipo{margin-top:18px}",
        ".panel-reportes-equipo .panel-header{padding:18px 20px;background:linear-gradient(135deg,#e8d19a,#f4e7c5)}",
        ".panel-reportes-equipo .panel-mini{font-size:.62rem;letter-spacing:.12em}",
        ".panel-reportes-equipo .panel-header h2{font-size:1.08rem}",
        ".reportes-equipo-intro{margin:0;padding:14px 20px 0;color:#5f716b;font-size:.86rem;line-height:1.6}",
        ".reportes-equipo-lista{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;padding:18px 20px 20px}",
        ".reporte-equipo-card{display:grid;gap:14px;width:100%;box-sizing:border-box;padding:20px;border:1px solid #d8e2d9;border-left:5px solid #0b756d;border-radius:16px;background:linear-gradient(145deg,#fffefa,#f8fbf7);box-shadow:0 8px 22px rgba(26,67,55,.08)}",
        ".reporte-equipo-card h3{margin:0;color:#174b43;font-size:1rem;line-height:1.4}",
        ".reporte-equipo-card>p{margin:-7px 0 0;color:#6e7e76;font-size:.78rem;line-height:1.5}",
        ".reporte-equipo-formulario{display:grid;gap:9px}",
        ".reporte-equipo-formulario label{color:#30443d;font-size:.83rem;font-weight:800}",
        ".reporte-equipo-area{width:100%;min-height:150px;box-sizing:border-box;padding:14px;border:1px solid #cbd8d0;border-radius:12px;background:#fff;color:#263b34;font:inherit;font-size:.9rem;line-height:1.55;resize:vertical;transition:border-color .18s ease,box-shadow .18s ease}",
        ".reporte-equipo-area:focus{border-color:#0f766e;outline:none;box-shadow:0 0 0 3px rgba(15,118,110,.14)}",
        ".reporte-equipo-area:disabled{background:#f2f5f1;color:#61736c}",
        ".reporte-equipo-contador,.reporte-equipo-formulario small{color:#748078;font-size:.74rem}",
        ".reporte-equipo-enviar{width:min(100%,340px);min-height:48px;border:0;border-radius:12px;background:linear-gradient(135deg,#0b756d,#197e98);color:#fff;font-size:.82rem;font-weight:800;box-shadow:0 5px 14px rgba(11,117,109,.18);transition:transform .18s ease,filter .18s ease}",
        ".reporte-equipo-enviar:not(:disabled):hover{filter:brightness(1.06);transform:translateY(-1px)}",
        ".reporte-equipo-enviar:disabled{cursor:not-allowed;opacity:.55;box-shadow:none}",
        ".reporte-equipo-mensaje{min-height:1em;margin:0;color:#587069;font-size:.78rem;line-height:1.45}",
        ".reporte-equipo-enviado{display:inline-flex;width:fit-content;align-items:center;padding:7px 10px;border:1px solid #b8dfca;border-radius:999px;background:#e7f5eb;color:#197047;font-size:.78rem}",
        ".reporte-equipo-texto{margin:0;padding:14px;border:1px solid #dce8df;border-radius:12px;background:#fff;color:#35453f;font-size:.88rem;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}",
        ".reporte-equipo-card>div>small{color:#718078;font-size:.74rem}",
        "@media(max-width:600px){.panel-reportes-equipo .panel-header{padding:16px}.reportes-equipo-intro{padding:12px 16px 0;font-size:.8rem}.reportes-equipo-lista{gap:11px;padding:14px 12px 14px}.reporte-equipo-card{gap:12px;padding:15px;border-radius:14px}.reporte-equipo-card h3{font-size:.92rem}.reporte-equipo-card>p{font-size:.72rem}.reporte-equipo-area{min-height:135px;font-size:.86rem}.reporte-equipo-enviar{width:100%}}"
    ].join("\n");

    document.head.appendChild(estilos);
}
