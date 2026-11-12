const servidor="https://us-central1-liga-deportiva-rio-grande.cloudfunctions.net/avisosLigaPublicos";
const visto="liga-aviso-permiso-v1";
const alta="liga-aviso-alta-v1";

export function iniciarAvisosLiga(usuario) {
    const instalada=matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
    if(!usuario || !instalada || !isSecureContext || !("Notification" in window) ||
        !("PushManager" in window) || !("serviceWorker" in navigator)) return;

    let dialogo, reg, suscripcion, clave, preparando, ocupada=false, oculto=0, intentado=false;
    const recordar=(k,v)=>{
        try {
            if(v===undefined) return sessionStorage.getItem(k);
            sessionStorage.setItem(k,v);
        } catch {}
    };

    function preparar() {
        preparando ||= (async()=>{
            reg=await navigator.serviceWorker.ready;
            suscripcion=await reg.pushManager.getSubscription();
            if(!suscripcion) {
                const r=await fetch(servidor,{cache:"no-store"});
                if(!r.ok) throw Error("Los avisos aún no están disponibles. Puedes seguir usando la app.");
                const {clavePublica}=await r.json();
                if(!/^[A-Za-z0-9_-]{87}$/.test(clavePublica || "")) throw Error("No se pudo preparar el permiso.");
                clave=Uint8Array.from(atob(clavePublica.replace(/-/g,"+").replace(/_/g,"/")+"="),c=>c.charCodeAt(0));
            }
        })().finally(()=>{preparando=null;});
        return preparando;
    }

    async function registrar() {
        if(!suscripcion && reg?.active && clave) {
            suscripcion=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:clave});
        }
        if(!suscripcion) throw Error("Todavía se está preparando la app. Inténtalo de nuevo.");
        const token=await usuario.getIdToken();
        const r=await fetch(servidor,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
            body:JSON.stringify({suscripcion:suscripcion.toJSON()})});
        const datos=await r.json().catch(()=>({}));
        if(!r.ok) throw Error(datos.error || "No se pudieron activar los avisos.");
        recordar(alta,usuario.uid);
    }

    function mostrar(mensaje) {
        if(dialogo?.open || document.hidden) return;
        dialogo ||= document.createElement("dialog");
        dialogo.className="avisos-permiso";
        dialogo.innerHTML=`<h2 id="avisosPermisoTitulo">Avisos de la Liga Río Grande</h2>
            <p data-aviso-texto></p><div><button type="button" data-aviso-omitir>Ahora no</button>
            <button type="button" data-aviso-aceptar>Aceptar</button></div>`;
        dialogo.setAttribute("aria-labelledby","avisosPermisoTitulo");
        if(!dialogo.isConnected) document.body.append(dialogo);
        const texto=dialogo.querySelector("[data-aviso-texto]");
        const aceptar=dialogo.querySelector("[data-aviso-aceptar]");
        const omitir=dialogo.querySelector("[data-aviso-omitir]");
        const bloqueado=Notification.permission==="denied";
        aceptar.hidden=bloqueado;
        texto.textContent=mensaje || (bloqueado
            ? "Las notificaciones están bloqueadas. Si cambias de opinión, actívalas en los ajustes de esta app."
            : "¿Quieres recibir recordatorios de partidos y jornadas?");
        omitir.onclick=()=>dialogo.close();
        aceptar.onclick=async()=>{
            if(ocupada) return;
            ocupada=true;
            aceptar.disabled=true;
            try {
                const permiso=Notification.permission==="default" ? await Notification.requestPermission() : Notification.permission;
                if(permiso!=="granted") { dialogo.close(); return; }
                if(!suscripcion && (!reg?.active || !clave)) {
                    await preparar();
                    texto.textContent="Permiso concedido. Toca Aceptar para terminar.";
                    return;
                }
                await registrar();
                dialogo.close();
            } catch(e) {
                texto.textContent=e.name==="AbortError"
                    ? "El celular no pudo registrarse. Prueba con datos móviles o toca Ahora no."
                    : e.message || "No se pudieron activar los avisos.";
            } finally {
                oculto=0;
                ocupada=false;
                aceptar.disabled=false;
            }
        };
        dialogo.showModal();
    }

    async function alAbrir() {
        if(intentado || ocupada || dialogo?.open || document.hidden) return;
        intentado=true;
        if(Notification.permission==="granted") {
            if(recordar(alta)===usuario.uid) return;
            try { await preparar(); await registrar(); }
            catch { mostrar("El permiso ya está concedido. Toca Aceptar para completar el registro en este celular."); }
            return;
        }
        if(Notification.permission!=="denied") void preparar().catch(()=>{});
        mostrar();
    }

    if(!recordar(visto)) {
        recordar(visto,"1");
        void alAbrir();
    }
    document.addEventListener("visibilitychange",()=>{
        if(document.hidden) { oculto=Date.now(); return; }
        if(oculto && Date.now()-oculto>=2500) {
            oculto=0;
            intentado=false;
            void alAbrir();
        }
    });
    window.addEventListener("online",()=>{
        if(Notification.permission==="granted") { intentado=false; void alAbrir(); }
    });
}
