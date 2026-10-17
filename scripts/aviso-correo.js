/* ==========================================================================
   Avisa por correo (Brevo) a los suscriptores cuando sale un artículo nuevo.
   Lo corre GitHub Actions justo DESPUÉS de publicar el sitio
   (.github/workflows/aviso-articulos.yml), con los artículos tal como quedaron
   en el sitio (los del editor Sanity + los de data/articulos.js).

   Uso:  node scripts/aviso-correo.js <carpeta-con-data/articulos.js>

   Cómo decide qué avisar (para que nadie reciba duplicados ni un montón de
   correos viejos):
   - Solo avisa de artículos publicados en el sitio desde AVISOS_DESDE en
     adelante. Si AVISOS_DESDE está vacío, los avisos están APAGADOS
     (así se pueden subir artículos antes del lanzamiento sin mandar nada).
   - "Publicado" = la misma hora que usa feed.xml (6:00 am de RD del día elegido
     en Sanity, o la hora real si se subió ese mismo día).
   - No manda dos veces el mismo artículo: antes de enviar mira si ya existe en
     Brevo una campaña llamada "Aviso: <id del artículo>".
   - Si hay más de MAX_NUEVOS (3) artículos por avisar de golpe, no manda nada
     y falla a propósito: se mandan uno por uno con "Run workflow".

   Variables (las pone el workflow):
     BREVO_API_KEY (secreto)   BREVO_LIST_ID   SENDER_EMAIL   SENDER_NAME   REPLY_TO
     AVISOS_DESDE   MODE = dry-run | test | send   STORY_ID   TEST_EMAIL   FORCE
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { cuando } = require("./feed.js");

const raiz = path.resolve(__dirname, "..");
const carpeta = path.resolve(process.argv[2] || path.join(raiz, "_site"));
const API = (process.env.BREVO_API_URL || "https://api.brevo.com/v3").replace(/\/$/, "");
const env = (k) => String(process.env[k] || "").trim();
const MODE = (env("MODE") || "dry-run").toLowerCase();
const FORCE = /^true$/i.test(env("FORCE"));
const MAX_NUEVOS = 3;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

/* ---------- datos del sitio ---------- */
function leer() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  const rutas = [
    [path.join(raiz, "assets/js/config.js")],
    [path.join(carpeta, "data/articulos.js"), path.join(raiz, "data/articulos.js")],
    [path.join(carpeta, "data/sobremesa.js"), path.join(raiz, "data/sobremesa.js")]
  ];
  for (const opciones of rutas) {
    const r = opciones.find((f) => fs.existsSync(f));
    if (r) vm.runInContext(fs.readFileSync(r, "utf8"), ctx, { filename: r });
  }
  const cfg = ctx.window.CCD_CONFIG;
  if (!cfg) throw new Error("No se pudo leer assets/js/config.js");
  const ids = new Set();
  const articulos = (ctx.window.CCD_ARTICULOS || []).concat((ctx.window.CCD_SOBREMESA || []).map((p) => Object.assign({ seccion: "sobremesa" }, p)))
    .filter((p) => p && p.id && !ids.has(p.id) && ids.add(p.id));
  return { cfg, articulos };
}

