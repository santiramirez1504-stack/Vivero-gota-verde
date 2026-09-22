import { Router } from 'express'
import Product from '../models/Product.js'
import { requireAuth } from '../middleware/requireAuth.js'

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
    const product = await Product.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
      runValidators: true,
    })
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(product)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ ok: true })
  } catch (error) {
    res.status(400).json({ error: 'ID de producto inválido' })
  }
})

function sanitize(body) {
  const { name, category, price, unit, description, imageUrl, emoji } = body ?? {}
  return {
    name,
    category,
    price: Number(price),
    unit: unit || 'unidad',
    description: description || '',
    imageUrl: imageUrl || '',
    emoji: emoji || '🌿',
  }
}

export default router
