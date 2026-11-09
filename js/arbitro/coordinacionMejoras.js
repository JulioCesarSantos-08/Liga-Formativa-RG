import {onSnapshot,doc,collection} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "../firebase.js";
import {arbitroActivo,esCoordinador,disponibleDesde,cedulaVencida,esOficial,inicioPartido} from "./coordinacionReglas.js";
import {cambiarAuxiliar} from "./coordinacionDatos.js";

export function iniciarMejoras({uid,revocar,recargar}) {
    const $=id=>document.getElementById(id);
    const bloque=document.createElement("section");
    bloque.className="seccion ja-auxiliar";
    bloque.innerHTML=`<h2>Auxiliar del jefe de árbitros</h2>
        <p class="descripcion">Un solo auxiliar puede consultar este panel y solicitar cambios. El jefe titular y administración pueden designarlo o retirarlo.</p>
        <p id="jaAuxActual"></p><p id="jaAuxEspera" class="estado"></p>
        <div id="jaGestionAux" class="formulario" hidden>
            <label class="campo">Árbitro auxiliar<select id="jaAuxElegido"><option value="">Selecciona un árbitro</option></select></label>
            <div class="ja-aux-acciones"><button class="boton principal" id="jaAsignarAux" type="button">Guardar auxiliar</button>
            <button class="boton ja-retirar" id="jaRetirarAux" type="button">Retirar acceso</button></div>
        </div><p id="jaAuxMensaje" role="status" aria-live="polite" class="estado"></p>`;
    document.querySelector(".bienvenida").after(bloque);
    const alerta=document.createElement("section");
    alerta.className="seccion ja-alerta";
    alerta.hidden=true;
    alerta.innerHTML=`<h2 id="jaAlertTitulo">Cédulas pendientes</h2>
        <p class="descripcion">Han transcurrido al menos dos horas desde el inicio programado. Solicita a los árbitros responsables que registren sus cédulas oficiales. Horario de Oaxaca.</p>
        <p id="jaAlertEstado" role="status" aria-live="polite"></p><div id="jaAlertLista" class="lista"></div>`;
    document.querySelector(".bienvenida").after(alerta);
    let config=null,cuenta=null,titular=null,arbitros=[],partidos=[],oficiales=new Set();
    let ocupada=false,autorizado=false,primera=true,titularId="",cancelarTitular=()=>{},falloDatos=false;
    let datosPartidos=false,datosCedulas=false;
    const fecha=ms=>new Intl.DateTimeFormat("es-MX",{timeZone:"America/Mexico_City",dateStyle:"medium",timeStyle:"short"}).format(ms);
    function limpiarAlerta() {document.body.classList.remove("ja-cedulas-vencidas");alerta.hidden=true;}
    function permiso() {
        if (!config || !cuenta) return;
        const admin=cuenta.rol==="admin" && cuenta.activo!==false;
        if (!admin && config.auxiliarJefeArbitrosId===uid && config.jefeArbitrosId!==uid && titular===null) return;
        const valido=admin || esCoordinador(config,uid,cuenta,titular);
        const anterior=autorizado;
        autorizado=valido;
        if (!valido) {limpiarAlerta();revocar("Tu cuenta ya no tiene acceso a la coordinación arbitral.");}
        else if (!primera && !anterior) recargar();
        primera=false;
        pintarAuxiliar();pintarAlertas();
    }
    function pintarAuxiliar() {
        if (!config || !cuenta) return;
        const titularActivo=(cuenta.rol==="admin" && cuenta.activo!==false) || (arbitroActivo(cuenta) && config.jefeArbitrosId===uid);
        $("jaGestionAux").hidden=!titularActivo;
        const vigente=config.auxiliarJefeArbitrosDe===config.jefeArbitrosId && config.auxiliarJefeArbitrosId;
        $("jaAuxActual").textContent=vigente ? "Auxiliar designado: " + (config.auxiliarJefeArbitrosNombre || "Árbitro") : "Sin auxiliar designado.";
        if (!config.jefeArbitrosId) $("jaAuxActual").textContent="Primero designa al jefe titular desde Administración de árbitros. Después podrás elegir aquí a su auxiliar.";
        const disponible=disponibleDesde(config);
        const espera=disponible>Date.now();
        $("jaAuxEspera").textContent=espera ? `Podrás asignar o cambiar al auxiliar el ${fecha(disponible)}. Puedes retirarle el acceso ahora; la espera se cuenta desde la última asignación.` : "La espera de 12 horas se cuenta desde cada asignación. Retirar el acceso no reinicia ese plazo.";
        $("jaAsignarAux").disabled=ocupada || !titularActivo || !config.jefeArbitrosId || espera;
        $("jaRetirarAux").disabled=ocupada || !titularActivo || !vigente;
        $("jaAuxElegido").disabled=ocupada || espera || !titularActivo;
    }
    function cargarOpciones() {
        const select=$("jaAuxElegido"),anterior=select.value;
        select.replaceChildren(new Option("Selecciona un árbitro",""));
        arbitros.filter(a=>a.id!==uid && a.id!==config?.jefeArbitrosId && arbitroActivo(a)).forEach(a=>select.add(new Option(a.nombre || "Árbitro",a.id)));
        select.value=anterior || config?.auxiliarJefeArbitrosId || "";
    }
    async function guardar(retirar) {
        if (ocupada || !autorizado) return;
        const elegido=retirar?null:$("jaAuxElegido").value;
        if (!retirar && !elegido) {$("jaAuxMensaje").textContent="Selecciona un árbitro.";return;}
        ocupada=true;pintarAuxiliar();$("jaAuxMensaje").textContent="Guardando designación…";
        try {
            await cambiarAuxiliar(uid,elegido,config.auxiliarJefeArbitrosId);
            $("jaAuxMensaje").textContent=retirar?"Se retiró el acceso del auxiliar.":"Auxiliar guardado. Ya puede entrar desde su panel arbitral.";
        } catch(error) {$("jaAuxMensaje").textContent=error.message;}
        finally {ocupada=false;pintarAuxiliar();}
    }
    $("jaAsignarAux").addEventListener("click",()=>guardar(false));
    $("jaRetirarAux").addEventListener("click",()=>guardar(true));
    function pintarAlertas() {
        if (!autorizado) {limpiarAlerta();return;}
        if (falloDatos || !datosPartidos || !datosCedulas) {
            document.body.classList.remove("ja-cedulas-vencidas");alerta.hidden=false;
            $("jaAlertEstado").textContent=falloDatos?"No se pudo actualizar el seguimiento de cédulas. Usa Actualizar información o recarga la página.":"Comprobando cédulas…";
            $("jaAlertLista").replaceChildren();return;
        }
        const vencidos=partidos.filter(p=>cedulaVencida(p,oficiales)).sort((a,b)=>inicioPartido(a)-inicioPartido(b));
        document.body.classList.toggle("ja-cedulas-vencidas",vencidos.length>0);
        alerta.hidden=vencidos.length===0;
        const titulo=`${vencidos.length} cédula${vencidos.length===1?"":"s"} pendiente${vencidos.length===1?"":"s"} después del horario`;
        if ($("jaAlertEstado").textContent!==titulo) $("jaAlertEstado").textContent=titulo;
        $("jaAlertLista").replaceChildren();
        vencidos.slice(0,50).forEach(p=>{
            const tarjeta=document.createElement("article");tarjeta.className="tarjeta ja-pendiente";
            const h=document.createElement("h3");h.textContent=`${p.localNombre || "Local"} vs. ${p.visitanteNombre || "Visitante"}`;
            const info=document.createElement("p");info.textContent=`${p.categoriaNombre || ""} · ${p.jornadaNombre || ""} · ${fecha(inicioPartido(p))}`;
            const arbitro=document.createElement("p");arbitro.textContent="Árbitro responsable: " + (p.arbitroNombre || "Pendiente de asignar");
            const link=document.createElement("a");link.className="boton";link.textContent="Ver partido";link.href="partido.html?id="+encodeURIComponent(p.id);
            tarjeta.append(h,info,arbitro,link);$("jaAlertLista").appendChild(tarjeta);
        });
        if(vencidos.length>50){const p=document.createElement("p");p.textContent="Se muestran los primeros 50 pendientes, del más antiguo al más reciente.";$("jaAlertLista").appendChild(p);}
    }
    const cancelar=[];
    function falloPermiso() {autorizado=false;limpiarAlerta();revocar("No se pudo verificar el acceso. Recarga la página.");}
    cancelar.push(onSnapshot(doc(db,"usuarios",uid),s=>{cuenta=s.exists()?s.data():{};permiso();},falloPermiso));
    cancelar.push(onSnapshot(doc(db,"configuracionLiga","general"),s=>{
        config=s.exists()?s.data():{};
        if (titularId!==(config.jefeArbitrosId || "")) {
            cancelarTitular();titularId=config.jefeArbitrosId || "";titular=null;
            if (titularId) cancelarTitular=onSnapshot(doc(db,"usuarios",titularId),t=>{titular=t.exists()?t.data():{};permiso();},falloPermiso);
            else titular={};
        }
        cargarOpciones();permiso();
    },falloPermiso));
    const falloSeguimiento=()=>{falloDatos=true;pintarAlertas();};
    cancelar.push(onSnapshot(collection(db,"partidos"),s=>{partidos=s.docs.map(d=>({...d.data(),id:d.id}));datosPartidos=true;pintarAlertas();},falloSeguimiento));
    cancelar.push(onSnapshot(collection(db,"cedulas"),s=>{oficiales=new Set(s.docs.filter(d=>esOficial(d.data())).flatMap(d=>[d.id,d.data().partidoId].filter(Boolean)));datosCedulas=true;pintarAlertas();},falloSeguimiento));
    const timer=setInterval(()=>{pintarAuxiliar();pintarAlertas();},30000);
    const visible=()=>{if(!document.hidden){pintarAuxiliar();pintarAlertas();}};
    document.addEventListener("visibilitychange",visible);
    window.addEventListener("pagehide",()=>{cancelar.forEach(fn=>fn());cancelarTitular();clearInterval(timer);document.removeEventListener("visibilitychange",visible);limpiarAlerta();},{once:true});
    window.addEventListener("pageshow",e=>{if(e.persisted)location.reload();});
    return {permitido(){return config && cuenta && (cuenta.rol==="admin" || config.jefeArbitrosId===uid || titular!==null) ? autorizado : null;},actualizar(lista){arbitros=lista;cargarOpciones();pintarAuxiliar();}};
}
