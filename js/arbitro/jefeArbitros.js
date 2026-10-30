import {
    collection, query, where, getDocs, doc, getDoc,
    runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina, cerrarSesion, usuarioTieneRol } from "../roles.js";

const $ = id => document.getElementById(id);

let usuario = null;
let uid = "";
let puedeSolicitar = false;
let partidos = [];
let arbitros = [];
let solicitudes = [];
let oficiales = new Set();

function esOficial(cedula) {
    return ["registrada", "enviada"].includes(cedula?.estado);
}

function cerrado(partido) {
    return ["cancelado", "finalizado"].includes(partido.estado) ||
        partido.resultadoRegistrado === true ||
        oficiales.has(partido.id);
}

async function solicitarCambioArbitro(
    solicitanteUid,
    partidoId,
    propuestoId,
    motivo
) {
    if (
        !partidoId ||
        !propuestoId ||
        !motivo.trim() ||
        motivo.trim().length > 1000
    ) {
        throw new Error(
            "Selecciona el partido, el árbitro y un motivo de hasta 1000 caracteres."
        );
    }

    const referencia = doc(
        collection(db, "solicitudesCambioArbitro")
    );

    return runTransaction(db, async transaccion => {
        const refPartido = doc(db, "partidos", partidoId);

        const [
            configSnap,
            jefeSnap,
            partidoSnap,
            nuevoSnap,
            cedulaSnap
        ] = await Promise.all([
            transaccion.get(doc(db, "configuracionLiga", "general")),
            transaccion.get(doc(db, "usuarios", solicitanteUid)),
            transaccion.get(refPartido),
            transaccion.get(doc(db, "usuarios", propuestoId)),
            transaccion.get(doc(db, "cedulas", partidoId))
        ]);

        if (
            !configSnap.exists() ||
            configSnap.data().jefeArbitrosId !== solicitanteUid ||
            !jefeSnap.exists() ||
            !usuarioTieneRol(jefeSnap.data(), "arbitro") ||
            jefeSnap.data().activo === false
        ) {
            throw new Error(
                "Tu cuenta ya no tiene la designación de jefe de árbitros."
            );
        }

        if (!partidoSnap.exists()) {
            throw new Error("El partido ya no está disponible.");
        }

        const partido = partidoSnap.data();

        if (
            ["cancelado", "finalizado"].includes(partido.estado) ||
            partido.resultadoRegistrado === true ||
            (cedulaSnap.exists() && esOficial(cedulaSnap.data()))
        ) {
            throw new Error(
                "No se puede solicitar un cambio para un partido cancelado o con resultado oficial."
            );
        }

        if (
            !nuevoSnap.exists() ||
            !usuarioTieneRol(nuevoSnap.data(), "arbitro") ||
            nuevoSnap.data().activo === false
        ) {
            throw new Error(
                "El árbitro propuesto no está activo o ya no está disponible."
            );
        }

        if (partido.arbitroId === propuestoId) {
            throw new Error("Ese árbitro ya está asignado al partido.");
        }

        if (partido.solicitudCambioArbitroPendienteId) {
            const pendiente = await transaccion.get(
                doc(
                    db,
                    "solicitudesCambioArbitro",
                    partido.solicitudCambioArbitroPendienteId
                )
            );

            if (
                pendiente.exists() &&
                pendiente.data().estado === "pendiente"
            ) {
                throw new Error(
                    "Este partido ya tiene una solicitud de cambio pendiente."
                );
            }
        }

        transaccion.set(referencia, {
            partidoId,
            localNombre: partido.localNombre || "Equipo local",
            visitanteNombre: partido.visitanteNombre || "Equipo visitante",
            categoriaNombre: partido.categoriaNombre || "",
            jornadaNombre: partido.jornadaNombre || "",
            fecha: partido.fecha || "",
            hora: partido.hora || "",
            campo: partido.campo || "",
            arbitroActualId: partido.arbitroId || null,
            arbitroActualNombre: partido.arbitroNombre || "Sin asignar",
            arbitroPropuestoId: propuestoId,
            arbitroPropuestoNombre: nuevoSnap.data().nombre || "Árbitro",
            solicitanteId: solicitanteUid,
            solicitanteNombre: jefeSnap.data().nombre || "Jefe de árbitros",
            motivo: motivo.trim(),
            estado: "pendiente",
            creadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp()
        });

        transaccion.update(refPartido, {
            solicitudCambioArbitroPendienteId: referencia.id
        });

        return referencia.id;
    });
}

