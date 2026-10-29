/* ==========================================================================
   La Fonoteca: arma <carpeta>/data/fonoteca.js con
     - lo que se escribe en el editor (pestaña "Fonoteca"): la canción de la
       semana, los "¿Sabías que…?", las preguntas propias y el link de la playlist;
     - las canciones de la playlist, leídas de Spotify con la cuenta de ella.
       De ahí sale la trivia (en el navegador, app.js) y "Explora por década".

   Lo corre GitHub Actions al publicar el sitio (cada mañana a las 6:00 am y con
   cada cambio en Sanity). Si Spotify o Sanity fallan, NO frena la publicación:
   la página sale con el reproductor y sin trivia, y lo dice en el log.

   Uso:  node scripts/fonoteca.js _site
   Necesita (GitHub > Settings > Secrets and variables > Actions):
     SPOTIFY_CLIENT_ID        variable   (el Client ID de la app de Spotify)
     SPOTIFY_CLIENT_SECRET    secret     (el Client Secret de esa app)
     SPOTIFY_REFRESH_TOKEN    secret     (la llave que da writers/spotify.html)
   Opcional: SANITY_READ_TOKEN (solo si el dataset es privado).
   Para probar sin internet: FONOTECA_SPOTIFY_API / FONOTECA_SPOTIFY_CUENTAS /
   SANITY_API_URL cambian las direcciones de las APIs.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.resolve(__dirname, "..");
const salida = path.resolve(process.argv[2] || path.join(raiz, "_site"));

// La playlist si en el editor todavía no hay una (se cambia desde la pestaña "Fonoteca").
const PLAYLIST_POR_DEFECTO = "66UBUcdUkCxOODZoOprWd2";

const API = (process.env.FONOTECA_SPOTIFY_API || "https://api.spotify.com/v1").replace(/\/$/, "");
const CUENTAS = (process.env.FONOTECA_SPOTIFY_CUENTAS || "https://accounts.spotify.com").replace(/\/$/, "");
const SANITY_VERSION = "v2025-02-19";

const avisos = [];
const avisar = (m) => { avisos.push(m); console.log("  ! " + m); };

function leerConfig() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(raiz, "assets/js/config.js"), "utf8"), ctx, { filename: "config.js" });
  return ctx.window.CCD_CONFIG || {};
}

// "https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC?si=…" → "4uLU6hMCjMI75M1A2tKUQC"
function idDeSpotify(link, tipo) {
  const m = new RegExp("open\\.spotify\\.com/(?:intl-[a-z-]+/)?" + tipo + "/([A-Za-z0-9]+)").exec(String(link || ""));
  if (m) return m[1];
  return /^[A-Za-z0-9]{22}$/.test(String(link || "").trim()) ? String(link).trim() : "";
}

async function pedir(url, opciones, intentos = 3) {
  let ultimo;
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetch(url, opciones);
      if (r.status === 429 || r.status >= 500) throw Object.assign(new Error("respondió " + r.status), { reintentar: true, status: r.status });
      return r;
    } catch (e) {
      ultimo = e;
      if (i < intentos) await new Promise((ok) => setTimeout(ok, 1500 * i));
    }
  }
  throw ultimo;
}

/* ---------------- Sanity: el documento "fonoteca" ---------------- */
const CONSULTA = `*[_id == "fonoteca"][0]{
  playlist,
  "cancion": cancion{link, texto, nota},
  "sabiasQue": sabiasQue[].texto,
  "preguntas": preguntas[]{pregunta, correcta, incorrectas, dato}
}`;

