import {createElement} from 'react'
import {defineConfig} from 'sanity'
import {buildTheme} from '@sanity/themer'
import {structureTool} from 'sanity/structure'
import {esESLocale} from '@sanity/locale-es-es'
import sitio from './generado/sitio.js'
import {tiposDeEsquema} from './esquemas/index.js'
import {estructura} from './estructura.js'
import {publicarConFecha, VerEnLaPagina} from './acciones.js'
import {Comentarios} from './herramientas/Comentarios.jsx'

// Los colores de Café Con Dos en todo el editor (claro y oscuro).
// Salen de assets/css/styles.css: --cafe, --espuma, --tinta-suave y el fondo oscuro.
const tema = buildTheme({
  accent: '#723F40', // café: botones, links y foco
  text: '#6B4744', // tinta suave: textos, íconos y bordes con un gris cálido
  background: {light: '#FBF3EC', dark: '#221415'}, // espuma / fondo oscuro del sitio
})

// Ícono de globo de diálogo para la pestaña de comentarios.
const IconoComentarios = () =>
  createElement(
    'svg',
    {viewBox: '0 0 25 25', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round'},
    createElement('path', {d: 'M5.5 5.5h14v10h-7l-4 3.5v-3.5h-3z'}),
  )

// La taza de la marca como ícono del editor.
const Taza = () => createElement('img', {src: '/static/taza.png', alt: '', style: {width: '100%', height: '100%', objectFit: 'contain'}})

export default defineConfig({
  name: 'cafe-con-dos',
  title: sitio.nombre,
  icon: Taza,
  projectId: sitio.projectId,
  dataset: sitio.dataset,
  theme: tema,

  plugins: [structureTool({title: 'Artículos', structure: estructura}), esESLocale()],

  // Pestañas extra junto a "Artículos": moderar los comentarios del sitio.
  tools: [{name: 'comentarios', title: 'Comentarios', icon: IconoComentarios, component: Comentarios}],

  schema: {
    types: tiposDeEsquema,
  },

  document: {
    actions: (anteriores, contexto) => {
      if (contexto.schemaType !== 'articulo') return anteriores
      return [
        // "Duplicar" copiaría la dirección y la fecha de publicación del original.
        ...anteriores
          .filter((accion) => accion.action !== 'duplicate')
          .map((accion) => (accion.action === 'publish' ? publicarConFecha(accion) : accion)),
        VerEnLaPagina,
      ]
    },
  },
})
