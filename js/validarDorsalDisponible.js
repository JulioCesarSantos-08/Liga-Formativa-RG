import {
    collection,
    getDocsFromServer,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "./firebase.js";

import {
    normalizarDorsal,
    buscarDorsalDuplicado
} from "./dorsales.js";

export async function validarDorsalDisponible(jugador, valor) {
    if (normalizarDorsal(valor) === null) return;

    if (!jugador.equipoId) {
        throw new Error("No se pudo identificar el equipo para comprobar el dorsal.");
    }

    const snapshot = await getDocsFromServer(
        query(
            collection(db, "jugadores"),
            where("equipoId", "==", jugador.equipoId)
        )
    );

    const jugadores = snapshot.docs.map(documento => ({
        ...documento.data(),
        id: documento.id
    }));

    const otro = buscarDorsalDuplicado(
        jugadores,
        jugador,
        valor
    );

    if (otro) {
        const nombre =
            otro.nombreCompleto ||
            otro.nombre ||
            "otro jugador";

        throw new Error(
            'El dorsal "' + normalizarDorsal(valor) +
            '" ya está asignado a ' + nombre +
            ' en este equipo y categoría. 7 y 07 se consideran distintos.'
        );
    }
}
