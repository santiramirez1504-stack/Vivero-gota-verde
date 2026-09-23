import { Router } from 'express'
import Order from '../models/Order.js'
import Loss from '../models/Loss.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.get('/sales-by-period', requireAuth, async (req, res) => {
  const period = ['day', 'week', 'month'].includes(req.query.period) ? req.query.period : 'month'

  const since = new Date()
  let dateFormat

  if (period === 'day') {
    since.setDate(since.getDate() - 13) // últimos 14 días
    dateFormat = '%Y-%m-%d'
  } else if (period === 'week') {
    since.setDate(since.getDate() - 7 * 7) // últimas 8 semanas
    dateFormat = '%G-W%V'
  } else {
    since.setMonth(since.getMonth() - 5) // últimos 6 meses
    dateFormat = '%Y-%m'
  }

  try {
    // Combina pedidos del catálogo (entregados) + facturas del punto de venta (pagadas)
    const results = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: 'entregado' } },
      { $project: { createdAt: 1, total: 1 } },
      {
        $unionWith: {
          coll: 'invoices',
          pipeline: [
            { $match: { createdAt: { $gte: since }, status: 'pagada' } },
            { $project: { createdAt: 1, total: 1 } },
          ],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    res.json(results.map((r) => ({ label: r._id, total: r.total, count: r.count })))
  } catch {
    res.status(500).json({ error: 'No se pudo generar el reporte de ventas' })
  }
})

router.get('/top-products', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50)

  try {
    const results = await Order.aggregate([
      { $match: { status: 'entregado' } },
      { $unwind: '$items' },
      {
        $project: {
          name: '$items.name',
          qty: '$items.qty',
          revenue: { $multiply: ['$items.qty', '$items.price'] },
        },
      },
      {
        $unionWith: {
          coll: 'invoices',
          pipeline: [
            { $match: { status: 'pagada' } },
            { $unwind: '$items' },
            {
              $project: {
                name: '$items.name',
                qty: '$items.quantity',
                revenue: '$items.subtotal',
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: '$name',
          qty: { $sum: '$qty' },
          revenue: { $sum: '$revenue' },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: limit },
    ])

    res.json(results.map((r) => ({ name: r._id, qty: r.qty, revenue: r.revenue })))
  } catch {
    res.status(500).json({ error: 'No se pudo generar el ranking de productos' })
  }
})

router.get('/losses-summary', requireAuth, async (req, res) => {
  try {
    const [soldAgg] = await Order.aggregate([
      { $match: { status: 'entregado' } },
      { $unwind: '$items' },
      { $project: { qty: '$items.qty' } },
      {
        $unionWith: {
          coll: 'invoices',
          pipeline: [
            { $match: { status: 'pagada' } },
            { $unwind: '$items' },
            { $project: { qty: '$items.quantity' } },
          ],
        },
      },
      { $group: { _id: null, totalQty: { $sum: '$qty' } } },
    ])
    const totalSold = soldAgg?.totalQty ?? 0

    const [lossAgg] = await Loss.aggregate([
      { $group: { _id: null, totalQty: { $sum: '$quantity' }, totalValue: { $sum: '$estimatedValue' } } },
    ])
    const totalLostQty = lossAgg?.totalQty ?? 0
    const totalLostValue = lossAgg?.totalValue ?? 0

    const byReason = await Loss.aggregate([
      { $group: { _id: '$reason', qty: { $sum: '$quantity' }, value: { $sum: '$estimatedValue' } } },
      { $sort: { qty: -1 } },
    ])

    const totalUnits = totalSold + totalLostQty
    const lossRate = totalUnits > 0 ? (totalLostQty / totalUnits) * 100 : 0

    res.json({
      totalSold,
      totalLostQty,
      totalLostValue,
      lossRate,
      byReason: byReason.map((r) => ({ reason: r._id, qty: r.qty, value: r.value })),
    })
  } catch {
    res.status(500).json({ error: 'No se pudo calcular la tasa de merma' })
  }
})

export default router
