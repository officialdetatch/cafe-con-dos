/* ==========================================================================
   Manda por correo (Brevo) el BOLETÍN semanal escrito en el editor (Sanity):
   la pestaña "Boletín". No sale en el sitio; solo por correo.
   Lo corre GitHub Actions (.github/workflows/boletin.yml), justo después de
   publicar el sitio (cada vez que se publica algo en Sanity y cada mañana a las
   6:00 am de RD) y también a mano con "Run workflow".

   Uso:  node scripts/boletin-correo.js

   Cómo decide qué mandar (para que nadie reciba duplicados ni correos viejos):
   - Solo cuenta lo PUBLICADO en Sanity (un borrador nunca sale).
   - Sale el día de "Enviar el" a las 6:00 am de RD (o en cuanto se publica, si ese
     día ya pasó la hora). Si la fecha ya pasó hace más de 3 días, no se manda solo
     (por si alguien publica uno viejo); se manda a mano con "Run workflow".
   - Si AVISOS_DESDE está vacío, los envíos automáticos están APAGADOS (el mismo
     interruptor de lanzamiento que los avisos de artículos). Los envíos a mano
     (Run workflow) siempre funcionan.
   - No manda dos veces lo mismo: antes de enviar mira si ya existe en Brevo una
     campaña con el código del boletín entre corchetes: "Boletín: … [<id>]".
     Por eso, si se edita y se vuelve a publicar un boletín ya enviado, no se reenvía.
   - Si hay más de un boletín por mandar de golpe, no manda nada y falla a propósito.

   Variables (las pone el workflow):
     BREVO_API_KEY (secreto)   BREVO_LIST_ID   SENDER_EMAIL   SENDER_NAME   REPLY_TO
     AVISOS_DESDE   MODE = dry-run | test | send   BOLETIN = "" | ultimo | AAAA-MM-DD (fecha de envío) | id
     TEST_EMAIL   FORCE   SANITY_READ_TOKEN (opcional, solo si el dataset es privado)
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");

const raiz = path.resolve(__dirname, "..");
const API = (process.env.BREVO_API_URL || "https://api.brevo.com/v3").replace(/\/$/, "");
const API_VERSION = "2024-01-01";
const env = (k) => String(process.env[k] || "").trim();
const MODE = (env("MODE") || "dry-run").toLowerCase();
const FORCE = /^true$/i.test(env("FORCE"));
const VENTANA_MS = 3 * 24 * 60 * 60 * 1000;

const CONSULTA = `*[_type == "boletin" && !(_id in path("drafts.**"))] | order(fechaEnvio desc, _updatedAt desc) {
  _id, titulo, fechaEnvio, intro, cierre,
  entradas[]{ fecha, etiqueta, titulo, texto, link, foto{ asset, alt, hotspot } }
}`;

function leerConfig() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  const r = path.join(raiz, "assets/js/config.js");
  vm.runInContext(fs.readFileSync(r, "utf8"), ctx, { filename: r });
  if (!ctx.window.CCD_CONFIG) throw new Error("No se pudo leer assets/js/config.js");
  return ctx.window.CCD_CONFIG;
}

async function traerBoletines(cfg) {
  const s = cfg.sanity || {};
  if (!s.projectId) throw new Error("Falta sanity.projectId en assets/js/config.js.");
  const base = (process.env.SANITY_API_URL || "https://" + s.projectId + ".api.sanity.io").replace(/\/$/, "");
  const url = base + "/v" + API_VERSION + "/data/query/" + encodeURIComponent(s.dataset || "production") +
    "?query=" + encodeURIComponent(CONSULTA) + "&perspective=published";
  const headers = { Accept: "application/json" };
  if (env("SANITY_READ_TOKEN")) headers.Authorization = "Bearer " + env("SANITY_READ_TOKEN");
  let ultimo;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(url, { headers });
      const texto = await r.text();
      if (!r.ok) throw new Error("Sanity respondió " + r.status + ": " + texto.slice(0, 300));
      const json = JSON.parse(texto);
      if (!Array.isArray(json.result)) throw new Error("Respuesta inesperada de Sanity: " + texto.slice(0, 300));
      return json.result;
    } catch (e) {
      ultimo = e;
      if (intento < 3) await new Promise((ok) => setTimeout(ok, 2000 * intento));
    }
  }
  throw ultimo;
}

const momentoEnvio = (b) => Date.parse((b.fechaEnvio || "") + "T10:00:00Z"); // 6:00 am en RD (UTC-4)
const etiqueta = (b) => '"' + (b.titulo || "sin título") + '" (' + b.fechaEnvio + ")";

/* ---------- Brevo ---------- */
async function brevo(metodo, ruta, cuerpo) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { "api-key": env("BREVO_API_KEY"), accept: "application/json", "content-type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await r.text();
  if (!r.ok) throw new Error("Brevo " + metodo + " " + ruta + " → " + r.status + ": " + texto.slice(0, 400));
  try { return texto ? JSON.parse(texto) : {}; } catch (e) { return {}; }
}