function opcion(select, valor, contenido) {
    const elemento = document.createElement("option");
    elemento.value = valor;
    elemento.textContent = contenido;
    select.appendChild(elemento);
}

function texto(contenedor, contenido, etiqueta = "p") {
    const elemento = document.createElement(etiqueta);
    elemento.textContent = contenido;
    contenedor.appendChild(elemento);
    return elemento;
}

function mostrarError(mensaje) {
    $("estadoCarga").classList.add("oculto");
    $("contenidoJefeArbitros").classList.add("oculto");
    $("estadoErrorTexto").textContent = mensaje;
    $("estadoError").classList.remove("oculto");
}

async function consultarArbitrosDobleRol() {
    const referencia = collection(db, "usuarios");

    const resultados = await Promise.all([
        getDocs(
            query(
                referencia,
                where("rol", "==", "arbitro")
            )
        ),
        getDocs(
            query(
                referencia,
                where("roles", "array-contains", "arbitro")
            )
        )
    ]);

    const unicos = new Map();

    for (const resultado of resultados) {
        for (const documento of resultado.docs) {
            if (usuarioTieneRol(documento.data(), "arbitro")) {
                unicos.set(documento.id, documento);
            }
        }
    }

    return {
        docs: [...unicos.values()]
    };
}

async function cargarDatos() {
    $("btnActualizar").disabled = true;
    $("estadoError").classList.add("oculto");
    $("contenidoJefeArbitros").classList.add("oculto");
    $("estadoCarga").classList.remove("oculto");

    try {
        const [configSnap, cuentaSnap] = await Promise.all([
            getDoc(doc(db, "configuracionLiga", "general")),
            getDoc(doc(db, "usuarios", uid))
        ]);

        const cuenta = cuentaSnap.exists() ? cuentaSnap.data() : {};

        puedeSolicitar =
            usuarioTieneRol(cuenta, "arbitro") &&
            cuenta.activo !== false &&
            configSnap.exists() &&
            configSnap.data().jefeArbitrosId === uid;

        if (
            cuenta.activo === false ||
            (!puedeSolicitar && cuenta.rol !== "admin")
        ) {
            throw new Error(
                "Este panel está disponible para el jefe de árbitros designado y administración."
            );
        }

        const resultados = await Promise.all([
            getDocs(collection(db, "partidos")),
            consultarArbitrosDobleRol(),
            getDocs(collection(db, "cedulas")),
            getDocs(collection(db, "solicitudesCambioArbitro"))
        ]);

        const convertir = snapshot => snapshot.docs.map(d => ({
            ...d.data(),
            id: d.id
        }));

        partidos = convertir(resultados[0]).sort((a, b) =>
            `${b.fecha || ""} ${b.hora || ""}`.localeCompare(
                `${a.fecha || ""} ${a.hora || ""}`
            )
        );

        arbitros = convertir(resultados[1]).sort((a, b) =>
            String(a.nombre || "").localeCompare(
                String(b.nombre || ""),
                "es"
            )
        );

        oficiales = new Set(
            convertir(resultados[2])
                .filter(esOficial)
                .flatMap(c => [c.id, c.partidoId].filter(Boolean))
        );

        solicitudes = convertir(resultados[3]).sort((a, b) =>
            (b.creadoEn?.toMillis?.() || 0) -
            (a.creadoEn?.toMillis?.() || 0)
        );

        $("nombreJefeArbitros").textContent =
            cuenta.nombre || "Coordinación arbitral";

        $("volverPanel").href = cuenta.rol === "admin"
            ? "adminArbitros.html" : "arbitro.html";

        $("volverPanel").textContent = cuenta.rol === "admin"
            ? "Administración de árbitros" : "Mi panel arbitral";

        renderizar();

        $("estadoCarga").classList.add("oculto");
        $("contenidoJefeArbitros").classList.remove("oculto");
    } catch (error) {
        console.error("Error cargando coordinación arbitral:", error);
        mostrarError(error.message || "No se pudo cargar el panel.");
    } finally {
        $("btnActualizar").disabled = false;
    }
}

