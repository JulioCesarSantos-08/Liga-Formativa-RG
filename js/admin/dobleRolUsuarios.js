import {
    crearAsignacionRoles,
    usuarioTieneDobleRol
} from "../permisosUsuario.js";

export function crearControlDobleRol(selector) {
    const grupoRol =
        selector?.closest(".form-grupo");

    if (!grupoRol) {
        throw new Error(
            "No se encontró el selector de rol del usuario."
        );
    }

    if (
        !document.getElementById(
            "estilosDobleRolUsuarios"
        )
    ) {
        const enlace =
            document.createElement("link");

        enlace.id =
            "estilosDobleRolUsuarios";

        enlace.rel = "stylesheet";

        enlace.href = new URL(
            "../../css/dobleRolUsuarios.css",
            import.meta.url
        ).href;

        document.head.appendChild(enlace);
    }

    const seccion =
        document.createElement("section");

    seccion.className =
        "doble-rol-usuarios";

    seccion.setAttribute(
        "aria-labelledby",
        "tituloDobleRolUsuarios"
    );

    const titulo =
        document.createElement("h3");

    titulo.id =
        "tituloDobleRolUsuarios";

    titulo.textContent =
        "Permiso adicional";

    const etiqueta =
        document.createElement("label");

    etiqueta.className =
        "doble-rol-opcion";

    const entrada =
        document.createElement("input");

    entrada.type = "checkbox";
    entrada.id = "modalDobleRol";

    entrada.setAttribute(
        "aria-describedby",
        "ayudaDobleRolUsuarios"
    );

    const contenido =
        document.createElement("span");

    contenido.className =
        "doble-rol-contenido";

    const texto =
        document.createElement("strong");

    const descripcion =
        document.createElement("span");

    contenido.append(
        texto,
        descripcion
    );

    etiqueta.append(
        entrada,
        contenido
    );

    const ayuda =
        document.createElement("p");

    ayuda.id =
        "ayudaDobleRolUsuarios";

    ayuda.className =
        "doble-rol-ayuda";

    ayuda.textContent =
        "La misma cuenta conserva sus datos y puede trabajar en ambos paneles. El rol principal determina el panel al iniciar sesión.";

    seccion.append(
        titulo,
        etiqueta,
        ayuda
    );

    grupoRol.after(seccion);

    function actualizar() {
        const profesional = [
            "arbitro",
            "jefeEquipo"
        ].includes(selector.value);

        entrada.disabled =
            !profesional;

        if (!profesional) {
            entrada.checked = false;
        }

        texto.textContent =
            selector.value === "arbitro"
                ? "También es jefe de equipo"
                : selector.value === "jefeEquipo"
                    ? "También es árbitro"
                    : "Disponible para árbitros y jefes de equipo";

        descripcion.textContent =
            profesional
                ? "Activa ambos permisos para esta persona."
                : "Selecciona uno de esos roles principales para habilitar esta opción.";

        seccion.dataset.habilitado =
            String(profesional);

        seccion.dataset.seleccionado =
            String(entrada.checked);
    }

    selector.addEventListener(
        "change",
        actualizar
    );

    entrada.addEventListener(
        "change",
        actualizar
    );

    actualizar();

    return {
        cargar(usuario) {
            entrada.checked =
                usuarioTieneDobleRol(usuario);

            actualizar();
        },

        leer() {
            return crearAsignacionRoles(
                selector.value,
                entrada.checked &&
                    !entrada.disabled
            );
        }
    };
}