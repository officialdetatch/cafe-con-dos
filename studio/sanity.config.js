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
// Salen de assets/css/styles.css: --cafe, --espuma, --tinta-suave, --brand y el fondo oscuro.
// Si una versión de @sanity/themer pide las opciones de otra forma, se prueba la
// otra; y si ninguna sirve, el editor se queda con los colores de Sanity en vez
// de romperse (el aviso sale en la consola del navegador).
function construirTema() {
  const claro = {accent: '#723F40', text: '#6B4744', background: '#FBF3EC'} // café / tinta suave / espuma
  const oscuro = {accent: '#E9CAB0', text: '#CFB3A3', background: '#221415'} // latte / tinta clara / fondo oscuro del sitio
  const intentos = [
    () => buildTheme({light: claro, dark: oscuro}), // versiones nuevas: opciones por esquema
    () => buildTheme({light: {accent: claro.accent, background: claro.background}, dark: {accent: oscuro.accent, background: oscuro.background}}),
    () => buildTheme({accent: claro.accent, text: claro.text, background: {light: claro.background, dark: oscuro.background}}), // versiones anteriores
  ]
  for (const intento of intentos) {
    try {
      return intento()
    } catch (e) {
      console.warn('[Café Con Dos] tema del editor:', e && e.message)
    }
  }
  return undefined
}
const tema = construirTema()

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
  ...(tema ? {theme: tema} : {}),

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