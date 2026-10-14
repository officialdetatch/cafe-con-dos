import {useCallback, useEffect, useState} from 'react'
import {set, unset} from 'sanity'
import {Select, Stack, Text, TextInput} from '@sanity/ui'
import sitio from '../generado/sitio.js'

// La lista sale de la página publicada (data/episodios.json, lo genera GitHub
// al publicar el sitio), así siempre está al día sin volver a publicar el editor.
const URL_EPISODIOS = sitio.siteUrl + '/data/episodios.json'

export function EpisodioInput(props) {
  const {elementProps, onChange, value = '', readOnly} = props
  // null = cargando · [] = no se pudo cargar · [...] = lista
  const [episodios, setEpisodios] = useState(null)

  useEffect(() => {
    let vivo = true
    fetch(URL_EPISODIOS, {cache: 'no-store'})
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((lista) => vivo && setEpisodios(Array.isArray(lista) ? lista : []))
      .catch(() => vivo && setEpisodios([]))
    return () => {
      vivo = false
    }
  }, [])

  const cambiar = useCallback(
    (event) => {
      const nuevo = event.currentTarget.value.trim()
      onChange(nuevo ? set(nuevo) : unset())
    },
    [onChange],
  )

  // Si la página todavía no está en línea, se escribe el id a mano.
  if (episodios && episodios.length === 0) {
    return (
      <Stack space={3}>
        <TextInput {...elementProps} value={value} onChange={cambiar} readOnly={readOnly} placeholder="id-del-episodio" />
        <Text size={1} muted>
          No se pudo cargar la lista de episodios. Escribe el id del episodio: lo que va después de "?id=" en su link.
        </Text>
      </Stack>
    )
  }

  const conocido = !value || !episodios || episodios.some((e) => e.id === value)
  return (
    <Select {...elementProps} value={value} onChange={cambiar} disabled={!episodios || readOnly}>
      <option value="">{episodios ? '— Ninguno —' : 'Cargando episodios…'}</option>
      {(episodios || []).map((e) => (
        <option key={e.id} value={e.id}>
          {e.titulo}
          {e.fecha ? ' (' + e.fecha + ')' : ''}
          {e.ejemplo ? ' · ejemplo' : ''}
        </option>
      ))}
      {conocido ? null : <option value={value}>{value}</option>}
    </Select>
  )
}
