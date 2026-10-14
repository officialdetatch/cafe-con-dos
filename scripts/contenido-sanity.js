/* ==========================================================================
   Trae los artículos publicados en el editor (Sanity) y los deja listos para
   el sitio. Lo corre GitHub Actions antes de build-feed.js, así feed.xml,
   sitemap.xml y la página usan exactamente lo mismo.
   Uso:  node scripts/contenido-sanity.js <carpeta-del-sitio>   (p. ej. _site)

   - Escribe <carpeta>/data/articulos.js = lo de Sanity + lo que todavía esté
     en data/articulos.js del repo (si un id está en los dos, gana Sanity).
     Lo que se borra o se despublica en Sanity desaparece en la próxima
     publicación del sitio.
   - Escribe <carpeta>/data/episodios.json: la lista de episodios que el
     editor muestra en "Episodio relacionado".
   - Si sanity.projectId está vacío en config.js, no hace nada con Sanity.
   - Si Sanity no responde, termina con error y GitHub NO publica: el sitio
     se queda como estaba (mejor eso que publicar sin los artículos).
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.resolve(__dirname, "..");
const salida = path.resolve(process.argv[2] || path.join(raiz, "_site"));
const API_VERSION = "v2025-02-19";

function leerDatos() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const archivo of ["assets/js/config.js", "data/episodios.js", "data/articulos.js", "data/sobremesa.js"]) {
    const ruta = path.join(raiz, archivo);
    if (fs.existsSync(ruta)) vm.runInContext(fs.readFileSync(ruta, "utf8"), ctx, { filename: archivo });
  }
  if (!ctx.window.CCD_CONFIG) throw new Error("No se pudo leer assets/js/config.js");
  return {
    cfg: ctx.window.CCD_CONFIG,
    episodios: ctx.window.CCD_EPISODIOS || [],
    articulos: (ctx.window.CCD_ARTICULOS || []).concat((ctx.window.CCD_SOBREMESA || []).map((p) => Object.assign({ seccion: "sobremesa" }, p)))
  };
}

/* ---------------- texto enriquecido de Sanity → markdown del sitio ----------------
   El sitio ya sabe mostrar: ## y ### títulos, > citas, - y 1. listas, **negrita**,
   *cursiva*, [links](url) e ![imágenes](url). Aquí se traduce a eso. */
function marcar(texto, marcas, defs) {
  let t = String(texto || "").replace(/\s*\n\s*/g, " ");
  if (!t.trim() || !marcas || !marcas.length) return t;
  // Los espacios de las orillas se quedan afuera de ** * y [ ].
  const ini = t.match(/^\s*/)[0], fin = t.match(/\s*$/)[0];
  t = t.trim();
  // Solo links normales (http, https, mailto); cualquier otra cosa se ignora.
  const link = marcas.map((m) => defs[m]).find((d) => d && d._type === "link" && /^(https?:|mailto:)/i.test(String(d.href || "").trim()));
  if (marcas.includes("em")) t = "*" + t + "*";
  if (marcas.includes("strong")) t = "**" + t + "**";
  if (link) t = "[" + t + "](" + String(link.href).trim().replace(/[()\s]/g, (c) => ({ "(": "%28", ")": "%29" }[c] || "%20")) + ")";
  return ini + t + fin;
}

function bloqueTexto(b) {
  const defs = {};
  (b.markDefs || []).forEach((d) => (defs[d._key] = d));
  return (b.children || []).map((c) => marcar(c.text, c.marks, defs)).join("").trim();
}

