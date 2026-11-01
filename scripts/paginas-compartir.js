/* ==========================================================================
   Páginas para compartir: una página chiquita por cada artículo y episodio,
   con SU foto, SU título y SU resumen en la vista previa de WhatsApp,
   iMessage, Facebook, X, etc.

   Por qué hace falta: entrada.html y episodio.html arman el contenido con
   JavaScript según el ?id= del link, pero WhatsApp y compañía no corren
   JavaScript y GitHub Pages ignora todo lo que va después del "?". Todos
   veían lo mismo (la vista previa general del sitio). Aquí cada pieza tiene
   su propia dirección y su propia vista previa:

     cafecondos.com/leer/<id>        ← artículos y Sobremesa
     cafecondos.com/escuchar/<id>    ← episodios

   Cada página es una copia de entrada.html / episodio.html (ya con el
   encabezado y el pie puestos) con las etiquetas de vista previa cambiadas.
   Al abrirla, el sitio dibuja el artículo igual que siempre.

   La foto de la vista previa:
     - artículo con portada del editor (Sanity) → esa foto recortada a 1200×630
       respetando el punto de enfoque que ella marcó;
     - artículo con portada en el repo → esa foto;
     - episodio → su portada, o la miniatura grande de YouTube;
     - sin foto → la de siempre (images/og-cafe-con-dos.jpg).

   Lo corre GitHub Actions al publicar (deploy.yml), DESPUÉS de "Direcciones
   sin .html" y antes de armar el feed. Solo escribe dentro de la carpeta que
   se publica (_site); tus archivos no se tocan.
   Solo salen páginas de lo que ya está publicado: lo programado con fecha
   futura y los ejemplos no tienen página hasta su día.

   Uso:  node scripts/paginas-compartir.js _site
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.resolve(__dirname, "..");
const salida = path.resolve(process.argv[2] || path.join(raiz, "_site"));

const CARPETA_ARTICULOS = "leer";
const CARPETA_EPISODIOS = "escuchar";
const IMAGEN_GENERAL = "images/og-cafe-con-dos.jpg?v=2"; // 1200×630, la de todo el sitio

/* ---------------- datos ---------------- */
function leerDatos() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  // Se leen de la carpeta que se publica (ahí data/articulos.js ya trae lo del editor)
  // y, si algo no está ahí, del repo.
  for (const archivo of ["assets/js/config.js", "data/episodios.js", "data/articulos.js", "data/sobremesa.js"]) {
    const enSalida = path.join(salida, archivo);
    const ruta = fs.existsSync(enSalida) ? enSalida : path.join(raiz, archivo);
    if (fs.existsSync(ruta)) vm.runInContext(fs.readFileSync(ruta, "utf8"), ctx, { filename: archivo });
  }
  const cfg = ctx.window.CCD_CONFIG;
  if (!cfg) throw new Error("No se pudo leer assets/js/config.js");
  const ids = new Set();
  const articulos = (ctx.window.CCD_ARTICULOS || [])
    .concat((ctx.window.CCD_SOBREMESA || []).map((p) => Object.assign({ seccion: "sobremesa" }, p)))
    .filter((p) => p && p.id && !ids.has(p.id) && ids.add(p.id));
  const idsEp = new Set();
  const episodios = (ctx.window.CCD_EPISODIOS || []).filter((e) => e && e.id && !idsEp.has(e.id) && idsEp.add(e.id));
  return { cfg, articulos, episodios };
}

// Igual que en el sitio y en el feed: sale el día de su fecha a las 6:00 am de RD (10:00 UTC).
const publicable = (x) => !x.ejemplo && x.fecha && Date.parse(x.fecha + "T10:00:00Z") <= Date.now();
// Solo letras, números y . _ ~ - (así el nombre del archivo y la dirección son seguros).
const idSeguro = (id) => /^[A-Za-z0-9._~-]+$/.test(String(id)) && !/^\.+$/.test(String(id));

