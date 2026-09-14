import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";

import {
  protegerPaginaPublica,
  obtenerPanelSegunRol,
  cerrarSesion,
} from "../roles.js";

const CLAVE_ACTUALIZACION_POSPUESTA = "ligaRioGrande_actualizacion_pospuesta";

let registroServiceWorker = null;

let workerEnEspera = null;

let recargaPorActualizacion = false;

const nombreUsuario = document.getElementById("nombreUsuario");

const menuNombreUsuario = document.getElementById("menuNombreUsuario");

const perfilInicial = document.getElementById("perfilInicial");

const btnMas = document.getElementById("btnMas");

const menuMas = document.getElementById("menuMas");

const btnCerrarMenu = document.getElementById("btnCerrarMenu");

const btnCerrarSesion = document.getElementById("btnCerrarSesion");

const btnPerfil = document.getElementById("btnPerfil");

const btnVolverPanel = document.getElementById("btnVolverPanel");

const iconoVolverPanel = document.getElementById("iconoVolverPanel");

const textoVolverPanel = document.getElementById("textoVolverPanel");

const contenedorProximoPartido = document.getElementById(
  "contenedorProximoPartido",
);

const listaUltimosResultados = document.getElementById(
  "listaUltimosResultados",
);

const modalLogo = document.getElementById("modalLogo");

const btnCerrarModalLogo = document.getElementById("btnCerrarModalLogo");

const logosAmpliables = document.querySelectorAll("[data-logo-ampliable]");

const avisoActualizacion = document.getElementById("avisoActualizacion");

const btnActualizarApp = document.getElementById("btnActualizarApp");

const btnPosponerActualizacion = document.getElementById(
  "btnPosponerActualizacion",
);

const estadoActualizacion = document.getElementById("estadoActualizacion");

const versionActual = document.getElementById("versionActual");

const versionNueva = document.getElementById("versionNueva");

let partidos = [];

let equipos = [];

registrarServiceWorker();

activarSistemaActualizaciones();

const usuario = await protegerPaginaPublica();

if (usuario) {
  cargarDatosUsuario(usuario);

  configurarPanelUsuario(usuario);

  activarEventos();

  await cargarInformacionInicio();
}

function cargarDatosUsuario(usuario) {
  const nombre =
    usuario.nombre?.trim() ||
    usuario.firebaseUser?.displayName?.trim() ||
    "Usuario";

  nombreUsuario.textContent = nombre;

  menuNombreUsuario.textContent = nombre;

  perfilInicial.textContent = obtenerInicial(nombre);
}

function configurarPanelUsuario(usuario) {
  const panel = obtenerPanelSegunRol(usuario.rol);

  if (!panel) {
    btnVolverPanel.classList.add("hidden");

    btnVolverPanel.removeAttribute("href");

    return;
  }

  btnVolverPanel.href = panel.url;

  iconoVolverPanel.textContent = panel.icono;

  textoVolverPanel.textContent = panel.texto;

  btnVolverPanel.classList.remove("hidden");
}

function obtenerInicial(nombre) {
  const nombreLimpio = nombre.trim();

  if (!nombreLimpio) {
    return "U";
  }

  return nombreLimpio.charAt(0).toUpperCase();
}

