const ROLES_VALIDOS = new Set([
    "publico",
    "admin",
    "arbitro",
    "jefeEquipo"
]);

const ROLES_PROFESIONALES = new Set([
    "arbitro",
    "jefeEquipo"
]);

const PANELES = {
    admin: {
        rol: "admin",
        url: "admin.html",
        texto: "Volver al panel de administrador",
        icono: "🛠️"
    },
    arbitro: {
        rol: "arbitro",
        url: "arbitro.html",
        texto: "Volver al panel arbitral",
        icono: "⚽"
    },
    jefeEquipo: {
        rol: "jefeEquipo",
        url: "jefeEquipo.html",
        texto: "Volver al panel de jefe de equipo",
        icono: "🛡️"
    }
};

function perfilUsuario(usuario) {
    return typeof usuario === "string"
        ? { rol: usuario }
        : usuario && typeof usuario === "object"
            ? usuario
            : {};
}

export function obtenerRolPrincipalUsuario(usuario) {
    const perfil = perfilUsuario(usuario);

    return ROLES_VALIDOS.has(perfil.rol)
        ? perfil.rol
        : "";
}

export function obtenerRolesUsuario(usuario) {
    const perfil = perfilUsuario(usuario);

    const principal =
        obtenerRolPrincipalUsuario(perfil);

    if (!principal) {
        return [];
    }

    const resultado = [principal];

    if (
        !ROLES_PROFESIONALES.has(principal) ||
        !Array.isArray(perfil.roles) ||
        !perfil.roles.includes(principal)
    ) {
        return resultado;
    }

    for (const rol of perfil.roles) {
        if (
            ROLES_PROFESIONALES.has(rol) &&
            !resultado.includes(rol)
        ) {
            resultado.push(rol);
        }
    }

    return resultado;
}

export function usuarioTieneRol(usuario, rol) {
    return ROLES_VALIDOS.has(rol) &&
        obtenerRolesUsuario(usuario).includes(rol);
}

export function usuarioTieneAlgunRol(
    usuario,
    rolesPermitidos
) {
    if (!Array.isArray(rolesPermitidos)) {
        return false;
    }

    const roles =
        obtenerRolesUsuario(usuario);

    return rolesPermitidos.some(
        rol =>
            ROLES_VALIDOS.has(rol) &&
            roles.includes(rol)
    );
}

export function usuarioTieneDobleRol(usuario) {
    return usuarioTieneRol(
        usuario,
        "arbitro"
    ) &&
        usuarioTieneRol(
            usuario,
            "jefeEquipo"
        );
}

export function obtenerPanelesUsuario(usuario) {
    const perfil = perfilUsuario(usuario);

    if (perfil.activo === false) {
        return [];
    }

    return obtenerRolesUsuario(perfil)
        .filter(
            rol => Object.hasOwn(PANELES, rol)
        )
        .map(
            rol => ({ ...PANELES[rol] })
        );
}

export function crearAsignacionRoles(
    rolPrincipal,
    dobleRol = false
) {
    if (!ROLES_VALIDOS.has(rolPrincipal)) {
        throw new Error(
            "El rol seleccionado no es válido."
        );
    }

    if (typeof dobleRol !== "boolean") {
        throw new Error(
            "La selección de doble rol no es válida."
        );
    }

    if (
        dobleRol &&
        !ROLES_PROFESIONALES.has(rolPrincipal)
    ) {
        throw new Error(
            "El doble rol solo combina Árbitro y Jefe de equipo."
        );
    }

    const roles = [rolPrincipal];

    if (dobleRol) {
        roles.push(
            rolPrincipal === "arbitro"
                ? "jefeEquipo"
                : "arbitro"
        );
    }

    return {
        rol: rolPrincipal,
        roles
    };
}