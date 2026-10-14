import {createElement} from 'react'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {esESLocale} from '@sanity/locale-es-es'
import sitio from './generado/sitio.js'
import {tiposDeEsquema} from './esquemas/index.js'
import {estructura} from './estructura.js'
import {publicarConFecha, VerEnLaPagina} from './acciones.js'

// La taza de la marca como ícono del editor.
const Taza = () => createElement('img', {src: '/static/taza.png', alt: '', style: {width: '100%', height: '100%', objectFit: 'contain'}})

export default defineConfig({
  name: 'cafe-con-dos',
  title: sitio.nombre,
  icon: Taza,
  projectId: sitio.projectId,
  dataset: sitio.dataset,

  plugins: [structureTool({title: 'Artículos', structure: estructura}), esESLocale()],

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
