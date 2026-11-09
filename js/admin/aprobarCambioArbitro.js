import { resolverCambio } from "../arbitro/coordinacionDatos.js";
export function aprobarCambioArbitro(datos) {
    return resolverCambio({...datos, aprobar:true});
}
export function rechazarCambioArbitro(datos) {
    return resolverCambio({...datos, aprobar:false});
}
