import {collection,doc,getDocFromServer,getDocsFromServer,query,where,runTransaction,serverTimestamp,deleteField} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db,auth} from "../firebase.js";
import {arbitroActivo,esCoordinador,disponibleDesde,esOficial,programacion,validarProgramacion,iguales,propuestaSolicitud,verificarConflictos} from "./coordinacionReglas.js";

function sesion(uid) {
    if (!uid || auth.currentUser?.uid !== uid) throw new Error("La sesión cambió. Vuelve a iniciar sesión.");
}
function cerrado(p,c) {
    return ["cancelado","finalizado"].includes(p.estado) || p.resultadoRegistrado === true || esOficial(c);
}
function auditar(tx,uid,nombre,accion,descripcion) {
    tx.set(doc(collection(db,"auditoria")),{modulo:"COORDINACION ARBITRAL",accion,descripcion,usuarioId:uid,usuarioNombre:nombre || "Coordinación",fecha:serverTimestamp()});
}
async function horaServidor() {
    const token=await auth.currentUser.getIdToken();
    const proyecto=db.app.options.projectId;
    const respuesta=await fetch(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents:batchGet`,{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer " + token},
        body:JSON.stringify({documents:[`projects/${proyecto}/databases/(default)/documents/configuracionLiga/general`]})
    });
    if (!respuesta.ok) throw new Error("No se pudo verificar la hora del servidor. Intenta nuevamente.");
    const datos=await respuesta.json();
    const lectura=(Array.isArray(datos)?datos:[datos]).find(d=>d.readTime)?.readTime;
    const ahora=Date.parse(lectura);
    if (!Number.isFinite(ahora)) throw new Error("No se pudo verificar la espera de 12 horas.");
    return ahora;
}
export async function cambiarAuxiliar(uid,nuevoId,esperado) {
    sesion(uid);
    const ahora=nuevoId ? await horaServidor() : 0;
    return runTransaction(db,async tx=>{
        sesion(uid);
        const ref=doc(db,"configuracionLiga","general");
        const [c,u] = await Promise.all([tx.get(ref),tx.get(doc(db,"usuarios",uid))]);
        const config=c.exists()?c.data():{};
        const administrador=u.exists() && u.data().rol==="admin" && u.data().activo!==false;
        const jefe=u.exists() && arbitroActivo(u.data()) && config.jefeArbitrosId===uid;
        if (!administrador && !jefe) throw new Error("Solo el jefe titular o administración pueden administrar al auxiliar.");
        if ((config.auxiliarJefeArbitrosId || null)!==(esperado || null)) throw new Error("La designación cambió en otra sesión. Actualiza el panel.");
        if ((nuevoId || null)===(config.auxiliarJefeArbitrosId || null)) throw new Error("Selecciona un auxiliar diferente.");
        let nombre="";
        if (nuevoId) {
            if (nuevoId===uid || nuevoId===config.jefeArbitrosId) throw new Error("Elige a otro árbitro como auxiliar.");
            if (!config.jefeArbitrosId) throw new Error("Primero designa al jefe titular desde Administración de árbitros.");
            const titular=await tx.get(doc(db,"usuarios",config.jefeArbitrosId));
            if (!titular.exists() || !arbitroActivo(titular.data())) throw new Error("El jefe titular debe ser un árbitro activo.");
            if (ahora<disponibleDesde(config)) throw new Error("Aún no han transcurrido 12 horas desde la última asignación.");
            const elegido=await tx.get(doc(db,"usuarios",nuevoId));
            if (!elegido.exists() || !arbitroActivo(elegido.data())) throw new Error("El árbitro seleccionado ya no está activo.");
            nombre=elegido.data().nombre || "Árbitro";
        }
        tx.set(ref,{
            auxiliarJefeArbitrosId:nuevoId || null,
            auxiliarJefeArbitrosNombre:nombre,
            auxiliarJefeArbitrosDe:nuevoId ? config.jefeArbitrosId : null,
            ...(nuevoId ? {auxiliarJefeArbitrosAsignadoEn:serverTimestamp()} : {}),
            auxiliarJefeArbitrosActualizadoEn:serverTimestamp(),
            auxiliarJefeArbitrosActualizadoPor:uid
        },{merge:true});
        auditar(tx,uid,u.data().nombre,nuevoId?"ASIGNAR AUXILIAR":"RETIRAR AUXILIAR",nombre || config.auxiliarJefeArbitrosNombre || "Auxiliar retirado");
    });
}
export async function enviarCambio(uid,partidoId,propuesta,base,motivo) {
    sesion(uid);
    propuesta=programacion(validarProgramacion(propuesta));
    const razon=String(motivo || "").trim();
    if (!partidoId || !razon || razon.length>1000) throw new Error("Selecciona un partido y escribe un motivo de hasta 1000 caracteres.");
    const ref=doc(collection(db,"solicitudesCambioArbitro"));
    return runTransaction(db,async tx=>{
        sesion(uid);
        const partidoRef=doc(db,"partidos",partidoId);
        const [c,u,p,ce]=await Promise.all([
            tx.get(doc(db,"configuracionLiga","general")),tx.get(doc(db,"usuarios",uid)),
            tx.get(partidoRef),tx.get(doc(db,"cedulas",partidoId))
        ]);
        const config=c.exists()?c.data():{};
        const titular=config.jefeArbitrosId && config.jefeArbitrosId!==uid ? await tx.get(doc(db,"usuarios",config.jefeArbitrosId)):u;
        const administrador=u.exists() && u.data().rol==="admin" && u.data().activo!==false;
        if (!u.exists() || (!administrador && !esCoordinador(config,uid,u.data(),titular?.exists()?titular.data():null))) throw new Error("Tu cuenta ya no pertenece a la coordinación arbitral.");
        if (!p.exists() || cerrado(p.data(),ce.exists()?ce.data():null)) throw new Error("El partido está cancelado o ya tiene resultado oficial.");
        const actual=p.data();
        if (!iguales(actual,base) || ["localId","visitanteId","categoriaId","jornadaId"].some(k=>(actual[k]||null)!==(base[k]||null))) throw new Error("El partido cambió. Actualiza el panel antes de solicitar cambios.");
        if (iguales(actual,propuesta)) throw new Error("No has cambiado ningún dato del partido.");
        let nombre="Pendiente";
        if (propuesta.arbitroId) {
            const a=await tx.get(doc(db,"usuarios",propuesta.arbitroId));
            if (!a.exists() || !arbitroActivo(a.data())) throw new Error("El árbitro propuesto no está activo.");
            nombre=a.data().nombre || "Árbitro";
        }
        if (actual.solicitudCambioArbitroPendienteId) {
            const anterior=await tx.get(doc(db,"solicitudesCambioArbitro",actual.solicitudCambioArbitroPendienteId));
            if (anterior.exists() && anterior.data().estado==="pendiente") throw new Error("Este partido ya tiene una solicitud pendiente.");
        }
        tx.set(ref,{
            partidoId,localNombre:actual.localNombre || "Local",visitanteNombre:actual.visitanteNombre || "Visitante",
            categoriaNombre:actual.categoriaNombre || "",jornadaNombre:actual.jornadaNombre || "",
            ...programacion(actual),arbitroActualId:actual.arbitroId || null,arbitroActualNombre:actual.arbitroNombre || "Pendiente",
            arbitroPropuestoId:propuesta.arbitroId,arbitroPropuestoNombre:nombre,
            versionProgramacion:2,programacionActual:programacion(actual),programacionPropuesta:propuesta,
            identidadPartido:Object.fromEntries(["localId","visitanteId","categoriaId","jornadaId"].map(k=>[k,actual[k]||null])),
            solicitanteId:uid,solicitanteNombre:u.data().nombre || "Coordinación arbitral",
            motivo:razon,estado:"pendiente",creadoEn:serverTimestamp(),actualizadoEn:serverTimestamp()
        });
        tx.update(partidoRef,{solicitudCambioArbitroPendienteId:ref.id});
        auditar(tx,uid,u.data().nombre,"SOLICITAR CAMBIO",`${partidoId}: ${razon}`);
        return ref.id;
    });
}
function huellaSolicitud(datos) {
    return JSON.stringify(datos, (_, valor) => {
        if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return valor;
        return Object.fromEntries(Object.keys(valor).sort().map(clave => [clave, valor[clave]]));
    });
}

export async function resolverCambio({solicitudId,adminUid,aprobar,respuesta=""}) {
    sesion(adminUid);
    const mensaje=String(respuesta).trim();
    if (mensaje.length>1000 || (!aprobar && !mensaje)) throw new Error("Escribe una respuesta de hasta 1000 caracteres; es obligatoria al rechazar.");
    const ref=doc(db,"solicitudesCambioArbitro",solicitudId);
    const previa=await getDocFromServer(ref);
    if (!previa.exists() || !previa.data().partidoId) throw new Error("La solicitud ya no está disponible.");
    const inicial=previa.data();
    if (aprobar && inicial.versionProgramacion!==2 && !inicial.arbitroPropuestoId) throw new Error("La solicitud no identifica al árbitro propuesto.");
    const propuesta=aprobar ? propuestaSolicitud(inicial):null;
    const otros=aprobar && propuesta.fecha && propuesta.hora ?
        (await getDocsFromServer(query(collection(db,"partidos"),where("fecha","==",propuesta.fecha)))).docs.filter(d=>d.id!==inicial.partidoId).map(d=>d.ref):[];
    return runTransaction(db,async tx=>{
        sesion(adminUid);
        const [u,s]=await Promise.all([tx.get(doc(db,"usuarios",adminUid)),tx.get(ref)]);
        if (!u.exists() || u.data().rol!=="admin" || u.data().activo===false) throw new Error("Se requiere una cuenta administradora activa.");
        if (!s.exists() || s.data().estado!=="pendiente") throw new Error("La solicitud ya fue resuelta.");
        const solicitud=s.data();
        if (huellaSolicitud(solicitud)!==huellaSolicitud(inicial)) throw new Error("La solicitud cambió. Actualiza la página.");
        const pRef=doc(db,"partidos",solicitud.partidoId);
        const p=await tx.get(pRef);
        if (aprobar) {
            if (!p.exists()) throw new Error("El partido ya no existe.");
            const partido={...p.data(),id:p.id};
            const base=solicitud.versionProgramacion===2 ? solicitud.programacionActual : {...programacion(solicitud),arbitroId:solicitud.arbitroActualId || null};
            if (!iguales(partido,base)) throw new Error("La programación cambió desde la solicitud. Recházala y solicita una nueva.");
            if (solicitud.versionProgramacion===2 && ["localId","visitanteId","categoriaId","jornadaId"].some(k=>(partido[k]||null)!==(solicitud.identidadPartido?.[k]||null))) throw new Error("Los equipos o la jornada cambiaron. Solicita una nueva propuesta.");
            if (partido.solicitudCambioArbitroPendienteId!==solicitudId) throw new Error("La solicitud no coincide con la pendiente del partido.");
            if (iguales(partido,propuesta)) throw new Error("La propuesta no contiene cambios.");
            const ce=await tx.get(doc(db,"cedulas",solicitud.partidoId));
            if (cerrado(partido,ce.exists()?ce.data():null)) throw new Error("El partido está cancelado o tiene resultado oficial.");
            let nombre="";
            if (propuesta.arbitroId) {
                const a=await tx.get(doc(db,"usuarios",propuesta.arbitroId));
                if (!a.exists() || !arbitroActivo(a.data())) throw new Error("El árbitro propuesto ya no está activo.");
                nombre=a.data().nombre || "Árbitro";
            }
            const snapshots=await Promise.all(otros.map(r=>tx.get(r)));
            verificarConflictos(partido,propuesta,snapshots.filter(d=>d.exists()).map(d=>({...d.data(),id:d.id})));
            tx.update(pRef,{
                ...propuesta,arbitroNombre:nombre,solicitudCambioArbitroPendienteId:deleteField(),
                arbitroCambioSolicitudId:solicitudId,arbitroCambioAprobadoPor:adminUid,actualizadoEn:serverTimestamp()
            });
        } else if (p.exists() && p.data().solicitudCambioArbitroPendienteId===solicitudId) {
            tx.update(pRef,{solicitudCambioArbitroPendienteId:deleteField()});
        }
        tx.update(ref,{estado:aprobar?"aprobada":"rechazada",respuestaAdministrativa:mensaje || "Cambios del partido autorizados.",respondidoPor:adminUid,respondidoPorNombre:u.data().nombre || "Administrador",resueltoEn:serverTimestamp(),actualizadoEn:serverTimestamp()});
        auditar(tx,adminUid,u.data().nombre,aprobar?"APROBAR CAMBIO":"RECHAZAR CAMBIO",solicitudId);
        return {estado:aprobar?"aprobada":"rechazada",partidoId:solicitud.partidoId};
    });
}