function renderizar() {
    const validos = partidos.filter(p => p.estado !== "cancelado");

    $("totalPartidos").textContent = validos.length;
    $("totalCedulas").textContent =
        validos.filter(p => oficiales.has(p.id)).length;
    $("totalPendientes").textContent =
        validos.filter(p => !oficiales.has(p.id)).length;
    $("totalSolicitudes").textContent =
        solicitudes.filter(s => s.estado === "pendiente").length;

    const estadisticas = new Map(
        arbitros.map(a => [
            a.id,
            {
                nombre: a.nombre || "Árbitro",
                asignados: 0,
                oficiales: 0
            }
        ])
    );

    validos.forEach(partido => {
        const id = partido.arbitroId || "sin-asignar";

        if (!estadisticas.has(id)) {
            estadisticas.set(id, {
                nombre: partido.arbitroNombre || "Sin asignar",
                asignados: 0,
                oficiales: 0
            });
        }

        const fila = estadisticas.get(id);
        fila.asignados++;

        if (oficiales.has(partido.id)) {
            fila.oficiales++;
        }
    });

    $("cuerpoEstadisticasArbitros").replaceChildren();

    estadisticas.forEach(fila => {
        const tr = document.createElement("tr");

        [
            fila.nombre,
            fila.asignados,
            fila.oficiales,
            fila.asignados - fila.oficiales
        ].forEach(valor => texto(tr, valor, "td"));

        $("cuerpoEstadisticasArbitros").appendChild(tr);
    });

    $("partidoSolicitud").replaceChildren();
    opcion($("partidoSolicitud"), "", "Selecciona un partido");

    partidos
        .filter(p =>
            !cerrado(p) &&
            !solicitudes.some(s =>
                s.partidoId === p.id && s.estado === "pendiente"
            )
        )
        .forEach(p => opcion(
            $("partidoSolicitud"),
            p.id,
            `${p.localNombre || "Local"} vs. ${p.visitanteNombre || "Visitante"} · ${p.categoriaNombre || ""} · ${p.fecha || ""} ${p.hora || ""}`
        ));

    cargarPropuestos();

    [
        "partidoSolicitud",
        "arbitroPropuesto",
        "motivoSolicitud",
        "btnEnviarSolicitud"
    ].forEach(id => {
        $(id).disabled = !puedeSolicitar;
    });

    if (!puedeSolicitar) {
        $("estadoSolicitud").textContent =
            "Las solicitudes se envían desde la cuenta del jefe de árbitros designado.";
    }

    $("buscarPartidos").disabled = false;
    $("listaSolicitudes").replaceChildren();

    if (!solicitudes.length) {
        texto(
            $("listaSolicitudes"),
            "Todavía no hay solicitudes de cambio."
        );
    }

    solicitudes.forEach(solicitud => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta";

        texto(
            tarjeta,
            `${solicitud.localNombre || "Local"} vs. ${solicitud.visitanteNombre || "Visitante"}`,
            "h3"
        );

        const estado = texto(
            tarjeta,
            solicitud.estado || "Sin estado",
            "span"
        );

        estado.className = "etiqueta" + (
            ["pendiente", "rechazada"].includes(solicitud.estado)
                ? " " + solicitud.estado : ""
        );

        texto(
            tarjeta,
            `Actual: ${solicitud.arbitroActualNombre || "Sin asignar"}`
        );

        texto(
            tarjeta,
            `Propuesto: ${solicitud.arbitroPropuestoNombre || "Árbitro"}`
        );

        texto(tarjeta, `Motivo: ${solicitud.motivo || ""}`);

        if (solicitud.respuestaAdministrativa) {
            texto(
                tarjeta,
                `Respuesta: ${solicitud.respuestaAdministrativa}`
            );
        }

        $("listaSolicitudes").appendChild(tarjeta);
    });

    renderizarPartidos();
}

