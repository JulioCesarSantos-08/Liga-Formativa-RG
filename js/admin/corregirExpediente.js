import {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    deleteField
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db, auth } from "../firebase.js";

import {
    usuarioTieneRol
} from "../permisosUsuario.js";

const CAMPOS = {
    arbitro: "documentacionArbitro",
    director: "documentacionJefeEquipo",
    auxiliar: "auxiliarTecnico"
};

export async function corregirExpediente(registro, accion) {
    if (
        !registro ||
        !Object.hasOwn(CAMPOS, registro.tipo) ||
        !["foto", "pdf", "todo"].includes(accion)
    ) {
        throw new Error(
            "Selecciona un expediente y una corrección válida."
        );
    }

    const seleccionado = {
        ...registro,
        datos: { ...registro.datos }
    };

    const tipo = seleccionado.tipo;
    const auxiliar = tipo === "auxiliar";
    const coleccion = auxiliar ? "equipos" : "usuarios";

    const id = auxiliar
        ? seleccionado.equipoId
        : seleccionado.usuarioId;

    const versionEsperada = seleccionado.datos.version;

    if (
        typeof id !== "string" ||
        !id ||
        id.includes("/") ||
        !Number.isSafeInteger(versionEsperada) ||
        versionEsperada < 0
    ) {
        throw new Error(
            "El expediente no tiene identificadores o versión válidos. Actualiza la lista."
        );
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error(
            "Inicia sesión como administrador."
        );
    }

    const referencia = doc(db, coleccion, id);

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
                "Se requiere una sesión administradora activa."
            );
        }

        if (!snapshot.exists()) {
            throw new Error(
                "El expediente dejó de existir. Actualiza la lista."
            );
        }

        const cuenta = snapshot.data();

        if (
            !auxiliar &&
            !usuarioTieneRol(
                cuenta,
                tipo === "arbitro"
                    ? "arbitro"
                    : "jefeEquipo"
            )
        ) {
            throw new Error(
                "Los permisos de esta persona cambiaron. Actualiza la lista."
            );
        }

        if (
            auxiliar &&
            String(cuenta.responsableId || "") !==
                String(seleccionado.responsableId || "")
        ) {
            throw new Error(
                "El responsable del equipo cambió. Actualiza la lista."
            );
        }

        const campo = CAMPOS[tipo];
        const actual = cuenta[campo] || {};
        const version = Number(actual.version || 0);

        if (
            !Number.isSafeInteger(version) ||
            version !== versionEsperada
        ) {
            throw new Error(
                "El expediente cambió en otra sesión. Actualiza la lista antes de corregirlo."
            );
        }

        for (const nombre of [
            "fotoUrl",
            "fotoPublicId",
            "curpPdfUrl",
            "curpPdfPublicId",
            "curp"
        ]) {
            if (
                String(actual[nombre] || "") !==
                String(seleccionado.datos[nombre] || "")
            ) {
                throw new Error(
                    "La documentación cambió desde que la abriste. Actualiza la lista."
                );
            }
        }

        let tokens;

        if (tipo === "arbitro") {
            tokens = [cuenta.credencialArbitroToken];
        } else if (tipo === "director") {
            const mapa =
                cuenta.credencialesCuerpoTecnico || {};

            if (
                typeof mapa !== "object" ||
                Array.isArray(mapa)
            ) {
                throw new Error(
                    "El registro de credenciales técnicas tiene un formato diferente. Revisa la cuenta."
                );
            }

            tokens = Object.values(mapa);
        } else {
            tokens = [actual.credencialToken];
        }

        const unicos = [
            ...new Set(
                tokens.filter(token =>
                    token !== undefined &&
                    token !== null &&
                    token !== ""
                )
            )
        ];

        if (
            unicos.some(token =>
                typeof token !== "string" ||
                !/^[a-f0-9]{32}$/.test(token)
            )
        ) {
            throw new Error(
                "Una credencial tiene un código con formato inesperado. No se retiró documentación."
            );
        }

        const coleccionPublica = tipo === "arbitro"
            ? "credencialesArbitrosPublicas"
            : "credencialesTecnicasPublicas";

        const referenciasPublicas = unicos.map(token =>
            doc(db, coleccionPublica, token)
        );

        const publicas = await Promise.all(
            referenciasPublicas.map(ref => tx.get(ref))
        );

        for (const publica of publicas) {
            if (
                publica.exists() &&
                publica.data().tipo !== tipo
            ) {
                throw new Error(
                    "Un código está asociado a otro tipo de credencial. No se realizaron cambios."
                );
            }
        }

        const nuevo = { ...actual };

        if (accion === "foto" || accion === "todo") {
            delete nuevo.fotoUrl;
            delete nuevo.fotoPublicId;
        }

        if (accion === "pdf" || accion === "todo") {
            delete nuevo.curpPdfUrl;
            delete nuevo.curpPdfPublicId;
        }

        if (accion === "todo") {
            delete nuevo.curp;
        }

        if (auxiliar) {
            delete nuevo.credencialToken;
            delete nuevo.credencialVersion;
        }

        nuevo.version = version + 1;
        nuevo.actualizadoEn = serverTimestamp();
        nuevo.actualizadoPor = uid;

        const cambios = {
            [campo]: nuevo
        };

        if (tipo === "arbitro") {
            cambios.credencialArbitroToken = deleteField();
        }

        if (tipo === "director") {
            cambios.credencialesCuerpoTecnico = {};
        }

        if (auth.currentUser?.uid !== uid) {
            throw new Error(
                "La sesión cambió. Vuelve a iniciar sesión como administrador."
            );
        }

        tx.update(referencia, cambios);

        let inhabilitadas = 0;

        publicas.forEach((publica, indice) => {
            if (publica.exists()) {
                tx.update(referenciasPublicas[indice], {
                    estado: "pendiente",
                    actualizadoEn: serverTimestamp()
                });

                inhabilitadas++;
            }
        });

        const nombre = String(
            auxiliar
                ? actual.nombre || "Auxiliar Técnico"
                : cuenta.nombre ||
                    cuenta.nombreCompleto ||
                    "Sin nombre"
        ).trim();

        const requisito = accion === "foto"
            ? "fotografía"
            : accion === "pdf"
                ? "PDF de CURP"
                : "fotografía, CURP y PDF";

        tx.set(auditoria, {
            usuarioId: uid,
            usuarioNombre: String(
                admin.data().nombre ||
                admin.data().nombreCompleto ||
                "Administrador"
            ),
            usuarioRol: "admin",
            modulo: "REVISIÓN DE EXPEDIENTES",
            accion: "DOCUMENTACIÓN RETIRADA",
            descripcion:
                "Se retiró " + requisito +
                " del expediente de " + nombre +
                " (" + tipo + ") para solicitar su corrección.",
            entidadTipo: coleccion,
            entidadId: id,
            entidadNombre: nombre,
            fecha: serverTimestamp()
        });

        return {
            tipo,
            accion,
            version: nuevo.version,
            credencialesInhabilitadas: inhabilitadas
        };
    });
}