import { Router } from 'express'
import Product from '../models/Product.js'
import cloudinary from '../config/cloudinary.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { toCOPInt } from '../utils/money.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener el catálogo' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const product = await Product.create(sanitize(req.body))
    res.status(201).json(product)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })

    const payload = sanitize(req.body)

    // Cualquier foto que ya no esté en el array nuevo se borra también de Cloudinary
    // (las fotos legado pegadas a mano no tienen publicId, así que no hay nada que borrar ahí)
    const keptPublicIds = new Set(payload.images.map((img) => img.publicId).filter(Boolean))
    const removed = existing.images.filter((img) => img.publicId && !keptPublicIds.has(img.publicId))
    await Promise.all(removed.map((img) => cloudinary.uploader.destroy(img.publicId, { resource_type: 'image' }).catch(() => {})))

    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    res.json(product)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

    await Promise.all((product.images || [])
      .filter((img) => img.publicId)
      .map((img) => cloudinary.uploader.destroy(img.publicId, { resource_type: 'image' }).catch(() => {})))

    res.json({ ok: true })
  } catch (error) {
    res.status(400).json({ error: 'ID de producto inválido' })
  }
})

function sanitize(body) {
  const { name, category, price, unit, stock, description, imageUrl, images, emoji } = body ?? {}
  return {
    name,
    category,
    price: toCOPInt(price),
    unit: unit || 'unidad',
    stock: stock === '' || stock === undefined || stock === null ? null : Math.max(0, Math.round(Number(stock)) || 0),
    description: description || '',
    imageUrl: imageUrl || '',
    images: Array.isArray(images)
      ? images
        .filter((img) => img && img.url)
        .slice(0, 2)
        .map((img) => ({ url: img.url, publicId: img.publicId || '' }))
      : [],
    emoji: emoji || '🌿',
  }
}

export default router
