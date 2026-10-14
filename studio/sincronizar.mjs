/* Copia del sitio al editor lo que el editor necesita saber: el proyecto de
   Sanity, el dominio, las secciones, los temas y las hosts. Todo sale de
   ../assets/js/config.js, así hay un solo lugar donde cambiarlo.
   Corre solo antes de "npm run dev", "npm run build" y "npm run deploy". */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const rutaConfig = path.join(aqui, "..", "assets", "js", "config.js");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(rutaConfig, "utf8"), ctx, { filename: "config.js" });
const cfg = ctx.window.CCD_CONFIG;
const s = cfg.sanity || {};

const falta = (msg) => {
  console.error("\n✖ " + msg + "\n");
  process.exit(1);
};
if (!s.projectId) falta('Falta sanity.projectId en assets/js/config.js (cópialo de sanity.io/manage).');
if (process.argv.includes("--ci") && !s.studioAppId) {
  falta("Falta sanity.studioAppId en assets/js/config.js. Publica el editor una vez desde tu computadora con \"npm run deploy\" y copia el appId que te da.");
}

const sitio = {
  nombre: cfg.nombre || "Café Con Dos",
  siteUrl: String(cfg.siteUrl || "").replace(/\/$/, ""),
  projectId: s.projectId,
  dataset: s.dataset || "production",
  studioAppId: s.studioAppId || "",
  secciones: (cfg.secciones || []).map((x) => ({ id: x.id, nombre: x.nombre, descripcion: x.descripcion || "" })),
  temas: (cfg.temas || []).map((x) => ({ id: x.id, nombre: x.nombre || x.es || x.id })),
  hosts: (cfg.hosts || []).map((x) => ({ id: x.id, nombre: x.nombre }))
};

fs.mkdirSync(path.join(aqui, "generado"), { recursive: true });
fs.writeFileSync(
  path.join(aqui, "generado", "sitio.js"),
  "// Generado por sincronizar.mjs desde assets/js/config.js. No se edita a mano.\n" +
    "const sitio = " + JSON.stringify(sitio, null, 2) + ";\nexport default sitio;\n"
);
console.log("✔ Editor sincronizado con config.js (" + sitio.secciones.length + " secciones, " + sitio.temas.length + " temas).");
