import { Router } from 'express'
import InventoryItem from '../models/InventoryItem.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { toCOPInt } from '../utils/money.js'

const router = Router()

// Todo el inventario es de uso interno del vivero, ninguna ruta es pública
router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ commonName: 1 })
    res.json(items)
  } catch {
    res.status(500).json({ error: 'No se pudo obtener el inventario' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const item = await InventoryItem.create(sanitize(req.body))
    res.status(201).json(item)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
      runValidators: true,
    })
    if (!item) return res.status(404).json({ error: 'Especie no encontrada' })
    res.json(item)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id)
    if (!item) return res.status(404).json({ error: 'Especie no encontrada' })
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'ID inválido' })
  }
})

function sanitize(body) {
  const {
    commonName,
    scientificName,
    barcode,
    price,
    growthTime,
    wateringFrequency,
    fertilizerType,
    minStock,
    notes,
    stock,
  } = body ?? {}

  return {
    commonName,
    scientificName: scientificName || '',
    barcode: barcode || '',
    price: toCOPInt(price),
    growthTime: growthTime || '',
    wateringFrequency: wateringFrequency || '',
    fertilizerType: fertilizerType || '',
    minStock: Number(minStock) || 0,
    notes: notes || '',
    stock: {
      semillero: Number(stock?.semillero) || 0,
      crecimiento: Number(stock?.crecimiento) || 0,
      listoVenta: Number(stock?.listoVenta) || 0,
    },
  }
}

export default router
