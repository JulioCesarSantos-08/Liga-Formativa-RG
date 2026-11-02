import {
    collection,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db, auth } from "../firebase.js";
import { usuarioTieneRol } from "../permisosUsuario.js";

export function urlDocumentoValida(valor) {
    try {
        return new URL(
            String(valor || "")
        ).protocol === "https:";
    } catch {
        return false;
    }
}

function proyectarDocumentacion(datos = {}) {
    datos = datos && typeof datos === "object"
        ? datos
        : {};

    return {
        fotoUrl: String(datos.fotoUrl || ""),
        fotoPublicId: String(datos.fotoPublicId || ""),
        curpPdfUrl: String(datos.curpPdfUrl || ""),
        curpPdfPublicId: String(datos.curpPdfPublicId || ""),
        curp: String(datos.curp || ""),
        version: Number(datos.version || 0)
    };
}

export function documentacionRevisionCompleta(datos) {
    return urlDocumentoValida(datos?.fotoUrl) &&
        urlDocumentoValida(datos?.curpPdfUrl) &&
        /^[A-Z0-9]{18}$/.test(datos?.curp || "");
}

function equipoActivo(equipo) {
    return equipo.activo !== false &&
        equipo.descalificado !== true &&
        !["inactivo", "descalificado"].includes(
            String(equipo.estado || "")
                .trim()
                .toLowerCase()
        );
}

function nombreUsuario(usuario) {
    return String(
        usuario.nombre ||
        usuario.nombreCompleto ||
        "Sin nombre"
    ).trim();
}

function asignacionEquipo(equipo) {
    const nombre = String(
        equipo.nombre ||
        equipo.clubNombre ||
        "Equipo sin nombre"
    ).trim();

    const categoria = String(
        equipo.categoriaNombre ||
        "Sin categoría"
    ).trim();

    return nombre + " · " + categoria;
}

export function construirRevisionExpedientes(
    usuarios,
    equipos
) {
    const porUsuario = new Map(
        usuarios.map(usuario => [
            usuario.id,
            usuario
        ])
    );

    const porResponsable = new Map();
    const registros = [];

    for (const equipo of equipos) {
        const responsable = String(
            equipo.responsableId || ""
        );

        if (!porResponsable.has(responsable)) {
            porResponsable.set(responsable, []);
        }

        porResponsable.get(responsable).push(equipo);
    }

    function agregar(registro, documentacion) {
        const datos = proyectarDocumentacion(
            documentacion
        );

        registros.push({
            ...registro,
            datos,
            completo:
                documentacionRevisionCompleta(datos) &&
                (
                    registro.tipo !== "auxiliar" ||
                    Boolean(
                        String(
                            documentacion?.nombre || ""
                        ).trim()
                    )
                )
        });
    }

    for (const usuario of usuarios) {
        if (usuarioTieneRol(usuario, "arbitro")) {
            agregar(
                {
                    id: "arbitro_" + usuario.id,
                    tipo: "arbitro",
                    cargo: "Árbitro",
                    nombre: nombreUsuario(usuario),
                    usuarioId: usuario.id,
                    equipoId: "",
                    responsableId: usuario.id,
                    asignacion: "Coordinación arbitral",
                    activo: usuario.activo !== false
                },
                usuario.documentacionArbitro
            );
        }

        if (usuarioTieneRol(usuario, "jefeEquipo")) {
            const asignaciones =
                porResponsable.get(usuario.id) || [];

            const etiquetas = [
                ...new Set(
                    asignaciones.map(asignacionEquipo)
                )
            ];

            agregar(
                {
                    id: "director_" + usuario.id,
                    tipo: "director",
                    cargo: "Director Técnico",
                    nombre: nombreUsuario(usuario),
                    usuarioId: usuario.id,
                    equipoId: "",
                    responsableId: usuario.id,
                    asignacion: etiquetas.length
                        ? etiquetas
                            .sort((a, b) =>
                                a.localeCompare(b, "es")
                            )
                            .join(" / ")
                        : "Sin equipos asignados",
                    activo: usuario.activo !== false
                },
                usuario.documentacionJefeEquipo
            );
        }
    }

    for (const equipo of equipos) {
        const responsable = porUsuario.get(
            equipo.responsableId
        );

        const auxiliar =
            equipo.auxiliarTecnico || {};

        const tieneDatos = Boolean(
            auxiliar.nombre ||
            auxiliar.curp ||
            auxiliar.fotoUrl ||
            auxiliar.curpPdfUrl
        );

        if (
            !tieneDatos &&
            !usuarioTieneRol(responsable, "jefeEquipo")
        ) {
            continue;
        }

        agregar(
            {
                id: "auxiliar_" + equipo.id,
                tipo: "auxiliar",
                cargo: "Auxiliar Técnico",
                nombre: String(
                    auxiliar.nombre ||
                    "Auxiliar por registrar"
                ).trim(),
                usuarioId: "",
                equipoId: equipo.id,
                responsableId: String(
                    equipo.responsableId || ""
                ),
                asignacion:
                    asignacionEquipo(equipo) +
                    " · Responsable: " +
                    (
                        responsable
                            ? nombreUsuario(responsable)
                            : "Sin cuenta disponible"
                    ),
                activo:
                    equipoActivo(equipo) &&
                    Boolean(responsable) &&
                    responsable.activo !== false &&
                    usuarioTieneRol(
                        responsable,
                        "jefeEquipo"
                    )
            },
            auxiliar
        );
    }

    return registros.sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es") ||
        a.id.localeCompare(b.id)
    );
}

export async function consultarRevisionExpedientes() {
    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error(
            "Inicia sesión como administrador."
        );
    }

    const admin = await getDoc(
        doc(db, "usuarios", uid)
    );

    if (
        auth.currentUser?.uid !== uid ||
        !admin.exists() ||
        admin.data().rol !== "admin" ||
        admin.data().activo === false
    ) {
        throw new Error(
            "Se requiere una cuenta administradora activa."
        );
    }

    const [
        usuariosSnapshot,
        equiposSnapshot
    ] = await Promise.all([
        getDocs(collection(db, "usuarios")),
        getDocs(collection(db, "equipos"))
    ]);

    if (auth.currentUser?.uid !== uid) {
        throw new Error(
            "La sesión cambió durante la consulta. Recarga la página."
        );
    }

    const convertir = snapshot =>
        snapshot.docs.map(documento => ({
            ...documento.data(),
            id: documento.id
        }));

    return construirRevisionExpedientes(
        convertir(usuariosSnapshot),
        convertir(equiposSnapshot)
    );
}