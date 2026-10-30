import {
    collection, query, where, getDocs, doc, getDoc,
    runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina, usuarioTieneRol } from "../roles.js";

async function consultarArbitrosDesignacion() {
    const referencia = collection(db, "usuarios");

    const resultados = await Promise.all([
        getDocs(
            query(
                referencia,
                where("rol", "==", "arbitro")
            )
        ),
        getDocs(
            query(
                referencia,
                where("roles", "array-contains", "arbitro")
            )
        )
    ]);

    const unicos = new Map();

    for (const resultado of resultados) {
        for (const documento of resultado.docs) {
            if (usuarioTieneRol(documento.data(), "arbitro")) {
                unicos.set(documento.id, documento);
            }
        }
    }

    return {
        docs: [...unicos.values()]
    };
}

async function guardarDesignacion(adminUid, arbitroId) {
    return runTransaction(db, async transaccion => {
        const adminSnapshot = await transaccion.get(
            doc(db, "usuarios", adminUid)
        );

        if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().rol !== "admin" ||
            adminSnapshot.data().activo === false
        ) {
            throw new Error("La cuenta debe ser de un administrador activo.");
        }

        let nombre = "";

        if (arbitroId) {
            const arbitroSnapshot = await transaccion.get(
                doc(db, "usuarios", arbitroId)
            );

            if (
                !arbitroSnapshot.exists() ||
                !usuarioTieneRol(arbitroSnapshot.data(), "arbitro") ||
                arbitroSnapshot.data().activo === false
            ) {
                throw new Error(
                    "El árbitro seleccionado ya no está disponible. Recarga la página."
                );
            }

            nombre = String(
                arbitroSnapshot.data().nombre || "Árbitro"
            ).trim();
        }

        transaccion.set(
            doc(db, "configuracionLiga", "general"),
            {
                jefeArbitrosId: arbitroId || null,
                jefeArbitrosNombre: nombre,
                jefeArbitrosActualizadoEn: serverTimestamp(),
                jefeArbitrosActualizadoPor: adminUid
            },
            { merge: true }
        );

        return nombre;
    });
}

