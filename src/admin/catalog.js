import { getToken } from './session.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const CATEGORY_LABELS = {
  arboles: 'Árboles',
  arbustos: 'Arbustos',
  ornamentales: 'Ornamentales',
  macetas: 'Macetas',
}

const form = document.querySelector('[data-product-form]')
const idInput = document.querySelector('[data-product-id-input]')
const submitLabel = document.querySelector('[data-product-submit-label]')
const cancelButton = document.querySelector('[data-product-cancel-edit]')
const statusEl = document.querySelector('[data-product-status]')
const listEl = document.querySelector('[data-product-list]')

if (form && listEl) {
  loadProducts()

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
      name: formData.get('name'),
      category: formData.get('category'),
      price: formData.get('price'),
      unit: formData.get('unit') || 'unidad',
      description: formData.get('description'),
      imageUrl: formData.get('imageUrl'),
      emoji: formData.get('emoji') || '🌿',
    }

    const editingId = idInput.value
    const url = editingId ? `${API_URL}/api/products/${editingId}` : `${API_URL}/api/products`
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
        showStatus(data.error || 'No se pudo guardar el producto', 'error')
        return
      }

      showStatus(editingId ? 'Producto actualizado.' : 'Producto agregado al catálogo.', 'success')
      resetForm()
      loadProducts()
    } catch {
      showStatus('No se pudo conectar con el servidor.', 'error')
    }
  })

  cancelButton?.addEventListener('click', resetForm)

  listEl.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-product]')
    const deleteButton = event.target.closest('[data-delete-product]')

    if (editButton) {
      startEdit(editButton.dataset.editProduct)
    }

    if (deleteButton) {
      const id = deleteButton.dataset.deleteProduct
      const name = deleteButton.dataset.deleteProductName
      if (!window.confirm(`¿Eliminar "${name}" del catálogo? Esta acción no se puede deshacer.`)) return
      await deleteProduct(id)
    }
  })

  let products = []

  async function loadProducts() {
    listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Cargando catálogo...</p>`
    try {
      const res = await fetch(`${API_URL}/api/products`)
      if (!res.ok) throw new Error()
      products = await res.json()
      renderList()
    } catch {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">No se pudo cargar el catálogo.</p>`
    }
  }

  function renderList() {
    if (!products.length) {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Aún no hay productos en el catálogo.</p>`
      return
    }

    listEl.innerHTML = products.map((p) => `
      <div class="flex flex-wrap items-center gap-4 py-4">
        <div class="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-verde-100 text-2xl">
          ${p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" class="h-full w-full object-cover" />`
            : p.emoji}
        </div>
        <div class="min-w-[10rem] flex-1">
          <p class="font-semibold text-verde-900">${p.name}</p>
          <p class="text-xs text-verde-800/60">${CATEGORY_LABELS[p.category] ?? p.category}</p>
        </div>
        <p class="font-display font-bold text-verde-700">$${Number(p.price).toFixed(2)} <span class="text-xs font-normal text-verde-800/50">/ ${p.unit}</span></p>
        <div class="flex gap-2">
          <button type="button" data-edit-product="${p._id}" class="rounded-full border border-verde-200 px-4 py-1.5 text-xs font-semibold text-verde-700 hover:bg-verde-100">
            Editar
          </button>
          <button type="button" data-delete-product="${p._id}" data-delete-product-name="${p.name}" class="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>
    `).join('')
  }

  function startEdit(id) {
    const product = products.find((p) => p._id === id)
    if (!product) return

    idInput.value = product._id
    form.elements.name.value = product.name
    form.elements.category.value = product.category
    form.elements.price.value = product.price
    form.elements.unit.value = product.unit
    form.elements.description.value = product.description
    form.elements.imageUrl.value = product.imageUrl
    form.elements.emoji.value = product.emoji

    if (submitLabel) submitLabel.textContent = 'Guardar cambios'
    cancelButton?.classList.remove('hidden')
    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function deleteProduct(id) {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      showStatus('Producto eliminado.', 'success')
      loadProducts()
    } catch {
      showStatus('No se pudo eliminar el producto.', 'error')
    }
  }

  function resetForm() {
    form.reset()
    idInput.value = ''
    if (submitLabel) submitLabel.textContent = 'Agregar producto'
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