function textoAMarkdown(bloques) {
  const partes = [];
  let previoLista = null;
  (bloques || []).forEach((b) => {
    if (!b) return;
    if (b._type === "image") {
      previoLista = null;
      if (b.url) partes.push({ txt: "![" + String(b.alt || "").replace(/[\[\]]/g, "") + "](" + b.url + "?w=1400&fit=max&auto=format)" });
      return;
    }
    if (b._type !== "block") return;
    const txt = bloqueTexto(b);
    if (!txt) { previoLista = null; return; }
    if (b.listItem) {
      const linea = (b.listItem === "number" ? "1. " : "- ") + txt;
      // Los puntos seguidos de la misma lista van en líneas seguidas.
      if (previoLista === b.listItem) partes[partes.length - 1].txt += "\n" + linea;
      else partes.push({ txt: linea });
      previoLista = b.listItem;
      return;
    }
    previoLista = null;
    const estilo = b.style || "normal";
    if (estilo === "h1" || estilo === "h2") partes.push({ txt: "## " + txt });
    else if (/^h[3-6]$/.test(estilo)) partes.push({ txt: "### " + txt });
    else if (estilo === "blockquote") partes.push({ txt: "> " + txt });
    else partes.push({ txt });
  });
  return partes.map((p) => p.txt).join("\n\n");
}

/* ---------------- fotos ----------------
   Sanity guarda la foto original y la sirve al tamaño pedido. Si en el editor
   se recortó, se pide ese recorte; el punto de enfoque se pasa al sitio para
   que las tarjetas no corten caras. */
function fotoPortada(f) {
  if (!f || !f.url) return { portada: "" };
  const params = ["w=1600", "fit=max", "auto=format"];
  const dim = f.dim || {};
  const c = f.crop;
  let pos = "";
  let area = { x: 0, y: 0, w: 1, h: 1 };
  if (c && dim.width && dim.height && (c.left || c.right || c.top || c.bottom)) {
    area = { x: c.left || 0, y: c.top || 0, w: 1 - (c.left || 0) - (c.right || 0), h: 1 - (c.top || 0) - (c.bottom || 0) };
    params.unshift("rect=" + [area.x * dim.width, area.y * dim.height, area.w * dim.width, area.h * dim.height].map(Math.round).join(","));
  }
  const h = f.hotspot;
  if (h && typeof h.x === "number" && typeof h.y === "number") {
    const px = Math.min(100, Math.max(0, ((h.x - area.x) / area.w) * 100));
    const py = Math.min(100, Math.max(0, ((h.y - area.y) / area.h) * 100));
    if (Math.abs(px - 50) > 1 || Math.abs(py - 50) > 1) pos = px.toFixed(1).replace(/\.0$/, "") + "% " + py.toFixed(1).replace(/\.0$/, "") + "%";
  }
  return { portada: f.url + "?" + params.join("&"), portadaPos: pos };
}

const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugify = (s) => sinAcentos(s).toLowerCase().replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");

const CONSULTA = `*[_type == "articulo" && !(_id in path("drafts.**"))] | order(fecha desc) {
  _id, "slug": slug.current, titulo, fecha, seccion, idioma, autor, publicado, destacado,
  resumen, temas, episodio,
  personas[]{ nombre, rol, link },
  "foto": portada{ "url": asset->url, "dim": asset->metadata.dimensions{ width, height }, alt, crop, hotspot },
  cuerpo[]{ ..., _type == "image" => { "url": asset->url, alt } }
}`;

function convertir(doc, cfg) {
  const foto = fotoPortada(doc.foto);
  const hosts = cfg.hosts || [];
  const a = {
    id: doc.slug || slugify(doc.titulo) || String(doc._id).slice(-8),
    titulo: String(doc.titulo || "").trim(),
    fecha: doc.fecha,
    seccion: doc.seccion,
    idioma: doc.idioma || "es",
    autor: doc.autor || (hosts[0] && hosts[0].id) || "",
    portada: foto.portada,
    portadaAlt: (doc.foto && doc.foto.alt) || "",
    temas: Array.isArray(doc.temas) ? doc.temas : [],
    personas: (doc.personas || []).filter((p) => p && p.nombre).map((p) => ({ nombre: p.nombre, rol: p.rol || "", link: p.link || "" })),
    episodio: doc.episodio || "",
    resumen: String(doc.resumen || "").trim(),
    cuerpo: textoAMarkdown(doc.cuerpo),
    destacado: !!doc.destacado
  };
  if (foto.portadaPos) a.portadaPos = foto.portadaPos;
  if (doc.publicado) a.publicado = doc.publicado;
  return a;
}

