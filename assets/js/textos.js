/* ==========================================================================
   Textos que usa JavaScript: filtros, búsquedas, tarjetas, la página de cada
   artículo y episodio, mensajes de los formularios, la ventanita del
   newsletter, los comentarios y la burbuja "Invítanos un café".

   Los textos fijos de cada página NO están aquí: están en su archivo .html
   (index.html, nosotros.html, contacto.html…). El encabezado, el pie y el
   bloque del newsletter están en la carpeta partes/.
   ========================================================================== */

window.CCD_TEXTOS = {
  // Migas (el camino de links arriba de un artículo o episodio)
  "nav.enportada": "En Portada",
  "nav.episodios": "Episodios",

  // Inicio: la etiqueta del artículo destacado
  "hero.destacado": "Destacado",

  // En redes (sección opcional de Inicio): tarjetas de seguir
  "redes.ig.seguir": "Seguir en Instagram",
  "redes.ig.vacio": "Fotos, clips y behind the scenes.",
  "redes.tt.seguir": "Ver en TikTok",
  "redes.tt.vacio": "Clips cortos y momentos que no te puedes perder.",
  "redes.video": "Video",
  "redes.carrusel": "Varias fotos",

  // En Portada (antes "Explorar")
  "exp.titulo": "En Portada",
  "exp.todo": "Todo",
  "exp.secciones": "Secciones",
  "exp.buscar": "Buscar por título, persona o tema",
  "exp.idioma": "Idioma",
  "exp.idioma.todos": "Todos",
  "exp.idioma.es": "Español",
  "exp.idioma.en": "English",
  "exp.vacio": "No encontramos publicaciones con esos filtros.",
  "exp.resultados": "publicaciones",
  "exp.resultado": "publicación",
  "exp.vermas": "Ver más publicaciones",
  "exp.lectura": "min de lectura",

  // Episodios (el archivo del podcast)
  "temas.todos": "Todos",
  "temas.label": "Filtrar por tema",
  "ep.episodio": "Episodio",
  "ep.capitulo": "Capítulo",
  "ep.momentos": "Timestamps",
  "ep.notas": "Show notes",
  "ep.invitados": "En la mesa",
  "ep.relacionados": "Si te gustó este, sigue con",
  "ep.anterior": "Episodio anterior",
  "ep.siguiente": "Episodio siguiente",
  "ep.noencontrado": "No encontramos ese episodio.",
  "ep.noencontrado.sub": "Puede que el link haya cambiado. Mira el archivo completo de episodios.",
  "ep.ejemplo": "Ejemplo",
  "ep.nuevo": "Nuevo",
  "ep.verYoutube": "Ver en YouTube",
  "ep.escucharSpotify": "Escuchar en Spotify",
  "lista.titulo": "Episodios",
  "lista.buscar": "Buscar por título, invitado o tema",
  "lista.serie": "Serie",
  "lista.serie.todas": "Todas",
  "lista.orden": "Orden",
  "lista.orden.nuevos": "Más recientes",
  "lista.orden.viejos": "Más antiguos",
  "lista.vacio": "Ningún episodio coincide con esa búsqueda.",
  "lista.limpiar": "Quitar filtros",
  "lista.resultados": "episodios",
  "lista.resultado": "episodio",

  // Sobremesa
  "sob.titulo": "Sobremesa",
  "sob.por": "Por",
  "sob.vacio": "Todavía no hay posts con ese tema.",

  // Tienda (los productos salen de Fourthwall)
  "tienda.cargando": "Sirviendo la tienda…",
  "tienda.vacio": "Todavía no hay productos. Muy pronto.",
  "tienda.error": "No pudimos cargar los productos ahora mismo.",
  "tienda.ir": "Ver la tienda completa",
  "tienda.desde": "Desde",
  "tienda.agotado": "Agotado",
  "tienda.oferta": "Oferta",
  "tienda.ver": "Ver producto",

  // Artículo (entrada.html)
  "art.personas": "En esta historia",
  "art.relacionado": "Escucha el episodio",
  "art.sigue": "Sigue leyendo",
  // Artículo: la columna de al lado y el cierre
  "art.mas": "Más de Café Con Dos",
  "art.relacionados": "Artículos relacionados",
  "art.bol.titulo": "Suscríbete a nuestro newsletter",
  "art.bol.sub": "Historias, entrevistas y recomendaciones, directo a tu bandeja de entrada.",
  "art.bol.email": "Tu correo electrónico",
  "art.comparte": "Comparte este artículo",
  "art.fotografia": "Fotografía",
  "art.conversemos": "Sigamos conversando",
  "art.piensas": "¿Y tú qué piensas?",
  "art.opinion": "Nos encantaría leer tu opinión. Cuéntanos en los comentarios.",
  "art.otro": "Un café lleva a otro.",
  "art.otro.sub": "Descubre otra lectura de Café Con Dos.",
  "art.cafe": "¿Te gustó? Invítanos un café.",
  "art.cafe.sub": "Cada café nos ayuda a seguir contando historias.",
  "art.noencontrado": "No encontramos ese post.",
  "art.volver": "Volver a En Portada",

  // Contacto: mensajes del formulario
  "con.faltaNombre": "Escribe tu nombre.",
  "con.faltaMensaje": "Escribe tu mensaje.",
  "con.enviando": "Enviando…",
  "con.ok": "Mensaje enviado. Gracias por escribir.",
  "con.error": "No se pudo enviar el mensaje. Prueba de nuevo o escríbenos por Instagram.",
  "con.sinform": "El formulario todavía no está conectado. Mientras tanto, escríbenos por Instagram.",

  // Newsletter: la ventanita de Inicio y los mensajes del formulario
  "bol.sub": "Te llega un email cuando publicamos algo nuevo: historias, opiniones, Sobremesa o un episodio. Cero spam.",
  "bol.nombre": "Nombre",
  "bol.email": "Email",
  "bol.enviar": "Suscribirme",
  "bol.enviando": "Suscribiendo…",
  "bol.ok": "¡Listo, ya estás en la lista! Te escribimos cuando haya algo nuevo.",
  "bol.error": "No se pudo completar la suscripción. Revisa el email e inténtalo otra vez.",
  "bol.invalido": "Escribe un email válido, por ejemplo nombre@gmail.com.",
  "bol.prueba": "Modo prueba: el formulario aún no está conectado a Brevo, así que no se guardó el email.",
  "bol.popup.titulo": "¿Te servimos lo próximo?",
  "bol.popup.cerrar": "Ahora no",

  // Comentarios
  "com.titulo": "Comentarios",
  "com.cargando": "Cargando comentarios…",
  "com.vacio": "Todavía no hay comentarios. Deja el primero.",
  "com.errorCarga": "No se pudieron cargar los comentarios. Recarga la página para intentarlo otra vez.",
  "com.nombre": "Tu nombre",
  "com.texto": "Tu comentario",
  "com.nota": "Los comentarios se publican al momento con el nombre que escribas. Café Con Dos puede borrar los que falten el respeto.",
  "com.enviar": "Publicar comentario",
  "com.enviando": "Publicando…",
  "com.ok": "Comentario publicado. ¡Gracias por sumarte a la conversación!",
  "com.error": "No se pudo publicar el comentario. Revisa tu conexión e inténtalo otra vez.",
  "com.faltan": "Escribe tu nombre y un comentario.",
  "com.espera": "Espera unos segundos antes de publicar otro comentario.",
  "com.ahora": "Ahora mismo",
  "com.cerrar": "Cerrar comentarios",
  "com.uno": "1 comentario",
  "com.varios": "comentarios",

  // Burbuja "Invítanos un café"
  "art.apoyo": "Si te gusta este contenido, no olvides comentar y apóyanos con un café.",
  "art.apoyo.comentar": "Dejar un comentario",
  "art.apoyo.cafe": "Invítanos un café",
  "apoyo.titulo": "Invítanos un café",
  "apoyo.aviso": "¿Te gusta Café Con Dos? Invítanos un café.",
  "apoyo.nos": "Apóyanos",
  "apoyo.nos.sub": "Cada café ayuda a que sigamos contando historias.",
  "apoyo.dev": "Apoya a nuestro developer",
  "apoyo.cerrar": "Cerrar",

  // Compartir y otros
  "comp.titulo": "Compartir",
  "comp.copiar": "Copiar link",
  "comp.copiado": "Link copiado",
  "comp.mas": "Más opciones para compartir",
  "fecha.locale": "es-DO"
};