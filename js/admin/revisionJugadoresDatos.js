import { validarDorsalDisponible } from "../validarDorsalDisponible.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

import {
    prepararDatosEdicionJugador
} from "./datosEdicionJugador.js";

const campos = [
    "nombre",
    "nombreCompleto",
    "numero",
    "dorsal",
    "numeroJugador",
    "curp",
    "curpArchivoUrl",
    "curpUrl",
    "documentoCurpUrl",
    "archivoCurpUrl",
    "pdfCurpUrl",
    "curpArchivoPublicId",
    "equipoId",
    "categoriaId"
];

export function huellaRevision(jugador) {
    return JSON.stringify(
        campos.map(campo => jugador[campo] ?? null)
    );
}

export function revisionConfirmada(jugador) {
    return jugador.alertaRevisionIdentidad?.activa !== true && jugador.revisionNombreDorsal?.confirmado === true &&
        jugador.revisionNombreDorsal.huella ===
            huellaRevision(jugador);
}

export function nombreRevision(jugador) {
    return String(
        jugador.nombreCompleto ||
        jugador.nombre ||
        "Sin nombre"
    );
}

export function dorsalRevision(jugador) {
    return jugador.numero ??
        jugador.dorsal ??
        jugador.numeroJugador ??
        "";
}

export function urlCurpRevision(jugador) {
    for (const campo of [
        "curpArchivoUrl",
        "curpUrl",
        "documentoCurpUrl",
        "archivoCurpUrl",
        "pdfCurpUrl"
    ]) {
        try {
            const url = new URL(
                String(jugador[campo] || "")
            );

            if (url.protocol === "https:") {
                return url.href;
            }
        } catch {}
    }

    return "";
}

function estadoRevision(jugador) {
    const revision =
        jugador.revisionNombreDorsal || {};

    return JSON.stringify([
        revision.version || 0,
        revision.confirmado === true,
        revision.huella || "", jugador.alertaRevisionIdentidad?.version || 0, jugador.alertaRevisionIdentidad?.activa === true
    ]);
}

function validarAdmin(snapshot, uid) {
    if (
        auth.currentUser?.uid !== uid ||
        !snapshot.exists() ||
        snapshot.data().rol !== "admin" ||
        snapshot.data().activo === false
    ) {
        throw new Error(
            "Se requiere una sesión administradora activa."
        );
    }
}

export async function consultarRevisionJugadores() {
    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error(
            "Inicia sesión como administrador."
        );
    }

    validarAdmin(
        await getDoc(doc(db, "usuarios", uid)),
        uid
    );

    const resultados = await Promise.all(
        ["jugadores", "equipos", "categorias"].map(
            nombre =>
                getDocs(collection(db, nombre))
        )
    );

    if (auth.currentUser?.uid !== uid) {
        throw new Error(
            "La sesión cambió. Recarga la página."
        );
    }

    const [jugadores, equipos, categorias] =
        resultados.map(snapshot =>
            snapshot.docs.map(documento => ({
                ...documento.data(),
                id: documento.id
            }))
        );

    return {
        jugadores,
        equipos,
        categorias
    };
}

export async function guardarRevisionJugador(
    jugador,
    valores,
    accion
) {
    if (
        !jugador?.id ||
        typeof jugador.id !== "string" ||
        jugador.id.includes("/") ||
        !["guardar", "confirmar", "pendiente"].includes(accion)
    ) {
        throw new Error(
            "Selecciona un jugador y una operación válida."
        );
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error(
            "Inicia sesión como administrador."
        );
    }

    const id = jugador.id;
    const esperada = huellaRevision(jugador);
    const revisionEsperada = estadoRevision(jugador);

    const cambios = accion === "pendiente"
        ? {}
        : prepararDatosEdicionJugador({
            nombreCompleto: valores.nombre,
            numero: valores.numero
        });

    if (accion !== "pendiente") {
        await validarDorsalDisponible(
            jugador,
            cambios.numero
        );
    }

    const referencia = doc(db, "jugadores", id);

    const auditoria = doc(
        collection(db, "auditoria")
    );

    return runTransaction(db, async tx => {
        const [admin, snapshot] = await Promise.all([
            tx.get(doc(db, "usuarios", uid)),
            tx.get(referencia)
        ]);

        validarAdmin(admin, uid);

        if (!snapshot.exists()) {
            throw new Error(
                "El jugador ya no existe. Actualiza la lista."
            );
        }

        const actual = snapshot.data();

        if (
            accion === "confirmar" &&
            actual.alertaRevisionIdentidad?.activa === true
        ) {
            throw new Error(
                "Resuelve primero la alerta de identidad. El jugador debe permanecer pendiente mientras exista esta observacion."
            );
        }

        if (
            huellaRevision(actual) !== esperada ||
            estadoRevision(actual) !== revisionEsperada
        ) {
            throw new Error(
                "El registro cambió en otra sesión. Cierra esta ventana, actualiza la lista y revisa los datos nuevos."
            );
        }

        const cambioReal = Object.keys(cambios).some(
            campo => actual[campo] !== cambios[campo]
        );

        if (accion === "guardar" && !cambioReal) {
            throw new Error(
                "No hay cambios en el nombre ni en el dorsal para guardar."
            );
        }

        const siguiente = {
            ...actual,
            ...cambios
        };

        const revision = {
            version:
                Number(
                    actual.revisionNombreDorsal?.version || 0
                ) + 1,
            confirmado: accion === "confirmar",
            huella: huellaRevision(siguiente),
            revisadoPor: uid,
            revisadoPorNombre: String(
                admin.data().nombre ||
                admin.data().nombreCompleto ||
                "Administrador"
            ),
            revisadoEn: serverTimestamp()
        };

        const escritura = {
            ...cambios,
            revisionNombreDorsal: revision
        };

        if (cambioReal) {
            Object.assign(escritura, {
                actualizadoEn: serverTimestamp(),
                actualizadoPor: uid,
                actualizadoPorNombre:
                    revision.revisadoPorNombre
            });
        }

        validarAdmin(admin, uid);

        tx.update(referencia, escritura);

        tx.set(auditoria, {
            usuarioId: uid,
            usuarioNombre: revision.revisadoPorNombre,
            usuarioRol: "admin",
            modulo: "REVISIÓN DE JUGADORES",
            accion: accion === "confirmar"
                ? "REVISIÓN CONFIRMADA"
                : accion === "pendiente"
                    ? "REVISIÓN PENDIENTE"
                    : "DATOS CORREGIDOS",
            descripcion: JSON.stringify({
                nombreAnterior: nombreRevision(actual),
                dorsalAnterior: dorsalRevision(actual),
                nombreNuevo: nombreRevision(siguiente),
                dorsalNuevo: dorsalRevision(siguiente)
            }),
            entidadTipo: "jugadores",
            entidadId: id,
            entidadNombre: nombreRevision(siguiente),
            fecha: serverTimestamp()
        });

        return {
            ...siguiente,
            id,
            revisionNombreDorsal: {
                ...revision,
                revisadoEn: null
            }
        };
    });
}