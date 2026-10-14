/* ==========================================================================
   CAFÉ CON DOS — Configuración del sitio
   --------------------------------------------------------------------------
   Este es el único archivo que hace falta tocar para cambiar links,
   secciones, temas, series, la host y los servicios (newsletter, contacto,
   comentarios, redes). Los artículos y los episodios NO van aquí:
   los artículos se escriben en el editor de Sanity (ver "sanity" abajo)
   y los episodios con writers/episodio-writer.html.
   ========================================================================== */

window.CCD_CONFIG = {
  nombre: "Café Con Dos",
  categoria: "Plataforma independiente",

  // Dominio final del sitio (sin "/" al final). Se usa para feed.xml,
  // sitemap.xml y los links para compartir. CÁMBIALO cuando tengas dominio.
  siteUrl: "https://cafecondos.com",

  // El lema va en inglés a propósito (así lo usa la marca).
  lema: "Stories worth discovering. Perspectives worth sharing.",
  // Descripción oficial (Nosotros, portada, Google y el feed).
  descripcion: "Café Con Dos es una plataforma independiente que explora la cultura, la creatividad, las personas y las ideas a través de historias, conversaciones y nuevas perspectivas.",
  descripcionLarga: "Desde creadores emergentes y descubrimientos culturales hasta opiniones y curiosidades cotidianas, abrimos espacio para voces que merecen ser escuchadas e historias que vale la pena compartir.",
  descripcionCierre: "Con las conversaciones como punto de partida y la curiosidad como motor, Café Con Dos es un lugar para descubrir y encontrarnos en distintas perspectivas.",
  descripcionCorta: "Una plataforma independiente para descubrir historias, explorar perspectivas y conectar a través de la cultura.",

  redes: {
    instagram: "https://www.instagram.com/cafecondos",
    youtube: "https://www.youtube.com/@Caf%C3%A9ConDos",
    spotify: "https://open.spotify.com/show/6z0g9lFACFnK2sxIhj7EOn",
    tiktok: "https://www.tiktok.com/@cafecondos",
    discord: "" // déjalo vacío para que no aparezca
  },

  // El reproductor de "Del archivo" en la portada muestra los videos del canal,
  // aunque todavía no hayas cargado episodios en el writer.
  youtubeCanalId: "UCPRbU8H8o3t6AbEBQMLCSkA",

  // Quién está detrás (sale en "Nosotros" y como autora de los artículos).
  // Puedes agregar más personas copiando el bloque { ... }.
  hosts: [
    {
      id: "allie",
      nombre: "Allie Tolentino",
      rol: "Host y creadora",
      foto: "", // ej: "images/allie.jpg" — si está vacío se usa la taza
      bio: "Escribe aquí una bio corta y en primera persona: quién eres, por qué empezaste Café Con Dos y hacia dónde va la plataforma.",
      instagram: "https://www.instagram.com/cafecondos"
    }
  ],

  // Secciones de Explorar. Cada artículo va en una (se elige en el writer).
  //   nombre: como sale en Explorar y en el artículo
  //   corto:  la etiqueta de las tarjetas de la portada
  //   descripcion: sale en Explorar al elegir la sección y en "Nosotros"
  //   frase y cta: el texto de su tarjeta en "Empieza a explorar" (portada)
  // Sobremesa es una sección más, pero también tiene su propia página.
  // Si cambias un id, los artículos que ya lo usan dejan de encontrarlo.
  secciones: [
    { id: "historias", nombre: "Historias y entrevistas", corto: "Personas",
      descripcion: "Perfiles de creadores, historias personales y conversaciones que muestran lo que pasa detrás del trabajo.",
      frase: "Conoce las voces que están marcando lo que viene.", cta: "Explorar perfiles" },
    { id: "cultura", nombre: "Cultura y descubrimientos", corto: "Cultura",
      descripcion: "Entretenimiento, tendencias, proyectos creativos y temas que vale la pena explorar.",
      frase: "Descubre algo que no sabías que necesitabas.", cta: "Explorar cultura" },
    { id: "opiniones", nombre: "Opiniones y perspectivas", corto: "Perspectivas",
      descripcion: "Miradas pensadas sobre temas culturales y cotidianos que invitan a reflexionar y a conversar.",
      frase: "Siempre hay más en la historia.", cta: "Leer opiniones" },
    { id: "sobremesa", nombre: "Sobremesa", corto: "Sobremesa",
      descripcion: "Las conversaciones más personales, las reflexiones y el contenido más libre.",
      frase: "Lo que se queda conversando cuando ya nadie se levanta.", cta: "Leer la Sobremesa" }
  ],

  // Temas (los "tags"). Sirven para filtrar en Explorar, Sobremesa y Episodios.
  // El id no lleva tildes ni espacios.
  temas: [
    { id: "arte", nombre: "Arte" },
    { id: "musica", nombre: "Música" },
    { id: "cine-tv", nombre: "Cine y TV" },
    { id: "cultura", nombre: "Cultura" },
    { id: "creatividad", nombre: "Creatividad" },
    { id: "tendencias", nombre: "Tendencias" },
    { id: "emprender", nombre: "Emprender" },
    { id: "bienestar", nombre: "Bienestar" },
    { id: "relaciones", nombre: "Relaciones" },
    { id: "vida", nombre: "La vida misma" }
  ],

  // Series. Un episodio puede ser parte de una serie (se elige en el writer).
  // Sale como etiqueta en sus tarjetas y como filtro en el archivo de episodios.
  series: [
    {
      id: "entre-elementos",
      nombre: "Entre Elementos",
      descripcion: "La serie que puso a Café Con Dos en boca de todos."
    }
  ],

  /* Newsletter "Café para llevar" (Brevo)
     1. En Brevo crea un formulario de suscripción (Contactos > Formularios).
     2. En el código HTML del formulario, copia el valor de action="..." y
        pégalo abajo en action.
     Mientras action esté vacío, el formulario funciona en "modo prueba". */
  boletin: {
    action: "",
    campoEmail: "EMAIL",
    campoNombre: "FIRSTNAME",
    popupEnInicio: true,    // ventanita de suscripción en la portada
    popupSegundos: 25
  },

  /* Contacto
     Pega aquí el endpoint de Formspree (https://formspree.io).
     Si está vacío y hay email, el formulario abre el email de la persona. */
  contacto: {
    action: "",
    email: ""
  },

  /* Sección "En redes" de la portada (feed de Instagram + perfil de TikTok)
     Está apagada (mostrar: false) porque no está en el diseño nuevo de la
     portada. Cámbiala a true para que salga después de "Del archivo".
     Instagram: crea una cuenta gratis en https://behold.so, conecta el
     Instagram de Café Con Dos, crea un "JSON feed" y pega aquí su link
     (se ve así: https://feeds.behold.so/XXXXXXXX). Mientras esté vacío,
     sale una tarjeta para seguir la cuenta.
     TikTok: usa el embed oficial; solo hace falta el usuario (sin @). */
  enRedes: {
    mostrar: false,
    instagramFeed: "",
    instagramPosts: 6,
    tiktokUsuario: "cafecondos"
  },

  /* Editor de artículos (Sanity) — README, sección "Editor de artículos".
     projectId: el Project ID de sanity.io/manage (no es secreto).
     Mientras esté vacío, los artículos salen solo de data/articulos.js.
     studioAppId: el appId que da "npm run deploy" la primera vez que se
     publica el editor (solo hace falta para publicarlo desde GitHub).
     Las secciones, temas y hosts del editor salen de este mismo archivo. */
  sanity: {
    projectId: "7gf9cz2j",
    dataset: "production",
    studioAppId: "bicoxvy3233wgvjovxiv7gf4"
  },

  /* Comentarios en los artículos y posts de la Sobremesa (Firebase / Firestore)
     1. En https://console.firebase.google.com crea un proyecto para
        Café Con Dos y agrega una "Web app". Copia aquí los valores de firebaseConfig.
     2. Activa Firestore Database.
     3. En Firestore > Reglas pega lo que está en firestore.rules.
     Mientras projectId esté vacío, la sección de comentarios no aparece.
     Para borrar un comentario: Firestore > ccd_comentarios > el documento > Eliminar. */
  comentarios: {
    activo: true,
    coleccion: "ccd_comentarios",
    firebase: {
      apiKey: "",
      authDomain: "",
      projectId: "",
      appId: ""
    }
  },

  /* Burbuja flotante "Invítanos un café" (abajo a la derecha, en todas las páginas)
     cafeConDos: el link de Buy Me a Coffee de Café Con Dos. Mientras esté
                 vacío, esa opción no aparece.
     developer:  el link del developer del sitio.
     avisoSegundos: a los cuántos segundos sale el globito de aviso (una vez
                 cada 7 días por visitante). 0 = sin aviso. */
  apoyo: {
    mostrar: true,
    cafeConDos: "",
    developer: "https://buymeacoffee.com/cmramirez.dev",
    avisoSegundos: 15
  }
};
