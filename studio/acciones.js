import {useDocumentOperation} from 'sanity'
import {LaunchIcon} from '@sanity/icons/Launch'
import sitio from './generado/sitio.js'
import {hoy, slugify} from './slug.js'
import {fechaLarga} from './generado/boletin-html.js'

/* El botón Publicar de siempre, con dos cosas más la primera vez:
   - crea la dirección del artículo desde el título si nadie la tocó,
   - anota la hora en que se publicó (el email a suscriptores la usa para
     saber que es nuevo aunque se publique de noche).
   Todo lo demás (validaciones, "Publicando…", etc.) es el botón original. */
export function publicarConFecha(publicarOriginal) {
  function Publicar(props) {
    const original = publicarOriginal(props)
    const {patch} = useDocumentOperation(props.id, props.type)
    if (!original) return original
    return {
      ...original,
      onHandle: () => {
        const doc = props.draft || props.published || {}
        const cambios = []
        if (!doc.publicado && !(props.published && props.published.publicado)) {
          cambios.push({setIfMissing: {publicado: new Date().toISOString()}})
        }
        const slug = slugify(doc.titulo)
        if (!(doc.slug && doc.slug.current) && slug) {
          cambios.push({setIfMissing: {slug: {_type: 'slug', current: slug}}})
        }
        if (cambios.length) patch.execute(cambios)
        original.onHandle()
      },
    }
  }
  Publicar.action = publicarOriginal.action
  return Publicar
}

// "Ver en la página": abre el artículo publicado en el sitio.
export function VerEnLaPagina(props) {
  const slug = props.published && props.published.slug && props.published.slug.current
  if (!slug || !sitio.siteUrl) return null
  return {
    label: 'Ver en la página',
    icon: LaunchIcon,
    title: 'Abre el artículo en la página (tarda un par de minutos en aparecer después de publicar)',
    onHandle: () => {
      window.open(sitio.siteUrl + '/entrada.html?id=' + encodeURIComponent(slug), '_blank', 'noopener')
      props.onComplete()
    },
  }
}

/* Publicar un boletín es lo que lo deja listo para salir a los suscriptores, así que
   antes de publicar pregunta, diciendo cuándo sale. */
export function publicarBoletin(publicarOriginal) {
  function Publicar(props) {
    const original = publicarOriginal(props)
    if (!original) return original
    return {
      ...original,
      onHandle: () => {
        const doc = props.draft || props.published || {}
        const dia = doc.fechaEnvio
        const cuando = !dia
          ? 'el día que elijas en "Enviar el"'
          : dia <= hoy()
            ? 'en unos minutos (la fecha de envío es hoy o ya pasó)'
            : 'el ' + fechaLarga(dia).toLowerCase() + ' a las 6:00 am'
        const ok = window.confirm(
          'Al publicar, este boletín le llega por correo a todos los suscriptores ' + cuando + '.\n\n' +
            'Una vez enviado no se puede deshacer. ¿Ya revisaste la vista previa y todo está listo?',
        )
        if (!ok) return props.onComplete && props.onComplete()
        original.onHandle()
      },
    }
  }
  Publicar.action = publicarOriginal.action
  return Publicar
}