import { getToken } from './session.js'
import { formatCOP, parseCOPInput, attachCurrencyMask } from '../utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const REASON_LABELS = {
  plagas: 'Plagas',
  clima: 'Clima',
  accidente: 'Accidente',
  otro: 'Otro',
}

const summaryEl = document.querySelector('[data-loss-summary]')
const form = document.querySelector('[data-loss-form]')
const statusEl = document.querySelector('[data-loss-status]')
const listEl = document.querySelector('[data-loss-list]')

if (form && listEl) {
  attachCurrencyMask(form.elements.estimatedValue)
  loadSummary()
  loadLosses()

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideStatus()

    const token = getToken()
    const formData = new FormData(form)
    const payload = {
      productName: formData.get('productName'),
      quantity: formData.get('quantity'),
      reason: formData.get('reason'),
      estimatedValue: parseCOPInput(formData.get('estimatedValue')),
      notes: formData.get('notes'),
    }

    try {
      const res = await fetch(`${API_URL}/api/losses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        showStatus(data.error || 'No se pudo registrar la pérdida', 'error')
        return
      }

      showStatus('Pérdida registrada.', 'success')
      form.reset()
      loadSummary()
      loadLosses()
    } catch {
      showStatus('No se pudo conectar con el servidor.', 'error')
    }
  })

  listEl.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-delete-loss]')
    if (!deleteButton) return
    if (!window.confirm('¿Eliminar este registro de pérdida?')) return

    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/losses/${deleteButton.dataset.deleteLoss}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      loadSummary()
      loadLosses()
    } catch {
      showStatus('No se pudo eliminar el registro.', 'error')
    }
  })

  async function loadSummary() {
    if (!summaryEl) return
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/reports/losses-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      renderSummary(data)
    } catch {
      summaryEl.innerHTML = `<p class="text-sm text-verde-800/60 sm:col-span-3">No se pudo calcular la tasa de merma.</p>`
    }
  }

  function renderSummary(data) {
    summaryEl.innerHTML = `
      <div class="rounded-xl bg-verde-50 p-4">
        <p class="text-xs font-semibold uppercase text-verde-600">Tasa de merma</p>
        <p class="mt-1 font-display text-2xl font-bold text-verde-900">${data.lossRate.toFixed(1)}%</p>
        <p class="mt-1 text-xs text-verde-800/60">${data.totalLostQty} de ${data.totalSold + data.totalLostQty} unidades</p>
      </div>
      <div class="rounded-xl bg-verde-50 p-4">
        <p class="text-xs font-semibold uppercase text-verde-600">Unidades perdidas</p>
        <p class="mt-1 font-display text-2xl font-bold text-verde-900">${data.totalLostQty}</p>
      </div>
      <div class="rounded-xl bg-verde-50 p-4">
        <p class="text-xs font-semibold uppercase text-verde-600">Valor estimado perdido</p>
        <p class="mt-1 font-display text-2xl font-bold text-verde-900">${formatCOP(data.totalLostValue)}</p>
      </div>
    `
  }

  async function loadLosses() {
    listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Cargando...</p>`
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/losses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const losses = await res.json()
      renderLosses(losses)
    } catch {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">No se pudieron cargar los registros.</p>`
    }
  }

  function renderLosses(losses) {
    if (!losses.length) {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Todavía no hay pérdidas registradas.</p>`
      return
    }

    listEl.innerHTML = losses.map((l) => {
      const date = new Date(l.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
      return `
        <div class="flex flex-wrap items-center gap-4 py-3">
          <div class="min-w-[10rem] flex-1">
            <p class="font-semibold text-verde-900">${l.productName}</p>
            <p class="text-xs text-verde-800/60">${date} · ${REASON_LABELS[l.reason] ?? l.reason}${l.notes ? ` · ${l.notes}` : ''}</p>
          </div>
          <p class="text-sm text-verde-800/70">${l.quantity} unidades</p>
          <p class="font-display font-bold text-verde-700">${formatCOP(l.estimatedValue)}</p>
          <button type="button" data-delete-loss="${l._id}" class="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      `
    }).join('')
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