/* ---------- el correo ---------- */
function construirCorreo(a, cfg) {
  const sitio = String(env("SITIO_URL") || cfg.siteUrl || "").replace(/\/$/, "");
  const url = sitio + "/entrada.html?id=" + encodeURIComponent(a.id);
  const img = a.portada ? (/^https?:/.test(a.portada) ? a.portada : sitio + "/" + String(a.portada).replace(/^\//, "")) : "";
  const sec = (cfg.secciones || []).find((s) => s.id === (a.seccion || "sobremesa"));
  const etiqueta = sec ? (sec.corto || sec.nombre) : "";
  const r = cfg.redes || {};
  const redes = [["Instagram", r.instagram], ["YouTube", r.youtube], ["Spotify", r.spotify], ["TikTok", r.tiktok]]
    .filter(([, u]) => u && /^https?:/.test(u));
  const asunto = (a.seccion === "sobremesa" ? "Sobremesa: " : "") + a.titulo;
  const previa = a.resumen || "Nuevo en Café Con Dos.";
  const fondo = (c) => "background:" + c + ";background-image:linear-gradient(" + c + "," + c + ");";
  const html =
'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' +
'<html xmlns="http://www.w3.org/1999/xhtml" lang="es"><head>\n' +
'<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
'<meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" />\n' +
"<title>" + esc(asunto) + "</title>\n" +
'<link href="https://fonts.googleapis.com/css2?family=Antonio:wght@600;700&amp;family=Literata:wght@400;600&amp;display=swap" rel="stylesheet" type="text/css" />\n' +
'<style type="text/css">\n' +
"  :root { color-scheme: light only; supported-color-schemes: light only; }\n" +
"  body { margin:0; padding:0; background:#E9CAB0; } table { border-collapse:collapse; } img { border:0; display:block; } a { color:#723F40; }\n" +
"  @media (prefers-color-scheme: dark) { body, .fondo { background:#E9CAB0 !important; } .tarjeta { background:#FBF3EC !important; } }\n" +
"  [data-ogsc] .fondo { background-color:#E9CAB0 !important; } [data-ogsc] .tarjeta { background-color:#FBF3EC !important; }\n" +
"  @media only screen and (max-width:620px) { .contenedor { width:100% !important; } .relleno { padding-left:24px !important; padding-right:24px !important; } .titulo { font-size:30px !important; line-height:36px !important; } .foto { width:100% !important; height:auto !important; } }\n" +
"</style></head>\n" +
'<body style="margin:0;padding:0;background:#E9CAB0;">\n' +
'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' + esc(previa) + "&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n" +
'<table role="presentation" class="fondo" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#E9CAB0" style="' + fondo("#E9CAB0") + '"><tr>' +
'<td class="fondo" align="center" bgcolor="#E9CAB0" style="padding:32px 12px;' + fondo("#E9CAB0") + '">\n' +
'<table role="presentation" class="contenedor" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;">\n' +
'<tr><td align="center" style="padding:0 0 14px;font-family:\'Antonio\',\'Arial Narrow\',Arial,sans-serif;font-size:15px;line-height:20px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#723F40;">Café para llevar</td></tr>\n' +
'<tr><td class="tarjeta" bgcolor="#FBF3EC" style="' + fondo("#FBF3EC") + 'border-radius:22px 22px 22px 6px;overflow:hidden;">\n' +
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">\n' +
(img ? '<tr><td style="font-size:0;line-height:0;border-radius:22px 22px 0 0;overflow:hidden;"><a href="' + esc(url) + '" target="_blank"><img class="foto" src="' + esc(img) + '" width="560" alt="' + esc(a.portadaAlt || a.titulo) + '" style="width:560px;max-width:100%;height:auto;" /></a></td></tr>\n' : "") +
(etiqueta ? '<tr><td class="relleno" align="left" style="padding:' + (img ? "28" : "36") + 'px 44px 0;font-family:\'Antonio\',\'Arial Narrow\',Arial,sans-serif;font-size:14px;line-height:18px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#9A3816;">' + esc(etiqueta) + "</td></tr>\n" : "") +
'<tr><td class="relleno titulo" align="left" style="padding:' + (etiqueta ? "10" : (img ? "28" : "36")) + 'px 44px 0;font-family:\'Antonio\',\'Arial Narrow\',Arial,sans-serif;font-size:34px;line-height:40px;font-weight:700;color:#3A1F20;">' + esc(a.titulo) + "</td></tr>\n" +
(a.resumen ? '<tr><td class="relleno" align="left" style="padding:16px 44px 0;font-family:\'Literata\',Georgia,\'Times New Roman\',serif;font-size:17px;line-height:28px;color:#6B4744;">' + esc(a.resumen) + "</td></tr>\n" : "") +
'<tr><td class="relleno" align="left" style="padding:26px 44px 40px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#723F40" style="background:#723F40;border-radius:14px 14px 14px 4px;">' +
'<a href="' + esc(url) + '" target="_blank" style="display:inline-block;padding:13px 26px;font-family:\'Antonio\',\'Arial Narrow\',Arial,sans-serif;font-size:18px;font-weight:600;letter-spacing:.3px;color:#F5E4D5;text-decoration:none;">Leer el artículo &rarr;</a></td></tr></table></td></tr>\n' +
"</table></td></tr>\n" +
(redes.length ? '<tr><td align="center" style="padding:26px 20px 0;font-family:\'Antonio\',\'Arial Narrow\',Arial,sans-serif;font-size:16px;line-height:24px;font-weight:600;">' +
  redes.map(([n, u]) => '<a href="' + esc(u) + '" target="_blank" style="color:#723F40;text-decoration:underline;text-decoration-color:#F47D50;">' + n + "</a>").join('<span style="color:#C9A28C;">&nbsp;·&nbsp;</span>') + "</td></tr>\n" : "") +
'<tr><td align="center" style="padding:18px 20px 0;font-family:\'Antonio\',\'Arial Narrow\',Arial,sans-serif;font-size:16px;line-height:23px;font-weight:600;color:#723F40;" lang="en">' + esc(cfg.lema || "Stories worth discovering.") + "</td></tr>\n" +
'<tr><td align="center" style="padding:10px 20px 0;font-family:\'Literata\',Georgia,\'Times New Roman\',serif;font-size:13px;line-height:20px;color:#8A6560;">' +
'Recibes este correo porque te suscribiste en cafecondos.com.<br /><a href="{{ unsubscribe }}" style="color:#8A6560;">Darme de baja</a> · <a href="{{ mirror }}" style="color:#8A6560;">Ver en el navegador</a></td></tr>\n' +
"</table></td></tr></table></body></html>\n";
  return { asunto, previa, html, url };
}

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

async function esperarSitio(a, cfg) {
  const sitio = String(env("SITIO_URL") || cfg.siteUrl || "").replace(/\/$/, "");
  const limite = Date.now() + (Number(env("ESPERA_MINUTOS")) || 10) * 60000;
  while (true) {
    try {
      const r = await fetch(sitio + "/data/articulos.js?v=" + Date.now(), { headers: { "cache-control": "no-cache" } });
      if (r.ok && (await r.text()).includes(JSON.stringify(a.id))) return;
    } catch (e) { /* se reintenta */ }
    if (Date.now() > limite) throw new Error('El artículo "' + a.id + '" todavía no aparece en ' + sitio + " después de esperar. No se mandó nada.");
    console.log("Esperando a que el artículo esté en línea…");
    await espera(Number(env("ESPERA_SEGUNDOS")) * 1000 || 15000);
  }
}

/* ---------- principal ---------- */
async function main() {
  if (!["dry-run", "test", "send"].includes(MODE)) throw new Error('MODE debe ser dry-run, test o send (llegó "' + MODE + '").');
  const { cfg, articulos } = leer();
  const ahora = Date.now();
  const publicados = articulos.filter((a) => !a.ejemplo && a.titulo && a.fecha && cuando(a).getTime() <= ahora);

  let porAvisar;
  const manual = env("STORY_ID");
  if (manual) {
    const a = articulos.find((x) => x.id === manual);
    if (!a) throw new Error('No existe un artículo con la dirección "' + manual + '". Usa la de la URL: entrada.html?id=<esta>.');
    if (!publicados.includes(a)) throw new Error('"' + manual + '" todavía no está publicado (su fecha es futura o le falta título).');
    porAvisar = [a];
  } else {
    const desde = Date.parse(env("AVISOS_DESDE"));
    if (isNaN(desde)) {
      console.log("Avisos apagados: la variable AVISOS_DESDE está vacía. No se manda nada.\n" +
        "(Para encenderlos: GitHub > Settings > Secrets and variables > Actions > Variables > AVISOS_DESDE, p. ej. 2026-11-01T00:00:00Z.)");
      return;
    }
    porAvisar = publicados.filter((a) => cuando(a).getTime() >= desde);
  }

  if (!porAvisar.length) { console.log("No hay artículos nuevos para avisar."); return; }
  if (!manual && porAvisar.length > MAX_NUEVOS) {
    throw new Error("Hay " + porAvisar.length + " artículos por avisar de golpe (" + porAvisar.map((a) => a.id).join(", ") + ").\n" +
      "Por seguridad no se manda nada. Avísalos uno por uno: Actions > 'Aviso por correo' > Run workflow.");
  }

  if (MODE !== "dry-run") {
    if (!env("BREVO_API_KEY")) throw new Error("Falta el secreto BREVO_API_KEY.");
    if (!env("SENDER_EMAIL")) throw new Error("Falta la variable SENDER_EMAIL (p. ej. newsletter@cafecondos.com).");
    if (MODE === "send" && !/^\d+$/.test(env("BREVO_LIST_ID"))) throw new Error("Falta la variable BREVO_LIST_ID (el número de la lista en Brevo).");
    if (MODE === "test" && !env("TEST_EMAIL")) throw new Error("En modo test hace falta TEST_EMAIL.");
  }

  const existentes = MODE === "send" ? await campanasExistentes() : [];
  const remitente = { name: env("SENDER_NAME") || cfg.nombre || "Café Con Dos", email: env("SENDER_EMAIL") || "newsletter@example.com" };
  const respuesta = env("REPLY_TO") ? { email: env("REPLY_TO"), name: remitente.name } : undefined;

  for (const a of porAvisar) {
    const correo = construirCorreo(a, cfg);
    const nombre = "Aviso: " + a.id;
    console.log("\n▸ " + a.titulo + "  (" + a.id + ")");

    if (MODE === "dry-run") {
      const archivo = path.join(process.cwd(), "email-preview-" + a.id + ".html");
      fs.writeFileSync(archivo, correo.html);
      console.log("  Vista previa guardada: " + archivo + "\n  Asunto: " + correo.asunto + "\n  (modo dry-run: no se mandó nada)");
      continue;
    }

    const yaEsta = existentes.filter((c) => c.name === nombre || (c.name || "").startsWith(nombre + " (reenv"));
    const enviada = yaEsta.find((c) => c.status !== "draft");
    if (MODE === "send" && enviada && !FORCE) { console.log("  Ya se avisó antes (campaña '" + enviada.name + "', " + enviada.status + "). Se omite."); continue; }

    await esperarSitio(a, cfg);

    if (MODE === "send") {
      const borrador = !FORCE && yaEsta.find((c) => c.status === "draft");
      let id = borrador && borrador.id;
      if (!id) {
        const sufijo = enviada && FORCE ? " (reenvío " + new Date().toISOString().slice(0, 16).replace("T", " ") + ")" : "";
        const creada = await brevo("POST", "/emailCampaigns", {
          name: nombre + sufijo, subject: correo.asunto, previewText: correo.previa.slice(0, 150),
          sender: remitente, replyTo: respuesta, htmlContent: correo.html,
          recipients: { listIds: [Number(env("BREVO_LIST_ID"))] }
        });
        id = creada.id;
      } else console.log("  Había un borrador sin enviar; se envía ese.");
      await brevo("POST", "/emailCampaigns/" + id + "/sendNow");
      console.log("  ✔ Enviado a la lista " + env("BREVO_LIST_ID") + " (campaña #" + id + ").");
    } else {
      const creada = await brevo("POST", "/emailCampaigns", {
        name: "Prueba: " + a.id + " " + Date.now(), subject: "[PRUEBA] " + correo.asunto, previewText: correo.previa.slice(0, 150),
        sender: remitente, replyTo: respuesta, htmlContent: correo.html
      });
      await brevo("POST", "/emailCampaigns/" + creada.id + "/sendTest", { emailTo: [env("TEST_EMAIL")] });
      console.log("  ✔ Correo de prueba enviado a " + env("TEST_EMAIL") + ".");
      try { await brevo("DELETE", "/emailCampaigns/" + creada.id); } catch (e) { console.log("  (el borrador de prueba #" + creada.id + " puedes borrarlo en Brevo)"); }
    }
  }
}

main().catch((e) => { console.error("\n✖ " + (e && e.message || e)); process.exit(1); });
