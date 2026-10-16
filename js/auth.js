
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    linkWithCredential,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import { crearPerfilSinDuplicados, normalizarCorreoRegistro, prepararIndiceRegistro } from "./identidadRegistro.js";

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
let accesoEnCurso = false;
let guardandoPerfil = false;
let credencialGooglePendiente = null;
let correoGooglePendiente = "";
let overflowAnterior = null;

async function ejecutarAcceso(accion) {
    if (accesoEnCurso) return;

    accesoEnCurso = true;

    const botones = [
        ...document.querySelectorAll(
            "#formLogin button, #formRegistro button, #btnGoogle"
        )
    ];

    const estados = botones.map(boton => boton.disabled);

    botones.forEach(boton => {
        boton.disabled = true;
    });

    try {
        await accion();
    } catch (error) {
        manejarErrorFirebase(error);
    } finally {
        accesoEnCurso = false;

        botones.forEach((boton, i) => {
            boton.disabled = estados[i];
        });
    }
}

function cerrarModalNombre() {
    modalNombre.classList.add("hidden");

    if (overflowAnterior !== null) {
        document.body.style.overflow = overflowAnterior;
    }

    overflowAnterior = null;
}
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

formLogin.addEventListener("submit", event => {
    event.preventDefault();

    ejecutarAcceso(async () => {
        const email = normalizarCorreoRegistro(
            document.getElementById("loginEmail").value
        );

        const password = document.getElementById("loginPassword").value;

        if (
            credencialGooglePendiente &&
            email !== correoGooglePendiente
        ) {
            throw new Error(
                "Inicia sesion con el correo que elegiste en Google o vuelve a seleccionar una cuenta de Google."
            );
        }

        mostrarMensaje("Iniciando sesion...", "normal");

        const credencial = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        if (credencialGooglePendiente) {
            try {
                await linkWithCredential(
                    credencial.user,
                    credencialGooglePendiente
                );

                credencialGooglePendiente = null;
                correoGooglePendiente = "";
            } catch (error) {
                await signOut(auth);
                throw error;
            }
        }

        await procesarUsuario(credencial.user);
    });
});

formRegistro.addEventListener("submit", event => {
    event.preventDefault();

    ejecutarAcceso(async () => {
        const email = normalizarCorreoRegistro(
            document.getElementById("registroEmail").value
        );

        const password = document.getElementById("registroPassword").value;
        const confirmar = document.getElementById("registroPasswordConfirmar").value;

        if (password !== confirmar) {
            throw new Error("Las contrasenas no coinciden.");
        }

        if (password.length < 6) {
            throw new Error(
                "La contrasena debe tener al menos 6 caracteres."
            );
        }

        if (credencialGooglePendiente) {
            throw new Error(
                "Primero ingresa con tu cuenta existente para vincular Google."
            );
        }

        mostrarMensaje("Creando tu cuenta...", "normal");

        const credencial = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await procesarUsuario(credencial.user);
    });
});

btnGoogle.addEventListener("click", () => {
    ejecutarAcceso(async () => {
        credencialGooglePendiente = null;
        correoGooglePendiente = "";

        const provider = new GoogleAuthProvider();

        provider.setCustomParameters({
            prompt: "select_account"
        });

        mostrarMensaje("Conectando con Google...", "normal");

        try {
            const resultado = await signInWithPopup(auth, provider);
            await procesarUsuario(resultado.user);
        } catch (error) {
            if (
                error.code !== "auth/account-exists-with-different-credential"
            ) {
                throw error;
            }

            const pendiente = GoogleAuthProvider.credentialFromError(error);
            const email = normalizarCorreoRegistro(error.customData?.email);

            if (!pendiente || !email) throw error;

            credencialGooglePendiente = pendiente;
            correoGooglePendiente = email;

            btnLogin.click();

            document.getElementById("loginEmail").value = email;
            document.getElementById("loginPassword").focus();

            mostrarMensaje(
                "Este correo ya tiene una cuenta. Escribe su contrasena para acceder y vincular Google. Si utilizaste otro metodo, ingresa con ese metodo primero.",
                "normal"
            );
        }
    });
});

formNombre.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (guardandoPerfil) return;

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

    guardandoPerfil = true;
    bloquearBotonNombre(true);

    mostrarMensajeNombre(
        "Guardando información...",
        "normal"
    );

    try {
        const usuario = usuarioPendiente;

        const perfil = await crearPerfilSinDuplicados(
            usuario,
            resultado.nombre
        );

        if (auth.currentUser?.uid !== usuario.uid) {
            throw new Error("Tu sesion cambio. Vuelve a ingresar.");
        }

        mostrarMensajeNombre(
            "Registro completado correctamente.",
            "exito"
        );

        setTimeout(() => {
            if (auth.currentUser?.uid === usuario.uid) redirigirPorRol(perfil.rol || "publico");
        }, 500);
    } catch (error) {
        console.error(error);

        mostrarMensajeNombre(
            error.code?.startsWith("registro/") ? error.message : "No pudimos guardar tu informacion. Revisa tu conexion e intenta nuevamente."
        );

        bloquearBotonNombre(false);
    } finally {
        guardandoPerfil = false;
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

    promesaProcesamiento = comprobarUsuario(usuario).finally(() => {
        if (uidProcesando === usuario.uid) {
            uidProcesando = null;
            promesaProcesamiento = null;
        }
    });

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
        if (auth.currentUser?.uid !== usuario.uid) return;

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

        if (rol === "admin") {
            mostrarMensaje("Preparando proteccion de registros...", "normal");
            await prepararIndiceRegistro();

            if (auth.currentUser?.uid !== usuario.uid) return;
        }

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
    if (modalNombre.classList.contains("hidden")) {
        overflowAnterior = document.body.style.overflow;
    }

    modalNombre.classList.remove("hidden");

    if (!document.getElementById("btnVolverAcceso")) {
        const volver = document.createElement("button");

        volver.id = "btnVolverAcceso";
        volver.type = "button";
        volver.className = "btn-google";
        volver.textContent = "Volver al acceso";

        volver.addEventListener("click", async () => {
            if (guardandoPerfil || accesoEnCurso) return;

            volver.disabled = true;

            try {
                await signOut(auth);
                cerrarModalNombre();
                btnLogin.click();
            } catch (error) {
                mostrarMensajeNombre(
                    "No pudimos cerrar la sesion. Intenta nuevamente."
                );
            } finally {
                volver.disabled = false;
            }
        });

        formNombre.after(volver);
    }

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

    let texto = error.code ? "Ocurrio un error. Intenta nuevamente." : error.message || "Intenta nuevamente.";

    switch (error.code) {
        case "auth/account-exists-with-different-credential":
            texto = "Este correo ya tiene una cuenta con otro metodo de acceso. Ingresa con tu cuenta original.";
            break;

        case "auth/credential-already-in-use":
            texto = "Google ya esta vinculado a otra cuenta. Contacta a la administracion para revisar los registros.";
            break;

        case "auth/too-many-requests":
            texto = "Hubo demasiados intentos. Espera antes de volver a ingresar.";
            break;

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
            texto = "Ya existe una cuenta con este correo. Ingresa con tu contrasena o con Google si ese fue tu metodo de registro.";
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
        cerrarModalNombre();
        usuarioPendiente = null;
        uidProcesando = null;
        promesaProcesamiento = null;
        return;
    }

    if (accesoEnCurso) return;
    await procesarUsuario(usuario);
});
