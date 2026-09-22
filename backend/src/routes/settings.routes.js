import { Router } from 'express'
import Settings from '../models/Settings.js'
import { requireDevAuth } from '../middleware/requireDevAuth.js'

const router = Router()

router.get('/status', async (req, res) => {
  try {
    const settings = await getOrCreateSettings()
    res.json({ siteEnabled: settings.siteEnabled, message: settings.maintenanceMessage })
  } catch {
    // Si la base de datos falla, preferimos mostrar el sitio a dejarlo caído por error ajeno al kill switch
    res.json({ siteEnabled: true, message: '' })
  }
})

router.put('/status', requireDevAuth, async (req, res) => {
  const { siteEnabled, maintenanceMessage } = req.body ?? {}

  try {
    const settings = await getOrCreateSettings()
    if (typeof siteEnabled === 'boolean') settings.siteEnabled = siteEnabled
    if (typeof maintenanceMessage === 'string') settings.maintenanceMessage = maintenanceMessage
    await settings.save()
    res.json({ siteEnabled: settings.siteEnabled, message: settings.maintenanceMessage })
  } catch (error) {
    res.status(400).json({ error: 'No se pudo actualizar el estado del sitio' })
  }
})

async function getOrCreateSettings() {
  let settings = await Settings.findOne({ key: 'site' })
  if (!settings) settings = await Settings.create({ key: 'site' })
  return settings
}

export default router
