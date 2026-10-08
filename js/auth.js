
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

const btnLogin = document.getElementById("btnLogin");
const btnRegistro = document.getElementById("btnRegistro");
const formLogin = document.getElementById("formLogin");
const formRegistro = document.getElementById("formRegistro");
const btnGoogle = document.getElementById("btnGoogle");
const mensaje = document.getElementById("mensaje");

const modalNombre = document.getElementById("modalNombre");
const formNombre = document.getElementById("formNombre");
const nombreCompleto = document.getElementById("nombreCompleto");
const mensajeNombre = document.getElementById("mensajeNombre");
const btnGuardarNombre = document.getElementById("btnGuardarNombre");

let usuarioPendiente = null;
let uidProcesando = null;
let promesaProcesamiento = null;

function normalizarNombre(valor) {
    return String(valor || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleUpperCase("es-MX");
}

function validarNombre(valor) {
    const nombre = normalizarNombre(valor);
    const palabras = nombre.split(" ").filter(Boolean);

    if (!nombre) {
        return {
            valido: false,
            nombre,
            mensaje: "Escribe tu nombre completo."
        };
    }

    if (nombre.length < 12) {
        return {
            valido: false,
            nombre,
            mensaje: "Tu nombre completo debe tener al menos 12 caracteres."
        };
    }

    if (palabras.length < 3) {
        return {
            valido: false,
            nombre,
            mensaje: "Escribe tu nombre completo con al menos 3 palabras."
        };
    }

    if (!/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u.test(nombre)) {
        return {
            valido: false,
            nombre,
            mensaje: "El nombre solo puede contener letras, espacios, apóstrofes o guiones."
        };
    }

    return {
        valido: true,
        nombre,
        mensaje: ""
    };
}

function mostrarMensajeNombre(texto, tipo = "error") {
    mensajeNombre.textContent = texto;

    mensajeNombre.style.color =
        tipo === "exito"
            ? "#067647"
            : tipo === "normal"
                ? "#667085"
                : "#b42318";
}

function actualizarCampoNombre() {
    const resultado = validarNombre(nombreCompleto.value);

    nombreCompleto.setCustomValidity(
        resultado.valido ? "" : resultado.mensaje
    );

    return resultado;
}

btnLogin.addEventListener("click", () => {
    formLogin.classList.remove("hidden");
    formRegistro.classList.add("hidden");

    btnLogin.classList.add("active");
    btnRegistro.classList.remove("active");

    limpiarMensaje();
});

btnRegistro.addEventListener("click", () => {
    formRegistro.classList.remove("hidden");
    formLogin.classList.add("hidden");

    btnRegistro.classList.add("active");
    btnLogin.classList.remove("active");

    limpiarMensaje();
});

formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document
        .getElementById("loginEmail")
        .value
        .trim();

    const password = document
        .getElementById("loginPassword")
        .value;

    mostrarMensaje("Iniciando sesión...", "normal");

    try {
        const credencial = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        await procesarUsuario(credencial.user);
    } catch (error) {
        manejarErrorFirebase(error);
    }
});

formRegistro.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document
        .getElementById("registroEmail")
        .value
        .trim();

    const password = document
        .getElementById("registroPassword")
        .value;

    const passwordConfirmar = document
        .getElementById("registroPasswordConfirmar")
        .value;

    if (password !== passwordConfirmar) {
        mostrarMensaje(
            "Las contraseñas no coinciden.",
            "error"
        );
        return;
    }

    if (password.length < 6) {
        mostrarMensaje(
            "La contraseña debe tener al menos 6 caracteres.",
            "error"
        );
        return;
    }

    mostrarMensaje("Creando tu cuenta...", "normal");

    try {
        const credencial = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await procesarUsuario(credencial.user);
    } catch (error) {
        manejarErrorFirebase(error);
    }
});

btnGoogle.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
        prompt: "select_account"
    });

    mostrarMensaje("Conectando con Google...", "normal");

    try {
        const resultado = await signInWithPopup(
            auth,
            provider
        );

        await procesarUsuario(resultado.user);
    } catch (error) {
        manejarErrorFirebase(error);
    }
});

formNombre.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!usuarioPendiente) {
        mostrarMensajeNombre(
            "No pudimos identificar tu sesión."
        );
        return;
    }

    const resultado = actualizarCampoNombre();

    nombreCompleto.value = resultado.nombre;

    if (!resultado.valido) {
        mostrarMensajeNombre(resultado.mensaje);
        nombreCompleto.reportValidity();
        nombreCompleto.focus();
        return;
    }

    bloquearBotonNombre(true);

    mostrarMensajeNombre(
        "Guardando información...",
        "normal"
    );

    try {
        const referenciaUsuario = doc(
            db,
            "usuarios",
            usuarioPendiente.uid
        );

        await setDoc(
            referenciaUsuario,
            {
                uid: usuarioPendiente.uid,
                nombre: resultado.nombre,
                email: usuarioPendiente.email || "",
                rol: "publico",
                activo: true,
                creadoEn: serverTimestamp()
            }
        );

        mostrarMensajeNombre(
            "Registro completado correctamente.",
            "exito"
        );

        setTimeout(() => {
            redirigirPorRol("publico");
        }, 500);
    } catch (error) {
        console.error(error);

        mostrarMensajeNombre(
            "No pudimos guardar tu información. Intenta nuevamente."
        );

        bloquearBotonNombre(false);
    }
});

