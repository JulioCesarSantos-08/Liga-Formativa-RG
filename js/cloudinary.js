const CLOUDINARY_CLOUD_NAME = "apzsxnnh";
const CLOUDINARY_UPLOAD_PRESET = "liga_rio_grande";


async function subirArchivoCloudinary(
    archivo,
    carpeta,
    resourceType = "image"
) {

    if (!archivo) {

        throw new Error(
            "No se recibió ningún archivo."
        );

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        archivo
    );


    formData.append(
        "upload_preset",
        CLOUDINARY_UPLOAD_PRESET
    );


    formData.append(
        "folder",
        `liga-rio-grande/${carpeta}`
    );


    const respuesta =
        await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
            {
                method: "POST",
                body: formData
            }
        );


    const resultado =
        await respuesta.json();


    if (!respuesta.ok) {

        const mensaje =
            resultado?.error?.message ||
            "No se pudo subir el archivo a Cloudinary.";


        throw new Error(
            mensaje
        );

    }


    return {
        url:
            resultado.secure_url,

        publicId:
            resultado.public_id,

        formato:
            resultado.format || null,

        ancho:
            resultado.width || null,

        alto:
            resultado.height || null,

        bytes:
            resultado.bytes || archivo.size,

        resourceType:
            resultado.resource_type || resourceType
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