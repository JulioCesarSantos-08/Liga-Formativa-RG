import {
    doc,
    collection,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";
import { usuarioTieneRol } from "../permisosUsuario.js";

import {
    construirResultadoDefault,
    validarCierreDisponible,
    textoResultadoDefault
} from "../resultadosDefault.js";

async function guardarProtegido(partidoId, resolver) {
    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error("Inicia sesión para resolver la cédula.");
    }

    const referencia = doc(db, "partidos", partidoId);
    const cedulaRef = doc(db, "cedulas", partidoId);
    const auditoriaRef = doc(collection(db, "auditoria"));

    await runTransaction(db, async tx => {
        const [usuario, snapshot, cedula] = await Promise.all([
            tx.get(doc(db, "usuarios", uid)),
            tx.get(referencia),
            tx.get(cedulaRef)
        ]);

        if (!usuario.exists() || !snapshot.exists()) {
            throw new Error(
                "La cuenta o el partido ya no están disponibles."
            );
        }

        const perfil = usuario.data();
        const partido = snapshot.data();

        const autorizado =
            perfil.rol === "admin" ||
            (
                usuarioTieneRol(perfil, "arbitro") &&
                partido.arbitroId === uid
            );

        if (
            auth.currentUser?.uid !== uid ||
            perfil.activo === false ||
            !autorizado
        ) {
            throw new Error(
                "Solo el árbitro asignado o un administrador activo pueden cerrar esta cédula."
            );
        }

        const anterior = cedula.exists() ? cedula.data() : {};

        validarCierreDisponible(partido, anterior);

        const datos = resolver(
            partido,
            anterior,
            uid,
            perfil
        );

        tx.set(
            cedulaRef,
            datos.cedula,
            { merge: datos.merge === true }
        );

        if (datos.partido) {
            tx.update(referencia, datos.partido);
        }

        if (datos.auditoria) {
            tx.set(auditoriaRef, datos.auditoria);
        }
    });
}

export async function guardarCedulaProtegida(
    partidoId,
    cedula,
    partido = null
) {
    await guardarProtegido(
        partidoId,
        () => ({ cedula, partido, merge: true })
    );
}

export async function resolverDefault(
    partidoEsperado,
    lado,
    motivo
) {
    await guardarProtegido(
        partidoEsperado.id,
        (partido, anterior, uid, perfil) => {
            if (
                partido.localId !== partidoEsperado.localId ||
                partido.visitanteId !== partidoEsperado.visitanteId
            ) {
                throw new Error(
                    "Los equipos del partido cambiaron. Recarga antes de resolver."
                );
            }

            const tieneEventos = [
                "goles",
                "amarillas",
                "rojas",
                "cambios"
            ].some(campo =>
                Array.isArray(anterior[campo]) &&
                anterior[campo].length
            );

            if (
                tieneEventos ||
                Number(anterior.golesLocal || 0) > 0 ||
                Number(anterior.golesVisitante || 0) > 0
            ) {
                throw new Error(
                    "Hay goles, tarjetas o cambios guardados. Revisa el borrador antes de cerrar como partido no disputado."
                );
            }

            const nombre =
                perfil.nombreCompleto ||
                perfil.nombre ||
                "Árbitro";

            const fecha = serverTimestamp();

            const resultado = construirResultadoDefault(
                partido,
                lado,
                motivo,
                uid,
                nombre,
                fecha
            );

            const cedula = {};

            for (const campo of [
                "categoriaId",
                "categoriaNombre",
                "jornadaId",
                "jornadaNombre",
                "fecha",
                "hora",
                "campo",
                "localId",
                "localNombre",
                "visitanteId",
                "visitanteNombre",
                "arbitroId",
                "arbitroNombre"
            ]) {
                cedula[campo] = partido[campo] ?? null;
            }

            Object.assign(cedula, resultado, {
                partidoId: partidoEsperado.id,
                estado: "registrada",
                goles: [],
                amarillas: [],
                rojas: [],
                cambios: [],
                alineaciones: {
                    titularesLocal: [],
                    titularesVisitante: []
                },
                presentesLocal: [],
                presentesVisitante: [],
                totalPresentesLocal: 0,
                totalPresentesVisitante: 0,
                totalPresentes: 0,
                capitanLocalId: null,
                capitanVisitanteId: null,
                inicioPrimerTiempo: "",
                finPrimerTiempo: "",
                inicioSegundoTiempo: "",
                finSegundoTiempo: "",
                incidencias:
                    "Partido no disputado. " +
                    resultado.motivoDefault,
                confirmadoPorArbitro: true,
                confirmadoPorUid: uid,
                confirmadoPorNombre: nombre,
                actualizadoEn: fecha,
                enviadoEn: fecha
            });

            return {
                cedula,

                partido: {
                    ...resultado,
                    estado: "finalizado",
                    cedulaCreada: true,
                    resultadoRegistrado: true,
                    cedulaId: partidoEsperado.id,
                    finalizadoEn: fecha,
                    cedulaActualizadaEn: fecha
                },

                auditoria: {
                    usuarioId: uid,
                    usuarioNombre: nombre,
                    usuarioRol: perfil.rol,
                    modulo: "CÉDULAS",
                    accion: "VICTORIA POR DEFAULT",
                    descripcion:
                        textoResultadoDefault({
                            ...partido,
                            ...resultado
                        }) +
                        ". Motivo: " +
                        resultado.motivoDefault,
                    entidadTipo: "partidos",
                    entidadId: partidoEsperado.id,
                    entidadNombre:
                        (partido.localNombre || "Local") +
                        " vs " +
                        (partido.visitanteNombre || "Visitante"),
                    fecha
                }
            };
        }
    );
}

