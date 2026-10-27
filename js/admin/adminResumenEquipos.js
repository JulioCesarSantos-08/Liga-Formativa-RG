import {
    collection,
    doc,
    getDocFromServer,
    getDocsFromServer
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "../firebase.js";
import { protegerPagina } from "../roles.js";

const el = id => document.getElementById(id);

const buscar = el("buscarResumen");
const categoria = el("filtroCategoria");
const estado = el("filtroEstado");
const registro = el("filtroRegistro");

const actualizar = el("btnActualizar");
const imprimir = el("btnImprimir");
const limpiar = el("btnLimpiar");

const lista = el("listaClubes");
const mensaje = el("estadoConsulta");

const controles = [
    buscar,
    categoria,
    estado,
    registro,
    limpiar
];

const comparador = new Intl.Collator("es", {
    numeric: true,
    sensitivity: "base"
});

let equipos = [];
let cargando = false;
let disponible = false;

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function activo(equipo) {
    return equipo.activo !== false &&
        equipo.descalificado !== true &&
        !["inactivo", "descalificado"].includes(
            normalizar(equipo.estado)
        );
}

function numeroValido(valor) {
    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return null;
    }

    const numero = Number(valor);

    return Number.isInteger(numero) && numero >= 0
        ? numero
        : null;
}

function limiteEquipo(equipo, configuracion) {
    if (equipo.plantillaCongelada === true) {
        const congelado = numeroValido(
            equipo.cupoTemporada ??
            equipo.limitePlantillaTemporada
        );

        return congelado;
    }

    return numeroValido(
        configuracion.maximoJugadores
    );
}

function prepararEquipos(
    datosEquipos,
    jugadores,
    configuracion
) {
    const cantidades = new Map();

    for (const jugador of jugadores) {
        if (
            jugador.activo === false ||
            !jugador.equipoId
        ) {
            continue;
        }

        cantidades.set(
            jugador.equipoId,
            (cantidades.get(jugador.equipoId) || 0) + 1
        );
    }

    return datosEquipos.map(equipo => ({
        ...equipo,
        cantidad: cantidades.get(equipo.id) || 0,
        limite: limiteEquipo(equipo, configuracion),
        categoriaClave: String(
            equipo.categoriaId ||
            "nombre:" + normalizar(equipo.categoriaNombre)
        ),
        categoriaTexto: String(
            equipo.categoriaNombre || "Sin categoría"
        ),
        clubClave: String(equipo.clubId || "").trim()
    }));
}

function crear(tag, clase, texto) {
    const nodo = document.createElement(tag);

    if (clase) {
        nodo.className = clase;
    }

    if (texto !== undefined) {
        nodo.textContent = texto;
    }

    return nodo;
}

function textoCupo(equipo) {
    if (equipo.limite === null) {
        return "Sin cupo confirmado";
    }

    const diferencia =
        equipo.limite - equipo.cantidad;

    if (diferencia < 0) {
        return Math.abs(diferencia) + " sobre el cupo";
    }

    return diferencia === 0
        ? "Cupo completo"
        : diferencia + " lugares disponibles";
}

function filaEquipo(equipo) {
    const fila = crear("tr");

    const datos = [
        ["Equipo", equipo.nombre || "Equipo sin nombre"],
        ["Categoría", equipo.categoriaTexto],
        [
            "Responsable",
            equipo.responsableNombre ||
            "Sin responsable registrado"
        ]
    ];

    for (const [etiqueta, texto] of datos) {
        const celda = crear("td", "", texto);
        celda.dataset.label = etiqueta;
        fila.appendChild(celda);
    }

    const cantidad = crear("td", "celda-cantidad");
    cantidad.dataset.label = "Jugadores activos";

    cantidad.appendChild(
        crear(
            "strong",
            "numero-jugadores",
            equipo.cantidad
        )
    );

    cantidad.appendChild(
        crear(
            "small",
            "estado-equipo",
            activo(equipo)
                ? "Equipo activo"
                : "Inactivo / descalificado"
        )
    );

    const cupo = crear("td", "celda-cupo");
    cupo.dataset.label = "Cupo";

    const excedido =
        equipo.limite !== null &&
        equipo.cantidad > equipo.limite;

    cupo.appendChild(
        crear(
            "span",
            excedido ? "cupo-excedido" : "",
            textoCupo(equipo)
        )
    );

    cupo.appendChild(
        crear(
            "small",
            "",
            equipo.limite === null
                ? "Revisar configuración"
                : "Límite: " + equipo.limite +
                    (
                        equipo.plantillaCongelada === true
                            ? " · Congelado"
                            : ""
                    )
        )
    );

    fila.append(cantidad, cupo);

    return fila;
}

