import {
    collection,
    doc,
    getDoc,
    getDocsFromServer,
    writeBatch,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";

export function normalizarCorreoRegistro(valor) {
    return String(valor || "").trim().toLowerCase();
}

export function claveNombreRegistro(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleUpperCase("es-MX");
}

function errorRegistro(code, message) {
    return Object.assign(new Error(message), { code });
}

function exigirSesion(uid) {
    if (!uid || auth.currentUser?.uid !== uid) {
        throw errorRegistro(
            "registro/sesion-cambiada",
            "Tu sesión cambió. Vuelve a iniciar sesión."
        );
    }
}

async function identificador(tipo, valor) {
    const bytes = new TextEncoder().encode(valor);
    const hash = await crypto.subtle.digest("SHA-256", bytes);

    return tipo + "_" + Array.from(
        new Uint8Array(hash),
        n => n.toString(16).padStart(2, "0")
    ).join("");
}

export async function crearPerfilSinDuplicados(usuario, nombre) {
    const uid = usuario?.uid;

    exigirSesion(uid);

    const correo = normalizarCorreoRegistro(usuario.email);
    const claveNombre = claveNombreRegistro(nombre);

    if (!correo || !claveNombre) {
        throw errorRegistro(
            "registro/datos-incompletos",
            "Completa tu correo y nombre antes de continuar."
        );
    }

    const [idCorreo, idNombre] = await Promise.all([
        identificador("correo", correo),
        identificador("nombre", claveNombre)
    ]);

    const usuarioRef = doc(db, "usuarios", uid);
    const correoRef = doc(db, "identidadesUsuarios", idCorreo);
    const nombreRef = doc(db, "identidadesUsuarios", idNombre);

    return runTransaction(db, async tx => {
        exigirSesion(uid);

        const [
            perfil,
            reservaCorreo,
            reservaNombre,
            control
        ] = await Promise.all([
            tx.get(usuarioRef),
            tx.get(correoRef),
            tx.get(nombreRef),
            tx.get(doc(db, "identidadesUsuarios", "control_v1"))
        ]);

        if (perfil.exists()) {
            if (perfil.data().activo === false) {
                throw errorRegistro(
                    "registro/cuenta-inactiva",
                    "Tu cuenta está deshabilitada. Contacta a la administración."
                );
            }

            return perfil.data();
        }

        if (!control.exists() || control.data().completo !== true) {
            throw errorRegistro(
                "registro/indice-pendiente",
                "La administración debe preparar la protección de registros antes de completar nuevas cuentas."
            );
        }

        if (
            reservaCorreo.exists() &&
            (
                reservaCorreo.data().bloqueado ||
                reservaCorreo.data().uid !== uid
            )
        ) {
            throw errorRegistro(
                "registro/correo-duplicado",
                "Este correo ya tiene un perfil registrado. Ingresa con tu cuenta original o contacta a la administración."
            );
        }

        if (
            reservaNombre.exists() &&
            (
                reservaNombre.data().bloqueado ||
                reservaNombre.data().uid !== uid
            )
        ) {
            throw errorRegistro(
                "registro/nombre-duplicado",
                "Este nombre completo ya está registrado. Ingresa con tu cuenta original. Si eres otra persona con el mismo nombre, contacta a la administración."
            );
        }

        exigirSesion(uid);

        const datos = {
            uid,
            nombre,
            email: correo,
            rol: "publico",
            activo: true,
            creadoEn: serverTimestamp()
        };

        tx.set(correoRef, {
            uid,
            tipo: "correo",
            version: 1
        });

        tx.set(nombreRef, {
            uid,
            tipo: "nombre",
            version: 1
        });

        tx.set(usuarioRef, datos);

        return datos;
    });
}

export async function prepararIndiceRegistro() {
    const uid = auth.currentUser?.uid;

    exigirSesion(uid);

    const administrador = await getDoc(
        doc(db, "usuarios", uid)
    );

    if (
        !administrador.exists() ||
        administrador.data().rol !== "admin" ||
        administrador.data().activo === false
    ) {
        throw errorRegistro(
            "registro/solo-admin",
            "Solo administración puede preparar el índice."
        );
    }

    const controlRef = doc(
        db,
        "identidadesUsuarios",
        "control_v1"
    );

    const control = await getDoc(controlRef);

    if (control.exists() && control.data().completo === true) {
        return control.data();
    }

    const existentes = await getDocsFromServer(
        collection(db, "usuarios")
    );

    const reservas = new Map();

    for (const documento of existentes.docs) {
        const datos = documento.data();

        const valores = [
            ["correo", normalizarCorreoRegistro(datos.email)],
            ...[datos.nombre, datos.nombreCompleto].map(
                nombre => ["nombre", claveNombreRegistro(nombre)]
            )
        ];

        for (const [tipo, valor] of valores) {
            if (!valor) continue;

            const id = await identificador(tipo, valor);

            if (!reservas.has(id)) {
                reservas.set(id, {
                    tipo,
                    propietarios: new Set()
                });
            }

            reservas.get(id).propietarios.add(documento.id);
        }
    }

    exigirSesion(uid);

    const filas = [...reservas];

    for (let inicio = 0; inicio < filas.length; inicio += 400) {
        exigirSesion(uid);

        const lote = writeBatch(db);

        for (
            const [id, reserva] of filas.slice(inicio, inicio + 400)
        ) {
            const bloqueado = reserva.propietarios.size > 1;

            lote.set(doc(db, "identidadesUsuarios", id), {
                uid: bloqueado
                    ? ""
                    : [...reserva.propietarios][0],
                bloqueado,
                tipo: reserva.tipo,
                version: 1
            });
        }

        await lote.commit();
    }

    exigirSesion(uid);

    const resultado = {
        completo: true,
        version: 1,
        conflictos: filas.filter(
            ([, reserva]) => reserva.propietarios.size > 1
        ).length,
        actualizadoEn: serverTimestamp()
    };

    const lote = writeBatch(db);

    lote.set(controlRef, resultado);

    await lote.commit();

    return resultado;
}