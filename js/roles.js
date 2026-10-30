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

import {
    obtenerRolPrincipalUsuario,
    obtenerRolesUsuario,
    obtenerPanelesUsuario,
    usuarioTieneRol,
    usuarioTieneAlgunRol,
    usuarioTieneDobleRol
} from "./permisosUsuario.js";

export {
    obtenerRolPrincipalUsuario,
    obtenerRolesUsuario,
    obtenerPanelesUsuario,
    usuarioTieneRol,
    usuarioTieneAlgunRol,
    usuarioTieneDobleRol
};

export async function obtenerUsuarioActual() {
    return new Promise((resolve, reject) => {
        const cancelar = onAuthStateChanged(
            auth,
            async usuario => {
                cancelar();

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

                    const documento =
                        await getDoc(referencia);

                    if (!documento.exists()) {
                        resolve(null);
                        return;
                    }

                    if (
                        auth.currentUser?.uid !==
                        usuario.uid
                    ) {
                        resolve(null);
                        return;
                    }

                    resolve({
                        ...documento.data(),
                        firebaseUser: usuario,
                        uid: usuario.uid
                    });
                } catch (error) {
                    console.error(
                        "Error obteniendo usuario:",
                        error
                    );

                    reject(error);
                }
            },
            reject
        );
    });
}

export async function protegerPagina(
    rolesPermitidos = []
) {
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
            !usuarioTieneAlgunRol(
                usuario,
                rolesPermitidos
            )
        ) {
            redirigirSegunRol(usuario);
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
            !usuarioTieneAlgunRol(
                usuario,
                rolesPermitidos
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
    const principal =
        obtenerRolPrincipalUsuario(rol);

    const panel = obtenerPanelesUsuario({
        rol: principal
    })[0];

    if (!panel) {
        return null;
    }

    return {
        url: panel.url,
        texto: principal === "jefeEquipo"
            ? "Volver a mi panel"
            : principal === "arbitro"
                ? "Volver a mi panel arbitral"
                : panel.texto,
        icono: panel.icono
    };
}

export function redirigirSegunRol(usuarioOrol) {
    if (
        usuarioOrol &&
        typeof usuarioOrol === "object" &&
        usuarioOrol.activo === false
    ) {
        window.location.href =
            "login.html";

        return;
    }

    const principal =
        obtenerRolPrincipalUsuario(
            usuarioOrol
        );

    const panel =
        obtenerPanelSegunRol(principal);

    window.location.href = panel
        ? panel.url
        : "publico.html";
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