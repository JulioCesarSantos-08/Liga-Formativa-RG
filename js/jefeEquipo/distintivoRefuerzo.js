export function aplicarDistintivoRefuerzo(
    credencial,
    jugador
) {
    if (jugador.esRefuerzo !== true) return;

    const franja = credencial.querySelector(
        ".frase-formativa"
    );

    const texto = franja?.querySelector("p");

    if (!franja || !texto) {
        throw new Error(
            "No se encontró la franja para identificar el refuerzo."
        );
    }

    if (
        !document.getElementById(
            "estilosCredencialRefuerzo"
        )
    ) {
        const estilos = document.createElement("style");

        estilos.id = "estilosCredencialRefuerzo";

        estilos.textContent = `
            .credencial.credencial-refuerzo .frase-formativa {
                background: linear-gradient(
                    110deg,
                    #073e86,
                    #167aca,
                    #0b528e
                );
                border-color: #0a345c;
                box-shadow: inset 0 0 0 2px #d8b55e;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }

            .credencial.credencial-refuerzo .frase-formativa p {
                color: #fffce8;
            }

            .credencial.credencial-refuerzo.credencial-jornada5 .frase-formativa {
                background: linear-gradient(
                    110deg,
                    #0b5da5 0%,
                    #0b5da5 48%,
                    #0f8241 52%,
                    #0f8241 100%
                );
            }
        `;

        document.head.appendChild(estilos);
    }

    credencial.classList.add("credencial-refuerzo");

    franja.setAttribute(
        "aria-label",
        "Refuerzo autorizado"
    );

    texto.innerHTML =
        credencial.classList.contains(
            "credencial-jornada5"
        )
            ? "REFUERZO AUTORIZADO<br>ALTA DE JORNADA 5"
            : "REFUERZO<br>AUTORIZADO";
}