async function traerDeSanity(cfg) {
  const s = cfg.sanity || {};
  const base = (process.env.SANITY_API_URL || "https://" + s.projectId + ".api.sanity.io").replace(/\/$/, "");
  const url = base + "/" + API_VERSION + "/data/query/" + encodeURIComponent(s.dataset || "production") +
    "?query=" + encodeURIComponent(CONSULTA) + "&perspective=published";
  const headers = { Accept: "application/json" };
  if (process.env.SANITY_READ_TOKEN) headers.Authorization = "Bearer " + process.env.SANITY_READ_TOKEN;
  let ultimoError;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(url, { headers });
      const cuerpo = await r.text();
      if (!r.ok) throw new Error("Sanity respondió " + r.status + ": " + cuerpo.slice(0, 300));
      const json = JSON.parse(cuerpo);
      if (!Array.isArray(json.result)) throw new Error("Respuesta inesperada de Sanity: " + cuerpo.slice(0, 300));
      return json.result;
    } catch (e) {
      ultimoError = e;
      if (intento < 3) await new Promise((ok) => setTimeout(ok, 2000 * intento));
    }
  }
  throw ultimoError;
}

async function main() {
  const { cfg, episodios, articulos } = leerDatos();
  fs.mkdirSync(path.join(salida, "data"), { recursive: true });

  // Lista de episodios para el editor ("Episodio relacionado").
  const listaEps = episodios.filter((e) => e && e.id)
    .map((e) => ({ id: e.id, titulo: e.titulo || e.id, fecha: e.fecha || "", ejemplo: !!e.ejemplo }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  fs.writeFileSync(path.join(salida, "data", "episodios.json"), JSON.stringify(listaEps));

  const s = cfg.sanity || {};
  if (!s.projectId) {
    console.log("Sanity sin configurar (sanity.projectId vacío): los artículos salen de data/articulos.js.");
    return;
  }

  const docs = await traerDeSanity(cfg);
  const vistos = new Set();
  const deSanity = [];
  docs.forEach((d) => {
    const a = convertir(d, cfg);
    if (!a.titulo || !a.fecha || !a.seccion) {
      console.warn("Se omite " + d._id + ": le falta título, fecha o sección.");
      return;
    }
    if (vistos.has(a.id)) {
      const nuevo = a.id + "-" + String(d._id).replace(/[^a-z0-9]/gi, "").slice(-4).toLowerCase();
      console.warn('Dos artículos con la dirección "' + a.id + '": el más viejo queda como "' + nuevo + '".');
      a.id = nuevo;
    }
    vistos.add(a.id);
    deSanity.push(a);
  });

  const delRepo = articulos.filter((a) => a && a.id && !vistos.has(a.id));
  const todos = deSanity.concat(delRepo);
  fs.writeFileSync(path.join(salida, "data", "articulos.js"),
    "/* Café Con Dos — artículos. Generado al publicar el sitio:\n" +
    "   " + deSanity.length + " del editor (Sanity) + " + delRepo.length + " de data/articulos.js.\n" +
    "   No se edita a mano: este archivo solo existe en el sitio publicado. */\n" +
    "window.CCD_ARTICULOS = " + JSON.stringify(todos, null, 2) + ";\n");
  // Si quedaba un data/sobremesa.js viejo, ya está incluido arriba.
  const viejo = path.join(salida, "data", "sobremesa.js");
  if (fs.existsSync(viejo)) fs.unlinkSync(viejo);

  console.log("Artículos listos: " + deSanity.length + " del editor (Sanity) + " + delRepo.length + " de data/articulos.js.");
}

if (require.main === module) {
  main().catch((e) => {
    console.error("\nNo se pudieron traer los artículos de Sanity, así que el sitio NO se publica\n" +
      "esta vez (la versión que ya está en línea se queda igual).\n" + (e && e.stack || e));
    process.exit(1);
  });
}

module.exports = { textoAMarkdown, fotoPortada, convertir, slugify, CONSULTA };
