import { getToken } from './session.js'
import { formatCOP, parseCOPInput, attachCurrencyMask } from '../utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const alertsEl = document.querySelector('[data-stock-alerts]')
const form = document.querySelector('[data-inventory-form]')
const idInput = document.querySelector('[data-inventory-id-input]')
const submitLabel = document.querySelector('[data-inventory-submit-label]')
const cancelButton = document.querySelector('[data-inventory-cancel-edit]')
const statusEl = document.querySelector('[data-inventory-status]')
const listEl = document.querySelector('[data-inventory-list]')
const searchInput = document.querySelector('[data-inventory-search]')

if (form && listEl) {
  let items = []

  attachCurrencyMask(form.elements.price)
  loadInventory()

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideStatus()

    const token = getToken()
    if (!token) {
      showStatus('Debes iniciar sesión de nuevo.', 'error')
      return
    }

    const formData = new FormData(form)
    const payload = {
      commonName: formData.get('commonName'),
      scientificName: formData.get('scientificName'),
      price: parseCOPInput(formData.get('price')),
      growthTime: formData.get('growthTime'),
      wateringFrequency: formData.get('wateringFrequency'),
      fertilizerType: formData.get('fertilizerType'),
      minStock: formData.get('minStock'),
      notes: formData.get('notes'),
      stock: {
        semillero: formData.get('stockSemillero'),
        crecimiento: formData.get('stockCrecimiento'),
        listoVenta: formData.get('stockListoVenta'),
      },
    }

    const editingId = idInput.value
    const url = editingId ? `${API_URL}/api/inventory/${editingId}` : `${API_URL}/api/inventory`
    const method = editingId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        showStatus(data.error || 'No se pudo guardar la especie', 'error')
        return
      }

      showStatus(editingId ? 'Especie actualizada.' : 'Especie agregada al inventario.', 'success')
      resetForm()
      loadInventory()
    } catch {
      showStatus('No se pudo conectar con el servidor.', 'error')
    }
  })

  cancelButton?.addEventListener('click', resetForm)

  // Enter en la búsqueda no debe disparar el submit del formulario de "Agregar especie"
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault()
  })
  searchInput?.addEventListener('input', () => renderList())

  listEl.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-item]')
    const deleteButton = event.target.closest('[data-delete-item]')

    if (editButton) {
      startEdit(editButton.dataset.editItem)
    }

    if (deleteButton) {
      const id = deleteButton.dataset.deleteItem
      const name = deleteButton.dataset.deleteItemName
      if (!window.confirm(`¿Eliminar "${name}" del inventario?`)) return
      await deleteItem(id)
    }
  })

  async function loadInventory() {
    listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Cargando inventario...</p>`
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      items = await res.json()
      renderAlerts()
      renderList()
    } catch {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">No se pudo cargar el inventario.</p>`
    }
  }

  function totalStock(item) {
    return (item.stock?.semillero ?? 0) + (item.stock?.crecimiento ?? 0) + (item.stock?.listoVenta ?? 0)
  }

  function isLowStock(item) {
    return totalStock(item) <= (item.minStock ?? 0)
  }

  function renderAlerts() {
    if (!alertsEl) return
    const lowItems = items.filter(isLowStock)

    if (!lowItems.length) {
      alertsEl.innerHTML = `<p class="rounded-xl bg-verde-50 px-4 py-3 text-sm text-verde-700">✅ Todo el inventario está por encima de su umbral mínimo.</p>`
      return
    }

    alertsEl.innerHTML = `
      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p class="text-sm font-semibold text-amber-800">⚠️ ${lowItems.length} especie${lowItems.length === 1 ? '' : 's'} con stock bajo</p>
        <ul class="mt-2 space-y-1 text-sm text-amber-700">
          ${lowItems.map((item) => `<li>${item.commonName}: ${totalStock(item)} unidades (mínimo ${item.minStock})</li>`).join('')}
        </ul>
      </div>
    `
  }

  function renderList() {
    if (!items.length) {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Todavía no hay especies registradas.</p>`
      return
    }

    const query = searchInput?.value.trim().toLowerCase() ?? ''
    const filtered = query
      ? items.filter((item) => (
        item.commonName?.toLowerCase().includes(query)
        || item.scientificName?.toLowerCase().includes(query)
      ))
      : items

    if (!filtered.length) {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">No se encontró ninguna especie con "${searchInput.value.trim()}".</p>`
      return
    }

    listEl.innerHTML = filtered.map((item) => {
      const low = isLowStock(item)
      return `
        <div class="flex flex-wrap items-center gap-4 py-4">
          <div class="min-w-[11rem] flex-1">
            <p class="font-semibold text-verde-900">${item.commonName}</p>
            ${item.scientificName ? `<p class="text-xs italic text-verde-800/60">${item.scientificName}</p>` : ''}
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-verde-800/70">
            <span>🌱 ${item.stock?.semillero ?? 0}</span>
            <span>🪴 ${item.stock?.crecimiento ?? 0}</span>
            <span>✅ ${item.stock?.listoVenta ?? 0}</span>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${low ? 'bg-amber-100 text-amber-800' : 'bg-verde-100 text-verde-700'}">
            ${totalStock(item)} total${low ? ' ⚠️' : ''}
          </span>
          <p class="font-display font-bold text-verde-700">${formatCOP(item.price)}</p>
          <div class="flex gap-2">
            <button type="button" data-edit-item="${item._id}" class="rounded-full border border-verde-200 px-4 py-1.5 text-xs font-semibold text-verde-700 hover:bg-verde-100">
              Editar
            </button>
            <button type="button" data-delete-item="${item._id}" data-delete-item-name="${item.commonName}" class="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
              Eliminar
            </button>
          </div>
        </div>
      `
    }).join('')
  }

  function startEdit(id) {
    const item = items.find((i) => i._id === id)
    if (!item) return

    idInput.value = item._id
    form.elements.commonName.value = item.commonName
    form.elements.scientificName.value = item.scientificName
    form.elements.price.value = Number(item.price).toLocaleString('es-CO')
    form.elements.growthTime.value = item.growthTime
    form.elements.wateringFrequency.value = item.wateringFrequency
    form.elements.fertilizerType.value = item.fertilizerType
    form.elements.minStock.value = item.minStock
    form.elements.notes.value = item.notes
    form.elements.stockSemillero.value = item.stock?.semillero ?? 0
    form.elements.stockCrecimiento.value = item.stock?.crecimiento ?? 0
    form.elements.stockListoVenta.value = item.stock?.listoVenta ?? 0

    if (submitLabel) submitLabel.textContent = 'Guardar cambios'
    cancelButton?.classList.remove('hidden')
    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function deleteItem(id) {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      showStatus('Especie eliminada.', 'success')
      loadInventory()
    } catch {
      showStatus('No se pudo eliminar la especie.', 'error')
    }
  }

  function resetForm() {
    form.reset()
    idInput.value = ''
    if (submitLabel) submitLabel.textContent = 'Agregar especie'
    cancelButton?.classList.add('hidden')
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
