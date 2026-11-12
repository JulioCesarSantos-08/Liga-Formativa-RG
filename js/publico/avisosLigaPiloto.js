const panel=document.getElementById("avisosLiga");
const instalada=matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
const servidor="https://us-central1-liga-deportiva-rio-grande.cloudfunctions.net/avisosLigaPiloto";
const llaveEstado="liga-avisos-piloto-activo-v1";

if(panel && instalada && isSecureContext && "Notification" in window &&
    "PushManager" in window && "serviceWorker" in navigator) {
    const zona=document.createElement("form");
    zona.className="avisos-piloto";
    zona.innerHTML=`
        <p class="avisos-piloto-estado" role="status"></p>
        <label for="avisosCodigo">Código de prueba privada</label>
        <input id="avisosCodigo" type="password" required autocomplete="off" maxlength="128">
        <div class="avisos-piloto-acciones">
            <button class="avisos-piloto-primario" type="submit">Activar notificaciones</button>
            <button type="button" id="avisosDesactivar" hidden>Desactivar</button>
        </div>
        <details class="avisos-piloto-pruebas">
            <summary>Pruebas del piloto</summary>
            <div class="avisos-piloto-acciones">
                <button type="button" id="avisosFondo">Probar con la app cerrada</button>
            </div>
        </details>
        <p class="avisos-piloto-mensaje" role="status"></p>
    `;
    panel.append(zona);
    const local=document.getElementById("avisosLigaProbar");
    if(local) zona.querySelector(".avisos-piloto-pruebas .avisos-piloto-acciones").prepend(local);
    const intro=document.getElementById("avisosLigaEstado");
    if(intro) intro.textContent="Recibe avisos de la Liga en este celular.";
    const estado=zona.querySelector(".avisos-piloto-estado"), salida=zona.querySelector(".avisos-piloto-mensaje");
    const entrada=zona.querySelector("input"), activar=zona.querySelector('[type="submit"]');
    const baja=zona.querySelector("#avisosDesactivar"), fondo=zona.querySelector("#avisosFondo");
    const controles=[activar,baja,fondo];
    let reg, suscripcion, clave, ocupado=false;
    let confirmada=false;
    try { confirmada=localStorage.getItem(llaveEstado)==="si"; } catch {}

    function guardar(activa) {
        confirmada=activa;
        try { if(activa) localStorage.setItem(llaveEstado,"si"); else localStorage.removeItem(llaveEstado); } catch {}
    }
    function actualizar() {
        const activa=Boolean(suscripcion && confirmada && Notification.permission==="granted");
        estado.textContent=activa ? "Notificaciones activadas" : suscripcion
            ? "Suscripción encontrada · verifica la activación" : "Notificaciones desactivadas";
        estado.dataset.activa=String(activa);
        activar.hidden=activa;
        activar.textContent=suscripcion ? "Verificar activación" : "Activar notificaciones";
        baja.hidden=!suscripcion;
        fondo.disabled=ocupado || !suscripcion;
        activar.disabled=ocupado;
        baja.disabled=ocupado;
    }
    async function cargarClave() {
        const r=await fetch(servidor);
        if(!r.ok) throw Error("El servidor de avisos no está disponible.");
        const {clavePublica}=await r.json();
        if(typeof clavePublica!=="string" || !/^[A-Za-z0-9_-]{87}$/.test(clavePublica)) {
            throw Error("No se pudo verificar la clave pública del servidor.");
        }
        const b64=clavePublica.replace(/-/g,"+").replace(/_/g,"/");
        clave=Uint8Array.from(atob(b64+"="),c=>c.charCodeAt(0));
    }
    async function enviar(accion) {
        const r=await fetch(servidor,{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({accion,codigo:entrada.value,suscripcion:suscripcion.toJSON()})});
        const d=await r.json().catch(()=>({}));
        if(!r.ok) {
            if(r.status===409) guardar(false);
            throw Error(d.error || "No se pudo conectar con el servidor de avisos.");
        }
    }
    async function operar(accion) {
        if(ocupado || !zona.reportValidity()) return;
        ocupado=true;
        controles.forEach(b=>b.disabled=true);
        salida.textContent="";
        try {
            if(accion==="alta") {
                if(Notification.permission==="default") {
                    if(await Notification.requestPermission()!=="granted") throw Error("Permite las notificaciones para continuar.");
                    if(!suscripcion) {
                        salida.textContent="Permiso concedido. Toca Activar notificaciones otra vez.";
                        return;
                    }
                }
                if(Notification.permission!=="granted") throw Error("Permite los avisos en los ajustes de esta app.");
                if(!reg?.active || !clave && !suscripcion) {
                    await preparar();
                    salida.textContent="Toca Activar notificaciones otra vez para continuar.";
                    return;
                }
                if(!suscripcion) {
                    try {
                        suscripcion=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:clave});
                    } catch(e) {
                        if(e.name==="AbortError" || /push service error/i.test(e.message)) {
                            throw Error("El celular no pudo registrarse. Prueba con datos móviles y vuelve a intentarlo.");
                        }
                        throw e;
                    }
                }
                await enviar("alta");
                guardar(true);
                salida.textContent="Listo. Revisa el aviso que acaba de enviar el servidor.";
            } else if(accion==="baja") {
                if(suscripcion) {
                    await enviar("baja");
                    guardar(false);
                    await suscripcion.unsubscribe();
                    suscripcion=null;
                }
                salida.textContent="Notificaciones desactivadas en este dispositivo.";
            } else {
                if(!suscripcion) throw Error("Primero activa las notificaciones.");
                await enviar("pruebaFondo");
                guardar(true);
                salida.textContent="Prueba programada. Sal de la app con Inicio.";
            }
            entrada.value="";
        } catch(e) {
            salida.textContent=e instanceof TypeError ? "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo."
                : e.message || "No se pudo completar la operación.";
        } finally {
            ocupado=false;
            actualizar();
        }
    }
    async function preparar() {
        reg=await navigator.serviceWorker.getRegistration();
        if(!reg?.active) throw Error("Cierra y vuelve a abrir la app para preparar los avisos.");
        suscripcion=await reg.pushManager.getSubscription();
        if(!suscripcion) {
            guardar(false);
            await cargarClave();
        }
    }
    zona.addEventListener("submit",e=>{e.preventDefault();void operar("alta");});
    baja.addEventListener("click",()=>void operar("baja"));
    fondo.addEventListener("click",()=>void operar("pruebaFondo"));
    actualizar();
    void preparar().catch(()=>{}).finally(actualizar);
}
