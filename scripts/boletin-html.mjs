/* ==========================================================================
   El correo del BOLETÍN semanal ("Lo que viene esta semana").

   Este archivo lo usan dos cosas, para que la vista previa del editor y el correo
   que sale a los suscriptores sean exactamente iguales:
     - scripts/boletin-correo.js  (GitHub Actions: manda el correo por Brevo)
     - el editor (Sanity Studio), que lo copia a studio/generado/ con
       "node sincronizar.mjs" y lo muestra en la pestaña "Vista previa".

   No depende de nada de Node ni del navegador: recibe datos y devuelve texto.

   construirBoletin({ boletin, sitio, modo, vistaPrevia })
     boletin: { titulo, intro, cierre, entradas: [{ fecha, etiqueta, titulo, texto, link, foto }] }
              (foto = el campo imagen de Sanity: { asset: { _ref }, alt, hotspot })
     sitio:   { siteUrl, lema, redes: { instagram, youtube, spotify, tiktok }, projectId, dataset }
     modo:    undefined (claro y oscuro automático, como llega a los suscriptores)
              "claro" | "oscuro" (fuerza uno, para la vista previa)
     vistaPrevia: true cambia {{ unsubscribe }} y {{ mirror }} (de Brevo) por "#".
   Devuelve { asunto, previa, html }.
   ========================================================================== */

// Lo que dice el pie del correo (cámbialo aquí si quieres otras palabras).
export const TEXTO_REDES = "Síguenos en nuestras redes para estar al tanto de todo lo nuevo.";
export const ENCABEZADO_POR_DEFECTO = "Lo que viene esta semana";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function partesFecha(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isNaN(d)) return null;
  return { dia: d.getUTCDate(), mes: MESES[d.getUTCMonth()], semana: DIAS[d.getUTCDay()], clave: m[1] + m[2] + m[3] };
}

// "Lunes 19 de octubre"
export function fechaLarga(iso) {
  const p = partesFecha(iso);
  return p ? mayus(p.semana) + " " + p.dia + " de " + p.mes : "";
}

// "Del 19 al 25 de octubre" · "Del 28 de octubre al 3 de noviembre" · "19 de octubre"
export function rangoFechas(fechas) {
  const ps = (fechas || []).map(partesFecha).filter(Boolean).sort((a, b) => (a.clave < b.clave ? -1 : 1));
  if (!ps.length) return "";
  const a = ps[0], b = ps[ps.length - 1];
  if (a.clave === b.clave) return a.dia + " de " + a.mes;
  if (a.mes === b.mes) return "Del " + a.dia + " al " + b.dia + " de " + a.mes;
  return "Del " + a.dia + " de " + a.mes + " al " + b.dia + " de " + b.mes;
}

