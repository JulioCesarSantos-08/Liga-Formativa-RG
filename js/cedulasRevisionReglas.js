export const esCedulaOficial = c => ["registrada","enviada"].includes(c?.estado);
export const revisionCedula = c => Number(c?.revisionCedula || 0);
export const enteroCedula = n => Number.isFinite(Number(n)) ? Math.max(0,Math.trunc(Number(n))) : 0;
export function idsEventos(c) {
    return [...new Set(["goles","amarillas","rojas"].flatMap(k => Array.isArray(c?.[k]) ? c[k].map(e=>e.jugadorId).filter(Boolean):[]))];
}
export function totalesJugador(id, cedulas) {
    const total={goles:0,amarillas:0,rojas:0};
    for (const c of cedulas) {
        if (!esCedulaOficial(c) || c.resueltoPorDefault===true) continue;
        for (const k of Object.keys(total)) total[k]+=(Array.isArray(c[k])?c[k]:[]).filter(e=>e.jugadorId===id).length;
    }
    return total;
}
export function validarResultadoCedula(c,p) {
    if (c.resueltoPorDefault===true) return;
    for (const campo of ["golesLocal","golesVisitante"]) {
        if (!Number.isInteger(c[campo]) || c[campo]<0 || c[campo]>99) throw new Error("El marcador debe ser un entero de 0 a 99.");
    }
    for (const campo of ["goles","amarillas","rojas"]) {
        if (!Array.isArray(c[campo])) throw new Error("Falta la lista de "+campo+".");
        if (c[campo].length>250) throw new Error("Hay demasiados eventos en la cédula.");
        const expulsados=new Set();
        for (const evento of c[campo]) {
            const lado=evento.equipo;
            const presentes=c[lado==="local"?"presentesLocal":"presentesVisitante"];
            if (!["local","visitante"].includes(lado) || !evento.jugadorId || !Array.isArray(presentes) || !presentes.includes(evento.jugadorId) || evento.equipoId!==p[lado+"Id"]) throw new Error("Cada gol o tarjeta debe identificar a un jugador presente del equipo correcto.");
            if (campo==="rojas" && expulsados.has(evento.jugadorId)) throw new Error("Un jugador tiene dos expulsiones registradas.");
            expulsados.add(evento.jugadorId);
        }
    }
    for (const lado of ["local","visitante"]) {
        const cantidad=c.goles.filter(e=>e.equipo===lado).length;
        if (cantidad!==c[lado==="local"?"golesLocal":"golesVisitante"]) throw new Error("El marcador y los anotadores del "+lado+" no coinciden.");
    }
}
export function resultadoPendiente() {
    return {estado:"proximo",resultadoRegistrado:false,cedulaCreada:false,cedulaId:null,
        golesLocal:null,golesVisitante:null,huboPenales:false,penalesLocal:null,penalesVisitante:null,
        resueltoPorDefault:false,tipoResultado:null,partidoDisputado:null,ganadorId:null,perdedorId:null,
        motivoDefault:"",resueltoPorUid:null,resueltoPorNombre:"",resueltoEn:null,finalizadoEn:null};
}
export function suspensionTrasRevision(jugador, anteriores, posteriores, id, partidoId) {
    const antes=totalesJugador(id,anteriores).rojas,despues=totalesJugador(id,posteriores).rojas;
    if (antes===despues) return {};
    const manual=enteroCedula(jugador.suspensionRevisionManual);
    let base=jugador.suspensionAutomaticaCedulas;
    if (despues>antes) {
        if (!base || base.revisionManual!==manual) base={
            suspendido:jugador.suspendido===true,partidos:enteroCedula(jugador.partidosSuspensionPendientes),
            revisionManual:manual,heredada:antes>0
        };
        return {suspendido:true,partidosSuspensionPendientes:Math.max(1,enteroCedula(jugador.partidosSuspensionPendientes)),suspensionAutomaticaCedulas:base};
    }
    if (despues>0) return {};
    if (base && base.revisionManual===manual && base.heredada!==true) return {
        suspendido:base.suspendido,partidosSuspensionPendientes:base.partidos,suspensionAutomaticaCedulas:null
    };
    if (base && base.revisionManual!==manual) return {suspensionAutomaticaCedulas:null};
    return {revisionDisciplinaPendiente:{partidoId,motivo:"Se retiró una roja de una cédula antigua. Revisar el origen de la suspensión antes de retirarla."},suspensionAutomaticaCedulas:null};
}
