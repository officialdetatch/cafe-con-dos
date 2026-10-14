/* ==========================================================================
   Genera feed.xml y sitemap.xml a partir de config.js y de los datos.
   Lo corre GitHub Actions en cada push y cada mañana (.github/workflows/deploy.yml).
   Uso:  node scripts/build-feed.js <carpeta-de-salida>
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.resolve(__dirname, "..");
const salida = path.resolve(process.argv[2] || raiz);

// Los archivos del sitio escriben en window.*: los cargamos en un contexto aislado.
// Se leen de la carpeta de salida si están ahí (en _site, data/articulos.js ya
// trae lo del editor de Sanity: ver contenido-sanity.js), y si no, del repo.
const ctx = { window: {} };
vm.createContext(ctx);
// (data/sobremesa.js es de la versión anterior: si todavía existe, también se lee.)
for (const archivo of ["assets/js/config.js", "data/episodios.js", "data/articulos.js", "data/sobremesa.js"]) {
  const enSalida = path.join(salida, archivo);
  const ruta = fs.existsSync(enSalida) ? enSalida : path.join(raiz, archivo);
  if (!fs.existsSync(ruta)) continue;
  vm.runInContext(fs.readFileSync(ruta, "utf8"), ctx, { filename: archivo });
}
const cfg = ctx.window.CCD_CONFIG;
const episodios = ctx.window.CCD_EPISODIOS || [];
const ids = new Set();
const entradas = (ctx.window.CCD_ARTICULOS || []).concat((ctx.window.CCD_SOBREMESA || []).map((p) => Object.assign({ seccion: "sobremesa" }, p)))
  .filter((p) => p && !ids.has(p.id) && ids.add(p.id));
if (!cfg) throw new Error("No se pudo leer assets/js/config.js");

const { buildFeed, buildSitemap } = require("./feed.js");
fs.mkdirSync(salida, { recursive: true });
fs.writeFileSync(path.join(salida, "feed.xml"), buildFeed(cfg, episodios, entradas));
fs.writeFileSync(path.join(salida, "sitemap.xml"), buildSitemap(cfg, episodios, entradas));

const items = (fs.readFileSync(path.join(salida, "feed.xml"), "utf8").match(/<item>/g) || []).length;
console.log("feed.xml y sitemap.xml listos en " + salida + " (" + items + " en el feed)");
