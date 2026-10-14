import {defineCliConfig} from 'sanity/cli'
import sitio from './generado/sitio.js'

export default defineCliConfig({
  api: {
    projectId: sitio.projectId,
    dataset: sitio.dataset,
  },
  deployment: {
    // La primera vez que corres "npm run deploy" eliges la dirección del editor
    // (p. ej. cafecondos → https://cafecondos.sanity.studio) y Sanity te da un
    // appId: pégalo en sanity.studioAppId de assets/js/config.js.
    ...(sitio.studioAppId ? {appId: sitio.studioAppId} : {}),
    // El editor publicado se actualiza solo a la última versión de Sanity.
    autoUpdates: true,
  },
})