/* ---------------- textos ---------------- */
const attr = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Un resumen sacado del texto, para los artículos que no escribieron uno.
function resumenDelCuerpo(md, max) {
  const lineas = String(md || "").split(/\n+/).map((l) => l.trim()).filter((l) => l && !/^!!/.test(l) && !/^!\[/.test(l) && !/^#{1,6}\s/.test(l)); // sin bloques especiales, fotos ni títulos
  let t = lineas
    .map((l) => l.replace(/^(#{1,6}\s+|>\s+|[-*]\s+|\d+\.\s+)/, ""))
    .join(" ")
    .replace(/\u2028/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  t = t.slice(0, max);
  const corte = t.lastIndexOf(" ");
  return (corte > max * 0.6 ? t.slice(0, corte) : t).replace(/[\s,.;:–-]+$/, "") + "…";
}

// Los títulos de YouTube traen "| Entre Elementos by Café Con Dos | Ep. #3"; en la vista previa basta lo primero.
const tituloCorto = (t) => {
  const p = String(t || "").split(/\s+\|\s+/)[0].trim();
  return p.length >= 12 ? p : String(t || "").trim();
};

/* ---------------- la foto de la vista previa ---------------- */
// Foto del editor (Sanity): se pide ya recortada a 1200×630, en JPG (todas las apps lo leen),
// con el recorte y el punto de enfoque que ella marcó en el editor.
function fotoSanity(url, pos) {
  const [base, consulta = ""] = String(url).split("?");
  const rect = (consulta.match(/(?:^|&)rect=([\d,]+)/) || [])[1];
  const params = [];
  if (rect) params.push("rect=" + rect);
  params.push("w=1200", "h=630", "fit=crop");
  const m = String(pos || "").match(/^([\d.]+)% ([\d.]+)%$/);
  if (m) params.push("crop=focalpoint", "fp-x=" + (Number(m[1]) / 100).toFixed(3), "fp-y=" + (Number(m[2]) / 100).toFixed(3));
  params.push("fm=jpg", "q=80");
  return base + "?" + params.join("&");
}

function imagenArticulo(p, sitio) {
  const general = { url: sitio + "/" + IMAGEN_GENERAL, w: 1200, h: 630, alt: "Café Con Dos" };
  const portada = String(p.portada || "").trim();
  if (!portada) return general;
  const alt = p.portadaAlt || p.titulo || "";
  if (/^https:\/\/cdn\.sanity\.io\//.test(portada)) return { url: fotoSanity(portada, p.portadaPos), w: 1200, h: 630, alt };
  if (/^https?:\/\//.test(portada)) return { url: portada, alt };
  return { url: sitio + "/" + portada.replace(/^\//, ""), alt };
}

// Miniatura grande de YouTube si existe (si no, la mediana, que nunca tiene franjas negras).
async function miniaturaYoutube(id) {
  const base = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/";
  try {
    const r = await fetch(base + "maxresdefault.jpg", { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (r.ok) return { url: base + "maxresdefault.jpg", w: 1280, h: 720 };
  } catch (e) { /* se usa la mediana */ }
  return { url: base + "mqdefault.jpg", w: 320, h: 180 };
}

async function imagenEpisodio(e, sitio) {
  const portada = String(e.portada || "").trim();
  const alt = tituloCorto(e.titulo);
  if (portada) return { url: /^https?:\/\//.test(portada) ? portada : sitio + "/" + portada.replace(/^\//, ""), alt };
  if (e.youtube) return Object.assign(await miniaturaYoutube(e.youtube), { alt });
  return { url: sitio + "/" + IMAGEN_GENERAL, w: 1200, h: 630, alt: "Café Con Dos" };
}

/* ---------------- la página ---------------- */
function etiquetas(d) {
  const l = [];
  l.push("<title>" + attr(d.titulo) + " | Café Con Dos</title>");
  l.push('<meta name="description" content="' + attr(d.descripcion) + '">');
  l.push('<link rel="canonical" href="' + attr(d.url) + '">');
  l.push('<meta property="og:type" content="' + d.tipo + '">');
  l.push('<meta property="og:site_name" content="Café Con Dos">');
  l.push('<meta property="og:locale" content="' + d.locale + '">');
  l.push('<meta property="og:url" content="' + attr(d.url) + '">');
  l.push('<meta property="og:title" content="' + attr(d.titulo) + '">');
  l.push('<meta property="og:description" content="' + attr(d.descripcion) + '">');
  l.push('<meta property="og:image" content="' + attr(d.imagen.url) + '">');
  if (d.imagen.w && d.imagen.h) {
    l.push('<meta property="og:image:width" content="' + d.imagen.w + '">');
    l.push('<meta property="og:image:height" content="' + d.imagen.h + '">');
  }
  if (d.imagen.alt) l.push('<meta property="og:image:alt" content="' + attr(d.imagen.alt) + '">');
  if (d.tipo === "article") {
    if (d.fecha) l.push('<meta property="article:published_time" content="' + attr(d.fecha) + '">');
    if (d.seccion) l.push('<meta property="article:section" content="' + attr(d.seccion) + '">');
  }
  l.push('<meta name="twitter:card" content="summary_large_image">');
  l.push('<meta name="twitter:title" content="' + attr(d.titulo) + '">');
  l.push('<meta name="twitter:description" content="' + attr(d.descripcion) + '">');
  l.push('<meta name="twitter:image" content="' + attr(d.imagen.url) + '">');
  return l.map((x) => "  " + x).join("\n");
}

function armarPagina(plantilla, d, id) {
  let html = plantilla.replace(/\r\n/g, "\n");

  // 1. Fuera la vista previa general; entra la de esta pieza.
  html = html
    .replace(/^[ \t]*<title>[\s\S]*?<\/title>\n/m, "")
    .replace(/^[ \t]*<meta name="description"[^>]*>\n/m, "")
    .replace(/^[ \t]*<meta property="og:[^"]*"[^>]*>\n/gm, "")
    .replace(/^[ \t]*<meta name="twitter:[^"]*"[^>]*>\n/gm, "");
  if (!html.includes('<meta charset="utf-8">')) throw new Error("la plantilla no tiene <meta charset>");
  html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + etiquetas(d));

  // 2. La página vive en una carpeta: todo link relativo pasa a empezar con "/"
  //    (igual que hace la 404) y el sitio lo sabe por data-base="/".
  html = html
    .replace(/\b(href|src)="\.\/"/g, '$1="/"')
    .replace(/\b(href|src)="(?!https?:|\/|#|mailto:|tel:|data:)([^"]*)"/g, '$1="/$2"');
  if (!/<body data-page="\w+"/.test(html)) throw new Error("la plantilla no tiene <body data-page=…>");
  html = html.replace(/<body data-page="(\w+)"/, '<body data-page="$1" data-base="/"');

  // 3. Qué pieza es (en la dirección ya no hay ?id=).
  const marca = '<script src="/assets/js/config.js"></script>';
  if (!html.includes(marca)) throw new Error("la plantilla no carga assets/js/config.js");
  html = html.replace(marca, "<script>window.CCD_ID=" + JSON.stringify(id).replace(/</g, "\\u003c") + ";</script>\n  " + marca);

  return html;
}

/* ---------------- todo junto ---------------- */
async function main() {
  const { cfg, articulos, episodios } = leerDatos();
  const sitio = String(cfg.siteUrl || "").replace(/\/$/, "");
  if (!sitio) throw new Error("Falta siteUrl en assets/js/config.js");

  const leerPlantilla = (f) => {
    const ruta = path.join(salida, f);
    return fs.existsSync(ruta) ? fs.readFileSync(ruta, "utf8") : null;
  };
  const plantillaArt = leerPlantilla("entrada.html");
  const plantillaEp = leerPlantilla("episodio.html");
  if (!plantillaArt || !plantillaEp) throw new Error("No encuentro entrada.html o episodio.html en " + salida);

  const seccionNombre = (id) => ((cfg.secciones || []).find((s) => s.id === id) || {}).nombre || "";
  const serieNombre = (id) => ((cfg.series || []).find((s) => s.id === id) || {}).nombre || "";
  const descripcionGeneral = (typeof cfg.descripcion === "object" ? (cfg.descripcion || {}).es : cfg.descripcion) ||
    "Café Con Dos es una plataforma independiente que explora la cultura, la creatividad, las personas y las ideas.";

  const escribir = (carpeta, id, html) => {
    const dir = path.join(salida, carpeta);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, id + ".html"), html);
  };
  let hechos = 0, omitidos = 0;
  const omitir = (que, id, motivo) => { omitidos++; console.warn("  ! " + que + ' "' + id + '": ' + motivo); };

  // Artículos y Sobremesa
  for (const p of articulos.filter(publicable)) {
    if (!idSeguro(p.id)) { omitir("Artículo", p.id, "la dirección tiene caracteres raros; queda con el link de siempre."); continue; }
    try {
      const en = p.idioma && p.idioma !== "es";
      const d = {
        tipo: "article",
        titulo: String(p.titulo || "").trim() || "Café Con Dos",
        descripcion: String(p.resumen || "").replace(/\s+/g, " ").trim() || resumenDelCuerpo(p.cuerpo, 180) || descripcionGeneral,
        url: sitio + "/" + CARPETA_ARTICULOS + "/" + encodeURIComponent(p.id),
        imagen: imagenArticulo(p, sitio),
        locale: en ? "en_US" : "es_DO",
        fecha: p.fecha,
        seccion: seccionNombre(p.seccion || "sobremesa")
      };
      escribir(CARPETA_ARTICULOS, p.id, armarPagina(plantillaArt, d, p.id));
      hechos++;
    } catch (e) { omitir("Artículo", p.id, e.message); }
  }

  // Episodios
  for (const e of episodios.filter(publicable)) {
    if (!idSeguro(e.id)) { omitir("Episodio", e.id, "la dirección tiene caracteres raros; queda con el link de siempre."); continue; }
    try {
      const serie = serieNombre(e.serie);
      const etiqueta = [serie, e.numero ? "Ep. " + e.numero : ""].filter(Boolean).join(" · ");
      const resumen = String(e.resumen || "").replace(/\s+/g, " ").trim();
      const d = {
        tipo: "website",
        titulo: tituloCorto(e.titulo) || "Café Con Dos",
        descripcion: [etiqueta, resumen].filter(Boolean).join(" — ") || "Escucha este episodio de Café Con Dos.",
        url: sitio + "/" + CARPETA_EPISODIOS + "/" + encodeURIComponent(e.id),
        imagen: await imagenEpisodio(e, sitio),
        locale: "es_DO"
      };
      escribir(CARPETA_EPISODIOS, e.id, armarPagina(plantillaEp, d, e.id));
      hechos++;
    } catch (err) { omitir("Episodio", e.id, err.message); }
  }

  console.log("Páginas para compartir: " + hechos + " listas" + (omitidos ? ", " + omitidos + " omitidas (ver arriba)" : "") + " en " + salida + ".");
}

main().catch((e) => {
  console.error("\nNo se pudieron armar las páginas para compartir (el sitio se publica igual, con los links de siempre):\n" + (e && e.stack || e));
  process.exit(1);
});
