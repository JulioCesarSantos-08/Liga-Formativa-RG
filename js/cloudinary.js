const CLOUDINARY_CLOUD_NAME = "apzsxnnh";
const CLOUDINARY_UPLOAD_PRESET = "liga_rio_grande";


async function subirArchivoCloudinary(
    archivo,
    carpeta,
    resourceType = "image"
) {
    if (!archivo) {
        throw new Error(
            "No se recibi\u00f3 ning\u00fan archivo."
        );
    }

    const documento = resourceType === "raw"
        ? "documento PDF"
        : "archivo de imagen";

    const contexto = String(carpeta || "").includes("curp")
        ? "documento PDF de CURP"
        : String(carpeta || "").includes("fotos")
            ? "archivo de fotograf\u00eda"
            : documento;

    const formData = new FormData();

    formData.append("file", archivo);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", `liga-rio-grande/${carpeta}`);

    let respuesta;

    try {
        respuesta = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
            {
                method: "POST",
                body: formData
            }
        );
    } catch (causa) {
        const error = new Error(
            "No se pudo completar el env\u00edo del " +
            contexto +
            " a Cloudinary. No se recibi\u00f3 una respuesta del servicio. " +
            "Puede haber una interrupci\u00f3n de conexi\u00f3n, un bloqueo de red o un problema temporal del servicio. " +
            "Conserva el formulario abierto y vuelve a intentarlo. Si persiste, prueba otra red o navegador y comparte este mensaje con administraci\u00f3n."
        );

        error.code = "cloudinary/network-error";
        error.cause = causa;
        throw error;
    }

    let resultado;

    try {
        resultado = await respuesta.json();
    } catch (causa) {
        const error = new Error(
            "Cloudinary devolvi\u00f3 una respuesta no v\u00e1lida al subir el " +
            contexto +
            " (HTTP " + respuesta.status +
            "). No se pudo confirmar el archivo. " +
            "Vuelve a intentarlo; si persiste, comparte este mensaje con administraci\u00f3n."
        );

        error.code = "cloudinary/invalid-response";
        error.status = respuesta.status;
        error.cause = causa;
        throw error;
    }

    if (!respuesta.ok) {
        const orientacion = respuesta.status === 413
            ? "El servicio rechaz\u00f3 el tama\u00f1o del archivo. Selecciona una versi\u00f3n m\u00e1s peque\u00f1a."
            : respuesta.status === 429
                ? "El servicio est\u00e1 limitando las solicitudes. Espera unos minutos antes de reintentar."
                : respuesta.status === 401 || respuesta.status === 403
                    ? "Administraci\u00f3n debe revisar la configuraci\u00f3n de carga en Cloudinary."
                    : respuesta.status >= 500
                        ? "El servicio de archivos presenta un error temporal. Intenta nuevamente m\u00e1s tarde."
                        : "Revisa el formato del archivo. Si persiste, comparte este mensaje con administraci\u00f3n.";

        const detalle = String(
            resultado?.error?.message || ""
        ).trim();

        const error = new Error(
            "Cloudinary rechaz\u00f3 el " +
            contexto +
            " (HTTP " + respuesta.status + "). " +
            orientacion +
            (detalle ? " Detalle del servicio: " + detalle : "")
        );

        error.code = "cloudinary/upload-rejected";
        error.status = respuesta.status;
        throw error;
    }

    if (
        typeof resultado?.secure_url !== "string" ||
        !resultado.secure_url.startsWith("https://") ||
        !resultado.public_id
    ) {
        const error = new Error(
            "Cloudinary respondi\u00f3, pero no entreg\u00f3 los datos completos del " +
            contexto +
            ". No se pudo confirmar la carga. Intenta nuevamente y reporta el problema si se repite."
        );

        error.code = "cloudinary/incomplete-response";
        throw error;
    }

    return {
        url: resultado.secure_url,
        publicId: resultado.public_id,
        formato: resultado.format || null,
        ancho: resultado.width || null,
        alto: resultado.height || null,
        bytes: resultado.bytes || archivo.size,
        resourceType: resultado.resource_type || resourceType
    };
}

export async function subirImagenCloudinary(
    archivo,
    carpeta = "general"
) {

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !archivo ||
        !tiposPermitidos.includes(
            archivo.type
        )
    ) {

        throw new Error(
            "El archivo debe ser una imagen JPG, PNG o WEBP."
        );

    }


    const maximo =
        5 * 1024 * 1024;


    if (
        archivo.size > maximo
    ) {

        throw new Error(
            "La imagen supera el tamaño máximo permitido de 5 MB."
        );

    }


    return await subirArchivoCloudinary(
        archivo,
        carpeta,
        "image"
    );

}


export async function subirLogoEquipo(
    archivo
) {

    return await subirImagenCloudinary(
        archivo,
        "equipos"
    );

}


export async function subirFotoJugador(
    archivo
) {

    return await subirImagenCloudinary(
        archivo,
        "jugadores/fotos"
    );

}


export async function subirPDFCurp(
    archivo
) {

    if (
        !archivo ||
        archivo.type !== "application/pdf"
    ) {

        throw new Error(
            "El documento de CURP debe ser un archivo PDF."
        );

    }


    const maximo =
        10 * 1024 * 1024;


    if (
        archivo.size > maximo
    ) {

        throw new Error(
            "El PDF supera el tamaño máximo permitido de 10 MB."
        );

    }


    return await subirArchivoCloudinary(
        archivo,
        "jugadores/curp",
        "raw"
    );

}

function carpetaResponsable(tipo) {
    if (!["arbitros", "entrenadores", "auxiliares"].includes(tipo)) {
        throw new Error("El tipo de responsable no es valido.");
    }

    return tipo;
}

export async function subirFotoResponsable(
    archivo,
    tipo = "arbitros"
) {
    const carpeta = carpetaResponsable(tipo);

    return subirImagenCloudinary(
        archivo,
        carpeta + "/fotos"
    );
}

export async function subirCurpResponsable(
    archivo,
    tipo = "arbitros"
) {
    const carpeta = carpetaResponsable(tipo);

    if (!archivo || archivo.type !== "application/pdf") {
        throw new Error("El documento de CURP debe ser un archivo PDF.");
    }

    if (archivo.size > 10 * 1024 * 1024) {
        throw new Error("El PDF supera el tamano maximo permitido de 10 MB.");
    }

    return subirArchivoCloudinary(
        archivo,
        carpeta + "/curp",
        "raw"
    );
}
