import { collection, doc, getDocFromServer, getDocsFromServer, query, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { evaluarJugadorCategoria } from "./reglasParticipacion.js";
import { registrarJugadorCupo } from "./cuposPlantillaDatos.js";
import { esExcepcionFemenilPrestamo, normalizarCategoriaPrestamo } from "./jefeEquipo/reglasPrestamos.js";
import { normalizarSexoJugador } from "./jefeEquipo/jugadorRegistroUtilidades.js";

const normal = normalizarCategoriaPrestamo;
const femenil = nombre => ["FEMENIL PRIMARIA", "FEMENIL SECUNDARIA"].includes(normal(nombre));
const refJugador = id => doc(db, "jugadores", id);
const desde = s => s.exists() ? { ...s.data(), id: s.id } : null;

export function mismaCurp(jugador, curp) {
    return String(jugador.curp || "").trim().toUpperCase() === curp;
}

const idSecundario = id => "doble-femenil-" + id;

export function esParFemenil(registros) {
    if (registros.length !== 2) return false;
    const secundaria = registros.find(j => j.dobleInscripcionFemenil?.origenJugadorId);
    const origen = registros.find(j => j.id === secundaria?.dobleInscripcionFemenil?.origenJugadorId);
    return Boolean(origen && secundaria.id === idSecundario(origen.id) &&
        secundaria.dobleInscripcionFemenil.origenEquipoId === origen.equipoId &&
        origen.equipoId !== secundaria.equipoId && femenil(origen.categoriaNombreVisual || origen.categoriaNombre) &&
        esExcepcionFemenilPrestamo(origen, origen.categoriaNombreVisual || origen.categoriaNombre,
            secundaria.categoriaNombreVisual || secundaria.categoriaNombre) &&
        mismaCurp(secundaria, String(origen.curp || "").trim().toUpperCase()) &&
        fecha(origen.fechaNacimiento) && fecha(origen.fechaNacimiento) === fecha(secundaria.fechaNacimiento) &&
        normalizarSexoJugador(secundaria.sexo) === "mujer");
}

export async function registrosPorCurp(curp) {
    const s = await getDocsFromServer(query(collection(db, "jugadores"), where("curp", "==", curp)));
    return s.docs.map(desde);
}

function fecha(valor) {
    if (typeof valor === "string") return valor.trim();
    try { return valor?.toDate().toISOString().slice(0, 10) || ""; } catch { return ""; }
}

function clubDistinto(a, b) {
    const x = normal(a.clubId), y = normal(b.clubId);
    const nx = normal(a.clubNombre || a.nombre), ny = normal(b.clubNombre || b.nombre);
    return x && y ? x !== y : Boolean(nx && ny && nx !== ny);
}

export function validarDobleFemenil(origen, datos, equipoOrigen, equipoDestino, catOrigen, catDestino) {
    if (!origen || origen.activo === false || origen.dobleInscripcionFemenil ||
        !equipoOrigen || !equipoDestino || equipoOrigen.id === equipoDestino.id ||
        origen.equipoId !== equipoOrigen.id || equipoOrigen.activo === false || equipoDestino.activo === false ||
        !catOrigen || !catDestino || catOrigen.activo === false || catDestino.activo === false ||
        equipoOrigen.categoriaId !== catOrigen.id || equipoDestino.categoriaId !== catDestino.id ||
        (origen.categoriaId && origen.categoriaId !== catOrigen.id) ||
        !clubDistinto(equipoOrigen, equipoDestino) || !femenil(catOrigen.nombre) ||
        !esExcepcionFemenilPrestamo(origen, catOrigen.nombre, catDestino.nombre)) {
        throw Error("La CURP solo se puede repetir desde Femenil Primaria o Secundaria hacia una categoría compatible de otro club.");
    }
    if (!mismaCurp(origen, datos.curp) || normalizarSexoJugador(datos.sexo) !== "mujer" ||
        !fecha(origen.fechaNacimiento) || fecha(origen.fechaNacimiento) !== fecha(datos.fechaNacimiento)) {
        throw Error("La CURP, el sexo y la fecha de nacimiento deben coincidir con el registro de origen.");
    }
    for (const [jugadora, categoria] of [[origen, catOrigen], [datos, catDestino]]) {
        const edad = evaluarJugadorCategoria(jugadora, categoria);
        if (!edad.valido) throw Error(edad.mensaje);
    }
}

async function revisar(origen, datos, equipoId, leer) {
    if (!origen || !origen.equipoId || !equipoId) throw Error("No se pudo confirmar el equipo de origen.");
    const [eo, ed] = (await Promise.all([origen.equipoId, equipoId].map(id => leer(doc(db, "equipos", id))))).map(desde);
    if (!eo?.categoriaId || !ed?.categoriaId) throw Error("No se pudo confirmar la categoría de los equipos.");
    const [co, cd] = (await Promise.all([eo.categoriaId, ed.categoriaId].map(id => leer(doc(db, "categorias", id))))).map(desde);
    validarDobleFemenil(origen, datos, eo, ed, co, cd);
    return { equipo: eo.nombre || origen.equipoNombre, categoria: co.nombre };
}

export function revisarDobleFemenil(origen, datos, equipoId) {
    return revisar(origen, datos, equipoId, getDocFromServer);
}

export async function registrarDobleFemenil(origen, datos, uid) {
    if (!uid) throw Error("Inicia sesión para registrar la autorización.");
    let vinculacion;
    const ref = await registrarJugadorCupo(collection(db, "jugadores"), datos, {
        id: idSecundario(origen.id),
        preparar: async (tx, referencia, uidActual) => {
            if (uidActual !== uid) throw Error("La sesión cambió. Vuelve a abrir el formulario.");
            const [o, s] = await Promise.all([tx.get(refJugador(origen.id)), tx.get(referencia)]);
            if (s.exists()) throw Error("Ya existe un alta secundaria para esta jugadora. Solicita a la liga que revise su registro.");
            const actual = desde(o);
            const origenReal = await revisar(actual, datos, datos.equipoId, r => tx.get(r));
            const otros = (await registrosPorCurp(datos.curp)).filter(j => j.activo !== false);
            if (otros.length !== 1 || otros[0].id !== actual.id) throw Error("Los registros de esta CURP cambiaron. Actualiza la página y vuelve a intentar.");
            vinculacion = {
                origenJugadorId: actual.id, origenEquipoId: actual.equipoId,
                origenEquipoNombre: origenReal.equipo || "", origenCategoriaNombre: origenReal.categoria,
                autorizacionDeclaradaPor: uid, autorizacionDeclaradaEn: serverTimestamp()
            };
            return { ...datos, dobleInscripcionFemenil: vinculacion };
        }
    });
    return { id: ref.id, dobleInscripcionFemenil: vinculacion };
}

export async function validarEdicionCurp(actual, datos) {
    const identidad = ["curp", "sexo", "fechaNacimiento"].some(k =>
        Object.prototype.hasOwnProperty.call(datos, k) && (k === "fechaNacimiento"
            ? fecha(datos[k]) !== fecha(actual[k])
            : normal(datos[k]) !== normal(actual[k])));
    if (!identidad) return;
    if (actual.dobleInscripcionFemenil || (await getDocFromServer(refJugador(idSecundario(actual.id)))).exists()) {
        throw Error("La CURP, el sexo y el nacimiento de un registro vinculado deben revisarse con la liga en ambos expedientes.");
    }
    if (datos.curp && !mismaCurp(actual, datos.curp) &&
        (await registrosPorCurp(datos.curp)).some(j => j.activo !== false && j.id !== actual.id)) {
        throw Error("Ya existe otro registro activo con esa CURP.");
    }
}