function activarEventos() {
  btnMas.addEventListener("click", abrirMenu);

  btnCerrarMenu.addEventListener("click", cerrarMenu);

  menuMas.addEventListener("click", (event) => {
    if (event.target === menuMas) {
      cerrarMenu();
    }
  });

  btnCerrarSesion.addEventListener("click", cerrarSesionDesdeMenu);

  btnPerfil.addEventListener("click", abrirMenu);

  if (btnVolverPanel) {
    btnVolverPanel.addEventListener("click", () => {
      cerrarMenu();
    });
  }

  logosAmpliables.forEach((logo) => {
    logo.addEventListener("click", abrirModalLogo);
  });

  if (btnCerrarModalLogo) {
    btnCerrarModalLogo.addEventListener("click", cerrarModalLogo);
  }

  if (modalLogo) {
    modalLogo.addEventListener("click", (event) => {
      if (event.target === modalLogo) {
        cerrarModalLogo();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (modalLogo && !modalLogo.classList.contains("hidden")) {
      cerrarModalLogo();

      return;
    }

    if (!menuMas.classList.contains("hidden")) {
      cerrarMenu();
    }
  });
}

async function cargarInformacionInicio() {
  try {
    const [snapshotPartidos, snapshotEquipos] = await Promise.all([
      getDocs(collection(db, "partidos")),

      getDocs(collection(db, "equipos")),
    ]);

    partidos = snapshotPartidos.docs.map((documento) => ({
      id: documento.id,

      ...documento.data(),
    }));

    equipos = snapshotEquipos.docs.map((documento) => ({
      id: documento.id,

      ...documento.data(),
    }));

    renderizarProximoPartido();

    renderizarUltimosResultados();
  } catch (error) {
    console.error("Error cargando información del inicio:", error);

    mostrarErrorProximoPartido();

    mostrarErrorResultados();
  }
}

function renderizarProximoPartido() {
  const ahora = new Date();

  const proximos = partidos
    .filter((partido) => {
      const estado = normalizarEstadoPartido(partido);

      if (estado !== "proximo") {
        return false;
      }

      const fecha = convertirFechaPartido(partido);

      if (!fecha) {
        return false;
      }

      const fechaCompleta = combinarFechaHora(fecha, partido.hora);

      return fechaCompleta.getTime() >= ahora.getTime();
    })
    .sort((a, b) => {
      const fechaA = combinarFechaHora(convertirFechaPartido(a), a.hora);

      const fechaB = combinarFechaHora(convertirFechaPartido(b), b.hora);

      return fechaA.getTime() - fechaB.getTime();
    });

  if (!proximos.length) {
    contenedorProximoPartido.innerHTML = `

            <article class="partido-destacado">

                <div
                    style="
                        min-height:180px;
                        display:flex;
                        flex-direction:column;
                        align-items:center;
                        justify-content:center;
                        gap:7px;
                        text-align:center;
                        padding:20px;
                    "
                >

                    <div
                        style="
                            font-size:2rem;
                        "
                    >
                        ⚽
                    </div>

                    <strong
                        style="
                            color:#213732;
                        "
                    >
                        Sin partidos próximos
                    </strong>

                    <span
                        style="
                            color:#68746e;
                            font-size:.72rem;
                            line-height:1.4;
                        "
                    >
                        Aún no hay un próximo encuentro programado.
                    </span>

                </div>

            </article>

        `;

    return;
  }

  const partido = proximos[0];

  const local = obtenerEquipo(partido.localId, partido.localNombre);

  const visitante = obtenerEquipo(partido.visitanteId, partido.visitanteNombre);

  const fecha = convertirFechaPartido(partido);

  contenedorProximoPartido.innerHTML = `

        <a
            href="partido.html?id=${encodeURIComponent(partido.id)}"
            class="partido-destacado"
            style="
                display:block;
            "
        >

            <div class="partido-info-superior">

                <span class="badge-jornada">
                    ${escaparHTML(partido.jornadaNombre || "Próxima jornada")}
                </span>

                <span class="badge-proximo">
                    Próximo
                </span>

            </div>


            <div class="partido-equipos">

                <div class="equipo">

                    <div class="escudo-placeholder">
                        ${obtenerEscudoEquipo(local)}
                    </div>

                    <strong>
                        ${escaparHTML(local.nombre)}
                    </strong>

                </div>


                <div class="versus">

                    <span class="hora">
                        ${escaparHTML(formatearHora(partido.hora))}
                    </span>

                    <strong>
                        VS
                    </strong>

                    <span class="fecha">
                        ${escaparHTML(formatearFechaCorta(fecha))}
                    </span>

                </div>


                <div class="equipo">

                    <div class="escudo-placeholder">
                        ${obtenerEscudoEquipo(visitante)}
                    </div>

                    <strong>
                        ${escaparHTML(visitante.nombre)}
                    </strong>

                </div>

            </div>


            <div class="partido-footer">

                <span>
                    ${escaparHTML(partido.categoriaNombre || "Sin categoría")}
                </span>

                <span>
                    ${escaparHTML(partido.campo || "Campo por definir")}
                </span>

            </div>

        </a>

    `;
}

function renderizarUltimosResultados() {
  const finalizados = partidos
    .filter((partido) => normalizarEstadoPartido(partido) === "finalizado")
    .sort((a, b) => {
      const fechaA = convertirFechaPartido(a);

      const fechaB = convertirFechaPartido(b);

      return (fechaB?.getTime() || 0) - (fechaA?.getTime() || 0);
    })
    .slice(0, 5);

  listaUltimosResultados.innerHTML = "";

  if (!finalizados.length) {
    listaUltimosResultados.innerHTML = `

            <article class="resultado-card">

                <div
                    style="
                        min-height:75px;
                        display:flex;
                        flex-direction:column;
                        align-items:center;
                        justify-content:center;
                        gap:5px;
                        text-align:center;
                    "
                >

                    <strong>
                        Aún no hay resultados
                    </strong>

                    <span
                        style="
                            color:#68746e;
                            font-size:.68rem;
                        "
                    >
                        Los partidos finalizados aparecerán aquí.
                    </span>

                </div>

            </article>

        `;

    return;
  }

  finalizados.forEach((partido) => {
    const local = obtenerEquipo(partido.localId, partido.localNombre);

    const visitante = obtenerEquipo(
      partido.visitanteId,
      partido.visitanteNombre,
    );

    const golesLocal = numeroSeguro(partido.golesLocal);

    const golesVisitante = numeroSeguro(partido.golesVisitante);

    const tarjeta = document.createElement("a");

    tarjeta.href = `partido.html?id=${encodeURIComponent(partido.id)}`;

    tarjeta.className = "resultado-card";

    tarjeta.style.display = "block";

    tarjeta.innerHTML = `

                <div class="resultado-meta">

                    <span>
                        ${escaparHTML(partido.jornadaNombre || "Jornada")}
                    </span>

                    <span>
                        Finalizado
                    </span>

                </div>


                <div class="resultado-equipos">

                    <span>
                        ${escaparHTML(local.nombre)}
                    </span>

                    <strong>
                        ${golesLocal}
                        -
                        ${golesVisitante}
                    </strong>

                    <span>
                        ${escaparHTML(visitante.nombre)}
                    </span>

                </div>

            `;

    listaUltimosResultados.appendChild(tarjeta);
  });
}

function obtenerEquipo(equipoId, nombreAlternativo) {
  const equipo = equipos.find((item) => item.id === equipoId);

  if (equipo) {
    return equipo;
  }

  return {
    id: equipoId || null,

    nombre: nombreAlternativo || "Equipo",

    logoUrl: "",
  };
}

function obtenerEscudoEquipo(equipo) {
  const logo =
    equipo.logoUrl || equipo.escudoUrl || equipo.imagenUrl || equipo.logo || "";

  if (logo) {
    return `
            <img
                src="${escaparAtributo(logo)}"
                alt="${escaparAtributo(equipo.nombre || "Equipo")}"
                loading="lazy"
                style="
                    width:100%;
                    height:100%;
                    object-fit:contain;
                    display:block;
                    border-radius:10px;
                "
            >
        `;
  }

  return escaparHTML(obtenerInicial(equipo.nombre || "E"));
}

function normalizarEstadoPartido(partido) {
  const estado = String(partido.estado || "")
    .trim()
    .toLowerCase();

  if (estado === "finalizado" || estado === "terminado" || estado === "final") {
    return "finalizado";
  }

  if (
    partido.resultadoRegistrado === true &&
    partido.golesLocal !== undefined &&
    partido.golesVisitante !== undefined
  ) {
    return "finalizado";
  }

  if (
    partido.cedulaCreada === true &&
    partido.golesLocal !== undefined &&
    partido.golesVisitante !== undefined
  ) {
    return "finalizado";
  }

  if (
    estado === "cancelado" ||
    estado === "cancelada" ||
    estado === "suspendido" ||
    estado === "suspendida"
  ) {
    return "cancelado";
  }

  if (
    estado === "en vivo" ||
    estado === "en-vivo" ||
    estado === "envivo" ||
    estado === "jugando"
  ) {
    return "en-vivo";
  }

  return "proximo";
}

function convertirFechaPartido(partido) {
  if (!partido || !partido.fecha) {
    return null;
  }

  const valor = partido.fecha;

  if (typeof valor?.toDate === "function") {
    return valor.toDate();
  }

  if (valor instanceof Date) {
    return valor;
  }

  if (typeof valor === "string") {
    const coincidencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (coincidencia) {
      return new Date(
        Number(coincidencia[1]),
        Number(coincidencia[2]) - 1,
        Number(coincidencia[3]),
      );
    }
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha;
}

function combinarFechaHora(fecha, hora) {
  if (!fecha) {
    return new Date(8640000000000000);
  }

  const resultado = new Date(fecha);

  if (!hora) {
    resultado.setHours(23, 59, 59, 999);

    return resultado;
  }

  const texto = String(hora).trim().toLowerCase();

  const coincidencia24 = texto.match(/^(\d{1,2}):(\d{2})$/);

  if (coincidencia24) {
    resultado.setHours(
      Number(coincidencia24[1]),
      Number(coincidencia24[2]),
      0,
      0,
    );

    return resultado;
  }

  const coincidencia12 = texto.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);

  if (coincidencia12) {
    let horas = Number(coincidencia12[1]);

    const minutos = Number(coincidencia12[2]);

    const periodo = coincidencia12[3];

    if (periodo === "pm" && horas !== 12) {
      horas += 12;
    }

    if (periodo === "am" && horas === 12) {
      horas = 0;
    }

    resultado.setHours(horas, minutos, 0, 0);

    return resultado;
  }

  resultado.setHours(23, 59, 59, 999);

  return resultado;
}

function formatearHora(hora) {
  if (!hora) {
    return "Por definir";
  }

  const texto = String(hora).trim();

  const coincidencia = texto.match(/^(\d{1,2}):(\d{2})$/);

  if (!coincidencia) {
    return texto;
  }

  const fecha = new Date();

  fecha.setHours(Number(coincidencia[1]), Number(coincidencia[2]), 0, 0);

  return fecha.toLocaleTimeString("es-MX", {
    hour: "numeric",

    minute: "2-digit",

    hour12: true,
  });
}

function formatearFechaCorta(fecha) {
  if (!fecha) {
    return "Fecha por definir";
  }

  const hoy = new Date();

  const manana = new Date(hoy);

  manana.setDate(hoy.getDate() + 1);

  if (mismaFecha(fecha, hoy)) {
    return "Hoy";
  }

  if (mismaFecha(fecha, manana)) {
    return "Mañana";
  }

  const texto = fecha.toLocaleDateString("es-MX", {
    weekday: "long",
  });

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mismaFecha(fechaA, fechaB) {
  return (
    fechaA.getFullYear() === fechaB.getFullYear() &&
    fechaA.getMonth() === fechaB.getMonth() &&
    fechaA.getDate() === fechaB.getDate()
  );
}

function numeroSeguro(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return numero;
}

function mostrarErrorProximoPartido() {
  contenedorProximoPartido.innerHTML = `

        <article class="partido-destacado">

            <div
                style="
                    min-height:170px;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    gap:6px;
                    text-align:center;
                    padding:20px;
                "
            >

                <strong>
                    No pudimos cargar el próximo partido
                </strong>

                <span
                    style="
                        color:#68746e;
                        font-size:.7rem;
                    "
                >
                    Intenta actualizar la página.
                </span>

            </div>

        </article>

    `;
}

function mostrarErrorResultados() {
  listaUltimosResultados.innerHTML = `

        <article class="resultado-card">

            <div
                style="
                    min-height:75px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    color:#68746e;
                    font-size:.72rem;
                "
            >
                No pudimos cargar los últimos resultados.
            </div>

        </article>

    `;
}

async function cerrarSesionDesdeMenu() {
  btnCerrarSesion.disabled = true;

  btnCerrarSesion.textContent = "Cerrando sesión...";

  try {
    await cerrarSesion();
  } catch (error) {
    console.error("Error cerrando sesión:", error);

    btnCerrarSesion.disabled = false;

    btnCerrarSesion.textContent = "Cerrar sesión";
  }
}

function abrirMenu() {
  menuMas.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}

function cerrarMenu() {
  menuMas.classList.add("hidden");

  document.body.style.overflow = "";
}

function abrirModalLogo() {
  if (!modalLogo) {
    return;
  }

  if (!menuMas.classList.contains("hidden")) {
    cerrarMenu();
  }

  modalLogo.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}

function cerrarModalLogo() {
  if (!modalLogo) {
    return;
  }

  modalLogo.classList.add("hidden");

  document.body.style.overflow = "";
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
  return escaparHTML(valor);
}

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!recargaPorActualizacion) {
      return;
    }

    recargaPorActualizacion = false;

    limpiarActualizacionPospuesta();

    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registro = await navigator.serviceWorker.register(
        "./service-worker.js",
      );

      registroServiceWorker = registro;

      if (registro.waiting && navigator.serviceWorker.controller) {
        prepararActualizacion(registro.waiting);
      }

      registro.addEventListener("updatefound", () => {
        const nuevoWorker = registro.installing;

        if (!nuevoWorker) {
          return;
        }

        nuevoWorker.addEventListener("statechange", () => {
          if (
            nuevoWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            prepararActualizacion(nuevoWorker);
          }
        });
      });

      await registro.update();
    } catch (error) {
      console.error("Error registrando Service Worker:", error);
    }
  });
}

