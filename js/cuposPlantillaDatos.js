import {collection,doc,getDocFromServer,getDocsFromServer,query,where,runTransaction,serverTimestamp,writeBatch} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db,auth} from "./firebase.js";
import {usuarioTieneRol} from "./permisosUsuario.js";
import {esSuperBebe,limitePlantillaEquipo,cupoAlCerrar,validarNuevoCupo} from "./cuposPlantillaReglas.js";
const configRef=()=>doc(db,"configuracionLiga","general");
const activo=e=>e.activo!==false && e.descalificado!==true && !["inactivo","descalificado"].includes(String(e.estado || "").toLowerCase());
function cuenta(snapshot,uid,admin=false) {
    if(auth.currentUser?.uid!==uid || !snapshot.exists() || snapshot.data().activo===false || (admin && snapshot.data().rol!=="admin"))throw new Error("La cuenta no tiene permiso para esta operación.");
    return snapshot.data();
}
async function baseEquipo(id) {
    const referencia=doc(db,"equipos",id),equipo=await getDocFromServer(referencia);
    if(!equipo.exists())throw new Error("El equipo ya no existe.");
    const jugadores=await getDocsFromServer(query(collection(db,"jugadores"),where("equipoId","==",id)));
    return {referencia,equipo:equipo.data(),jugadores:jugadores.docs};
}
async function datosFrescos(tx,base,uid) {
    const refs=[doc(db,"usuarios",uid),configRef(),base.referencia,...base.jugadores.map(s=>s.ref)];
    const snapshots=await Promise.all(refs.map(r=>tx.get(r)));
    const [u,c,e,...jugadores]=snapshots;
    if(!e.exists() || !c.exists())throw new Error("No se encontró el equipo o la configuración de inscripciones.");
    const equipo=e.data();
    if(Number(equipo.cupoRevision || 0)!==Number(base.equipo.cupoRevision || 0) || equipo.categoriaId!==base.equipo.categoriaId)throw new Error("La plantilla cambió. Actualiza e intenta nuevamente.");
    const categoria=equipo.categoriaId?await tx.get(doc(db,"categorias",equipo.categoriaId)):null;
    return {u,config:c.data(),equipo,categoria:categoria?.exists()?categoria.data():{},cantidad:jugadores.filter(s=>s.exists() && s.data().equipoId===base.referencia.id && s.data().activo!==false).length,jugadores};
}
export async function guardarCupoEquipo(id,nuevo,anterior) {
    const uid=auth.currentUser?.uid;if(!uid)throw new Error("Inicia sesión.");
    const base=await baseEquipo(id),auditoria=doc(collection(db,"auditoria"));
    return runTransaction(db,async tx=>{
        const d=await datosFrescos(tx,base,uid),usuario=cuenta(d.u,uid,true);
        const limite=limitePlantillaEquipo(d.equipo,d.config,d.categoria);
        if(limite!==anterior)throw new Error("El cupo cambió en otra sesión. Actualiza la lista.");
        validarNuevoCupo(d.equipo,d.config,d.categoria,d.cantidad,nuevo);
        const fecha=serverTimestamp();
        const datos={cupoTemporada:nuevo,limitePlantillaTemporada:nuevo,cupoAutorizadoAdmin:nuevo,plantillaCongelada:true,cupoRevision:Number(d.equipo.cupoRevision || 0)+1,cupoActualizadoPor:uid,cupoActualizadoEn:fecha};
        tx.update(base.referencia,datos);
        tx.set(auditoria,{usuarioId:uid,usuarioNombre:usuario.nombreCompleto || usuario.nombre || "Administrador",usuarioRol:"admin",modulo:"INSCRIPCIONES",accion:"AJUSTAR CUPO",descripcion:"Cupo de "+(d.equipo.nombre || "Equipo")+": "+limite+" → "+nuevo,entidadTipo:"equipos",entidadId:id,fecha});
        return datos;
    });
}
export async function registrarJugadorCupo(coleccion,datos,opciones={}) {
    const uid=auth.currentUser?.uid;if(!uid || !datos.equipoId)throw new Error("Inicia sesión y selecciona un equipo.");
    const base=await baseEquipo(datos.equipoId),referencia=opciones.id ? doc(coleccion,opciones.id) : doc(coleccion);
    await runTransaction(db,async tx=>{
        const d=await datosFrescos(tx,base,uid),usuario=cuenta(d.u,uid);
        if(usuario.rol!=="admin" && (!usuarioTieneRol(usuario,"jefeEquipo") || d.equipo.responsableId!==uid))throw new Error("El equipo no está asignado a tu cuenta.");
        if(!activo(d.equipo))throw new Error("El equipo no está habilitado para registrar jugadores.");
        if (opciones.preparar && datos.altaJornada5 === true) {
            if (d.config.jornada5Activa !== true) throw Error("La Jornada 5 está cerrada.");
        } else if (d.config.inscripcionesAbiertas === false) throw Error("Las inscripciones están cerradas. No se registró al jugador.");
        if((datos.categoriaId || null)!==(d.equipo.categoriaId || null))throw new Error("Cambió la categoría del equipo. Recarga la página.");
        const limite=limitePlantillaEquipo(d.equipo,d.config,d.categoria);
        if(d.cantidad>=limite)throw new Error("Plantilla completa: "+d.cantidad+"/"+limite+". Solicita un ajuste de cupo a administración.");
        const numero=datos.numero ?? datos.dorsal;
        if(numero!==null && numero!==undefined && d.jugadores.some(s=>s.exists() && s.data().equipoId===datos.equipoId && s.data().activo!==false && String(s.data().numero ?? s.data().dorsal ?? "")===String(numero)))throw new Error("Ese dorsal ya está ocupado. Revisa la plantilla.");
        const alta = opciones.preparar ? await opciones.preparar(tx, referencia, uid) : datos;
        tx.set(referencia,alta);
        tx.update(base.referencia,{cupoRevision:Number(d.equipo.cupoRevision || 0)+1,totalJugadores:d.cantidad+1,actualizadoEn:serverTimestamp()});
    });
    return referencia;
}
export async function cambiarRegistroOrdinario(abiertas) {
    const uid=auth.currentUser?.uid;if(!uid)throw new Error("Inicia sesión.");
    await runTransaction(db,async tx=>{
        const [u,c]=await Promise.all([tx.get(doc(db,"usuarios",uid)),tx.get(configRef())]);
        const usuario=cuenta(u,uid,true);if(!c.exists())throw new Error("No existe la configuración de la liga.");
        tx.update(configRef(),{inscripcionesAbiertas:abiertas,inscripcionesActualizadasEn:serverTimestamp(),inscripcionesActualizadasPor:uid,inscripcionesActualizadasPorNombre:usuario.nombreCompleto || usuario.nombre || "Administrador",actualizadoEn:serverTimestamp()});
    });
}
export async function congelarCuposActuales(temporadaId) {
    const uid=auth.currentUser?.uid;if(!uid)throw new Error("Inicia sesión.");
    const [u,c,es,js,cs]=await Promise.all([getDocFromServer(doc(db,"usuarios",uid)),getDocFromServer(configRef()),getDocsFromServer(collection(db,"equipos")),getDocsFromServer(collection(db,"jugadores")),getDocsFromServer(collection(db,"categorias"))]);
    cuenta(u,uid,true);if(!c.exists() || c.data().inscripcionesAbiertas!==false)throw new Error("Cierra las inscripciones antes de congelar plantillas.");
    const cantidades=new Map(),categorias=new Map(cs.docs.map(s=>[s.id,s.data()]));
    for(const s of js.docs){const j=s.data();if(j.activo!==false && j.equipoId)cantidades.set(j.equipoId,(cantidades.get(j.equipoId) || 0)+1);}
    const resultado=[];
    for(let i=0;i<es.docs.length;i+=400){
        const batch=writeBatch(db);
        for(const s of es.docs.slice(i,i+400)){
            const equipo=s.data(),categoria=categorias.get(equipo.categoriaId) || {},cupo=cupoAlCerrar(equipo,cantidades.get(s.id) || 0,c.data(),categoria);
            const datos={cupoTemporada:cupo,limitePlantillaTemporada:cupo,plantillaCongelada:!esSuperBebe(equipo,categoria),plantillaCongeladaEn:serverTimestamp(),temporadaPlantillaId:temporadaId || "",cupoRevision:Number(equipo.cupoRevision || 0)+1};
            batch.update(s.ref,datos);resultado.push({id:s.id,...datos});
        }
        await batch.commit();
    }
    return resultado;
}
export async function completarCategoriasCupo(equipos) {
    const ids=[...new Set(equipos.map(e=>e.categoriaId).filter(Boolean))];
    const categorias=new Map(await Promise.all(ids.map(async id=>{const s=await getDocFromServer(doc(db,"categorias",id));return[id,s.exists()?s.data().nombre:""];})));
    for(const equipo of equipos)equipo.categoriaNombreCupo=categorias.get(equipo.categoriaId) || equipo.categoriaNombre || "";
}