function cargarPropuestos() {
    const partido = partidos.find(
        p => p.id === $("partidoSolicitud").value
    );

    $("arbitroPropuesto").replaceChildren();
    opcion($("arbitroPropuesto"), "", "Selecciona un árbitro");

    arbitros
        .filter(a =>
            a.activo !== false && a.id !== partido?.arbitroId
        )
        .forEach(a => opcion(
            $("arbitroPropuesto"),
            a.id,
            a.nombre || "Árbitro"
        ));
}

function renderizarPartidos() {
    const busqueda = $("buscarPartidos")
        .value.trim().toLocaleLowerCase("es");

    const lista = partidos.filter(p =>
        [
            p.localNombre,
            p.visitanteNombre,
            p.categoriaNombre,
            p.arbitroNombre
        ].join(" ").toLocaleLowerCase("es").includes(busqueda)
    );

    $("listaPartidos").replaceChildren();

    if (!lista.length) {
        texto($("listaPartidos"), "No hay partidos para mostrar.");
    }

    lista.forEach(partido => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta";

        texto(
            tarjeta,
            `${partido.localNombre || "Local"} vs. ${partido.visitanteNombre || "Visitante"}`,
            "h3"
        );

        texto(
            tarjeta,
            `${partido.categoriaNombre || ""} · ${partido.jornadaNombre || ""}`
        );

        texto(
            tarjeta,
            `${partido.fecha || "Sin fecha"} ${partido.hora || ""} · ${partido.campo || "Sin sede"}`
        );

        texto(
            tarjeta,
            `Árbitro: ${partido.arbitroNombre || "Sin asignar"}`
        );

        texto(
            tarjeta,
            partido.estado === "cancelado"
                ? "Cancelado"
                : oficiales.has(partido.id)
                    ? "Cédula oficial registrada"
                    : "Cédula pendiente"
        );

        const enlace = texto(
            tarjeta,
            "Ver detalle del partido",
            "a"
        );

        enlace.className = "boton";
        enlace.href = "partido.html?id=" +
            encodeURIComponent(partido.id);

        $("listaPartidos").appendChild(tarjeta);
    });
}

async function iniciar() {
    try {
        usuario = await protegerPagina(["arbitro", "admin"]);

        if (!usuario) return;

        uid = usuario.firebaseUser?.uid || usuario.uid;

        if (!uid) {
            throw new Error("No se pudo verificar tu cuenta.");
        }

        $("btnCerrarSesion").disabled = false;
        $("btnCerrarSesion").addEventListener("click", cerrarSesion);
        $("btnActualizar").addEventListener("click", cargarDatos);
        $("buscarPartidos").addEventListener("input", renderizarPartidos);
        $("partidoSolicitud").addEventListener("change", cargarPropuestos);

        $("formSolicitudCambio").addEventListener("submit", async evento => {
            evento.preventDefault();

            if (
                !puedeSolicitar ||
                $("btnEnviarSolicitud").disabled
            ) {
                return;
            }

            $("btnEnviarSolicitud").disabled = true;
            $("estadoSolicitud").textContent = "Enviando solicitud...";

            try {
                await solicitarCambioArbitro(
                    uid,
                    $("partidoSolicitud").value,
                    $("arbitroPropuesto").value,
                    $("motivoSolicitud").value
                );

                $("formSolicitudCambio").reset();

                $("estadoSolicitud").textContent =
                    "Solicitud guardada. Está pendiente de aprobación administrativa.";

                await cargarDatos();
            } catch (error) {
                console.error("Error solicitando cambio arbitral:", error);
                $("estadoSolicitud").textContent =
                    error.message || "No se pudo enviar la solicitud.";
            } finally {
                $("btnEnviarSolicitud").disabled = !puedeSolicitar;
            }
        });

        await cargarDatos();
    } catch (error) {
        console.error("Error iniciando coordinación arbitral:", error);
        mostrarError(error.message || "No se pudo abrir el panel.");
    }
}
await iniciar();