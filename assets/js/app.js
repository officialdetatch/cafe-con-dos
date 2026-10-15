/* ==========================================================================
   CAFÉ CON DOS — lo que se mueve en el sitio
   Los textos y el diseño de cada página están en su archivo .html (y el
   encabezado, el pie y el newsletter en la carpeta partes/). Este archivo
   solo hace lo que el HTML no puede hacer solo:
     - las listas que cambian: artículos, episodios, filtros, búsqueda,
       la página de cada artículo y de cada episodio, el destacado de Inicio;
     - los botones: menú del celular, tema claro/oscuro, formularios,
       ventanita del newsletter, comentarios, burbuja "Invítanos un café".
   Lee:
     assets/js/config.js   (secciones, temas, series, servicios)
     assets/js/textos.js   (los textos que usa este archivo)
     data/articulos.js     (artículos; en el sitio publicado incluye los del editor)
     data/episodios.js     (lo genera writers/episodio-writer.html)
   ========================================================================== */
(function () {
  "use strict";

  const CFG = window.CCD_CONFIG || {};
  const TEXTOS = window.CCD_TEXTOS || {};
  const BASE = (document.body && document.body.dataset.base) || "";

  /* ---------------- utilidades ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  const t = (k) => TEXTOS[k] || k;
  // Lee un texto de la configuración o de los datos (acepta también el
  // formato viejo { es: "..." } por si queda alguno).
  const loc = (obj, field) => {
    if (!obj) return "";
    const v = obj[field];
    if (v && typeof v === "object") return v.es || "";
    return v || "";
  };

  /* ---------------- tema claro / oscuro ----------------
     Por defecto sigue al sistema. El botón del encabezado guarda la elección
     en este navegador ("ccd-tema") y la aplica en <html data-theme="...">. */
  const raiz = document.documentElement;
  const temaGuardado = store("ccd-tema");
  if (temaGuardado === "light" || temaGuardado === "dark") raiz.dataset.theme = temaGuardado;
  const temaSistema = () => (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const temaActual = () => raiz.dataset.theme || temaSistema();
  function pintarColorBarra() {
    const color = temaActual() === "dark" ? "#221415" : "#E9CAB0";
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
  }

  function fecha(iso, opts) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(t("fecha.locale"), opts || { day: "numeric", month: "long", year: "numeric" });
  }

  const temasMap = {};
  (CFG.temas || []).forEach((x) => (temasMap[x.id] = x));
  const temaNombre = (id) => {
    const x = temasMap[id];
    if (x) return x.nombre || x.es || id;
    return String(id).replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  };
  const serieDe = (id) => (CFG.series || []).find((s) => s.id === id);

  // Más nuevo primero; si dos tienen la misma fecha, el que se agregó después.
  const porFecha = (a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")) ||
    String(b.publicado || "").localeCompare(String(a.publicado || "")) || ((b.numero || 0) - (a.numero || 0));
  // Lo que tiene fecha futura aparece ese día a las 6:00 am hora de República
  // Dominicana (10:00 UTC; RD no cambia de horario), al mismo momento para todo
  // el mundo y a la misma hora en que el feed del boletín lo incluye.
  const salida = (fecha) => Date.parse(fecha + "T10:00:00Z");
  const publicado = (x) => document.body.classList.contains("writer") || !x.fecha || !(salida(x.fecha) > Date.now());
  const EPS = (window.CCD_EPISODIOS || []).filter(publicado).sort(porFecha);
  // Secciones de Explorar (config.js). Sobremesa es una de ellas.
  const SECCIONES = CFG.secciones || [];
  const seccionDe = (id) => SECCIONES.find((s) => s.id === id) || null;
  // Todos los artículos viven en data/articulos.js. Si queda un data/sobremesa.js
  // de la versión anterior, sus posts también se leen como Sobremesa.
  const ARTS = (window.CCD_ARTICULOS || [])
    .concat((window.CCD_SOBREMESA || []).map((p) => Object.assign({ seccion: "sobremesa" }, p)))
    .filter(publicado).sort(porFecha);
  const POSTS = ARTS.filter((a) => a.seccion === "sobremesa");

  const epUrl = (ep) => BASE + "episodio.html?id=" + encodeURIComponent(ep.id);
  const postUrl = (p) => BASE + "entrada.html?id=" + encodeURIComponent(p.id);
  // Una serie no tiene página propia: se enlaza a la lista de episodios filtrada.
  const serieUrl = (s) => BASE + "episodios.html?serie=" + encodeURIComponent(s.id);

  const ytThumb = (id) => "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
  const ytEmbed = (id, extra) => "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&modestbranding=1" + (extra || "");

  const VAPOR_SVG = '<svg viewBox="0 0 40 64" aria-hidden="true"><path d="M20 60c-9-8 9-14 0-24s9-16 0-32"/></svg>';
  const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/></svg>';

  /* ---------------- markdown sencillo ----------------
     **negrita**, *cursiva*, [texto](url), ## Título, ### Subtítulo,
     - listas, 1. listas numeradas, > citas, ![alt](imagen), --- separador */
  function inline(s) {
    return esc(s)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => '<img src="' + src + '" alt="' + alt + '" loading="lazy">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, href) => {
        const ext = /^https?:/i.test(href);
        return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + txt + "</a>";
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }
  function md(src) {
    const lines = String(src || "").replace(/\r/g, "").split("\n");
    let html = "", list = null, para = [], quote = [];
    const flushP = () => { if (para.length) { html += "<p>" + inline(para.join(" ")) + "</p>"; para = []; } };
    const flushL = () => { if (list) { html += "</" + list + ">"; list = null; } };
    const flushQ = () => { if (quote.length) { html += "<blockquote><p>" + inline(quote.join(" ")) + "</p></blockquote>"; quote = []; } };
    const flushAll = () => { flushP(); flushL(); flushQ(); };
    lines.forEach((raw) => {
      const line = raw.trim();
      let m;
      if (!line) return flushAll();
      if (/^---+$/.test(line)) { flushAll(); html += "<hr>"; return; }
      if ((m = line.match(/^(#{2,3})\s+(.*)$/))) { flushAll(); const h = m[1].length; html += "<h" + h + ">" + inline(m[2]) + "</h" + h + ">"; return; }
      if ((m = line.match(/^>\s?(.*)$/))) { flushP(); flushL(); quote.push(m[1]); return; }
      if ((m = line.match(/^[-*]\s+(.*)$/))) { flushP(); flushQ(); if (list !== "ul") { flushL(); html += "<ul>"; list = "ul"; } html += "<li>" + inline(m[1]) + "</li>"; return; }
      if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushP(); flushQ(); if (list !== "ol") { flushL(); html += "<ol>"; list = "ol"; } html += "<li>" + inline(m[1]) + "</li>"; return; }
      flushL(); flushQ(); para.push(line);
    });
    flushAll();
    return html;
  }

  /* ---------------- piezas reutilizables ---------------- */
  // La taza en café para fondos claros y en crema para fondos oscuros.
  const tazaHTML = (cls) =>
    '<img class="img-oscura ' + (cls || "") + '" src="' + BASE + 'images/taza.png" alt="">' +
    '<img class="img-clara ' + (cls || "") + '" src="' + BASE + 'images/taza-clara.png" alt="">';

  const icono = (k) => BASE + "images/socials/" + k + ".webp";

  function numeroEp(ep) {
    if (ep.serie && ep.numero) return t("ep.capitulo") + " " + ep.numero;
    if (ep.numero) return t("ep.episodio") + " " + ep.numero;
    return "";
  }

  function portadaHTML(ep, opts) {
    opts = opts || {};
    const ejemplo = ep.ejemplo ? '<span class="badge-ejemplo">' + t("ep.ejemplo") + "</span>" : "";
    if (ep.portada || ep.youtube) {
      const src = ep.portada ? BASE + ep.portada : ytThumb(ep.youtube);
      return '<div class="portada"><img src="' + esc(src) + '" alt="" loading="lazy" width="480" height="270">' +
        '<span class="play">' + PLAY_SVG + "</span>" + ejemplo + "</div>";
    }
    const num = ep.numero ? '<span class="num">' + (ep.serie ? "" : "#") + esc(ep.numero) + "</span>" : "";
    return '<div class="portada"><div class="portada-gen">' + VAPOR_SVG + num +
      '<span class="tit">' + esc(opts.titulo || loc(ep, "titulo")) + "</span></div>" + ejemplo + "</div>";
  }

  function esNuevo(ep) {
    const d = Date.parse((ep.fecha || "") + "T10:00:00Z");
    return !isNaN(d) && Date.now() - d < 10 * 24 * 60 * 60 * 1000;
  }

  function metaEp(ep, opts) {
    const s = ep.serie && serieDe(ep.serie);
    return '<div class="ep-meta">' +
      (opts && opts.nuevo && esNuevo(ep) ? '<span class="ep-nuevo">' + t("ep.nuevo") + "</span>" : "") +
      (s ? '<span class="serie-tag" translate="no">' + esc(s.nombre) + "</span>" : "") +
      (numeroEp(ep) && !s ? "<span>" + esc(numeroEp(ep)) + "</span>" : "") +
      (s && ep.numero ? "<span>" + esc(numeroEp(ep)) + "</span>" : "") +
      '<time datetime="' + esc(ep.fecha) + '">' + esc(fecha(ep.fecha)) + "</time>" +
      (ep.duracion ? "<span>" + esc(ep.duracion) + "</span>" : "") +
      "</div>";
  }

  function chipsTemas(temas, linkBase) {
    if (!temas || !temas.length) return "";
    return '<ul class="chips">' + temas.map((id) =>
      '<li><a class="chip chip--sm" href="' + (linkBase || BASE + "episodios.html") + "?tema=" + encodeURIComponent(id) + '">' + esc(temaNombre(id)) + "</a></li>"
    ).join("") + "</ul>";
  }

  function epCard(ep, opts) {
    opts = opts || {};
    return '<article class="ep-card' + (opts.destacado ? " ep-card--destacado" : "") + '">' +
      '<a class="ep-link" href="' + epUrl(ep) + '" tabindex="-1" aria-hidden="true">' + portadaHTML(ep) + "</a>" +
      metaEp(ep, { nuevo: opts.destacado }) +
      '<h3><a class="ep-link" href="' + epUrl(ep) + '">' + esc(loc(ep, "titulo")) + "</a></h3>" +
      (loc(ep, "resumen") ? "<p>" + esc(loc(ep, "resumen")) + "</p>" : "") +
      chipsTemas(ep.temas) +
      "</article>";
  }

  function autorDe(id) {
    return (CFG.hosts || []).find((a) => a.id === id) || null;
  }

  function sobPortada(p) {
    if (p.portada) return '<div class="sob-portada"><img src="' + esc(imgSrc(p.portada)) + '" alt="" loading="lazy"' + imgPos(p) + "></div>";
    return '<div class="sob-portada"><p class="cita">' + esc(loc(p, "resumen") || loc(p, "titulo")) + "</p></div>";
  }

  function sobItem(p) {
    const a = autorDe(p.autor);
    return '<article class="sob-item">' + sobPortada(p) +
      '<div class="sob-meta"><time datetime="' + esc(p.fecha) + '">' + esc(fecha(p.fecha)) + "</time>" +
      (a ? "<span>" + t("sob.por") + " " + esc(a.nombre) + "</span>" : "") +
      (p.ejemplo ? "<span>" + t("ep.ejemplo") + "</span>" : "") + "</div>" +
      '<h3><a class="sob-link" href="' + postUrl(p) + '">' + esc(loc(p, "titulo")) + "</a></h3>" +
      (loc(p, "resumen") ? "<p>" + esc(loc(p, "resumen")) + "</p>" : "") +
      "</article>";
  }

  /* ---------------- artículos (Explorar y Sobremesa) ---------------- */
  const minutos = (a) => Math.max(1, Math.round(String(a.cuerpo || "").split(/\s+/).filter(Boolean).length / 200));
  // Los artículos en inglés llevan lang="en" (lectores de pantalla, Google y traductores).
  const langAttr = (a) => (a.idioma && a.idioma !== "es" ? ' lang="' + esc(a.idioma) + '"' : "");
  const seccionUrl = (id) => (id === "sobremesa" ? BASE + "sobremesa.html" : BASE + "explorar.html?seccion=" + encodeURIComponent(id));
  const badgeEjemplo = () => '<span class="badge-ejemplo">' + t("ep.ejemplo") + "</span>";

  // Fotos: las del repo van con ruta relativa; las del editor (Sanity) ya son URLs completas.
  // portadaPos es el punto de enfoque que se marca en el editor ("50% 30%").
  const imgSrc = (src) => (/^https?:/.test(src) ? src : BASE + src);
  const imgPos = (a) => (a.portadaPos && /^[\d.]+% [\d.]+%$/.test(a.portadaPos) ? ' style="object-position:' + a.portadaPos + '"' : "");
  const portadaGen = (cls, contenido) => '<div class="art-gen ' + cls + '">' + VAPOR_SVG + contenido + "</div>";
  // Foto de portada; si no hay, un bloque con los colores de la marca.
  function artPortada(a, opts) {
    opts = opts || {};
    const s = seccionDe(a.seccion) || {};
    let dentro;
    if (a.portada) {
      dentro = '<img src="' + esc(imgSrc(a.portada)) + '" alt="' + esc(a.portadaAlt || "") + '" loading="' + (opts.prioridad ? "eager" : "lazy") + '" width="960" height="640"' + imgPos(a) + ">";
    } else if (opts.marca) {
      dentro = '<div class="art-gen art-gen--marca">' + tazaHTML() + "</div>";
    } else if (a.seccion === "sobremesa") {
      dentro = '<div class="art-gen sec-sobremesa"><p class="cita"' + langAttr(a) + ">" + esc(a.resumen || a.titulo) + "</p></div>";
    } else {
      dentro = portadaGen("sec-" + esc(a.seccion || "x"), opts.conTitulo
        ? '<span class="art-gen-tit"' + langAttr(a) + ">" + esc(a.titulo) + "</span>"
        : '<span class="art-gen-sec">' + esc(s.corto || s.nombre || "") + "</span>");
    }
    return '<div class="art-portada">' + dentro + (a.ejemplo ? badgeEjemplo() : "") + "</div>";
  }
  function artKicker(a) {
    const s = seccionDe(a.seccion);
    return '<p class="kicker">' + (s ? "<span" + (a.seccion === "sobremesa" ? ' translate="no"' : "") + ">" + esc(s.nombre) + "</span>" : "") +
      (a.idioma === "en" ? '<span class="tag-idioma" title="In English">EN</span>' : "") + "</p>";
  }
  function artMeta(a) {
    return '<p class="art-meta"><time datetime="' + esc(a.fecha) + '">' + esc(fecha(a.fecha)) + "</time><span>" + minutos(a) + " " + t("exp.lectura") + "</span></p>";
  }
  function artCard(a, opts) {
    opts = opts || {};
    return '<article class="art-card' + (opts.destacado ? " art-card--destacado" : "") + '">' +
      '<a class="art-img" href="' + postUrl(a) + '" tabindex="-1" aria-hidden="true">' + artPortada(a) + "</a>" +
      '<div class="art-texto">' + artKicker(a) +
      "<h3" + langAttr(a) + '><a class="art-link" href="' + postUrl(a) + '">' + esc(a.titulo) + "</a></h3>" +
      // En Sobremesa sin foto, la portada ya es la frase del resumen: no se repite.
      (a.resumen && !(a.seccion === "sobremesa" && !a.portada) ? '<p class="art-resumen"' + langAttr(a) + ">" + esc(a.resumen) + "</p>" : "") +
      artMeta(a) + "</div></article>";
  }
  function jsonLD(obj) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  /* ---------------- encabezado y pie (el HTML está en partes/) ---------------- */
  function montarEncabezado(page) {
    const el = $("#site-header");
    if (!el) return;
    // El link de la página actual queda subrayado.
    let activo = { episodio: "episodios" }[page] || page;
    if (page === "entrada") {
      const a = ARTS.find((x) => x.id === params.get("id"));
      activo = a && a.seccion === "sobremesa" ? "sobremesa" : "explorar";
    }
    $$("[data-nav]", el).forEach((a) => { if (a.dataset.nav === activo) a.setAttribute("aria-current", "page"); });

    // Menú del celular
    const btn = $(".btn-menu", el), nav = $(".nav", el);
    if (btn && nav) btn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? btn.dataset.cerrar || "Cerrar menú" : btn.dataset.abrir || "Menú");
    });

    // Tema claro / oscuro
    const btnTema = $(".btn-tema", el);
    if (btnTema) {
      const etiquetarTema = () => {
        const txt = temaActual() === "dark" ? btnTema.dataset.aClaro : btnTema.dataset.aOscuro;
        if (txt) { btnTema.setAttribute("aria-label", txt); btnTema.title = txt; }
        pintarColorBarra();
      };
      btnTema.addEventListener("click", () => {
        const nuevo = temaActual() === "dark" ? "light" : "dark";
        raiz.dataset.theme = nuevo;
        store("ccd-tema", nuevo);
        etiquetarTema();
      });
      if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", etiquetarTema);
      etiquetarTema();
    }
    window.addEventListener("scroll", () => el.classList.toggle("is-scrolled", window.scrollY > 8), { passive: true });
  }

  function montarPie() {
    // El año del © se pone solo.
    $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ---------------- boletín ----------------
     El bloque de las páginas está en partes/boletin.html. Aquí se arma solo
     el formulario de la ventanita (con los textos de textos.js). */
  function boletinHTML(opts) {
    opts = opts || {};
    return '<form class="form-boletin" novalidate>' +
      '<div class="campos">' +
      '<div class="campo"><label class="sr-only" for="' + opts.pref + '-nombre">' + t("bol.nombre") + "</label>" +
      '<input type="text" id="' + opts.pref + '-nombre" name="nombre" autocomplete="given-name" placeholder="' + t("bol.nombre") + '"></div>' +
      '<div class="campo"><label class="sr-only" for="' + opts.pref + '-email">' + t("bol.email") + "</label>" +
      '<input type="email" id="' + opts.pref + '-email" name="email" autocomplete="email" required placeholder="' + t("bol.email") + '"></div>' +
      "</div>" +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true">' +
      '<button class="btn" type="submit">' + t("bol.enviar") + "</button>" +
      '<p class="aviso" role="status" hidden></p>' +
      "</form>";
  }

  function montarBoletin(form, alSuscribir) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const aviso = $(".aviso", form), btn = $("button[type=submit]", form);
      const textoBoton = btn.dataset.texto || (btn.dataset.texto = btn.textContent);
      const email = form.email.value.trim(), nombre = (form.nombre ? form.nombre.value : "").trim();
      const mostrar = (msg, error) => { aviso.textContent = msg; aviso.hidden = false; aviso.classList.toggle("aviso--error", !!error); };
      if (form.website.value) return; // bot
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { mostrar(t("bol.invalido"), true); form.email.focus(); return; }
      const B = CFG.boletin || {};
      if (!B.action) { mostrar(t("bol.prueba"), false); console.info("[Café Con Dos] Newsletter en modo prueba", { email, nombre }); return; }
      const fd = new FormData();
      fd.append(B.campoEmail || "EMAIL", email);
      if (nombre && B.campoNombre) fd.append(B.campoNombre, nombre);
      fd.append("email_address_check", "");
      fd.append("locale", "es");
      btn.disabled = true; btn.textContent = t("bol.enviando");
      try {
        await fetch(B.action, { method: "POST", body: fd, mode: "no-cors" });
        mostrar(t("bol.ok"));
        store("ccd-suscrito", "1");
        form.reset();
        if (alSuscribir) alSuscribir();
      } catch (err) {
        mostrar(t("bol.error"), true);
      } finally {
        btn.disabled = false; btn.textContent = textoBoton;
      }
    });
  }

  function montarBoletines() {
    $$("[data-boletin] form").forEach((form) => montarBoletin(form));
    // botones "Suscríbete": baja al formulario más cercano o abre la ventanita
    $$("[data-ir-boletin]").forEach((a) => a.addEventListener("click", (e) => {
      const destino = $("[data-boletin]");
      const nav = $(".nav.is-open");
      if (nav) { nav.classList.remove("is-open"); $(".btn-menu").setAttribute("aria-expanded", "false"); }
      e.preventDefault();
      if (destino) {
        destino.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        setTimeout(() => { const i = $("input[type=email]", destino); if (i) i.focus({ preventScroll: true }); }, 500);
      } else abrirPopup(true);
    }));
  }

  function abrirPopup(forzar) {
    if ($(".popup")) return;
    if (!forzar && (store("ccd-popup-cerrado") || store("ccd-suscrito"))) return;
    const box = document.createElement("div");
    box.className = "popup burbuja burbuja--naranja";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-labelledby", "popup-titulo");
    box.innerHTML = '<button class="cerrar" type="button" aria-label="' + t("bol.popup.cerrar") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
      '<h3 id="popup-titulo">' + t("bol.popup.titulo") + "</h3><p>" + t("bol.sub") + "</p>" + boletinHTML({ pref: "pop" });
    const form = $("form", box);
    const ahora = document.createElement("button");
    ahora.type = "button"; ahora.className = "ahora-no"; ahora.textContent = t("bol.popup.cerrar");
    form.appendChild(ahora);
    document.body.appendChild(box);
    const avisoApoyo = $(".apoyo-aviso");
    if (avisoApoyo) avisoApoyo.hidden = true;
    const cerrar = () => { store("ccd-popup-cerrado", String(Date.now())); box.remove(); };
    // Después de suscribirse, la ventanita se cierra sola en unos segundos.
    montarBoletin(form, () => setTimeout(cerrar, 3500));
    $(".cerrar", box).addEventListener("click", cerrar);
    ahora.addEventListener("click", cerrar);
    box.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
    if (forzar) setTimeout(() => $("input[type=email]", box).focus(), 50);
  }

  // Solo una ventanita por visita: o la del boletín o el aviso de apoyo.
  function pedirTurno() {
    try {
      if (sessionStorage.getItem("ccd-turno")) return false;
      sessionStorage.setItem("ccd-turno", "1");
    } catch (e) { /* sin sessionStorage: se muestra igual */ }
    return true;
  }

  function popupPendiente() {
    const B = CFG.boletin || {};
    if (!B.popupEnInicio || store("ccd-suscrito")) return false;
    const cerrado = Number(store("ccd-popup-cerrado") || 0);
    return !(cerrado && Date.now() - cerrado < 1000 * 60 * 60 * 24 * 14);
  }

  function programarPopup() {
    const B = CFG.boletin || {};
    if (!popupPendiente()) return;
    let hecho = false;
    const lanzar = () => { if (hecho) return; hecho = true; if (pedirTurno()) abrirPopup(false); };
    setTimeout(lanzar, (B.popupSegundos || 25) * 1000);
    window.addEventListener("scroll", function onS() {
      const h = document.documentElement;
      if (h.scrollTop / (h.scrollHeight - h.clientHeight) > 0.55) { window.removeEventListener("scroll", onS); lanzar(); }
    }, { passive: true });
  }

  /* ---------------- compartir ---------------- */
  function compartirHTML(titulo) {
    const url = location.href.split("#")[0];
    const u = encodeURIComponent(url), tt = encodeURIComponent(titulo + " · Café Con Dos");
    return '<div class="compartir" aria-label="' + t("comp.titulo") + '">' +
      '<a class="chip chip--sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + tt + "%20" + u + '">WhatsApp</a>' +
      '<a class="chip chip--sm" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + u + '">Facebook</a>' +
      '<a class="chip chip--sm" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + tt + "&url=" + u + '">X</a>' +
      '<button class="chip chip--sm" type="button" data-copiar="' + esc(url) + '">' + t("comp.copiar") + "</button></div>";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copiar]");
    if (!b) return;
    const ok = () => { b.textContent = t("comp.copiado"); setTimeout(() => (b.textContent = t("comp.copiar")), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copiar).then(ok, () => prompt(t("comp.copiar"), b.dataset.copiar));
    else prompt(t("comp.copiar"), b.dataset.copiar);
  });

  /* ---------------- filtros por tema ---------------- */
  function temasUsados(items) {
    const set = new Set();
    items.forEach((x) => (x.temas || []).forEach((id) => set.add(id)));
    const orden = (CFG.temas || []).map((x) => x.id);
    return Array.from(set).sort((a, b) => (orden.indexOf(a) + 1 || 99) - (orden.indexOf(b) + 1 || 99));
  }
  function filtroHTML(temas, activo) {
    return '<ul class="chips" role="group" aria-label="' + t("temas.label") + '">' +
      '<li><button type="button" class="chip" data-filtro="" aria-pressed="' + (!activo) + '">' + t("temas.todos") + "</button></li>" +
      temas.map((id) => '<li><button type="button" class="chip" data-filtro="' + esc(id) + '" aria-pressed="' + (activo === id) + '">' + esc(temaNombre(id)) + "</button></li>").join("") +
      "</ul>";
  }

  function setMeta(titulo, desc) {
    document.title = titulo ? titulo + " | Café Con Dos" : "Café Con Dos";
    const m = $('meta[name="description"]');
    if (m && desc) m.setAttribute("content", desc);
  }


  /* ---------------- En redes ---------------- */
  const IG_USUARIO = ((CFG.redes && CFG.redes.instagram) || "").replace(/\/+$/, "").split("/").pop();
  const ICONO_VIDEO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8Z"/></svg>';
  const ICONO_CARRUSEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-4 4v12a2 2 0 0 0 2 2h12v-2H6V7H4Z"/></svg>';

  function cuandoSeVea(el, fn) {
    if (!("IntersectionObserver" in window)) return fn();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
  }

  function igVacio(caja) {
    caja.innerHTML = '<a class="ig-vacio" href="' + esc(CFG.redes.instagram) + '" target="_blank" rel="noopener">' +
      '<span class="ig-vacio-icono"><img src="' + icono("instagram") + '" alt=""></span>' +
      "<b>@" + esc(IG_USUARIO) + "</b><span>" + t("redes.ig.vacio") + '</span><span class="btn">' + t("redes.ig.seguir") + "</span></a>";
  }

  function igPintar(caja, posts, n) {
    const lista = (posts || []).slice(0, n);
    if (!lista.length) return igVacio(caja);
    caja.innerHTML = '<ul class="ig-grid">' + lista.map((p) => {
      const s = p.sizes || {};
      const img = (s.medium && s.medium.mediaUrl) || (s.small && s.small.mediaUrl) || p.thumbnailUrl || p.mediaUrl;
      const texto = (p.altText || p.prunedCaption || p.caption || "").trim();
      const tipo = p.mediaType === "VIDEO" ? '<span class="ig-tipo" title="' + t("redes.video") + '">' + ICONO_VIDEO + "</span>"
        : p.mediaType === "CAROUSEL_ALBUM" ? '<span class="ig-tipo" title="' + t("redes.carrusel") + '">' + ICONO_CARRUSEL + "</span>" : "";
      return '<li><a href="' + esc(p.permalink) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(img) + '" alt="' + esc(texto.slice(0, 140)) + '" loading="lazy" width="400" height="400">' + tipo +
        (texto ? '<span class="ig-texto" aria-hidden="true">' + esc(texto.slice(0, 120)) + (texto.length > 120 ? "…" : "") + "</span>" : "") +
        "</a></li>";
    }).join("") + "</ul>";
  }

  function igCargar(caja, R) {
    const n = R.instagramPosts || 6;
    if (!R.instagramFeed) return igVacio(caja);
    // Guardamos la respuesta 30 minutos para no gastar visitas del plan de Behold.
    const KEY = "ccd-ig-cache";
    try {
      const c = JSON.parse(store(KEY) || "null");
      if (c && c.url === R.instagramFeed && Date.now() - c.t < 30 * 60 * 1000) return igPintar(caja, c.posts, n);
    } catch (e) { /* sin caché */ }
    caja.innerHTML = '<ul class="ig-grid ig-cargando" aria-hidden="true">' + "<li></li>".repeat(n) + "</ul>";
    fetch(R.instagramFeed)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => {
        const posts = d.posts || (Array.isArray(d) ? d : []);
        store(KEY, JSON.stringify({ url: R.instagramFeed, t: Date.now(), posts: posts.slice(0, 12) }));
        igPintar(caja, posts, n);
      })
      .catch(() => igVacio(caja));
  }

  // TikTok: su script cambia este bloque por el perfil con los últimos videos.
  // Mientras carga (o si el navegador lo bloquea) se ve la tarjeta de "seguir".
  function ttHTML(usuario) {
    const u = esc(usuario);
    return '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@' + u + '" data-unique-id="' + u + '" data-embed-type="creator" style="max-width:720px;min-width:288px">' +
      '<section><a class="ig-vacio" target="_blank" rel="noopener" href="https://www.tiktok.com/@' + u + '?refer=creator_embed">' +
      '<span class="ig-vacio-icono"><img src="' + icono("tiktok") + '" alt=""></span>' +
      "<b>@" + u + "</b><span>" + t("redes.tt.vacio") + '</span><span class="btn">' + t("redes.tt.seguir") + "</span></a></section></blockquote>";
  }
  function ttCargar() {
    if ($('script[src*="tiktok.com/embed.js"]')) return;
    const s = document.createElement("script");
    s.async = true; s.src = "https://www.tiktok.com/embed.js";
    document.body.appendChild(s);
  }

  function montarEnRedes(root, R) {
    const conTT = !!R.tiktokUsuario;
    const caja = $(".en-redes", root);
    if (!caja) return;
    caja.classList.toggle("en-redes--solo", !conTT);
    caja.innerHTML = '<div class="en-redes-col"><div class="ig-caja"></div>' +
      (R.instagramFeed ? '<a class="btn btn--hueco" href="' + esc(CFG.redes.instagram) + '" target="_blank" rel="noopener"><span class="btn-icono"><img src="' + icono("instagram") + '" alt=""></span>@' + esc(IG_USUARIO) + "</a>" : "") +
      "</div>" +
      (conTT ? '<div class="en-redes-col"><div class="tt-caja">' + ttHTML(R.tiktokUsuario) + "</div></div>" : "");
    // Sin feed de Instagram, la tarjeta de "seguir" se muestra de una vez.
    if (!R.instagramFeed) igVacio($(".ig-caja", root));
    cuandoSeVea(root, () => {
      if (R.instagramFeed) igCargar($(".ig-caja", root), R);
      if (conTT) ttCargar();
    });
  }


  /* ---------------- Comentarios (Firebase / Firestore) ----------------
     Se guardan en la colección de Firestore indicada en config.js.
     Las reglas de seguridad están en firestore.rules (en la raíz del repo). */
  const FB_VER = "10.12.2";
  function montarComentarios(el, postId) {
    const C = CFG.comentarios || {};
    const fbc = C.firebase || {};
    if (!el || !C.activo || !fbc.projectId || !fbc.apiKey) return;
    el.hidden = false;
    el.innerHTML = '<h2>' + t("com.titulo") + ' <span class="com-cuenta"></span></h2>' +
      '<ol class="com-lista" aria-live="polite"><li class="com-estado">' + t("com.cargando") + "</li></ol>" +
      '<form class="com-form" novalidate>' +
      '<div class="campo"><label for="com-nombre">' + t("com.nombre") + '</label><input type="text" id="com-nombre" name="nombre" maxlength="60" autocomplete="given-name" required></div>' +
      '<div class="campo"><label for="com-texto">' + t("com.texto") + '</label><textarea id="com-texto" name="texto" maxlength="1500" rows="4" required></textarea><span class="com-chars">0 / 1500</span></div>' +
      '<input type="text" name="web" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true">' +
      '<p class="com-nota">' + t("com.nota") + "</p>" +
      '<button class="btn" type="submit">' + t("com.enviar") + "</button>" +
      '<p class="aviso" role="status" hidden></p></form>';

    const lista = $(".com-lista", el), form = $(".com-form", el), aviso = $(".aviso", form), btn = $("button[type=submit]", form);
    const cuenta = $(".com-cuenta", el), chars = $(".com-chars", el);
    const guardado = store("ccd-com-nombre"); if (guardado) form.nombre.value = guardado;
    form.texto.addEventListener("input", () => (chars.textContent = form.texto.value.length + " / 1500"));
    const mostrar = (msg, err) => { aviso.textContent = msg; aviso.hidden = false; aviso.classList.toggle("aviso--error", !!err); };

    let items = [];
    const cuando = (d) => d ? d.toLocaleDateString(t("fecha.locale"), { day: "numeric", month: "long", year: "numeric" }) : t("com.ahora");
    function pintar() {
      cuenta.textContent = items.length ? "(" + items.length + ")" : "";
      lista.innerHTML = items.length ? items.map((c) =>
        '<li class="com-item"><div class="com-cabeza"><b>' + esc(c.nombre) + '</b><time>' + esc(cuando(c.fecha)) + "</time></div>" +
        '<p>' + esc(c.texto).replace(/\n/g, "<br>") + "</p></li>").join("")
        : '<li class="com-estado">' + t("com.vacio") + "</li>";
    }

    let fs = null, db = null;
    async function conectar() {
      if (db) return;
      const base = "https://www.gstatic.com/firebasejs/" + FB_VER + "/";
      const appMod = await import(base + "firebase-app.js");
      fs = await import(base + "firebase-firestore.js");
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(fbc);
      db = fs.getFirestore(app);
    }
    const col = () => fs.collection(db, C.coleccion || "ccd_comentarios");

    cuandoSeVea(el, async () => {
      try {
        await conectar();
        const snap = await fs.getDocs(fs.query(col(), fs.where("post", "==", postId)));
        items = snap.docs.map((d) => { const x = d.data(); return { nombre: x.nombre, texto: x.texto, fecha: x.fecha && x.fecha.toDate ? x.fecha.toDate() : null }; })
          .sort((a, b) => (a.fecha || 0) - (b.fecha || 0));
        pintar();
      } catch (e) {
        console.warn("[Café Con Dos] comentarios:", e);
        lista.innerHTML = '<li class="com-estado">' + t("com.errorCarga") + "</li>";
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.web.value) return;
      const nombre = form.nombre.value.trim(), texto = form.texto.value.trim();
      if (!nombre || texto.length < 2) { mostrar(t("com.faltan"), true); (nombre ? form.texto : form.nombre).focus(); return; }
      const ultimo = Number(store("ccd-com-ultimo") || 0);
      if (Date.now() - ultimo < 30000) { mostrar(t("com.espera"), true); return; }
      btn.disabled = true; btn.textContent = t("com.enviando");
      try {
        await conectar();
        await fs.addDoc(col(), { post: postId, nombre: nombre.slice(0, 60), texto: texto.slice(0, 1500), fecha: fs.serverTimestamp() });
        store("ccd-com-nombre", nombre); store("ccd-com-ultimo", String(Date.now()));
        items.push({ nombre, texto, fecha: new Date() });
        pintar();
        form.texto.value = ""; chars.textContent = "0 / 1500";
        mostrar(t("com.ok"));
      } catch (err) {
        console.warn("[Café Con Dos] comentario no publicado:", err);
        mostrar(t("com.error"), true);
      } finally {
        btn.disabled = false; btn.textContent = t("com.enviar");
      }
    });
  }

  /* ================= PÁGINAS ================= */

  const PAGES = {};

  PAGES.inicio = function () {
    // La foto de la derecha: el artículo más nuevo marcado "Destacar en la portada"
    // (o el más nuevo, si ninguno está marcado). Sin artículos se queda lo del HTML.
    const destacado = ARTS.find((a) => a.destacado) || ARTS[0];
    const fig = $("[data-destacado]");
    if (fig && destacado) {
      fig.innerHTML = '<a class="art-img" href="' + postUrl(destacado) + '" tabindex="-1" aria-hidden="true">' + artPortada(destacado, { prioridad: true, marca: true }) + "</a>" +
        '<figcaption><span class="kicker">' + t("hero.destacado") + " · " + esc((seccionDe(destacado.seccion) || {}).nombre || "") + "</span>" +
        '<a href="' + postUrl(destacado) + '"' + langAttr(destacado) + ">" + esc(destacado.titulo) + "</a></figcaption>";
    }

    // Empieza a explorar: cada tarjeta lleva la foto del artículo más nuevo de su
    // sección; la del podcast, la del episodio más nuevo.
    $$("[data-puerta]").forEach((el) => {
      const id = el.dataset.puerta;
      if (id === "podcast") {
        const ep = EPS[0];
        if (ep && (ep.portada || ep.youtube)) {
          el.innerHTML = '<div class="art-portada"><img src="' + esc(ep.portada ? BASE + ep.portada : ytThumb(ep.youtube)) + '" alt="" loading="lazy" width="480" height="360">' + (ep.ejemplo ? badgeEjemplo() : "") + "</div>";
        }
        return;
      }
      const a = ARTS.find((x) => x.seccion === id);
      if (a) el.innerHTML = artPortada(a, { conTitulo: true });
    });

    // En redes: solo si se le quitó "hidden" a la sección en index.html.
    const red = $("#en-redes");
    if (red && !red.hidden) montarEnRedes(red, CFG.enRedes || {});

    programarPopup();
  };

  PAGES.explorar = function () {
    const root = $("#explorar");
    const idiomas = Array.from(new Set(ARTS.map((a) => a.idioma || "es")));
    const st = { seccion: params.get("seccion") || "", tema: params.get("tema") || "", idioma: params.get("idioma") || "", q: params.get("q") || "", orden: "desc", n: 12 };
    if (st.seccion && !seccionDe(st.seccion)) st.seccion = "";
    root.innerHTML = '<div class="wrap">' +
      '<div class="tabs" role="group" aria-label="' + t("exp.secciones") + '">' +
      [["", t("exp.todo")]].concat(SECCIONES.map((s) => [s.id, s.nombre])).map(([id, n]) =>
        '<button type="button" class="tab" data-seccion="' + esc(id) + '" aria-pressed="' + (st.seccion === id) + '"' + (id === "sobremesa" ? ' translate="no"' : "") + ">" + esc(n) + "</button>").join("") +
      "</div>" +
      '<p class="tab-desc" hidden></p>' +
      '<div class="lista-controles' + (idiomas.length > 1 ? "" : " lista-controles--2") + '">' +
      '<div class="campo"><label for="buscar">' + t("exp.buscar") + '</label><input type="search" id="buscar" autocomplete="off"></div>' +
      (idiomas.length > 1 ? '<div class="campo"><label for="f-idioma">' + t("exp.idioma") + '</label><select id="f-idioma"><option value="">' + t("exp.idioma.todos") + "</option>" +
        ["es", "en"].filter((i) => idiomas.includes(i)).map((i) => '<option value="' + i + '"' + (i === "en" ? ' lang="en"' : "") + ">" + t("exp.idioma." + i) + "</option>").join("") + "</select></div>" : "") +
      '<div class="campo"><label for="f-orden">' + t("lista.orden") + '</label><select id="f-orden"><option value="desc">' + t("lista.orden.nuevos") + '</option><option value="asc">' + t("lista.orden.viejos") + "</option></select></div>" +
      "</div>" +
      filtroHTML(temasUsados(ARTS), st.tema) +
      '<p class="lista-contador" aria-live="polite"></p><div class="art-rejilla"></div>' +
      '<p class="ver-mas" hidden><button class="btn btn--hueco" type="button">' + t("exp.vermas") + "</button></p></div>";

    const input = $("#buscar", root), selIdioma = $("#f-idioma", root), rejilla = $(".art-rejilla", root), verMas = $(".ver-mas", root), desc = $(".tab-desc", root);
    input.value = st.q;
    if (selIdioma) selIdioma.value = st.idioma;
    const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    function filtrados() {
      const q = norm(st.q);
      const l = ARTS.filter((a) => {
        if (st.seccion && a.seccion !== st.seccion) return false;
        if (st.tema && !(a.temas || []).includes(st.tema)) return false;
        if (st.idioma && (a.idioma || "es") !== st.idioma) return false;
        if (!q) return true;
        const s = seccionDe(a.seccion);
        return norm([a.titulo, a.resumen, a.cuerpo, (a.personas || []).map((x) => x.nombre + " " + x.rol).join(" "), (a.temas || []).map(temaNombre).join(" "), s ? s.nombre : ""].join(" ")).includes(q);
      });
      return st.orden === "asc" ? l.slice().reverse() : l;
    }
    function pintar() {
      const l = filtrados();
      const s = seccionDe(st.seccion);
      desc.textContent = s ? s.descripcion || "" : "";
      desc.hidden = !desc.textContent;
      document.title = (s ? s.nombre : t("exp.titulo")) + " | Café Con Dos";
      $(".lista-contador", root).textContent = l.length + " " + (l.length === 1 ? t("exp.resultado") : t("exp.resultados"));
      // Sin búsqueda ni tema, lo más nuevo sale en grande.
      const lead = !st.q && !st.tema && st.orden === "desc" && l.length > 2;
      rejilla.innerHTML = l.slice(0, st.n).map((a, i) => artCard(a, { destacado: lead && i === 0 })).join("") ||
        '<div class="vacio"><p>' + t("exp.vacio") + '</p><button class="btn btn--hueco" type="button" id="limpiar">' + t("lista.limpiar") + "</button></div>";
      verMas.hidden = l.length <= st.n;
      const limpiar = $("#limpiar", root);
      if (limpiar) limpiar.addEventListener("click", () => {
        Object.assign(st, { seccion: "", tema: "", idioma: "", q: "", n: 12 });
        input.value = ""; if (selIdioma) selIdioma.value = "";
        $$("[data-seccion]", root).forEach((x) => x.setAttribute("aria-pressed", x.dataset.seccion === ""));
        $$("[data-filtro]", root).forEach((x) => x.setAttribute("aria-pressed", x.dataset.filtro === ""));
        sync();
      });
    }
    function sync() {
      const u = new URL(location.href);
      ["seccion", "tema", "idioma", "q"].forEach((k) => (st[k] ? u.searchParams.set(k, st[k]) : u.searchParams.delete(k)));
      history.replaceState(null, "", u);
      pintar();
    }
    $$("[data-seccion]", root).forEach((b) => b.addEventListener("click", () => {
      $$("[data-seccion]", root).forEach((x) => x.setAttribute("aria-pressed", x === b));
      st.seccion = b.dataset.seccion; st.n = 12; sync();
    }));
    $$("[data-filtro]", root).forEach((b) => b.addEventListener("click", () => {
      $$("[data-filtro]", root).forEach((x) => x.setAttribute("aria-pressed", x === b));
      st.tema = b.dataset.filtro; st.n = 12; sync();
    }));
    input.addEventListener("input", () => { st.q = input.value.trim(); st.n = 12; sync(); });
    if (selIdioma) selIdioma.addEventListener("change", () => { st.idioma = selIdioma.value; st.n = 12; sync(); });
    $("#f-orden", root).addEventListener("change", (e) => { st.orden = e.target.value; pintar(); });
    $("button", verMas).addEventListener("click", () => { st.n += 12; pintar(); });
    // La lupa del encabezado trae aquí con #buscar: el cursor queda en la búsqueda.
    const enfocar = () => { if (location.hash === "#buscar") { input.focus({ preventScroll: true }); input.scrollIntoView({ block: "center" }); } };
    window.addEventListener("hashchange", enfocar);
    pintar();
    enfocar();
  };

  PAGES.episodios = function () {
    const root = $("#lista");
    const series = (CFG.series || []).filter((s) => EPS.some((e) => e.serie === s.id));
    root.innerHTML = '<div class="wrap">' +
      '<div class="lista-controles">' +
      '<div class="campo"><label for="buscar">' + t("lista.buscar") + '</label><input type="search" id="buscar" autocomplete="off"></div>' +
      (series.length ? '<div class="campo"><label for="f-serie">' + t("lista.serie") + '</label><select id="f-serie"><option value="">' + t("lista.serie.todas") + "</option>" +
        series.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.nombre) + "</option>").join("") + '<option value="__ninguna">Café Con Dos</option></select></div>' : "") +
      '<div class="campo"><label for="f-orden">' + t("lista.orden") + '</label><select id="f-orden"><option value="desc">' + t("lista.orden.nuevos") + '</option><option value="asc">' + t("lista.orden.viejos") + "</option></select></div>" +
      "</div>" +
      filtroHTML(temasUsados(EPS), params.get("tema") || "") +
      '<p class="lista-contador" aria-live="polite"></p><div class="rejilla"></div></div>';

    const st = { q: params.get("q") || "", tema: params.get("tema") || "", serie: params.get("serie") || "", orden: "desc" };
    const input = $("#buscar"); input.value = st.q;
    if ($("#f-serie")) $("#f-serie").value = st.serie;

    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    function pintar() {
      const q = norm(st.q);
      let lista = EPS.filter((e) => {
        if (st.tema && !(e.temas || []).includes(st.tema)) return false;
        if (st.serie === "__ninguna" && e.serie) return false;
        if (st.serie && st.serie !== "__ninguna" && e.serie !== st.serie) return false;
        if (!q) return true;
        const hay = [e.titulo, e.resumen, (e.invitados || []).map((i) => i.nombre + " " + i.rol).join(" "), (e.temas || []).map(temaNombre).join(" ")].join(" ");
        return norm(hay).includes(q);
      });
      if (st.orden === "asc") lista = lista.slice().reverse();
      $(".lista-contador", root).textContent = lista.length + " " + (lista.length === 1 ? t("lista.resultado") : t("lista.resultados"));
      $(".rejilla", root).innerHTML = lista.map(epCard).join("");
      if (!lista.length) $(".rejilla", root).innerHTML = '<div class="vacio"><p>' + t("lista.vacio") + '</p><button class="btn btn--hueco" type="button" id="limpiar">' + t("lista.limpiar") + "</button></div>";
      const l = $("#limpiar");
      if (l) l.addEventListener("click", () => { st.q = ""; st.tema = ""; st.serie = ""; input.value = ""; if ($("#f-serie")) $("#f-serie").value = ""; $$("[data-filtro]", root).forEach((x) => x.setAttribute("aria-pressed", x.dataset.filtro === "")); sync(); });
    }
    function sync() {
      const u = new URL(location.href);
      ["q", "tema", "serie"].forEach((k) => (st[k] ? u.searchParams.set(k, st[k]) : u.searchParams.delete(k)));
      history.replaceState(null, "", u);
      pintar();
    }
    input.addEventListener("input", () => { st.q = input.value.trim(); sync(); });
    if ($("#f-serie")) $("#f-serie").addEventListener("change", (e) => { st.serie = e.target.value; sync(); });
    $("#f-orden").addEventListener("change", (e) => { st.orden = e.target.value; pintar(); });
    $$("[data-filtro]", root).forEach((b) => b.addEventListener("click", () => {
      $$("[data-filtro]", root).forEach((x) => x.setAttribute("aria-pressed", x === b));
      st.tema = b.dataset.filtro; sync();
    }));
    pintar();
  };

  function noEncontrado(root, titulo, sub, href, cta) {
    root.innerHTML = '<div class="wrap error-404">' + tazaHTML() + "<h1>" + titulo + '</h1><p class="lead">' + sub + '</p><p><a class="btn" href="' + href + '">' + cta + "</a></p></div>";
  }

  PAGES.episodio = function () {
    const root = $("#episodio");
    const id = params.get("id");
    const ep = EPS.find((e) => e.id === id);
    if (!ep) { noEncontrado(root, t("ep.noencontrado"), t("ep.noencontrado.sub"), "episodios.html", t("lista.titulo")); setMeta(t("ep.noencontrado")); return; }
    setMeta(loc(ep, "titulo"), loc(ep, "resumen"));
    const s = ep.serie && serieDe(ep.serie);
    const idx = EPS.indexOf(ep);
    const nuevo = EPS[idx - 1], viejo = EPS[idx + 1];
    const relacionados = EPS.filter((e) => e !== ep && (e.temas || []).some((x) => (ep.temas || []).includes(x))).slice(0, 3);

    // Lo principal: el video de YouTube. Si no hay, el reproductor de Spotify.
    const media = ep.youtube
      ? '<div class="hero-mesa ep-media"><div class="burbuja"><div class="video" id="video-ep"><iframe id="yt" src="' + ytEmbed(ep.youtube) + '" title="' + esc(loc(ep, "titulo")) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></div></div>'
      : ep.spotify
        ? '<div class="hero-mesa ep-media"><div class="burbuja"><div class="spotify-embed"><iframe src="https://open.spotify.com/embed/episode/' + esc(ep.spotify) + '?utm_source=generator" height="232" title="' + esc(loc(ep, "titulo")) + ' en Spotify" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div></div></div>'
        : "";
    const botones = '<div class="ep-botones">' +
      '<a class="btn" href="' + esc(ep.youtube ? "https://www.youtube.com/watch?v=" + ep.youtube : CFG.redes.youtube) + '" target="_blank" rel="noopener"><span class="btn-icono"><img src="' + icono("youtube") + '" alt=""></span>' + t("ep.verYoutube") + "</a>" +
      '<a class="btn btn--hueco" href="' + esc(ep.spotify ? "https://open.spotify.com/episode/" + ep.spotify : CFG.redes.spotify) + '" target="_blank" rel="noopener"><span class="btn-icono"><img src="' + icono("spotify") + '" alt=""></span>' + t("ep.escucharSpotify") + "</a>" +
      "</div>";

    const momentos = (ep.momentos || []).length ? "<section><h2>" + t("ep.momentos") + '</h2><ol class="momentos">' +
      ep.momentos.map((m) => '<li><button type="button" data-t="' + esc(m.t) + '"' + (ep.youtube ? "" : " disabled") + '><span class="t">' + esc(m.t) + "</span><span>" + esc(m.texto) + "</span></button></li>").join("") +
      "</ol></section>" : "";

    const invitados = (ep.invitados || []).length ? "<section><h2>" + t("ep.invitados") + "</h2>" +
      ep.invitados.map((i) => '<div class="invitado"><b>' + (i.link ? '<a href="' + esc(i.link) + '" target="_blank" rel="noopener">' + esc(i.nombre) + "</a>" : esc(i.nombre)) + "</b>" + (i.rol ? "<span>" + esc(i.rol) + "</span>" : "") + "</div>").join("") +
      "</section>" : "";

    root.innerHTML = '<div class="wrap">' +
      '<nav class="migas" aria-label="Migas"><a href="episodios.html">' + t("nav.episodios") + "</a><span aria-hidden=\"true\">/</span>" +
      (s ? '<a href="' + serieUrl(s) + '">' + esc(s.nombre) + "</a>" : "<span>" + esc(numeroEp(ep) || "") + "</span>") + "</nav>" +
      '<header class="ep-cabeza">' + metaEp(ep) + "<h1>" + esc(loc(ep, "titulo")) + "</h1>" +
      (loc(ep, "resumen") ? '<p class="lead">' + esc(loc(ep, "resumen")) + "</p>" : "") + "</header>" +
      media + botones +
      '<div class="ep-cuerpo"><div>' +
      (loc(ep, "notas") ? "<section><h2>" + t("ep.notas") + '</h2><div class="prosa">' + md(loc(ep, "notas")) + "</div></section>" : "") +
      '<div style="margin-top:32px">' + chipsTemas(ep.temas) + "</div>" +
      "</div>" +
      '<aside class="ep-lateral">' + invitados + momentos +
      "<section><h2>" + t("comp.titulo") + "</h2>" + compartirHTML(loc(ep, "titulo")) + "</section>" +
      "</aside></div>" +
      (nuevo || viejo ? '<nav class="vecinos" aria-label="Episodios">' +
        (viejo ? '<a href="' + epUrl(viejo) + '"><small>' + t("ep.anterior") + "</small><b>" + esc(loc(viejo, "titulo")) + "</b></a>" : "<span></span>") +
        (nuevo ? '<a class="sig" href="' + epUrl(nuevo) + '"><small>' + t("ep.siguiente") + "</small><b>" + esc(loc(nuevo, "titulo")) + "</b></a>" : "") +
        "</nav>" : "") +
      "</div>" +
      (relacionados.length ? '<section class="seccion"><div class="wrap"><h2>' + t("ep.relacionados") + '</h2><div class="rejilla" style="margin-top:28px">' + relacionados.map(epCard).join("") + "</div></div></section>" : "");

    $$(".momentos button[data-t]", root).forEach((b) => b.addEventListener("click", () => {
      const p = b.dataset.t.split(":").map(Number);
      const seg = p.reduce((acc, n) => acc * 60 + (n || 0), 0);
      const f = $("#yt");
      if (f) { f.src = ytEmbed(ep.youtube, "&autoplay=1&start=" + seg); $("#video-ep").scrollIntoView({ behavior: "smooth", block: "center" }); }
    }));
  };

  PAGES.sobremesa = function () {
    const root = $("#sob");
    const temas = temasUsados(POSTS);
    let tema = params.get("tema") || "";
    root.innerHTML = '<div class="wrap">' + (temas.length > 1 ? '<div class="sob-filtro">' + filtroHTML(temas, tema) + "</div>" : "") + '<div class="sob-grid"></div></div>';
    const grid = $(".sob-grid", root);
    const pintar = () => {
      const l = POSTS.filter((p) => !tema || (p.temas || []).includes(tema));
      grid.innerHTML = l.map(sobItem).join("") || '<p class="vacio">' + t("sob.vacio") + "</p>";
    };
    $$("[data-filtro]", root).forEach((b) => b.addEventListener("click", () => {
      $$("[data-filtro]", root).forEach((x) => x.setAttribute("aria-pressed", x === b));
      tema = b.dataset.filtro;
      const u = new URL(location.href);
      if (tema) u.searchParams.set("tema", tema); else u.searchParams.delete("tema");
      history.replaceState(null, "", u);
      pintar();
    }));
    pintar();
  };

  PAGES.entrada = function () {
    const root = $("#entrada");
    const p = ARTS.find((x) => x.id === params.get("id"));
    if (!p) { noEncontrado(root, t("art.noencontrado"), "", "explorar.html", t("art.volver")); setMeta(t("art.noencontrado")); return; }
    setMeta(p.titulo, p.resumen);
    const s = seccionDe(p.seccion);
    const esSob = p.seccion === "sobremesa";
    const a = autorDe(p.autor);
    const ep = p.episodio && EPS.find((e) => e.id === p.episodio);
    const L = langAttr(p);
    // Sigue leyendo: primero lo de la misma sección y con más temas en común.
    const comun = (x) => (x.temas || []).filter((tm) => (p.temas || []).includes(tm)).length;
    const relacionados = ARTS.filter((x) => x !== p)
      .map((x) => ({ x, puntos: (x.seccion === p.seccion ? 2 : 0) + comun(x) }))
      .filter((o) => o.puntos > 0).sort((m, n) => n.puntos - m.puntos).slice(0, 3).map((o) => o.x);
    const personas = (p.personas || []).length
      ? '<section class="art-personas"><h2>' + t("art.personas") + "</h2>" + p.personas.map((i) => '<div class="invitado"><b>' +
        (i.link ? '<a href="' + esc(i.link) + '" target="_blank" rel="noopener">' + esc(i.nombre) + "</a>" : esc(i.nombre)) + "</b>" + (i.rol ? "<span>" + esc(i.rol) + "</span>" : "") + "</div>").join("") + "</section>"
      : "";
    const portada = p.portada
      ? '<figure class="entrada-portada"><img src="' + esc(imgSrc(p.portada)) + '" alt="' + esc(p.portadaAlt || "") + '" width="1200" height="800"' + imgPos(p) + "></figure>"
      : "";

    root.innerHTML = '<article class="wrap">' +
      '<nav class="migas" aria-label="Migas">' +
      (esSob ? '<a href="sobremesa.html" translate="no">' + t("sob.titulo") + "</a>"
        : '<a href="explorar.html">' + t("nav.explorar") + "</a>" + (s ? '<span aria-hidden="true">/</span><a href="' + seccionUrl(s.id) + '">' + esc(s.nombre) + "</a>" : "")) +
      "</nav>" +
      '<header class="entrada-cabeza">' + artKicker(p) +
      "<h1" + L + ">" + esc(p.titulo) + "</h1>" +
      (p.resumen ? '<p class="lead"' + L + ">" + esc(p.resumen) + "</p>" : "") +
      '<div class="entrada-firma">' +
      (a ? '<div class="autor">' + (a.foto ? '<img src="' + esc(BASE + a.foto) + '" alt="">' : tazaHTML("taza-mini")) + "<div><b>" + esc(a.nombre) + "</b><span>" + esc(loc(a, "rol")) + "</span></div></div>" : "") +
      artMeta(p) + (p.ejemplo ? '<span class="badge-ejemplo badge-ejemplo--suelto">' + t("ep.ejemplo") + "</span>" : "") + "</div></header>" +
      portada +
      '<div class="entrada-cuerpo' + (portada ? "" : " entrada-cuerpo--sin-foto") + '">' +
      '<div class="prosa"' + L + ">" + md(p.cuerpo) + "</div>" +
      ((p.temas || []).length ? '<div class="entrada-temas">' + chipsTemas(p.temas, BASE + (esSob ? "sobremesa.html" : "explorar.html")) + "</div>" : "") +
      personas +
      (ep ? '<section class="entrada-ep"><h2>' + t("art.relacionado") + '</h2><div class="rejilla">' + epCard(ep) + "</div></section>" : "") +
      '<section class="entrada-compartir"><h2>' + t("comp.titulo") + "</h2>" + compartirHTML(p.titulo) + "</section>" +
      '<section class="comentarios" id="comentarios" hidden></section>' +
      "</div></article>" +
      (relacionados.length ? '<section class="seccion sigue"><div class="wrap"><h2>' + t("art.sigue") + '</h2><div class="art-rejilla">' + relacionados.map((x) => artCard(x)).join("") + "</div></div></section>" : "");
    montarComentarios($("#comentarios", root), p.id);

    // Datos estructurados para Google (BlogPosting).
    const site = String(CFG.siteUrl || "").replace(/\/$/, "");
    jsonLD({
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: p.titulo, description: p.resumen || "", datePublished: p.fecha, inLanguage: p.idioma || "es",
      articleSection: s ? s.nombre : "", keywords: (p.temas || []).map(temaNombre).join(", "),
      image: p.portada ? (/^https?:/.test(p.portada) ? p.portada : site + "/" + p.portada) : site + "/images/og-cafe-con-dos.jpg",
      author: a ? { "@type": "Person", name: a.nombre } : { "@type": "Organization", name: "Café Con Dos" },
      publisher: { "@type": "Organization", name: "Café Con Dos", logo: { "@type": "ImageObject", url: site + "/images/logo.png" } },
      mainEntityOfPage: site + "/entrada.html?id=" + encodeURIComponent(p.id)
    });
  };

  PAGES.contacto = function () {
    const root = $("#contacto");
    if (!root) return;
    const alias = { invitado: "entrevista" }; // links viejos (?motivo=invitado)
    const motivo = alias[params.get("motivo")] || params.get("motivo") || "";
    const C = CFG.contacto || {};
    const form = $("form", root), aviso = $(".aviso", form), btn = $("button[type=submit]", form);
    const textoBoton = btn.textContent;
    // ?motivo=colab (por ejemplo) deja ese motivo elegido.
    if (Array.from(form.motivo.options).some((o) => o.value === motivo)) form.motivo.value = motivo;
    // Las tres tarjetas de arriba eligen el motivo y llevan al formulario.
    const marcar = () => $$(".con-tipo", root).forEach((b) => b.setAttribute("aria-pressed", b.dataset.motivo === form.motivo.value));
    $$(".con-tipo", root).forEach((b) => b.addEventListener("click", () => {
      form.motivo.value = b.dataset.motivo; marcar();
      form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      setTimeout(() => form.nombre.focus({ preventScroll: true }), 350);
    }));
    form.motivo.addEventListener("change", marcar);
    if (motivo) marcar();
    const mostrar = (msg, err) => { aviso.textContent = msg; aviso.hidden = false; aviso.classList.toggle("aviso--error", !!err); };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form._gotcha.value) return;
      const nombre = form.nombre.value.trim(), email = form.email.value.trim(), mensaje = form.mensaje.value.trim();
      if (!nombre) { form.nombre.focus(); return mostrar(t("con.faltaNombre"), true); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { form.email.focus(); return mostrar(t("bol.invalido"), true); }
      if (!mensaje) { form.mensaje.focus(); return mostrar(t("con.faltaMensaje"), true); }
      const motivoTxt = form.motivo.options[form.motivo.selectedIndex].text;
      if (C.action) {
        btn.disabled = true; btn.textContent = t("con.enviando");
        try {
          const r = await fetch(C.action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
          if (!r.ok) throw new Error(r.status);
          form.reset(); mostrar(t("con.ok"));
        } catch (err) { mostrar(t("con.error"), true); }
        finally { btn.disabled = false; btn.textContent = textoBoton; }
      } else if (C.email) {
        location.href = "mailto:" + C.email + "?subject=" + encodeURIComponent("[Café Con Dos] " + motivoTxt) + "&body=" + encodeURIComponent(mensaje + "\n\n— " + nombre + " (" + email + ")");
      } else {
        mostrar(t("con.sinform"), true);
      }
    });
  };

  /* ---------------- Muy pronto (loading.html): el botón del sonido ----------------
     Los navegadores no dejan que una página suene sola al abrirla: el sonido
     arranca cuando la persona toca el botón. */
  PAGES.pronto = function () {
    const btn = $("[data-sonido]"), audio = $("#sonido-cafe");
    if (!btn || !audio) return;
    const etiqueta = $("span", btn);
    audio.volume = 0.7;
    const pintar = (sonando) => {
      btn.setAttribute("aria-pressed", sonando);
      if (etiqueta) etiqueta.textContent = sonando ? btn.dataset.pausa : btn.dataset.play;
    };
    btn.addEventListener("click", () => {
      if (audio.paused) audio.play().then(() => pintar(true)).catch(() => pintar(false));
      else { audio.pause(); pintar(false); }
    });
    audio.addEventListener("pause", () => pintar(false));
  };

  /* ---------------- Burbuja "Invítanos un café" ---------------- */
  function renderApoyo() {
    const A = CFG.apoyo || {};
    const opciones = [
      A.cafeConDos && { url: A.cafeConDos, titulo: t("apoyo.nos"), sub: t("apoyo.nos.sub"), icono: '<img src="' + BASE + 'images/taza.png" alt="">' },
      A.developer && { url: A.developer, titulo: t("apoyo.dev"), sub: t("apoyo.dev.sub"), icono: '<span class="apoyo-dev" aria-hidden="true">&lt;/&gt;</span>' }
    ].filter(Boolean);
    if (A.mostrar === false || !opciones.length) return;

    const caja = document.createElement("div");
    caja.className = "apoyo";
    caja.innerHTML =
      '<div class="apoyo-panel" id="apoyo-panel" role="dialog" aria-labelledby="apoyo-titulo" hidden>' +
      '<p class="apoyo-titulo" id="apoyo-titulo">' + t("apoyo.titulo") + "</p>" +
      '<ul class="apoyo-opciones">' + opciones.map((o) =>
        '<li><a href="' + esc(o.url) + '" target="_blank" rel="noopener"><span class="apoyo-ico">' + o.icono + "</span>" +
        "<span><b>" + esc(o.titulo) + "</b><small>" + esc(o.sub) + "</small></span></a></li>").join("") + "</ul></div>" +
      '<div class="apoyo-aviso" hidden><button type="button" class="apoyo-aviso-texto">' + t("apoyo.aviso") + "</button>" +
      '<button type="button" class="apoyo-aviso-cerrar" aria-label="' + t("apoyo.cerrar") + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>' +
      '<button type="button" class="apoyo-burbuja" aria-expanded="false" aria-controls="apoyo-panel" aria-label="' + t("apoyo.titulo") + '">' +
      '<img src="' + BASE + 'images/taza.png" alt=""><span class="apoyo-punto" hidden></span></button>';
    document.body.appendChild(caja);

    const panel = $(".apoyo-panel", caja), btn = $(".apoyo-burbuja", caja), aviso = $(".apoyo-aviso", caja), punto = $(".apoyo-punto", caja);
    const KEY = "ccd-apoyo-aviso";
    const cerrarAviso = () => { if (!aviso.hidden) { aviso.hidden = true; punto.hidden = true; store(KEY, String(Date.now())); } };
    const abrir = (si) => {
      panel.hidden = !si;
      btn.setAttribute("aria-expanded", si);
      if (si) { cerrarAviso(); const a = $("a", panel); if (a) a.focus(); }
    };
    btn.addEventListener("click", () => abrir(panel.hidden));
    $(".apoyo-aviso-texto", caja).addEventListener("click", () => abrir(true));
    $(".apoyo-aviso-cerrar", caja).addEventListener("click", cerrarAviso);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { abrir(false); btn.focus(); } });
    document.addEventListener("click", (e) => { if (!panel.hidden && !caja.contains(e.target)) abrir(false); });
    // En el celular, mientras alguien escribe en un formulario, la burbuja se aparta.
    const esCampo = (el) => el && el.matches && el.matches("input, textarea, select") && !caja.contains(el);
    document.addEventListener("focusin", (e) => { if (esCampo(e.target) && innerWidth < 700) caja.classList.add("is-oculta"); });
    document.addEventListener("focusout", (e) => { if (esCampo(e.target)) caja.classList.remove("is-oculta"); });

    // El globito de aviso: una vez cada 7 días por visitante y una sola
    // ventanita por visita. En la portada, si toca la del boletín, gana esa.
    const visto = Number(store(KEY) || 0);
    const segs = Number(A.avisoSegundos || 0);
    const enPortadaConBoletin = document.body.dataset.page === "inicio" && popupPendiente();
    if (segs > 0 && !enPortadaConBoletin && Date.now() - visto > 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        if ($(".popup") || !panel.hidden || !pedirTurno()) return;
        aviso.hidden = false; punto.hidden = false;
      }, segs * 1000);
    }
  }

  /* ---------------- arranque ---------------- */
  window.CCD = { md, esc, epCard, sobItem, artCard, portadaHTML, temaNombre, seccionDe, fecha, loc, t, EPS, ARTS, POSTS, CFG };

  const page = document.body && document.body.dataset.page;
  if (page) {
    montarEncabezado(page);
    montarPie();
    if (PAGES[page]) PAGES[page]();
    montarBoletines();
    renderApoyo();
  }
})();
