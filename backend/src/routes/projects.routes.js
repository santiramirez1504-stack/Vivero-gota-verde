import { Router } from 'express'
import Project from '../models/Project.js'
import cloudinary from '../config/cloudinary.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 })
    res.json(projects)
  } catch {
    res.status(500).json({ error: 'No se pudo obtener la galería de proyectos' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const project = await Project.create(sanitize(req.body))
    res.status(201).json(project)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Proyecto no encontrado' })

    const payload = sanitize(req.body)

    // Cualquier archivo que ya no esté en el media array nuevo se borra también de Cloudinary
    const keptPublicIds = new Set(payload.media.map((m) => m.publicId))
    const removed = existing.media.filter((m) => !keptPublicIds.has(m.publicId))
    await Promise.all(removed.map((m) => cloudinary.uploader.destroy(m.publicId, {
      resource_type: m.type === 'video' ? 'video' : 'image',
    }).catch(() => {})))

    const project = await Project.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    res.json(project)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id)
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

    await Promise.all(project.media.map((m) => cloudinary.uploader.destroy(m.publicId, {
      resource_type: m.type === 'video' ? 'video' : 'image',
    }).catch(() => {})))

    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'ID inválido' })
  }
})

function sanitize(body) {
  const { title, category, location, description, media } = body ?? {}
  return {
    title,
    category,
    location: location || '',
    description: description || '',
    media: Array.isArray(media)
      ? media
        .filter((m) => m && m.url && m.publicId && (m.type === 'image' || m.type === 'video'))
        .map((m) => ({ type: m.type, url: m.url, publicId: m.publicId }))
      : [],
  }
}

export default router
