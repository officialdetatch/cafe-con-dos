import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import sitio from '../generado/sitio.js'
import {alCambiarSesion, borrar, enviarVerificacion, entrar, entrarConCorreo, escuchar, esModerador, recuperar, salir, yaVerificado} from './nube.js'

// Esta pestaña NO usa los componentes de colores de Sanity: trae su propio estilo y
// se adapta sola al modo claro u oscuro del editor (mira el color de fondo real de la
// pantalla). Así se ve bien sin depender de la versión del editor.

const POR_PAGINA = 50

// ---------- modo claro / oscuro ----------
function leerColor(texto) {
  let m = texto.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat)
    return {rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1}
  }
  m = texto.match(/color\(srgb\s+([^)]+)\)/)
  if (m) {
    const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat)
    return {rgb: p.slice(0, 3).map((v) => v * 255), a: p.length > 3 ? p[3] : 1}
  }
  return null
}

function fondoReal(el) {
  for (let n = el; n; n = n.parentElement) {
    const c = leerColor(getComputedStyle(n).backgroundColor || '')
    if (c && c.a > 0.5) return c.rgb
  }
  return null
}

function esOscuro(el) {
  const rgb = el ? fondoReal(el) : null
  if (rgb) {
    const [r, g, b] = rgb.map((v) => v / 255)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5
  }
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function useOscuro(ref) {
  const [oscuro, setOscuro] = useState(false)
  useLayoutEffect(() => {
    const medir = () => {
      const el = ref.current
      if (el) setOscuro(esOscuro(el.parentElement || el))
    }
    medir()
    let cuadro = 0
    const pronto = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(medir)
    }
    const mo = new MutationObserver(pronto)
    mo.observe(document.documentElement, {attributes: true, subtree: true, attributeFilter: ['data-scheme', 'data-theme', 'class', 'style']})
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (mq && mq.addEventListener) mq.addEventListener('change', pronto)
    const reloj = setInterval(medir, 2000)
    return () => {
      mo.disconnect()
      cancelAnimationFrame(cuadro)
      clearInterval(reloj)
      if (mq && mq.removeEventListener) mq.removeEventListener('change', pronto)
    }
  }, [ref])
  return oscuro
}

