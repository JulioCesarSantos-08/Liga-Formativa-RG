const limpio = valor => String(valor ?? "").trim();
const clave = valor => limpio(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const orden = ["super bebe", "dientes de leche", "pony", "infantil", "juvenil menor", "juvenil mayor"];
const nombres = ["Súper Bebé", "Dientes de Leche", "Pony", "Infantil", "Juvenil Menor", "Juvenil Mayor"];
const dato = (valor, etiqueta) => /^(|pendiente|sin (fecha|hora|sede|cancha|campo|definir)|(?:fecha|hora|sede|cancha|campo)(?: por definir| pendiente))$/.test(clave(valor)) ? etiqueta : limpio(valor);
const temporada = j => limpio(j.temporadaId || j.idTemporada || j.temporada?.id);
const vuelta = j => clave(j.vuelta || j.fase);
const textosUnicos = lista => [...new Set(lista.filter(Boolean))];

export function prepararCartel(d, completa) {
    const actual = d.jornadas.find(j => j.id === d.jornadaId);
    if (!actual || !d.categoriaId) return null;
    const numero = d.numero(actual);
    const comparable = Number.isInteger(numero) && numero > 0 && numero < 999999;
    const candidatas = d.jornadas.filter(j => j.id === actual.id || (
        comparable && d.numero(j) === numero &&
        (!temporada(actual) || !temporada(j) || temporada(j) === temporada(actual)) &&
        (!vuelta(actual) || !vuelta(j) || vuelta(j) === vuelta(actual))
    ));
    const ambiguo = campo => !campo(actual) && new Set(candidatas.map(campo).filter(Boolean)).size > 1;
    const rondas = candidatas.filter(j => j.id === actual.id || ((!ambiguo(temporada) || !temporada(j)) && (!ambiguo(vuelta) || !vuelta(j))));
    const temporadasRonda = new Set(rondas.map(temporada).filter(Boolean));
    const temporadaRonda = temporada(actual) || (temporadasRonda.size === 1 ? [...temporadasRonda][0] : "");
    const ordenCategoria = c => {
        const i = orden.indexOf(clave(d.nombreCategoria(c)));
        return i < 0 ? orden.length : i;
    };
    const categorias = d.categorias.filter(c => completa || c.id === d.categoriaId)
        .sort((a, b) => ordenCategoria(a) - ordenCategoria(b) || d.nombreCategoria(a).localeCompare(d.nombreCategoria(b), "es"));
    const grupos = categorias.map(c => {
        const js = (completa ? rondas : [actual]).filter(j => {
            const id = d.categoriaJornada(j);
            return !id || id === c.id || (j.id === actual.id && c.id === d.categoriaId);
        });
        const vistos = new Set();
        const partidos = js.flatMap(j => d.partidos(j.id, c.id)).filter(p => {
            if (p.id && vistos.has(p.id)) return false;
            if (completa && temporadaRonda && temporada(p) && temporada(p) !== temporadaRonda) return false;
            if (p.id) vistos.add(p.id);
            return true;
        });
        const avisos = textosUnicos(js.flatMap(j => {
            if (!d.categoriaJornada(j) && (j.id !== actual.id || c.id !== d.categoriaId)) return [];
            const incidencias = Array.isArray(j.incidenciasRol) ? j.incidenciasRol : [];
            return [
                ...incidencias.filter(Boolean).map(i => `No se juega: ${limpio(i.localNombre) || "Local"} vs ${limpio(i.visitanteNombre) || "Visitante"}`),
                j.descansaEquipoNombre ? `Descansa: ${j.descansaEquipoNombre}` : ""
            ];
        }));
        const filas = partidos.map(p => {
            const fecha = dato(d.fecha(p), "");
            const hora = dato(d.hora(p), "");
            const sede = dato(d.sede(p), "");
            const estado = d.estado(p);
            const pendiente = !fecha && !hora && !sede;
            const fechaHora = fecha && hora ? `${fecha} · ${hora}` : fecha || hora || "";
            const parcial = !fecha && hora ? "Fecha pendiente" : fecha && !hora ? "Hora pendiente" : "";
            const programacion = pendiente ? ["Pendiente"] : [fechaHora, parcial || (!fecha && !hora ? "Fecha y hora pendientes" : ""), sede || "Sede pendiente"].filter(Boolean);
            if (estado === "cancelado") programacion.splice(0, programacion.length, "No se juega");
            return {
                local: d.equipo(p, "local"),
                visita: d.equipo(p, "visitante"),
                programacion,
                pendiente: pendiente || estado === "cancelado"
            };
        });
        return { nombre: nombres[ordenCategoria(c)] || d.nombreCategoria(c), filas, avisos };
    });
    if (!grupos.some(g => g.filas.length || g.avisos.length)) return null;
    const nombre = comparable ? `Jornada ${numero}` : d.nombreJornada(actual);
    const etiquetaTemporada = limpio(actual.temporadaNombre || actual.nombreTemporada || actual.temporada?.nombre || (typeof actual.temporada === "string" ? actual.temporada : ""));
    return {
        nombre,
        subtitulo: etiquetaTemporada ? (/^temporada\b/i.test(etiquetaTemporada) ? etiquetaTemporada : `Temporada ${etiquetaTemporada}`) : "Infantil y Juvenil Formativa",
        grupos,
        archivo: `${clave(nombre).replace(/ /g, "-") || "jornada"}-${completa ? "completa" : clave(grupos[0].nombre).replace(/ /g, "-")}.png`
    };
}

const color = { verde:"#0a4534", crema:"#fff7e5", oro:"#c99426", claro:"#f2d98c", borde:"#bca870", texto:"#14251e", suave:"#e0edd7" };

export async function crearPNG(modelo, origenLogo) {
    const logo = new Image();
    logo.src = origenLogo;
    await logo.decode();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("No se puede generar la imagen en este navegador.");
    const doble = modelo.grupos.length > 1;
    const ancho = doble ? 1100 : 690;
    const margen = 36, espacio = 20;
    const cw = (ancho - 2*margen - (doble ? espacio : 0))/(doble ? 2 : 1);
    const c1 = Math.round(cw*.28), c2 = Math.round(cw*.29);
    const cols = [c1, c2, cw-c1-c2];
    const f = (tam, serif=false, peso=700) => `${peso} ${tam}px ${serif ? 'Georgia, "Times New Roman", serif' : "Arial, sans-serif"}`;

    function partir(valor, w, fuente) {
        ctx.font = fuente;
        const lineas = [];
        let actual = "";
        for (const palabra of limpio(valor).split(/\s+/).filter(Boolean)) {
            const prueba = actual ? actual + " " + palabra : palabra;
            if (ctx.measureText(prueba).width <= w) { actual = prueba; continue; }
            if (actual) lineas.push(actual);
            actual = "";
            for (const letra of palabra) {
                if (actual && ctx.measureText(actual+letra).width > w) { lineas.push(actual); actual = ""; }
                actual += letra;
            }
        }
        if (actual) lineas.push(actual);
        return lineas;
    }

    const layout = modelo.grupos.map(g => {
        const filas = g.filas.map(r => {
            const local = partir(r.local,cols[0]-20,f(16));
            const visita = partir(r.visita,cols[1]-20,f(16));
            const prog = r.programacion.flatMap((s,i) => partir(s,cols[2]-20,f(15,false,i ? 400 : 700)).map(t => [t,i ? 400 : 700]));
            return {...r,local,visita,prog,h:Math.max(42, Math.max(local.length,visita.length,prog.length)*18+12)};
        });
        const avisos = g.avisos.flatMap(a => partir(a,cw-22,f(14)));
        return {...g,filas,avisos,h:65+(filas.length ? filas.reduce((n,r)=>n+r.h,0) : 44)+(avisos.length ? avisos.length*18+14 : 0)};
    });
    const filasLayout = [];
    const columnas = doble ? 2 : 1;
    for (let i=0;i<layout.length;i+=columnas) filasLayout.push(layout.slice(i,i+columnas));
    const alto = 249 + filasLayout.reduce((n,r)=>n+Math.max(...r.map(g=>g.h))+espacio,0) + 52;
    const escala = Math.min(2,3900/alto,2200/ancho);
    canvas.width = Math.round(ancho*escala);
    canvas.height = Math.round(alto*escala);
    ctx.scale(escala,escala);

    function rect(x,y,w,h,c) {ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
    function borde(x,y,w,h,c,g=1) {ctx.strokeStyle=c;ctx.lineWidth=g;ctx.strokeRect(x,y,w,h);}
    function trazo(p,c,w=1,cerrar=false,relleno="") {
        ctx.beginPath();p.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
        if(cerrar) ctx.closePath();
        if(relleno){ctx.fillStyle=relleno;ctx.fill();}
        if(c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
    }
    function texto(s,x,y,fuente,c=color.texto,centrado=false,max=ancho) {
        ctx.font=fuente;ctx.fillStyle=c;ctx.textAlign=centrado?"center":"left";ctx.textBaseline="middle";ctx.fillText(s,x,y,max);
    }
    function redondo(x,y,w,h,r,relleno,contorno="") {
        ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
        ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
        if(relleno){ctx.fillStyle=relleno;ctx.fill();}
        if(contorno){ctx.strokeStyle=contorno;ctx.lineWidth=2;ctx.stroke();}
    }

    rect(0,0,ancho,alto,color.verde);
    rect(13,13,ancho-26,alto-26,color.crema);
    borde(7,7,ancho-14,alto-14,color.claro,2);
    borde(18,18,ancho-36,alto-36,color.oro,1);
    for(const sx of [1,-1]) for(const sy of [1,-1]) {
        const p = a => a.map(([x,y])=>[sx>0?x:ancho-x,sy>0?y:alto-y]);
        trazo(p([[0,0],[86,0],[86,13],[71,13],[71,24],[54,24],[54,38],[38,38],[38,54],[23,54],[23,75],[0,75]]),"",0,true,color.verde);
        trazo(p([[8,68],[8,8],[77,8],[77,16],[65,16],[65,29],[49,29],[49,43],[33,43],[33,59],[19,59],[19,68]]),color.claro,3);
        trazo(p([[16,43],[16,17],[40,17],[40,31],[26,31],[26,24],[33,24]]),color.oro,2.5);
    }
    const lx=doble?52:43, ly=45, lm=doble?169:118;
    const propor = Math.min(lm/logo.naturalWidth,lm/logo.naturalHeight);
    const lw=logo.naturalWidth*propor, lh=logo.naturalHeight*propor;
    redondo(lx-8,ly-8,lm+16,lm+16,13,"#fffdf5",color.oro);
    ctx.drawImage(logo,lx+(lm-lw)/2,ly+(lm-lh)/2,lw,lh);
    const iz=lx+lm+25, der=ancho-43, centro=(iz+der)/2;
    texto("LIGA MUNICIPAL DE FÚTBOL",centro,62,f(doble?34:22,true),color.verde,true,der-iz-12);
    texto("RÍO GRANDE",centro,99,f(doble?43:30,true),color.verde,true,der-iz-12);
    trazo([[iz,148],[iz+17,132],[der-17,132],[der,148],[der,182],[der-17,198],[iz+17,198],[iz,182]],color.oro,3,true,color.verde);
    texto(modelo.nombre.toLocaleUpperCase("es-MX"),centro,167,f(doble?56:40,true),"#fff0c9",true,der-iz-40);
    texto(modelo.subtitulo.toLocaleUpperCase("es-MX"),centro,221,f(doble?16:13),color.verde,true,der-iz);
    let y=249;
    for (const fila of filasLayout) {
        fila.forEach((g,j)=>{
            const x=margen+j*(cw+espacio);
            ctx.save();
            redondo(x,y,cw,g.h,12,color.crema);ctx.clip();
            rect(x,y,cw,38,color.verde);
            texto(g.nombre.toLocaleUpperCase("es-MX"),x+cw/2,y+20,f(24,true),"#fff0c9",true,cw-52);
            for (const cx of [x+16,x+cw-16]) trazo([[cx,y+14],[cx+5,y+19],[cx,y+24],[cx-5,y+19]],"",1,true,color.claro);
            rect(x,y+38,cw,27,color.claro);
            const xs=[x,x+cols[0],x+cols[0]+cols[1]];
            ["LOCAL","VISITANTE","PROGRAMACIÓN"].forEach((s,k)=>texto(s,xs[k]+10,y+52,f(13),color.verde));
            let yy=y+65;
            if (!g.filas.length) {
                texto("Sin partidos registrados",x+11,yy+22,f(15));
                yy+=44;
            }
            g.filas.forEach((r,k)=>{
                rect(x,yy,cw,r.h,k%2?"#f8f1df":"#fffdf5");
                rect(xs[2],yy,cols[2],r.h,r.pendiente?"#eceee6":"#fff0c3");
                trazo([[x,yy],[x+cw,yy]],color.borde,.7);
                for (const xx of xs.slice(1)) trazo([[xx,yy],[xx,yy+r.h]],color.borde,.7);
                [r.local,r.visita,r.prog].forEach((lista,col)=>lista.forEach((item,i)=>{
                    const [s,peso]=Array.isArray(item)?item:[item,700];
                    texto(s,xs[col]+10,yy+r.h/2+(i-(lista.length-1)/2)*18,f(col===2?15:16,false,peso),col===2&&peso===700?color.verde:color.texto);
                }));
                yy+=r.h;
            });
            if(g.avisos.length){
                rect(x,yy,cw,g.avisos.length*18+14,color.suave);
                g.avisos.forEach((s,i)=>texto(s,x+10,yy+16+i*18,f(14),color.verde));
            }
            ctx.restore();
            redondo(x,y,cw,g.h,12,"",color.oro);
        });
        y+=Math.max(...fila.map(g=>g.h))+espacio;
    }
    trazo([[margen,y],[ancho-margen,y]],color.oro,1);
    texto("Los horarios y las sedes pendientes se anunciarán posteriormente.",ancho/2,y+19,f(14,false,400),color.verde,true,ancho-2*margen-30);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob ? resolve(blob) : reject(Error("No se pudo crear el PNG.")),"image/png"));
}

export function instalarCarteles(selector, leer) {
    if (!selector || document.getElementById("cartelesJornada")) return;
    const estilo = document.createElement("style");
    estilo.textContent = `
#cartelesJornada{margin:12px 0 18px;color:#133b31}
#cartelesJornada .acciones-cartel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#cartelesJornada button,#vistaCartelJornada button,#vistaCartelJornada a{font:inherit;font-weight:800;padding:10px 12px;border:1px solid #0a4a3c;border-radius:11px;color:#fff;background:#106052;min-height:44px;cursor:pointer}
#cartelesJornada button:first-child,#vistaCartelJornada button{background:#f7e6b2;color:#133b31;border-color:#b89a54}
#cartelesJornada button:disabled{opacity:.6;cursor:wait}
#cartelesJornada p{margin:8px 0 0;font-size:.88rem}
#cartelesJornada p:empty{display:none}
#vistaCartelJornada{margin:auto;padding:0;width:min(92vw,650px);max-height:88vh;border:2px solid #b48a2d;border-radius:15px;background:#fff7e5;color:#133b31;overscroll-behavior:contain}
#vistaCartelJornada::backdrop{background:rgba(6,33,27,.7)}
#vistaCartelJornada .controles-cartel{position:sticky;top:0;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px;background:#fff7e5;border-bottom:1px solid #b48a2d}
#vistaCartelJornada a{text-decoration:none;display:inline-flex;align-items:center}
#vistaCartelJornada img{display:block;width:100%;height:auto}
@media(max-width:360px){#cartelesJornada .acciones-cartel{grid-template-columns:1fr}}
`;
    document.head.append(estilo);
    const area = document.createElement("section");
    area.id = "cartelesJornada";
    area.setAttribute("aria-label","Imágenes de la jornada");
    area.hidden = true;
    area.innerHTML = '<div class="acciones-cartel"><button type="button">Imagen de esta categoría</button><button type="button">Imagen de toda la jornada</button></div><p role="status" aria-live="polite"></p>';
    selector.insertAdjacentElement("afterend",area);

    const dialogo = document.createElement("dialog");
    dialogo.id = "vistaCartelJornada";
    dialogo.setAttribute("aria-label","Vista previa del cartel");
    dialogo.innerHTML = '<div class="controles-cartel"><button type="button" autofocus>Cerrar</button><a download>Descargar PNG</a></div><img alt="">';
    document.body.append(dialogo);
    const botones = [...area.querySelectorAll("button")];
    const estado = area.querySelector("p");
    const descargar = dialogo.querySelector("a");
    const img = dialogo.querySelector("img");
    let url = "";
    let ocupado = false;
    let anterior = null;
    const refrescar = () => {
        const haySeleccion = Boolean(leer().jornadaId);
        area.hidden = !haySeleccion;
        botones.forEach(b => b.disabled = !haySeleccion || ocupado);
    };
    const limpiar = () => {
        img.removeAttribute("src");
        descargar.removeAttribute("href");
        if (url) URL.revokeObjectURL(url);
        url = "";
    };
    dialogo.querySelector("button").addEventListener("click",()=>dialogo.close());
    dialogo.addEventListener("close",()=>{
        limpiar();
        anterior?.focus();
        anterior = null;
    });
    new MutationObserver(refrescar).observe(selector,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
    botones.forEach((b,i)=>b.addEventListener("click",async()=>{
        if (ocupado) return;
        const d = leer();
        const modelo = prepararCartel(d,i===1);
        if (!modelo) {estado.textContent="Aún no hay partidos ni avisos para generar esta imagen.";return;}
        ocupado = true;
        refrescar();
        estado.textContent="Generando imagen…";
        try {
            const logo = document.querySelector(".topbar-logo")?.getAttribute("src") || "imagenes/logo.png";
            const blob = await crearPNG(modelo,logo);
            if (leer().jornadaId !== d.jornadaId || leer().categoriaId !== d.categoriaId) {
                estado.textContent="La selección cambió. Genera la imagen de nuevo.";
                return;
            }
            limpiar();
            url = URL.createObjectURL(blob);
            img.src = url;
            img.alt = i===1 ? `Cartel de ${modelo.nombre} completa` : `Cartel de ${modelo.nombre}, ${modelo.grupos[0].nombre}`;
            descargar.href = url;
            descargar.download = modelo.archivo;
            anterior = b;
            dialogo.showModal();
            estado.textContent="";
        } catch (error) {
            limpiar();
            console.error(error);
            estado.textContent="No se pudo generar la imagen. Inténtalo nuevamente.";
        } finally {
            ocupado = false;
            refrescar();
        }
    }));
    refrescar();
}