async function traerDelEditor(cfg) {
  const s = cfg.sanity || {};
  if (!s.projectId) return null;
  const base = (process.env.SANITY_API_URL || "https://" + s.projectId + ".api.sanity.io").replace(/\/$/, "");
  const url = base + "/" + SANITY_VERSION + "/data/query/" + encodeURIComponent(s.dataset || "production") +
    "?query=" + encodeURIComponent(CONSULTA) + "&perspective=published";
  const headers = { Accept: "application/json" };
  if (process.env.SANITY_READ_TOKEN) headers.Authorization = "Bearer " + process.env.SANITY_READ_TOKEN;
  const r = await pedir(url, { headers });
  const texto = await r.text();
  if (!r.ok) throw new Error("Sanity respondió " + r.status + ": " + texto.slice(0, 200));
  return JSON.parse(texto).result || null;
}

/* ---------------- Spotify ---------------- */
async function llaveDeSpotify() {
  const id = (process.env.SPOTIFY_CLIENT_ID || "").trim();
  const secreto = (process.env.SPOTIFY_CLIENT_SECRET || "").trim();
  const refresh = (process.env.SPOTIFY_REFRESH_TOKEN || "").trim();
  if (!id || !secreto || !refresh) {
    avisar("Spotify no está conectado todavía (faltan SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET o SPOTIFY_REFRESH_TOKEN). La página sale sin trivia. Ver README, \"La Fonoteca\".");
    return "";
  }
  const r = await pedir(CUENTAS + "/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(id + ":" + secreto).toString("base64"),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new Error("Spotify no aceptó la llave (" + r.status + " " + (j.error_description || j.error || "") + "). " +
      "Si se cambió el Client Secret o ella quitó el permiso, vuelve a conectar en cafecondos.com/writers/spotify.html.");
  }
  if (j.refresh_token && j.refresh_token !== refresh) {
    avisar("Spotify mandó una llave nueva. La de siempre debería seguir sirviendo; si mañana falla, vuelve a conectar en writers/spotify.html.");
  }
  return j.access_token;
}

async function spotify(llave, ruta) {
  const r = await pedir(ruta.startsWith("http") ? ruta : API + ruta, { headers: { Authorization: "Bearer " + llave, Accept: "application/json" } });
  const texto = await r.text();
  if (!r.ok) {
    const e = new Error("Spotify respondió " + r.status + " en " + ruta.replace(API, "") + ": " + texto.slice(0, 200));
    e.status = r.status;
    throw e;
  }
  return JSON.parse(texto);
}

const imagen = (imgs, ancho) => {
  const lista = (imgs || []).filter((i) => i && i.url).sort((a, b) => (a.width || 0) - (b.width || 0));
  return (lista.find((i) => (i.width || 0) >= ancho) || lista[lista.length - 1] || {}).url || "";
};
const ano = (fecha) => (/^\d{4}/.test(fecha || "") ? Number(String(fecha).slice(0, 4)) : null);

// Una canción de Spotify → lo poquito que usa la página.
function cancionDe(t) {
  if (!t || t.type === "episode" || t.is_local || !t.id || !t.name) return null;
  const album = t.album || {};
  return {
    id: t.id,
    n: t.name,
    a: (t.artists || []).map((x) => x && x.name).filter(Boolean),
    al: album.name || "",
    alTipo: album.album_type || "",
    y: ano(album.release_date),
    img: imagen(album.images, 300),
    mini: imagen(album.images, 64),
    ms: t.duration_ms || 0,
  };
}

async function traerPlaylist(llave, id) {
  const info = await spotify(llave, "/playlists/" + id + "?fields=" + encodeURIComponent("name,description,images,owner(display_name),external_urls"));
  const canciones = [];
  let siguiente = "/playlists/" + id + "/items?limit=50";
  let vueltas = 0;
  while (siguiente && vueltas++ < 40) {
    const pagina = await spotify(llave, siguiente);
    for (const x of pagina.items || []) {
      const c = cancionDe(x && (x.item || x.track));
      if (c && !canciones.some((y) => y.id === c.id)) canciones.push(c);
    }
    siguiente = pagina.next || "";
  }
  return {
    playlist: { id, nombre: info.name || "", imagen: imagen(info.images, 300), duena: (info.owner && info.owner.display_name) || "" },
    canciones,
  };
}