const COLORES = {
  claro: {fg: '#3A1F20', suave: '#6B4744', borde: 'rgba(114,63,64,.3)', tarjeta: 'rgba(114,63,64,.06)', boton: '#723F40', botonTxt: '#F5E4D5', peligro: '#B3261E', enlace: '#9A3816', critico: 'rgba(179,38,30,.1)', atencion: 'rgba(244,125,80,.16)', bien: 'rgba(70,140,90,.16)', campo: '#FFFDF9'},
  oscuro: {fg: '#F3E2D3', suave: '#CFB3A3', borde: 'rgba(233,202,176,.3)', tarjeta: 'rgba(233,202,176,.07)', boton: '#E9CAB0', botonTxt: '#2E1C1D', peligro: '#FF9A8F', enlace: '#F7A37F', critico: 'rgba(255,154,143,.14)', atencion: 'rgba(244,125,80,.16)', bien: 'rgba(120,200,150,.16)', campo: 'rgba(233,202,176,.08)'},
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Antonio:wght@600;700&family=Literata:wght@400;600&display=swap');
.ccd-com{box-sizing:border-box;height:100%;overflow:auto;color:var(--fg);font-family:'Literata',Georgia,'Times New Roman',serif;font-size:15px;line-height:1.5;-webkit-text-size-adjust:100%}
.ccd-com *{box-sizing:border-box}
.ccd-com .ccd-in{max-width:720px;margin:0 auto;padding:20px 16px 60px;display:flex;flex-direction:column;gap:16px}
.ccd-com h1{margin:0;font-family:'Antonio','Arial Narrow',Arial,sans-serif;font-size:28px;line-height:1.1;font-weight:700;letter-spacing:.3px;color:var(--fg)}
.ccd-com p{margin:0}
.ccd-com .fila{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ccd-com .entre{justify-content:space-between}
.ccd-com .col{display:flex;flex-direction:column;gap:12px}
.ccd-com .suave{color:var(--suave);font-size:13px}
.ccd-com .tarjeta{border:1px solid var(--borde);background:var(--tarjeta);border-radius:18px 18px 18px 6px;padding:16px;color:var(--fg)}
.ccd-com .tarjeta.critico{background:var(--critico);border-color:var(--peligro)}
.ccd-com .tarjeta.atencion{background:var(--atencion)}
.ccd-com .tarjeta.bien{background:var(--bien)}
.ccd-com .insignia{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--bien);color:var(--fg);border:1px solid var(--borde)}
.ccd-com button{font-family:'Antonio','Arial Narrow',Arial,sans-serif;letter-spacing:.3px;font-size:17px;min-height:44px;padding:0 18px;border-radius:12px 12px 12px 4px;cursor:pointer;border:1px solid var(--borde);background:transparent;color:var(--fg)}
.ccd-com button.primario{background:var(--boton);border-color:var(--boton);color:var(--botonTxt);font-weight:600}
.ccd-com button.peligro{background:var(--peligro);border-color:var(--peligro);color:var(--botonTxt);font-weight:600}
.ccd-com button.borrar{color:var(--peligro);border-color:var(--peligro)}
.ccd-com button.chico{min-height:36px;font-size:15px;padding:0 14px}
.ccd-com button:disabled{opacity:.55;cursor:default}
.ccd-com input{font:inherit;font-size:16px;width:100%;min-height:44px;padding:0 12px;border-radius:8px;border:1px solid var(--borde);background:var(--campo);color:var(--fg)}
.ccd-com input::placeholder{color:var(--suave)}
.ccd-com a{color:var(--enlace)}
.ccd-com .nombre{font-weight:600}
.ccd-com .texto{white-space:pre-wrap;overflow-wrap:anywhere}
.ccd-com .id{overflow-wrap:anywhere;color:var(--suave);font-size:12px}
`

// Traduce los errores de Firebase a algo que se pueda resolver.
function explicar(e) {
  const code = (e && e.code) || ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return ''
  if (code === 'auth/unauthorized-domain') {
    return 'Falta autorizar este dominio en Firebase: Authentication → Settings → Authorized domains → agrega ' + window.location.hostname
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Ese tipo de inicio de sesión no está activado en Firebase (Authentication → Sign-in method → Google o Correo/contraseña).'
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-login-credentials') {
    return 'El correo o la contraseña no son correctos. Si no tienes contraseña todavía, toca "Crear o cambiar mi contraseña".'
  }
  if (code === 'auth/invalid-email') return 'Ese correo no parece válido.'
  if (code === 'auth/missing-password') return 'Escribe tu contraseña.'
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  if (code === 'auth/user-disabled') return 'Esa cuenta está desactivada en Firebase.'
  if (code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.'
  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return 'Firebase no te dejó hacer eso. Revisa que tu correo esté en la lista de moderadores y que las reglas estén publicadas.'
  }
  return (e && e.message) || 'Algo salió mal.'
}

function fechaCorta(d) {
  if (!d) return 'ahora mismo'
  return d.toLocaleString('es', {day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'})
}

function Comentario({c, confirmando, borrando, alPedir, alCancelar, alConfirmar}) {
  const enlace = (sitio.siteUrl || '') + '/entrada.html?id=' + encodeURIComponent(c.post)
  return (
    <div className={'tarjeta' + (confirmando ? ' critico' : '')} style={{display: 'flex', flexDirection: 'column', gap: 10}}>
      <div className="fila entre" style={{alignItems: 'flex-start'}}>
        <div>
          <div className="nombre">{c.nombre}</div>
          <div className="suave">{fechaCorta(c.fecha)}</div>
        </div>
        <a href={enlace} target="_blank" rel="noopener noreferrer" className="suave" style={{color: 'var(--enlace)'}}>
          Ver artículo ↗
        </a>
      </div>
      <div className="id">{c.post}</div>
      <div className="texto">{c.texto}</div>
      {confirmando ? (
        <div className="fila">
          <b style={{fontSize: 13}}>¿Borrar este comentario?</b>
          <button type="button" className="peligro chico" disabled={borrando} onClick={alConfirmar}>
            {borrando ? 'Borrando…' : 'Sí, borrar'}
          </button>
          <button type="button" className="chico" disabled={borrando} onClick={alCancelar}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="fila">
          <button type="button" className="borrar chico" onClick={alPedir}>
            Borrar
          </button>
        </div>
      )}
    </div>
  )
}

export function Comentarios() {
  const raiz = useRef(null)
  const oscuro = useOscuro(raiz)
  // undefined = revisando · null = sin sesión · {email, nombre} = con sesión
  const [usuario, setUsuario] = useState(undefined)
  // null = revisando · true/false
  const [moderador, setModerador] = useState(null)
  const [items, setItems] = useState(null)
  const [limite, setLimite] = useState(POR_PAGINA)
  const [buscar, setBuscar] = useState('')
  const [pendiente, setPendiente] = useState('')
  const [borrando, setBorrando] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => alCambiarSesion(setUsuario, (e) => {
    setUsuario(null)
    setError(explicar(e))
  }), [])

  useEffect(() => {
    setModerador(null)
    if (!usuario || !usuario.verificado) return undefined
    let vivo = true
    esModerador(usuario.email)
      .then((si) => vivo && setModerador(!!si))
      .catch((e) => {
        if (!vivo) return
        setModerador(false)
        setError(explicar(e))
      })
    return () => {
      vivo = false
    }
  }, [usuario && usuario.email, usuario && usuario.verificado])

  useEffect(() => {
    if (!moderador) return undefined
    return escuchar(limite, setItems, (e) => {
      setItems([])
      setError(explicar(e))
    })
  }, [moderador, limite])

  const hacerEntrar = useCallback(async () => {
    setError('')
    setEntrando(true)
    try {
      await entrar()
    } catch (e) {
      setError(explicar(e))
    } finally {
      setEntrando(false)
    }
  }, [])

  const hacerEntrarConCorreo = useCallback(async () => {
    setError('')
    setAviso('')
    setOcupado(true)
    try {
      await entrarConCorreo(correo, clave)
      setClave('')
    } catch (e) {
      setError(explicar(e))
    } finally {
      setOcupado(false)
    }
  }, [correo, clave])

  const hacerRecuperar = useCallback(async () => {
    setError('')
    setAviso('')
    if (!correo.trim()) {
      setError('Escribe tu correo arriba y vuelve a tocar este botón.')
      return
    }
    setOcupado(true)
    try {
      await recuperar(correo)
      setAviso('Listo. Si ese correo tiene acceso, te llegará un enlace para crear o cambiar tu contraseña (revisa también el spam).')
    } catch (e) {
      setError(explicar(e))
    } finally {
      setOcupado(false)
    }
  }, [correo])

  const hacerVerificar = useCallback(async () => {
    setError('')
    setAviso('')
    setOcupado(true)
    try {
      await enviarVerificacion()
      setAviso('Te enviamos un enlace de verificación a ' + (usuario ? usuario.email : 'tu correo') + '. Ábrelo y luego toca "Ya lo verifiqué".')
    } catch (e) {
      setError(explicar(e))
    } finally {
      setOcupado(false)
    }
  }, [usuario])

  const hacerYaVerifique = useCallback(async () => {
    setError('')
    setAviso('')
    setOcupado(true)
    try {
      if (await yaVerificado()) setUsuario((u) => (u ? {...u, verificado: true} : u))
      else setAviso('Todavía no aparece como verificado. Abre el enlace del correo y vuelve a intentarlo.')
    } catch (e) {
      setError(explicar(e))
    } finally {
      setOcupado(false)
    }
  }, [])

  const hacerSalir = useCallback(async () => {
    setError('')
    setAviso('')
    setItems(null)
    try {
      await salir()
    } catch (e) {
      setError(explicar(e))
    }
  }, [])

  const confirmarBorrar = useCallback(async (id) => {
    setError('')
    setBorrando(id)
    try {
      await borrar(id)
      setPendiente('')
    } catch (e) {
      setError(explicar(e))
    } finally {
      setBorrando('')
    }
  }, [])

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    if (!items || !q) return items || []
    return items.filter((c) => (c.nombre + ' ' + c.texto + ' ' + c.post).toLowerCase().includes(q))
  }, [items, buscar])

  let contenido
  if (usuario === undefined || (usuario && usuario.verificado && moderador === null)) {
    contenido = <p className="suave">Cargando…</p>
  } else if (!usuario) {
    contenido = (
      <div className="tarjeta col">
        <p>Para moderar los comentarios, entra con tu cuenta. Solo pueden hacerlo los correos autorizados.</p>
        <div className="fila">
          <button type="button" className="primario" disabled={entrando || ocupado} onClick={hacerEntrar}>
            {entrando ? 'Abriendo Google…' : 'Entrar con Google'}
          </button>
        </div>
        <p className="suave">¿No usas Google? Entra con tu correo y contraseña:</p>
        <form
          className="col"
          onSubmit={(e) => {
            e.preventDefault()
            hacerEntrarConCorreo()
          }}
        >
          <input type="email" value={correo} onChange={(e) => setCorreo(e.currentTarget.value)} placeholder="Correo" autoComplete="username" />
          <input type="password" value={clave} onChange={(e) => setClave(e.currentTarget.value)} placeholder="Contraseña" autoComplete="current-password" />
          <div className="fila">
            <button type="submit" className="primario" disabled={ocupado || entrando}>
              {ocupado ? 'Entrando…' : 'Entrar con correo'}
            </button>
            <button type="button" disabled={ocupado || entrando} onClick={hacerRecuperar}>
              Crear o cambiar mi contraseña
            </button>
          </div>
        </form>
      </div>
    )
  } else if (!usuario.verificado) {
    contenido = (
      <div className="tarjeta atencion col">
        <p>
          Falta verificar el correo <b>{usuario.email}</b>. Es un paso de seguridad: así nadie puede usar tu correo sin ser tú.
        </p>
        <div className="fila">
          <button type="button" className="primario" disabled={ocupado} onClick={hacerVerificar}>
            Enviar correo de verificación
          </button>
          <button type="button" disabled={ocupado} onClick={hacerYaVerifique}>
            Ya lo verifiqué
          </button>
          <button type="button" onClick={hacerSalir}>
            Salir
          </button>
        </div>
      </div>
    )
  } else if (!moderador) {
    contenido = (
      <div className="tarjeta atencion col">
        <p>
          El correo <b>{usuario.email}</b> no está en la lista de moderadores. Si debería estarlo, agrégalo en Firebase (Firestore → ccd_admins) o entra con otra cuenta.
        </p>
        <div className="fila">
          <button type="button" onClick={hacerSalir}>
            Salir
          </button>
        </div>
      </div>
    )
  } else {
    contenido = (
      <div className="col" style={{gap: 16}}>
        <div className="fila entre">
          <span className="suave" style={{overflowWrap: 'anywhere'}}>
            {usuario.email}
          </span>
          <button type="button" className="chico" onClick={hacerSalir}>
            Salir
          </button>
        </div>
        <input type="search" value={buscar} onChange={(e) => setBuscar(e.currentTarget.value)} placeholder="Buscar por nombre, texto o artículo…" />
        {items === null ? (
          <p className="suave">Cargando comentarios…</p>
        ) : visibles.length === 0 ? (
          <div className="tarjeta">
            <p className="suave">{items.length === 0 ? 'Todavía no hay comentarios.' : 'Ningún comentario coincide con la búsqueda.'}</p>
          </div>
        ) : (
          <div className="col">
            {visibles.map((c) => (
              <Comentario
                key={c.id}
                c={c}
                confirmando={pendiente === c.id}
                borrando={borrando === c.id}
                alPedir={() => setPendiente(c.id)}
                alCancelar={() => setPendiente('')}
                alConfirmar={() => confirmarBorrar(c.id)}
              />
            ))}
          </div>
        )}
        {items && items.length >= limite ? (
          <div className="fila" style={{justifyContent: 'center'}}>
            <button type="button" onClick={() => setLimite(limite + POR_PAGINA)}>
              Ver más antiguos
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  const paleta = oscuro ? COLORES.oscuro : COLORES.claro
  const vars = {
    "--fg": paleta.fg, "--suave": paleta.suave, "--borde": paleta.borde, "--tarjeta": paleta.tarjeta, "--boton": paleta.boton, "--botonTxt": paleta.botonTxt,
    "--peligro": paleta.peligro, "--enlace": paleta.enlace, "--critico": paleta.critico, "--atencion": paleta.atencion, "--bien": paleta.bien, "--campo": paleta.campo,
  }

  return (
    <div className="ccd-com" ref={raiz} style={vars}>
      <style>{CSS}</style>
      <div className="ccd-in">
        <div className="fila">
          <h1>Comentarios</h1>
          {moderador ? <span className="insignia">En vivo{items ? ' · ' + items.length + (items.length >= limite ? '+' : '') : ''}</span> : null}
        </div>
        {error ? (
          <div className="tarjeta critico">
            <p style={{fontSize: 13}}>{error}</p>
          </div>
        ) : null}
        {aviso ? (
          <div className="tarjeta bien">
            <p style={{fontSize: 13}}>{aviso}</p>
          </div>
        ) : null}
        {contenido}
      </div>
    </div>
  )
}
