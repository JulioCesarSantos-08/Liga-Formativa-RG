export function obtenerMensajeErrorJugador(
    error,
    etapa = "guardado"
) {
    const codigo = String(error?.code || "").toLowerCase();
    const clave = codigo.split("/").pop();
    const detalle = String(error?.message || "").trim();

    const archivo = etapa === "foto" || etapa === "curp";

    const paso = etapa === "foto"
        ? "subir la fotografía"
        : etapa === "curp"
            ? "subir el PDF de CURP"
            : "guardar los datos o la solicitud";

    const revisar =
        "Antes de repetir el registro, revisa si el jugador ya aparece en la plantilla o si su solicitud ya fue enviada.";

    let titulo = "No se completó la operación";
    let mensaje;

    if (codigo.startsWith("cloudinary/")) {
        titulo = "Problema con el archivo";
        mensaje = detalle ||
            "No se pudo confirmar la carga del archivo. Intenta nuevamente.";
    } else if (clave === "permission-denied") {
        titulo = "Permiso denegado";
        mensaje =
            "Firebase rechazó la operación por permisos. Administración debe revisar tu acceso al equipo y las reglas de Firestore.";
    } else if (
        [
            "unauthenticated",
            "user-token-expired",
            "invalid-user-token"
        ].includes(clave)
    ) {
        titulo = "Revisa tu sesión";
        mensaje =
            "No se pudo validar tu sesión. Guarda una copia de los datos que escribiste y vuelve a iniciar sesión.";
    } else if (clave === "resource-exhausted") {
        titulo = "Servicio temporalmente limitado";
        mensaje =
            "Firebase reportó un límite de recursos o cuota. Evita pulsar Guardar repetidamente y avisa a administración para revisar el uso del proyecto. " +
            revisar;
    } else if (
        clave === "unavailable" ||
        clave === "deadline-exceeded"
    ) {
        titulo = "No se pudo confirmar el guardado";
        mensaje =
            "Firebase no estuvo disponible o tardó demasiado en responder. Comprueba la conexión y espera antes de reintentar. " +
            revisar;
    } else if (clave === "aborted") {
        titulo = "Cambios simultáneos";
        mensaje =
            "La operación se interrumpió al coincidir con otros cambios. " +
            revisar +
            " Luego recarga la plantilla antes de intentar nuevamente.";
    } else if (clave === "not-found") {
        titulo = "Registro no encontrado";
        mensaje =
            "Firebase no encontró un documento necesario. Recarga la plantilla; si persiste, pide a administración revisar el equipo y el jugador.";
    } else if (clave === "failed-precondition") {
        titulo = "Firebase requiere una revisión";
        mensaje =
            "No se cumple una condición necesaria para guardar. Comparte el mensaje con administración para revisar el detalle de la consola.";
    } else if (clave === "already-exists") {
        titulo = "El registro ya existe";
        mensaje =
            "Firebase indica que el documento que se intentó crear ya existe. " +
            revisar;
    } else if (
        /failed to fetch|networkerror|network request failed|load failed/i.test(
            detalle
        ) ||
        clave === "network-request-failed"
    ) {
        titulo = "Fallo de comunicación";
        mensaje =
            "Falló una petición al " + paso + ". " +
            "Esto puede deberse a la conexión, al navegador o al servicio. Prueba otra red o navegador si se repite. " +
            (
                archivo
                    ? "Conserva el formulario abierto y verifica que el archivo pueda abrirse en tu dispositivo."
                    : revisar
            );
    } else {
        titulo = archivo
            ? "Revisa el archivo seleccionado"
            : titulo;

        mensaje =
            "Al " + paso + ": " +
            (
                detalle ||
                "No se recibió un detalle del error."
            ) +
            (
                archivo
                    ? " Revisa el formato y el tamaño del archivo seleccionado."
                    : " " + revisar
            );
    }

    if (codigo) {
        mensaje += " Código: " + codigo + ".";
    }

    return { titulo, mensaje };
}