import { Router } from 'express'
import HomeContent from '../models/HomeContent.js'
import cloudinary from '../config/cloudinary.js'
import { requireDevAuth } from '../middleware/requireDevAuth.js'

const router = Router()

// El sitio público consume esto para renderizar el Home de forma dinámica
router.get('/', async (req, res) => {
  try {
    const content = await getOrCreate()
    res.json(content)
  } catch {
    res.status(500).json({ error: 'No se pudo obtener el contenido del home' })
  }
})

// Exclusivo del desarrollador: el panel del cliente no toca el contenido/marca del sitio
router.put('/', requireDevAuth, async (req, res) => {
  try {
    const existing = await getOrCreate()
    const payload = sanitize(req.body)

    // Si se reemplazó el logo, la imagen del hero o el fondo, borrar el archivo viejo de Cloudinary
    if (existing.logoPublicId && existing.logoPublicId !== payload.logoPublicId) {
      await cloudinary.uploader.destroy(existing.logoPublicId).catch(() => {})
    }
    if (existing.hero.imagePublicId && existing.hero.imagePublicId !== payload.hero.imagePublicId) {
      await cloudinary.uploader.destroy(existing.hero.imagePublicId, { resource_type: 'image' }).catch(() => {})
    }
    if (existing.backgroundPublicId && existing.backgroundPublicId !== payload.backgroundPublicId) {
      await cloudinary.uploader.destroy(existing.backgroundPublicId, { resource_type: 'image' }).catch(() => {})
    }

    Object.assign(existing, payload)
    await existing.save()
    res.json(existing)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

async function getOrCreate() {
  let content = await HomeContent.findOne({ key: 'home' })
  if (!content) content = await HomeContent.create({ key: 'home' })
  return content
}

function sanitize(body) {
  const { colors, logoUrl, logoPublicId, backgroundUrl, backgroundPublicId, hero, stats, cta, footer } = body ?? {}
  return {
    colors: {
      primary: colors?.primary || '',
      textDark: colors?.textDark || '',
    },
    logoUrl: logoUrl || '',
    logoPublicId: logoPublicId || '',
    backgroundUrl: backgroundUrl || '',
    backgroundPublicId: backgroundPublicId || '',
    hero: {
      badge: hero?.badge || '',
      title: hero?.title || '',
      description: hero?.description || '',
      imageUrl: hero?.imageUrl || '',
      imagePublicId: hero?.imagePublicId || '',
      floatingTitle: hero?.floatingTitle || '',
      floatingDescription: hero?.floatingDescription || '',
    },
    stats: Array.isArray(stats)
      ? stats
        .filter((s) => s && s.value && s.label)
        .map((s) => ({ value: String(s.value), label: String(s.label) }))
      : [],
    cta: {
      title: cta?.title || '',
      description: cta?.description || '',
    },
    footer: {
      tagline: footer?.tagline || '',
      address: footer?.address || '',
      phone: footer?.phone || '',
      email: footer?.email || '',
      instagram: footer?.instagram || '',
      facebook: footer?.facebook || '',
      whatsapp: footer?.whatsapp || '',
    },
  }
}

export default router
