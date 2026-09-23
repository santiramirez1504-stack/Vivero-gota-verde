import { Router } from 'express'
import Loss from '../models/Loss.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { toCOPInt } from '../utils/money.js'

const router = Router()

const REASONS = ['plagas', 'clima', 'accidente', 'otro']

router.get('/', requireAuth, async (req, res) => {
  try {
    const losses = await Loss.find().sort({ createdAt: -1 })
    res.json(losses)
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los registros de merma' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const { productName, quantity, reason, estimatedValue, notes } = req.body ?? {}

  if (!productName || !REASONS.includes(reason) || !(Number(quantity) > 0)) {
    return res.status(400).json({ error: 'Revisa el producto, la cantidad y el motivo de la pérdida' })
  }

  try {
    const loss = await Loss.create({
      productName: String(productName).trim(),
      quantity: Number(quantity),
      reason,
      estimatedValue: toCOPInt(estimatedValue),
      notes: notes ? String(notes).trim() : '',
    })
    res.status(201).json(loss)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const loss = await Loss.findByIdAndDelete(req.params.id)
    if (!loss) return res.status(404).json({ error: 'Registro no encontrado' })
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'ID inválido' })
  }
})

export default router
