import { evaluarJugadorCategoria } from "../reglasParticipacion.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    validarJerarquiaCategoriasPrestamo
} from "../jefeEquipo/reglasPrestamos.js";

function texto(valor) {
    return String(valor ?? "").trim();
}

function normalizar(valor) {
    return texto(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function obtenerClub(equipo) {
    const id = texto(equipo?.clubId).toLowerCase();

    if (id) {
        return id;
    }

    return normalizar(equipo?.clubNombre)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function prestamoActivo(prestamo) {
    if (prestamo.activo === false) {
        return false;
    }

    const estado = normalizar(prestamo.estado);

    return ![
        "finalizado",
        "cancelado",
        "cancelada",
        "rechazado",
        "rechazada",
        "inactivo"
    ].includes(estado);
}

function perteneceMismaTemporada(prestamo, temporadaId) {
    const temporadaPrestamo = texto(prestamo.temporadaId);

    if (!temporadaId || !temporadaPrestamo) {
        return true;
    }

    return temporadaPrestamo === temporadaId;
}

async function comprobarPrestamosExistentes(
    jugadorId,
    equipoDestinoId,
    temporadaId
) {
    const snapshot = await getDocs(
        collection(db, "prestamosJugadores")
    );

    return snapshot.docs.some(documento => {
        const prestamo = documento.data();

        return (
            texto(prestamo.jugadorId) === jugadorId &&
            texto(
                prestamo.equipoDestinoId ||
                prestamo.equipoId
            ) === equipoDestinoId &&
            perteneceMismaTemporada(
                prestamo,
                temporadaId
            ) &&
            prestamoActivo(prestamo)
        );
    });
}

async function comprobarCategoria(transaccion, equipo) {
    const categoriaId = texto(equipo.categoriaId);

    if (!categoriaId) {
        return {
            nombre: texto(equipo.categoriaNombre),
            id: ""
        };
    }

    const referencia = doc(
        db,
        "categorias",
        categoriaId
    );

    const snapshot = await transaccion.get(referencia);

    if (!snapshot.exists()) {
        throw new Error(
            `La categoría del equipo ${equipo.nombre || "seleccionado"} ya no existe.`
        );
    }

    return {
        ...snapshot.data(),
        id: snapshot.id,
        nombre: texto(snapshot.data().nombre)
    };
}

export async function aprobarPrestamoJugador({
    solicitudId,
    adminId,
    adminNombre,
    observacionesAdmin = ""
}) {
    const id = texto(solicitudId);
    const administradorId = texto(adminId);
    const administradorNombre = texto(adminNombre);

    if (!id) {
        throw new Error(
            "No se recibió el identificador de la solicitud."
        );
    }

    if (!administradorId) {
        throw new Error(
            "No se pudo identificar al administrador."
        );
    }

    const solicitudReferencia = doc(
        db,
        "solicitudesPrestamo",
        id
    );

    const solicitudPreviaSnapshot = await getDoc(
        solicitudReferencia
    );

    if (solicitudPreviaSnapshot.exists()) {
        const solicitudPrevia =
            solicitudPreviaSnapshot.data();

        const jugadorIdPrevio = texto(
            solicitudPrevia.jugadorId
        );

        const equipoDestinoIdPrevio = texto(
            solicitudPrevia.equipoDestinoId ||
            solicitudPrevia.equipoId
        );

        const temporadaIdPrevia = texto(
            solicitudPrevia.temporadaId
        );

        if (
            jugadorIdPrevio &&
            equipoDestinoIdPrevio
        ) {
            const existePrestamoPrevio =
                await comprobarPrestamosExistentes(
                    jugadorIdPrevio,
                    equipoDestinoIdPrevio,
                    temporadaIdPrevia
                );

            if (existePrestamoPrevio) {
                throw new Error(
                    "Ya existe un préstamo activo para este jugador y equipo receptor."
                );
            }
        }
    }

    return await runTransaction(
        db,
        async transaccion => {
            const solicitudSnapshot = await transaccion.get(
                solicitudReferencia
            );

            if (!solicitudSnapshot.exists()) {
                throw new Error(
                    "La solicitud de préstamo ya no existe."
                );
            }

            const solicitud = solicitudSnapshot.data();

            if (normalizar(solicitud.estado) !== "pendiente") {
                throw new Error(
                    "Esta solicitud ya fue atendida. Actualiza la página."
                );
            }

            const jugadorId = texto(solicitud.jugadorId);
            const equipoOrigenId = texto(
                solicitud.equipoOrigenId
            );

            const equipoDestinoId = texto(
                solicitud.equipoDestinoId ||
                solicitud.equipoId
            );

            const temporadaId = texto(
                solicitud.temporadaId
            );

            if (
                !jugadorId ||
                !equipoOrigenId ||
                !equipoDestinoId
            ) {
                throw new Error(
                    "La solicitud no contiene todos los identificadores necesarios."
                );
            }

            if (equipoOrigenId === equipoDestinoId) {
                throw new Error(
                    "El equipo de origen no puede ser el mismo de destino."
                );
            }

            const jugadorReferencia = doc(
                db,
                "jugadores",
                jugadorId
            );

            const origenReferencia = doc(
                db,
                "equipos",
                equipoOrigenId
            );

            const destinoReferencia = doc(
                db,
                "equipos",
                equipoDestinoId
            );

            const [jugadorSnapshot, origenSnapshot, destinoSnapshot] =
                await Promise.all([
                    transaccion.get(jugadorReferencia),
                    transaccion.get(origenReferencia),
                    transaccion.get(destinoReferencia)
                ]);

            if (!jugadorSnapshot.exists()) {
                throw new Error(
                    "El jugador ya no existe."
                );
            }

            if (
                !origenSnapshot.exists() ||
                !destinoSnapshot.exists()
            ) {
                throw new Error(
                    "Uno de los equipos ya no existe."
                );
            }

            const jugador = jugadorSnapshot.data();
            const origen = origenSnapshot.data();
            const destino = destinoSnapshot.data();

            if (
                jugador.activo === false ||
                normalizar(jugador.estado) === "suspendido"
            ) {
                throw new Error(
                    "El jugador no está habilitado para recibir un préstamo."
                );
            }

            if (texto(jugador.equipoId) !== equipoOrigenId) {
                throw new Error(
                    "El jugador ya no pertenece al equipo de origen."
                );
            }

            if (
                origen.activo === false ||
                destino.activo === false ||
                origen.descalificado === true ||
                destino.descalificado === true
            ) {
                throw new Error(
                    "El préstamo involucra un equipo inactivo o descalificado."
                );
            }

            const clubOrigen = obtenerClub(origen);
            const clubDestino = obtenerClub(destino);

            if (
                !clubOrigen ||
                !clubDestino ||
                clubOrigen !== clubDestino
            ) {
                throw new Error(
                    "El préstamo solo puede aprobarse entre equipos del mismo club."
                );
            }

            const categoriaOrigen = await comprobarCategoria(
                transaccion,
                origen
            );

            const categoriaDestino = await comprobarCategoria(
                transaccion,
                destino
            );

            const jerarquia = validarJerarquiaCategoriasPrestamo(
                categoriaOrigen.nombre,
                categoriaDestino.nombre
            );

            if (!jerarquia.valido) {
                throw new Error(jerarquia.mensaje);
            }

            const elegibilidadOrigen = evaluarJugadorCategoria(
                jugador,
                categoriaOrigen
            );

            if (!elegibilidadOrigen.valido) {
                throw new Error(elegibilidadOrigen.mensaje);
            }

            const elegibilidadDestino = evaluarJugadorCategoria(
                jugador,
                categoriaDestino,
                { permitirMenores: true }
            );

            if (!elegibilidadDestino.valido) {
                throw new Error(elegibilidadDestino.mensaje);
            }

            const modalidadDestino = normalizar(
                categoriaDestino.nombre
            );

            const sexoJugador = normalizar(jugador.sexo);

            if (
                modalidadDestino.startsWith("femenil") &&
                !["mujer", "femenino"].includes(sexoJugador)
            ) {
                throw new Error(
                    "Para reforzar un equipo femenil, la jugadora debe tener registrado el sexo Mujer."
                );
            }

            const prestamoId = [
                jugadorId,
                equipoDestinoId,
                temporadaId || "general"
            ].join("_");

            const prestamoReferencia = doc(
                db,
                "prestamosJugadores",
                prestamoId
            );

            const prestamoSnapshot = await transaccion.get(
                prestamoReferencia
            );

            if (
                prestamoSnapshot.exists() &&
                prestamoActivo(prestamoSnapshot.data())
            ) {
                throw new Error(
                    "El jugador ya tiene un préstamo activo hacia este equipo."
                );
            }

            const nombreJugador = texto(
                jugador.nombreCompleto ||
                jugador.nombre ||
                solicitud.jugadorNombre
            );

            const datosPrestamo = {
                jugadorId,
                jugadorNombre: nombreJugador,
                nombreJugador,

                equipoOrigenId,
                equipoOrigenNombre:
                    texto(origen.nombre),

                equipoDestinoId,
                equipoDestinoNombre:
                    texto(destino.nombre),

                equipoId: equipoDestinoId,
                equipoNombre:
                    texto(destino.nombre),

                categoriaOrigenId:
                    categoriaOrigen.id,
                categoriaOrigenNombre:
                    categoriaOrigen.nombre,

                categoriaDestinoId:
                    categoriaDestino.id,
                categoriaDestinoNombre:
                    categoriaDestino.nombre,

                nivelCategoriaOrigen:
                    jerarquia.nivelOrigen,
                nivelCategoriaDestino:
                    jerarquia.nivelDestino,

                clubId: clubDestino,
                clubNombre:
                    texto(destino.clubNombre || origen.clubNombre),

                temporadaId,
                temporadaNombre:
                    texto(solicitud.temporadaNombre),

                solicitudId: id,

                motivo:
                    texto(solicitud.motivo),

                estado: "activo",
                activo: true,

                aprobadoPor: administradorId,
                aprobadoPorNombre:
                    administradorNombre,

                aprobadoEn: serverTimestamp(),
                actualizadoEn: serverTimestamp()
            };

            transaccion.set(
                prestamoReferencia,
                {
                    ...datosPrestamo,
                    creadoEn: serverTimestamp()
                }
            );

            transaccion.update(
                solicitudReferencia,
                {
                    estado: "aprobada",
                    activo: true,
                    prestamoId,

                    observacionesAdmin:
                        texto(observacionesAdmin),

                    resueltoEn:
                        serverTimestamp(),

                    resueltoPor:
                        administradorId,

                    resueltoPorNombre:
                        administradorNombre,

                    actualizadoEn:
                        serverTimestamp()
                }
            );

            return {
                prestamoId,
                jugadorId,
                equipoOrigenId,
                equipoDestinoId,
                jugadorNombre: nombreJugador
            };
        }
    );
}