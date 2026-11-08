/* ==========================================================================
   Modo mantenimiento: TODO el sitio vuelve a la página de espera.

   Con la variable MANTENIMIENTO = si, portada.js ya pone la página de espera
   ("Volvemos enseguida") en cafecondos.com/. Este paso va más lejos: cualquier
   otra página (artículos, episodios, En Portada, Tienda… y las direcciones que
   no existen) manda a quien llegue a esa página de espera, así nadie se
   encuentra con el sitio a medias aunque tenga un link guardado.

   Cómo: se agrega un mini-script al principio de cada página publicada. Corre
   antes de que se dibuje nada y manda al visitante a "/". No se toca nada de tu
   carpeta: solo la copia que se publica (_site), y solo cuando el modo está
   prendido. Al apagarlo (borrar la variable y volver a publicar) todo vuelve
   a como estaba.

   Para que tú y ella puedan seguir viendo el sitio mientras tanto:
     - abran una vez  cafecondos.com/cafenotready.html  en ese navegador: queda
       marcado como "equipo" y todas las páginas se abren normal en ese navegador;
     - para volver a ver lo que ve el público:  cafecondos.com/cafenotready.html?salir
     - la vista previa del editor (entrada.html?previa=1) nunca se redirige.

   Límite de GitHub Pages: no puede avisar a Google con un "503 volvemos pronto";
   para una pausa corta no pasa nada, pero no conviene dejarlo prendido semanas.

   Uso:  node scripts/mantenimiento.js _site
   Variable (la pone .github/workflows/deploy.yml):  MANTENIMIENTO  si | no
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const salida = path.resolve(process.argv[2] || "_site");
const MANTENIMIENTO = /^(s[ií]|yes|true|1|on|prendido)$/i.test(String(process.env.MANTENIMIENTO || "").trim());
if (!MANTENIMIENTO) {
  console.log("Mantenimiento: apagado, el resto del sitio queda abierto.");
  process.exit(0);
}

// Carpetas que no son páginas del sitio (o que son herramientas internas).
const SALTAR_CARPETAS = new Set(["writers", "assets", "images", "data", "audio", "node_modules", ".git", "studio"]);
// La portada (que en mantenimiento ya ES la página de espera) y la puerta del equipo.
const SALTAR_ARCHIVOS = new Set(["index.html", "pronto.html", "cafenotready.html"]);

const REDIRIGIR = [
  "<script>/* mantenimiento: el sitio vuelve a la página de espera (scripts/mantenimiento.js). Equipo: /cafenotready.html */",
  '(function(){if(/(^|[?&])previa=/.test(location.search))return;try{if(localStorage.getItem("ccd-equipo")==="1")return}catch(e){}location.replace("/")})();</script>'
].join("\n");

const MARCAR_EQUIPO =
  '<script>/* mantenimiento: quien abre esta página queda como "equipo" y ve el sitio completo. ?salir lo quita. */\n' +
  'try{if(/[?&]salir(&|=|$)/.test(location.search))localStorage.removeItem("ccd-equipo");else localStorage.setItem("ccd-equipo","1")}catch(e){}</script>';

function paginas(dir) {
  let lista = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SALTAR_CARPETAS.has(e.name)) lista = lista.concat(paginas(path.join(dir, e.name))); }
    else if (e.name.endsWith(".html")) lista.push(path.join(dir, e.name));
  }
  return lista;
}

// Mete el script justo después de <meta charset> (o de <head>), una sola vez.
function inyectar(html, script) {
  if (/<meta charset="utf-8">/i.test(html)) return html.replace(/<meta charset="utf-8">/i, (m) => m + "\n  " + script);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + "\n  " + script);
  return null;
}

let cerradas = 0;
const sinCabeza = [];
for (const f of paginas(salida)) {
  const nombre = path.basename(f);
  if (path.dirname(f) === salida && SALTAR_ARCHIVOS.has(nombre)) continue;
  let html = fs.readFileSync(f, "utf8");
  if (/<body[^>]*data-pronto=/.test(html)) continue; // por si otra copia de la página de espera
  if (html.includes("scripts/mantenimiento.js")) continue; // ya cerrada
  const nuevo = inyectar(html, REDIRIGIR);
  if (nuevo === null) { sinCabeza.push(path.relative(salida, f)); continue; }
  fs.writeFileSync(f, nuevo);
  cerradas++;
}

// La puerta del equipo: la portada de verdad (ya viene sin Google) marca el navegador.
const puerta = path.join(salida, "cafenotready.html");
if (fs.existsSync(puerta)) {
  const actual = fs.readFileSync(puerta, "utf8");
  const nuevo = actual.includes("queda como \"equipo\"") ? null : inyectar(actual, MARCAR_EQUIPO);
  if (nuevo) fs.writeFileSync(puerta, nuevo);
}

console.log("Mantenimiento: PRENDIDO. " + cerradas + " páginas mandan a la página de espera." +
  (fs.existsSync(puerta) ? " El equipo entra por /cafenotready.html." : "") +
  (sinCabeza.length ? "\n  ! Sin <head> (no se cerraron): " + sinCabeza.join(", ") : ""));
