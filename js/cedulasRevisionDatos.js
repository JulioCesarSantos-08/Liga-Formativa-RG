import {cambiosDisciplina,estadoCategoria,temporadaDisciplina,fechaPartido} from "./disciplinaCategoria.js";
import {collection,doc,getDocFromServer,getDocsFromServer,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db,auth} from "./firebase.js";
import {usuarioTieneRol} from "./permisosUsuario.js";
import {validarCierreDisponible} from "./resultadosDefault.js";
import {esCedulaOficial,revisionCedula,idsEventos,totalesJugador,validarResultadoCedula,resultadoPendiente,suspensionTrasRevision} from "./cedulasRevisionReglas.js";

export async function guardarRevisionCedula(partidoId,resolver,opciones={}) {
    const uid=auth.currentUser?.uid;
    if (!uid || !partidoId) throw new Error("Inicia sesión y selecciona un partido.");
    if (!Number.isInteger(opciones.revisionEsperada) || opciones.revisionEsperada<0) throw new Error("Recarga la cédula antes de guardar.");
    const devolver=opciones.devolver===true,editar=opciones.editarAdmin===true;
    const motivo=String(opciones.motivo || "").trim();
    if ((devolver || editar) && (motivo.length<8 || motivo.length>1000)) throw new Error("Escribe un motivo de 8 a 1000 caracteres.");
    const controlRef=doc(db,"controlCedulas","general");
    const control=await getDocFromServer(controlRef);
    const version=Number(control.exists()?control.data().version || 0:0);
    const consulta=await getDocsFromServer(collection(db,"cedulas"));
    const consultaPrestamos=await getDocsFromServer(collection(db,"prestamosJugadores"));
    const cedulaRef=doc(db,"cedulas",partidoId),partidoRef=doc(db,"partidos",partidoId);
    const refs=[...new Map([...consulta.docs.map(s=>[s.id,s.ref]),[partidoId,cedulaRef]]).values()];
    const historialRef=doc(collection(db,"historialCedulas"));
    const auditoriaRef=doc(collection(db,"auditoria"));
    return runTransaction(db,async tx=>{
        const [u,p,guardia,snapshots]=await Promise.all([
            tx.get(doc(db,"usuarios",uid)),tx.get(partidoRef),tx.get(controlRef),Promise.all(refs.map(r=>tx.get(r)))
        ]);
        if (auth.currentUser?.uid!==uid || !u.exists() || u.data().activo===false || !p.exists()) throw new Error("La cuenta o el partido ya no están disponibles.");
        if (Number(guardia.exists()?guardia.data().version || 0:0)!==version) throw new Error("Otra cédula cambió mientras guardabas. Intenta nuevamente.");
        const usuario=u.data(),partido=p.data(),admin=usuario.rol==="admin";
        if (!admin && (!usuarioTieneRol(usuario,"arbitro") || partido.arbitroId!==uid || devolver || editar)) throw new Error("No tienes permiso para modificar esta cédula.");
        const cedulas=snapshots.filter(s=>s.exists()).map(s=>({...s.data(),id:s.id}));
        const anterior=cedulas.find(c=>c.id===partidoId) || {};
        if (revisionCedula(anterior)!==opciones.revisionEsperada) throw new Error("La cédula cambió en otra sesión o fue devuelta. Recarga antes de continuar.");
        if (devolver && !esCedulaOficial(anterior)) throw new Error("Solo se puede devolver una cédula oficial. Actualiza la página.");
        if (!devolver && !editar) validarCierreDisponible(partido,anterior);
        if (editar && ["cancelado","cancelada","suspendido","suspendida"].includes(String(partido.estado || "").toLowerCase())) throw new Error("El partido no está disponible para edición.");
        const fecha=serverTimestamp(),revision=revisionCedula(anterior)+1;
        const autor=usuario.nombreCompleto || usuario.nombre || "Administrador";
        let datos,cedula;
        if (devolver) {
            const devolucion={activa:true,motivo,porUid:uid,porNombre:autor,en:fecha,revision};
            cedula={...anterior,estado:"devuelta",confirmadoPorArbitro:false,confirmadoPorUid:null,confirmadoPorNombre:"",enviadoEn:null,enRevision:true,devolucionCedula:devolucion};
            datos={partido:{...resultadoPendiente(),devolucionCedula:devolucion}};
        } else {
            datos=resolver(partido,anterior,uid,usuario);
            if (!datos?.cedula) throw new Error("No se recibieron los datos de la cédula.");
            if (editar && !esCedulaOficial(datos.cedula)) throw new Error("La edición administrativa debe guardarse como cédula oficial.");
            for (const k of ["localId","visitanteId","categoriaId","jornadaId"]) if (datos.cedula[k]!==undefined && (datos.cedula[k]||null)!==(partido[k]||null)) throw new Error("Los equipos o la jornada cambiaron. Recarga la cédula.");
            cedula={...anterior,...datos.cedula,enRevision:false,resueltoPorDefault:datos.cedula.resueltoPorDefault===true};
            if (esCedulaOficial(cedula)) {
                validarResultadoCedula(cedula,partido);
                if (!datos.partido?.resultadoRegistrado) throw new Error("Falta el resultado oficial del partido.");
                if (cedula.resueltoPorDefault!==true) {
                    cedula={...cedula,resueltoPorDefault:false,tipoResultado:"normal",partidoDisputado:true,ganadorId:null,perdedorId:null,motivoDefault:"",resueltoPorUid:null,resueltoPorNombre:"",resueltoEn:null};
                    datos.partido={...datos.partido,resueltoPorDefault:false,tipoResultado:"normal",partidoDisputado:true,ganadorId:null,perdedorId:null,motivoDefault:"",resueltoPorUid:null,resueltoPorNombre:"",resueltoEn:null};
                }
                if (anterior.devolucionCedula) {
                    cedula.devolucionCedula={...anterior.devolucionCedula,activa:false,corregidaEn:fecha,corregidaPor:uid};
                    datos.partido={...datos.partido,devolucionCedula:cedula.devolucionCedula};
                }
            }
        }
        delete cedula.id;
        cedula.temporadaDisciplina=temporadaDisciplina(partido);
        cedula.revisionCedula=revision;cedula.actualizadoEn=fecha;
        cedula.ultimaModificacionPor=uid;cedula.ultimaModificacionNombre=autor;
        const oficialAntes=esCedulaOficial(anterior),oficialDespues=esCedulaOficial(cedula);
        const despues=[...cedulas.filter(c=>c.id!==partidoId),{...cedula,id:partidoId}];
        const temporada = temporadaDisciplina(cedula);
        const presentes = [...(cedula.presentesLocal || []),...(cedula.presentesVisitante || [])];
        const afectados = [...cedulas, ...despues].filter(c => c.categoriaId === partido.categoriaId && temporadaDisciplina(c) === temporada).flatMap(c => (c.rojas || []).map(r=>r.jugadorId));
        const ids=oficialAntes || oficialDespues ? [...new Set([...idsEventos(anterior),...idsEventos(cedula),...afectados,...presentes])].filter(Boolean):[];
        if (ids.length>400) throw new Error("La cédula tiene demasiados jugadores en eventos. Revisa los datos.");
        const jugadores=await Promise.all(ids.map(id=>tx.get(doc(db,"jugadores",id))));
        const revisar=[];
        const cambios=jugadores.flatMap((s,i)=>{
            if (!s.exists()) {
                if (oficialDespues && idsEventos(cedula).includes(ids[i])) throw new Error("Un jugador de los eventos ya no existe. Revisa la cédula.");
                return [];
            }
            const jugador = {...s.data(),id:ids[i]};
            if (oficialDespues && !oficialAntes && !anterior.devolucionCedula && !editar && cedula.resueltoPorDefault !== true && presentes.includes(ids[i])) {
                if (!fechaPartido(cedula)) throw new Error("Registra la fecha del partido antes de cerrar la cédula.");
                const estado = estadoCategoria(jugador,partido.categoriaId,cedulas,temporada,{...cedula,id:partidoId});
                if (estado.suspendido || jugador.activo === false) throw new Error((jugador.nombreCompleto || jugador.nombre || "Jugador") + ": no está habilitado en esta categoría. Revisa el pase de lista.");
            }
            const sancion=cambiosDisciplina(jugador,despues,temporada);
            if (sancion.disciplinaManualConservada?.requiereRevision) revisar.push(ids[i]);
            if (!afectados.includes(ids[i]) && ![...idsEventos(anterior),...idsEventos(cedula)].includes(ids[i])) return [];
            const estadisticas = [...idsEventos(anterior),...idsEventos(cedula)].includes(ids[i]) ? totalesJugador(ids[i],despues) : {};
            return [{ref:s.ref,datos:{...estadisticas,...sancion,actualizadoEn:fecha}}];
        });
        const prestamosSnapshots = await Promise.all(consultaPrestamos.docs.filter(s => ids.includes(s.data().jugadorId)).map(s => tx.get(s.ref)));
        const publicas = new Map();
        for (const s of jugadores.filter(s=>s.exists())) {
            const cambio=cambios.find(c=>c.ref.path===s.ref.path);
            const jugador={...s.data(),...(cambio?.datos || {}),id:s.id};
            if (jugador.credencialToken) publicas.set(jugador.credencialToken,{jugador,categoriaId:jugador.categoriaId});
            for (const prestamo of prestamosSnapshots.filter(p=>p.exists() && p.data().jugadorId===s.id && p.data().activo===true && p.data().estado==="activo" && p.data().credencialToken)) {
                publicas.set(prestamo.data().credencialToken,{jugador,categoriaId:prestamo.data().categoriaDestinoId,refuerzo:true});
            }
        }
        const qr = await Promise.all([...publicas].map(async ([token,d])=>({snapshot:await tx.get(doc(db,"credencialesPublicas",token)),...d})));
        if (cambios.length + qr.length > 450) throw new Error("Hay demasiados registros asociados. Contacta a administración antes de guardar.");
        if (oficialAntes && (devolver || editar)) tx.set(historialRef,{
            partidoId,accion:devolver?"DEVOLVER":"EDITAR",motivo,revisionAnterior:revisionCedula(anterior),
            cedula:anterior,partido,porUid:uid,porNombre:autor,fecha,jugadoresRevisarDisciplina:revisar
        });
        tx.set(cedulaRef,cedula);
        tx.update(partidoRef,{...(datos.partido || {}),cedulaRevision:revision,cedulaActualizadaEn:fecha});
        for (const cambio of cambios) tx.update(cambio.ref,cambio.datos);
        for (const q of qr) if (q.snapshot.exists() && q.categoriaId && (!q.refuerzo || q.snapshot.data().tipo === "refuerzo")) {
            const estado=estadoCategoria(q.jugador,q.categoriaId,despues,temporada);
            tx.update(q.snapshot.ref,{suspendido:estado.suspendido,bajaTemporada:estado.bajaTemporada,partidosSuspensionPendientes:estado.partidosPendientes,totalSancionesCategoria:estado.totalSanciones,vigente:q.snapshot.data().activa!==false && q.jugador.activo!==false && !estado.suspendido,actualizadoEn:fecha});
        }
        tx.set(controlRef,{version:version+1,actualizadoEn:fecha});
        tx.set(auditoriaRef,{usuarioId:uid,usuarioNombre:autor,usuarioRol:usuario.rol,modulo:"CÉDULAS",accion:devolver?"DEVOLVER PARA CORRECCIÓN":editar?"EDITAR CÉDULA":oficialDespues?"REGISTRAR CÉDULA":"GUARDAR BORRADOR",descripcion:motivo || "Guardado de cédula",entidadTipo:"partidos",entidadId:partidoId,fecha});
        return {revision,jugadoresRevisarDisciplina:revisar};
    });
}
export function devolverCedula(partidoId,revision,motivo) {
    return guardarRevisionCedula(partidoId,null,{devolver:true,revisionEsperada:revision,motivo});
}
