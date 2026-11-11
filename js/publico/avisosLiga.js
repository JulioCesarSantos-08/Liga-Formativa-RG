const panel = document.getElementById("avisosLiga");
const boton = document.getElementById("avisosLigaProbar");
const estado = document.getElementById("avisosLigaEstado");
const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

if (panel && boton && estado && instalada && isSecureContext &&
    "Notification" in window && "PushManager" in window && "serviceWorker" in navigator) {
    panel.hidden = false;
    boton.addEventListener("click", async () => {
        boton.disabled = true;
        let espera;
        try {
            const permiso = Notification.permission === "default"
                ? await Notification.requestPermission() : Notification.permission;
            if (permiso !== "granted") {
                estado.textContent = permiso === "denied"
                    ? "El permiso está bloqueado. Revisa los ajustes de notificaciones de esta app."
                    : "Puedes volver a probar cuando quieras.";
                return;
            }
            const registro = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, rechazar) => {
                    espera = setTimeout(() => rechazar(Error("La app todavía se está preparando.")), 8000);
                })
            ]);
            await registro.showNotification("Liga Río Grande", {
                body: "Notificación de prueba. Tócala para abrir las jornadas.",
                icon: "./imagenes/icon-192.png",
                tag: "liga-prueba",
                data: { url: "./jornadas.html" }
            });
            estado.textContent = "Aviso de prueba enviado a este dispositivo.";
        } catch {
            estado.textContent = "No se pudo mostrar el aviso. Cierra y vuelve a abrir la app, y revisa sus permisos.";
        } finally {
            clearTimeout(espera);
            boton.disabled = false;
        }
    });
}
