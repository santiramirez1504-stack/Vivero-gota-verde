import { Router } from 'express'
import Order from '../models/Order.js'
import Customer from '../models/Customer.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

const STATUSES = ['pendiente', 'preparando', 'listo', 'entregado']

// El cliente del catálogo crea el pedido al enviar su cotización (sin login)
router.post('/', async (req, res) => {
  const { customerName, customerPhone, items } = req.body ?? {}

  if (!customerName || !customerPhone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Faltan datos del pedido' })
  }

  const sanitizedItems = items
    .filter((item) => item && item.name && Number(item.price) >= 0 && Number(item.qty) > 0)
    .map((item) => ({
      name: String(item.name),
      price: Number(item.price),
      qty: Number(item.qty),
    }))

  if (!sanitizedItems.length) {
    return res.status(400).json({ error: 'El pedido no tiene productos válidos' })
  }

  // El total se calcula en el servidor a partir de los items, nunca se confía en el total enviado por el cliente
  const total = sanitizedItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  try {
    const order = await Order.create({
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      items: sanitizedItems,
      total,
    })
    res.status(201).json(order)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Panel de administración: tablero de pedidos
router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 })
    res.json(orders)
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los pedidos' })
  }
})

// Panel de administración: historial de clientes frecuentes.
// Es un registro PERSISTENTE (colección Customer), no un cálculo en vivo sobre los pedidos:
// una vez que un pedido se marca "entregado" el cliente queda guardado aquí y ya no se mueve
// aunque el pedido original se edite o se borre después. Se reinicia manualmente (ver DELETE abajo).
router.get('/customers', requireAuth, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ totalOrders: -1, totalSpent: -1 })
    res.json(customers.map((c) => ({
      phone: c.phone,
      name: c.name,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      lastOrderAt: c.lastOrderAt,
      trackingSince: c.createdAt,
    })))
  } catch {
    res.status(500).json({ error: 'No se pudo obtener el historial de clientes' })
  }
})

// Reinicia el conteo de clientes frecuentes (pensado para usarse semanalmente, a criterio del admin)
router.delete('/customers', requireAuth, async (req, res) => {
  try {
    await Customer.deleteMany({})
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'No se pudo reiniciar el historial de clientes' })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  const { status } = req.body ?? {}

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }

  try {
    const existing = await Order.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' })

    existing.status = status

    // Solo se acumula la PRIMERA vez que un pedido llega a "entregado" en toda su vida
    // (no basta con mirar el estado anterior: si pasa a otro estado y vuelve a "entregado"
    // no debe volver a sumar) — de ahí la bandera countedForCustomer en vez de comparar estados.
    if (status === 'entregado' && !existing.countedForCustomer) {
      existing.countedForCustomer = true
      await Customer.findOneAndUpdate(
        { phone: existing.customerPhone },
        {
          $set: { name: existing.customerName, lastOrderAt: new Date() },
          $inc: { totalOrders: 1, totalSpent: existing.total },
        },
        { upsert: true },
      )
    }

    await existing.save()

    res.json(existing)
  } catch {
    res.status(400).json({ error: 'No se pudo actualizar el pedido' })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'ID de pedido inválido' })
  }
})

export default router
