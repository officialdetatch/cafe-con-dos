import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import sitio from '../generado/sitio.js'
import {EpisodioInput} from '../componentes/EpisodioInput.jsx'
import {hoy, slugify} from '../slug.js'

const secciones = sitio.secciones.map((s) => ({title: s.nombre, value: s.id}))
const temas = sitio.temas.map((t) => ({title: t.nombre, value: t.id}))
const hosts = sitio.hosts.map((h) => ({title: h.nombre, value: h.id}))
const nombreSeccion = (id) => (sitio.secciones.find((s) => s.id === id) || {}).nombre || ''

const fechaBonita = (iso) => {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return d + '/' + m + '/' + a
}

export const articulo = defineType({
  name: 'articulo',
  title: 'Artículo',
  type: 'document',
  icon: DocumentTextIcon,
  fieldsets: [
    {
      name: 'mas',
      title: 'Más opciones',
      description: 'Personas en la historia, episodio relacionado y la dirección del artículo.',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    defineField({
      name: 'titulo',
      title: 'Título',
      type: 'string',
      validation: (Rule) => [
        Rule.required().error('Ponle un título.'),
        Rule.max(110).warning('Los títulos cortos se leen mejor en Google y en las tarjetas.'),
      ],
    }),
    defineField({
      name: 'seccion',
      title: 'Sección',
      type: 'string',
      description: 'Dónde vive en Explorar. Sobremesa también tiene su propia página.',
      options: {list: secciones, layout: 'radio'},
      validation: (Rule) => Rule.required().error('Elige una sección.'),
    }),
    defineField({
      name: 'idioma',
      title: 'Idioma del artículo',
      type: 'string',
      options: {
        list: [
          {title: 'Español', value: 'es'},
          {title: 'English', value: 'en'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'es',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fecha',
      title: 'Fecha de publicación',
      type: 'date',
      description:
        'Hoy, por defecto. Si eliges una fecha futura, el artículo queda programado: sale en la página (y en el email a suscriptores) ese día a las 6:00 am.',
      initialValue: () => hoy(),
      validation: (Rule) => Rule.required().error('Elige la fecha.'),
    }),
    defineField({
      name: 'portada',
      title: 'Foto de portada',
      type: 'image',
      description:
        'Opcional. Horizontal se ve mejor. Toca el lápiz de la foto para marcar lo más importante (una cara, por ejemplo) y que las tarjetas no lo corten. Sin foto, sale un bloque con los colores de la sección.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Describe la foto',
          type: 'string',
          description: 'Una frase de lo que se ve. La usan Google y las personas que leen con lector de pantalla.',
          validation: (Rule) =>
            Rule.custom((alt, ctx) => (ctx.parent && ctx.parent.asset && !alt ? 'Describe la foto en una frase.' : true)).warning(),
        }),
      ],
    }),
    defineField({
      name: 'resumen',
      title: 'Resumen',
      type: 'text',
      rows: 3,
      description: 'Una o dos oraciones. Sale en las tarjetas, en Google, al compartir y en el email a suscriptores.',
      validation: (Rule) => [
        Rule.required().error('Escribe un resumen corto.'),
        Rule.max(280).warning('Mejor en menos de 280 caracteres.'),
      ],
    }),
    defineField({
      name: 'cuerpo',
      title: 'El artículo',
      type: 'array',
      description: 'Escribe o pega el texto. Usa "Título" y "Subtítulo" para dividirlo, y el botón de imagen para meter fotos en medio.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Título', value: 'h2'},
            {title: 'Subtítulo', value: 'h3'},
            {title: 'Cita', value: 'blockquote'},
          ],
          lists: [
            {title: 'Viñetas', value: 'bullet'},
            {title: 'Numerada', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Negrita', value: 'strong'},
              {title: 'Cursiva', value: 'em'},
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'Dirección (URL)',
                    type: 'url',
                    description: 'Empieza con https://',
                    validation: (Rule) => Rule.required().uri({scheme: ['http', 'https', 'mailto']}),
                  }),
                ],
              }),
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          title: 'Foto',
          fields: [
            defineField({
              name: 'alt',
              title: 'Describe la foto',
              type: 'string',
              validation: (Rule) => Rule.required().warning('Describe la foto en una frase.'),
            }),
          ],
        }),
      ],
      validation: (Rule) => Rule.required().error('El artículo está vacío.'),
    }),
    defineField({
      name: 'temas',
      title: 'Temas',
      type: 'array',
      description: 'Elige uno o varios. Son los filtros de Explorar y Sobremesa.',
      of: [defineArrayMember({type: 'string'})],
      options: {list: temas, layout: 'grid'},
      validation: (Rule) => Rule.min(1).warning('Con al menos un tema, la gente lo encuentra en los filtros.'),
    }),
    defineField({
      name: 'destacado',
      title: 'Destacar en la portada',
      type: 'boolean',
      description: 'El artículo destacado más reciente sale grande arriba en Inicio.',
      initialValue: false,
    }),

    // ---- Más opciones ----
    defineField({
      name: 'personas',
      title: 'Personas en esta historia',
      type: 'array',
      fieldset: 'mas',
      description: 'Para entrevistas y perfiles. Salen al final del artículo, con link a su perfil.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'persona',
          title: 'Persona',
          fields: [
            defineField({name: 'nombre', title: 'Nombre', type: 'string', validation: (Rule) => Rule.required()}),
            defineField({name: 'rol', title: 'Qué hace', type: 'string', description: 'Ej.: Muralista, Productor musical'}),
            defineField({
              name: 'link',
              title: 'Link (Instagram, web…)',
              type: 'url',
              validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
            }),
          ],
          preview: {select: {title: 'nombre', subtitle: 'rol'}},
        }),
      ],
    }),
    defineField({
      name: 'episodio',
      title: 'Episodio relacionado',
      type: 'string',
      fieldset: 'mas',
      description: 'Opcional. Al final del artículo sale la tarjeta de ese episodio.',
      components: {input: EpisodioInput},
    }),
    defineField({
      name: 'slug',
      title: 'Dirección del artículo',
      type: 'slug',
      fieldset: 'mas',
      description:
        'Se crea sola con el título al publicar (no hace falta tocarla). Después de publicado ya no cambia, para que no se rompan los links compartidos ni los comentarios.',
      options: {source: 'titulo', maxLength: 80, slugify: (texto) => slugify(texto)},
      readOnly: ({document}) => Boolean(document && document.publicado),
    }),
    defineField({
      name: 'autor',
      title: 'Autora',
      type: 'string',
      fieldset: 'mas',
      options: {list: hosts},
      initialValue: hosts.length ? hosts[0].value : undefined,
      hidden: hosts.length < 2,
    }),
    defineField({
      name: 'publicado',
      title: 'Publicado por primera vez',
      type: 'datetime',
      description: 'Lo pone solo el botón Publicar (sirve para el email a suscriptores).',
      readOnly: true,
      hidden: true,
    }),
  ],
  orderings: [
    {title: 'Fecha, más nuevo primero', name: 'fechaDesc', by: [{field: 'fecha', direction: 'desc'}]},
    {title: 'Fecha, más viejo primero', name: 'fechaAsc', by: [{field: 'fecha', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'titulo', seccion: 'seccion', fecha: 'fecha', idioma: 'idioma', media: 'portada'},
    prepare({title, seccion, fecha, idioma, media}) {
      const programado = fecha && fecha > hoy()
      return {
        title: title || 'Sin título',
        subtitle: [nombreSeccion(seccion), fechaBonita(fecha), programado ? 'Programado' : '', idioma === 'en' ? 'EN' : '']
          .filter(Boolean)
          .join(' · '),
        media,
      }
    },
  },
})
