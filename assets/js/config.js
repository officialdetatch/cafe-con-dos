/* ==========================================================================
   CAFÉ CON DOS — Configuración del sitio
   --------------------------------------------------------------------------
   Ajustes que usan el sitio, el feed, el editor (Sanity) y los writers:
   secciones, temas, series, la host como autora y los servicios
   (newsletter, contacto, comentarios, redes, editor).

   Los TEXTOS de las páginas no están aquí: están en cada .html, y el
   encabezado, el pie y el newsletter en la carpeta partes/ (README,
   "Cómo editar el sitio"). Los artículos se escriben en el editor de Sanity
   y los episodios con writers/episodio-writer.html.
   ========================================================================== */

window.CCD_CONFIG = {
  nombre: "Café Con Dos",

  // Dominio del sitio (sin "/" al final). Se usa para feed.xml, sitemap.xml,
  // los links para compartir y el botón "Ver en la página" del editor.
  siteUrl: "https://cafecondos.com",

  // Lema y descripción del feed (lo que leen Brevo y las apps de RSS).
  // En las páginas están escritos en cada .html.
  lema: "Stories worth discovering. Perspectives worth sharing.",
  descripcion: "Café Con Dos es una plataforma independiente que explora la cultura, la creatividad, las personas y las ideas a través de historias, conversaciones y nuevas perspectivas.",

  // Redes: las usan los botones de cada episodio y la sección "En redes".
  // Los íconos del pie, de Contacto y de Inicio tienen sus links escritos en
  // partes/pie.html, contacto.html e index.html.
  redes: {
    instagram: "https://www.instagram.com/cafecondos",
    youtube: "https://www.youtube.com/@Caf%C3%A9ConDos",
    spotify: "https://open.spotify.com/show/6z0g9lFACFnK2sxIhj7EOn",
    tiktok: "https://www.tiktok.com/@cafecondos",
    discord: "" // déjalo vacío para que no aparezca
  },

  // Quién escribe en Café Con Dos. Cada artículo se firma con una de estas personas
  // (se elige en el editor, en "Escrito por") y sale con su foto, nombre y rol.
  // Su bio de "Nosotros" está en nosotros.html.
  //   id:     sin tildes ni espacios. NO lo cambies después: los artículos lo guardan.
  //   nombre: como sale firmado
  //   rol:    lo que sale debajo del nombre
  //   foto:   ej: "images/autores/sarah.jpg" (cuadrada se ve mejor). Vacío = la taza.
  // Para sumar a alguien: copia un bloque { … }, ponle coma y cambia los datos.
  // La primera persona de la lista es la que firma los artículos viejos que no
  // tienen autora, así que déjala de primera.
  hosts: [
    {
      id: "allie",
      nombre: "Allie Tolentino",
      rol: "Editorial Director",
      foto: "" // ej: "images/autores/allie.jpg"
    },
    {
      id: "sarah",
      nombre: "Sarah Espaillat", // agrégale el apellido si quieres
      rol: "Columnist",
      foto: "" // ej: "images/autores/sarah.jpg"
    }
    // , { id: "otra", nombre: "Nombre Apellido", rol: "Columnista", foto: "" }
  ],

  // Secciones de Explorar. Cada artículo va en una (se elige en el editor).
  //   nombre: como sale en Explorar, en el artículo y en el editor
  //   corto:  la etiqueta del bloque de color de un artículo sin foto
  //   descripcion: sale en Explorar al elegir la sección
  // Sobremesa es una sección más, pero también tiene su propia página.
  // Si cambias un id, los artículos que ya lo usan dejan de encontrarlo.
  // (Las tarjetas de "Empieza a explorar" de Inicio están en index.html.)
  secciones: [
    { id: "historias", nombre: "Historias y entrevistas", corto: "Personas",
      descripcion: "Perfiles de creadores, historias personales y conversaciones que muestran lo que pasa detrás del trabajo." },
    { id: "cultura", nombre: "Cultura y descubrimientos", corto: "Cultura",
      descripcion: "Entretenimiento, tendencias, proyectos creativos y temas que vale la pena explorar." },
    { id: "opiniones", nombre: "Opiniones y perspectivas", corto: "Perspectivas",
      descripcion: "Miradas pensadas sobre temas culturales y cotidianos que invitan a reflexionar y a conversar." },
    { id: "sobremesa", nombre: "Sobremesa", corto: "Sobremesa",
      descripcion: "Las conversaciones más personales, las reflexiones y el contenido más libre." }
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
    action: "https://07526b8f.sibforms.com/serve/MUIFAE7pfQpeuqqSa3A840dp59Ho7wv_eP2g4TX3F6-fPjX-71I1yYogk6nADwFSNcL4c5eE5FGay1w2JFWeFHPSqxnDyxXVYB6uCqKZrt0ZzJqUfXGWnJoMdjMaNYUM_tg8hZCCoqQAeldcFzhiSd499ugg1-oBT9E1G_DPlkf_2KayDWHd8dBcE7woCL3-7umoqnSB7ccVeuJF8A==",
    campoEmail: "EMAIL",
    campoNombre: "FIRSTNAME",
    popupEnInicio: true,    // ventanita de suscripción en Inicio
    popupSegundos: 25
  },

  /* Contacto
     Pega aquí el endpoint de Formspree (https://formspree.io).
     Si está vacío y hay email, el formulario abre el email de la persona. */
  contacto: {
    action: "https://formspree.io/f/meaenyqr",
    email: "colaboraciones@cafecondos.com"
  },

  /* Sección "En redes" de Inicio (feed de Instagram + perfil de TikTok)
     Está apagada: para mostrarla, quítale la palabra hidden a la sección
     id="en-redes" en index.html.
     Instagram: crea una cuenta gratis en https://behold.so, conecta el
     Instagram de Café Con Dos, crea un "JSON feed" y pega aquí su link
     (se ve así: https://feeds.behold.so/XXXXXXXX). Mientras esté vacío,
     sale una tarjeta para seguir la cuenta.
     TikTok: usa el embed oficial; solo hace falta el usuario (sin @). */
  enRedes: {
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
      apiKey: "AIzaSyDaz4skUdnzWvR96JQ5s3x4BqvOpSrhf9g",
      authDomain: "cafe-con-dos.firebaseapp.com",
      projectId: "cafe-con-dos",
      appId: "1:771340079140:web:b39b0a9aa570daadcb08b1"
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
    cafeConDos: "https://buymeacoffee.com/cafecondos",
    developer: "https://buymeacoffee.com/cmramirez.dev",
    avisoSegundos: 15
  }
};
