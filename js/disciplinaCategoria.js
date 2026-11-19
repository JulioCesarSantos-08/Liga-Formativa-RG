export const TEMPORADA_HEREDADA = "2026-2027";
export const temporadaDisciplina = datos => String(datos?.temporadaDisciplina || datos?.temporadaId || TEMPORADA_HEREDADA);
export const esOficial = c => ["registrada", "enviada"].includes(c?.estado);
export const claveDisciplina = (categoria, temporada) => encodeURIComponent(temporada || TEMPORADA_HEREDADA) + "__" + encodeURIComponent(categoria || "");
export function fechaPartido(c) {
    const fecha = String(c?.fecha || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "";
    return fecha + "T" + (/^\d{2}:\d{2}/.test(c.hora || "") ? c.hora.slice(0,5) : "00:00");
}
export function duracionRoja(evento) {
    if (evento.partidosSuspension === undefined) return 1;
    const n = Number(evento.partidosSuspension);
    if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("La expulsión debe indicar de 1 a 3 partidos de suspensión.");
    return n;
}
export function calcularDisciplina(id, categoriaId, cedulas, temporada = TEMPORADA_HEREDADA, antesDe = null) {
    const corte = antesDe ? fechaPartido(antesDe) : "";
    const unicas = new Map();
    for (const c of cedulas) {
        const cid = c.id || c.partidoId;
        if (!cid || !esOficial(c) || c.categoriaId !== categoriaId || temporadaDisciplina(c) !== temporada || c.resueltoPorDefault === true || c.partidoDisputado === false) continue;
        if (antesDe && (cid === (antesDe.id || antesDe.partidoId) || (corte && fechaPartido(c) && fechaPartido(c) >= corte))) continue;
        unicas.set(cid, {...c, id:cid});
    }
    const lista = [...unicas.values()].sort((a,b) => (fechaPartido(a) || "9999").localeCompare(fechaPartido(b) || "9999") || a.id.localeCompare(b.id));
    const sanciones = [], incidencias = [];
    for (const c of lista) {
        const roja = (c.rojas || []).find(r => r.jugadorId === id);
        const presente = [...(c.presentesLocal || []), ...(c.presentesVisitante || [])].includes(id);
        const pendiente = sanciones.find(s => s.pendientes > 0 && [c.localId,c.visitanteId].includes(s.equipoId) && s.fecha && fechaPartido(c) > s.fecha);
        if (pendiente) {
            if (presente || roja) incidencias.push({partidoId:c.id,motivo:"Participación durante una suspensión pendiente; no descuenta."});
            else if (sanciones.length < 3) {
                pendiente.pendientes--;
                pendiente.cumplidos.push(c.id);
            }
        }
        if (roja) {
            const partidos = duracionRoja(roja);
            const equipoId = roja.equipoId || c[roja.equipo === "local" ? "localId" : "visitanteId"];
            sanciones.push({partidoId:c.id,equipoId:equipoId || "",fecha:fechaPartido(c),partidos,pendientes:partidos,cumplidos:[],motivo:String(roja.motivo || ""),heredada:roja.partidosSuspension === undefined});
            if (!fechaPartido(c) || !equipoId) incidencias.push({partidoId:c.id,motivo:"Falta fecha o equipo de la sanción; requiere revisión."});
        }
    }
    const pendientes = sanciones.reduce((n,s) => n+s.pendientes,0);
    return {categoriaId,temporadaId:temporada,totalSanciones:sanciones.length,partidosPendientes:pendientes,bajaTemporada:sanciones.length >= 3,suspendido:pendientes > 0 || sanciones.length >= 3,sanciones,incidencias};
}
export function baseManual(jugador, cedulas) {
    if (jugador.disciplinaManualConservada && Number(jugador.disciplinaManualConservada.revision || 0) === Number(jugador.suspensionRevisionManual || 0)) return jugador.disciplinaManualConservada;
    const origen = jugador.suspensionAutomaticaCedulas;
    const anterior = origen && Number(origen.revisionManual || 0) === Number(jugador.suspensionRevisionManual || 0) ? origen : jugador;
    const n = Math.max(0, Number(anterior === jugador ? jugador.partidosSuspensionPendientes || 0 : anterior.partidos || 0));
    const tieneRojas = cedulas.some(c => esOficial(c) && (c.rojas || []).some(r => r.jugadorId === jugador.id));
    const ambigua = !origen && !jugador.disciplinaManualConservada && !jugador.suspensionRevisionManual && tieneRojas && (jugador.suspendido === true || n > 0);
    return {suspendido:anterior.suspendido === true || n > 0,partidos:n,revision:Number(jugador.suspensionRevisionManual || 0),requiereRevision:ambigua};
}
export function estadoCategoria(jugador,categoriaId,cedulas,temporada=TEMPORADA_HEREDADA,antesDe=null) {
    const estado=calcularDisciplina(jugador.id,categoriaId,cedulas,temporada,antesDe);
    const manual=categoriaId === jugador.categoriaId ? baseManual(jugador,cedulas) : {suspendido:false,partidos:0};
    return {...estado,partidosPendientes:Math.max(estado.partidosPendientes,manual.partidos),suspendido:estado.suspendido || manual.suspendido,manualPendiente:manual.suspendido,revisionManualNecesaria:manual.requiereRevision === true};
}
export function aplicarDisciplina(jugador,categoriaId,cedulas,temporada=TEMPORADA_HEREDADA,antesDe=null) {
    const estado=estadoCategoria(jugador,categoriaId,cedulas,temporada,antesDe);
    return {...jugador,disciplinaManualConservada:baseManual(jugador,cedulas),disciplinaActual:estado,suspendido:estado.suspendido,partidosSuspensionPendientes:estado.partidosPendientes,bajaTemporada:estado.bajaTemporada};
}
export function cambiosDisciplina(jugador,cedulas,temporada) {
    const manual=baseManual(jugador,cedulas);
    const categorias=new Set([jugador.categoriaId,...cedulas.filter(c => temporadaDisciplina(c) === temporada && (c.rojas || []).some(r=>r.jugadorId===jugador.id)).map(c=>c.categoriaId)].filter(Boolean));
    const mapa={...(jugador.disciplinaPorCategoria || {})};
    for(const categoria of categorias) mapa[claveDisciplina(categoria,temporada)]=calcularDisciplina(jugador.id,categoria,cedulas,temporada);
    const propio=mapa[claveDisciplina(jugador.categoriaId,temporada)] || {suspendido:false,partidosPendientes:0,bajaTemporada:false};
    return {disciplinaPorCategoria:mapa,disciplinaManualConservada:manual,suspensionAutomaticaCedulas:null,suspendido:propio.suspendido || manual.suspendido,partidosSuspensionPendientes:Math.max(propio.partidosPendientes,manual.partidos),bajaTemporada:propio.bajaTemporada};
}
export function textoDisciplina(estado) {
    if (estado.bajaTemporada) return "Baja por tercera sanción en esta categoría · resto de la temporada";
    if (estado.suspendido) return `${estado.partidosPendientes} partido(s) pendientes en esta categoría${estado.manualPendiente ? " · revisar sanción manual" : ""}`;
    return `Habilitado · ${estado.totalSanciones}/3 sanciones en esta categoría`;
}
export function dorsalRefuerzo(jugador,prestamo) {
    return prestamo?.dorsalRefuerzo ?? jugador.numero ?? jugador.dorsal ?? "";
}
export function aplicarDorsalRefuerzo(jugador,prestamo) {
    const numero=dorsalRefuerzo(jugador,prestamo);
    return {...jugador,numero,dorsal:numero};
}
