import {collection,onSnapshot} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "../firebase.js";
const normalizar=texto=>String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/[.!\s]+$/g,"");
export function seleccionarIncidencias(cedulas,partidos,categorias,jornadas) {
    const vacios=new Set(["sin incidencias","ninguna","ninguno","sin novedades","no hubo incidencias","no hay incidencias","ninguna incidencia","sin observaciones","n/a","na","no aplica"]);
    const ultimas=new Map();
    const registros=cedulas.flatMap(c=>{
        const p=partidos.get(c.partidoId || c.id);
        if (!p || !["registrada","enviada"].includes(c.estado) || c.devolucionCedula?.activa || c.enRevision===true) return [];
        const j=jornadas.get(p.jornadaId || c.jornadaId) || {},cat=categorias.get(p.categoriaId || c.categoriaId) || {};
        const categoria=p.categoriaNombre || c.categoriaNombre || cat.nombre || "Categoría pendiente";
        const grupo=p.categoriaId || c.categoriaId || j.categoriaId || normalizar(categoria);
        const nombre=p.jornadaNombre || c.jornadaNombre || j.nombre || "";
        const valores=[j.numero,p.jornadaNumero,c.jornadaNumero,p.numeroJornada,c.numeroJornada];
        const numeroDirecto=valores.map(Number).find(n=>Number.isInteger(n) && n>0);
        const coincidencia=String(nombre).trim().match(/^(?:jornada\s*|j\.?\s*)?(\d+)(?:\s|$)/i);
        const numero=numeroDirecto || Number(coincidencia?.[1]);
        if (!Number.isInteger(numero) || numero<1) return [];
        ultimas.set(grupo,Math.max(ultimas.get(grupo) || 0,numero));
        const texto=String(c.incidencias || "").trim();
        const fecha=c.enviadoEn?.toMillis?.() || c.actualizadoEn?.toMillis?.() || 0;
        return [{id:c.partidoId || c.id,texto,jornada:"Jornada "+numero,categoria,grupo,numero,local:p.localNombre || c.localNombre || "Local",visitante:p.visitanteNombre || c.visitanteNombre || "Visitante",orden:fecha}];
    });
    return registros.filter(r=>r.numero>=ultimas.get(r.grupo)-1 && r.texto && !vacios.has(normalizar(r.texto)))
        .sort((a,b)=>b.orden-a.orden || a.id.localeCompare(b.id));
}
export function iniciarIncidenciasInicio() {
    const raiz=document.getElementById("incidenciasInicio");
    if (!raiz || raiz.dataset.iniciado) return;
    raiz.dataset.iniciado="si";
    const $=id=>document.getElementById(id),estado=$("iiEstado"),tarjeta=$("iiTarjeta"),controles=$("iiControles");
    const datos={cedulas:[],partidos:new Map(),categorias:new Map(),jornadas:new Map()},listos=new Set(),errores=new Set();
    let lista=[],indice=0,temporizador=null,ampliada=false,hover=false,foco=false,visible=true,detenido=false;
    let pausa=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
    const cancelaciones=[];
    function parar() {if(temporizador!==null)clearTimeout(temporizador);temporizador=null;}
    function programar() {
        parar();
        $("iiPausa").textContent=pausa?"Reanudar":"Pausar";
        $("iiPausa").setAttribute("aria-pressed",String(pausa));
        if(detenido || lista.length<2 || pausa || ampliada || hover || foco || document.hidden || !visible || errores.size) return;
        temporizador=setTimeout(()=>{indice=(indice+1)%lista.length;mostrar(false);},10000);
    }
    function mostrar(anunciar=false) {
        const item=lista[indice];
        if (!item) return;
        $("iiJornada").textContent=item.jornada;$("iiCategoria").textContent=item.categoria;
        $("iiEquipos").textContent=item.local+" vs "+item.visitante;
        const larga=item.texto.length>330;
        let breve=item.texto.slice(0,330);const corte=breve.lastIndexOf(" ");if(corte>250)breve=breve.slice(0,corte);
        $("iiTexto").textContent=larga && !ampliada?breve+"…":item.texto;
        $("iiLeer").hidden=!larga;$("iiLeer").textContent=ampliada?"Ver menos":"Leer incidencia completa";
        $("iiLeer").setAttribute("aria-expanded",String(ampliada));
        $("iiContador").textContent=(indice+1)+" de "+lista.length;
        $("iiPartido").href="partido.html?id="+encodeURIComponent(item.id);
        $("iiAnterior").disabled=lista.length<2;$("iiSiguiente").disabled=lista.length<2;$("iiPausa").hidden=lista.length<2;
        if(anunciar)$("iiAnuncio").textContent="Incidencia "+(indice+1)+" de "+lista.length+". "+item.jornada+". "+item.local+" contra "+item.visitante;
        programar();
    }
    function actualizar() {
        parar();
        if(errores.size){tarjeta.hidden=true;controles.hidden=true;estado.hidden=false;estado.textContent="No se pudieron cargar las incidencias. Intenta recargar la página.";return;}
        if(listos.size<4) return;
        const anterior=lista[indice];
        lista=seleccionarIncidencias(datos.cedulas,datos.partidos,datos.categorias,datos.jornadas);
        const posicion=lista.findIndex(i=>i.id===anterior?.id);
        indice=posicion>=0?posicion:0;
        if(!anterior || lista[indice]?.id!==anterior.id || lista[indice]?.texto!==anterior.texto)ampliada=false;
        tarjeta.hidden=!lista.length;controles.hidden=!lista.length;estado.hidden=!!lista.length;
        estado.textContent="No hay incidencias reportadas en las dos jornadas más recientes de cada categoría.";
        mostrar(false);
    }
    function mover(paso){if(!lista.length)return;indice=(indice+paso+lista.length)%lista.length;ampliada=false;mostrar(true);}
    $("iiAnterior").addEventListener("click",()=>mover(-1));
    $("iiSiguiente").addEventListener("click",()=>mover(1));
    $("iiPausa").addEventListener("click",()=>{pausa=!pausa;programar();});
    $("iiLeer").addEventListener("click",()=>{ampliada=!ampliada;mostrar(false);});
    raiz.addEventListener("mouseenter",()=>{hover=true;programar();});
    raiz.addEventListener("mouseleave",()=>{hover=false;programar();});
    raiz.addEventListener("focusin",()=>{foco=true;programar();});
    raiz.addEventListener("focusout",e=>{foco=raiz.contains(e.relatedTarget);programar();});
    document.addEventListener("visibilitychange",programar);
    const observador=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entradas=>{visible=entradas.some(e=>e.isIntersecting);programar();},{threshold:0.1}):null;
    observador?.observe(raiz);
    for(const nombre of Object.keys(datos)) {
        const cancelar=onSnapshot(collection(db,nombre),snapshot=>{
            errores.delete(nombre);listos.add(nombre);
            const filas=snapshot.docs.map(s=>({...s.data(),id:s.id}));
            datos[nombre]=nombre==="cedulas"?filas:new Map(filas.map(f=>[f.id,f]));actualizar();
        },()=>{errores.add(nombre);actualizar();});
        cancelaciones.push(cancelar);
    }
    function alSalir(e) {
        parar();if(e.persisted)return;
        detenido=true;cancelaciones.forEach(cancelar=>cancelar());observador?.disconnect();document.removeEventListener("visibilitychange",programar);
    }
    window.addEventListener("pagehide",alSalir);
    window.addEventListener("pageshow",()=>{if(!detenido)programar();});
}
