import { doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db, auth } from "../firebase.js";

let promesa = null;

function cargarQr() {
    if (window.QRCode?.toCanvas) return Promise.resolve();
    if (promesa) return promesa;

    promesa = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "js/libs/qrcode.min.js";
        const timer = setTimeout(fallar, 12000);

        function fallar() {
            clearTimeout(timer);
            script.remove();
            promesa = null;
            reject(new Error("No se pudo cargar js/libs/qrcode.min.js."));
        }

        script.onload = () => {
            clearTimeout(timer);
            window.QRCode?.toCanvas ? resolve() : fallar();
        };

        script.onerror = fallar;
        document.head.appendChild(script);
    });

    return promesa;
}

function tokenNuevo() {
    return Array.from(
        crypto.getRandomValues(new Uint8Array(16)),
        n => n.toString(16).padStart(2, "0")
    ).join("");
}

function activo(equipo) {
    return equipo.activo !== false &&
        equipo.descalificado !== true &&
        !["inactivo", "descalificado"].includes(
            String(equipo.estado || "").toLowerCase()
        );
}

function claveClub(equipo) {
    return equipo.clubId
        ? "club_" + equipo.clubId
        : "equipo_" + equipo.id;
}

async function registrar(registro, temporada) {
    if (
        !["director", "auxiliar"].includes(registro.tipo) ||
        !registro.equipos?.length ||
        (
            registro.tipo === "auxiliar" &&
            registro.equipos.length !== 1
        )
    ) {
        throw new Error("La credencial no tiene una asignación válida.");
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error("Inicia sesión como administrador.");
    }

    const candidato = tokenNuevo();

    return runTransaction(db, async tx => {
        const responsableRef = doc(
            db,
            "usuarios",
            registro.responsableId
        );

        const referencias = registro.equipos.map(
            equipo => doc(db, "equipos", equipo.id)
        );

        const snapshots = await Promise.all([
            tx.get(doc(db, "usuarios", uid)),
            tx.get(responsableRef),
            ...referencias.map(ref => tx.get(ref))
        ]);

        const [admin, responsable, ...equiposSnapshot] = snapshots;

        if (
            auth.currentUser?.uid !== uid ||
            !admin.exists() ||
            admin.data().rol !== "admin" ||
            admin.data().activo === false
        ) {
            throw new Error("Se requiere una sesión administradora activa.");
        }

        if (
            !responsable.exists() ||
            responsable.data().rol !== "jefeEquipo" ||
            responsable.data().activo === false
        ) {
            throw new Error("El Director Técnico no tiene una cuenta activa.");
        }

        const equipos = equiposSnapshot.map((snapshot, i) => {
            if (!snapshot.exists()) {
                throw new Error("Un equipo dejó de existir. Actualiza la lista.");
            }

            const actual = {
                ...snapshot.data(),
                id: snapshot.id
            };

            const anterior = registro.equipos[i];

            if (
                !activo(actual) ||
                actual.responsableId !== registro.responsableId ||
                actual.categoriaId !== anterior.categoriaId ||
                String(actual.categoriaNombre || "") !==
                    String(anterior.categoriaNombre || "") ||
                String(actual.nombre || "") !==
                    String(anterior.nombre || "") ||
                String(actual.clubNombre || "") !==
                    String(anterior.clubNombre || "") ||
                claveClub(actual) !== claveClub(anterior)
            ) {
                throw new Error("Las asignaciones cambiaron. Actualiza la lista antes de imprimir.");
            }

            return actual;
        });

        if (
            registro.tipo === "director" &&
            equipos.some(
                equipo => claveClub(equipo) !== registro.clave
            )
        ) {
            throw new Error("Las categorías pertenecen a clubes diferentes.");
        }

        const categorias = [
            ...new Set(
                equipos.map(
                    equipo => String(equipo.categoriaNombre || "").trim()
                ).filter(Boolean)
            )
        ];

        if (
            JSON.stringify([...categorias].sort()) !==
            JSON.stringify([...registro.categorias].sort())
        ) {
            throw new Error("Las categorías de la credencial no coinciden con las asignaciones.");
        }

        const cuenta = responsable.data();

        const datos = registro.tipo === "director"
            ? cuenta.documentacionJefeEquipo || {}
            : equipos[0].auxiliarTecnico || {};

        const nombre = registro.tipo === "director"
            ? cuenta.nombre || cuenta.nombreCompleto || "Director Técnico"
            : datos.nombre || "Auxiliar Técnico";

        if (
            Number(datos.version || 0) !== registro.version ||
            String(nombre).trim().toUpperCase() !== registro.nombre ||
            !/^https:\/\//.test(datos.fotoUrl || "") ||
            !/^https:\/\//.test(datos.curpPdfUrl || "") ||
            !/^[A-Z0-9]{18}$/.test(datos.curp || "")
        ) {
            throw new Error("El expediente cambió o está incompleto. Actualiza la lista.");
        }

        const mapa = cuenta.credencialesCuerpoTecnico || {};

        const anterior = registro.tipo === "director"
            ? mapa[registro.clave]
            : datos.credencialToken;

        const reutilizar = registro.tipo === "director" ||
            Number(datos.credencialVersion) ===
                Number(datos.version || 0);

        const token = anterior && reutilizar
            ? anterior
            : candidato;

        if (!/^[a-f0-9]{32}$/.test(token)) {
            throw new Error("El código existente tiene un formato diferente. Revisa el registro.");
        }

        const publicaRef = doc(
            db,
            "credencialesTecnicasPublicas",
            token
        );

        const publica = await tx.get(publicaRef);

        if (
            publica.exists() &&
            publica.data().tipo !== registro.tipo
        ) {
            throw new Error("Existe otra credencial con este código.");
        }

        let anteriorRef = null;

        if (
            anterior &&
            anterior !== token &&
            /^[a-f0-9]{32}$/.test(anterior)
        ) {
            anteriorRef = doc(
                db,
                "credencialesTecnicasPublicas",
                anterior
            );

            await tx.get(anteriorRef);
        }

        if (registro.tipo === "director") {
            if (!anterior) {
                tx.update(responsableRef, {
                    credencialesCuerpoTecnico: {
                        ...mapa,
                        [registro.clave]: token
                    }
                });
            }
        } else if (anterior !== token || !reutilizar) {
            tx.update(referencias[0], {
                "auxiliarTecnico.credencialToken": token,
                "auxiliarTecnico.credencialVersion":
                    Number(datos.version || 0)
            });
        }

        if (anteriorRef) {
            tx.set(
                anteriorRef,
                {
                    estado: "reemplazada",
                    actualizadoEn: serverTimestamp()
                },
                { merge: true }
            );
        }

        const folio =
            (registro.tipo === "director" ? "DT-" : "AT-") +
            token.toUpperCase();

        tx.set(publicaRef, {
            tipo: registro.tipo,
            nombre: registro.nombre,
            cargo: registro.cargo,
            equipo: registro.equipoNombre,
            categorias: registro.categorias,
            temporada: String(temporada),
            folio,
            estado: "emitida",
            actualizadoEn: serverTimestamp()
        });

        return { token, folio };
    });
}

export async function prepararQrTecnico(
    tarjeta,
    registro,
    temporada
) {
    await cargarQr();

    const { token, folio } = await registrar(
        registro,
        temporada
    );

    const url = new URL(
        "/verificarTecnico.html",
        "https://liga-formativa-rg.vercel.app"
    );

    url.searchParams.set("v", token);

    await new Promise((resolve, reject) => {
        window.QRCode.toCanvas(
            tarjeta.querySelector("canvas"),
            url.href,
            {
                width: 300,
                margin: 4,
                errorCorrectionLevel: "M",
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                }
            },
            error => error ? reject(error) : resolve()
        );
    });

    tarjeta.querySelector(".ca-folio").textContent = folio;
}