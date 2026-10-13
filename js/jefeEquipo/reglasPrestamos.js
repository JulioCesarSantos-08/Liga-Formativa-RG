
const CATEGORIAS = [
    {
        nombre: "SUPER BEBE",
        nivel: 1
    },
    {
        nombre: "DIENTES DE LECHE",
        nivel: 2
    },
    {
        nombre: "PONY",
        nivel: 3
    },
    {
        nombre: "INFANTIL",
        nivel: 4
    },
    {
        nombre: "FEMENIL PRIMARIA",
        nivel: 4
    },
    {
        nombre: "JUVENIL MENOR",
        nivel: 5
    },
    {
        nombre: "FEMENIL SECUNDARIA",
        nivel: 5
    },
    {
        nombre: "JUVENIL MAYOR",
        nivel: 6
    }
];

export function normalizarCategoriaPrestamo(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

export function obtenerJerarquiaCategoriaPrestamo(nombre) {
    const normalizado = normalizarCategoriaPrestamo(nombre);

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

export function validarJerarquiaCategoriasPrestamo(
    nombreOrigen,
    nombreDestino
) {
    const origen = obtenerJerarquiaCategoriaPrestamo(
        nombreOrigen
    );

    const destino = obtenerJerarquiaCategoriaPrestamo(
        nombreDestino
    );

    if (!origen || !destino) {
        return {
            valido: false,
            mensaje: "No se pudieron identificar las categorías."
        };
    }

    if (destino.nivel - origen.nivel !== 1) {
        return {
            valido: false,
            mensaje: "El refuerzo debe proceder del nivel inmediatamente inferior."
        };
    }

    return {
        valido: true,
        mensaje: "Las categorías tienen niveles consecutivos.",
        nivelOrigen: origen.nivel,
        nivelDestino: destino.nivel
    };
}
