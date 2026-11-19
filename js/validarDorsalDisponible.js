import {dorsalRefuerzo} from "./disciplinaCategoria.js";
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

    const [prestamos, todos] = await Promise.all([getDocsFromServer(collection(db,"prestamosJugadores")),getDocsFromServer(collection(db,"jugadores"))]);
    for (const s of prestamos.docs) {
        const p=s.data();
        if ((p.equipoDestinoId || p.equipoId)!==jugador.equipoId || p.activo!==true || String(p.estado || "").toLowerCase()!=="activo") continue;
        const origen=todos.docs.find(j=>j.id===p.jugadorId);
        if (!origen || origen.data().activo===false || origen.data().equipoId!==p.equipoOrigenId) continue;
        jugadores.push({...origen.data(),id:origen.id,equipoId:jugador.equipoId,categoriaId:jugador.categoriaId,numero:dorsalRefuerzo(origen.data(),p)});
    }
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
