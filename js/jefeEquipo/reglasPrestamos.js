import {
    normalizarSexoJugador
} from "./jugadorRegistroUtilidades.js";

const CATEGORIAS = [
    { nombre: "SUPER BEBE", nivel: 1 },
    { nombre: "DIENTES DE LECHE", nivel: 2 },
    { nombre: "PONY", nivel: 3 },
    { nombre: "INFANTIL", nivel: 4 },
    { nombre: "FEMENIL PRIMARIA", nivel: 4 },
    { nombre: "JUVENIL MENOR", nivel: 5 },
    { nombre: "FEMENIL SECUNDARIA", nivel: 5 },
    { nombre: "JUVENIL MAYOR", nivel: 6 }
];

const DESTINOS_FEMENILES = new Map([
    [
        "FEMENIL PRIMARIA",
        new Set([
            "PONY",
            "INFANTIL",
            "JUVENIL MENOR"
        ])
    ],
    [
        "FEMENIL SECUNDARIA",
        new Set([
            "INFANTIL",
            "JUVENIL MENOR",
            "JUVENIL MAYOR"
        ])
    ]
]);

export function normalizarCategoriaPrestamo(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

export function obtenerJerarquiaCategoriaPrestamo(nombre) {
    const normalizado =
        normalizarCategoriaPrestamo(nombre);

    const categoria = CATEGORIAS.find(
        item => item.nombre === normalizado
    );

    if (!categoria) {
        return null;
    }

    return {
        nombre: categoria.nombre,
        nivel: categoria.nivel,
        modalidad: categoria.nombre.startsWith("FEMENIL")
            ? "femenil"
            : "general"
    };
}

function destinoFemenilAutorizado(
    nombreOrigen,
    nombreDestino
) {
    return DESTINOS_FEMENILES.get(
        normalizarCategoriaPrestamo(nombreOrigen)
    )?.has(
        normalizarCategoriaPrestamo(nombreDestino)
    ) === true;
}

export function puedenRelacionarseCategoriasPrestamo(
    nombreOrigen,
    nombreDestino
) {
    const origen =
        obtenerJerarquiaCategoriaPrestamo(nombreOrigen);

    const destino =
        obtenerJerarquiaCategoriaPrestamo(nombreDestino);

    if (!origen || !destino) {
        return false;
    }

    return destino.nivel - origen.nivel === 1 ||
        destinoFemenilAutorizado(
            origen.nombre,
            destino.nombre
        );
}

export function esExcepcionFemenilPrestamo(
    jugador,
    nombreOrigen,
    nombreDestino
) {
    return normalizarSexoJugador(
        jugador?.sexo
    ) === "mujer" &&
        destinoFemenilAutorizado(
            nombreOrigen,
            nombreDestino
        );
}

export function validarJerarquiaCategoriasPrestamo(
    nombreOrigen,
    nombreDestino,
    jugador = null
) {
    const origen =
        obtenerJerarquiaCategoriaPrestamo(nombreOrigen);

    const destino =
        obtenerJerarquiaCategoriaPrestamo(nombreDestino);

    if (!origen || !destino) {
        return {
            valido: false,
            mensaje: "No se pudieron identificar las categorías."
        };
    }

    if (jugador !== null) {
        const sexo = normalizarSexoJugador(
            jugador?.sexo
        );

        if (!sexo) {
            return {
                valido: false,
                mensaje: "El jugador debe tener registrado el sexo Hombre o Mujer."
            };
        }

        if (
            sexo !== "mujer" &&
            (
                origen.modalidad === "femenil" ||
                destino.modalidad === "femenil"
            )
        ) {
            return {
                valido: false,
                mensaje: "Las categorías femeniles requieren una jugadora con sexo Mujer."
            };
        }
    }

    const excepcion = esExcepcionFemenilPrestamo(
        jugador,
        origen.nombre,
        destino.nombre
    );

    if (
        !excepcion &&
        destino.nivel - origen.nivel !== 1
    ) {
        return {
            valido: false,
            mensaje: destinoFemenilAutorizado(
                origen.nombre,
                destino.nombre
            )
                ? "Este movimiento requiere comprobar que la jugadora tiene registrado el sexo Mujer."
                : "El refuerzo debe proceder del nivel inmediatamente inferior."
        };
    }

    return {
        valido: true,
        mensaje: excepcion
            ? "Destino permitido para una jugadora de la categoría femenil de origen."
            : "Las categorías tienen niveles consecutivos.",
        nivelOrigen: origen.nivel,
        nivelDestino: destino.nivel,
        excepcionFemenil: excepcion
    };
}