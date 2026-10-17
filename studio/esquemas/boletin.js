import {createElement} from 'react'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {ENCABEZADO_POR_DEFECTO, fechaLarga} from '../generado/boletin-html.js'

// Ícono de sobre para el boletín.
export const IconoBoletin = () =>
  createElement(
    'svg',
    {viewBox: '0 0 25 25', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round'},
    createElement('path', {d: 'M4.5 7.5h16v11h-16z'}),
    createElement('path', {d: 'M4.5 8l8 6.5 8-6.5'}),
  )

const fechaBonita = (iso) => {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return d + '/' + m + '/' + a
}

/* El boletín semanal. NO sale en el sitio: solo se manda por correo a los suscriptores
   (scripts/boletin-correo.js, con GitHub Actions). Al darle "Publicar" queda listo y sale
   el día de "Enviar el", a las 6:00 am. Mientras esté en borrador no sale nada. */
export const boletin = defineType({
  name: 'boletin',
  title: 'Boletín',
  type: 'document',
  icon: IconoBoletin,
  fields: [
    defineField({
      name: 'titulo',
      title: 'Título del correo',
      type: 'string',
      description: 'Es el asunto del correo y el título grande de arriba.',
      initialValue: ENCABEZADO_POR_DEFECTO,
      validation: (Rule) => Rule.required().error('Ponle un título.'),
    }),
    defineField({
      name: 'fechaEnvio',
      title: 'Enviar el',
      type: 'date',
      description:
        'El día que sale el correo a los suscriptores (a las 6:00 am). Si pones hoy, sale en cuanto le des Publicar. Mientras esté en borrador no sale nada.',
      validation: (Rule) => Rule.required().error('Elige el día en que sale el correo.'),
    }),
    defineField({
      name: 'intro',
      title: 'Saludo (opcional)',
      type: 'text',
      rows: 3,
      description: 'Unas líneas de bienvenida arriba. Una línea en blanco separa los párrafos.',
    }),
    defineField({
      name: 'entradas',
      title: 'Lo que viene',
      type: 'array',
      description:
        'Una entrada por cada cosa que viene: un episodio, un artículo, un evento… Salen en el correo ordenadas por fecha, aunque las escribas en otro orden. La foto es opcional.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'entrada',
          title: 'Entrada',
          fields: [
            defineField({
              name: 'fecha',
              title: 'Fecha',
              type: 'date',
              description: 'Sale como "Lunes 19 de octubre".',
              validation: (Rule) => Rule.required().error('Elige la fecha.'),
            }),
            defineField({
              name: 'etiqueta',
              title: 'Etiqueta (opcional)',
              type: 'string',
              description: 'Una o dos palabras arriba de la fecha. Ej.: Nuevo episodio, Artículo, Sobremesa, En vivo.',
              validation: (Rule) => Rule.max(30).warning('Mejor corta.'),
            }),
            defineField({
              name: 'titulo',
              title: 'Título',
              type: 'string',
              validation: (Rule) => Rule.required().error('Ponle un título.'),
            }),
            defineField({
              name: 'texto',
              title: 'Texto',
              type: 'text',
              rows: 4,
              description: 'Dos o tres líneas. Una línea en blanco separa los párrafos.',
            }),
            defineField({
              name: 'foto',
              title: 'Foto (opcional)',
              type: 'image',
              description: 'Sale a la izquierda, en horizontal. Toca el lápiz de la foto para marcar lo más importante.',
              options: {hotspot: true},
              fields: [
                defineField({
                  name: 'alt',
                  title: 'Describe la foto',
                  type: 'string',
                  description: 'Una frase de lo que se ve (para quien no puede ver la imagen).',
                }),
              ],
            }),
            defineField({
              name: 'link',
              title: 'Link (opcional)',
              type: 'url',
              description: 'Si lo pones, sale "Ver más →" y la foto lleva ahí. Empieza con https://',
              validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
            }),
          ],
          preview: {
            select: {title: 'titulo', fecha: 'fecha', etiqueta: 'etiqueta', media: 'foto'},
            prepare({title, fecha, etiqueta, media}) {
              return {
                title: title || 'Sin título',
                subtitle: [fechaLarga(fecha), etiqueta].filter(Boolean).join(' · '),
                media,
              }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.min(1).error('Agrega al menos una entrada.'),
    }),
    defineField({
      name: 'cierre',
      title: 'Despedida (opcional)',
      type: 'text',
      rows: 3,
      description: 'Unas líneas al final, antes de las redes.',
    }),
  ],
  orderings: [
    {title: 'Fecha de envío, más nuevo primero', name: 'envioDesc', by: [{field: 'fechaEnvio', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'titulo', fecha: 'fechaEnvio'},
    prepare({title, fecha}) {
      return {title: title || 'Sin título', subtitle: fecha ? 'Sale el ' + fechaBonita(fecha) : 'Sin fecha de envío'}
    },
  },
})
