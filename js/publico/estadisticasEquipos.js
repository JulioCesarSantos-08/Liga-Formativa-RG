import {collection,getDocsFromServer} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "../firebase.js";
import {sumarDefaultTabla} from "../resultadosDefault.js";
const texto=v=>String(v ?? "").trim();
const normal=v=>texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const primero=valores=>valores.find(v=>typeof v==="string" && v.trim())?.trim() || "";
const categoria=e=>primero([e.categoriaId,e.idCategoria,e.categoria?.id]);
const nombre=e=>texto(e.nombre || e.nombreEquipo || e.equipo || "Equipo");
function goles(p,lado) {
    const valores=lado==="local"?[p.golesLocal,p.marcadorLocal,p.resultadoLocal,p.localGoles,p.golesEquipoLocal]:[p.golesVisitante,p.marcadorVisitante,p.resultadoVisitante,p.visitanteGoles,p.golesEquipoVisitante];
    for(const valor of valores) {
        if(valor===null || valor===undefined || texto(valor)==="")continue;
        const n=Number(valor);if(Number.isInteger(n) && n>=0)return n;
    }
    const marcador=texto(p.marcador || p.resultado).match(/^(\d+)\s*[-–—:]\s*(\d+)$/);
    return marcador?Number(marcador[lado==="local"?1:2]):null;
}
function equipoDelPartido(p,lado,equipos) {
    const valores=lado==="local"?[p.equipoLocalId,p.localId,p.idEquipoLocal,p.equipoLocal?.id]:[p.equipoVisitanteId,p.visitanteId,p.idEquipoVisitante,p.equipoVisitante?.id];
    const id=primero(valores);if(id)return equipos.find(e=>e.id===id);
    const nombres=lado==="local"?[p.localNombre,p.equipoLocalNombre,p.nombreLocal,p.local,p.equipoLocal?.nombre]:[p.visitanteNombre,p.equipoVisitanteNombre,p.nombreVisitante,p.visitante,p.equipoVisitante?.nombre];
    const buscado=normal(primero(nombres)),cat=categoria(p);
    if(!buscado)return null;
    const candidatos=equipos.filter(e=>normal(nombre(e))===buscado && (!cat || categoria(e)===cat));
    return candidatos.length===1?candidatos[0]:null;
}
export function compararClasificacionEquipos(a,b) {
    return Number(b.pts || 0)-Number(a.pts || 0) || Number(b.dg || 0)-Number(a.dg || 0) || Number(b.gf || 0)-Number(a.gf || 0) || Number(b.pg || 0)-Number(a.pg || 0) || nombre(a).localeCompare(nombre(b),"es",{sensitivity:"base"});
}
export function aplicarClasificacionEquipos(equipos,partidos) {
    const mapa=new Map(equipos.map(e=>[e.id,{...e,pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dg:0,pts:0}]));
    const vistos=new Set();
    for(const p of partidos) {
        if(p.id && vistos.has(p.id))continue;
        if(p.id)vistos.add(p.id);
        const estado=normal(p.estado || p.estatus || p.status);
        if(p.devolucionCedula?.activa || ["cancelado","cancelada","suspendido","suspendida"].includes(estado))continue;
        if(p.resultadoRegistrado!==true && p.resultadoRegistrado!=="true" && !["finalizado","finalizada","terminado","terminada","jugado","jugada","registrado","registrada"].includes(estado))continue;
        const equipoLocal=equipoDelPartido(p,"local",equipos),equipoVisitante=equipoDelPartido(p,"visitante",equipos);
        if(!equipoLocal || !equipoVisitante || equipoLocal.id===equipoVisitante.id)continue;
        const cat=categoria(p),catLocal=categoria(equipoLocal),catVisitante=categoria(equipoVisitante);
        if((catLocal && catVisitante && catLocal!==catVisitante) || (cat && ((catLocal && catLocal!==cat) || (catVisitante && catVisitante!==cat))))continue;
        const local=mapa.get(equipoLocal.id),visitante=mapa.get(equipoVisitante.id);
        if(p.resueltoPorDefault===true) {
            sumarDefaultTabla({...p,localId:equipoLocal.id,visitanteId:equipoVisitante.id},local,visitante);
            continue;
        }
        if(p.partidoDisputado===false)continue;
        const gl=goles(p,"local"),gv=goles(p,"visitante");if(gl===null || gv===null)continue;
        local.pj++;visitante.pj++;local.gf+=gl;local.gc+=gv;visitante.gf+=gv;visitante.gc+=gl;
        if(gl>gv){local.pg++;local.pts+=3;visitante.pp++;}
        else if(gl<gv){visitante.pg++;visitante.pts+=3;local.pp++;}
        else{local.pe++;visitante.pe++;local.pts++;visitante.pts++;}
    }
    return equipos.map(e=>{const datos=mapa.get(e.id);return {...datos,dg:datos.gf-datos.gc};});
}
export async function cargarPartidosClasificacion() {
    const snapshot=await getDocsFromServer(collection(db,"partidos"));
    return snapshot.docs.map(s=>({...s.data(),id:s.id}));
}
