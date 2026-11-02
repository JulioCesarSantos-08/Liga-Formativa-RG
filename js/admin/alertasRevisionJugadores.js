import {
    collection,
    doc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

import {
    huellaRevision,
    nombreRevision
} from "./revisionJugadoresDatos.js";

export async function guardarAlertaJugador(
    jugador,
    motivo,
    activa
) {
    if (
        !jugador?.id ||
        typeof jugador.id !== "string" ||
        jugador.id.includes("/") ||
        typeof activa !== "boolean"
    ) {
        throw new Error(
            "Selecciona un jugador valido."
        );
    }

    const razon = String(motivo || "").trim();

    if (
        activa &&
        (razon.length < 8 || razon.length > 600)
    ) {
        throw new Error(
            "Escribe el motivo de la alerta, entre 8 y 600 caracteres."
        );
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error(
            "Inicia sesion como administrador."
        );
    }

    const id = jugador.id;

    const huellaEsperada =
        huellaRevision(jugador);

    const versionAlerta = Number(
        jugador.alertaRevisionIdentidad?.version || 0
    );

    const versionRevision = Number(
        jugador.revisionNombreDorsal?.version || 0
    );

    const referencia = doc(db, "jugadores", id);

    const auditoria = doc(
        collection(db, "auditoria")
    );

    return runTransaction(db, async tx => {
        const [admin, snapshot] = await Promise.all([
            tx.get(doc(db, "usuarios", uid)),
            tx.get(referencia)
        ]);

        if (
            auth.currentUser?.uid !== uid ||
            !admin.exists() ||
            admin.data().rol !== "admin" ||
            admin.data().activo === false
        ) {
            throw new Error(
                "Se requiere una sesion administradora activa."
            );
        }

        if (!snapshot.exists()) {
            throw new Error(
                "El jugador ya no existe. Actualiza la lista."
            );
        }

        const actual = snapshot.data();

        if (
            huellaRevision(actual) !== huellaEsperada ||
            Number(
                actual.alertaRevisionIdentidad?.version || 0
            ) !== versionAlerta ||
            Number(
                actual.revisionNombreDorsal?.version || 0
            ) !== versionRevision
        ) {
            throw new Error(
                "El registro o su revision cambiaron en otra sesion. Cierra la ventana y actualiza la lista antes de continuar."
            );
        }

        if (
            !activa &&
            actual.alertaRevisionIdentidad?.activa !== true
        ) {
            throw new Error(
                "Este jugador no tiene una alerta activa. Actualiza la lista."
            );
        }

        const nombreAdmin = String(
            admin.data().nombre ||
            admin.data().nombreCompleto ||
            "Administrador"
        );

        const alerta = {
            ...(actual.alertaRevisionIdentidad || {}),
            version: versionAlerta + 1,
            activa,
            motivo: activa
                ? razon
                : String(
                    actual.alertaRevisionIdentidad.motivo || ""
                ),
            actualizadoPor: uid,
            actualizadoPorNombre: nombreAdmin,
            actualizadoEn: serverTimestamp()
        };

        const revision = {
            ...(actual.revisionNombreDorsal || {}),
            version: versionRevision + 1,
            confirmado: false,
            huella: huellaRevision(actual),
            revisadoPor: uid,
            revisadoPorNombre: nombreAdmin,
            revisadoEn: serverTimestamp()
        };

        if (auth.currentUser?.uid !== uid) {
            throw new Error(
                "La sesion cambio. Recarga la pagina."
            );
        }

        tx.update(referencia, {
            alertaRevisionIdentidad: alerta,
            revisionNombreDorsal: revision
        });

        tx.set(auditoria, {
            usuarioId: uid,
            usuarioNombre: nombreAdmin,
            usuarioRol: "admin",
            modulo: "REVISION DE JUGADORES",
            accion: activa
                ? "ALERTA DE IDENTIDAD"
                : "ALERTA RESUELTA",
            descripcion: JSON.stringify({
                motivoAnterior:
                    actual.alertaRevisionIdentidad?.motivo || "",
                motivo: alerta.motivo,
                activa
            }),
            entidadTipo: "jugadores",
            entidadId: id,
            entidadNombre: nombreRevision(actual),
            fecha: serverTimestamp()
        });

        return {
            ...actual,
            id,
            alertaRevisionIdentidad: {
                ...alerta,
                actualizadoEn: null
            },
            revisionNombreDorsal: {
                ...revision,
                revisadoEn: null
            }
        };
    });
}
