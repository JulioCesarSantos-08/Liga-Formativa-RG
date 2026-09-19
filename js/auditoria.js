import {
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "./firebase.js";

export async function registrarAuditoria({
    usuarioId = "",
    usuarioNombre = "",
    usuarioRol = "",
    modulo = "",
    accion = "",
    descripcion = "",
    entidadTipo = "",
    entidadId = "",
    entidadNombre = ""
} = {}) {
    try {
        const registro = {
            usuarioId: limpiarTexto(usuarioId),
            usuarioNombre: limpiarTexto(usuarioNombre) || "Usuario desconocido",
            usuarioRol: limpiarTexto(usuarioRol) || "Sin rol",
            modulo: limpiarTexto(modulo) || "sistema",
            accion: limpiarTexto(accion) || "actividad",
            descripcion: limpiarTexto(descripcion) || "Sin descripción adicional.",
            entidadTipo: limpiarTexto(entidadTipo),
            entidadId: limpiarTexto(entidadId),
            entidadNombre: limpiarTexto(entidadNombre),
            fecha: serverTimestamp()
        };

        await addDoc(
            collection(db, "auditoria"),
            registro
        );

        return {
            ok: true
        };
    } catch (error) {
        console.error(
            "No se pudo registrar la auditoría:",
            error
        );

        return {
            ok: false,
            error
        };
    }
}

function limpiarTexto(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return "";
    }

    return String(valor).trim();
}