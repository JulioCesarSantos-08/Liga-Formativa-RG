import {collection,doc,onSnapshot,query,where} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "../firebase.js";
function estilos() {
    if (document.getElementById("crEstilos")) return;
    const link=document.createElement("link");link.id="crEstilos";link.rel="stylesheet";link.href="css/revisionCedulas.css";document.head.append(link);
}
function aviso(titulo,motivo) {
    const seccion=document.createElement("section");seccion.className="cr-aviso";
    const h=document.createElement("h2"),p=document.createElement("p");h.textContent=titulo;p.textContent=motivo;seccion.append(h,p);return seccion;
}
export function instalarAvisoRevision(id,contenedor) {
    if (!contenedor || document.getElementById("crAviso")) return;
    estilos();const espacio=document.createElement("div");espacio.id="crAviso";espacio.setAttribute("aria-live","polite");contenedor.prepend(espacio);
    onSnapshot(doc(db,"partidos",id),snapshot=>{
        espacio.replaceChildren();const d=snapshot.data()?.devolucionCedula;if (!d?.activa) return;
        const bloque=aviso("Cédula devuelta para corrección",d.motivo);
        const p=document.createElement("p");p.textContent="Conservamos lo capturado. Revisa la asistencia, corrige la cédula y vuelve a enviarla. Mientras tanto, el resultado queda pendiente.";
        const a=document.createElement("a");a.href=location.href;a.textContent="Recargar para corregir";bloque.append(p,a);espacio.append(bloque);
    },()=>{espacio.textContent="No se pudo consultar el estado de revisión. Recarga antes de guardar.";});
}
export function prepararEdicionAdmin(contenedor) {
    estilos();if (!contenedor || document.getElementById("crMotivoEdicion")) return;
    const bloque=aviso("Edición administrativa","Se conservará una copia de la cédula anterior. El resultado y las estadísticas se actualizarán al enviar la corrección.");
    const label=document.createElement("label");label.textContent="Motivo de la edición (obligatorio)";label.htmlFor="crMotivoEdicion";
    const campo=document.createElement("textarea");campo.id="crMotivoEdicion";campo.minLength=8;campo.maxLength=1000;campo.required=true;campo.rows=3;
    bloque.append(label,campo);contenedor.prepend(bloque);
}
export function iniciarAvisosCedulas(uid) {
    if (!uid || document.getElementById("crDevoluciones")) return;
    estilos();const espacio=document.createElement("section");espacio.id="crDevoluciones";espacio.setAttribute("aria-live","polite");
    (document.querySelector("main") || document.body).prepend(espacio);
    onSnapshot(query(collection(db,"partidos"),where("arbitroId","==",uid)),snapshot=>{
        espacio.replaceChildren();
        for (const s of snapshot.docs) {
            const p=s.data();if (!p.devolucionCedula?.activa) continue;
            const bloque=aviso("Corrección pendiente · "+(p.localNombre || "Local")+" vs "+(p.visitanteNombre || "Visitante"),p.devolucionCedula.motivo);
            const a=document.createElement("a");a.href="partidoArbitro.html?id="+encodeURIComponent(s.id);a.textContent="Revisar y corregir cédula";bloque.append(a);espacio.append(bloque);
        }
    },()=>{espacio.textContent="No se pudieron consultar las cédulas devueltas. Actualiza la página.";});
}
