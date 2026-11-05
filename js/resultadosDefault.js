export function ladoGanadorDefault(partido) {
    if (partido?.resueltoPorDefault !== true) return null;

    if (
        !partido.localId ||
        !partido.visitanteId ||
        partido.localId === partido.visitanteId
    ) {
        return null;
    }

    if (partido.ganadorId === partido.localId) return "local";
    if (partido.ganadorId === partido.visitanteId) return "visitante";

    return null;
}

export function textoResultadoDefault(partido) {
    const lado = ladoGanadorDefault(partido);

    if (!lado) return "";

    return "Default: ganó " + (
        partido[lado + "Nombre"] ||
        (lado === "local" ? "Local" : "Visitante")
    );
}

export function sumarDefaultTabla(partido, local, visitante) {
    const lado = ladoGanadorDefault(partido);

    if (!lado) return false;

    local.pj += 1;
    visitante.pj += 1;

    const ganador = lado === "local" ? local : visitante;
    const perdedor = lado === "local" ? visitante : local;

    ganador.pg += 1;
    ganador.pts += 3;
    perdedor.pp += 1;

    return true;
}

export function validarCierreDisponible(partido, cedula = {}) {
    const estados = [
        "finalizado",
        "finalizada",
        "cancelado",
        "cancelada",
        "suspendido",
        "suspendida"
    ];

    if (
        partido.resultadoRegistrado === true ||
        partido.cedulaCreada === true ||
        estados.includes(String(partido.estado || "").toLowerCase()) ||
        ["registrada", "enviada"].includes(cedula.estado)
    ) {
        throw new Error(
            "Este partido ya fue cerrado o no está disponible. Recarga para consultar su estado actual."
        );
    }
}

export function construirResultadoDefault(
    partido,
    lado,
    motivo,
    uid,
    nombre,
    fecha
) {
    if (
        !["local", "visitante"].includes(lado) ||
        !partido.localId ||
        !partido.visitanteId ||
        partido.localId === partido.visitanteId
    ) {
        throw new Error(
            "Selecciona cuál de los dos equipos recibe la victoria."
        );
    }

    const razon = String(motivo || "").trim();

    if (razon.length < 5 || razon.length > 600) {
        throw new Error(
            "Indica el motivo del default, de 5 a 600 caracteres."
        );
    }

    return {
        resueltoPorDefault: true,
        tipoResultado: "default",
        partidoDisputado: false,
        ganadorId: partido[lado + "Id"],
        perdedorId: partido[
            (lado === "local" ? "visitante" : "local") + "Id"
        ],
        motivoDefault: razon,
        resueltoPorUid: uid,
        resueltoPorNombre: nombre,
        resueltoEn: fecha,
        golesLocal: 0,
        golesVisitante: 0,
        huboPenales: false,
        penalesLocal: null,
        penalesVisitante: null
    };
}