function tarjetaClub(grupo) {
    const tarjeta = crear("article", "club");
    const cabecera = crear("header", "club-cabecera");
    const identidad = crear("div");

    identidad.appendChild(
        crear(
            "span",
            "club-etiqueta",
            grupo.clubId
                ? "CLUB / COMUNIDAD"
                : "EQUIPO SIN CLUB ASIGNADO"
        )
    );

    identidad.appendChild(
        crear("h2", "", grupo.nombre)
    );

    identidad.appendChild(
        crear(
            "p",
            "",
            grupo.equipos.length +
                (
                    grupo.equipos.length === 1
                        ? " equipo mostrado"
                        : " equipos mostrados"
                )
        )
    );

    const total = grupo.equipos.reduce(
        (suma, equipo) => suma + equipo.cantidad,
        0
    );

    const resumen = crear("div", "club-total");

    resumen.append(
        crear("strong", "", total),
        crear("span", "", "jugadores activos")
    );

    cabecera.append(identidad, resumen);

    const tabla = crear("table", "tabla-equipos");

    const caption = crear(
        "caption",
        "solo-lectores",
        "Equipos de " + grupo.nombre
    );

    const thead = crear("thead");
    const titulos = crear("tr");

    for (
        const texto of [
            "Equipo",
            "Categoría",
            "Responsable",
            "Jugadores",
            "Cupo"
        ]
    ) {
        const th = crear("th", "", texto);
        th.scope = "col";
        titulos.appendChild(th);
    }

    thead.appendChild(titulos);

    const cuerpo = crear("tbody");

    grupo.equipos.sort(
        (a, b) =>
            comparador.compare(
                a.categoriaTexto,
                b.categoriaTexto
            ) ||
            comparador.compare(
                a.nombre || "",
                b.nombre || ""
            )
    );

    grupo.equipos.forEach(equipo => {
        cuerpo.appendChild(filaEquipo(equipo));
    });

    tabla.append(caption, thead, cuerpo);
    tarjeta.append(cabecera, tabla);

    return tarjeta;
}

function renderizar() {
    if (!disponible) {
        return;
    }

    const termino = normalizar(buscar.value);

    const visibles = equipos.filter(equipo => {
        if (
            categoria.value &&
            equipo.categoriaClave !== categoria.value
        ) {
            return false;
        }

        if (
            estado.value === "activos" &&
            !activo(equipo)
        ) {
            return false;
        }

        if (
            estado.value === "inactivos" &&
            activo(equipo)
        ) {
            return false;
        }

        if (
            registro.value === "con" &&
            equipo.cantidad === 0
        ) {
            return false;
        }

        if (
            registro.value === "sin" &&
            equipo.cantidad !== 0
        ) {
            return false;
        }

        const texto = [
            equipo.clubNombre,
            equipo.nombre,
            equipo.responsableNombre
        ].join(" ");

        return normalizar(texto).includes(termino);
    });

    const grupos = new Map();

    for (const equipo of visibles) {
        const clave = equipo.clubClave
            ? "club:" + equipo.clubClave
            : "equipo:" + equipo.id;

        if (!grupos.has(clave)) {
            grupos.set(clave, {
                clubId: equipo.clubClave,
                nombre: equipo.clubClave
                    ? equipo.clubNombre ||
                        "Club " + equipo.clubClave
                    : equipo.nombre ||
                        "Equipo sin nombre",
                equipos: []
            });
        }

        grupos.get(clave).equipos.push(equipo);
    }

    const ordenados = [...grupos.values()].sort(
        (a, b) => comparador.compare(a.nombre, b.nombre)
    );

    const fragmento =
        document.createDocumentFragment();

    ordenados.forEach(grupo => {
        fragmento.appendChild(tarjetaClub(grupo));
    });

    lista.replaceChildren(fragmento);

    el("totalClubes").textContent =
        ordenados.filter(grupo => grupo.clubId).length;

    el("totalEquipos").textContent =
        visibles.length;

    el("totalJugadores").textContent =
        visibles.reduce(
            (suma, equipo) => suma + equipo.cantidad,
            0
        );

    el("totalSinJugadores").textContent =
        visibles.filter(
            equipo => equipo.cantidad === 0
        ).length;

    el("estadoVacio").hidden =
        visibles.length !== 0;

    imprimir.disabled =
        visibles.length === 0;

    const filtros = [
        categoria.selectedOptions[0].text,
        estado.selectedOptions[0].text,
        registro.selectedOptions[0].text
    ];

    if (buscar.value.trim()) {
        filtros.push(
            "Búsqueda: " + buscar.value.trim()
        );
    }

    document.querySelector(
        ".detalle-consulta p:last-child"
    ).textContent =
        "Equipos mostrados: " + filtros.join(" · ");
}

