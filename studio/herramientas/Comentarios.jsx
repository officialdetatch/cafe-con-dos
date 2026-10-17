import {useCallback, useEffect, useMemo, useState} from 'react'
import {Badge, Box, Button, Card, Flex, Heading, Spinner, Stack, Text, TextInput} from '@sanity/ui'
import sitio from '../generado/sitio.js'
import {alCambiarSesion, borrar, enviarVerificacion, entrar, entrarConCorreo, escuchar, esModerador, recuperar, salir, yaVerificado} from './nube.js'

const POR_PAGINA = 50

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
    <Card padding={3} radius={3} border tone={confirmando ? 'critical' : 'default'}>
      <Stack space={3}>
        <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
          <Stack space={2}>
            <Text weight="semibold">{c.nombre}</Text>
            <Text size={1} muted>
              {fechaCorta(c.fecha)}
            </Text>
          </Stack>
          <Text size={1}>
            <a href={enlace} target="_blank" rel="noopener noreferrer">
              Ver artículo ↗
            </a>
          </Text>
        </Flex>
        <Text size={1} muted style={{wordBreak: 'break-all'}}>
          {c.post}
        </Text>
        <Text style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{c.texto}</Text>
        {confirmando ? (
          <Flex gap={2} align="center" wrap="wrap">
            <Text size={1} weight="semibold">
              ¿Borrar este comentario?
            </Text>
            <Button text="Sí, borrar" tone="critical" fontSize={1} padding={3} loading={borrando} disabled={borrando} onClick={alConfirmar} />
            <Button text="Cancelar" mode="ghost" fontSize={1} padding={3} disabled={borrando} onClick={alCancelar} />
          </Flex>
        ) : (
          <Flex>
            <Button text="Borrar" tone="critical" mode="ghost" fontSize={1} padding={3} onClick={alPedir} />
          </Flex>
        )}
      </Stack>
    </Card>
  )
}

export function Comentarios() {
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
  if (usuario === undefined) {
    contenido = (
      <Flex justify="center" padding={5}>
        <Spinner muted />
      </Flex>
    )
  } else if (!usuario) {
    contenido = (
      <Card padding={4} radius={3} border>
        <Stack space={4}>
          <Text>Para moderar los comentarios, entra con tu cuenta. Solo pueden hacerlo los correos autorizados.</Text>
          <Flex>
            <Button text="Entrar con Google" tone="primary" padding={4} loading={entrando} disabled={entrando || ocupado} onClick={hacerEntrar} />
          </Flex>
          <Text size={1} muted>
            ¿No usas Google? Entra con tu correo y contraseña:
          </Text>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              hacerEntrarConCorreo()
            }}
          >
            <Stack space={3}>
              <TextInput type="email" value={correo} onChange={(e) => setCorreo(e.currentTarget.value)} placeholder="Correo" autoComplete="username" />
              <TextInput type="password" value={clave} onChange={(e) => setClave(e.currentTarget.value)} placeholder="Contraseña" autoComplete="current-password" />
              <Flex gap={2} wrap="wrap">
                <Button type="submit" text="Entrar con correo" padding={3} loading={ocupado} disabled={ocupado || entrando} />
                <Button text="Crear o cambiar mi contraseña" mode="ghost" fontSize={1} padding={3} disabled={ocupado || entrando} onClick={hacerRecuperar} />
              </Flex>
            </Stack>
          </form>
        </Stack>
      </Card>
    )
  } else if (!usuario.verificado) {
    contenido = (
      <Card padding={4} radius={3} border tone="caution">
        <Stack space={4}>
          <Text>
            Falta verificar el correo <b>{usuario.email}</b>. Es un paso de seguridad: así nadie puede usar tu correo sin ser tú.
          </Text>
          <Flex gap={2} wrap="wrap">
            <Button text="Enviar correo de verificación" tone="primary" padding={3} loading={ocupado} disabled={ocupado} onClick={hacerVerificar} />
            <Button text="Ya lo verifiqué" mode="ghost" padding={3} disabled={ocupado} onClick={hacerYaVerifique} />
            <Button text="Salir" mode="ghost" padding={3} onClick={hacerSalir} />
          </Flex>
        </Stack>
      </Card>
    )
  } else if (moderador === null) {
    contenido = (
      <Flex justify="center" padding={5}>
        <Spinner muted />
      </Flex>
    )
  } else if (!moderador) {
    contenido = (
      <Card padding={4} radius={3} border tone="caution">
        <Stack space={4}>
          <Text>
            El correo <b>{usuario.email}</b> no está en la lista de moderadores. Si debería estarlo, agrégalo en Firebase (Firestore → ccd_admins) o entra con otra cuenta.
          </Text>
          <Flex>
            <Button text="Salir" mode="ghost" onClick={hacerSalir} />
          </Flex>
        </Stack>
      </Card>
    )
  } else {
    contenido = (
      <Stack space={4}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <Text size={1} muted style={{overflowWrap: 'anywhere'}}>
            {usuario.email}
          </Text>
          <Button text="Salir" mode="ghost" fontSize={1} padding={2} onClick={hacerSalir} />
        </Flex>
        <TextInput value={buscar} onChange={(e) => setBuscar(e.currentTarget.value)} placeholder="Buscar por nombre, texto o artículo…" />
        {items === null ? (
          <Flex justify="center" padding={5}>
            <Spinner muted />
          </Flex>
        ) : visibles.length === 0 ? (
          <Card padding={4} radius={3} border>
            <Text muted>{items.length === 0 ? 'Todavía no hay comentarios.' : 'Ningún comentario coincide con la búsqueda.'}</Text>
          </Card>
        ) : (
          <Stack space={3}>
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
          </Stack>
        )}
        {items && items.length >= limite ? (
          <Flex justify="center">
            <Button text="Ver más antiguos" mode="ghost" onClick={() => setLimite(limite + POR_PAGINA)} />
          </Flex>
        ) : null}
      </Stack>
    )
  }

  return (
    <Card style={{height: '100%', overflow: 'auto'}}>
      <Box padding={[3, 4, 5]}>
        <Stack space={4} style={{maxWidth: 720, margin: '0 auto'}}>
          <Flex align="center" gap={3} wrap="wrap">
            <Heading as="h1" size={2}>
              Comentarios
            </Heading>
            {moderador ? (
              <Badge tone="positive" fontSize={0}>
                En vivo{items ? ' · ' + items.length + (items.length >= limite ? '+' : '') : ''}
              </Badge>
            ) : null}
          </Flex>
          {error ? (
            <Card padding={3} radius={2} tone="critical" border>
              <Text size={1}>{error}</Text>
            </Card>
          ) : null}
          {aviso ? (
            <Card padding={3} radius={2} tone="positive" border>
              <Text size={1}>{aviso}</Text>
            </Card>
          ) : null}
          {contenido}
        </Stack>
      </Box>
    </Card>
  )
}