async function traerCancion(llave, id) {
  if (llave) {
    try {
      return cancionDe(await spotify(llave, "/tracks/" + id));
    } catch (e) {
      avisar("No se pudo leer la canción de la semana en Spotify: " + e.message);
    }
  }
  return null;
}

/* ---------------- todo junto ---------------- */
const limpiar = (s) => String(s || "").replace(/\r/g, "").trim();

async function main() {
  const cfg = leerConfig();
  let editor = null;
  try {
    editor = await traerDelEditor(cfg);
  } catch (e) {
    avisar("No se pudo leer la pestaña Fonoteca del editor: " + e.message);
  }
  editor = editor || {};

  const playlistId = idDeSpotify(editor.playlist, "playlist") || PLAYLIST_POR_DEFECTO;
  const datos = {
    actualizado: new Date().toISOString(),
    playlist: { id: playlistId, nombre: "", imagen: "" },
    canciones: [],
    semana: null,
    sabiasQue: (editor.sabiasQue || []).map(limpiar).filter(Boolean),
    preguntas: (editor.preguntas || [])
      .filter((p) => p && limpiar(p.pregunta) && limpiar(p.correcta) && (p.incorrectas || []).filter((x) => limpiar(x)).length >= 3)
      .map((p) => ({ q: limpiar(p.pregunta), ok: limpiar(p.correcta), no: p.incorrectas.map(limpiar).filter(Boolean).slice(0, 3), dato: limpiar(p.dato) })),
  };

  let llave = "";
  try {
    llave = await llaveDeSpotify();
    if (llave) {
      const p = await traerPlaylist(llave, playlistId);
      datos.playlist = p.playlist;
      datos.canciones = p.canciones;
      console.log("Spotify: \"" + p.playlist.nombre + "\", " + p.canciones.length + " canciones.");
      if (!p.canciones.length) avisar("La playlist no trajo canciones. ¿Es de la cuenta que se conectó? Spotify solo deja leer las playlists propias.");
    }
  } catch (e) {
    avisar("No se pudo leer la playlist: " + e.message + (e.status === 403 ? " (Spotify solo deja leer playlists de la cuenta conectada.)" : ""));
  }

  const c = editor.cancion || {};
  const idCancion = idDeSpotify(c.link, "track");
  if (idCancion) {
    const deSpotify = (await traerCancion(llave, idCancion)) || datos.canciones.find((x) => x.id === idCancion) || { id: idCancion };
    datos.semana = Object.assign({}, deSpotify, { texto: limpiar(c.texto), nota: limpiar(c.nota) });
  }

  fs.mkdirSync(path.join(salida, "data"), { recursive: true });
  fs.writeFileSync(path.join(salida, "data", "fonoteca.js"),
    "/* Lo genera scripts/fonoteca.js al publicar (no lo edites aquí: se edita en la pestaña Fonoteca del editor y en Spotify). */\n" +
    "window.CCD_FONOTECA = " + JSON.stringify(datos) + ";\n");
  console.log("data/fonoteca.js listo: " + datos.canciones.length + " canciones, " + datos.preguntas.length + " preguntas propias, " +
    datos.sabiasQue.length + " datos, canción de la semana: " + (datos.semana ? (datos.semana.n || datos.semana.id) : "ninguna") + ".");
  if (avisos.length && process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "### La Fonoteca\n" + avisos.map((a) => "- " + a).join("\n") + "\n");
  }
}

main().catch((e) => {
  // Nunca frena la publicación del sitio.
  console.log("  ! La Fonoteca: " + e.message);
  try {
    fs.mkdirSync(path.join(salida, "data"), { recursive: true });
    const ruta = path.join(salida, "data", "fonoteca.js");
    fs.writeFileSync(ruta, "window.CCD_FONOTECA = " + JSON.stringify({ playlist: { id: PLAYLIST_POR_DEFECTO }, canciones: [], semana: null, sabiasQue: [], preguntas: [] }) + ";\n");
  } catch (e2) { /* nada */ }
});
