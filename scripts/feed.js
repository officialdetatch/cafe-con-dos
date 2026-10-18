/* ==========================================================================
   Genera feed.xml (RSS) y sitemap.xml a partir de los artículos y episodios.
   - feed.xml es lo que lee el servicio de email (Brevo / Mailchimp / etc.)
     para avisar a los suscriptores de cada publicación nueva.
   - sitemap.xml ayuda a Google a encontrar todas las páginas.
   Los elementos marcados como "ejemplo" NUNCA salen en el feed ni el sitemap.
   ========================================================================== */
(function (root) {
  "use strict";

  const x = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
  const DIAS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Fecha de publicación para el feed: las 6:00 am (hora de RD) del día elegido,
  // o la hora real en que se agregó en el writer si fue más tarde ESE MISMO día.
  // Así Brevo cuenta como nuevo lo que se sube de noche, pero un episodio viejo
  // que se agrega hoy con su fecha original no se manda como si fuera nuevo.
  function cuando(x) {
    const base = new Date((x.fecha || "1970-01-01") + "T10:00:00Z"); // 6:00 am en RD (UTC-4)
    const real = x.publicado ? new Date(x.publicado) : null;
    const mismoDia = real && !isNaN(real) && real > base && real - base < 18 * 60 * 60 * 1000; // hasta las 11:59 pm en RD
    return mismoDia ? real : base;
  }
  function rfc822(iso) {
    const d = iso instanceof Date ? iso : new Date((iso || "1970-01-01") + "T10:00:00Z");
    const p = (n) => String(n).padStart(2, "0");
    return DIAS[d.getUTCDay()] + ", " + p(d.getUTCDate()) + " " + MESES[d.getUTCMonth()] + " " + d.getUTCFullYear() + " " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":00 +0000";
  }
  const hoy = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  // Mismo momento que en el sitio: el día de su fecha a las 6:00 am en RD (10:00 UTC).
  const publicables = (arr) => (arr || []).filter((e) => !e.ejemplo && e.fecha && Date.parse(e.fecha + "T10:00:00Z") <= Date.now());

  function temaNombre(cfg, id) {
    const t = (cfg.temas || []).find((z) => z.id === id);
    return t ? (t.nombre || t.es || id) : id;
  }

  const seccionNombre = (cfg, id) => ((cfg.secciones || []).find((s) => s.id === id) || {}).nombre || "";

  function buildFeed(cfg, episodios, entradas) {
    const site = String(cfg.siteUrl || "").replace(/\/$/, "");
    const items = [];
    publicables(episodios).forEach((e) => {
      const img = e.portada ? site + "/" + e.portada : e.youtube ? "https://i.ytimg.com/vi/" + e.youtube + "/hqdefault.jpg" : "";
      items.push({
        fecha: cuando(e),
        xml:
          "    <item>\n" +
          "      <title>" + x(e.titulo) + "</title>\n" +
          "      <link>" + x(site + "/episodio.html?id=" + encodeURIComponent(e.id)) + "</link>\n" +
          '      <guid isPermaLink="false">ccd-episodio-' + x(e.id) + "</guid>\n" +
          "      <pubDate>" + rfc822(cuando(e)) + "</pubDate>\n" +
          "      <description>" + x(e.resumen || "") + "</description>\n" +
          (e.temas || []).map((t) => "      <category>" + x(temaNombre(cfg, t)) + "</category>\n").join("") +
          (img ? '      <media:content url="' + x(img) + '" medium="image" />\n      <enclosure url="' + x(img) + '" type="image/jpeg" length="0" />\n' : "") +
          "    </item>\n"
      });
    });
    publicables(entradas).forEach((p) => {
      const img = p.portada ? (/^https?:/.test(p.portada) ? p.portada : site + "/" + p.portada) : "";
      const sob = (p.seccion || "sobremesa") === "sobremesa";
      const seccion = seccionNombre(cfg, p.seccion || "sobremesa");
      items.push({
        fecha: cuando(p),
        xml:
          "    <item>\n" +
          "      <title>" + x((sob ? "Sobremesa: " : "") + p.titulo) + "</title>\n" +
          "      <link>" + x(site + "/entrada.html?id=" + encodeURIComponent(p.id)) + "</link>\n" +
          '      <guid isPermaLink="false">ccd-' + (sob ? "sobremesa" : "articulo") + "-" + x(p.id) + "</guid>\n" +
          "      <pubDate>" + rfc822(cuando(p)) + "</pubDate>\n" +
          "      <description>" + x(p.resumen || "") + "</description>\n" +
          (seccion ? "      <category>" + x(seccion) + "</category>\n" : "") +
          (p.temas || []).map((t) => "      <category>" + x(temaNombre(cfg, t)) + "</category>\n").join("") +
          (img ? '      <media:content url="' + x(img) + '" medium="image" />\n' : "") +
          "    </item>\n"
      });
    });
    items.sort((a, b) => b.fecha - a.fecha);
    const texto = (v) => (v && typeof v === "object" ? v.es : v) || "";
    const lema = texto(cfg.lema);
    const desc = texto(cfg.descripcion);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">\n' +
      "  <channel>\n" +
      "    <title>" + x(cfg.nombre || "Café Con Dos") + "</title>\n" +
      "    <link>" + x(site + "/") + "</link>\n" +
      '    <atom:link href="' + x(site + "/feed.xml") + '" rel="self" type="application/rss+xml" />\n' +
      "    <description>" + x((lema + " " + desc).trim()) + "</description>\n" +
      "    <language>es</language>\n" +
      "    <lastBuildDate>" + rfc822(hoy()) + "</lastBuildDate>\n" +
      "    <image><url>" + x(site + "/images/og-cafe-con-dos.jpg") + "</url><title>" + x(cfg.nombre || "Café Con Dos") + "</title><link>" + x(site + "/") + "</link></image>\n" +
      items.map((i) => i.xml).join("") +
      "  </channel>\n</rss>\n";
  }

  function buildSitemap(cfg, episodios, entradas) {
    const site = String(cfg.siteUrl || "").replace(/\/$/, "");
    const urls = [
      ["/", hoy()], ["/enportada.html", hoy()], ["/episodios.html", hoy()], ["/sobremesa.html", hoy()], ["/nosotros.html"], ["/contacto.html"]
    ];
    publicables(episodios).forEach((e) => urls.push(["/episodio.html?id=" + encodeURIComponent(e.id), e.fecha]));
    publicables(entradas).forEach((p) => urls.push(["/entrada.html?id=" + encodeURIComponent(p.id), p.fecha]));
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(([u, d]) => "  <url><loc>" + x(site + u) + "</loc>" + (d ? "<lastmod>" + d + "</lastmod>" : "") + "</url>\n").join("") +
      "</urlset>\n";
  }

  root.CCD_FEED = { buildFeed, buildSitemap, cuando };
  if (typeof module !== "undefined") module.exports = root.CCD_FEED;
})(typeof window !== "undefined" ? window : globalThis);
