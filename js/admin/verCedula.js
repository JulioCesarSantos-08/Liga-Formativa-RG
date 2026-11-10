import {collection,doc,getDocFromServer,getDocsFromServer,onSnapshot,query,where} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "../firebase.js";
import {protegerPagina} from "../roles.js";
import {devolverCedula} from "../cedulasRevisionDatos.js";
import {esCedulaOficial,idsEventos,revisionCedula} from "../cedulasRevisionReglas.js";
import {resolverDefault} from "../arbitro/defaultCedula.js";
const $=id=>document.getElementById(id);
const escapar=x=>String(x ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const texto=x=>x===null || x===undefined || x===""?"Sin registrar":x;
const momento=x=>x?.toDate?x.toDate().toLocaleString("es-MX",{timeZone:"America/Mexico_City"}):"Sin registrar";
const tabla=(cabeceras,filas)=>filas.length?`<div class="cr-tabla"><table><thead><tr>${cabeceras.map(c=>`<th scope="col">${escapar(c)}</th>`).join("")}</tr></thead><tbody>${filas.map(f=>`<tr>${f.map(v=>`<td>${escapar(texto(v))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:'<p class="cr-vacio">Sin registros.</p>';
const datos=filas=>`<dl class="cr-datos">${filas.map(([k,v])=>`<div><dt>${escapar(k)}</dt><dd>${escapar(texto(v))}</dd></div>`).join("")}</dl>`;
const tarjeta=(titulo,contenido)=>`<section class="cr-card"><h2>${escapar(titulo)}</h2>${contenido}</section>`;
const usuario=await protegerPagina(["admin"]);
const id=new URLSearchParams(location.search).get("id");
let partido=null,cedula={},jugadores=new Map(),versionVista=0,ocupado=false,tipo="devolver",escuchas=[],viva=0,versionDialogo=0;
if (usuario && id) { configurar();await cargar(); }
else if (usuario) $("crEstado").textContent="No se recibió el partido.";
function configurar() {
    $("crImprimir").onclick=()=>window.print();
    $("crDevolver").onclick=()=>abrir("devolver");
    $("crEditarDefault").onclick=()=>abrir("default");
    $("crCancelar").onclick=()=>{if (!ocupado) $("crDialogo").close();};
    $("crDialogo").addEventListener("cancel",e=>{if(ocupado)e.preventDefault();});
    $("crFormulario").addEventListener("submit",enviar);
}
async function cargar() {
    $("crAcciones").hidden=true;
    try {
        const [p,c]=await Promise.all([getDocFromServer(doc(db,"partidos",id)),getDocFromServer(doc(db,"cedulas",id))]);
        if (!p.exists()) throw new Error("El partido ya no existe.");
        partido={...p.data(),id};cedula=c.exists()?c.data():{};versionVista=revisionCedula(cedula);
        const ids=[...new Set([...idsEventos(cedula),...(cedula.presentesLocal || []),...(cedula.presentesVisitante || []),...(cedula.alineaciones?.titularesLocal || []),...(cedula.alineaciones?.titularesVisitante || []),...(cedula.alineaciones?.suplentesLocal || []),...(cedula.alineaciones?.suplentesVisitante || [])])];
        if(ids.length>300) throw new Error("La plantilla excede el tamaño permitido. Revisa los datos.");
        jugadores=new Map((await Promise.all(ids.map(j=>getDocFromServer(doc(db,"jugadores",j))))).filter(s=>s.exists()).map(s=>[s.id,s.data()]));
        renderizar();await historial();
        if(!escuchas.length) {
            escuchas.push(onSnapshot(doc(db,"cedulas",id),s=>{
                if(revisionCedula(s.data())!==versionVista){viva++;$("crEstado").textContent="La cédula cambió en otra sesión. Recarga para ver la versión actual.";$("crAcciones").hidden=true;}
            }));
            escuchas.push(onSnapshot(doc(db,"partidos",id),s=>{
                if(!s.exists() || s.data().arbitroId!==partido.arbitroId || s.data().localId!==partido.localId || s.data().visitanteId!==partido.visitanteId){viva++;$("crEstado").textContent="Cambió la asignación o el partido. Recarga antes de continuar.";$("crAcciones").hidden=true;}
            }));
        }
        if(new URLSearchParams(location.search).get("editarDefault")==="1" && cedula.resueltoPorDefault && esCedulaOficial(cedula)) abrir("default");
    } catch(error) {$("crEstado").textContent=error.message;}
}
function nombre(id,fallback="") { const j=jugadores.get(id);return j?(j.nombreCompleto || j.nombre || id):(fallback || "Jugador sin ficha actual · "+id); }
function listaPlantilla(lado) {
    const suf=lado==="local"?"Local":"Visitante",al=cedula.alineaciones || {};
    const presentes=cedula["presentes"+suf] || [];
    const titulares=al["titulares"+suf] || [],suplentes=al["suplentes"+suf] || [];
    const ids=[...new Set([...presentes,...titulares,...suplentes])];
    return tabla(["Dorsal","Jugador","Asistencia","Alineación","Capitán"],ids.map(id=>{
        const j=jugadores.get(id) || {};
        return [j.numero ?? j.dorsal ?? "—",nombre(id),presentes.includes(id)?"Presente":"Sin confirmar",titulares.includes(id)?"Titular":suplentes.includes(id)?"Suplente":"Sin registrar",cedula["capitan"+suf+"Id"]===id?"Sí":"—"];
    }));
}
function eventos(campo) {
    return tabla(["Minuto","Equipo","Dorsal","Jugador","Detalle"],(cedula[campo] || []).map(e=>[e.minuto,e.equipoNombre || (e.equipo==="local"?partido.localNombre:partido.visitanteNombre),e.numero ?? jugadores.get(e.jugadorId)?.numero,nombre(e.jugadorId,e.jugadorNombre),[e.tipoRoja,e.motivo].filter(Boolean).join(" · ") || "—"]));
}
function renderizar() {
    const c=cedula,p=partido,oficial=esCedulaOficial(c),devuelta=c.devolucionCedula?.activa;
    const estado=devuelta?"Devuelta para corrección":oficial?"Registrada":c.estado==="borrador"?"Borrador":"Pendiente";
    const local=p.localNombre || c.localNombre || "Local",visitante=p.visitanteNombre || c.visitanteNombre || "Visitante";
    const marcador=c.resueltoPorDefault?"Resolución por default":`${c.golesLocal ?? "—"} – ${c.golesVisitante ?? "—"}`;
    let html=`<section class="cr-hero"><p>${escapar(p.categoriaNombre || c.categoriaNombre)} · ${escapar(p.jornadaNombre || c.jornadaNombre)}</p><h1>${escapar(local)} vs ${escapar(visitante)}</h1><div class="cr-marcador">${escapar(marcador)}</div><p>${escapar(estado)}${oficial?" · Resultado oficial":" · Sin efecto oficial"}</p></section>`;
    if(devuelta) html+=`<section class="cr-aviso"><h2>Motivo de la devolución</h2><p>${escapar(c.devolucionCedula.motivo)}</p><p>${escapar(c.devolucionCedula.porNombre)} · ${escapar(momento(c.devolucionCedula.en))}</p><p>El árbitro conserva lo capturado y puede corregirlo y reenviarlo.</p></section>`;
    html+=tarjeta("Datos del encuentro",datos([["Fecha",p.fecha],["Hora · Oaxaca",p.hora],["Campo",p.campo],["Árbitro asignado",p.arbitroNombre || c.arbitroNombre],["Asistente 1",c.arbitroAsistente1],["Asistente 2",c.arbitroAsistente2],["Inicio del primer tiempo",c.inicioPrimerTiempo],["Fin del primer tiempo",c.finPrimerTiempo],["Inicio del segundo tiempo",c.inicioSegundoTiempo],["Fin del segundo tiempo",c.finSegundoTiempo],["Tanda de penales",c.huboPenales?`${c.penalesLocal ?? "—"} – ${c.penalesVisitante ?? "—"}`:"No"]]));
    if(c.resueltoPorDefault) html+=tarjeta("Resolución por default",datos([["Ganador",c.ganadorId===p.localId?local:visitante],["Motivo",c.motivoDefault],["Resuelta por",c.resueltoPorNombre],["Fecha de resolución",momento(c.resueltoEn)]]));
    html+=tarjeta("Asistencia y alineación · "+local,listaPlantilla("local"));
    html+=tarjeta("Asistencia y alineación · "+visitante,listaPlantilla("visitante"));
    html+=tarjeta("Configuración de alineaciones",datos([["Jugadores en cancha",c.alineaciones?.jugadoresEnCancha],["Base de la categoría",c.alineaciones?.jugadoresEnCanchaBase],["Acuerdo Súper Bebé",c.alineaciones?.acuerdoSuperBebe?"Registrado":"Sin acuerdo adicional"]]));
    html+=tarjeta("Goles · "+(c.goles || []).length,eventos("goles"));
    html+=tarjeta("Tarjetas amarillas · "+(c.amarillas || []).length,eventos("amarillas"));
    html+=tarjeta("Tarjetas rojas · "+(c.rojas || []).length,eventos("rojas"));
    html+=tarjeta("Cambios",tabla(["Minuto","Equipo","Sale","Entra"],(c.cambios || []).map(e=>[e.minuto,e.equipoNombre || (e.equipo==="local"?local:visitante),`${e.saleNumero ?? ""} · ${nombre(e.saleJugadorId,e.saleJugadorNombre)}`,`${e.entraNumero ?? ""} · ${nombre(e.entraJugadorId,e.entraJugadorNombre)}`])));
    html+=tarjeta("Cuerpo técnico",datos([["Entrenador local",c.entrenadorLocal],["Auxiliar local",c.auxiliarLocal],["Médico local",c.medicoLocal],["Entrenador visitante",c.entrenadorVisitante],["Auxiliar visitante",c.auxiliarVisitante],["Médico visitante",c.medicoVisitante]]));
    html+=tarjeta("Condiciones e incidencias",datos([["Estado del terreno",c.estadoTerreno],["Conducta del público local",c.conductaPublicoLocal],["Observaciones del público local",c.observacionPublicoLocal],["Conducta del público visitante",c.conductaPublicoVisitante],["Observaciones del público visitante",c.observacionPublicoVisitante]])+`<h3>Incidencias</h3><p class="cr-texto">${escapar(texto(c.incidencias))}</p>`);
    for(const lado of ["Local","Visitante"]) {
        const reporte=c["reporteEquipo"+lado];
        html+=tarjeta("Reporte del equipo "+(lado==="Local"?local:visitante),datos([["Autorizado",c["reportesHabilitados"+lado]?"Sí":"No"],["Responsable",reporte?.entrenadorNombre],["Reporte",reporte?.texto]]));
    }
    html+=tarjeta("Registro y auditoría",datos([["Registrada por",c.confirmadoPorNombre || c.arbitroNombre],["Enviada",momento(c.enviadoEn)],["Última modificación",momento(c.actualizadoEn)],["Modificada por",c.ultimaModificacionNombre],["Versión",versionVista],["Confirmación arbitral",c.confirmadoPorArbitro?"Sí":"Sin confirmar"]]));
    const revisar=[...jugadores].filter(([,j])=>j.revisionDisciplinaPendiente?.partidoId===id);
    if(revisar.length) html+=`<section class="cr-aviso"><h2>Suspensiones que requieren revisión</h2><p>Se conservaron sanciones antiguas cuyo origen no se puede distinguir de una sanción manual.</p><p>${escapar(revisar.map(([j])=>nombre(j)).join(", "))}</p><a href="adminDisciplina.html">Revisar disciplina</a></section>`;
    $("crDetalle").innerHTML=html;$("crEstado").textContent="";$("crAcciones").hidden=false;
    $("crDevolver").hidden=!oficial;$("crEditar").hidden=!!c.resueltoPorDefault;
    $("crEditar").href="adminEditarCedula.html?partido="+encodeURIComponent(id);
    $("crEditarDefault").hidden=!oficial || !c.resueltoPorDefault;
}
async function historial() {
    const cont=$("crHistorial");cont.hidden=false;
    try {
        const lista=await getDocsFromServer(query(collection(db,"historialCedulas"),where("partidoId","==",id)));
        const documentos=lista.docs.map(s=>s.data()).sort((a,b)=>(b.fecha?.toMillis?.() || 0)-(a.fecha?.toMillis?.() || 0));
        cont.innerHTML="<h2>Historial de revisiones</h2>"+(documentos.length?documentos.map(h=>`<details><summary>${escapar(h.accion)} · ${escapar(momento(h.fecha))} · ${escapar(h.porNombre)}</summary><p class="cr-texto">${escapar(h.motivo)}</p>${tabla(["Marcador anterior","Goles registrados","Amarillas","Rojas"],[[h.cedula?.resueltoPorDefault?"Default":`${h.cedula?.golesLocal ?? "—"} – ${h.cedula?.golesVisitante ?? "—"}`,(h.cedula?.goles || []).length,(h.cedula?.amarillas || []).length,(h.cedula?.rojas || []).length]])}<details><summary>Contenido archivado completo</summary><pre class="cr-texto">${escapar(JSON.stringify(h.cedula,null,2))}</pre></details></details>`).join(""):"<p>Sin devoluciones ni ediciones administrativas.</p>");
    } catch(error) {cont.textContent="No se pudo cargar el historial: "+error.message;}
}
function abrir(modo) {
    if(ocupado || viva || !esCedulaOficial(cedula)) return;
    tipo=modo;versionDialogo=versionVista;$("crMotivo").value="";$("crDialogoEstado").textContent="";
    $("crCamposDefault").hidden=modo!=="default";
    $("crDialogoTitulo").textContent=modo==="default"?"Editar resolución por default":"Devolver cédula para corrección";
    $("crExplicacion").textContent=modo==="default"?"Se archivará la resolución anterior y se actualizarán los puntos al guardar.":"El árbitro verá el motivo y conservará lo capturado. El resultado dejará de ser oficial hasta que vuelva a enviar la cédula.";
    $("crConfirmar").textContent=modo==="default"?"Guardar resolución":"Confirmar devolución";
    document.querySelector('label[for="crMotivo"]').textContent=modo==="default"?"Motivo de la edición (obligatorio)":"Motivo de la devolución (obligatorio)";
    $("crMotivoDefault").value=cedula.motivoDefault || "";$("crMotivoDefault").required=modo==="default";
    $("crGanador").value=cedula.ganadorId===partido.visitanteId?"visitante":"local";
    $("crDialogo").showModal();$("crMotivo").focus();
}
async function enviar(evento) {
    evento.preventDefault();if(ocupado)return;
    if(viva){$("crDialogoEstado").textContent="Cambió la cédula. Recarga antes de guardar.";return;}
    ocupado=true;$("crConfirmar").disabled=true;$("crCancelar").disabled=true;$("crDialogoEstado").textContent="Guardando…";
    try {
        const motivo=$("crMotivo").value.trim();
        const resultado=tipo==="default"?await resolverDefault(partido,$("crGanador").value,$("crMotivoDefault").value,{editarAdmin:true,revisionEsperada:versionDialogo,motivo}):await devolverCedula(id,versionDialogo,motivo);
        for(const cancelar of escuchas)cancelar();escuchas=[];viva=0;
        $("crDialogo").close();await cargar();
        $("crEstado").textContent=(tipo==="default"?"Resolución actualizada.":"Cédula devuelta. El árbitro verá el motivo al entrar a su panel.")+(resultado.jugadoresRevisarDisciplina.length?" Hay suspensiones antiguas por revisar en Disciplina.":"");
    } catch(error) {$("crDialogoEstado").textContent=error.message;}
    finally{ocupado=false;$("crConfirmar").disabled=false;$("crCancelar").disabled=false;}
}
