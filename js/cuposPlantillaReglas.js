const normal=v=>String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
export function esSuperBebe(equipo={},categoria={}) {
    return [categoria.nombre,equipo.categoriaNombreCupo,equipo.categoriaNombre,equipo.categoriaTexto,equipo.categoria?.nombre,typeof equipo.categoria==="string"?equipo.categoria:""].some(v=>normal(v)==="superbebe");
}
export function maximoGeneral(config={}) {
    const n=Number(config.maximoJugadores);
    return Number.isInteger(n) && n>0?n:35;
}
export function limitePlantillaEquipo(equipo={},config={}) {
    return maximoGeneral(config);
}
export function cupoAlCerrar(equipo,cantidad,config={},categoria={}) {
    if(esSuperBebe(equipo,categoria))return 35;
    const autorizado=Number(equipo.cupoAutorizadoAdmin || 0);
    return Math.max(cantidad,Number.isInteger(autorizado)?Math.min(maximoGeneral(config),Math.max(0,autorizado)):0);
}
export function validarNuevoCupo(equipo,config,categoria,cantidad,nuevo) {
    if(config.inscripcionesAbiertas===false)throw new Error("Abre las inscripciones antes de modificar cupos.");
    if(esSuperBebe(equipo,categoria))throw new Error("Súper Bebé conserva siempre su máximo de 35 jugadores.");
    if(!Number.isInteger(nuevo) || nuevo<cantidad || nuevo>maximoGeneral(config))throw new Error("El cupo debe ser entero, no menor a los jugadores activos y no mayor a "+maximoGeneral(config)+".");
    return nuevo;
}
