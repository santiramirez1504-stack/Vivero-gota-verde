import { Router } from 'express'
import multer from 'multer'
import { Readable } from 'node:stream'
import cloudinary from '../config/cloudinary.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const isAllowed = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')
    cb(isAllowed ? null : new Error('Solo se permiten imágenes o videos'), isAllowed)
  },
})

router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'No se pudo procesar el archivo' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' })
    }

    try {
      const result = await uploadBuffer(req.file.buffer)
      res.json({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      })
    } catch (error) {
      console.error('Error subiendo a Cloudinary:', error)
      res.status(502).json({ error: 'No se pudo subir el archivo a Cloudinary. Revisa las credenciales en el .env del backend.' })
    }
  })
})

router.delete('/', requireAuth, async (req, res) => {
  const { publicId, resourceType } = req.body ?? {}

  if (!publicId) {
    return res.status(400).json({ error: 'Falta el publicId del archivo a eliminar' })
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'video' ? 'video' : 'image',
    })
    res.json({ ok: true })
  } catch (error) {
    console.error('Error eliminando de Cloudinary:', error)
    res.status(502).json({ error: 'No se pudo eliminar el archivo' })
  }
})

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const folder = process.env.CLOUDINARY_FOLDER || 'vivero-gota-verde'
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => (error ? reject(error) : resolve(result)),
    )
    Readable.from(buffer).pipe(stream)
  })
}

export default router
