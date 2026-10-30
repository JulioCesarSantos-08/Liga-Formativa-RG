import {
    normalizarSexoJugador
} from "./jefeEquipo/jugadorRegistroUtilidades.js";

import {
    esExcepcionFemenilPrestamo
} from "./jefeEquipo/reglasPrestamos.js";

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function rangoCategoria(categoria) {
    const desde = String(
        categoria.anioNacimientoDesde ?? ""
    ).trim();

    const hasta = String(
        categoria.anioNacimientoHasta ?? ""
    ).trim();

    if (
        !/^\d{4}$/.test(desde) ||
        !/^\d{4}$/.test(hasta)
    ) {
        return null;
    }

    const minimo = Number(desde);
    const maximo = Number(hasta);

    if (
        minimo < 1900 ||
        maximo > 2100 ||
        minimo > maximo
    ) {
        return null;
    }

    return {
        minimo,
        maximo
    };
}

function anioNacimiento(valor) {
    if (typeof valor === "string") {
        const partes =
            /^(\d{4})-(\d{2})-(\d{2})$/.exec(
                valor.trim()
            );

        if (!partes) {
            return null;
        }

        const anio = Number(partes[1]);
        const mes = Number(partes[2]);
        const dia = Number(partes[3]);

        const fecha = new Date(
            Date.UTC(anio, mes - 1, dia)
        );

        if (
            anio < 1900 ||
            fecha.getUTCFullYear() !== anio ||
            fecha.getUTCMonth() !== mes - 1 ||
            fecha.getUTCDate() !== dia ||
            fecha.getTime() > Date.now()
        ) {
            return null;
        }

        return anio;
    }

    try {
        const fecha = valor instanceof Date
            ? valor
            : typeof valor?.toDate === "function"
                ? valor.toDate()
                : null;

        if (
            !(fecha instanceof Date) ||
            !Number.isFinite(fecha.getTime()) ||
            fecha.getTime() > Date.now()
        ) {
            return null;
        }

        const anio = fecha.getUTCFullYear();

        return anio >= 1900
            ? anio
            : null;
    } catch {
        return null;
    }
}

export function limiteNinasMayores(categoria) {
    const nombre = normalizar(
        categoria.nombre ||
        categoria.categoriaNombre
    );

    return nombre === "super bebe"
        ? 2
        : 3;
}

function categoriaOrigenRefuerzo(jugador) {
    if (
        jugador?.esRefuerzo !== true ||
        !String(jugador.prestamoId || "").trim() ||
        !jugador.equipoOrigenPrestamoId ||
        jugador.equipoOrigenPrestamoId !==
            jugador.equipoId
    ) {
        return null;
    }

    const categoria =
        jugador.categoriaOrigenPrestamo;

    return categoria &&
        typeof categoria === "object"
        ? categoria
        : null;
}

export function evaluarJugadorCategoria(
    jugador,
    categoria,
    {
        permitirMenores = false,
        categoriaOrigenPrestamo = null
    } = {}
) {
    const nombre = String(
        categoria.nombre ||
        categoria.categoriaNombre ||
        "la categoría"
    ).trim();

    const rango = rangoCategoria(
        categoria
    );

    if (!rango) {
        return {
            valido: false,
            mensaje:
                "Configura correctamente los años de nacimiento de " +
                nombre +
                " antes de continuar."
        };
    }

    const sexo = normalizarSexoJugador(
        jugador.sexo
    );

    if (!sexo) {
        return {
            valido: false,
            mensaje:
                "El jugador debe tener registrado el sexo Hombre o Mujer."
        };
    }

    const femenil =
        normalizar(categoria.modalidad) === "femenil" ||
        normalizar(nombre).startsWith("femenil");

    if (
        femenil &&
        sexo !== "mujer"
    ) {
        return {
            valido: false,
            mensaje:
                "Para participar en " +
                nombre +
                ", la jugadora debe tener registrado el sexo Mujer."
        };
    }

    const anio = anioNacimiento(
        jugador.fechaNacimiento
    );

    if (anio === null) {
        return {
            valido: false,
            mensaje:
                "El jugador debe tener una fecha de nacimiento válida antes de autorizar su participación."
        };
    }

    const origenRefuerzo =
        categoriaOrigenPrestamo ||
        categoriaOrigenRefuerzo(jugador);

    let refuerzoFemenilPermitido = false;

    if (
        origenRefuerzo &&
        esExcepcionFemenilPrestamo(
            jugador,
            origenRefuerzo.nombre ||
                origenRefuerzo.categoriaNombre,
            nombre
        )
    ) {
        const origenValido =
            evaluarJugadorCategoria(
                {
                    sexo: jugador.sexo,
                    fechaNacimiento:
                        jugador.fechaNacimiento
                },
                origenRefuerzo
            );

        if (!origenValido.valido) {
            return {
                valido: false,
                mensaje:
                    "La jugadora no cumple su categoría de origen: " +
                    origenValido.mensaje
            };
        }

        refuerzoFemenilPermitido = true;
    }

    const esNinaDelAnioAdicional =
        sexo === "mujer" &&
        anio === rango.minimo - 1;

    const esNinaMayor =
        sexo === "mujer" &&
        anio < rango.minimo;

    const edadNormal =
        anio >= rango.minimo &&
        anio <= rango.maximo;

    const menorPermitido =
        permitirMenores &&
        anio > rango.maximo;

    if (
        !edadNormal &&
        !esNinaDelAnioAdicional &&
        !menorPermitido &&
        !refuerzoFemenilPermitido
    ) {
        return {
            valido: false,
            mensaje:
                "El nacimiento de " +
                anio +
                " no corresponde a " +
                nombre +
                " (" +
                rango.minimo +
                "–" +
                rango.maximo +
                "). La excepción permite niñas nacidas en " +
                (rango.minimo - 1) +
                "."
        };
    }

    return {
        valido: true,
        mensaje: "",
        anioNacimiento: anio,
        esNinaMayor,
        refuerzoFemenilPermitido,
        limiteNinasMayores:
            limiteNinasMayores(categoria)
    };
}

export function validarCupoNinasMayores(
    jugadoresEnCancha,
    categoria
) {
    if (!Array.isArray(jugadoresEnCancha)) {
        return {
            valido: false,
            mensaje:
                "No se pudo identificar la alineación."
        };
    }

    let cantidad = 0;

    for (const jugador of jugadoresEnCancha) {
        const resultado =
            evaluarJugadorCategoria(
                jugador,
                categoria,
                {
                    permitirMenores: true
                }
            );

        if (!resultado.valido) {
            return resultado;
        }

        if (resultado.esNinaMayor) {
            cantidad++;
        }
    }

    const limite =
        limiteNinasMayores(categoria);

    return {
        valido: cantidad <= limite,
        cantidad,
        limite,
        mensaje: cantidad > limite
            ? "Solo pueden estar simultáneamente en cancha " +
                limite +
                " niñas mayores de la edad de la categoría."
            : ""
    };
}