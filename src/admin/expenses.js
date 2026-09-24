import { getToken } from './session.js'
import { formatCOP, parseCOPInput, attachCurrencyMask } from '../utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const CATEGORY_LABELS = {
  insumos: 'Insumos',
  servicios: 'Servicios',
  logistica: 'Logística',
  mantenimiento: 'Mantenimiento',
  otro: 'Otro',
}

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi_daviplata: 'Nequi/Daviplata',
}

const balanceEl = document.querySelector('[data-expense-balance]')
const newToggleButton = document.querySelector('[data-expense-new-toggle]')
const formWrapper = document.querySelector('[data-expense-form-wrapper]')
const form = document.querySelector('[data-expense-form]')
const statusEl = document.querySelector('[data-expense-status]')

const filtersFrom = document.querySelector('[data-expense-filter-from]')
const filtersTo = document.querySelector('[data-expense-filter-to]')
const filtersCategory = document.querySelector('[data-expense-filter-category]')
const filtersPayment = document.querySelector('[data-expense-filter-payment]')

const tableBodyEl = document.querySelector('[data-expense-table-body]')
const paginationEl = document.querySelector('[data-expense-pagination]')

if (form && tableBodyEl) {
  attachCurrencyMask(form.elements.amount)

  loadBalance()
  loadExpenses(1)

  newToggleButton?.addEventListener('click', () => {
    const isHidden = formWrapper.classList.contains('hidden')
    formWrapper.classList.toggle('hidden')
    newToggleButton.textContent = isHidden ? 'Cerrar' : '+ Nuevo gasto'
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideStatus()

    const token = getToken()
    const formData = new FormData(form)
    const payload = {
      vendor: formData.get('vendor'),
      concept: formData.get('concept'),
      category: formData.get('category'),
      paymentMethod: formData.get('paymentMethod'),
      amount: parseCOPInput(formData.get('amount')),
      notes: formData.get('notes'),
    }

    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        showStatus(data.error || 'No se pudo registrar el gasto', 'error')
        return
      }

      showStatus('Gasto registrado.', 'success')
      form.reset()
      loadBalance()
      loadExpenses(1)
    } catch {
      showStatus('No se pudo conectar con el servidor.', 'error')
    }
  })

  tableBodyEl.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-delete-expense]')
    if (!deleteButton) return
    if (!window.confirm('¿Eliminar este egreso?')) return

    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/expenses/${deleteButton.dataset.deleteExpense}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      loadBalance()
      loadExpenses(1)
    } catch {
      showStatus('No se pudo eliminar el registro.', 'error')
    }
  })

  ;[filtersFrom, filtersTo, filtersCategory, filtersPayment].forEach((el) => {
    el?.addEventListener('change', () => loadExpenses(1))
  })

  async function loadBalance() {
    if (!balanceEl) return
    const token = getToken()
    try {
      const [invoicesRes, expensesRes] = await Promise.all([
        fetch(`${API_URL}/api/invoices/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/expenses/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (!invoicesRes.ok || !expensesRes.ok) throw new Error()
      const invoicesData = await invoicesRes.json()
      const expensesData = await expensesRes.json()

      const income = invoicesData.totalSalesMonth ?? 0
      const expenses = expensesData.totalExpensesMonth ?? 0
      const net = income - expenses

      balanceEl.innerHTML = `
        <div class="rounded-xl bg-verde-50 p-4">
          <p class="text-xs font-semibold uppercase text-verde-600">Ingresos del mes</p>
          <p class="mt-1 font-display text-2xl font-bold text-verde-900">${formatCOP(income)}</p>
        </div>
        <div class="rounded-xl bg-verde-50 p-4">
          <p class="text-xs font-semibold uppercase text-verde-600">Egresos del mes</p>
          <p class="mt-1 font-display text-2xl font-bold text-verde-900">-${formatCOP(expenses)}</p>
        </div>
        <div class="rounded-xl bg-verde-50 p-4">
          <p class="text-xs font-semibold uppercase text-verde-600">Utilidad neta del mes</p>
          <p class="mt-1 font-display text-2xl font-bold ${net >= 0 ? 'text-verde-900' : 'text-red-600'}">${formatCOP(net)}</p>
        </div>
      `
    } catch {
      balanceEl.innerHTML = `<p class="sm:col-span-3 text-sm text-verde-800/60">No se pudo calcular el balance financiero.</p>`
    }
  }

  async function loadExpenses(page) {
    tableBodyEl.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-sm text-verde-800/60">Cargando egresos...</td></tr>`

    const params = new URLSearchParams({ page: String(page), limit: '10' })
    if (filtersFrom?.value) params.set('from', filtersFrom.value)
    if (filtersTo?.value) params.set('to', filtersTo.value)
    if (filtersCategory?.value) params.set('category', filtersCategory.value)
    if (filtersPayment?.value) params.set('paymentMethod', filtersPayment.value)

    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/expenses?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      renderExpenseTable(data.expenses)
      renderPagination(data.page, data.pages)
    } catch {
      tableBodyEl.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-sm text-verde-800/60">No se pudieron cargar los egresos.</td></tr>`
    }
  }

  function renderExpenseTable(expenses) {
    if (!expenses.length) {
      tableBodyEl.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-sm text-verde-800/60">No hay egresos con estos filtros.</td></tr>`
      return
    }

    tableBodyEl.innerHTML = expenses.map((exp) => {
      const date = new Date(exp.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
      return `
        <tr class="border-b border-verde-100">
          <td class="py-2 pr-2 text-verde-800/70">${date}</td>
          <td class="py-2 pr-2">${exp.vendor}</td>
          <td class="py-2 pr-2">${exp.concept}</td>
          <td class="py-2 pr-2 text-verde-800/70">${CATEGORY_LABELS[exp.category] ?? exp.category}</td>
          <td class="py-2 pr-2 text-verde-800/70">${PAYMENT_LABELS[exp.paymentMethod] ?? exp.paymentMethod}</td>
          <td class="py-2 pr-2 font-semibold text-verde-900">${formatCOP(exp.amount)}</td>
          <td class="py-2">
            <button type="button" data-delete-expense="${exp._id}" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button>
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
      btn.addEventListener('click', () => loadExpenses(Number(btn.dataset.page)))
    })
  }
}

function showStatus(text, type) {
  if (!statusEl) return
  statusEl.textContent = text
  statusEl.classList.remove('hidden', 'text-verde-700', 'text-red-600')
  statusEl.classList.add(type === 'error' ? 'text-red-600' : 'text-verde-700')
}

function hideStatus() {
  statusEl?.classList.add('hidden')
}
