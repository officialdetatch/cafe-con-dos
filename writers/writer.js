/* ==========================================================================
   Motor de los writers de Café Con Dos.
   Cada writer (episodio-writer.html, articulo-writer.html) le pasa a
   CCDWriter() la lista de campos y el archivo de datos que maneja.
   Nada se sube a internet desde aquí: el writer arma el archivo actualizado
   y tú lo descargas, lo pones en la carpeta del sitio y haces commit/push.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CFG = window.CCD_CONFIG || {};
  const hoy = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  /* ---------- extractores de enlaces ---------- */
  function youtubeId(v) {
    v = String(v || "").trim();
    if (!v) return "";
    if (/^[\w-]{11}$/.test(v)) return v;
    const m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function spotifyId(v) {
    v = String(v || "").trim();
    if (!v) return "";
    if (/^[A-Za-z0-9]{22}$/.test(v)) return v;
    const m = v.match(/episode[/:]([A-Za-z0-9]{22})/);
    return m ? m[1] : null;
  }

  /* ---------- tipos de campo ----------
     Cada tipo devuelve { el, get(), set(v), validate() -> "" | "mensaje" } */
  const TIPOS = {};

  function base(f, inner, ctx) {
    const el = document.createElement("div");
    el.className = "w-campo" + (f.ancho ? " w-campo--" + f.ancho : "");
    el.innerHTML = (f.label ? '<label for="f-' + f.key + '">' + esc(f.label) + (f.required ? ' <span class="req" aria-hidden="true">*</span>' : "") + "</label>" : "") +
      inner + (f.hint ? '<p class="w-hint">' + f.hint + "</p>" : "") + '<p class="w-error" hidden></p>';
    return el;
  }

  TIPOS.text = (f) => {
    const el = base(f, '<input type="text" id="f-' + f.key + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") + (f.max ? ' maxlength="' + f.max + '"' : "") + ">");
    const i = $("input", el);
    return { el, input: i, get: () => i.value.trim(), set: (v) => (i.value = v == null ? "" : v), validate: () => (f.required && !i.value.trim() ? "Este campo es obligatorio." : "") };
  };

  TIPOS.corto = (f) => {
    const el = base(f, '<textarea id="f-' + f.key + '" rows="' + (f.rows || 3) + '"' + (f.max ? ' maxlength="' + f.max + '"' : "") + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") + '></textarea>' + (f.max ? '<span class="w-hint w-cuenta"></span>' : ""));
    const ta = $("textarea", el), cuenta = $(".w-cuenta", el);
    const contar = () => { if (cuenta) cuenta.textContent = ta.value.length + " / " + f.max; };
    ta.addEventListener("input", contar);
    return { el, input: ta, get: () => ta.value.trim().replace(/\s*\n\s*/g, " "), set: (v) => { ta.value = v || ""; contar(); }, validate: () => (f.required && !ta.value.trim() ? "Este campo es obligatorio." : "") };
  };

  TIPOS.number = (f) => {
    const el = base(f, '<input type="number" min="0" step="1" id="f-' + f.key + '" inputmode="numeric">');
    const i = $("input", el);
    return { el, input: i, get: () => (i.value === "" ? null : Number(i.value)), set: (v) => (i.value = v == null ? "" : v), validate: () => "" };
  };

  TIPOS.date = (f) => {
    const el = base(f, '<input type="date" id="f-' + f.key + '">');
    const i = $("input", el);
    return { el, input: i, get: () => i.value, set: (v) => (i.value = v || hoy()), validate: () => (f.required && !i.value ? "Elige una fecha." : "") };
  };

  TIPOS.checkbox = (f) => {
    const el = document.createElement("div");
    el.className = "w-campo w-check";
    el.innerHTML = '<label><input type="checkbox" id="f-' + f.key + '"> ' + esc(f.label) + "</label>" + (f.hint ? '<p class="w-hint">' + f.hint + "</p>" : "");
    const i = $("input", el);
    return { el, input: i, get: () => i.checked, set: (v) => (i.checked = !!v), validate: () => "" };
  };

  TIPOS.select = (f, ctx) => {
    const el = base(f, '<select id="f-' + f.key + '"></select>');
    const s = $("select", el);
    const fill = () => {
      const cur = s.value;
      s.innerHTML = f.options(ctx).map((o) => '<option value="' + esc(o.v) + '">' + esc(o.l) + "</option>").join("");
      s.value = cur;
    };
    fill();
    return { el, input: s, refresh: fill, get: () => s.value, set: (v) => { fill(); s.value = v || ""; }, validate: () => "" };
  };

  TIPOS.slug = (f, ctx) => {
    const el = base(f, '<div class="w-slug"><span>' + esc(f.prefijo || "") + '</span><input type="text" id="f-' + f.key + '" spellcheck="false" autocomplete="off"></div>');
    const i = $("input", el);
    let manual = false;
    i.addEventListener("input", () => { manual = true; i.value = i.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"); });
    return {
      el, input: i,
      get: () => i.value.trim(),
      set: (v) => { i.value = v || ""; manual = !!v; },
      auto: (src) => { if (!manual) i.value = slugify(src); },
      validate: () => {
        const v = i.value.trim();
        if (!v) return "Falta el link. Se genera solo al escribir el título.";
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) return "Usa solo letras minúsculas, números y guiones.";
        if (ctx.data.some((d, idx) => d.id === v && idx !== ctx.editIndex)) return "Ya existe otro con este link. Cámbialo un poco.";
        return "";
      }
    };
  };

  TIPOS.temas = (f, ctx) => {
    const el = base(f, '<ul class="chips w-chips"></ul><div class="w-tema-nuevo"><input type="text" placeholder="Otro tema…" aria-label="Agregar otro tema"><button type="button" class="w-btn w-btn--sm">Agregar</button></div>');
    const ul = $("ul", el), inp = $(".w-tema-nuevo input", el);
    let sel = [];
    const todos = () => {
      const ids = (CFG.temas || []).map((t) => t.id);
      ctx.data.forEach((d) => (d.temas || []).forEach((t) => { if (!ids.includes(t)) ids.push(t); }));
      sel.forEach((t) => { if (!ids.includes(t)) ids.push(t); });
      return ids;
    };
    const nombre = (id) => { const t = (CFG.temas || []).find((x) => x.id === id); return t ? (t.nombre || t.es) : id.replace(/-/g, " "); };
    const pintar = () => {
      ul.innerHTML = todos().map((id) => '<li><button type="button" class="chip chip--sm" aria-pressed="' + sel.includes(id) + '" data-id="' + esc(id) + '">' + esc(nombre(id)) + "</button></li>").join("");
    };
    ul.addEventListener("click", (e) => {
      const b = e.target.closest("[data-id]"); if (!b) return;
      const id = b.dataset.id;
      sel = sel.includes(id) ? sel.filter((x) => x !== id) : sel.concat(id);
      pintar(); ctx.onChange();
    });
    const agregar = () => { const id = slugify(inp.value); if (id && !sel.includes(id)) sel.push(id); inp.value = ""; pintar(); ctx.onChange(); };
    $(".w-tema-nuevo button", el).addEventListener("click", agregar);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } });
    return { el, get: () => sel.slice(), set: (v) => { sel = (v || []).slice(); pintar(); }, validate: () => (f.required && !sel.length ? "Elige al menos un tema." : "") };
  };

  function linkField(f, extractor, prev) {
    const el = base(f, '<input type="text" id="f-' + f.key + '" spellcheck="false" autocomplete="off" placeholder="' + esc(f.placeholder || "") + '"><div class="w-link-prev"></div>');
    const i = $("input", el), p = $(".w-link-prev", el);
    const show = () => {
      const id = extractor(i.value);
      if (id === null) p.innerHTML = '<span class="w-mal">No reconozco ese enlace.</span>';
      else if (!id) p.innerHTML = "";
      else p.innerHTML = prev(id);
    };
    i.addEventListener("input", show);
    return {
      el, input: i,
      get: () => extractor(i.value) || "",
      set: (v) => { i.value = v || ""; show(); },
      validate: () => (extractor(i.value) === null ? "Pega el link completo (o déjalo vacío)." : "")
    };
  }
  TIPOS.youtube = (f) => linkField(f, youtubeId, (id) => '<img src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg" alt="" width="160" height="90"><span>Video encontrado: <code>' + id + "</code></span>");
  TIPOS.spotify = (f) => linkField(f, spotifyId, (id) => '<span>Episodio de Spotify encontrado: <code>' + id + "</code></span>");

  TIPOS.imagen = (f) => {
    const el = base(f, '<input type="text" id="f-' + f.key + '" spellcheck="false" placeholder="' + esc(f.placeholder || "") + '"><div class="w-link-prev"></div>');
    const i = $("input", el), p = $(".w-link-prev", el);
    const show = () => {
      const v = i.value.trim();
      p.innerHTML = v ? '<img src="' + esc(/^https?:/.test(v) ? v : "../" + v) + '" alt="" style="max-height:110px;width:auto" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'w-mal\',textContent:\'No encuentro esa imagen todavía. Revisa que el archivo esté en la carpeta.\'}))">' : "";
    };
    i.addEventListener("change", show); i.addEventListener("blur", show);
    return { el, input: i, get: () => i.value.trim(), set: (v) => { i.value = v || ""; show(); }, validate: () => "" };
  };

  TIPOS.md = (f) => {
    const el = base(f, '<div class="w-toolbar" role="toolbar" aria-label="Formato">' +
      '<button type="button" data-md="bold" title="Negrita"><b>N</b></button>' +
      '<button type="button" data-md="italic" title="Cursiva"><i>C</i></button>' +
      '<button type="button" data-md="h2" title="Título de sección">Título</button>' +
      '<button type="button" data-md="list" title="Lista">• Lista</button>' +
      '<button type="button" data-md="quote" title="Cita">“ Cita</button>' +
      '<button type="button" data-md="link" title="Link">Link</button>' +
      '</div><textarea id="f-' + f.key + '" rows="' + (f.rows || 10) + '"></textarea>');
    const ta = $("textarea", el);
    $(".w-toolbar", el).addEventListener("click", (e) => {
      const b = e.target.closest("[data-md]"); if (!b) return;
      const a = ta.selectionStart, z = ta.selectionEnd, txt = ta.value.slice(a, z);
      let out = txt, cur = 0;
      const lineas = (pre) => (txt || "texto").split("\n").map((l) => pre + l).join("\n");
      switch (b.dataset.md) {
        case "bold": out = "**" + (txt || "texto") + "**"; break;
        case "italic": out = "*" + (txt || "texto") + "*"; break;
        case "h2": out = "\n## " + (txt || "Título") + "\n"; break;
        case "list": out = lineas("- "); break;
        case "quote": out = lineas("> "); break;
        case "link": {
          const url = prompt("Pega el link (https://…)", "https://");
          if (!url) return;
          out = "[" + (txt || "texto del link") + "](" + url.trim() + ")"; break;
        }
      }
      ta.setRangeText(out, a, z, "end");
      ta.focus();
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    });
    return { el, input: ta, get: () => ta.value.replace(/\s+$/, ""), set: (v) => (ta.value = v || ""), validate: () => (f.required && !ta.value.trim() ? "Este campo es obligatorio." : "") };
  };

  TIPOS.lineas = (f) => {
    const el = base(f, '<textarea id="f-' + f.key + '" rows="' + (f.rows || 4) + '" placeholder="' + esc(f.placeholder || "") + '" spellcheck="false"></textarea>');
    const ta = $("textarea", el);
    return {
      el, input: ta,
      get: () => ta.value.split("\n").map((l) => l.trim()).filter(Boolean).map(f.parse).filter(Boolean),
      set: (v) => (ta.value = (v || []).map(f.format).join("\n")),
      validate: () => {
        const malas = ta.value.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !f.parse(l));
        return malas.length ? "Revisa esta línea: “" + malas[0] + "”" : "";
      }
    };
  };

  TIPOS.grupo = (f, ctx) => {
    const el = document.createElement("details");
    el.className = "w-grupo";
    el.innerHTML = "<summary>" + esc(f.label) + "</summary>" + (f.hint ? '<p class="w-hint">' + f.hint + "</p>" : "");
    return { el, grupo: true };
  };

  /* ---------- descarga ---------- */
  function descargar(nombre, texto, tipo) {
    const blob = new Blob([texto], { type: tipo || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ================== WRITER ================== */
  window.CCDWriter = function (opts) {
    const root = $("#writer");
    const KEY = "ccd-writer-" + opts.tipo;
    const original = clone(window[opts.variable] || []);
    const ctx = { data: clone(original), editIndex: -1, onChange: () => programarVista() };
    let dirty = false;
    let campos = {};

    const ordenar = () => ctx.data.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
    ordenar();

    root.innerHTML =
      '<div class="w-banner" hidden></div>' +
      '<div class="w-layout">' +
      '<aside class="w-lista" aria-label="Lista">' +
      '<button type="button" class="w-btn w-btn--primario w-nuevo">+ ' + esc(opts.textos.nuevo) + "</button>" +
      '<input type="search" class="w-buscar" placeholder="Buscar…" aria-label="Buscar en la lista">' +
      '<ol class="w-items"></ol>' +
      '<button type="button" class="w-btn w-btn--sm w-btn--peligro w-borrar-ejemplos" hidden>Borrar los ejemplos</button>' +
      "</aside>" +
      '<section class="w-editor" aria-labelledby="w-editor-titulo">' +
      '<div class="w-editor-cabeza"><h2 id="w-editor-titulo"></h2><div class="w-editor-acciones">' +
      '<button type="button" class="w-btn w-btn--sm w-duplicar" hidden>Duplicar</button>' +
      '<button type="button" class="w-btn w-btn--sm w-btn--peligro w-eliminar" hidden>Eliminar</button></div></div>' +
      '<form class="w-form" novalidate></form>' +
      '<div class="w-guardar"><button type="button" class="w-btn w-btn--primario w-btn--grande w-ok">Guardar en la lista</button>' +
      '<button type="button" class="w-btn w-cancelar">Descartar cambios</button></div>' +
      "</section>" +
      '<section class="w-vista" aria-label="Vista previa"><h2>Vista previa</h2><div class="w-vista-tarjeta"></div><div class="w-vista-cuerpo"></div></section>' +
      "</div>" +
      '<div class="w-publicar">' +
      '<p class="w-estado" role="status"></p>' +
      '<div class="w-publicar-botones">' +
      '<button type="button" class="w-btn w-btn--primario w-descargar">Descargar ' + esc(opts.archivo) + "</button>" +
      '<button type="button" class="w-btn w-copiar">Copiar código</button>' +
      "</div></div>" +
      '<div class="w-toast" role="status" aria-live="polite"></div>';

    /* ---------- formulario ---------- */
    const form = $(".w-form", root);
    let destino = form;
    opts.campos.forEach((f) => {
      const c = TIPOS[f.type](f, ctx);
      if (c.grupo) { form.appendChild(c.el); destino = c.el; return; }
      if (f.finGrupo) destino = form;
      campos[f.key] = c; c.def = f;
      destino.appendChild(c.el);
      if (f.finDeGrupo) destino = form;
    });
    // título -> enlace automático
    const slugCampo = Object.values(campos).find((c) => c.def.type === "slug");
    if (slugCampo && campos[slugCampo.def.desde]) {
      campos[slugCampo.def.desde].input.addEventListener("input", (e) => slugCampo.auto(e.target.value));
    }
    form.addEventListener("input", () => { formSucio = true; programarVista(); });
    form.addEventListener("change", () => { formSucio = true; programarVista(); });
    form.addEventListener("submit", (e) => e.preventDefault());

    let formSucio = false;

    function leer() {
      const item = {};
      Object.entries(campos).forEach(([k, c]) => {
        const v = c.get();
        const vacio = v === "" || v == null || (Array.isArray(v) && !v.length) || v === false;
        if (!vacio || c.def.siempre) item[k] = v;
      });
      return item;
    }

    function cargar(item) {
      Object.entries(campos).forEach(([k, c]) => c.set(item[k]));
      $$(".w-error", form).forEach((e) => (e.hidden = true));
      $$(".w-campo", form).forEach((e) => e.classList.remove("tiene-error"));
      $$("details.w-grupo", form).forEach((d) => (d.open = Object.keys(item).some((k) => /_en$/.test(k) && item[k])));
      formSucio = false;
      programarVista();
    }

    function validar() {
      let primero = null;
      Object.values(campos).forEach((c) => {
        const msg = c.validate();
        const err = $(".w-error", c.el);
        if (err) { err.textContent = msg; err.hidden = !msg; }
        c.el.classList.toggle("tiene-error", !!msg);
        if (msg && !primero) primero = c;
      });
      if (primero) {
        const d = primero.el.closest("details"); if (d) d.open = true;
        (primero.input || primero.el).focus();
        primero.el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return !primero;
    }

    /* ---------- lista ---------- */
    function pintarLista() {
      const q = ($(".w-buscar", root).value || "").toLowerCase();
      $(".w-items", root).innerHTML = ctx.data.map((d, i) => ({ d, i }))
        .filter(({ d }) => !q || (d.titulo || "").toLowerCase().includes(q))
        .map(({ d, i }) => '<li><button type="button" data-i="' + i + '"' + (i === ctx.editIndex ? ' aria-current="true"' : "") + ">" +
          "<b>" + esc(d.titulo || "(sin título)") + "</b><span>" + esc(d.fecha || "") + (opts.extraLista ? " " + esc(opts.extraLista(d)) : "") + (d.ejemplo ? ' <em>ejemplo</em>' : "") + "</span></button></li>").join("") ||
        '<li class="w-vacio">' + (ctx.data.length ? "Nada coincide con la búsqueda." : "Todavía no hay nada. Empieza con el botón de arriba.") + "</li>";
      $(".w-borrar-ejemplos", root).hidden = !ctx.data.some((d) => d.ejemplo);
    }
    $(".w-buscar", root).addEventListener("input", pintarLista);
    $(".w-items", root).addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]"); if (!b) return;
      if (formSucio && !confirm("Tienes cambios sin guardar en el formulario. ¿Abrir otro de todas formas?")) return;
      editar(Number(b.dataset.i));
    });

    function editar(i) {
      ctx.editIndex = i;
      const item = i >= 0 ? ctx.data[i] : opts.nuevo(ctx.data);
      $("#w-editor-titulo").textContent = i >= 0 ? "Editando: " + (item.titulo || "") : opts.textos.nuevo;
      $(".w-duplicar", root).hidden = i < 0;
      $(".w-eliminar", root).hidden = i < 0;
      $(".w-ok", root).textContent = i >= 0 ? "Guardar cambios" : "Agregar a la lista";
      cargar(item);
      pintarLista();
      // si la persona editó un ejemplo, ya no es ejemplo
      ctx.editandoEjemplo = i >= 0 && !!item.ejemplo;
    }

    /* ---------- guardar ---------- */
    $(".w-ok", root).addEventListener("click", () => {
      if (!validar()) { toast("Revisa los campos marcados en rojo."); return; }
      const item = leer();
      if (opts.limpiar) opts.limpiar(item);
      // Hora en que se agregó por primera vez: el feed la usa para que el correo
      // del boletín sepa que es nuevo aunque se publique tarde en el día.
      const previo = ctx.editIndex >= 0 ? ctx.data[ctx.editIndex] : null;
      item.publicado = (previo && previo.publicado) || new Date().toISOString();
      if (ctx.editIndex >= 0) {
        if (ctx.editandoEjemplo && !confirm("Este era un ejemplo. ¿Quieres convertirlo en contenido real? (Se quitará la marca de ejemplo)")) item.ejemplo = true;
        ctx.data[ctx.editIndex] = item;
      } else ctx.data.push(item);
      ordenar();
      ctx.editIndex = ctx.data.indexOf(item);
      marcarSucio();
      editar(ctx.editIndex);
      toast("Guardado en la lista. Recuerda descargar " + opts.archivo + " para publicarlo.");
    });
    $(".w-cancelar", root).addEventListener("click", () => {
      if (formSucio && !confirm("¿Descartar lo que escribiste en el formulario?")) return;
      editar(ctx.editIndex);
    });
    $(".w-nuevo", root).addEventListener("click", () => {
      if (formSucio && !confirm("Tienes cambios sin guardar en el formulario. ¿Empezar uno nuevo?")) return;
      editar(-1);
      const first = form.querySelector("input, textarea, select"); if (first) first.focus();
    });
    $(".w-duplicar", root).addEventListener("click", () => {
      const copia = clone(ctx.data[ctx.editIndex]);
      copia.id = copia.id + "-copia"; copia.titulo = copia.titulo + " (copia)"; delete copia.ejemplo;
      ctx.editIndex = -1;
      $("#w-editor-titulo").textContent = opts.textos.nuevo + " (copia)";
      $(".w-ok", root).textContent = "Agregar a la lista";
      $(".w-duplicar", root).hidden = true; $(".w-eliminar", root).hidden = true;
      cargar(copia); campos.id && campos.id.set(copia.id);
      formSucio = true;
      pintarLista();
    });
    $(".w-eliminar", root).addEventListener("click", () => {
      const d = ctx.data[ctx.editIndex];
      if (!confirm("¿Eliminar “" + d.titulo + "”? Desaparecerá del sitio cuando subas el archivo nuevo.")) return;
      ctx.data.splice(ctx.editIndex, 1);
      marcarSucio(); editar(-1);
      toast("Eliminado de la lista.");
    });
    $(".w-borrar-ejemplos", root).addEventListener("click", () => {
      const n = ctx.data.filter((d) => d.ejemplo).length;
      if (!confirm("¿Borrar los " + n + " ejemplos? Lo que hayas creado tú no se toca.")) return;
      ctx.data = ctx.data.filter((d) => !d.ejemplo);
      marcarSucio(); editar(-1);
      toast("Ejemplos borrados.");
    });

    /* ---------- vista previa ---------- */
    let tVista = null;
    function programarVista() { clearTimeout(tVista); tVista = setTimeout(vista, 120); }
    function vista() {
      const item = Object.assign({ id: "vista-previa", fecha: hoy() }, leer());
      try {
        $(".w-vista-tarjeta", root).innerHTML = opts.tarjeta(item);
        $(".w-vista-cuerpo", root).innerHTML = opts.cuerpo ? opts.cuerpo(item) : "";
      } catch (e) { $(".w-vista-tarjeta", root).textContent = "No se pudo mostrar la vista previa."; }
      $$("a", $(".w-vista", root)).forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
    }

    /* ---------- estado / borrador ---------- */
    function marcarSucio() {
      dirty = true;
      store(KEY, JSON.stringify({ guardado: Date.now(), data: ctx.data }));
      estado();
      pintarLista();
    }
    function estado() {
      const st = $(".w-estado", root);
      st.innerHTML = dirty
        ? "<b>Tienes cambios sin descargar.</b> Descarga <code>" + esc(opts.archivo) + "</code> y reemplázalo en <code>data/</code>."
        : "Todo al día con el archivo <code>data/" + esc(opts.archivo) + "</code> (" + ctx.data.length + " en total).";
      $(".w-publicar", root).classList.toggle("is-sucio", dirty);
    }
    window.addEventListener("beforeunload", (e) => { if (dirty || formSucio) { e.preventDefault(); e.returnValue = ""; } });

    const borrador = (() => { try { return JSON.parse(store(KEY) || "null"); } catch (e) { return null; } })();
    if (borrador && JSON.stringify(borrador.data) !== JSON.stringify(ctx.data)) {
      const b = $(".w-banner", root);
      b.hidden = false;
      b.innerHTML = "<p><b>Encontré cambios que no se descargaron</b> (del " + new Date(borrador.guardado).toLocaleString("es-DO") + "). ¿Los recupero?</p>" +
        '<div><button type="button" class="w-btn w-btn--primario" data-r="si">Recuperar</button> <button type="button" class="w-btn" data-r="no">Descartar</button></div>';
      b.addEventListener("click", (e) => {
        const r = e.target.closest("[data-r]"); if (!r) return;
        if (r.dataset.r === "si") { ctx.data = borrador.data; ordenar(); dirty = true; estado(); editar(-1); toast("Cambios recuperados."); }
        else store(KEY, null);
        b.hidden = true;
      });
    }

    /* ---------- archivos ---------- */
    function codigo() {
      ordenar();
      return opts.cabecera + "window." + opts.variable + " = " + JSON.stringify(ctx.data, null, 2) + ";\n";
    }
    $(".w-descargar", root).addEventListener("click", () => {
      if (formSucio && !confirm("El formulario tiene cambios que no guardaste en la lista. ¿Descargar sin ellos?")) return;
      descargar(opts.archivo, codigo(), "text/javascript;charset=utf-8");
      dirty = false; store(KEY, null); estado();
      toast("Descargado. Ponlo en la carpeta data/ del sitio, reemplazando el anterior.");
    });
    $(".w-copiar", root).addEventListener("click", () => {
      const txt = codigo();
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
        () => toast("Código copiado. Pégalo en data/" + opts.archivo + " reemplazando todo."),
        () => { descargar(opts.archivo, txt); toast("No pude copiar, así que lo descargué."); }
      );
    });

    let tToast;
    function toast(msg) {
      const t = $(".w-toast", root);
      t.textContent = msg; t.classList.add("is-on");
      clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove("is-on"), 4200);
    }

    estado();
    editar(-1);
  };

  window.CCDWriter.youtubeId = youtubeId;
  window.CCDWriter.spotifyId = spotifyId;
  window.CCDWriter.slugify = slugify;
})();
