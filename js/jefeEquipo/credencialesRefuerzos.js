import { collection, getDocs, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db, auth } from "../firebase.js";
import { validarJerarquiaCategoriasPrestamo } from "./reglasPrestamos.js";

function texto(valor) {
    return String(valor || "").trim();
}

function activo(prestamo) {
    return prestamo.activo === true &&
        texto(prestamo.estado).toLowerCase() === "activo";
}

function equipoActivo(equipo) {
    return equipo.activo !== false &&
        equipo.descalificado !== true &&
        !["inactivo", "descalificado"].includes(
            texto(equipo.estado).toLowerCase()
        );
}

function mismaTemporada(prestamo, temporada) {
    return !prestamo.temporadaId ||
        !temporada?.id ||
        prestamo.temporadaId === temporada.id;
}

function nombreJugador(jugador) {
    return texto(jugador.nombreCompleto) ||
        [
            jugador.nombre,
            jugador.apellidoPaterno,
            jugador.apellidoMaterno
        ].map(texto).filter(Boolean).join(" ") ||
        "Jugador";
}

export async function cargarJugadoresConRefuerzos(
    equipo,
    temporada
) {
    const [snapshotJugadores, snapshotPrestamos] =
        await Promise.all([
            getDocs(collection(db, "jugadores")),
            getDocs(collection(db, "prestamosJugadores"))
        ]);

    const todos = snapshotJugadores.docs.map(
        documento => ({
            ...documento.data(),
            id: documento.id
        })
    );

    const propios = todos.filter(
        jugador => jugador.equipoId === equipo.id
    );

    const mapa = new Map(
        todos.map(jugador => [jugador.id, jugador])
    );

    const idsPropios = new Set(
        propios.map(jugador => jugador.id)
    );

    const prestamos = snapshotPrestamos.docs
        .map(documento => ({
            ...documento.data(),
            id: documento.id
        }))
        .filter(prestamo =>
            activo(prestamo) &&
            mismaTemporada(prestamo, temporada) &&
            (prestamo.equipoDestinoId || prestamo.equipoId) === equipo.id &&
            prestamo.equipoOrigenId &&
            prestamo.equipoOrigenId !== equipo.id
        );

    const refuerzos = [];
    const vistos = new Set();

    for (const prestamo of prestamos) {
        const jugador = mapa.get(prestamo.jugadorId);

        if (
            !jugador ||
            jugador.activo === false ||
            jugador.equipoId !== prestamo.equipoOrigenId ||
            idsPropios.has(jugador.id)
        ) {
            continue;
        }

        if (vistos.has(jugador.id)) {
            throw new Error(
                "Hay préstamos activos duplicados para el mismo jugador y receptor. Revisa los préstamos antes de generar credenciales."
            );
        }

        vistos.add(jugador.id);

        refuerzos.push({
            ...jugador,
            esRefuerzo: true,
            prestamoId: prestamo.id,
            equipoOrigenPrestamoId: prestamo.equipoOrigenId,
            equipoOrigenPrestamoNombre:
                prestamo.equipoOrigenNombre || "",
            credencialToken: texto(prestamo.credencialToken),
            folioCredencial:
                "REF-" + prestamo.id.toUpperCase(),
            credencialGenerada:
                prestamo.credencialGenerada === true
        });
    }

    return [...propios, ...refuerzos];
}

