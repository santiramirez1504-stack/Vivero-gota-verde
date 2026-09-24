import { Router } from 'express'
import Expense, { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '../models/Expense.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { toCOPInt } from '../utils/money.js'

const router = Router()

// Historial de egresos: filtros por rango de fechas, categoría y método de pago
router.get('/', requireAuth, async (req, res) => {
  const { from, to, category, paymentMethod, page = 1, limit = 10 } = req.query

  const filter = {}
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) {
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      filter.createdAt.$lte = end
    }
  }
  if (category) filter.category = category
  if (paymentMethod) filter.paymentMethod = paymentMethod

  try {
    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100)

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Expense.countDocuments(filter),
    ])

    res.json({ expenses, total, page: pageNum, pages: Math.max(Math.ceil(total / limitNum), 1) })
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los egresos' })
  }
})

// Balance financiero del día y del mes (se "reinicia" solo porque siempre parte de la fecha actual)
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [[dayResult], [monthResult]] = await Promise.all([
      Expense.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ])

    res.json({
      totalExpensesToday: dayResult?.total ?? 0,
      totalExpensesMonth: monthResult?.total ?? 0,
    })
  } catch {
    res.status(500).json({ error: 'No se pudo calcular el resumen de egresos' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const { vendor, concept, category, paymentMethod, amount, notes } = req.body ?? {}

  if (!vendor || !concept || !EXPENSE_PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Revisa el proveedor, el concepto y el método de pago' })
  }
  const amountInt = toCOPInt(amount)
  if (!(amountInt > 0)) {
    return res.status(400).json({ error: 'El valor del gasto debe ser mayor a cero' })
  }

  try {
    const expense = await Expense.create({
      vendor: String(vendor).trim(),
      concept: String(concept).trim(),
      category: EXPENSE_CATEGORIES.includes(category) ? category : 'otro',
      paymentMethod,
      amount: amountInt,
      notes: notes ? String(notes).trim() : '',
    })
    res.status(201).json(expense)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id)
    if (!expense) return res.status(404).json({ error: 'Egreso no encontrado' })
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'ID inválido' })
  }
})

export default router
