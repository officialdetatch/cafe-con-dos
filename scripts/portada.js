/* ¿Qué sale en cafecondos.com/ (index.html)? Lo decide la publicación automática.

   - ANTES del lanzamiento (LANZAMIENTO, hora de RD): sale la página de espera
     (pronto.html) con "Tenemos fecha" y la cuenta regresiva, y la portada de verdad
     se puede ver en cafenotready.html.
   - DESDE el lanzamiento: sale la portada de verdad (index.html).
   - Con el modo MANTENIMIENTO prendido: vuelve a salir la página de espera, con el
     texto "Volvemos enseguida", y la portada se ve en cafenotready.html. Solo cambia
     la portada: los artículos, episodios y demás páginas siguen abiertos.

   La cuenta regresiva de pronto.html usa la misma fecha (este script se la pone), y
   cuando llega a cero la página se va sola a la portada, aunque la publicación de esa
   hora todavía no haya terminado.

   Uso:  node scripts/portada.js _site
   Variables (las pone .github/workflows/deploy.yml):
     LANZAMIENTO     AAAA-MM-DDTHH:MM en hora de RD (ej. 2026-11-01T06:00). Solo la
                     fecha (AAAA-MM-DD) = ese día a las 6:00 am.
     MANTENIMIENTO   si | no
     AHORA           solo para probar: un momento (ej. 2026-10-31T23:00-04:00) */
"use strict";
const fs = require("fs");
const path = require("path");

const salida = process.argv[2] || "_site";
let LANZAMIENTO = String(process.env.LANZAMIENTO || "2026-11-01T06:00").trim();
if (/^\d{4}-\d{2}-\d{2}$/.test(LANZAMIENTO)) LANZAMIENTO += "T06:00";
if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(LANZAMIENTO)) LANZAMIENTO += ":00";
if (!/(Z|[+-]\d{2}:\d{2})$/.test(LANZAMIENTO)) LANZAMIENTO += "-04:00"; // hora de RD (no cambia de hora en el año)
const momento = Date.parse(LANZAMIENTO);
if (isNaN(momento)) {
  console.error("LANZAMIENTO tiene que ser AAAA-MM-DDTHH:MM (por ejemplo 2026-11-01T06:00), y es: " + process.env.LANZAMIENTO);
  process.exit(1);
}
const MANTENIMIENTO = /^(s[ií]|yes|true|1|on|prendido)$/i.test(String(process.env.MANTENIMIENTO || "").trim());
const ahora = process.env.AHORA ? Date.parse(process.env.AHORA) : Date.now();
const enRD = (ms) => new Date(ms).toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "medium", timeStyle: "short" });

// En modo mantenimiento, el título y la descripción que salen en Google y al compartir el link.
const TITULO_MANTENIMIENTO = "Café Con Dos | Volvemos enseguida";
const DESCRIPCION_MANTENIMIENTO =
  "Le estamos haciendo unos cambios a Café Con Dos. Volvemos enseguida: déjanos tu email y te avisamos en cuanto esté lista.";

const antes = ahora < momento;
const modo = antes ? "lanzamiento" : MANTENIMIENTO ? "mantenimiento" : "abierto";

const leer = (f) => fs.readFileSync(path.join(salida, f), "utf8");
const escribir = (f, s) => fs.writeFileSync(path.join(salida, f), s);

const portada = leer("index.html");
let pronto = leer("pronto.html");

// pronto.html con el texto que toca.
const textoEspera = antes ? "lanzamiento" : "mantenimiento";
pronto = pronto
  .replace(/data-pronto="[^"]*"/, 'data-pronto="' + textoEspera + '"')
  .replace(/data-lanzamiento="[^"]*"/, 'data-lanzamiento="' + LANZAMIENTO + '"');
if (textoEspera === "mantenimiento") {
  pronto = pronto
    .replace(/<title>[^<]*<\/title>/, "<title>" + TITULO_MANTENIMIENTO + "</title>")
    .replace(/(<meta property="og:title" content=")[^"]*(")/, "$1" + TITULO_MANTENIMIENTO + "$2")
    .replace(/(<meta name="description" content=")[^"]*(")/, "$1" + DESCRIPCION_MANTENIMIENTO + "$2")
    .replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + DESCRIPCION_MANTENIMIENTO + "$2");
}
escribir("pronto.html", pronto);

if (modo === "abierto") {
  // index.html ya es la portada; cafenotready.html se queda como el aviso que manda a ella.
  console.log("Portada: el sitio está ABIERTO (lanzamiento: " + enRD(momento) + ").");
} else {
  // La página de espera hace de portada (sin el noindex, para que Google siga viendo la dirección)…
  const espera = pronto.replace(/\s*<!-- Esta página no sale en Google[\s\S]*?-->\s*<meta name="robots"[^>]*>/, "");
  escribir("index.html", espera);
  // …y la portada de verdad se ve en cafenotready.html (fuera de Google).
  escribir("cafenotready.html", portada.replace(/<meta charset="utf-8">/, '<meta charset="utf-8">\n  <meta name="robots" content="noindex, follow">'));
  console.log(modo === "lanzamiento"
    ? "Portada: TENEMOS FECHA (cuenta regresiva) hasta el " + enRD(momento) + " (hora de RD). La portada de verdad está en cafenotready.html."
    : "Portada: MODO MANTENIMIENTO prendido (\"Volvemos enseguida\"). La portada de verdad está en cafenotready.html.");
}