function actualizarCategorias() {
    const seleccion = categoria.value;

    const opciones = new Map(
        equipos.map(equipo => [
            equipo.categoriaClave,
            equipo.categoriaTexto
        ])
    );

    categoria.replaceChildren(
        new Option("Todas las categorías", "")
    );

    [...opciones]
        .sort(
            (a, b) =>
                comparador.compare(a[1], b[1])
        )
        .forEach(([clave, nombre]) => {
            categoria.add(
                new Option(nombre, clave)
            );
        });

    categoria.value =
        opciones.has(seleccion) ? seleccion : "";
}

async function cargar() {
    if (cargando) {
        return;
    }

    cargando = true;

    actualizar.disabled = true;
    imprimir.disabled = true;

    controles.forEach(control => {
        control.disabled = true;
    });

    lista.setAttribute("aria-busy", "true");

    mensaje.hidden = false;
    mensaje.classList.remove("es-error");
    mensaje.textContent =
        "Consultando equipos y jugadores…";

    try {
        const resultados = await Promise.allSettled([
            getDocsFromServer(
                collection(db, "equipos")
            ),
            getDocsFromServer(
                collection(db, "jugadores")
            ),
            getDocFromServer(
                doc(db, "configuracionLiga", "general")
            )
        ]);

        const fallo = resultados.find(
            resultado =>
                resultado.status === "rejected"
        );

        if (fallo) {
            throw fallo.reason;
        }

        const [
            snapshotEquipos,
            snapshotJugadores,
            snapshotConfiguracion
        ] = resultados.map(
            resultado => resultado.value
        );

        const leer = snapshot =>
            snapshot.docs.map(documento => ({
                ...documento.data(),
                id: documento.id
            }));

        equipos = prepararEquipos(
            leer(snapshotEquipos),
            leer(snapshotJugadores),
            snapshotConfiguracion.exists()
                ? snapshotConfiguracion.data()
                : {}
        );

        disponible = true;

        actualizarCategorias();

        controles.forEach(control => {
            control.disabled = false;
        });

        el("fechaConsulta").textContent =
            "Última consulta: " +
            new Intl.DateTimeFormat("es-MX", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Mexico_City"
            }).format(new Date());

        renderizar();

        mensaje.hidden = true;
    } catch (error) {
        console.error(
            "Error cargando resumen de equipos:",
            error
        );

        disponible = false;

        const codigo = String(error.code || "");

        const detalle =
            codigo.includes("resource-exhausted")
                ? "Firebase alcanzó una cuota de uso. Revisa el uso y la facturación del proyecto."
                : codigo.includes("permission-denied")
                    ? "Firebase no permitió consultar los datos. Revisa la sesión y los permisos."
                    : "No se pudo completar la consulta. Intenta actualizar nuevamente.";

        mensaje.classList.add("es-error");

        mensaje.textContent =
            detalle +
            (
                equipos.length
                    ? " El resumen anterior permanece visible y no se puede imprimir hasta actualizarlo."
                    : ""
            );
    } finally {
        cargando = false;

        actualizar.disabled = false;

        lista.setAttribute("aria-busy", "false");
    }
}

buscar.addEventListener("input", renderizar);

[categoria, estado, registro].forEach(control => {
    control.addEventListener("change", renderizar);
});

actualizar.addEventListener("click", cargar);

imprimir.addEventListener("click", () => {
    if (disponible && !cargando) {
        window.print();
    }
});

limpiar.addEventListener("click", () => {
    buscar.value = "";
    categoria.value = "";
    estado.value = "activos";
    registro.value = "";

    renderizar();
});

const usuario = await protegerPagina(["admin"]);

if (usuario) {
    await cargar();
}