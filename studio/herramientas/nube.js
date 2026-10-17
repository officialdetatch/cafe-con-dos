// Conexión con Firebase para la pestaña "Comentarios" del editor.
// Igual que el sitio, carga Firebase desde el CDN de Google: no hay que instalar nada.
// Las llaves salen de config.js (comentarios.firebase) vía generado/sitio.js.
import sitio from '../generado/sitio.js'

const VERSION = '10.12.2'
const BASE = 'https://www.gstatic.com/firebasejs/' + VERSION + '/'
const COLECCION = (sitio.comentarios && sitio.comentarios.coleccion) || 'ccd_comentarios'
const ADMINS = 'ccd_admins'

let promesa
function cargar() {
  if (!promesa) {
    promesa = (async () => {
      const cfg = (sitio.comentarios && sitio.comentarios.firebase) || {}
      if (!cfg.projectId || !cfg.apiKey) {
        throw new Error('Faltan las llaves de Firebase en assets/js/config.js (comentarios.firebase).')
      }
      const [app, auth, fs] = await Promise.all([
        import(/* @vite-ignore */ BASE + 'firebase-app.js'),
        import(/* @vite-ignore */ BASE + 'firebase-auth.js'),
        import(/* @vite-ignore */ BASE + 'firebase-firestore.js'),
      ])
      const a = app.getApps().length ? app.getApp() : app.initializeApp(cfg)
      return {auth, fs, sesion: auth.getAuth(a), db: fs.getFirestore(a)}
    })()
    // Si falla, la próxima vez se vuelve a intentar.
    promesa.catch(() => {
      promesa = null
    })
  }
  return promesa
}

// Avisa cuando alguien entra o sale. Devuelve una función para dejar de escuchar.
export function alCambiarSesion(cuando, alFallar) {
  let parar = () => {}
  let cancelado = false
  cargar()
    .then(({auth, sesion}) => {
      if (cancelado) return
      parar = auth.onAuthStateChanged(sesion, (u) =>
        cuando(u ? {email: u.email || '', nombre: u.displayName || '', verificado: !!u.emailVerified} : null),
      )
    })
    .catch(alFallar)
  return () => {
    cancelado = true
    parar()
  }
}

export async function entrar() {
  const {auth, sesion} = await cargar()
  const proveedor = new auth.GoogleAuthProvider()
  proveedor.setCustomParameters({prompt: 'select_account'})
  await auth.signInWithPopup(sesion, proveedor)
}

// Entrar con correo y contraseña (para quien no usa Google).
export async function entrarConCorreo(email, clave) {
  const {auth, sesion} = await cargar()
  await auth.signInWithEmailAndPassword(sesion, String(email || '').trim(), String(clave || ''))
}

// Correo para crear o cambiar la contraseña.
export async function recuperar(email) {
  const {auth, sesion} = await cargar()
  await auth.sendPasswordResetEmail(sesion, String(email || '').trim())
}

// Los correos con contraseña empiezan "sin verificar": Firebase manda un enlace para confirmarlos.
export async function enviarVerificacion() {
  const {auth, sesion} = await cargar()
  if (!sesion.currentUser) throw new Error('Primero entra con tu correo.')
  await auth.sendEmailVerification(sesion.currentUser)
}

// Vuelve a preguntar a Firebase si ya se verificó y renueva el permiso (las reglas leen el permiso, no la pantalla).
export async function yaVerificado() {
  const {sesion} = await cargar()
  const u = sesion.currentUser
  if (!u) return false
  await u.reload()
  await u.getIdToken(true)
  return !!u.emailVerified
}

export async function salir() {
  const {auth, sesion} = await cargar()
  await auth.signOut(sesion)
}

// ¿Su correo está en la lista de moderadores? (documento ccd_admins/<correo>)
export async function esModerador(email) {
  const {fs, db} = await cargar()
  const d = await fs.getDoc(fs.doc(db, ADMINS, email))
  return d.exists()
}

// Comentarios en vivo, del más nuevo al más viejo. Devuelve una función para dejar de escuchar.
export function escuchar(limite, cuando, alFallar) {
  let parar = () => {}
  let cancelado = false
  cargar()
    .then(({fs, db}) => {
      if (cancelado) return
      const consulta = fs.query(fs.collection(db, COLECCION), fs.orderBy('fecha', 'desc'), fs.limit(limite))
      parar = fs.onSnapshot(
        consulta,
        (snap) =>
          cuando(
            snap.docs.map((d) => {
              const x = d.data()
              return {
                id: d.id,
                post: x.post || '',
                nombre: x.nombre || '',
                texto: x.texto || '',
                fecha: x.fecha && x.fecha.toDate ? x.fecha.toDate() : null,
              }
            }),
          ),
        alFallar,
      )
    })
    .catch(alFallar)
  return () => {
    cancelado = true
    parar()
  }
}

export async function borrar(id) {
  const {fs, db} = await cargar()
  await fs.deleteDoc(fs.doc(db, COLECCION, id))
}
