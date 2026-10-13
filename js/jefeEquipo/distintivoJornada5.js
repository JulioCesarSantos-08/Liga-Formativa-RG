export function aplicarDistintivoJornada5(credencial, jugador) {
    const esAltaJornada5 =
        jugador.altaJornada5 === true ||
        String(jugador.tipoRegistro || "")
            .trim()
            .toLowerCase() === "jornada5";

    if (!esAltaJornada5) return;

    const franja = credencial.querySelector(".frase-formativa");
    const texto = franja?.querySelector("p");

    if (!franja || !texto) {
        throw new Error("No se encontró la franja de la credencial para identificar Jornada 5.");
    }

    if (!document.getElementById("estilosCredencialJornada5")) {
        const estilos = document.createElement("style");
        estilos.id = "estilosCredencialJornada5";

        estilos.textContent = `
            .credencial.credencial-jornada5 .frase-formativa {
                background:
                    repeating-linear-gradient(
                        135deg,
                        rgba(255,255,255,.05) 0 5px,
                        transparent 5px 10px
                    ),
                    linear-gradient(
                        110deg,
                        #075c2c,
                        #159447,
                        #08713b
                    );
                border-color: #123e25;
                box-shadow: inset 0 0 0 2px #d8b55e;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }

            .credencial.credencial-jornada5 .frase-formativa p {
                color: #fffce8;
                text-shadow: 0 1px 1px rgba(0,0,0,.22);
            }
        `;

        document.head.appendChild(estilos);
    }

    credencial.classList.add("credencial-jornada5");

    franja.setAttribute(
        "aria-label",
        "Alta autorizada de Jornada 5"
    );

    texto.innerHTML = "ALTA AUTORIZADA<br>JORNADA 5";
}