import {createElement} from 'react'
import {defineArrayMember, defineField, defineType} from 'sanity'

// Ícono de casete para La Fonoteca.
export const IconoFonoteca = () =>
  createElement(
    'svg',
    {viewBox: '0 0 25 25', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round'},
    createElement('rect', {x: 3.5, y: 6.5, width: 18, height: 12, rx: 1.5}),
    createElement('circle', {cx: 9, cy: 11.5, r: 1.6}),
    createElement('circle', {cx: 16, cy: 11.5, r: 1.6}),
    createElement('path', {d: 'M7 18.5l1.5-3h8l1.5 3'}),
  )

const esLinkDeSpotify = (tipo) => (valor) => {
  if (!valor) return true
  return new RegExp('^https://open\\.spotify\\.com/(intl-[a-z-]+/)?' + tipo + '/[A-Za-z0-9]+').test(String(valor).trim())
    ? true
    : 'Pega el link de Spotify (Compartir → Copiar link). Empieza con https://open.spotify.com/' + tipo + '/'
}

/* La página "La Fonoteca" (cafecondos.com/fonoteca). Es UN solo documento: se edita y
   se le da "Publicar". Las canciones de la playlist y la trivia salen solas de Spotify
   (scripts/fonoteca.js, cada mañana a las 6:00 am y cada vez que se publica algo). */
export const fonoteca = defineType({
  name: 'fonoteca',
  title: 'La Fonoteca',
  type: 'document',
  icon: IconoFonoteca,
  groups: [
    {name: 'semana', title: 'Canción de la semana', default: true},
    {name: 'trivia', title: 'Trivia y datos'},
    {name: 'playlist', title: 'Playlist'},
  ],
  fields: [
    defineField({
      name: 'cancion',
      title: 'Canción de la semana (This week’s jam)',
      type: 'object',
      group: 'semana',
      options: {collapsible: false},
      fields: [
        defineField({
          name: 'link',
          title: 'Link de la canción en Spotify',
          type: 'url',
          description: 'En Spotify: los tres puntitos de la canción → Compartir → Copiar link de la canción. La foto, el nombre y el artista salen solos.',
          validation: (Rule) => Rule.custom(esLinkDeSpotify('track')),
        }),
        defineField({
          name: 'texto',
          title: 'Por qué esta canción',
          type: 'text',
          rows: 4,
          description: 'Dos o tres líneas. Una línea en blanco separa los párrafos.',
        }),
        defineField({
          name: 'nota',
          title: 'Notita a mano (opcional)',
          type: 'string',
          description: 'Sale con letra de mano debajo. Ej.: Una canción que siempre se siente actual.',
          validation: (Rule) => Rule.max(70).warning('Mejor corta: es una notita.'),
        }),
      ],
    }),
    defineField({
      name: 'sabiasQue',
      title: '¿Sabías que…?',
      type: 'array',
      group: 'trivia',
      description: 'Datos curiosos de música. Cada vez que alguien abre la página sale uno al azar. Revisa que sean ciertos.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'dato',
          title: 'Dato',
          fields: [defineField({name: 'texto', title: 'El dato', type: 'text', rows: 3, validation: (Rule) => Rule.required().error('Escribe el dato.')})],
          preview: {select: {title: 'texto'}},
        }),
      ],
    }),
    defineField({
      name: 'preguntas',
      title: 'Preguntas propias para la trivia (opcional)',
      type: 'array',
      group: 'trivia',
      description:
        'La trivia ya arma preguntas sola con las canciones de la playlist (quién la canta, de qué año es, de qué álbum…). Aquí puedes agregar las tuyas; se mezclan con esas.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'pregunta',
          title: 'Pregunta',
          fields: [
            defineField({
              name: 'pregunta',
              title: 'Pregunta',
              type: 'string',
              validation: (Rule) => Rule.required().error('Escribe la pregunta.'),
            }),
            defineField({
              name: 'correcta',
              title: 'Respuesta correcta',
              type: 'string',
              validation: (Rule) => Rule.required().error('Escribe la respuesta correcta.'),
            }),
            defineField({
              name: 'incorrectas',
              title: 'Respuestas incorrectas',
              type: 'array',
              of: [defineArrayMember({type: 'string'})],
              description: 'Tres opciones que NO son. En la página salen mezcladas con la correcta.',
              validation: (Rule) => Rule.required().min(3).max(3).error('Pon exactamente 3 respuestas incorrectas.'),
            }),
            defineField({
              name: 'dato',
              title: 'Dato después de contestar (opcional)',
              type: 'text',
              rows: 2,
              description: 'Sale cuando la persona contesta. Ej.: Thriller es el álbum más vendido de la historia.',
            }),
          ],
          preview: {
            select: {title: 'pregunta', subtitle: 'correcta'},
            prepare: ({title, subtitle}) => ({title: title || 'Sin pregunta', subtitle: subtitle ? '✓ ' + subtitle : ''}),
          },
        }),
      ],
    }),
    defineField({
      name: 'playlist',
      title: 'Link de la playlist',
      type: 'url',
      group: 'playlist',
      description:
        'La playlist que suena en la página y de la que sale la trivia. Tiene que ser TUYA (creada en tu cuenta) y pública. En Spotify: los tres puntitos → Compartir → Copiar link de la playlist. Los cambios que le hagas a la playlist en Spotify llegan solos a la página cada mañana.',
      validation: (Rule) => Rule.custom(esLinkDeSpotify('playlist')),
    }),
  ],
  preview: {
    prepare: () => ({title: 'La Fonoteca', subtitle: 'Canción de la semana, trivia y playlist'}),
  },
})
