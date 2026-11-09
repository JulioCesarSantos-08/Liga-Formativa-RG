import {
    collection, query, where, getDocs, doc, getDoc,
    runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { esCoordinador, cambiosSolicitud } from "./coordinacionReglas.js";
import { enviarCambio } from "./coordinacionDatos.js";
import { iniciarMejoras } from "./coordinacionMejoras.js";
let mejoras = null;
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

async function solicitarCambioArbitro(solicitanteUid, partidoId, propuestoId, motivo) {
    const base = partidos.find(p => p.id === partidoId);
    if (!base) throw new Error("Selecciona un partido disponible.");
    return enviarCambio(solicitanteUid, partidoId, {
        arbitroId: propuestoId || null,
        fecha: $("fechaPropuesta").value,
        hora: $("horaPropuesta").value,
        campo: $("campoPropuesto").value.trim()
    }, base, motivo);
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

        const config = configSnap.exists() ? configSnap.data() : {};
        const titularSnap = config.jefeArbitrosId && config.jefeArbitrosId !== uid
            ? await getDoc(doc(db, "usuarios", config.jefeArbitrosId)) : cuentaSnap;
        puedeSolicitar = (cuenta.rol === "admin" && cuenta.activo !== false) || esCoordinador(
            config, uid, cuenta,
            titularSnap.exists() ? titularSnap.data() : null
        );

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

        $("tipoAccesoCoordinacion").textContent = cuenta.rol === "admin"
            ? "ADMINISTRACIÓN · COORDINACIÓN ARBITRAL"
            : config.jefeArbitrosId === uid ? "JEFE TITULAR DE ÁRBITROS" : "AUXILIAR DEL JEFE DE ÁRBITROS";
        $("nombreJefeArbitros").textContent =
            cuenta.nombre || "Coordinación arbitral";

        $("volverPanel").href = cuenta.rol === "admin"
            ? "adminArbitros.html" : "arbitro.html";

        $("volverPanel").textContent = cuenta.rol === "admin"
            ? "Administración de árbitros" : "Mi panel arbitral";

        if (mejoras?.permitido() === false) throw new Error("Tu acceso a la coordinación cambió.");
        renderizar();
        mejoras?.actualizar(arbitros);

        $("estadoCarga").classList.add("oculto");
        $("contenidoJefeArbitros").classList.remove("oculto");
    } catch (error) {
        console.error("Error cargando coordinación arbitral:", error);
        mostrarError(error.message || "No se pudo cargar el panel.");
    } finally {
        $("btnActualizar").disabled = false;
    }
}

function claveFiltroSolicitud(partido, tipo) {
    const id = partido[tipo + "Id"];
    const nombre = partido[tipo + "Nombre"];
    return id ? "id:" + id : nombre ? "nombre:" + nombre : "sin-dato";
}

function disponiblesSolicitud() {
    return partidos.filter(p => !cerrado(p) && !solicitudes.some(s =>
        s.partidoId === p.id && s.estado === "pendiente"
    ));
}

function opcionesFiltroSolicitud(id, lista, tipo, titulo) {
    const select = $(id);
    const anterior = select.value;
    const opciones = new Map();

    lista.forEach(p => opciones.set(
        claveFiltroSolicitud(p, tipo),
        p[tipo + "Nombre"] || (
            tipo === "categoria" ? "Sin categoría" : "Sin jornada"
        )
    ));

    select.replaceChildren();
    opcion(select, "", titulo);

    [...opciones]
        .sort((a, b) => a[1].localeCompare(b[1], "es", { numeric: true }))
        .forEach(([valor, nombre]) => opcion(select, valor, nombre));

    select.value = opciones.has(anterior) ? anterior : "";
    select.disabled = !puedeSolicitar;
}

function cargarFiltrosSolicitud(reiniciarJornada = false) {
    const disponibles = disponiblesSolicitud();

    opcionesFiltroSolicitud(
        "categoriaSolicitud",
        disponibles,
        "categoria",
        "Todas las categorías"
    );

    const categoria = $("categoriaSolicitud").value;

    if (reiniciarJornada) $("jornadaSolicitud").value = "";

    opcionesFiltroSolicitud(
        "jornadaSolicitud",
        disponibles.filter(p =>
            !categoria || claveFiltroSolicitud(p, "categoria") === categoria
        ),
        "jornada",
        "Todas las jornadas"
    );

    filtrarPartidosSolicitud();
}

