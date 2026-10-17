import {useMemo, useState} from 'react'
import sitio from '../generado/sitio.js'
import {construirBoletin} from '../generado/boletin-html.js'

/* "Vista previa del correo": junto al formulario del boletín. Muestra el correo tal como
   le llega a los suscriptores, con lo que se va escribiendo (sin necesidad de guardar). */
export function VistaPreviaCorreo(props) {
  const doc = (props.document && props.document.displayed) || {}
  const [modo, setModo] = useState('claro')

  const html = useMemo(
    () => construirBoletin({boletin: doc, sitio, modo, vistaPrevia: true}).html,
    // Se rehace cuando cambia el contenido del documento.
    [JSON.stringify(doc), modo],
  )

  const boton = (valor, texto) => (
    <button
      type="button"
      onClick={() => setModo(valor)}
      aria-pressed={modo === valor}
      style={{
        font: 'inherit',
        fontSize: 14,
        padding: '6px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        border: '1px solid #723F40',
        background: modo === valor ? '#723F40' : 'transparent',
        color: modo === valor ? '#FBF3EC' : 'inherit',
      }}
    >
      {texto}
    </button>
  )

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0}}>
      <div style={{display: 'flex', gap: 8, alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap'}}>
        {boton('claro', 'Modo claro')}
        {boton('oscuro', 'Modo oscuro')}
        <span style={{fontSize: 13, opacity: 0.7}}>
          Así le llega a los suscriptores. Las fotos y los cambios aparecen aquí mientras escribes.
        </span>
      </div>
      <iframe
        title="Vista previa del correo"
        srcDoc={html}
        style={{flex: 1, width: '100%', minHeight: 600, border: 0, background: '#fff'}}
        sandbox=""
      />
    </div>
  )
}