async function procesar(
    jugador,
    equipo,
    temporada,
    accion,
    url = ""
) {
    const uid = auth.currentUser?.uid;

    if (
        !uid ||
        !jugador.esRefuerzo ||
        !jugador.prestamoId
    ) {
        throw new Error(
            "No se pudo identificar el préstamo o la sesión."
        );
    }

    const candidato = Array.from(
        crypto.getRandomValues(new Uint8Array(24)),
        numero => numero.toString(16).padStart(2, "0")
    ).join("");

    return runTransaction(db, async tx => {
        const prestamoRef = doc(
            db,
            "prestamosJugadores",
            jugador.prestamoId
        );

        const [
            usuario,
            prestamoSnapshot,
            jugadorSnapshot,
            destinoSnapshot
        ] = await Promise.all([
            tx.get(doc(db, "usuarios", uid)),
            tx.get(prestamoRef),
            tx.get(doc(db, "jugadores", jugador.id)),
            tx.get(doc(db, "equipos", equipo.id))
        ]);

        if (
            auth.currentUser?.uid !== uid ||
            !usuario.exists() ||
            usuario.data().activo === false ||
            !["admin", "jefeEquipo"].includes(
                usuario.data().rol
            )
        ) {
            throw new Error(
                "Tu sesión no tiene permiso para generar esta credencial."
            );
        }

        if (
            !destinoSnapshot.exists() ||
            (
                usuario.data().rol !== "admin" &&
                destinoSnapshot.data().responsableId !== uid
            )
        ) {
            throw new Error(
                "No tienes permiso sobre el equipo receptor."
            );
        }

        if (
            !prestamoSnapshot.exists() ||
            !jugadorSnapshot.exists()
        ) {
            throw new Error(
                "El préstamo o el jugador dejaron de existir."
            );
        }

        const prestamo = prestamoSnapshot.data();
        const actual = jugadorSnapshot.data();
        const destino = destinoSnapshot.data();

        if (
            !activo(prestamo) ||
            !mismaTemporada(prestamo, temporada) ||
            prestamo.jugadorId !== jugador.id ||
            (prestamo.equipoDestinoId || prestamo.equipoId) !== equipo.id ||
            prestamo.equipoOrigenId !== jugador.equipoOrigenPrestamoId ||
            actual.equipoId !== prestamo.equipoOrigenId ||
            actual.activo === false
        ) {
            throw new Error(
                "El refuerzo ya no tiene un préstamo activo válido para este equipo."
            );
        }

        const origenSnapshot = await tx.get(
            doc(db, "equipos", prestamo.equipoOrigenId)
        );

        if (!origenSnapshot.exists()) {
            throw new Error(
                "No se encontró el equipo de origen."
            );
        }

        const origen = origenSnapshot.data();

        if (
            !equipoActivo(origen) ||
            !equipoActivo(destino)
        ) {
            throw new Error(
                "El equipo de origen o el receptor ya no está activo."
            );
        }

        if (
            !origen.clubId ||
            origen.clubId !== destino.clubId
        ) {
            throw new Error(
                "El préstamo debe permanecer dentro del mismo club."
            );
        }

        if (
            (
                prestamo.categoriaOrigenId &&
                prestamo.categoriaOrigenId !== origen.categoriaId
            ) ||
            (
                prestamo.categoriaDestinoId &&
                prestamo.categoriaDestinoId !== destino.categoriaId
            )
        ) {
            throw new Error(
                "Las categorías del préstamo cambiaron. Revisa la autorización."
            );
        }

        const jerarquia =
            validarJerarquiaCategoriasPrestamo(
                origen.categoriaNombre,
                destino.categoriaNombre
            );

        if (!jerarquia.valido) {
            throw new Error(jerarquia.mensaje);
        }

        const fotoActual = texto(
            actual.fotoUrl ||
            actual.fotoURL ||
            actual.foto ||
            actual.imagenUrl ||
            actual.imagen
        );

        const fotoCargada = texto(
            jugador.fotoUrl ||
            jugador.fotoURL ||
            jugador.foto ||
            jugador.imagenUrl ||
            jugador.imagen
        );

        if (
            nombreJugador(actual) !== nombreJugador(jugador) ||
            fotoActual !== fotoCargada ||
            texto(destino.nombre) !== texto(equipo.nombre) ||
            texto(destino.categoriaNombre) !== texto(equipo.categoriaNombre) ||
            String(actual.numero ?? actual.dorsal ?? "") !==
                String(jugador.numero ?? jugador.dorsal ?? "")
        ) {
            throw new Error(
                "Los datos de la credencial cambiaron. Recarga antes de imprimir."
            );
        }

        const token =
            texto(prestamo.credencialToken) || candidato;

        if (!/^[a-f0-9]{48}$/i.test(token)) {
            throw new Error(
                "El código del préstamo tiene un formato diferente. Revisa el registro."
            );
        }

        if (
            accion !== "publicar" &&
            token !== jugador.credencialToken
        ) {
            throw new Error(
                "El QR del préstamo cambió. Recarga las credenciales."
            );
        }

        const folio =
            "REF-" + jugador.prestamoId.toUpperCase();

        if (accion === "publicar") {
            const publicaRef = doc(
                db,
                "credencialesPublicas",
                token
            );

            const existente = await tx.get(publicaRef);

            if (
                existente.exists() &&
                existente.data().tipo !== "refuerzo"
            ) {
                throw new Error(
                    "Este código pertenece a otra credencial. No se reemplazó."
                );
            }

            if (!prestamo.credencialToken) {
                tx.update(prestamoRef, {
                    credencialToken: token,
                    credencialTokenCreadoEn:
                        serverTimestamp()
                });
            }

            const suspendido =
                actual.suspendido === true ||
                Number(
                    actual.partidosSuspensionPendientes || 0
                ) > 0;

            tx.set(publicaRef, {
                tipo: "refuerzo",
                esRefuerzo: true,
                nombre: nombreJugador(actual),
                numero:
                    actual.numero ?? actual.dorsal ?? "",
                equipoNombre:
                    destino.nombre || "Equipo",
                categoriaNombre:
                    destino.categoriaNombre || "Sin categoría",
                equipoOrigenNombre:
                    origen.nombre || "Equipo de origen",
                temporada:
                    temporada?.nombre ||
                    temporada?.temporada ||
                    temporada?.titulo ||
                    "TEMPORADA ACTUAL",
                folio,
                activa: true,
                suspendido,
                vigente: !suspendido,
                actualizadoEn: serverTimestamp()
            });
        }

        if (accion === "marcar") {
            tx.update(prestamoRef, {
                credencialGenerada: true,
                credencialGeneradaEn: serverTimestamp(),
                credencialUrlVerificacion: url
            });
        }

        return { token, folio };
    });
}

export async function prepararCredencialRefuerzo(
    jugador,
    equipo,
    temporada
) {
    const { token, folio } = await procesar(
        jugador,
        equipo,
        temporada,
        "publicar"
    );

    jugador.credencialToken = token;
    jugador.folioCredencial = folio;
}

export async function verificarRefuerzosAntesDeImprimir(
    lista,
    equipo,
    temporada
) {
    await Promise.all(
        lista
            .filter(jugador => jugador.esRefuerzo)
            .map(jugador =>
                procesar(
                    jugador,
                    equipo,
                    temporada,
                    "verificar"
                )
            )
    );
}

export async function marcarCredencialRefuerzo(
    jugador,
    equipo,
    temporada,
    url
) {
    await procesar(
        jugador,
        equipo,
        temporada,
        "marcar",
        url
    );

    jugador.credencialGenerada = true;
}