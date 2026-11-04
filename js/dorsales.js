export function normalizarDorsal(valor) {
    if (valor === null || valor === undefined) return null;

    if (typeof valor !== "string" && typeof valor !== "number") {
        throw new Error("El dorsal debe contener de 1 a 3 dígitos.");
    }

    const texto = String(valor).trim();

    if (!texto) return null;

    if (!/^[0-9]{1,3}$/.test(texto)) {
        throw new Error("El dorsal debe contener de 1 a 3 dígitos. Ejemplos: 7, 07 o 007.");
    }

    return texto;
}

export function buscarDorsalDuplicado(jugadores, jugador, valor) {
    const dorsal = normalizarDorsal(valor);

    if (dorsal === null) return null;

    if (!jugador.equipoId) {
        throw new Error("No se pudo identificar el equipo para comprobar el dorsal.");
    }

    return jugadores.find(otro => {
        if (jugador.id && otro.id === jugador.id) return false;
        if (otro.equipoId !== jugador.equipoId) return false;

        if (
            otro.categoriaId &&
            jugador.categoriaId &&
            otro.categoriaId !== jugador.categoriaId
        ) {
            return false;
        }

        const registrado =
            otro.numero ??
            otro.dorsal ??
            otro.numeroJugador;

        return registrado !== null &&
            registrado !== undefined &&
            String(registrado).trim() === dorsal;
    }) || null;
}
