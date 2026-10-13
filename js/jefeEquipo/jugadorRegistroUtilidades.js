
export const OPCIONES_SEXO_JUGADOR = [
    {
        valor: "hombre",
        texto: "Hombre"
    },
    {
        valor: "mujer",
        texto: "Mujer"
    }
];

export function convertirNombreMayusculas(valor) {
    return String(valor ?? "")
        .toLocaleUpperCase("es-MX");
}

export function normalizarNombreJugador(valor) {
    return convertirNombreMayusculas(valor)
        .trim()
        .replace(/\s+/g, " ");
}

export function validarNombreJugador(valor) {
    const nombre = normalizarNombreJugador(valor);

    if (!nombre) {
        return {
            valido: false,
            nombre,
            mensaje: "Escribe el nombre completo del jugador."
        };
    }

    if (nombre.length > 150) {
        return {
            valido: false,
            nombre,
            mensaje: "El nombre no puede superar los 150 caracteres."
        };
    }

    if (!/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u.test(nombre)) {
        return {
            valido: false,
            nombre,
            mensaje: "El nombre debe contener únicamente letras, espacios, apóstrofes o guiones."
        };
    }

    return {
        valido: true,
        nombre,
        mensaje: ""
    };
}

export function normalizarSexoJugador(valor) {
    const texto = String(valor ?? "")
        .trim()
        .toLocaleLowerCase("es-MX");

    if (
        texto === "hombre" ||
        texto === "masculino"
    ) {
        return "hombre";
    }

    if (
        texto === "mujer" ||
        texto === "femenino"
    ) {
        return "mujer";
    }

    return "";
}

export function validarSexoJugador(valor) {
    const sexo = normalizarSexoJugador(valor);

    if (!sexo) {
        return {
            valido: false,
            sexo: "",
            mensaje: "Selecciona si el jugador es hombre o mujer."
        };
    }

    return {
        valido: true,
        sexo,
        mensaje: ""
    };
}

export function validarDatosBasicosJugador(datos = {}) {
    const resultadoNombre = validarNombreJugador(
        datos.nombreCompleto ?? datos.nombre
    );

    if (!resultadoNombre.valido) {
        return {
            valido: false,
            mensaje: resultadoNombre.mensaje
        };
    }

    const resultadoSexo = validarSexoJugador(
        datos.sexo
    );

    if (!resultadoSexo.valido) {
        return {
            valido: false,
            mensaje: resultadoSexo.mensaje
        };
    }

    return {
        valido: true,
        nombre: resultadoNombre.nombre,
        nombreCompleto: resultadoNombre.nombre,
        sexo: resultadoSexo.sexo,
        mensaje: ""
    };
}

export function tieneFotografiaReal(datos = {}) {
    if (datos.fotoSeleccionada instanceof File) {
        return true;
    }

    const url = String(datos.fotoUrl ?? "").trim();

    if (!url) {
        return false;
    }

    const ruta = url
        .split("?")[0]
        .toLocaleLowerCase("es-MX");

    if (
        ruta.endsWith("/imagenes/logo.png") ||
        ruta === "imagenes/logo.png" ||
        ruta.endsWith("/imagenes/credencial.png")
    ) {
        return false;
    }

    return true;
}

export function tieneDocumentoCurp(datos = {}) {
    if (datos.curpArchivoSeleccionado instanceof File) {
        return true;
    }

    return Boolean(
        String(datos.curpArchivoUrl ?? "").trim()
    );
}

export function obtenerDocumentacionPendiente(datos = {}) {
    const pendientes = [];

    if (!tieneFotografiaReal(datos)) {
        pendientes.push({
            id: "fotografia",
            nombre: "Fotografía del jugador"
        });
    }

    if (!tieneDocumentoCurp(datos)) {
        pendientes.push({
            id: "curp",
            nombre: "Documento PDF de la CURP"
        });
    }

    return pendientes;
}

export function construirAvisoDocumentacion(datos = {}) {
    const pendientes = obtenerDocumentacionPendiente(datos);

    if (!pendientes.length) {
        return {
            mostrar: false,
            titulo: "Expediente completo",
            mensaje: "El jugador cuenta con su fotografía y documento CURP.",
            pendientes
        };
    }

    const nombres = pendientes
        .map(item => item.nombre)
        .join(" y ");

    return {
        mostrar: true,
        titulo: "Jugador registrado con información pendiente",
        mensaje:
            `El jugador fue registrado correctamente, pero todavía falta: ${nombres}. ` +
            "Antes de participar en partidos oficiales deberá completar su expediente conforme a las disposiciones de la liga.",
        pendientes
    };
}
