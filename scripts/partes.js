/* ==========================================================================
   Copia el encabezado, el pie y el bloque del newsletter (carpeta partes/)
   dentro de cada página .html, entre sus marcas:
       <!-- parte: pie (se edita en partes/pie.html) -->
       ...esto se reemplaza...
       <!-- /parte: pie -->
   Así se editan en un solo lugar y salen iguales en todas las páginas.

   Uso:
     node scripts/partes.js          → actualiza las páginas del repo (para verlas
                                       en tu computadora después de editar partes/)
     node scripts/partes.js _site    → lo mismo en la carpeta que se publica
                                       (lo corre GitHub Actions al publicar)
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const destino = path.resolve(process.argv[2] || raiz);
const carpetaPartes = path.join(raiz, "partes");

const partes = {};
for (const f of fs.readdirSync(carpetaPartes)) {
  if (f.endsWith(".html")) partes[f.replace(/\.html$/, "")] = fs.readFileSync(path.join(carpetaPartes, f), "utf8").replace(/\s+$/, "");
}

// En páginas que pueden abrirse desde cualquier carpeta (la 404), los links
// relativos de las partes se vuelven absolutos ("images/x.png" → "/images/x.png").
const absolutos = (html) => html.replace(/\b(href|src)="(?!https?:|\/|#|mailto:|tel:|data:)([^"]*)"/g, '$1="/$2"');

let paginas = 0, cambios = 0;
const MARCA = /([ \t]*)<!-- parte: ([\w-]+)[^>]*-->[\s\S]*?<!-- \/parte: \2 -->/g;
for (const f of fs.readdirSync(destino)) {
  if (!f.endsWith(".html")) continue;
  const ruta = path.join(destino, f);
  const antes = fs.readFileSync(ruta, "utf8");
  const conBase = /<body[^>]*data-base="\/"/.test(antes);
  const despues = antes.replace(MARCA, (todo, sangria, nombre) => {
    if (!(nombre in partes)) {
      console.warn("  ! " + f + ": no existe partes/" + nombre + ".html");
      return todo;
    }
    let html = conBase ? absolutos(partes[nombre]) : partes[nombre];
    html = html.split("\n").map((l) => (l ? sangria + l : l)).join("\n");
    return sangria + "<!-- parte: " + nombre + " (se edita en partes/" + nombre + ".html) -->\n" + html + "\n" + sangria + "<!-- /parte: " + nombre + " -->";
  });
  paginas++;
  if (despues !== antes) { fs.writeFileSync(ruta, despues); cambios++; }
}
console.log("Partes copiadas: " + paginas + " páginas revisadas, " + cambios + " actualizadas.");