function filtrarPartidosSolicitud() {
    const categoria = $("categoriaSolicitud").value;
    const jornada = $("jornadaSolicitud").value;
    const select = $("partidoSolicitud");
    const anterior = select.value;

    const lista = disponiblesSolicitud().filter(p =>
        (!categoria || claveFiltroSolicitud(p, "categoria") === categoria) &&
        (!jornada || claveFiltroSolicitud(p, "jornada") === jornada)
    );

    select.replaceChildren();

    opcion(
        select,
        "",
        lista.length ? "Selecciona un partido" : "No hay partidos disponibles"
    );

    lista.forEach(p => opcion(
        select,
        p.id,
        [
            (p.localNombre || "Local") + " vs. " + (p.visitanteNombre || "Visitante"),
            p.categoriaNombre || "Sin categoría",
            p.jornadaNombre || "Sin jornada",
            p.fecha || "Fecha pendiente",
            p.hora || "Hora pendiente"
        ].join(" · ")
    ));

    select.value = lista.some(p => p.id === anterior) ? anterior : "";

    if (!anterior || select.value !== anterior) cargarPropuestos();

    $("resumenFiltroSolicitud").textContent = lista.length
        ? lista.length + " partido(s) disponibles. Solo se muestran encuentros abiertos sin solicitud pendiente."
        : "No hay partidos abiertos sin solicitud pendiente para estos filtros.";
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
                nombre: partido.arbitroNombre || "Pendiente",
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

    cargarFiltrosSolicitud();


    [
        "partidoSolicitud",
        "arbitroPropuesto",
        "fechaPropuesta",
        "horaPropuesta",
        "campoPropuesto",
        "motivoSolicitud",
        "btnEnviarSolicitud"
    ].forEach(id => {
        $(id).disabled = !puedeSolicitar;
    });

    if (!puedeSolicitar) {
        $("estadoSolicitud").textContent =
            "Las solicitudes pueden enviarlas administración, el jefe titular y su auxiliar. Los cambios requieren aprobación administrativa.";
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
            `Actual: ${solicitud.arbitroActualNombre || "Pendiente"}`
        );

        texto(
            tarjeta,
            `Propuesto: ${solicitud.arbitroPropuestoNombre || "Árbitro"}`
        );

        cambiosSolicitud(solicitud).forEach(cambio => texto(tarjeta, cambio));
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
    const partido = partidos.find(p => p.id === $("partidoSolicitud").value);
    $("arbitroPropuesto").replaceChildren();
    opcion($("arbitroPropuesto"), "", "Pendiente de asignación");
    arbitros.filter(a => a.activo !== false).forEach(a =>
        opcion($("arbitroPropuesto"), a.id, a.nombre || "Árbitro")
    );
    $("arbitroPropuesto").value = partido?.arbitroId || "";
    $("fechaPropuesta").value = partido?.fecha || "";
    $("horaPropuesta").value = partido?.hora || "";
    $("campoPropuesto").value = partido?.campo || "";
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
            `${partido.fecha || "Sin fecha"} ${partido.hora || "Hora pendiente"} · ${partido.campo || "Sede pendiente"}`
        );

        texto(
            tarjeta,
            `Árbitro: ${partido.arbitroNombre || "Pendiente"}`
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

        mejoras = iniciarMejoras({
            uid, recargar:cargarDatos,
            revocar:mensaje => {
                puedeSolicitar = false;
                document.querySelectorAll("#formSolicitudCambio input, #formSolicitudCambio select, #formSolicitudCambio textarea, #formSolicitudCambio button").forEach(e => e.disabled = true);
                mostrarError(mensaje);
            }
        });
        $("btnCerrarSesion").disabled = false;
        $("btnCerrarSesion").addEventListener("click", cerrarSesion);
        $("btnActualizar").addEventListener("click", cargarDatos);
        $("buscarPartidos").addEventListener("input", renderizarPartidos);
        $("partidoSolicitud").addEventListener("change", cargarPropuestos);
        $("categoriaSolicitud").addEventListener("change", () => cargarFiltrosSolicitud(true));
        $("jornadaSolicitud").addEventListener("change", filtrarPartidosSolicitud);

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