function activarSistemaActualizaciones() {
  if (btnActualizarApp) {
    btnActualizarApp.addEventListener("click", actualizarAplicacion);
  }

  if (btnPosponerActualizacion) {
    btnPosponerActualizacion.addEventListener("click", posponerActualizacion);
  }
}

function prepararActualizacion(worker) {
  workerEnEspera = worker;

  if (actualizacionPospuesta()) {
    return;
  }

  mostrarAvisoActualizacion();
}

function mostrarAvisoActualizacion() {
  if (!avisoActualizacion) {
    return;
  }

  if (versionActual) {
    versionActual.textContent = "Instalada";
  }

  if (versionNueva) {
    versionNueva.textContent = "Nueva";
  }

  avisoActualizacion.classList.remove("hidden");

  avisoActualizacion.classList.remove("actualizando");

  if (estadoActualizacion) {
    estadoActualizacion.classList.add("hidden");
  }

  if (btnActualizarApp) {
    btnActualizarApp.disabled = false;
  }

  if (btnPosponerActualizacion) {
    btnPosponerActualizacion.disabled = false;
  }

  document.body.style.overflow = "hidden";
}

function posponerActualizacion() {
  guardarActualizacionPospuesta();

  if (avisoActualizacion) {
    avisoActualizacion.classList.add("hidden");
  }

  document.body.style.overflow = "";
}

