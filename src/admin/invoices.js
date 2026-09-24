import { getToken } from './session.js'
import { formatCOP, parseCOPInput, attachCurrencyMask } from '../utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi_daviplata: 'Nequi/Daviplata',
  mixto: 'Mixto',
}

const STATUS_LABELS = {
  pagada: 'Pagada',
  anulada: 'Anulada',
  pendiente: 'Pendiente',
}

const kpisEl = document.querySelector('[data-invoice-kpis]')
const newToggleButton = document.querySelector('[data-invoice-new-toggle]')
const formWrapper = document.querySelector('[data-invoice-form-wrapper]')

const customerNameInput = document.querySelector('[data-pos-customer-name]')
const customerPhoneInput = document.querySelector('[data-pos-customer-phone]')
const customerEmailInput = document.querySelector('[data-pos-customer-email]')
const customerSuggestionsList = document.querySelector('[data-pos-customer-list]')

const searchInput = document.querySelector('[data-pos-search]')
const searchResultsEl = document.querySelector('[data-pos-search-results]')
const cartBodyEl = document.querySelector('[data-pos-cart-body]')

const discountInput = document.querySelector('[data-pos-discount]')
const discountTypeInput = document.querySelector('[data-pos-discount-type]')
const taxInput = document.querySelector('[data-pos-tax]')
const paymentsEl = document.querySelector('[data-pos-payments]')

const summarySubtotalEl = document.querySelector('[data-pos-summary-subtotal]')
const summaryDiscountEl = document.querySelector('[data-pos-summary-discount]')
const summaryTaxEl = document.querySelector('[data-pos-summary-tax]')
const summaryTotalEl = document.querySelector('[data-pos-summary-total]')
const summaryPaidEl = document.querySelector('[data-pos-summary-paid]')
const summaryChangeLabelEl = document.querySelector('[data-pos-summary-change-label]')
const summaryChangeEl = document.querySelector('[data-pos-summary-change]')

const submitButton = document.querySelector('[data-pos-submit]')
const posStatusEl = document.querySelector('[data-pos-status]')

const filtersFrom = document.querySelector('[data-filter-from]')
const filtersTo = document.querySelector('[data-filter-to]')
const filtersPayment = document.querySelector('[data-filter-payment]')
const filtersStatus = document.querySelector('[data-filter-status]')
const filtersCustomer = document.querySelector('[data-filter-customer]')

const tableBodyEl = document.querySelector('[data-invoice-table-body]')
const paginationEl = document.querySelector('[data-invoice-pagination]')

const detailEl = document.querySelector('[data-invoice-detail]')
const detailOverlay = document.querySelector('[data-invoice-detail-overlay]')
const detailClose = document.querySelector('[data-invoice-detail-close]')
const detailBody = document.querySelector('[data-invoice-detail-body]')

