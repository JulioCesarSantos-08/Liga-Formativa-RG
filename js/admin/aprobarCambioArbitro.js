import {
    doc, getDoc, getDocs, collection, query, where,
    runTransaction, serverTimestamp, deleteField
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db, auth } from "../firebase.js";
import { usuarioTieneRol } from "../permisosUsuario.js";

async function resolverCambio({
    solicitudId,
    adminUid,
    aprobar,
    respuesta = ""
}) {
    if (!solicitudId || !adminUid) {
        throw new Error(
            "No se pudo identificar la solicitud o la cuenta administradora."
        );
    }

    if (auth.currentUser?.uid !== adminUid) {
        throw new Error(
            "La sesión no coincide con la cuenta administradora."
        );
    }

    const mensaje = String(respuesta).trim();

    if (mensaje.length > 1000) {
        throw new Error(
            "La respuesta debe tener como máximo 1000 caracteres."
        );
    }

    if (!aprobar && !mensaje) {
        throw new Error("Indica el motivo del rechazo.");
    }

    const referencia = doc(
        db,
        "solicitudesCambioArbitro",
        solicitudId
    );

    const inicial = await getDoc(referencia);

    if (!inicial.exists()) {
        throw new Error("La solicitud ya no está disponible.");
    }

    const previa = inicial.data();

    if (!previa.partidoId) {
        throw new Error("La solicitud no identifica el partido.");
    }

    let referenciasDelDia = [];

    if (aprobar) {
        if (!previa.fecha || !previa.hora) {
            throw new Error("La solicitud no tiene un horario válido.");
        }

        const partidosDia = await getDocs(
            query(
                collection(db, "partidos"),
                where("fecha", "==", previa.fecha)
            )
        );

        referenciasDelDia = partidosDia.docs
            .filter(d => d.id !== previa.partidoId)
            .map(d => d.ref);
    }

    return runTransaction(db, async transaccion => {
        if (auth.currentUser?.uid !== adminUid) {
            throw new Error(
                "La sesión administradora cambió. Vuelve a iniciar sesión."
            );
        }

        const [adminSnap, solicitudSnap] = await Promise.all([
            transaccion.get(doc(db, "usuarios", adminUid)),
            transaccion.get(referencia)
        ]);

        if (
            !adminSnap.exists() ||
            adminSnap.data().rol !== "admin" ||
            adminSnap.data().activo === false
        ) {
            throw new Error(
                "Esta operación requiere una cuenta administradora activa."
            );
        }

        if (
            !solicitudSnap.exists() ||
            solicitudSnap.data().estado !== "pendiente"
        ) {
            throw new Error(
                "Esta solicitud ya fue resuelta o dejó de estar pendiente."
            );
        }

        const solicitud = solicitudSnap.data();

        if (solicitud.partidoId !== previa.partidoId) {
            throw new Error("La solicitud cambió. Recarga la página.");
        }

        const refPartido = doc(
            db,
            "partidos",
            solicitud.partidoId
        );

        const partidoSnap = await transaccion.get(refPartido);
        const partido = partidoSnap.exists()
            ? partidoSnap.data() : null;

        if (aprobar) {
            if (!partido) {
                throw new Error("El partido ya no está disponible.");
            }

            if (
                solicitud.fecha !== previa.fecha ||
                solicitud.hora !== previa.hora ||
                partido.fecha !== solicitud.fecha ||
                partido.hora !== solicitud.hora
            ) {
                throw new Error(
                    "El horario cambió desde la solicitud. Recházala y solicita el cambio con el horario actualizado."
                );
            }

            if (
                partido.solicitudCambioArbitroPendienteId !== solicitudId
            ) {
                throw new Error(
                    "La solicitud no coincide con la solicitud pendiente del partido."
                );
            }

            if (
                (partido.arbitroId || null) !==
                (solicitud.arbitroActualId || null)
            ) {
                throw new Error(
                    "El árbitro asignado cambió desde que se envió la solicitud."
                );
            }

            if (
                !solicitud.arbitroPropuestoId ||
                solicitud.arbitroPropuestoId === partido.arbitroId
            ) {
                throw new Error(
                    "La propuesta no identifica un árbitro diferente."
                );
            }

            const [
                arbitroSnap,
                cedulaSnap,
                otrosPartidos
            ] = await Promise.all([
                transaccion.get(
                    doc(db, "usuarios", solicitud.arbitroPropuestoId)
                ),
                transaccion.get(
                    doc(db, "cedulas", solicitud.partidoId)
                ),
                Promise.all(
                    referenciasDelDia.map(ref => transaccion.get(ref))
                )
            ]);

            if (
                !arbitroSnap.exists() ||
                !usuarioTieneRol(arbitroSnap.data(), "arbitro") ||
                arbitroSnap.data().activo === false
            ) {
                throw new Error(
                    "El árbitro propuesto ya no está activo o disponible."
                );
            }

            if (
                ["cancelado", "finalizado"].includes(partido.estado) ||
                partido.resultadoRegistrado === true ||
                (
                    cedulaSnap.exists() &&
                    ["registrada", "enviada"].includes(
                        cedulaSnap.data().estado
                    )
                )
            ) {
                throw new Error(
                    "El partido está cancelado o ya tiene un resultado oficial."
                );
            }

            const conflicto = otrosPartidos.some(snapshot => {
                if (!snapshot.exists()) return false;

                const otro = snapshot.data();

                return (
                    otro.estado !== "cancelado" &&
                    otro.fecha === partido.fecha &&
                    otro.hora === partido.hora &&
                    otro.arbitroId === solicitud.arbitroPropuestoId
                );
            });

            if (conflicto) {
                throw new Error(
                    "El árbitro propuesto ya tiene otro partido en esa fecha y hora."
                );
            }

            transaccion.update(refPartido, {
                arbitroId: solicitud.arbitroPropuestoId,
                arbitroNombre: arbitroSnap.data().nombre || "Árbitro",
                solicitudCambioArbitroPendienteId: deleteField(),
                arbitroCambioSolicitudId: solicitudId,
                arbitroCambioAprobadoPor: adminUid,
                actualizadoEn: serverTimestamp()
            });
        } else if (
            partido &&
            partido.solicitudCambioArbitroPendienteId === solicitudId
        ) {
            transaccion.update(refPartido, {
                solicitudCambioArbitroPendienteId: deleteField()
            });
        }

        transaccion.update(referencia, {
            estado: aprobar ? "aprobada" : "rechazada",
            respuestaAdministrativa:
                mensaje || "Cambio de árbitro autorizado.",
            respondidoPor: adminUid,
            respondidoPorNombre:
                adminSnap.data().nombre || "Administrador",
            resueltoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp()
        });

        return {
            estado: aprobar ? "aprobada" : "rechazada",
            partidoId: solicitud.partidoId
        };
    });
}

export function aprobarCambioArbitro(datos) {
    return resolverCambio({ ...datos, aprobar: true });
}

export function rechazarCambioArbitro(datos) {
    return resolverCambio({ ...datos, aprobar: false });
}