export function instalarDefaultCedula({
    partido,
    contenedor,
    hayIncidencias = () => false
}) {
    if (document.getElementById("dfPanel")) return;

    const elemento = (etiqueta, texto, padre) => {
        const nodo = document.createElement(etiqueta);

        if (texto) nodo.textContent = texto;
        if (padre) padre.append(nodo);

        return nodo;
    };

    const estilo = elemento("style", null, document.head);

    estilo.textContent = `
#dfPanel{background:#fff3d4;border:1px solid #c6a260;border-left:5px solid #a63627;border-radius:16px;padding:16px;margin:0 0 18px;color:#123f39;break-inside:avoid}
#dfPanel strong{display:block;font-size:1rem;margin-bottom:6px}
#dfPanel p{font-size:.82rem;line-height:1.5;margin:6px 0 12px}
#dfPanel button,#dfModal button{border:0;border-radius:10px;padding:13px 18px;font:inherit;cursor:pointer;background:#a63627;color:#fff;font-weight:700;min-height:44px}
#dfModal{position:fixed;inset:0;margin:auto;width:calc(100% - 28px);max-width:520px;max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:22px;border:1px solid #c6a260;border-radius:20px;background:#fff8e8;color:#123f39;box-shadow:0 24px 80px #001f1d55}
#dfModal::backdrop{background:#002d2bcc;backdrop-filter:blur(4px)}
#dfModal *{box-sizing:border-box}
#dfModal h2{font-size:1.25rem;margin:0 0 10px}
#dfModal p{font-size:.85rem;line-height:1.5;margin:10px 0}
#dfModal label{display:block;margin:16px 0 7px;font-weight:700}
#dfModal select,#dfModal textarea{width:100%;font:inherit;color:#123f39;border:1px solid #c6a260;border-radius:10px;background:#fffef8;padding:12px}
#dfModal textarea{min-height:90px;resize:vertical}
#dfModal footer{display:flex;gap:10px;margin-top:18px}
#dfModal footer button{flex:1}
#dfModal .dfCancelar{background:#e8d9af;color:#123f39}
#dfModal [role=alert]{color:#a63627;font-weight:700}
#dfModal button:disabled{opacity:.6;cursor:wait}
@media print{
    #dfPanel button,#dfModal{display:none!important}
    #dfPanel{margin:8px 0;background:white}
}
`;

    const panel = elemento("section");
    panel.id = "dfPanel";
    contenedor.prepend(panel);

    elemento(
        "strong",
        textoResultadoDefault(partido) ||
        "¿El partido no se disputó?",
        panel
    );

    if (partido.resueltoPorDefault === true) {
        elemento(
            "p",
            "Cédula cerrada por default. " +
            (partido.motivoDefault || "") +
            " · Sin goles ni incidencias de jugadores.",
            panel
        );

        return;
    }

    if (
        partido.resultadoRegistrado === true ||
        partido.cedulaCreada === true ||
        ["finalizado", "cancelado", "suspendido"].includes(
            partido.estado
        )
    ) {
        panel.remove();
        return;
    }

    elemento(
        "p",
        "Resuelve por default sin pase de lista, goles, tarjetas ni horarios de juego.",
        panel
    );

    const abrir = elemento(
        "button",
        "Resolver por default",
        panel
    );

    abrir.type = "button";

    const modal = elemento("dialog", null, document.body);
    modal.id = "dfModal";
    modal.setAttribute("aria-labelledby", "dfTitulo");

    elemento(
        "h2",
        "Victoria por default",
        modal
    ).id = "dfTitulo";

    elemento(
        "p",
        "La cédula quedará cerrada. El ganador recibe 3 puntos y el otro equipo registra una derrota. No se suman goles ni estadísticas de jugadores.",
        modal
    );

    const etiqueta = elemento(
        "label",
        "¿A qué equipo se le da la victoria?",
        modal
    );

    etiqueta.htmlFor = "dfGanador";

    const ganador = elemento("select", null, modal);
    ganador.id = "dfGanador";

    for (const [valor, texto] of [
        ["", "Selecciona el ganador"],
        ["local", partido.localNombre || "Local"],
        ["visitante", partido.visitanteNombre || "Visitante"]
    ]) {
        const opcion = elemento("option", texto, ganador);
        opcion.value = valor;
    }

    const etiquetaMotivo = elemento(
        "label",
        "Motivo del default",
        modal
    );

    etiquetaMotivo.htmlFor = "dfMotivo";

    const motivo = elemento("textarea", null, modal);
    motivo.id = "dfMotivo";
    motivo.maxLength = 600;
    motivo.placeholder =
        "Ejemplo: inasistencia a la reunión de programación, por disposición de la liga.";

    const error = elemento("p", "", modal);
    error.setAttribute("role", "alert");

    const acciones = elemento("footer", null, modal);

    const cancelar = elemento(
        "button",
        "Cancelar",
        acciones
    );

    cancelar.className = "dfCancelar";
    cancelar.type = "button";

    const confirmar = elemento(
        "button",
        "Confirmar y cerrar cédula",
        acciones
    );

    confirmar.type = "button";

    let guardando = false;

    abrir.onclick = () => {
        error.textContent = "";
        modal.showModal();
    };

    cancelar.onclick = () => modal.close();

    modal.addEventListener("cancel", evento => {
        if (guardando) evento.preventDefault();
    });

    confirmar.onclick = async () => {
        if (guardando) return;

        error.textContent = "";

        try {
            if (hayIncidencias()) {
                throw new Error(
                    "Hay goles, tarjetas o cambios capturados. Revisa la cédula antes de resolver por default."
                );
            }

            construirResultadoDefault(
                partido,
                ganador.value,
                motivo.value,
                "",
                "",
                null
            );

            guardando = true;
            confirmar.disabled = cancelar.disabled = true;
            confirmar.textContent = "Guardando...";

            await resolverDefault(
                partido,
                ganador.value,
                motivo.value
            );

            window.location.reload();
        } catch (problema) {
            error.textContent =
                problema.message ||
                "No se pudo guardar. Revisa tu conexión y vuelve a intentar.";

            guardando = false;
            confirmar.disabled = cancelar.disabled = false;
            confirmar.textContent = "Confirmar y cerrar cédula";
        }
    };
}