// De la imagen de Sanity a su dirección en el CDN. Sirve con { asset: { _ref } } o { asset: { url } }.
export function urlFoto(foto, sitio, opciones) {
  const asset = foto && foto.asset;
  if (!asset) return "";
  const o = Object.assign({ w: 336, h: 252 }, opciones);
  let base = "";
  if (asset.url) base = asset.url;
  else {
    const ref = asset._ref || asset._id || "";
    const m = /^image-([A-Za-z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/.exec(ref);
    if (!m || !sitio || !sitio.projectId) return "";
    base = "https://cdn.sanity.io/images/" + sitio.projectId + "/" + (sitio.dataset || "production") + "/" + m[1] + "-" + m[2] + "." + m[3];
  }
  const p = ["w=" + o.w, "h=" + o.h, "fit=crop", "auto=format"];
  const hs = foto.hotspot;
  if (hs && typeof hs.x === "number" && typeof hs.y === "number") p.push("crop=focalpoint", "fp-x=" + hs.x.toFixed(3), "fp-y=" + hs.y.toFixed(3));
  return base + "?" + p.join("&");
}

const parrafos = (txt, estilo) =>
  String(txt || "").replace(/\r/g, "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p, i) => '<p style="margin:' + (i ? "10px" : "0") + ' 0 0;' + estilo + '">' + esc(p).replace(/\n/g, "<br />") + "</p>").join("");

const FUENTE_TITULOS = "'Antonio','Arial Narrow',Arial,sans-serif";
const FUENTE_TEXTO = "'Literata',Georgia,'Times New Roman',serif";

function reglasOscuras(auto) {
  // Se usan los mismos colores que el correo de aviso de artículos.
  const R = [
    "body, .fondo { background:#241513 !important; } .tarjeta { background:#35211F !important; }",
    ".t-marca, .t-lema, .t-fecha { color:#E9CAB0 !important; } .t-etiqueta { color:#F47D50 !important; } .t-titulo { color:#FBF3EC !important; } .t-sub { color:#F5C7AE !important; } .t-texto { color:#E3C9B6 !important; }",
    ".t-boton { background:#E9CAB0 !important; } .t-boton a { color:#3A1F20 !important; } .t-link, .t-link a { color:#F5C7AE !important; } .t-sep { color:#8A6A5C !important; }",
    ".linea { border-color:#5A3A35 !important; } .t-pie, .t-pie a { color:#B99A8C !important; }",
    ".logo-d { display:none !important; max-height:0 !important; } .logo-n { display:block !important; max-height:none !important; }"
  ].join("\n    ");
  if (!auto) return "  " + R + "\n";
  const G = [
    "[data-ogsb] .fondo { background-color:#241513 !important; } [data-ogsb] .tarjeta { background-color:#35211F !important; } [data-ogsb] .t-boton { background-color:#E9CAB0 !important; }",
    "[data-ogsc] .t-marca, [data-ogsc] .t-lema, [data-ogsc] .t-fecha { color:#E9CAB0 !important; } [data-ogsc] .t-etiqueta { color:#F47D50 !important; } [data-ogsc] .t-titulo { color:#FBF3EC !important; } [data-ogsc] .t-sub { color:#F5C7AE !important; } [data-ogsc] .t-texto { color:#E3C9B6 !important; }",
    "[data-ogsc] .t-boton a { color:#3A1F20 !important; } [data-ogsc] .t-link a { color:#F5C7AE !important; } [data-ogsc] .t-pie, [data-ogsc] .t-pie a { color:#B99A8C !important; }",
    "[data-ogsc] .logo-d { display:none !important; } [data-ogsc] .logo-n { display:block !important; max-height:none !important; }"
  ].join("\n  ");
  return "  @media (prefers-color-scheme: dark) {\n    " + R + "\n  }\n  " + G + "\n";
}

export function construirBoletin({ boletin, sitio, modo, vistaPrevia }) {
  const b = boletin || {};
  const s = sitio || {};
  const base = String(s.siteUrl || "").replace(/\/$/, "");
  const titulo = String(b.titulo || "").trim() || ENCABEZADO_POR_DEFECTO;
  const entradas = (b.entradas || [])
    .filter((e) => e && (e.titulo || e.texto || e.fecha))
    .slice()
    .sort((x, y) => String(x.fecha || "9999").localeCompare(String(y.fecha || "9999")));
  const rango = rangoFechas(entradas.map((e) => e.fecha));
  const r = s.redes || {};
  const redes = [["Instagram", r.instagram], ["YouTube", r.youtube], ["Spotify", r.spotify], ["TikTok", r.tiktok]].filter(([, u]) => u && /^https?:/.test(u));
  const previa = (String(b.intro || "").replace(/\s+/g, " ").trim() ||
    (entradas.length ? entradas.map((e) => e.titulo).filter(Boolean).slice(0, 3).join(" · ") : "")).slice(0, 140) || "Lo que viene en Café Con Dos.";
  const asunto = titulo;
  const fondo = (c) => "background:" + c + ";";
  const unsub = vistaPrevia ? "#" : "{{ unsubscribe }}";
  const espejo = vistaPrevia ? "#" : "{{ mirror }}";

  const filas = entradas.map((e, i) => {
    const foto = urlFoto(e.foto, s);
    const fecha = fechaLarga(e.fecha);
    const alt = (e.foto && e.foto.alt) || e.titulo || "";
    const enlace = e.link && /^https?:|^mailto:/.test(e.link) ? e.link : "";
    const izquierda = foto
      ? '<td class="ecol" width="168" valign="top" style="width:168px;padding:0 18px 0 0;font-size:0;line-height:0;">' +
        (enlace ? '<a href="' + esc(enlace) + '" target="_blank">' : "") +
        '<img class="efoto" src="' + esc(foto) + '" width="168" height="126" alt="' + esc(alt) + '" style="width:168px;height:auto;border-radius:12px;" />' +
        (enlace ? "</a>" : "") + "</td>"
      : "";
    const derecha =
      '<td valign="top" style="padding:0;">' +
      (e.etiqueta ? '<div class="t-etiqueta" style="font-family:' + FUENTE_TITULOS + ';font-size:13px;line-height:16px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#9A3816;padding:0 0 4px;">' + esc(e.etiqueta) + "</div>" : "") +
      (fecha ? '<div class="t-fecha" style="font-family:' + FUENTE_TITULOS + ';font-size:26px;line-height:30px;font-weight:700;color:#723F40;">' + esc(fecha) + "</div>" : "") +
      (e.titulo ? '<div class="t-titulo" style="font-family:' + FUENTE_TEXTO + ';font-size:17px;line-height:24px;font-weight:600;color:#3A1F20;padding:' + (fecha ? "6" : "0") + 'px 0 0;">' + esc(e.titulo) + "</div>" : "") +
      "</td>";
    const texto = e.texto
      ? '<tr><td colspan="2" class="t-texto" style="padding:14px 0 0;font-family:' + FUENTE_TEXTO + ';font-size:16px;line-height:26px;color:#6B4744;">' + parrafos(e.texto, "") + "</td></tr>"
      : "";
    const mas = enlace
      ? '<tr><td colspan="2" class="t-link" style="padding:10px 0 0;font-family:' + FUENTE_TITULOS + ';font-size:16px;line-height:22px;font-weight:600;"><a href="' + esc(enlace) + '" target="_blank" style="color:#723F40;text-decoration:underline;text-decoration-color:#F47D50;">Ver más &rarr;</a></td></tr>'
      : "";
    return (i ? '<tr><td class="relleno" style="padding:24px 36px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="linea" style="border-top:1px solid #E1BFA6;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table></td></tr>\n' : "") +
      '<tr><td class="relleno" style="padding:' + (i ? "24" : "28") + 'px 36px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>' + izquierda + derecha + "</tr>" + texto + mas + "</table></td></tr>\n";
  }).join("");

  const html =
'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' +
'<html xmlns="http://www.w3.org/1999/xhtml" lang="es"><head>\n' +
'<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
'<meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" />\n' +
"<title>" + esc(asunto) + "</title>\n" +
'<link href="https://fonts.googleapis.com/css2?family=Antonio:wght@600;700&amp;family=Literata:wght@400;600&amp;display=swap" rel="stylesheet" type="text/css" />\n' +
'<style type="text/css">\n' +
"  :root { color-scheme: light dark; supported-color-schemes: light dark; }\n" +
"  body { margin:0; padding:0; background:#E9CAB0; } table { border-collapse:collapse; } img { border:0; display:block; } a { color:#723F40; }\n" +
(modo === "claro" ? "" : "  /* Modo oscuro (Apple Mail y los que lo respetan). Gmail y otros lo invierten solos. */\n" + reglasOscuras(modo !== "oscuro")) +
"  @media only screen and (max-width:620px) { .contenedor { width:100% !important; } .relleno { padding-left:22px !important; padding-right:22px !important; } .titulo { font-size:32px !important; line-height:38px !important; } .ecol { width:116px !important; padding-right:14px !important; } .efoto { width:116px !important; height:auto !important; } .t-fecha { font-size:22px !important; line-height:26px !important; } }\n" +
"</style></head>\n" +
'<body style="margin:0;padding:0;background:#E9CAB0;">\n' +
'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' + esc(previa) + "&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>\n" +
'<table role="presentation" class="fondo" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#E9CAB0" style="' + fondo("#E9CAB0") + '"><tr>' +
'<td class="fondo" align="center" bgcolor="#E9CAB0" style="padding:28px 12px;' + fondo("#E9CAB0") + '">\n' +
'<table role="presentation" class="contenedor" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;">\n' +
// Logo (uno oscuro para fondo claro, uno crema para el modo oscuro)
'<tr><td align="center" style="padding:0 0 18px;font-size:0;line-height:0;">' +
'<a href="' + esc(base || "#") + '" target="_blank">' +
'<img class="logo-d" src="' + esc(base) + '/images/logo.png" width="120" height="93" alt="Café Con Dos" style="width:120px;height:auto;margin:0 auto;" />' +
'<img class="logo-n" src="' + esc(base) + '/images/logo-claro.png" width="120" height="93" alt="" style="display:none;max-height:0;overflow:hidden;mso-hide:all;width:120px;height:auto;margin:0 auto;" />' +
"</a></td></tr>\n" +
'<tr><td class="tarjeta" bgcolor="#FBF3EC" style="' + fondo("#FBF3EC") + 'border-radius:22px 22px 22px 6px;">\n' +
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">\n' +
'<tr><td class="relleno titulo t-titulo" align="center" style="padding:36px 36px 0;font-family:' + FUENTE_TITULOS + ';font-size:40px;line-height:44px;font-weight:700;color:#3A1F20;">' + esc(titulo) + "</td></tr>\n" +
(rango ? '<tr><td class="relleno t-etiqueta" align="center" style="padding:10px 36px 0;font-family:' + FUENTE_TITULOS + ';font-size:14px;line-height:18px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#9A3816;">' + esc(rango) + "</td></tr>\n" : "") +
(b.intro ? '<tr><td class="relleno t-texto" align="left" style="padding:20px 36px 0;font-family:' + FUENTE_TEXTO + ';font-size:17px;line-height:28px;color:#6B4744;">' + parrafos(b.intro, "") + "</td></tr>\n" : "") +
filas +
(b.cierre ? '<tr><td class="relleno" style="padding:26px 36px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="linea" style="border-top:1px solid #E1BFA6;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table></td></tr>\n' +
  '<tr><td class="relleno t-texto" align="left" style="padding:20px 36px 0;font-family:' + FUENTE_TEXTO + ';font-size:17px;line-height:28px;color:#6B4744;">' + parrafos(b.cierre, "") + "</td></tr>\n" : "") +
'<tr><td style="font-size:0;line-height:0;height:36px;">&nbsp;</td></tr>\n' +
"</table></td></tr>\n" +
// Pie: redes
'<tr><td class="t-lema" align="center" style="padding:28px 28px 0;font-family:' + FUENTE_TITULOS + ';font-size:19px;line-height:26px;font-weight:600;color:#723F40;">' + esc(TEXTO_REDES) + "</td></tr>\n" +
(redes.length ? '<tr><td class="t-link" align="center" style="padding:10px 20px 0;font-family:' + FUENTE_TITULOS + ';font-size:16px;line-height:24px;font-weight:600;">' +
  redes.map(([n, u]) => '<a href="' + esc(u) + '" target="_blank" style="color:#723F40;text-decoration:underline;text-decoration-color:#F47D50;">' + n + "</a>").join('<span class="t-sep" style="color:#C9A28C;">&nbsp;·&nbsp;</span>') + "</td></tr>\n" : "") +
(s.lema ? '<tr><td class="t-lema" align="center" style="padding:16px 20px 0;font-family:' + FUENTE_TITULOS + ';font-size:15px;line-height:22px;font-weight:600;color:#723F40;" lang="en">' + esc(s.lema) + "</td></tr>\n" : "") +
'<tr><td class="t-pie" align="center" style="padding:12px 20px 0;font-family:' + FUENTE_TEXTO + ';font-size:13px;line-height:20px;color:#8A6560;">' +
'Recibes este correo porque te suscribiste en cafecondos.com.<br /><a href="' + unsub + '" style="color:#8A6560;">Darme de baja</a> · <a href="' + espejo + '" style="color:#8A6560;">Ver en el navegador</a></td></tr>\n' +
"</table></td></tr></table></body></html>\n";
  return { asunto, previa, html };
}
