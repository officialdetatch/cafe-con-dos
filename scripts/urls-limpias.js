/* Direcciones sin ".html": cafecondos.com/enportada en vez de cafecondos.com/enportada.html.

   GitHub Pages ya abre "enportada.html" cuando alguien pide "/enportada", así que solo
   hay que cambiar los links. Este script lo hace en la copia que se publica (_site),
   NO en tus archivos: en la computadora todo sigue con .html y se puede abrir igual.

   Cambia, en los .html y en los .js de assets/ y data/ de la carpeta que se publica:
     enportada.html?seccion=x  →  enportada?seccion=x
     index.html                →  ./      (y "/index.html" → "/")
   Solo toca las páginas que están en la raíz del sitio (enportada.html, entrada.html…);
   partes/, writers/ y los demás archivos se quedan igual.

   Uso:  node scripts/urls-limpias.js _site */
"use strict";
const fs = require("fs");
const path = require("path");

const salida = process.argv[2] || "_site";
const paginas = fs.readdirSync(salida)
  .filter((f) => f.endsWith(".html") && f !== "index.html")
  .map((f) => f.slice(0, -5).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

// "nombre.html" cuando es un link a una página de la raíz: antes va una comilla, "/", "=", "(" o un espacio,
// y después nada de letras (así no toca "partes/pie.html" ni "episodio-writer.html").
const rePagina = new RegExp("(^|[\"'=(\\s/])(" + paginas.join("|") + ")\\.html(?![\\w-])", "g");
const reIndexAbs = /\/index\.html(?![\w-])/g;               // "/index.html", "https://…/index.html" → "/"
const reIndexRel = /(^|["'=(\s])index\.html(?![\w-])/g;     // "index.html" → "./"

// Lo que está dentro de una carpeta (partes/…, writers/…, images/…) no se toca.
const enCarpeta = (todo, i) => /(^|[^\w.:-])(partes|writers|images|assets|data|audio|scripts|studio)$/.test(todo.slice(0, i));

function limpiar(texto) {
  return texto
    .replace(rePagina, (m, antes, nombre, i, todo) => (antes === "/" && enCarpeta(todo, i) ? m : antes + nombre))
    .replace(reIndexAbs, (m, i, todo) => (enCarpeta(todo, i) ? m : "/"))
    .replace(reIndexRel, "$1./");
}

let cambiados = 0;
function recorrer(carpeta, filtro) {
  if (!fs.existsSync(carpeta)) return;
  for (const f of fs.readdirSync(carpeta)) {
    const ruta = path.join(carpeta, f);
    if (!filtro(f) || fs.statSync(ruta).isDirectory()) continue;
    const antes = fs.readFileSync(ruta, "utf8");
    const despues = limpiar(antes);
    if (despues !== antes) { fs.writeFileSync(ruta, despues); cambiados++; }
  }
}
recorrer(salida, (f) => f.endsWith(".html"));
recorrer(path.join(salida, "assets", "js"), (f) => f.endsWith(".js"));
recorrer(path.join(salida, "data"), (f) => f.endsWith(".js"));
console.log("Direcciones sin .html: " + cambiados + " archivos listos (" + paginas.length + " páginas).");
