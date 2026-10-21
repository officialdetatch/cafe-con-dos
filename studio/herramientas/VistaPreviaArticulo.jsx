import {useEffect, useMemo, useRef, useState} from 'react'
import sitio from '../generado/sitio.js'
import {textoAMarkdown} from '../generado/texto-sanity.js'
import {hoy} from '../slug.js'

/* "Vista previa" de un artículo: la página real de cafecondos.com (entrada.html?previa=1)
   dentro del editor, con lo que se va escribiendo, ANTES de publicar. El editor le manda el
   borrador a la página con postMessage; la página lo dibuja con su diseño de siempre.
   No guarda ni publica nada. */

const SITIO = String(sitio.siteUrl || 'https://cafecondos.com').replace(/\/$/, '')

// De la referencia de una imagen de Sanity ("image-<id>-<ancho>x<alto>-<ext>") a su dirección.
function urlImagen(img, ancho) {
  const ref = img && img.asset && (img.asset._ref || img.asset._id)
  const m = /^image-([A-Za-z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/.exec(ref || '')
  if (!m) return ''
  return 'https://cdn.sanity.io/images/' + sitio.projectId + '/' + (sitio.dataset || 'production') + '/' + m[1] + '-' + m[2] + '.' + m[3] + '?w=' + ancho + '&fit=max&auto=format'
}

// El borrador → el mismo formato que el sitio usa para los artículos publicados.
function aArticulo(doc) {
  const cuerpo = (doc.cuerpo || []).map((b) => {
    if (!b) return b
    if (b._type === 'image') return {...b, url: urlImagen(b, 1400).replace(/\?.*$/, '')}
    if (b._type === 'fotoTexto') return {...b, url: urlImagen(b.foto, 1200).replace(/\?.*$/, ''), alt: b.foto && b.foto.alt}
    return b
  })
  const portada = urlImagen(doc.portada, 1600)
  const hs = doc.portada && doc.portada.hotspot
  return {
    titulo: String(doc.titulo || 'Sin título').trim(),
    fecha: doc.fecha || hoy(),
    seccion: doc.seccion || (sitio.secciones[0] && sitio.secciones[0].id) || '',
    idioma: doc.idioma || 'es',
    autor: doc.autor || '',
    portada,
    portadaAlt: (doc.portada && doc.portada.alt) || '',
    ...(hs && typeof hs.x === 'number' ? {portadaPos: (hs.x * 100).toFixed(1) + '% ' + (hs.y * 100).toFixed(1) + '%'} : {}),
    temas: Array.isArray(doc.temas) ? doc.temas : [],
    personas: (doc.personas || []).filter((p) => p && p.nombre).map((p) => ({nombre: p.nombre, rol: p.rol || '', link: p.link || ''})),
    episodio: doc.episodio || '',
    resumen: String(doc.resumen || '').trim(),
    cuerpo: textoAMarkdown(cuerpo),
    destacado: false,
    ...(doc.creditos ? {creditos: String(doc.creditos).trim()} : {}),
  }
}

export function VistaPreviaArticulo(props) {
  const doc = (props.document && props.document.displayed) || {}
  const marco = useRef(null)
  const [lista, setLista] = useState(false)
  const [ancho, setAncho] = useState('completo')
  const articulo = useMemo(() => aArticulo(doc), [JSON.stringify(doc)])

  // La página avisa cuando está lista para recibir el borrador.
  useEffect(() => {
    const escuchar = (e) => {
      if (e.origin === SITIO && e.data && e.data.tipo === 'ccd-previa-lista') setLista(true)
    }
    window.addEventListener('message', escuchar)
    return () => window.removeEventListener('message', escuchar)
  }, [])

  // Cada cambio se manda (con una pausita, para no redibujar con cada letra).
  useEffect(() => {
    if (!lista || !marco.current) return undefined
    const t = setTimeout(() => {
      marco.current.contentWindow.postMessage({tipo: 'ccd-previa', articulo}, SITIO)
    }, 400)
    return () => clearTimeout(t)
  }, [articulo, lista])

  const boton = (valor, texto) => (
    <button
      type="button"
      onClick={() => setAncho(valor)}
      aria-pressed={ancho === valor}
      style={{
        font: 'inherit',
        fontSize: 14,
        padding: '6px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        border: '1px solid #723F40',
        background: ancho === valor ? '#723F40' : 'transparent',
        color: ancho === valor ? '#FBF3EC' : 'inherit',
      }}
    >
      {texto}
    </button>
  )

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0}}>
      <div style={{display: 'flex', gap: 8, alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap'}}>
        {boton('completo', 'Computadora')}
        {boton('celular', 'Celular')}
        <span style={{fontSize: 13, opacity: 0.7}}>
          {lista ? 'Así se verá en la página. Los cambios aparecen mientras escribes; nada se publica desde aquí.' : 'Cargando la página…'}
        </span>
      </div>
      <div style={{flex: 1, minHeight: 600, display: 'flex', justifyContent: 'center', background: 'rgba(127,127,127,.12)'}}>
        <iframe
          ref={marco}
          title="Vista previa del artículo"
          src={SITIO + '/entrada.html?id=__previa&previa=1'}
          style={{border: 0, height: '100%', minHeight: 600, width: ancho === 'celular' ? 390 : '100%', background: '#E9CAB0'}}
        />
      </div>
    </div>
  )
}
