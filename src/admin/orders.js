import { getToken } from './session.js'
import { formatCOP } from '../utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const STATUSES = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'preparando', label: 'Preparando' },
  { id: 'listo', label: 'Listos para recojo/envío' },
  { id: 'entregado', label: 'Entregados' },
]

const boardEl = document.querySelector('[data-orders-board]')
const refreshButton = document.querySelector('[data-orders-refresh]')
const customersEl = document.querySelector('[data-customers-list]')
const customersResetButton = document.querySelector('[data-customers-reset]')
const customersSinceEl = document.querySelector('[data-customers-since]')

if (boardEl) {
  let orders = []

  loadOrders()
  loadCustomers()

  refreshButton?.addEventListener('click', () => {
    loadOrders()
    loadCustomers()
  })

  customersResetButton?.addEventListener('click', async () => {
    if (!window.confirm('¿Reiniciar el conteo de clientes frecuentes? Se borrará todo el historial acumulado hasta ahora (los pedidos en sí no se ven afectados).')) return

    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/orders/customers`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      loadCustomers()
    } catch {
      window.alert('No se pudo reiniciar el historial de clientes.')
    }
  })

  boardEl.addEventListener('change', (event) => {
    const select = event.target.closest('[data-status-select]')
    if (!select) return
    updateStatus(select.dataset.statusSelect, select.value)
  })

  boardEl.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-order]')
    if (!deleteButton) return
    deleteOrder(deleteButton.dataset.deleteOrder)
  })

  async function loadOrders() {
    boardEl.innerHTML = `<p class="col-span-full py-6 text-center text-sm text-verde-800/60">Cargando pedidos...</p>`
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      orders = await res.json()
      renderBoard()
    } catch {
      boardEl.innerHTML = `<p class="col-span-full py-6 text-center text-sm text-verde-800/60">No se pudieron cargar los pedidos.</p>`
    }
  }

  function renderBoard() {
    boardEl.innerHTML = STATUSES.map((status) => {
      const columnOrders = orders.filter((o) => o.status === status.id)
      return `
        <div class="rounded-xl bg-verde-50 p-3">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-sm font-semibold text-verde-900">${status.label}</h3>
            <span class="rounded-full bg-verde-200 px-2 py-0.5 text-xs font-semibold text-verde-800">${columnOrders.length}</span>
          </div>
          <div class="mt-3 space-y-3">
            ${columnOrders.length
              ? columnOrders.map((order) => renderCard(order)).join('')
              : `<p class="px-1 text-xs text-verde-800/50">Sin pedidos.</p>`}
          </div>
        </div>
      `
    }).join('')
  }

  function renderCard(order) {
    const itemsSummary = order.items.map((item) => `${item.qty}x ${item.name}`).join(', ')
    const date = new Date(order.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })

    return `
      <article class="rounded-lg border border-verde-100 bg-white p-3 shadow-sm">
        <p class="text-sm font-semibold text-verde-900">${order.customerName}</p>
        <p class="text-xs text-verde-800/60">${order.customerPhone} · ${date}</p>
        <p class="mt-2 text-xs text-verde-800/70">${itemsSummary}</p>
        <p class="mt-1 font-display text-sm font-bold text-verde-700">${formatCOP(order.total)}</p>
        <select data-status-select="${order._id}" class="mt-2 w-full rounded-lg border border-verde-200 px-2 py-1.5 text-xs focus:border-verde-500 focus:outline-none focus:ring-2 focus:ring-verde-200">
          ${STATUSES.map((s) => `<option value="${s.id}" ${s.id === order.status ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <button type="button" data-delete-order="${order._id}" class="mt-2 w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
          Eliminar
        </button>
      </article>
    `
  }

  async function updateStatus(id, status) {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      await loadOrders()
      await loadCustomers()
    } catch {
      window.alert('No se pudo actualizar el estado del pedido.')
      loadOrders()
    }
  }

  async function deleteOrder(id) {
    if (!window.confirm('¿Eliminar este pedido? Úsalo para pedidos cancelados o que no se van a completar. Esta acción no se puede deshacer.')) return

    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      await loadOrders()
      await loadCustomers()
    } catch {
      window.alert('No se pudo eliminar el pedido.')
    }
  }

  async function loadCustomers() {
    if (!customersEl) return
    customersEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Cargando...</p>`
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/orders/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const customers = await res.json()
      renderCustomers(customers)
    } catch {
      customersEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">No se pudo cargar el historial de clientes.</p>`
    }
  }

  function renderCustomers(customers) {
    if (!customersEl) return

    if (!customers.length) {
      customersEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Todavía no hay clientes registrados en este período.</p>`
      customersSinceEl?.classList.add('hidden')
      return
    }

    if (customersSinceEl) {
      const oldest = customers.reduce((min, c) => Math.min(min, new Date(c.trackingSince).getTime()), Infinity)
      const date = new Date(oldest).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })
      customersSinceEl.textContent = `Acumulando desde el ${date}. Usa "Reiniciar" para empezar un período nuevo.`
      customersSinceEl.classList.remove('hidden')
    }

    customersEl.innerHTML = customers.map((c) => `
      <div class="flex flex-wrap items-center gap-4 py-3">
        <div class="min-w-[10rem] flex-1">
          <p class="font-semibold text-verde-900">${c.name}</p>
          <p class="text-xs text-verde-800/60">${c.phone}</p>
        </div>
        <p class="text-sm text-verde-800/70">${c.totalOrders} pedido${c.totalOrders === 1 ? '' : 's'}</p>
        <p class="font-display font-bold text-verde-700">${formatCOP(c.totalSpent)} gastados</p>
      </div>
    `).join('')
  }
}
