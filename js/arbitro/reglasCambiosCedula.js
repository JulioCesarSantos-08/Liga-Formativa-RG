import { validarCupoNinasMayores } from "../reglasParticipacion.js";

export function revisarSecuenciaCambios({
    cambios,
    alineaciones,
    listas,
    categoria
}) {
    if (
        !alineaciones ||
        !Array.isArray(alineaciones.titularesLocal) ||
        !Array.isArray(alineaciones.titularesVisitante)
    ) {
        return {
            ok: false,
            mensaje:
                "Marca los titulares de ambos equipos antes de registrar cambios."
        };
    }

    const enCancha = {};
    const porId = {};

    for (const lado of ["local", "visitante"]) {
        const clave = lado === "local"
            ? "titularesLocal"
            : "titularesVisitante";

        porId[lado] = new Map(
            listas[lado].map(
                jugador => [jugador.id, jugador]
            )
        );

        enCancha[lado] = new Set(
            alineaciones[clave]
        );

        if (
            enCancha[lado].size !==
            alineaciones[clave].length
        ) {
            return {
                ok: false,
                mensaje:
                    "Hay titulares duplicados en el equipo " +
                    lado +
                    "."
            };
        }

        if (
            [...enCancha[lado]].some(
                id => !porId[lado].has(id)
            )
        ) {
            return {
                ok: false,
                mensaje:
                    "La alineación del equipo " +
                    lado +
                    " contiene un jugador fuera del pase de lista."
            };
        }

        const inicial = validarCupoNinasMayores(
            [...enCancha[lado]].map(
                id => porId[lado].get(id)
            ),
            categoria
        );

        if (!inicial.valido) {
            return {
                ok: false,
                mensaje:
                    "Alineación inicial del equipo " +
                    lado +
                    ": " +
                    inicial.mensaje
            };
        }
    }

    for (
        let indice = 0;
        indice < cambios.length;
        indice++
    ) {
        const cambio = cambios[indice];
        const lado = cambio.equipo;
        const prefijo = "Cambio " + (indice + 1) + ": ";

        if (
            !["local", "visitante"].includes(lado)
        ) {
            return {
                ok: false,
                mensaje:
                    prefijo +
                    "Selecciona un equipo válido."
            };
        }

        if (
            !porId[lado].has(cambio.saleJugadorId) ||
            !porId[lado].has(cambio.entraJugadorId)
        ) {
            return {
                ok: false,
                mensaje:
                    prefijo +
                    "Los jugadores deben pertenecer al pase de lista del equipo indicado."
            };
        }

        if (
            cambio.saleJugadorId ===
            cambio.entraJugadorId
        ) {
            return {
                ok: false,
                mensaje:
                    prefijo +
                    "El jugador que sale y el que entra deben ser diferentes."
            };
        }

        if (
            !enCancha[lado].has(
                cambio.saleJugadorId
            )
        ) {
            return {
                ok: false,
                mensaje:
                    prefijo +
                    "El jugador que sale no está en cancha en ese momento."
            };
        }

        if (
            enCancha[lado].has(
                cambio.entraJugadorId
            )
        ) {
            return {
                ok: false,
                mensaje:
                    prefijo +
                    "El jugador que entra ya está en cancha."
            };
        }

        enCancha[lado].delete(
            cambio.saleJugadorId
        );

        enCancha[lado].add(
            cambio.entraJugadorId
        );

        const resultado = validarCupoNinasMayores(
            [...enCancha[lado]].map(
                id => porId[lado].get(id)
            ),
            categoria
        );

        if (!resultado.valido) {
            return {
                ok: false,
                mensaje:
                    prefijo + resultado.mensaje
            };
        }
    }

    const cupos = {};

    for (const lado of ["local", "visitante"]) {
        cupos[lado] = validarCupoNinasMayores(
            [...enCancha[lado]].map(
                id => porId[lado].get(id)
            ),
            categoria
        );
    }

    return {
        ok: true,
        mensaje: "",
        enCancha: {
            local: [...enCancha.local],
            visitante: [...enCancha.visitante]
        },
        cupos
    };
}