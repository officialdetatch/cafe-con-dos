// Convierte un título en la dirección del artículo:
// "¿Qué pasó en el Café?" → "que-paso-en-el-cafe"
export function slugify(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

// Fecha de hoy en la computadora de quien escribe (AAAA-MM-DD).
export function hoy() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