async function iniciar() {
    const usuario = await protegerPagina(["admin"]);

    if (!usuario) return;

    const contenedor = document.querySelector(".arbitros-contenido");

    if (
        !contenedor ||
        document.getElementById("configuracionJefeArbitros")
    ) {
        return;
    }

    const estilos = document.createElement("style");

    estilos.textContent = `
        .jefe-arbitros-config {
            margin:18px 0;
            padding:18px;
            border:1px solid #cbd5d1;
            border-radius:16px;
            background:#fff8e8;
        }
        .jefe-arbitros-config h2 {
            margin:0 0 8px;
            color:#07574f;
            font-size:1rem;
        }
        .jefe-arbitros-config p {
            font-size:.8rem;
            line-height:1.5;
        }
        .jefe-arbitros-campos {
            display:flex;
            gap:10px;
            align-items:flex-end;
            flex-wrap:wrap;
        }
        .jefe-arbitros-campos label {
            flex:1;
            min-width:0;
            font-size:.8rem;
            font-weight:700;
        }
        .jefe-arbitros-campos select {
            display:block;
            width:100%;
            min-height:46px;
            margin-top:6px;
            padding:10px;
            border:1px solid #bba87b;
            border-radius:10px;
            background:white;
            color:#102b28;
            font:inherit;
        }
        .jefe-arbitros-campos button {
            min-height:46px;
            padding:10px 16px;
            border:0;
            border-radius:10px;
            background:#0b756d;
            color:white;
            font-weight:800;
            cursor:pointer;
        }
        .jefe-arbitros-campos button:disabled {
            opacity:.6;
            cursor:default;
        }
        .jefe-arbitros-estado {
            margin:12px 0 0;
            color:#07574f;
        }
        @media(max-width:600px) {
            .jefe-arbitros-campos {
                flex-direction:column;
                align-items:stretch;
            }
            .jefe-arbitros-campos label {
                width:100%;
            }
        }
    `;

    document.head.appendChild(estilos);

    const bloque = document.createElement("section");
    bloque.id = "configuracionJefeArbitros";
    bloque.className = "jefe-arbitros-config";

    bloque.innerHTML = `
        <h2>Jefe de árbitros</h2>
        <p>
            Designa al árbitro responsable de la coordinación arbitral.
            Conserva su rol de árbitro.
        </p>
        <div class="jefe-arbitros-campos">
            <label>
                Árbitro designado
                <select id="seleccionarJefeArbitros" disabled></select>
            </label>
            <button type="button" id="guardarJefeArbitros" disabled>
                Guardar designación
            </button>
        </div>
        <p
            class="jefe-arbitros-estado"
            role="status"
            aria-live="polite"
        >
            Cargando árbitros...
        </p>
    `;

    const resumen = contenedor.querySelector(".resumen-arbitros");

    if (resumen) {
        contenedor.insertBefore(bloque, resumen);
    } else {
        contenedor.appendChild(bloque);
    }

    const selector = bloque.querySelector("select");
    const guardar = bloque.querySelector("button");
    const estado = bloque.querySelector('[role="status"]');

    try {
        const [usuariosSnapshot, configuracionSnapshot] = await Promise.all([
            consultarArbitrosDesignacion(),
            getDoc(doc(db, "configuracionLiga", "general"))
        ]);

        const arbitros = usuariosSnapshot.docs
            .map(documento => ({
                ...documento.data(),
                id: documento.id
            }))
            .filter(arbitro => arbitro.activo !== false)
            .sort((a, b) =>
                String(a.nombre || "").localeCompare(
                    String(b.nombre || ""),
                    "es"
                )
            );

        const configuracion = configuracionSnapshot.exists()
            ? configuracionSnapshot.data() : {};

        const sinJefe = document.createElement("option");
        sinJefe.value = "";
        sinJefe.textContent = "Sin jefe de árbitros designado";
        selector.appendChild(sinJefe);

        arbitros.forEach(arbitro => {
            const opcion = document.createElement("option");
            opcion.value = arbitro.id;
            opcion.textContent = `${arbitro.nombre || "Árbitro"}${arbitro.email ? " · " + arbitro.email : ""}`;
            selector.appendChild(opcion);
        });

        const actualId = configuracion.jefeArbitrosId || "";

        if (
            actualId &&
            !arbitros.some(arbitro => arbitro.id === actualId)
        ) {
            const anterior = document.createElement("option");
            anterior.value = actualId;
            anterior.textContent = `${configuracion.jefeArbitrosNombre || "Árbitro anterior"} · No disponible`;
            anterior.disabled = true;
            selector.appendChild(anterior);
        }

        selector.value = actualId;
        selector.disabled = false;
        guardar.disabled = false;

        estado.textContent = actualId
            ? `Designación actual: ${configuracion.jefeArbitrosNombre || "Árbitro"}.`
            : "Todavía no hay un jefe de árbitros designado.";

        guardar.addEventListener("click", async () => {
            if (guardar.disabled) return;

            const elegido = selector.value;
            guardar.disabled = true;
            selector.disabled = true;
            estado.textContent = "Guardando designación...";

            try {
                const uid = usuario.firebaseUser?.uid || usuario.uid;

                if (!uid) {
                    throw new Error(
                        "No se pudo verificar la cuenta administradora."
                    );
                }

                const nombre = await guardarDesignacion(uid, elegido);

                estado.textContent = elegido
                    ? `Jefe de árbitros guardado: ${nombre}.`
                    : "Se retiró la designación del jefe de árbitros.";
            } catch (error) {
                console.error("Error guardando jefe de árbitros:", error);
                estado.textContent = error.message ||
                    "No se pudo guardar la designación.";
            } finally {
                guardar.disabled = false;
                selector.disabled = false;
            }
        });
    } catch (error) {
        console.error("Error cargando jefe de árbitros:", error);
        estado.textContent =
            "No se pudo cargar la configuración. Recarga la página para intentarlo nuevamente.";
    }
}

await iniciar();