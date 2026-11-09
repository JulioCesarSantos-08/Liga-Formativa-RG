import {onSnapshot,doc} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "../firebase.js";
import {obtenerUsuarioActual} from "../roles.js";
import {esCoordinador} from "./coordinacionReglas.js";

const usuario=await obtenerUsuarioActual();
const uid=usuario?.firebaseUser?.uid || usuario?.uid;
if (uid) {
    let config={},cuenta={},titular={},titularId="",cancelarTitular=()=>{};
    function pintar() {
        const permitido=(cuenta.rol==="admin" && cuenta.activo!==false) || esCoordinador(config,uid,cuenta,titular);
        let enlace=document.getElementById("btnPanelJefeArbitros");
        if (!permitido) {enlace?.remove();return;}
        if (enlace) return;
        const bienvenida=document.querySelector(".bienvenida");
        if (!bienvenida) return;
        enlace=document.createElement("a");enlace.id="btnPanelJefeArbitros";enlace.href="jefeArbitros.html";
        enlace.textContent="Panel de coordinación arbitral";
        enlace.style.cssText="display:flex;align-items:center;justify-content:center;min-height:48px;margin:14px 0;padding:14px;border-radius:12px;border:1px solid #07574f;background:#0b756d;color:#fff;font-weight:800;font-size:.85rem;text-align:center;text-decoration:none";
        bienvenida.after(enlace);
    }
    const fallo=()=>{document.getElementById("btnPanelJefeArbitros")?.remove();};
    const cancelarUsuario=onSnapshot(doc(db,"usuarios",uid),s=>{cuenta=s.exists()?s.data():{};pintar();},fallo);
    const cancelarConfig=onSnapshot(doc(db,"configuracionLiga","general"),s=>{
        config=s.exists()?s.data():{};
        if (titularId!==(config.jefeArbitrosId || "")) {
            cancelarTitular();titularId=config.jefeArbitrosId || "";titular={};
            if (titularId) cancelarTitular=onSnapshot(doc(db,"usuarios",titularId),t=>{titular=t.exists()?t.data():{};pintar();},fallo);
        }
        pintar();
    },fallo);
    window.addEventListener("pagehide",()=>{cancelarUsuario();cancelarConfig();cancelarTitular();},{once:true});
    window.addEventListener("pageshow",e=>{if(e.persisted)location.reload();});
}
