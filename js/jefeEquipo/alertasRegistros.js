import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db } from "../firebase.js";

function tienePdfCurp(jugador) {
    return ["curpArchivoUrl", "curpUrl", "documentoCurpUrl", "archivoCurpUrl", "pdfCurpUrl"].some(campo => {
        try { return new URL(jugador[campo]).protocol === "https:"; }
        catch { return false; }
    });
}

export function iniciarAlertasRegistros(equipos, abrir) {
    const panel = document.getElementById("alertasRegistros");
    const resumen = document.getElementById("alertasRegistrosResumen");
    const lista = document.getElementById("alertasRegistrosLista");
    const marco = document.getElementById("alertasRegistrosMarco");
    const estados = new Map(equipos.map(equipo => [equipo.id, null]));

    function renderizar() {
        const filas = [];
        for (const equipo of equipos) {
            for (const alerta of estados.get(equipo.id) || []) filas.push({ equipo, ...alerta });
        }
        const error = [...estados.values()].includes(false);
        const cargando = [...estados.values()].includes(null);
        panel.dataset.estado = filas.length ? "alerta" : error || cargando ? "pendiente" : "bien";
        const cantidad = filas.length === 1 ? "1 registro necesita atención." : `${filas.length} registros necesitan atención.`;
        resumen.textContent = filas.length
            ? cantidad + (error ? " No pudimos consultar todos tus equipos." : "")
            : error ? "No pudimos consultar todos tus equipos. Recarga para volver a intentarlo."
            : cargando ? "Revisando tus registros…" : "Sin alertas en tus registros.";
        const animar = filas.length > 0 && marco.hidden;
        marco.hidden = !filas.length;
        if (animar) {
            marco.classList.add("dt-alertas-pulso");
            marco.addEventListener("animationend", () => marco.classList.remove("dt-alertas-pulso"), { once: true });
        }
        lista.replaceChildren();
        for (const { equipo, id, nombre, motivo, dorsal, pdf, inactivo, categoria } of filas) {
            const fila = document.createElement("li");
            const insignia = document.createElement("span");
            insignia.className = "dt-alertas-insignia";
            insignia.textContent = "Alerta de identidad";
            const titulo = document.createElement("h3");
            titulo.textContent = nombre;
            const razon = document.createElement("p");
            razon.className = "dt-alertas-razon";
            razon.textContent = motivo;
            const equipoTexto = document.createElement("p");
            equipoTexto.textContent = [equipo.nombre, categoria].filter(Boolean).join(" / ");
            const dorsalTexto = document.createElement("p");
            dorsalTexto.textContent = "Dorsal: " + dorsal;
            const nota = document.createElement("small");
            nota.textContent = (pdf ? "PDF de CURP registrado" : "Sin PDF de CURP") + (inactivo ? " / Jugador inactivo" : "");
            const boton = document.createElement("button");
            boton.type = "button";
            boton.textContent = "Solucionar";
            boton.setAttribute("aria-label", "Solucionar alerta de " + nombre);
            boton.onclick = () => abrir(equipo.id, id, motivo);
            fila.append(insignia, titulo, razon, equipoTexto, dorsalTexto, nota, boton);
            lista.append(fila);
        }
    }

    panel.hidden = false;
    renderizar();

    const cancelar = equipos.map(equipo => onSnapshot(
        query(collection(db, "jugadores"), where("equipoId", "==", equipo.id)),
        { includeMetadataChanges: true },
        snapshot => {
            if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
            estados.set(equipo.id, snapshot.docs.flatMap(documento => {
                const jugador = documento.data();
                const alerta = jugador.alertaRevisionIdentidad;
                if (jugador.equipoId !== equipo.id || alerta?.activa !== true) return [];
                return [{
                    id: documento.id,
                    nombre: String(jugador.nombreCompleto || jugador.nombre || "Jugador"),
                    categoria: equipo.categoriaNombre || jugador.categoriaNombre || "",
                    dorsal: String(jugador.numero ?? jugador.dorsal ?? jugador.numeroJugador ?? "").trim() || "Sin asignar",
                    pdf: tienePdfCurp(jugador),
                    inactivo: jugador.activo === false,
                    motivo: String(alerta.motivo || "Consulta con administración el motivo de esta alerta.")
                }];
            }));
            renderizar();
        },
        error => {
            console.error("No se pudieron consultar las alertas del equipo:", error);
            estados.set(equipo.id, false);
            renderizar();
        }
    ));
    return () => cancelar.forEach(detener => detener());
}
