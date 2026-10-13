
const camposOpcionales = [
    "fechaNacimiento",
    "observaciones",
    "fotoUrl",
    "fotoPublicId",
    "curpArchivoUrl",
    "curpArchivoPublicId",
    "posicion",
    "telefono",
    "curpUrl"
];

const tiene = (objeto, clave) =>
    Object.prototype.hasOwnProperty.call(objeto, clave);

export function prepararDatosEdicionJugador(datosNuevos) {
    if (
        !datosNuevos ||
        typeof datosNuevos !== "object" ||
        Array.isArray(datosNuevos)
    ) {
        throw new Error("La solicitud no tiene datos válidos.");
    }

    const datosPermitidos = {};

    for (const campo of camposOpcionales) {
        if (tiene(datosNuevos, campo)) {
            datosPermitidos[campo] = datosNuevos[campo];
        }
    }

    if (
        tiene(datosNuevos, "nombre") ||
        tiene(datosNuevos, "nombreCompleto")
    ) {
        const nombre = String(
            datosNuevos.nombreCompleto ||
            datosNuevos.nombre ||
            ""
        )
            .trim()
            .replace(/\s+/g, " ")
            .toLocaleUpperCase("es-MX");

        if (
            !nombre ||
            nombre.length > 150 ||
            !/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u.test(nombre)
        ) {
            throw new Error(
                "El nombre solicitado no es válido."
            );
        }

        datosPermitidos.nombre = nombre;
        datosPermitidos.nombreCompleto = nombre;
    }

    if (tiene(datosNuevos, "sexo")) {
        const sexo = String(datosNuevos.sexo || "")
            .trim()
            .toLocaleLowerCase("es-MX");

        if (
            sexo === "hombre" ||
            sexo === "masculino"
        ) {
            datosPermitidos.sexo = "hombre";
        } else if (
            sexo === "mujer" ||
            sexo === "femenino"
        ) {
            datosPermitidos.sexo = "mujer";
        } else {
            throw new Error(
                "El sexo del jugador debe ser hombre o mujer."
            );
        }
    }

    if (tiene(datosNuevos, "curp")) {
        const curp = String(datosNuevos.curp || "")
            .trim()
            .toUpperCase();

        if (!/^[A-Z0-9]{18}$/.test(curp)) {
            throw new Error(
                "La CURP debe contener exactamente 18 caracteres válidos."
            );
        }

        datosPermitidos.curp = curp;
    }

    if (
        tiene(datosNuevos, "numero") ||
        tiene(datosNuevos, "dorsal")
    ) {
        const valor =
            datosNuevos.numero ?? datosNuevos.dorsal;

        const numero =
            valor === "" || valor == null
                ? null
                : Number(valor);

        if (
            numero !== null &&
            (
                !Number.isInteger(numero) ||
                numero < 0 ||
                numero > 250
            )
        ) {
            throw new Error(
                "El dorsal debe ser un número entero entre 0 y 250."
            );
        }

        datosPermitidos.numero = numero;
        datosPermitidos.dorsal = numero;
    }

    if (!Object.keys(datosPermitidos).length) {
        throw new Error(
            "La solicitud no incluye campos editables."
        );
    }

    return datosPermitidos;
}
