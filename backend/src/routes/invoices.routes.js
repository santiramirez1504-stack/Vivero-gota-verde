import { Router } from 'express'
import mongoose from 'mongoose'
import Invoice from '../models/Invoice.js'
import InventoryItem from '../models/InventoryItem.js'
import Counter from '../models/Counter.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { toCOPInt } from '../utils/money.js'

const router = Router()

// El peso colombiano no usa decimales en el uso cotidiano
function roundCOP(value) {
  return Math.round(value)
}

async function nextInvoiceNumber(session) {
  const counter = await Counter.findOneAndUpdate(
    { key: 'invoice' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  )
  return counter.seq
}

// Historial de facturas: filtros por rango de fechas, método de pago, estado y cliente
router.get('/', requireAuth, async (req, res) => {
  const { from, to, paymentMethod, status, customer, page = 1, limit = 20 } = req.query

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
  if (paymentMethod) filter.paymentMethod = paymentMethod
  if (status) filter.status = status
  if (customer) filter.customerName = { $regex: String(customer).trim(), $options: 'i' }

  try {
    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100)

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Invoice.countDocuments(filter),
    ])

    res.json({ invoices, total, page: pageNum, pages: Math.max(Math.ceil(total / limitNum), 1) })
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las facturas' })
  }
})

// KPIs del día (y del mes) para el dashboard
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    // Al calcularse siempre desde el día 1 del mes actual, el conteo se "reinicia" solo
    // en cuanto cambia el mes — no hace falta ningún job ni reset manual.
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [[dayResult], [monthResult]] = await Promise.all([
      Invoice.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lte: dayEnd }, status: { $ne: 'anulada' } } },
        { $group: { _id: null, totalSales: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd }, status: { $ne: 'anulada' } } },
        { $group: { _id: null, totalSales: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
    ])

    const totalSales = dayResult?.totalSales ?? 0
    const count = dayResult?.count ?? 0
    const totalSalesMonth = monthResult?.totalSales ?? 0

    res.json({
      totalSalesToday: totalSales,
      invoiceCountToday: count,
      averageTicket: count > 0 ? totalSales / count : 0,
      totalSalesMonth,
    })
  } catch {
    res.status(500).json({ error: 'No se pudo calcular el resumen del día' })
  }
})

// Punto de venta: crea la factura, valida y descuenta stock, todo en una transacción
router.post('/', requireAuth, async (req, res) => {
  const { customerName, customerPhone, customerEmail, items, discountTotal, taxRate, payments, notes } = req.body ?? {}

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'La factura no tiene productos' })
  }
  if (!Array.isArray(payments) || !payments.length) {
    return res.status(400).json({ error: 'Debes registrar al menos un método de pago' })
  }

  const session = await mongoose.startSession()

  try {
    let invoice

    await session.withTransaction(async () => {
      const resolvedItems = []
      let subtotal = 0

      for (const raw of items) {
        const inventoryItem = await InventoryItem.findById(raw.inventoryItemId).session(session)
        if (!inventoryItem) {
          throw new Error(`Producto no encontrado: ${raw.name ?? raw.inventoryItemId}`)
        }

        const quantity = Number(raw.quantity)
        if (!(quantity > 0)) {
          throw new Error(`Cantidad inválida para "${inventoryItem.commonName}"`)
        }

        if (inventoryItem.stock.listoVenta < quantity) {
          throw new Error(`Stock insuficiente de "${inventoryItem.commonName}" (disponible: ${inventoryItem.stock.listoVenta})`)
        }

        const unitPrice = raw.unitPrice !== undefined ? toCOPInt(raw.unitPrice) : inventoryItem.price
        const discountPercent = Math.min(Math.max(Number(raw.discountPercent) || 0, 0), 100)
        const lineSubtotal = roundCOP(unitPrice * quantity * (1 - discountPercent / 100))

        resolvedItems.push({
          inventoryItemId: inventoryItem._id,
          name: inventoryItem.commonName,
          quantity,
          unitPrice,
          discountPercent,
          subtotal: lineSubtotal,
        })
        subtotal += lineSubtotal

        inventoryItem.stock.listoVenta -= quantity
        await inventoryItem.save({ session })
      }

      const appliedDiscount = Math.min(Math.max(toCOPInt(discountTotal), 0), subtotal)
      const appliedTaxRate = Math.max(Number(taxRate) || 0, 0)
      const taxTotal = roundCOP((subtotal - appliedDiscount) * (appliedTaxRate / 100))
      const total = roundCOP(subtotal - appliedDiscount + taxTotal)

      const sanitizedPayments = payments.map((p) => ({
        method: p.method,
        amount: toCOPInt(p.amount),
      }))
      const totalPaid = roundCOP(sanitizedPayments.reduce((sum, p) => sum + p.amount, 0))

      if (totalPaid < total) {
        throw new Error(`El pago registrado ($${totalPaid.toLocaleString('es-CO')}) es menor al total de la factura ($${total.toLocaleString('es-CO')})`)
      }

      const methods = new Set(sanitizedPayments.map((p) => p.method))
      const paymentMethod = methods.size > 1 ? 'mixto' : [...methods][0]

      const invoiceNumber = await nextInvoiceNumber(session)

      const [created] = await Invoice.create(
        [{
          invoiceNumber,
          cashier: req.admin?.usuario || '',
          customerName: customerName || 'Consumidor final',
          customerPhone: customerPhone || '',
          customerEmail: customerEmail || '',
          items: resolvedItems,
          subtotal,
          discountTotal: appliedDiscount,
          taxRate: appliedTaxRate,
          taxTotal,
          total,
          payments: sanitizedPayments,
          changeGiven: roundCOP(totalPaid - total),
          paymentMethod,
          notes: notes || '',
        }],
        { session },
      )

      invoice = created
    })

    res.status(201).json(invoice)
  } catch (error) {
    res.status(400).json({ error: error.message || 'No se pudo crear la factura' })
  } finally {
    session.endSession()
  }
})

// Anular factura: devuelve el stock descontado
router.put('/:id/anular', requireAuth, async (req, res) => {
  const session = await mongoose.startSession()

  try {
    let invoice

    await session.withTransaction(async () => {
      invoice = await Invoice.findById(req.params.id).session(session)
      if (!invoice) throw new Error('Factura no encontrada')
      if (invoice.status === 'anulada') throw new Error('La factura ya está anulada')

      for (const item of invoice.items) {
        await InventoryItem.findByIdAndUpdate(
          item.inventoryItemId,
          { $inc: { 'stock.listoVenta': item.quantity } },
          { session },
        )
      }

      invoice.status = 'anulada'
      await invoice.save({ session })
    })

    res.json(invoice)
  } catch (error) {
    res.status(400).json({ error: error.message || 'No se pudo anular la factura' })
  } finally {
    session.endSession()
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' })
    res.json(invoice)
  } catch {
    res.status(400).json({ error: 'ID inválido' })
  }
})

// Solo se pueden eliminar facturas ya anuladas (el stock ya fue devuelto al anular).
// Las pagadas/pendientes nunca se borran, para mantener el consecutivo y el historial auditable.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' })
    if (invoice.status !== 'anulada') {
      return res.status(400).json({ error: 'Solo se pueden eliminar facturas anuladas' })
    }

    await Invoice.deleteOne({ _id: invoice._id })
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'ID inválido' })
  }
})

export default router
