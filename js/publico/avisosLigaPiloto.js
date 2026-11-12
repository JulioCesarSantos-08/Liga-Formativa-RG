const panel=document.getElementById("avisosLiga");
const instalada=matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
const servidor="https://us-central1-liga-deportiva-rio-grande.cloudfunctions.net/avisosLigaPiloto";

if(panel && instalada && isSecureContext && "Notification" in window &&
    "PushManager" in window && "serviceWorker" in navigator) {
    const zona=document.createElement("form");
    zona.style.cssText="display:grid;gap:.65rem;width:100%";
    zona.innerHTML='<label for="avisosCodigo">Código de prueba privada</label>'+
        '<input id="avisosCodigo" type="password" required autocomplete="off" maxlength="128">'+
        '<div><button type="submit">Activar avisos automáticos</button> '+
        '<button type="button" id="avisosDesactivar">Desactivar</button></div>'+
        '<p role="status"></p>';
    panel.append(zona);
    const salida=zona.querySelector("p"), entrada=zona.querySelector("input");
    const botones=[...zona.querySelectorAll("button")];

    async function enviar(accion,suscripcion) {
        const r=await fetch(servidor,{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({accion,codigo:entrada.value,suscripcion:suscripcion.toJSON()})});
        const d=await r.json().catch(()=>({}));
        if(!r.ok) throw Error(d.error || "No se pudo conectar con el servidor de avisos.");
    }

    async function operar(alta) {
        if(!zona.reportValidity()) return;
        botones.forEach(b=>b.disabled=true);
        try {
            if(alta && (Notification.permission==="default"?await Notification.requestPermission():Notification.permission)!=="granted") {
                throw Error("Permite las notificaciones en los ajustes de la app.");
            }
            const reg=await navigator.serviceWorker.getRegistration();
            if(!reg?.active) throw Error("Cierra y vuelve a abrir la app antes de activar los avisos.");
            let s=await reg.pushManager.getSubscription();
            if(alta) {
                if(!s) {
                    const r=await fetch(servidor);
                    if(!r.ok) throw Error("El servidor de prueba todavía no está disponible.");
                    const {clavePublica}=await r.json();
                    const b64=clavePublica.replace(/-/g,"+").replace(/_/g,"/");
                    const llave=Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length/4)*4,"=")),c=>c.charCodeAt(0));
                    s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:llave});
                }
                await enviar("alta",s);
                salida.textContent="Avisos automáticos activados. Revisa si llegó el aviso del servidor.";
            } else {
                if(s) {
                    await enviar("baja",s);
                    await s.unsubscribe();
                }
                salida.textContent="Avisos automáticos desactivados.";
            }
            entrada.value="";
        } catch(e) {
            salida.textContent=e.message || "No se pudo completar la operación.";
        } finally {
            botones.forEach(b=>b.disabled=false);
        }
    }
    zona.addEventListener("submit",e=>{e.preventDefault();void operar(true);});
    zona.querySelector("#avisosDesactivar").addEventListener("click",()=>void operar(false));
}