if (kpisEl && tableBodyEl) {
  let inventoryItems = []
  let cart = [] // { inventoryItemId, name, unitPrice, availableStock, quantity, discountPercent }
  let payments = []
  let currentPage = 1

  init()

  async function init() {
    attachCurrencyMask(discountInput)
    loadKpis()
    loadInventoryForSearch()
    loadCustomerSuggestions()
    addPaymentRow()
    renderCart()
    loadInvoices(1)
  }

  newToggleButton?.addEventListener('click', () => {
    const isHidden = formWrapper.classList.contains('hidden')
    formWrapper.classList.toggle('hidden')
    newToggleButton.textContent = isHidden ? 'Cerrar' : '+ Nueva factura'
  })

  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase()
    if (!query) {
      searchResultsEl.classList.add('hidden')
      return
    }
    const matches = inventoryItems.filter((item) => (
      item.commonName.toLowerCase().includes(query)
      || item.scientificName?.toLowerCase().includes(query)
      || (item.barcode && item.barcode.toLowerCase() === query)
    )).slice(0, 8)
    renderSearchResults(matches)
  })

  document.addEventListener('click', (event) => {
    if (!searchResultsEl?.contains(event.target) && event.target !== searchInput) {
      searchResultsEl?.classList.add('hidden')
    }
  })

  searchResultsEl?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-to-cart]')
    if (!button) return
    addToCart(button.dataset.addToCart)
    searchInput.value = ''
    searchResultsEl.classList.add('hidden')
    searchInput.focus()
  })

  cartBodyEl?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-cart-remove]')
    if (removeButton) {
      cart = cart.filter((line) => line.inventoryItemId !== removeButton.dataset.cartRemove)
      renderCart()
    }
  })

  cartBodyEl?.addEventListener('input', (event) => {
    const qtyInput = event.target.closest('[data-cart-qty]')
    const discountInputEl = event.target.closest('[data-cart-discount]')

    if (qtyInput) {
      const line = cart.find((l) => l.inventoryItemId === qtyInput.dataset.cartQty)
      if (!line) return
      let qty = Number(qtyInput.value)
      if (qty > line.availableStock) {
        qty = line.availableStock
        qtyInput.value = qty
        showPosStatus(`Solo hay ${line.availableStock} unidades disponibles de "${line.name}".`, 'error')
      }
      line.quantity = Math.max(qty, 1)
      updateCartLine(line.inventoryItemId)
    }

    if (discountInputEl) {
      const line = cart.find((l) => l.inventoryItemId === discountInputEl.dataset.cartDiscount)
      if (!line) return
      line.discountPercent = Math.min(Math.max(Number(discountInputEl.value) || 0, 0), 100)
      updateCartLine(line.inventoryItemId)
    }
  })

  discountInput?.addEventListener('input', renderCart)
  discountTypeInput?.addEventListener('change', () => {
    applyDiscountInputMode()
    renderCart()
  })
  taxInput?.addEventListener('input', renderCart)

  document.querySelector('[data-pos-add-payment]')?.addEventListener('click', () => {
    addPaymentRow()
    renderCart()
  })

  paymentsEl?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-payment-remove]')
    if (!removeButton) return
    payments = payments.filter((p) => p.id !== removeButton.dataset.paymentRemove)
    renderPayments()
    renderCart()
  })

  paymentsEl?.addEventListener('input', (event) => {
    const amountInput = event.target.closest('[data-payment-amount]')
    if (!amountInput) return
    const payment = payments.find((p) => p.id === amountInput.dataset.paymentAmount)
    if (payment) payment.amount = parseCOPInput(amountInput.value)
    renderCart()
  })

  paymentsEl?.addEventListener('change', (event) => {
    const methodSelect = event.target.closest('[data-payment-method]')
    if (!methodSelect) return
    const payment = payments.find((p) => p.id === methodSelect.dataset.paymentMethod)
    if (payment) payment.method = methodSelect.value
  })

  submitButton?.addEventListener('click', submitInvoice)

  ;[filtersFrom, filtersTo, filtersPayment, filtersStatus].forEach((el) => {
    el?.addEventListener('change', () => loadInvoices(1))
  })
  let customerFilterTimeout
  filtersCustomer?.addEventListener('input', () => {
    clearTimeout(customerFilterTimeout)
    customerFilterTimeout = setTimeout(() => loadInvoices(1), 350)
  })

  tableBodyEl.addEventListener('click', async (event) => {
    const viewButton = event.target.closest('[data-view-invoice]')
    const voidButton = event.target.closest('[data-void-invoice]')
    const deleteButton = event.target.closest('[data-delete-invoice]')

    if (viewButton) openDetail(viewButton.dataset.viewInvoice)

    if (voidButton) {
      if (!window.confirm('¿Anular esta factura? El stock vendido se devolverá al inventario.')) return
      await voidInvoice(voidButton.dataset.voidInvoice)
    }

    if (deleteButton) {
      if (!window.confirm(`¿Eliminar definitivamente la factura #${deleteButton.dataset.deleteInvoiceNumber}? Esta acción no se puede deshacer.`)) return
      await deleteInvoice(deleteButton.dataset.deleteInvoice)
    }
  })

  detailClose?.addEventListener('click', closeDetail)
  detailOverlay?.addEventListener('click', closeDetail)
  detailBody?.addEventListener('click', async (event) => {
    const voidButton = event.target.closest('[data-detail-void]')
    const deleteButton = event.target.closest('[data-detail-delete]')

    if (voidButton) {
      if (!window.confirm('¿Anular esta factura? El stock vendido se devolverá al inventario.')) return
      await voidInvoice(voidButton.dataset.detailVoid)
      closeDetail()
    }

    if (deleteButton) {
      if (!window.confirm(`¿Eliminar definitivamente la factura #${deleteButton.dataset.detailDeleteNumber}? Esta acción no se puede deshacer.`)) return
      await deleteInvoice(deleteButton.dataset.detailDelete)
      closeDetail()
    }
  })

  // ---------- KPIs ----------

  async function loadKpis() {
    kpisEl.innerHTML = `<p class="sm:col-span-2 lg:col-span-4 text-sm text-verde-800/60">Cargando...</p>`
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/invoices/summary`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      kpisEl.innerHTML = `
        <div class="rounded-xl bg-verde-50 p-4">
          <p class="text-xs font-semibold uppercase text-verde-600">Ventas de hoy</p>
          <p class="mt-1 font-display text-2xl font-bold text-verde-900">${formatCOP(data.totalSalesToday)}</p>
        </div>
        <div class="rounded-xl bg-verde-50 p-4">
          <p class="text-xs font-semibold uppercase text-verde-600">Facturas generadas hoy</p>
          <p class="mt-1 font-display text-2xl font-bold text-verde-900">${data.invoiceCountToday}</p>
        </div>
        <div class="rounded-xl bg-verde-50 p-4">
          <p class="text-xs font-semibold uppercase text-verde-600">Ticket promedio</p>
          <p class="mt-1 font-display text-2xl font-bold text-verde-900">${formatCOP(data.averageTicket)}</p>
        </div>
        <div class="rounded-xl bg-verde-50 p-4">
          <p class="text-xs font-semibold uppercase text-verde-600">Ventas del mes</p>
          <p class="mt-1 font-display text-2xl font-bold text-verde-900">${formatCOP(data.totalSalesMonth)}</p>
        </div>
      `
    } catch {
      kpisEl.innerHTML = `<p class="sm:col-span-2 lg:col-span-4 text-sm text-verde-800/60">No se pudieron cargar los indicadores.</p>`
    }
  }

  // ---------- Buscador de productos ----------

  async function loadInventoryForSearch() {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      inventoryItems = await res.json()
    } catch {
      inventoryItems = []
    }
  }

  function renderSearchResults(matches) {
    if (!matches.length) {
      searchResultsEl.innerHTML = `<p class="px-4 py-3 text-sm text-verde-800/60">Sin resultados.</p>`
      searchResultsEl.classList.remove('hidden')
      return
    }

    searchResultsEl.innerHTML = matches.map((item) => {
      const inCart = cart.find((l) => l.inventoryItemId === item._id)
      const remaining = item.stock.listoVenta - (inCart?.quantity ?? 0)
      const outOfStock = remaining <= 0
      return `
        <button type="button" data-add-to-cart="${item._id}" ${outOfStock ? 'disabled' : ''}
          class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-verde-50 disabled:cursor-not-allowed disabled:opacity-50">
          <span>
            <span class="font-medium text-verde-900">${item.commonName}</span>
            <span class="block text-xs text-verde-800/60">${formatCOP(item.price)} · disponible: ${remaining}</span>
          </span>
          ${outOfStock ? '<span class="text-xs font-semibold text-red-600">Sin stock</span>' : ''}
        </button>
      `
    }).join('')
    searchResultsEl.classList.remove('hidden')
  }

  function addToCart(inventoryItemId) {
    const item = inventoryItems.find((i) => i._id === inventoryItemId)
    if (!item) return

    const existing = cart.find((l) => l.inventoryItemId === inventoryItemId)
    if (existing) {
      if (existing.quantity >= item.stock.listoVenta) {
        showPosStatus(`No hay más stock disponible de "${item.commonName}".`, 'error')
        return
      }
      existing.quantity += 1
    } else {
      if (item.stock.listoVenta < 1) {
        showPosStatus(`"${item.commonName}" no tiene stock disponible.`, 'error')
        return
      }
      cart.push({
        inventoryItemId: item._id,
        name: item.commonName,
        unitPrice: item.price,
        availableStock: item.stock.listoVenta,
        quantity: 1,
        discountPercent: 0,
      })
    }
    renderCart()
  }

  // ---------- Carrito / totales ----------

  function renderCart() {
    if (!cart.length) {
      cartBodyEl.innerHTML = `
        <tr data-pos-cart-empty>
          <td colspan="6" class="py-4 text-center text-sm text-verde-800/50">Busca un producto para agregarlo a la venta.</td>
        </tr>
      `
    } else {
      cartBodyEl.innerHTML = cart.map((line) => {
        const subtotal = line.unitPrice * line.quantity * (1 - line.discountPercent / 100)
        return `
          <tr class="border-b border-verde-100" data-cart-row="${line.inventoryItemId}">
            <td class="py-2 pr-2">${line.name}</td>
            <td class="py-2 pr-2">
              <input type="number" min="1" max="${line.availableStock}" value="${line.quantity}" data-cart-qty="${line.inventoryItemId}"
                class="w-16 rounded-lg border border-verde-200 px-2 py-1 text-sm" />
            </td>
            <td class="py-2 pr-2">${formatCOP(line.unitPrice)}</td>
            <td class="py-2 pr-2">
              <input type="number" min="0" max="100" value="${line.discountPercent}" data-cart-discount="${line.inventoryItemId}"
                class="w-16 rounded-lg border border-verde-200 px-2 py-1 text-sm" />
            </td>
            <td class="py-2 pr-2 font-semibold text-verde-900" data-cart-subtotal="${line.inventoryItemId}">${formatCOP(subtotal)}</td>
            <td class="py-2">
              <button type="button" data-cart-remove="${line.inventoryItemId}" class="text-red-500 hover:text-red-700" aria-label="Quitar">✕</button>
            </td>
          </tr>
        `
      }).join('')
    }

    updateSummary()
  }

  // Actualiza solo el subtotal de una fila (sin redibujar la tabla completa) para
  // que el input de cantidad/descuento no pierda el foco mientras el usuario escribe.
  function updateCartLine(inventoryItemId) {
    const line = cart.find((l) => l.inventoryItemId === inventoryItemId)
    if (!line) return
    const subtotal = line.unitPrice * line.quantity * (1 - line.discountPercent / 100)
    const subtotalEl = cartBodyEl.querySelector(`[data-cart-subtotal="${inventoryItemId}"]`)
    if (subtotalEl) subtotalEl.textContent = formatCOP(subtotal)
    updateSummary()
  }

  function applyDiscountInputMode() {
    if (!discountInput || !discountTypeInput) return
    if (discountTypeInput.value === 'fixed') {
      const currentValue = parseCOPInput(discountInput.value)
      discountInput.type = 'text'
      discountInput.setAttribute('inputmode', 'numeric')
      discountInput.value = currentValue ? currentValue.toLocaleString('es-CO') : ''
    } else {
      const currentValue = parseCOPInput(discountInput.value)
      discountInput.type = 'number'
      discountInput.removeAttribute('inputmode')
      discountInput.value = currentValue || 0
    }
  }

  function calculateTotals() {
    const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity * (1 - line.discountPercent / 100), 0)

    const discountType = discountTypeInput?.value ?? 'percent'
    const discountRaw = discountType === 'fixed' ? parseCOPInput(discountInput?.value) : (Number(discountInput?.value) || 0)
    const discountTotal = Math.min(discountType === 'percent' ? subtotal * (discountRaw / 100) : discountRaw, subtotal)

    const taxRate = Number(taxInput?.value) || 0
    const taxTotal = (subtotal - discountTotal) * (taxRate / 100)

    const total = subtotal - discountTotal + taxTotal
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    return { subtotal, discountTotal, taxRate, taxTotal, total, totalPaid }
  }

  function updateSummary() {
    const { subtotal, discountTotal, taxTotal, total, totalPaid } = calculateTotals()

    if (summarySubtotalEl) summarySubtotalEl.textContent = formatCOP(subtotal)
    if (summaryDiscountEl) summaryDiscountEl.textContent = `-${formatCOP(discountTotal)}`
    if (summaryTaxEl) summaryTaxEl.textContent = formatCOP(taxTotal)
    if (summaryTotalEl) summaryTotalEl.textContent = formatCOP(total)
    if (summaryPaidEl) summaryPaidEl.textContent = formatCOP(totalPaid)

    const diff = totalPaid - total
    if (summaryChangeLabelEl && summaryChangeEl) {
      summaryChangeLabelEl.textContent = diff >= 0 ? 'Vuelto' : 'Falta por pagar'
      summaryChangeEl.textContent = formatCOP(Math.abs(diff))
      summaryChangeEl.classList.toggle('text-red-600', diff < 0)
      summaryChangeEl.classList.toggle('text-verde-900', diff >= 0)
    }
  }

  // ---------- Pagos ----------

  function addPaymentRow() {
    const { total, totalPaid } = calculateTotals()
    const suggested = Math.max(total - totalPaid, 0)
    payments.push({ id: crypto.randomUUID(), method: 'efectivo', amount: suggested || 0 })
    renderPayments()
  }

  function renderPayments() {
    if (!paymentsEl) return
    paymentsEl.innerHTML = payments.map((p) => `
      <div class="flex items-center gap-2">
        <select data-payment-method="${p.id}" class="rounded-lg border border-verde-200 px-2 py-1.5 text-sm">
          ${Object.entries(PAYMENT_LABELS).filter(([key]) => key !== 'mixto').map(([value, label]) => `
            <option value="${value}" ${p.method === value ? 'selected' : ''}>${label}</option>
          `).join('')}
        </select>
        <input type="text" inputmode="numeric" value="${p.amount ? Number(p.amount).toLocaleString('es-CO') : ''}" data-payment-amount="${p.id}"
          class="w-28 rounded-lg border border-verde-200 px-2 py-1.5 text-sm" />
        ${payments.length > 1 ? `<button type="button" data-payment-remove="${p.id}" class="text-red-500 hover:text-red-700">✕</button>` : ''}
      </div>
    `).join('')
    paymentsEl.querySelectorAll('[data-payment-amount]').forEach(attachCurrencyMask)
  }

  // ---------- Clientes rápidos ----------

  async function loadCustomerSuggestions() {
    if (!customerSuggestionsList) return
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/orders/customers`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const customers = await res.json()
      customerSuggestionsList.innerHTML = customers.map((c) => `<option value="${c.name}">${c.phone}</option>`).join('')
    } catch {
      // no bloquea el uso del POS si no se pueden cargar sugerencias
    }
  }

  // ---------- Registrar factura ----------

  async function submitInvoice() {
    hidePosStatus()

    if (!cart.length) {
      showPosStatus('Agrega al menos un producto a la factura.', 'error')
      return
    }

    const { totalPaid, total } = calculateTotals()
    if (totalPaid < total - 0.01) {
      showPosStatus(`El pago registrado (${formatCOP(totalPaid)}) es menor al total (${formatCOP(total)}).`, 'error')
      return
    }

    const token = getToken()
    submitButton.disabled = true

    try {
      const res = await fetch(`${API_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: customerNameInput.value.trim() || 'Consumidor final',
          customerPhone: customerPhoneInput.value.trim(),
          customerEmail: customerEmailInput.value.trim(),
          items: cart.map((line) => ({
            inventoryItemId: line.inventoryItemId,
            quantity: line.quantity,
            discountPercent: line.discountPercent,
          })),
          discountTotal: calculateTotals().discountTotal,
          taxRate: Number(taxInput?.value) || 0,
          payments: payments.map((p) => ({ method: p.method, amount: Number(p.amount) || 0 })),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showPosStatus(data.error || 'No se pudo registrar la factura', 'error')
        return
      }

      showPosStatus(`Factura #${data.invoiceNumber} registrada correctamente.`, 'success')
      resetPos()
      loadKpis()
      loadInventoryForSearch()
      loadCustomerSuggestions()
      loadInvoices(1)
    } catch {
      showPosStatus('No se pudo conectar con el servidor.', 'error')
    } finally {
      submitButton.disabled = false
    }
  }

  function resetPos() {
    cart = []
    payments = []
    customerNameInput.value = ''
    customerPhoneInput.value = ''
    customerEmailInput.value = ''
    discountTypeInput.value = 'percent'
    applyDiscountInputMode()
    discountInput.value = '0'
    taxInput.value = '0'
    addPaymentRow()
    renderCart()
  }

  // ---------- Historial ----------

  async function loadInvoices(page) {
    currentPage = page
    tableBodyEl.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-sm text-verde-800/60">Cargando facturas...</td></tr>`

    const params = new URLSearchParams({ page: String(page), limit: '10' })
    if (filtersFrom?.value) params.set('from', filtersFrom.value)
    if (filtersTo?.value) params.set('to', filtersTo.value)
    if (filtersPayment?.value) params.set('paymentMethod', filtersPayment.value)
    if (filtersStatus?.value) params.set('status', filtersStatus.value)
    if (filtersCustomer?.value.trim()) params.set('customer', filtersCustomer.value.trim())

    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/invoices?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      renderInvoiceTable(data.invoices)
      renderPagination(data.page, data.pages)
    } catch {
      tableBodyEl.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-sm text-verde-800/60">No se pudieron cargar las facturas.</td></tr>`
    }
  }

  function renderInvoiceTable(invoices) {
    if (!invoices.length) {
      tableBodyEl.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-sm text-verde-800/60">No hay facturas con estos filtros.</td></tr>`
      return
    }

    tableBodyEl.innerHTML = invoices.map((inv) => {
      const date = new Date(inv.createdAt).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      const statusColor = inv.status === 'anulada' ? 'bg-red-100 text-red-700' : inv.status === 'pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-verde-100 text-verde-700'
      return `
        <tr class="border-b border-verde-100">
          <td class="py-2 pr-2 font-semibold text-verde-900">#${inv.invoiceNumber}</td>
          <td class="py-2 pr-2 text-verde-800/70">${date}</td>
          <td class="py-2 pr-2">${inv.customerName}</td>
          <td class="py-2 pr-2 font-semibold">${formatCOP(inv.total)}</td>
          <td class="py-2 pr-2 text-verde-800/70">${PAYMENT_LABELS[inv.paymentMethod] ?? inv.paymentMethod}</td>
          <td class="py-2 pr-2"><span class="rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor}">${STATUS_LABELS[inv.status] ?? inv.status}</span></td>
          <td class="py-2">
            <div class="flex gap-2">
              <button type="button" data-view-invoice="${inv._id}" class="rounded-full border border-verde-200 px-3 py-1 text-xs font-semibold text-verde-700 hover:bg-verde-100">Ver</button>
              ${inv.status !== 'anulada'
                ? `<button type="button" data-void-invoice="${inv._id}" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Anular</button>`
                : `<button type="button" data-delete-invoice="${inv._id}" data-delete-invoice-number="${inv.invoiceNumber}" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button>`}
            </div>
          </td>
        </tr>
      `
    }).join('')
  }

  function renderPagination(page, pages) {
    if (!paginationEl) return
    if (pages <= 1) {
      paginationEl.innerHTML = ''
      return
    }
    paginationEl.innerHTML = `
      <button type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} class="rounded-full border border-verde-200 px-3 py-1 disabled:opacity-40">‹</button>
      <span class="text-verde-800/70">Página ${page} de ${pages}</span>
      <button type="button" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} class="rounded-full border border-verde-200 px-3 py-1 disabled:opacity-40">›</button>
    `
    paginationEl.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => loadInvoices(Number(btn.dataset.page)))
    })
  }

  // ---------- Detalle / anular ----------

  async function openDetail(id) {
    detailBody.innerHTML = `<p class="py-6 text-center text-verde-800/60">Cargando...</p>`
    detailEl.classList.remove('hidden')
    document.body.classList.add('overflow-hidden')

    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const inv = await res.json()
      renderDetail(inv)
    } catch {
      detailBody.innerHTML = `<p class="py-6 text-center text-verde-800/60">No se pudo cargar la factura.</p>`
    }
  }

  function renderDetail(inv) {
    const date = new Date(inv.createdAt).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })
    detailBody.innerHTML = `
      <p class="font-display text-lg font-bold text-verde-900">Factura #${inv.invoiceNumber}</p>
      <p class="text-verde-800/60">${date}</p>
      <div class="mt-3 rounded-xl bg-verde-50 p-3">
        <p><span class="font-medium">Cliente:</span> ${inv.customerName}</p>
        ${inv.customerPhone ? `<p><span class="font-medium">Teléfono:</span> ${inv.customerPhone}</p>` : ''}
        ${inv.customerEmail ? `<p><span class="font-medium">Correo:</span> ${inv.customerEmail}</p>` : ''}
      </div>

      <table class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b border-verde-200 text-left text-xs uppercase text-verde-600">
            <th class="py-1">Producto</th><th class="py-1">Cant.</th><th class="py-1">Precio</th><th class="py-1">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map((item) => `
            <tr class="border-b border-verde-100">
              <td class="py-1.5">${item.name}</td>
              <td class="py-1.5">${item.quantity}</td>
              <td class="py-1.5">${formatCOP(item.unitPrice)}</td>
              <td class="py-1.5 font-semibold">${formatCOP(item.subtotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <dl class="mt-3 space-y-1">
        <div class="flex justify-between"><dt class="text-verde-800/60">Subtotal</dt><dd>${formatCOP(inv.subtotal)}</dd></div>
        <div class="flex justify-between"><dt class="text-verde-800/60">Descuento</dt><dd>-${formatCOP(inv.discountTotal)}</dd></div>
        <div class="flex justify-between"><dt class="text-verde-800/60">Impuesto (${inv.taxRate}%)</dt><dd>${formatCOP(inv.taxTotal)}</dd></div>
        <div class="flex justify-between border-t border-verde-100 pt-1 font-display font-bold text-verde-900"><dt>Total</dt><dd>${formatCOP(inv.total)}</dd></div>
      </dl>

      <div class="mt-3">
        <p class="text-sm font-medium text-verde-800">Pagos</p>
        ${inv.payments.map((p) => `<p class="text-sm text-verde-800/70">${PAYMENT_LABELS[p.method] ?? p.method}: ${formatCOP(p.amount)}</p>`).join('')}
        ${inv.changeGiven > 0 ? `<p class="text-sm text-verde-800/70">Vuelto: ${formatCOP(inv.changeGiven)}</p>` : ''}
      </div>

      <p class="mt-3 text-sm">
        Estado: <span class="font-semibold">${STATUS_LABELS[inv.status] ?? inv.status}</span>
      </p>

      ${inv.status !== 'anulada'
        ? `
        <button type="button" data-detail-void="${inv._id}" class="mt-4 w-full rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
          Anular factura
        </button>
      `
        : `
        <button type="button" data-detail-delete="${inv._id}" data-detail-delete-number="${inv.invoiceNumber}" class="mt-4 w-full rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
          Eliminar factura definitivamente
        </button>
      `}
    `
  }

  function closeDetail() {
    detailEl?.classList.add('hidden')
    document.body.classList.remove('overflow-hidden')
  }

  async function voidInvoice(id) {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/invoices/${id}/anular`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      loadInvoices(currentPage)
      loadKpis()
      loadInventoryForSearch()
    } catch {
      window.alert('No se pudo anular la factura.')
    }
  }

  async function deleteInvoice(id) {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      loadInvoices(currentPage)
    } catch (error) {
      window.alert(error?.message || 'No se pudo eliminar la factura.')
    }
  }

  function showPosStatus(text, type) {
    if (!posStatusEl) return
    posStatusEl.textContent = text
    posStatusEl.classList.remove('hidden', 'text-verde-700', 'text-red-600')
    posStatusEl.classList.add(type === 'error' ? 'text-red-600' : 'text-verde-700')
  }

  function hidePosStatus() {
    posStatusEl?.classList.add('hidden')
  }
}
