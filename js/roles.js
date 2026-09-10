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
                        uid: usuario.uid,
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

        const usuario =
            await obtenerUsuarioActual();

        if (!usuario) {

            window.location.href =
                "login.html";

            return null;

        }


        if (usuario.activo === false) {

            await signOut(auth);

            window.location.href =
                "login.html";

            return null;

        }


        if (
            rolesPermitidos.length > 0 &&
            !rolesPermitidos.includes(
                usuario.rol
            )
        ) {

            redirigirSegunRol(
                usuario.rol
            );

            return null;

        }


        return usuario;

    } catch (error) {

        console.error(
            "Error verificando permisos:",
            error
        );

        window.location.href =
            "login.html";

        return null;

    }

}


export async function protegerPaginaPublica() {

    try {

        const usuario =
            await obtenerUsuarioActual();

        if (!usuario) {

            window.location.href =
                "login.html";

            return null;

        }


        if (usuario.activo === false) {

            await signOut(auth);

            window.location.href =
                "login.html";

            return null;

        }


        const rolesPermitidos = [
            "publico",
            "admin",
            "arbitro",
            "jefeEquipo"
        ];


        if (
            !rolesPermitidos.includes(
                usuario.rol
            )
        ) {

            console.warn(
                "Rol no reconocido:",
                usuario.rol
            );

            await signOut(auth);

            window.location.href =
                "login.html";

            return null;

        }


        return usuario;

    } catch (error) {

        console.error(
            "Error verificando acceso público:",
            error
        );

        window.location.href =
            "login.html";

        return null;

    }

}


export function obtenerPanelSegunRol(rol) {

    switch (rol) {

        case "admin":

            return {
                url: "admin.html",
                texto:
                    "Volver al panel de administrador",
                icono: "🛠️"
            };


        case "arbitro":

            return {
                url: "arbitro.html",
                texto:
                    "Volver a mi panel arbitral",
                icono: "⚽"
            };


        case "jefeEquipo":

            return {
                url: "jefeEquipo.html",
                texto:
                    "Volver a mi panel",
                icono: "🛡️"
            };


        case "publico":

        default:

            return null;

    }

}


export function redirigirSegunRol(rol) {

    const panel =
        obtenerPanelSegunRol(rol);


    if (panel) {

        window.location.href =
            panel.url;

        return;

    }


    window.location.href =
        "publico.html";

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