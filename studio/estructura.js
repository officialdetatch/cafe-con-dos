import {CalendarIcon} from '@sanity/icons/Calendar'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {FolderIcon} from '@sanity/icons/Folder'
import sitio from './generado/sitio.js'
import {hoy} from './slug.js'
import {VistaPreviaCorreo} from './herramientas/VistaPreviaCorreo.jsx'

const masNuevo = [{field: 'fecha', direction: 'desc'}]

// La columna de la izquierda del editor.
export const estructura = (S) =>
  S.list()
    .title('Café Con Dos')
    .items([
      S.listItem()
        .title('Todos los artículos')
        .id('todos')
        .icon(DocumentsIcon)
        .child(S.documentTypeList('articulo').title('Todos los artículos').defaultOrdering(masNuevo)),
      S.listItem()
        .title('Programados')
        .id('programados')
        .icon(CalendarIcon)
        .child(() =>
          S.documentList()
            .title('Programados (fecha futura)')
            .schemaType('articulo')
            .filter('_type == "articulo" && fecha > $hoy')
            .params({hoy: hoy()})
            .defaultOrdering([{field: 'fecha', direction: 'asc'}]),
        ),
      S.divider(),
      ...sitio.secciones.map((s) =>
        S.listItem()
          .title(s.nombre)
          .id('seccion-' + s.id)
          .icon(FolderIcon)
          .child(
            S.documentList()
              .title(s.nombre)
              .schemaType('articulo')
              .filter('_type == "articulo" && seccion == $seccion')
              .params({seccion: s.id})
              .defaultOrdering(masNuevo),
          ),
      ),
    ])

// La pestaña "Boletín": el correo semanal. No sale en el sitio, solo por correo.
export const estructuraBoletin = (S) =>
  S.list()
    .title('Boletín')
    .items([
      S.listItem()
        .title('Boletines')
        .id('boletines')
        .child(S.documentTypeList('boletin').title('Boletines').defaultOrdering([{field: 'fechaEnvio', direction: 'desc'}])),
    ])

// Al abrir un boletín: el formulario y, al lado, la vista previa del correo.
export const documentoBoletin = (S, {schemaType}) =>
  schemaType === 'boletin'
    ? S.document().views([S.view.form(), S.view.component(VistaPreviaCorreo).title('Vista previa del correo')])
    : S.document().views([S.view.form()])