import { doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db, auth } from "../firebase.js";
import { usuarioTieneRol } from "../permisosUsuario.js";

let promesaQr = null;

function cargarQr() {
    if (window.QRCode?.toCanvas) {
        return Promise.resolve();
    }

    if (promesaQr) {
        return promesaQr;
    }

    promesaQr = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "js/libs/qrcode.min.js";

        const timer = setTimeout(() => fallar(), 12000);

        function fallar() {
            clearTimeout(timer);
            script.remove();
            promesaQr = null;

            reject(
                new Error("No se pudo cargar el generador QR local. Revisa js/libs/qrcode.min.js.")
            );
        }

        script.onload = () => {
            clearTimeout(timer);

            window.QRCode?.toCanvas
                ? resolve()
                : fallar();
        };

        script.onerror = fallar;
        document.head.appendChild(script);
    });

    return promesaQr;
}

function nuevoToken() {
    return Array.from(
        crypto.getRandomValues(new Uint8Array(16)),
        valor => valor.toString(16).padStart(2, "0")
    ).join("");
}

async function registrarEmision(arbitro, temporada) {
    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error("Inicia sesión como administrador.");
    }

    const candidato = nuevoToken();

    return runTransaction(db, async transaccion => {
        const referencia = doc(db, "usuarios", arbitro.id);

        const [admin, snapshot] = await Promise.all([
            transaccion.get(doc(db, "usuarios", uid)),
            transaccion.get(referencia)
        ]);

        if (
            auth.currentUser?.uid !== uid ||
            !admin.exists() ||
            admin.data().rol !== "admin" ||
            admin.data().activo === false
        ) {
            throw new Error("Se requiere una sesión administradora activa.");
        }

        if (
            !snapshot.exists() ||
            !usuarioTieneRol(snapshot.data(), "arbitro") ||
            snapshot.data().activo === false
        ) {
            throw new Error("El árbitro debe tener una cuenta activa.");
        }

        const actual = snapshot.data();
        const datos = actual.documentacionArbitro || {};

        if (
            !/^https:\/\//.test(datos.fotoUrl || "") ||
            !/^https:\/\//.test(datos.curpPdfUrl || "") ||
            !/^[A-Z0-9]{18}$/.test(datos.curp || "")
        ) {
            throw new Error("El expediente arbitral está incompleto.");
        }

        if (
            Number(datos.version || 0) !==
                Number(arbitro.documentacionArbitro?.version || 0) ||
            String(actual.nombre || "") !==
                String(arbitro.nombre || "")
        ) {
            throw new Error("El expediente cambió. Actualiza los datos antes de generar la credencial.");
        }

        const token = actual.credencialArbitroToken || candidato;

        if (!/^[a-f0-9]{32}$/.test(token)) {
            throw new Error("El token de esta credencial tiene un formato diferente. Revisa el registro antes de continuar.");
        }

        const publica = doc(
            db,
            "credencialesArbitrosPublicas",
            token
        );

        const existente = await transaccion.get(publica);

        if (
            existente.exists() &&
            existente.data().tipo !== "arbitro"
        ) {
            throw new Error("Existe otro registro con este código. No se reemplazó.");
        }

        if (!actual.credencialArbitroToken) {
            transaccion.update(referencia, {
                credencialArbitroToken: token
            });
        }

        const folio = "AR-" + token.toUpperCase();

        transaccion.set(publica, {
            tipo: "arbitro",
            nombre: String(actual.nombre || "Árbitro")
                .trim()
                .toUpperCase(),
            folio,
            temporada: String(temporada),
            estado: "emitida",
            actualizadoEn: serverTimestamp()
        });

        return { token, folio };
    });
}

export async function prepararQrCredencialArbitro(
    tarjeta,
    arbitro,
    temporada
) {
    const canvas = tarjeta.querySelector(".ca-qr-canvas");

    if (!canvas) {
        throw new Error("Falta el espacio QR en la credencial.");
    }

    await cargarQr();

    const { token, folio } = await registrarEmision(
        arbitro,
        temporada
    );

    const url = new URL(
        "/verificarArbitro.html",
        "https://liga-formativa-rg.vercel.app"
    );

    url.searchParams.set("v", token);

    await new Promise((resolve, reject) => {
        window.QRCode.toCanvas(
            canvas,
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
    canvas.dataset.qrListo = "true";
}