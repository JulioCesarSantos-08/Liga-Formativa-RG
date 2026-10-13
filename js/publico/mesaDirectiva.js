const menu = document.querySelector(
    ".menu-mas-legal"
);

const informacion = document.querySelector(
    ".grid-info-publica"
);

if (!menu || !informacion) {
    throw new Error(
        "No se encontraron los accesos de información de publico.html."
    );
}

if (!document.getElementById("mdDialogoDirectiva")) {
    const integrantes = [
        {
            nombre: "SERGIO ANTONIO BORREGO MONTES",
            cargo: "Presidente de la liga",
            iniciales: "SB",
            destacado: true
        },
        {
            nombre: "Chávez Ramírez Domingo Damian",
            cargo: "Vicepresidente",
            iniciales: "CD"
        },
        {
            nombre: "PORFIRIO CRUZ AVENDAÑO",
            cargo: "Tesorero",
            iniciales: "PA"
        },
        {
            nombre: "Angel Pérez Reyes",
            cargo: "Secretario",
            iniciales: "AP"
        }
    ];

    const mensaje =
        "Hola, Julio. Me gustó tu trabajo en el sistema de la Liga Municipal de Fútbol Río Grande. Me interesan tus servicios y quisiera platicarte una idea. ¿Podemos conversar?";

    const enlace = new URL(
        "https://wa.me/522225354183"
    );

    enlace.searchParams.set("text", mensaje);

    const iconoPersonas = `
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
        >
            <circle cx="9" cy="8" r="3"/>
            <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>
        </svg>
    `;

    const dialogo = document.createElement("dialog");

    dialogo.id = "mdDialogoDirectiva";
    dialogo.className = "md-dialogo";

    dialogo.setAttribute(
        "aria-labelledby",
        "mdTituloDirectiva"
    );

    dialogo.setAttribute(
        "aria-describedby",
        "mdDescripcionDirectiva"
    );

    dialogo.innerHTML = `
        <header class="md-cabecera">
            <img
                src="imagenes/logo.png"
                alt="Logo de la Liga Municipal de Fútbol Río Grande"
                width="76"
                height="76"
            >

            <div class="md-identidad">
                <span class="md-etiqueta">
                    LIGA MUNICIPAL DE FÚTBOL
                </span>

                <h2 id="mdTituloDirectiva">
                    Mesa directiva
                </h2>

                <p id="mdDescripcionDirectiva">
                    Río Grande · Villa de Tututepec, Oaxaca
                </p>
            </div>

            <button
                type="button"
                class="md-cerrar"
                aria-label="Cerrar mesa directiva"
            >×</button>
        </header>

        <div class="md-contenido">
            <section
                class="md-directiva"
                aria-labelledby="mdTituloIntegrantes"
            >
                <div class="md-seccion-cabecera">
                    <span
                        class="md-detalle"
                        aria-hidden="true"
                    ></span>

                    <h3 id="mdTituloIntegrantes">
                        Representantes de la liga
                    </h3>
                </div>

                <div class="md-integrantes"></div>
            </section>

            <section
                class="md-desarrollo md-desarrollo-discreto"
                aria-labelledby="mdNombreDesarrollador"
            >
                <div class="md-desarrollo-cabecera">
                    <span
                        class="md-codigo"
                        aria-hidden="true"
                    >&lt;/&gt;</span>

                    <span class="md-desarrollo-etiqueta">
                        DESARROLLO Y GESTIÓN DEL SISTEMA
                    </span>
                </div>

                <h3 id="mdNombreDesarrollador">
                    <a
                        class="md-nombre-enlace"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Julio Cesar Santos Peñaloza
                        <span aria-hidden="true">↗</span>
                    </a>
                </h3>

                <p class="md-cargo-desarrollo">
                    Ingeniero a cargo del desarrollo
                    y gestión del sistema.
                </p>


            </section>

            <footer class="md-pie">
                <span>
                    Liga y comunidad · Río Grande
                </span>

                <button type="button" class="md-listo">
                    Listo
                </button>
            </footer>
        </div>
    `;

    const listado = dialogo.querySelector(
        ".md-integrantes"
    );

    integrantes.forEach(integrante => {
        const tarjeta = document.createElement(
            "article"
        );

        tarjeta.className = "md-persona" +
            (
                integrante.destacado
                    ? " md-persona-presidente"
                    : ""
            );

        const inicial = document.createElement("span");

        inicial.className = "md-inicial";
        inicial.setAttribute("aria-hidden", "true");
        inicial.textContent = integrante.iniciales;

        const datos = document.createElement("div");
        const cargo = document.createElement("p");

        cargo.className = "md-cargo";
        cargo.textContent = integrante.cargo;

        const nombre = document.createElement("h4");
        nombre.textContent = integrante.nombre;

        datos.append(cargo, nombre);
        tarjeta.append(inicial, datos);
        listado.appendChild(tarjeta);
    });

    dialogo.querySelectorAll(
        ".md-nombre-enlace"
    ).forEach(elemento => {
        elemento.href = enlace.href;
    });

    document.body.appendChild(dialogo);

    let disparador = null;
    let overflowAnterior = "";

    function abrir(boton) {
        if (dialogo.open) return;

        const menuMas = document.getElementById(
            "menuMas"
        );

        const desdeMenu =
            menuMas &&
            !menuMas.classList.contains("hidden");

        if (desdeMenu) {
            document.getElementById(
                "btnCerrarMenu"
            )?.click();
        }

        disparador = desdeMenu
            ? document.getElementById("btnMas") || boton
            : boton;

        overflowAnterior =
            document.body.style.overflow;

        dialogo.showModal();
        dialogo.scrollTop = 0;

        document.body.style.overflow = "hidden";

        dialogo.querySelector(
            ".md-cerrar"
        ).focus();
    }

    dialogo.querySelectorAll(
        ".md-cerrar, .md-listo"
    ).forEach(boton => {
        boton.addEventListener(
            "click",
            () => dialogo.close()
        );
    });

    dialogo.addEventListener("click", evento => {
        if (evento.target !== dialogo) return;

        const limites =
            dialogo.getBoundingClientRect();

        if (
            evento.clientX < limites.left ||
            evento.clientX > limites.right ||
            evento.clientY < limites.top ||
            evento.clientY > limites.bottom
        ) {
            dialogo.close();
        }
    });

    dialogo.addEventListener("close", () => {
        document.body.style.overflow =
            overflowAnterior;

        if (disparador?.isConnected) {
            disparador.focus({
                preventScroll: true
            });
        }
    });

    const botonMenu = document.createElement("button");

    botonMenu.type = "button";
    botonMenu.className =
        "menu-legal-link md-abrir-menu";

    botonMenu.setAttribute(
        "aria-haspopup",
        "dialog"
    );

    botonMenu.setAttribute(
        "aria-controls",
        dialogo.id
    );

    botonMenu.innerHTML = `
        <span aria-hidden="true">${iconoPersonas}</span>

        <div>
            <strong>Mesa directiva</strong>
            <small>
                Representantes y desarrollo del sistema
            </small>
        </div>
    `;

    const tituloMenu = menu.querySelector(
        ".menu-legal-titulo"
    );

    if (tituloMenu) {
        tituloMenu.insertAdjacentElement(
            "afterend",
            botonMenu
        );
    } else {
        menu.prepend(botonMenu);
    }

    botonMenu.addEventListener(
        "click",
        () => abrir(botonMenu)
    );

    const botonInicio = document.createElement(
        "button"
    );

    botonInicio.type = "button";
    botonInicio.className =
        "info-publica-card md-abrir-inicio";

    botonInicio.setAttribute(
        "aria-haspopup",
        "dialog"
    );

    botonInicio.setAttribute(
        "aria-controls",
        dialogo.id
    );

    botonInicio.innerHTML = `
        <div
            class="info-publica-icono"
            aria-hidden="true"
        >${iconoPersonas}</div>

        <div class="info-publica-contenido">
            <strong>Mesa directiva</strong>
            <span>
                Conoce a quienes representan la liga
            </span>
        </div>

        <span
            class="info-publica-flecha"
            aria-hidden="true"
        >›</span>
    `;

    informacion.appendChild(botonInicio);

    botonInicio.addEventListener(
        "click",
        () => abrir(botonInicio)
    );
}