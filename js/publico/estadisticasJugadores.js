import {collection,getDocsFromServer} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "../firebase.js";
const lista=valor=>Array.isArray(valor)?valor:[];
const idJugador=valor=>typeof valor==="string"?valor.trim():"";
const momento=cedula=>cedula.actualizadoEn?.toMillis?.() || cedula.enviadoEn?.toMillis?.() || 0;
export function cedulasVigentes(cedulas) {
    const actuales=new Map();
    for(const c of cedulas) {
        const id=c.partidoId || c.id;if(!id)continue;
        const previa=actuales.get(id);
        const revision=Number(c.revisionCedula || 0),anterior=Number(previa?.revisionCedula || 0);
        if(!previa || revision>anterior || (revision===anterior && (momento(c)>momento(previa) || (momento(c)===momento(previa) && c.id===id)))) actuales.set(id,c);
    }
    return [...actuales.values()].filter(c=>["registrada","enviada"].includes(c.estado) && !c.devolucionCedula?.activa && c.enRevision!==true && c.resueltoPorDefault!==true && c.partidoDisputado!==false);
}
export function participantesCedula(c) {
    const a=c.alineaciones || {};
    const tieneAlineacion=!!a.version || lista(a.titularesLocal).length>0 || lista(a.titularesVisitante).length>0;
    const ids=tieneAlineacion?[...lista(a.titularesLocal),...lista(a.titularesVisitante)]:[...lista(c.presentesLocal),...lista(c.presentesVisitante)];
    for(const cambio of lista(c.cambios))ids.push(cambio.entraJugadorId,cambio.saleJugadorId);
    for(const gol of lista(c.goles))ids.push(gol.jugadorId);
    return new Set(ids.map(idJugador).filter(Boolean));
}
export function calcularEstadisticasJugadores(cedulas) {
    const mapa=new Map();
    const obtener=id=>{if(!mapa.has(id))mapa.set(id,{goles:0,amarillas:0,rojas:0,pj:0});return mapa.get(id);};
    for(const c of cedulasVigentes(cedulas)) {
        for(const id of participantesCedula(c))obtener(id).pj++;
        for(const tipo of ["goles","amarillas","rojas"]) {
            const vistos=new Set();
            for(const evento of lista(c[tipo])) {
                const id=idJugador(evento.jugadorId);if(!id)continue;
                const clave=evento.id?String(evento.id):null;
                if(clave && vistos.has(clave))continue;
                if(clave)vistos.add(clave);
                obtener(id)[tipo]++;
            }
        }
    }
    return mapa;
}
export function conEstadisticasJugador(jugador,mapa) {
    const datos=mapa.get(jugador.id) || {goles:0,amarillas:0,rojas:0,pj:0};
    return {...jugador,...datos,partidos:datos.pj,partidosJugados:datos.pj};
}
export async function cargarEstadisticasJugadores() {
    const snapshot=await getDocsFromServer(collection(db,"cedulas"));
    return calcularEstadisticasJugadores(snapshot.docs.map(s=>({...s.data(),id:s.id})));
}
export function compararEstadisticasJugadores(a,b,orden="goles") {
    const n=valor=>Math.max(0,Number(valor) || 0);
    const nombre=j=>String(j.nombreCompleto || j.nombre || "");
    if(orden==="rojas")return n(b.rojas)-n(a.rojas) || n(b.amarillas)-n(a.amarillas) || n(b.goles)-n(a.goles) || nombre(a).localeCompare(nombre(b),"es") || String(a.id).localeCompare(String(b.id));
    if(orden==="amarillas")return n(b.amarillas)-n(a.amarillas) || n(b.rojas)-n(a.rojas) || n(b.goles)-n(a.goles) || nombre(a).localeCompare(nombre(b),"es") || String(a.id).localeCompare(String(b.id));
    return n(b.goles)-n(a.goles) || n(a.rojas)-n(b.rojas) || n(a.amarillas)-n(b.amarillas) || nombre(a).localeCompare(nombre(b),"es") || String(a.id).localeCompare(String(b.id));
}
