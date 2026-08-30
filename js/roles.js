import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


export async function obtenerUsuarioActual() {

    return new Promise((resolve, reject) => {

        const unsubscribe = onAuthStateChanged(
            auth,
            async (usuario) => {

                unsubscribe();

                if (!usuario) {

                    resolve(null);
                    return;

                }

                try {

                    const referencia = doc(
                        db,
                        "usuarios",
                        usuario.uid
                    );

                    const documento = await getDoc(
                        referencia
                    );

                    if (!documento.exists()) {

                        resolve(null);
                        return;

                    }

                    resolve({
                        firebaseUser: usuario,
                        ...documento.data()
                    });

                } catch (error) {

                    console.error(
                        "Error obteniendo usuario:",
                        error
                    );

                    reject(error);

                }

            }
        );

    });

}


export async function protegerPagina(rolesPermitidos = []) {

    try {

        const usuario = await obtenerUsuarioActual();

        if (!usuario) {

            window.location.href = "login.html";
            return null;

        }

        if (usuario.activo === false) {

            await signOut(auth);

            window.location.href = "login.html";
            return null;

        }

        if (
            rolesPermitidos.length > 0 &&
            !rolesPermitidos.includes(usuario.rol)
        ) {

            redirigirSegunRol(usuario.rol);
            return null;

        }

        return usuario;

    } catch (error) {

        console.error(
            "Error verificando permisos:",
            error
        );

        window.location.href = "login.html";

        return null;

    }

}


export function redirigirSegunRol(rol) {

    switch (rol) {

        case "admin":

            window.location.href =
                "admin.html";

            break;

        case "arbitro":

            window.location.href =
                "arbitro.html";

            break;

        case "jefeEquipo":

            window.location.href =
                "jefeEquipo.html";

            break;

        case "publico":

        default:

            window.location.href =
                "publico.html";

            break;

    }

}


export async function cerrarSesion() {

    try {

        await signOut(auth);

        window.location.href =
            "login.html";

    } catch (error) {

        console.error(
            "Error cerrando sesión:",
            error
        );

    }

}