async function actualizarAplicacion() {
  const worker = workerEnEspera || registroServiceWorker?.waiting;

  if (!worker) {
    if (registroServiceWorker) {
      try {
        await registroServiceWorker.update();
      } catch (error) {
        console.error("Error buscando la actualización:", error);
      }
    }

    return;
  }

  if (avisoActualizacion) {
    avisoActualizacion.classList.add("actualizando");
  }

  if (estadoActualizacion) {
    estadoActualizacion.classList.remove("hidden");
  }

  if (btnActualizarApp) {
    btnActualizarApp.disabled = true;
  }

  if (btnPosponerActualizacion) {
    btnPosponerActualizacion.disabled = true;
  }

  recargaPorActualizacion = true;

  limpiarActualizacionPospuesta();

  worker.postMessage({
    type: "SKIP_WAITING",
  });

  setTimeout(() => {
    if (recargaPorActualizacion) {
      recargaPorActualizacion = false;

      window.location.reload();
    }
  }, 8000);
}

function actualizacionPospuesta() {
  try {
    return sessionStorage.getItem(CLAVE_ACTUALIZACION_POSPUESTA) === "true";
  } catch (error) {
    return false;
  }
}

function guardarActualizacionPospuesta() {
  try {
    sessionStorage.setItem(CLAVE_ACTUALIZACION_POSPUESTA, "true");
  } catch (error) {
    console.error("No se pudo posponer la actualización:", error);
  }
}

function limpiarActualizacionPospuesta() {
  try {
    sessionStorage.removeItem(CLAVE_ACTUALIZACION_POSPUESTA);
  } catch (error) {
    console.error("No se pudo limpiar el estado de actualización:", error);
  }
}