async function campanasExistentes() {
  const todas = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const r = await brevo("GET", "/emailCampaigns?limit=100&offset=" + offset + "&sort=desc");
    const lote = r.campaigns || [];
    todas.push(...lote);
    if (lote.length < 100) break;
  }
  return todas;
}

const codigo = (b) => "[" + b._id + "]";
const nombreCampana = (b) => ("Boletín: " + String(b.titulo || "").replace(/[\[\]]/g, "").slice(0, 80) + " · " + b.fechaEnvio + " " + codigo(b));

/* ---------- principal ---------- */
async function main() {
  if (!["dry-run", "test", "send"].includes(MODE)) throw new Error('MODE debe ser dry-run, test o send (llegó "' + MODE + '").');
  const cfg = leerConfig();
  const { construirBoletin } = await import(pathToFileURL(path.join(__dirname, "boletin-html.mjs")).href);
  const sitio = {
    siteUrl: String(env("SITIO_URL") || cfg.siteUrl || "").replace(/\/$/, ""),
    lema: cfg.lema || "",
    redes: cfg.redes || {},
    projectId: (cfg.sanity || {}).projectId,
    dataset: (cfg.sanity || {}).dataset || "production"
  };

  const todos = (await traerBoletines(cfg)).filter((b) => b.fechaEnvio && !isNaN(momentoEnvio(b)));
  const ahora = Date.now();

  let porMandar;
  const manual = env("BOLETIN");
  if (manual) {
    let b;
    if (manual.toLowerCase() === "ultimo" || manual.toLowerCase() === "último") b = todos[0];
    else b = todos.find((x) => x._id === manual) || todos.find((x) => x.fechaEnvio === manual);
    if (!b) throw new Error('No hay ningún boletín PUBLICADO que coincida con "' + manual + '". Escribe "ultimo", la fecha de envío (AAAA-MM-DD) o el id. Recuerda que un borrador no cuenta: hay que darle Publicar en el editor.');
    porMandar = [b];
  } else {
    const desde = Date.parse(env("AVISOS_DESDE"));
    if (isNaN(desde)) {
      console.log("Envíos automáticos apagados: la variable AVISOS_DESDE está vacía. No se manda nada.\n" +
        "(Para encenderlos: GitHub > Settings > Secrets and variables > Actions > Variables > AVISOS_DESDE, p. ej. 2026-11-01T00:00:00Z.)");
      return;
    }
    const vencidos = todos.filter((b) => momentoEnvio(b) <= ahora && momentoEnvio(b) >= desde);
    const viejos = vencidos.filter((b) => ahora - momentoEnvio(b) > VENTANA_MS);
    viejos.forEach((b) => console.log("Se omite " + etiqueta(b) + ": su fecha de envío ya pasó hace más de 3 días. Si quieres mandarlo igual: Actions > 'Boletín por correo' > Run workflow."));
    porMandar = vencidos.filter((b) => ahora - momentoEnvio(b) <= VENTANA_MS);
  }

  if (!porMandar.length) { console.log("No hay boletines por mandar."); return; }
  if (!manual && porMandar.length > 1) {
    throw new Error("Hay " + porMandar.length + " boletines por mandar de golpe (" + porMandar.map(etiqueta).join(", ") + ").\n" +
      "Por seguridad no se manda nada. Mándalos uno por uno: Actions > 'Boletín por correo' > Run workflow.");
  }

  if (MODE !== "dry-run") {
    if (!env("BREVO_API_KEY")) throw new Error("Falta el secreto BREVO_API_KEY.");
    if (!env("SENDER_EMAIL")) throw new Error("Falta la variable SENDER_EMAIL (p. ej. newsletter@cafecondos.com).");
    if (MODE === "send" && !/^\d+$/.test(env("BREVO_LIST_ID"))) throw new Error("Falta la variable BREVO_LIST_ID (el número de la lista en Brevo).");
    if (MODE === "test" && !env("TEST_EMAIL")) throw new Error("En modo test hace falta TEST_EMAIL.");
  }

  const existentes = MODE === "send" ? await campanasExistentes() : [];
  const remitente = { name: env("SENDER_NAME") || cfg.nombre || "Café Con Dos", email: env("SENDER_EMAIL") || "newsletter@example.com" };
  const respuesta = env("REPLY_TO") || undefined; // en campañas, replyTo es solo el correo (texto)

  for (const b of porMandar) {
    console.log("\n▸ " + etiqueta(b));
    if (!(b.entradas || []).length) { console.log("  No tiene entradas. Se omite."); continue; }
    const correo = construirBoletin({ boletin: b, sitio, vistaPrevia: MODE === "dry-run" });

    if (MODE === "dry-run") {
      const archivo = path.join(process.cwd(), "email-preview-boletin-" + b.fechaEnvio + ".html");
      fs.writeFileSync(archivo, correo.html);
      console.log("  Vista previa guardada: " + archivo + "\n  Asunto: " + correo.asunto + "\n  (modo dry-run: no se mandó nada)");
      continue;
    }

    if (MODE === "send") {
      const yaEsta = existentes.filter((c) => (c.name || "").includes(codigo(b)));
      const enviada = yaEsta.find((c) => c.status !== "draft");
      if (enviada && !FORCE) { console.log("  Ya se mandó antes (campaña '" + enviada.name + "', " + enviada.status + "). Se omite."); continue; }
      const borrador = !FORCE && yaEsta.find((c) => c.status === "draft");
      let id = borrador && borrador.id;
      if (!id) {
        const sufijo = enviada && FORCE ? " (reenvío " + new Date().toISOString().slice(0, 16).replace("T", " ") + ")" : "";
        const creada = await brevo("POST", "/emailCampaigns", {
          name: nombreCampana(b) + sufijo, subject: correo.asunto, previewText: correo.previa.slice(0, 150),
          sender: remitente, replyTo: respuesta, htmlContent: correo.html,
          recipients: { listIds: [Number(env("BREVO_LIST_ID"))] }
        });
        id = creada.id;
      } else console.log("  Había un borrador sin enviar; se envía ese.");
      await brevo("POST", "/emailCampaigns/" + id + "/sendNow");
      console.log("  ✔ Enviado a la lista " + env("BREVO_LIST_ID") + " (campaña #" + id + ").");
    } else {
      const creada = await brevo("POST", "/emailCampaigns", {
        name: "Prueba boletín: " + b.fechaEnvio + " " + Date.now(), subject: "[PRUEBA] " + correo.asunto, previewText: correo.previa.slice(0, 150),
        sender: remitente, replyTo: respuesta, htmlContent: correo.html
      });
      await brevo("POST", "/emailCampaigns/" + creada.id + "/sendTest", { emailTo: [env("TEST_EMAIL")] });
      console.log("  ✔ Correo de prueba enviado a " + env("TEST_EMAIL") + ".");
      try { await brevo("DELETE", "/emailCampaigns/" + creada.id); } catch (e) { console.log("  (el borrador de prueba #" + creada.id + " puedes borrarlo en Brevo)"); }
    }
  }
}

main().catch((e) => { console.error("\n✖ " + (e && e.message || e)); process.exit(1); });