function procesarUsuario(usuario) {
    if (!usuario) {
        return Promise.resolve();
    }

    if (
        uidProcesando === usuario.uid &&
        promesaProcesamiento
    ) {
        return promesaProcesamiento;
    }

    uidProcesando = usuario.uid;

    promesaProcesamiento = comprobarUsuario(usuario);

    return promesaProcesamiento;
}

async function comprobarUsuario(usuario) {
    const referenciaUsuario = doc(
        db,
        "usuarios",
        usuario.uid
    );

    try {
        const documento = await getDoc(referenciaUsuario);

        if (!documento.exists()) {
            usuarioPendiente = usuario;

            limpiarMensaje();

            abrirModalNombre(
                usuario.displayName || ""
            );

            return;
        }

        const datos = documento.data();

        if (datos.activo === false) {
            await signOut(auth);

            mostrarMensaje(
                "Tu cuenta se encuentra deshabilitada. Contacta a la administración.",
                "error"
            );

            return;
        }

        const rol = datos.rol || "publico";

        redirigirPorRol(rol);
    } catch (error) {
        console.error(error);

        mostrarMensaje(
            "No pudimos verificar tu información.",
            "error"
        );
    }
}

function redirigirPorRol(rol) {
    switch (rol) {
        case "admin":
            window.location.href = "admin.html";
            break;

        case "arbitro":
            window.location.href = "arbitro.html";
            break;

        case "jefeEquipo":
            window.location.href = "jefeEquipo.html";
            break;

        case "publico":
        default:
            window.location.href = "publico.html";
            break;
    }
}

function abrirModalNombre(nombreGoogle = "") {
    modalNombre.classList.remove("hidden");

    document.body.style.overflow = "hidden";

    nombreCompleto.value = normalizarNombre(nombreGoogle);

    nombreCompleto.setCustomValidity("");

    mensajeNombre.textContent = "";

    bloquearBotonNombre(false);

    setTimeout(() => {
        nombreCompleto.focus();
        nombreCompleto.select();
    }, 100);
}

function bloquearBotonNombre(bloquear) {
    btnGuardarNombre.disabled = bloquear;

    const textoBoton = btnGuardarNombre.querySelector("span");

    if (textoBoton) {
        textoBoton.textContent = bloquear
            ? "Guardando..."
            : "Guardar y continuar";
    } else {
        btnGuardarNombre.textContent = bloquear
            ? "Guardando..."
            : "Guardar y continuar";
    }
}

function mostrarMensaje(texto, tipo = "normal") {
    mensaje.textContent = texto;

    if (tipo === "error") {
        mensaje.style.color = "#b42318";
        return;
    }

    if (tipo === "exito") {
        mensaje.style.color = "#067647";
        return;
    }

    mensaje.style.color = "#667085";
}

function limpiarMensaje() {
    mensaje.textContent = "";
    mensajeNombre.textContent = "";
}

function manejarErrorFirebase(error) {
    console.error(error);

    let texto = "Ocurrió un error. Intenta nuevamente.";

    switch (error.code) {
        case "auth/invalid-credential":
            texto = "Correo o contraseña incorrectos.";
            break;

        case "auth/user-not-found":
            texto = "No existe una cuenta con este correo.";
            break;

        case "auth/wrong-password":
            texto = "La contraseña es incorrecta.";
            break;

        case "auth/email-already-in-use":
            texto = "Ya existe una cuenta registrada con este correo.";
            break;

        case "auth/invalid-email":
            texto = "El correo electrónico no es válido.";
            break;

        case "auth/weak-password":
            texto = "La contraseña es demasiado débil.";
            break;

        case "auth/popup-closed-by-user":
            texto = "Se cerró la ventana de Google antes de completar el acceso.";
            break;

        case "auth/popup-blocked":
            texto = "El navegador bloqueó la ventana de Google.";
            break;

        case "auth/network-request-failed":
            texto = "Revisa tu conexión a internet.";
            break;

        case "permission-denied":
            texto = "No tienes permisos para guardar esta información.";
            break;
    }

    mostrarMensaje(texto, "error");
}

onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
        usuarioPendiente = null;
        uidProcesando = null;
        promesaProcesamiento = null;
        return;
    }

    await procesarUsuario(usuario);
});
