import { usuarioTieneRol } from "../permisosUsuario.js";

export const ESPERA_AUXILIAR = 12 * 60 * 60 * 1000;
export const MARGEN_CEDULA = 2 * 60 * 60 * 1000;
export function arbitroActivo(cuenta) {
    return Boolean(cuenta && cuenta.activo !== false && usuarioTieneRol(cuenta, "arbitro"));
}
export function esCoordinador(config, uid, cuenta, titular) {
    if (!arbitroActivo(cuenta)) return false;
    if (config.jefeArbitrosId === uid) return true;
    return Boolean(config.jefeArbitrosId && config.auxiliarJefeArbitrosId === uid &&
        config.auxiliarJefeArbitrosDe === config.jefeArbitrosId && arbitroActivo(titular));
}
export function millis(valor) {
    return valor?.toMillis?.() || 0;
}
export function disponibleDesde(config) {
    const ultima = millis(config.auxiliarJefeArbitrosAsignadoEn);
    return ultima ? ultima + ESPERA_AUXILIAR : 0;
}
export function esOficial(cedula) {
    return ["registrada", "enviada"].includes(cedula?.estado);
}
export function programacion(p) {
    return { arbitroId:p.arbitroId || null, fecha:p.fecha || "", hora:p.hora || "", campo:p.campo || "" };
}
export function validarProgramacion(p) {
    if (typeof p.fecha !== "string" || typeof p.hora !== "string" || typeof p.campo !== "string" ||
        !(p.arbitroId === null || (typeof p.arbitroId === "string" && p.arbitroId.length > 0)) || p.campo.length > 180) {
        throw new Error("La propuesta tiene datos inválidos. La sede admite hasta 180 caracteres.");
    }
    if (p.fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ||
        !Number.isFinite(Date.parse(p.fecha + "T00:00:00Z")) ||
        new Date(p.fecha + "T00:00:00Z").toISOString().slice(0,10) !== p.fecha)) {
        throw new Error("Indica una fecha válida.");
    }
    if (p.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.hora)) throw new Error("Indica una hora válida.");
    return p;
}
export function iguales(a,b) {
    return JSON.stringify(programacion(a)) === JSON.stringify(programacion(b));
}
export function propuestaSolicitud(s) {
    return s.versionProgramacion === 2 ? programacion(validarProgramacion(s.programacionPropuesta || {})) :
        validarProgramacion({...programacion(s),arbitroId:s.arbitroPropuestoId || null});
}
export function inicioPartido(p) {
    try {
        validarProgramacion(programacion(p));
        return p.fecha && p.hora ? Date.parse(p.fecha + "T" + p.hora + ":00-06:00") : NaN;
    } catch { return NaN; }
}
export function cedulaVencida(p, oficiales, ahora=Date.now()) {
    if (["cancelado","suspendido","aplazado","pospuesto"].includes(p.estado) ||
        oficiales.has(p.id) || p.resultadoRegistrado === true || p.resueltoPorDefault === true || p.tipoResultado === "default") return false;
    const inicio = inicioPartido(p);
    return Number.isFinite(inicio) && ahora >= inicio + MARGEN_CEDULA;
}
export function cambiosSolicitud(s) {
    const a = s.versionProgramacion === 2 ? s.programacionActual : {...programacion(s),arbitroId:s.arbitroActualId || null};
    const b = propuestaSolicitud(s);
    return [
        ["Árbitro",a.arbitroId,b.arbitroId,s.arbitroActualNombre,s.arbitroPropuestoNombre],
        ["Fecha",a.fecha,b.fecha], ["Hora",a.hora,b.hora], ["Sede",a.campo,b.campo]
    ].filter(([,antes,despues])=>antes!==despues).map(([campo,a,b,na,nb])=>
        `${campo}: ${na || a || "Pendiente"} → ${nb || b || "Pendiente"}`);
}
export function verificarConflictos(partido, propuesta, otros) {
    if (!propuesta.fecha || !propuesta.hora) return;
    for (const otro of otros) {
        if (otro.id === partido.id || otro.estado === "cancelado" || otro.fecha !== propuesta.fecha || otro.hora !== propuesta.hora) continue;
        if (propuesta.arbitroId && otro.arbitroId === propuesta.arbitroId) throw new Error("El árbitro ya tiene otro partido en esa fecha y hora.");
        if ([partido.localId,partido.visitanteId].filter(Boolean).some(id=>id===otro.localId || id===otro.visitanteId)) {
            throw new Error("Uno de los equipos ya tiene otro partido en esa fecha y hora.");
        }
    }
}
