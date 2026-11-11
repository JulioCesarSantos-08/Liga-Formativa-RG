function leerPenales(valor) {
    if (typeof valor === "string" && /^\d+$/.test(valor.trim())) valor = Number(valor);
    return Number.isSafeInteger(valor) && valor >= 0 ? valor : null;
}

export function sumarPuntosEmpate(partido, local, visitante) {
    local.pts += 1;
    visitante.pts += 1;

    if (partido.huboPenales !== true && partido.huboPenales !== "true") return;

    const penalesLocal = leerPenales(partido.penalesLocal);
    const penalesVisitante = leerPenales(partido.penalesVisitante);
    if (penalesLocal === null || penalesVisitante === null || penalesLocal === penalesVisitante) return;

    const ganador = penalesLocal > penalesVisitante ? local : visitante;
    ganador.pts += 1;
}

export function partidoFueraDeClasificacion(partido) {
    const estado = String(partido.estado || partido.estatus || partido.status || "").trim().toLowerCase();
    return Boolean(partido.devolucionCedula?.activa) ||
        ["cancelado", "cancelada", "suspendido", "suspendida"].includes(estado) ||
        (partido.partidoDisputado === false && partido.resueltoPorDefault !== true);
}
