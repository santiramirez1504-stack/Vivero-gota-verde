import { getToken } from './session.js'
import { formatCOP, parseCOPInput, attachCurrencyMask } from '../utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const MAX_IMAGES = 2

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
const searchInput = document.querySelector('[data-product-search]')

const imageInput = document.querySelector('[data-product-image-input]')
const imageUploadButton = document.querySelector('[data-product-image-upload]')
const imageStatusEl = document.querySelector('[data-product-image-status]')
const imagePreviewEl = document.querySelector('[data-product-image-preview]')

if (form && listEl) {
  attachCurrencyMask(form.elements.price)
  loadProducts()

  let products = []
  let currentImages = [] // { url, publicId }

  imageInput?.addEventListener('change', () => {
    if (imageUploadButton) imageUploadButton.disabled = !imageInput.files?.length || currentImages.length >= MAX_IMAGES
    hideImageStatus()
  })

  imageUploadButton?.addEventListener('click', async () => {
    const file = imageInput?.files?.[0]
    if (!file || currentImages.length >= MAX_IMAGES) return

    const token = getToken()
    if (!token) {
      showImageStatus('Debes iniciar sesión de nuevo.', 'error')
      return
    }

    imageUploadButton.disabled = true
    showImageStatus('Subiendo...', 'info')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/api/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        showImageStatus(data.error || 'No se pudo subir la foto', 'error')
        return
      }

      currentImages.push({ url: data.url, publicId: data.publicId })
      renderImagePreview()
      hideImageStatus()
      imageInput.value = ''
    } catch {
      showImageStatus('No se pudo conectar con el servidor.', 'error')
    } finally {
      imageUploadButton.disabled = !imageInput?.files?.length || currentImages.length >= MAX_IMAGES
    }
  })

  imagePreviewEl?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-product-image]')
    if (!removeButton) return
    currentImages.splice(Number(removeButton.dataset.removeProductImage), 1)
    renderImagePreview()
    if (imageUploadButton) imageUploadButton.disabled = !imageInput?.files?.length || currentImages.length >= MAX_IMAGES
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideStatus()

    const token = getToken()
    if (!token) {
      showStatus('Debes iniciar sesión de nuevo.', 'error')
      return
    }

    const formData = new FormData(form)
    const stockRaw = formData.get('stock')
    const payload = {
      name: formData.get('name'),
      category: formData.get('category'),
      price: parseCOPInput(formData.get('price')),
      stock: stockRaw === '' ? null : Number(stockRaw),
      description: formData.get('description'),
      images: currentImages,
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

  // Enter en la búsqueda no debe disparar el submit del formulario de "Agregar producto"
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault()
  })
  searchInput?.addEventListener('input', () => renderList())

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

  // Los productos creados antes de admitir varias fotos solo tienen "imageUrl" (pegada a mano, sin publicId)
  function productImages(p) {
    if (p.images?.length) return p.images
    if (p.imageUrl) return [{ url: p.imageUrl, publicId: '' }]
    return []
  }

  function renderImagePreview() {
    if (!imagePreviewEl) return
    imagePreviewEl.innerHTML = currentImages.map((img, index) => `
      <div class="group relative aspect-square overflow-hidden rounded-lg bg-verde-100">
        <img src="${img.url}" alt="" class="h-full w-full object-cover" />
        <button type="button" data-remove-product-image="${index}"
          class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80">
          ✕
        </button>
      </div>
    `).join('')
  }

  function renderList() {
    if (!products.length) {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">Aún no hay productos en el catálogo.</p>`
      return
    }

    const query = searchInput?.value.trim().toLowerCase() ?? ''
    const filtered = query
      ? products.filter((p) => p.name?.toLowerCase().includes(query))
      : products

    if (!filtered.length) {
      listEl.innerHTML = `<p class="py-6 text-center text-sm text-verde-800/60">No se encontró ningún producto con "${searchInput.value.trim()}".</p>`
      return
    }

    listEl.innerHTML = filtered.map((p) => {
      const cover = productImages(p)[0]
      return `
      <div class="flex flex-wrap items-center gap-4 py-4">
        <div class="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-verde-100 text-2xl">
          ${cover
            ? `<img src="${cover.url}" alt="${p.name}" class="h-full w-full object-cover" />`
            : p.emoji}
        </div>
        <div class="min-w-[10rem] flex-1">
          <p class="font-semibold text-verde-900">${p.name}</p>
          <p class="text-xs text-verde-800/60">${CATEGORY_LABELS[p.category] ?? p.category}</p>
        </div>
        <p class="font-display font-bold text-verde-700">
          ${formatCOP(p.price)}
          ${p.stock !== null && p.stock !== undefined ? `<span class="ml-1 text-xs font-semibold text-verde-600">· ${p.stock} disponibles</span>` : ''}
        </p>
        <div class="flex gap-2">
          <button type="button" data-edit-product="${p._id}" class="rounded-full border border-verde-200 px-4 py-1.5 text-xs font-semibold text-verde-700 hover:bg-verde-100">
            Editar
          </button>
          <button type="button" data-delete-product="${p._id}" data-delete-product-name="${p.name}" class="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>
    `
    }).join('')
  }

  function startEdit(id) {
    const product = products.find((p) => p._id === id)
    if (!product) return

    idInput.value = product._id
    form.elements.name.value = product.name
    form.elements.category.value = product.category
    form.elements.price.value = Number(product.price).toLocaleString('es-CO')
    form.elements.stock.value = product.stock ?? ''
    form.elements.description.value = product.description
    form.elements.emoji.value = product.emoji

    currentImages = productImages(product).map((img) => ({ ...img }))
    renderImagePreview()
    if (imageUploadButton) imageUploadButton.disabled = true

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
    currentImages = []
    renderImagePreview()
    if (imageUploadButton) imageUploadButton.disabled = true
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

function showImageStatus(text, type) {
  if (!imageStatusEl) return
  imageStatusEl.textContent = text
  imageStatusEl.classList.remove('hidden', 'text-verde-700', 'text-red-600', 'text-verde-800/60')
  imageStatusEl.classList.add(
    type === 'error' ? 'text-red-600' : type === 'success' ? 'text-verde-700' : 'text-verde-800/60',
  )
}

function hideImageStatus() {
  imageStatusEl?.classList.add('hidden')
}
