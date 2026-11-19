import {collection,doc,getDocFromServer,getDocsFromServer,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db,auth} from "../firebase.js";
import {normalizarDorsal} from "../dorsales.js";
import {dorsalRefuerzo} from "../disciplinaCategoria.js";
import {usuarioTieneAlgunRol} from "../permisosUsuario.js";
const vigente=p=>p.activo===true && String(p.estado || "").toLowerCase()==="activo";
export async function guardarDorsalRefuerzo(prestamoId,valor) {
    const numero=normalizarDorsal(valor),uid=auth.currentUser?.uid;
    if (!numero || !uid) throw new Error("Inicia sesión e indica un dorsal de 1 a 3 dígitos.");
    const ref=doc(db,"prestamosJugadores",prestamoId),actual=await getDocFromServer(ref);
    if (!actual.exists()) throw new Error("El préstamo ya no existe.");
    const destinoId=actual.data().equipoDestinoId || actual.data().equipoId;
    const equipoRef=doc(db,"equipos",destinoId);
    const [equipoBase,jugadoresBase,prestamosBase]=await Promise.all([getDocFromServer(equipoRef),getDocsFromServer(collection(db,"jugadores")),getDocsFromServer(collection(db,"prestamosJugadores"))]);
    const refsPrestamos=prestamosBase.docs.filter(s=>(s.data().equipoDestinoId || s.data().equipoId)===destinoId);
    const ids=new Set(refsPrestamos.map(s=>s.data().jugadorId));
    const refsJugadores=jugadoresBase.docs.filter(s=>s.data().equipoId===destinoId || ids.has(s.id));
    const auditoria=doc(collection(db,"auditoria"));
    return runTransaction(db,async tx=>{
        const [u,e,p,js,ps]=await Promise.all([tx.get(doc(db,"usuarios",uid)),tx.get(equipoRef),tx.get(ref),Promise.all(refsJugadores.map(s=>tx.get(s.ref))),Promise.all(refsPrestamos.map(s=>tx.get(s.ref)))]);
        if (auth.currentUser?.uid!==uid || !u.exists() || u.data().activo===false || !usuarioTieneAlgunRol(u.data(),["admin","jefeEquipo"]) || !e.exists() || (u.data().rol!=="admin" && e.data().responsableId!==uid)) throw new Error("No tienes permiso para modificar el dorsal de este equipo.");
        if (!p.exists() || !vigente(p.data()) || (p.data().equipoDestinoId || p.data().equipoId)!==destinoId) throw new Error("El refuerzo ya no está activo en este equipo.");
        if (Number(e.data().cupoRevision || 0)!==Number(equipoBase.data()?.cupoRevision || 0) || Number(e.data().dorsalesRefuerzosRevision || 0)!==Number(equipoBase.data()?.dorsalesRefuerzosRevision || 0)) throw new Error("La plantilla cambió. Actualiza antes de guardar.");
        const prestamo=p.data(),jugadores=js.filter(s=>s.exists()).map(s=>({...s.data(),id:s.id}));
        const jugador=jugadores.find(j=>j.id===prestamo.jugadorId);
        if (!jugador || jugador.activo===false || jugador.equipoId!==prestamo.equipoOrigenId) throw new Error("El jugador cambió de equipo o ya no está activo.");
        const participantes=jugadores.filter(j=>j.equipoId===destinoId).map(j=>({id:j.id,numero:j.numero ?? j.dorsal}));
        for(const s of ps.filter(s=>s.exists() && vigente(s.data()))) {
            const j=jugadores.find(j=>j.id===s.data().jugadorId);
            if (j && j.activo!==false && j.equipoId===s.data().equipoOrigenId) participantes.push({id:j.id,numero:dorsalRefuerzo(j,s.data())});
        }
        if(participantes.some(j=>j.id!==jugador.id && String(j.numero ?? "").trim()===numero)) throw new Error("Este dorsal ya lo usa otro jugador o refuerzo del equipo. 7 y 07 se consideran distintos.");
        const publica=prestamo.credencialToken?doc(db,"credencialesPublicas",prestamo.credencialToken):null;
        const publicaSnapshot=publica?await tx.get(publica):null;
        tx.update(ref,{dorsalRefuerzo:numero,dorsalActualizadoPor:uid,dorsalActualizadoEn:serverTimestamp(),credencialGenerada:false});
        tx.update(equipoRef,{dorsalesRefuerzosRevision:Number(e.data().dorsalesRefuerzosRevision || 0)+1});
        if(publicaSnapshot?.exists() && publicaSnapshot.data().tipo==="refuerzo") tx.update(publica,{numero,actualizadoEn:serverTimestamp()});
        tx.set(auditoria,{usuarioId:uid,modulo:"REFUERZOS",accion:"CAMBIAR DORSAL",entidadId:prestamoId,jugadorId:jugador.id,equipoId:destinoId,anterior:dorsalRefuerzo(jugador,prestamo),nuevo:numero,fecha:serverTimestamp()});
        return numero;
    });
}
