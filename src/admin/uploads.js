import { getToken } from './session.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const fileInput = document.querySelector('[data-upload-input]')
const uploadButton = document.querySelector('[data-upload-button]')
const statusEl = document.querySelector('[data-upload-status]')
const historyEl = document.querySelector('[data-upload-history]')

const uploads = []

fileInput?.addEventListener('change', () => {
  if (uploadButton) uploadButton.disabled = !fileInput.files?.length
  hideStatus()
})

uploadButton?.addEventListener('click', async () => {
  const file = fileInput?.files?.[0]
  if (!file) return

  const token = getToken()
  if (!token) {
    showStatus('Debes iniciar sesión de nuevo.', 'error')
    return
  }

  uploadButton.disabled = true
  showStatus('Subiendo...', 'info')

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
      showStatus(data.error || 'No se pudo subir el archivo', 'error')
      return
    }

    uploads.unshift(data)
    renderHistory()
    showStatus('¡Archivo subido con éxito! Copia la URL para usarla en el catálogo o la galería.', 'success')
    fileInput.value = ''
  } catch {
    showStatus('No se pudo conectar con el servidor.', 'error')
  } finally {
    uploadButton.disabled = !fileInput?.files?.length
  }
})

historyEl?.addEventListener('click', async (event) => {
  const copyButton = event.target.closest('[data-copy-url]')
  const deleteButton = event.target.closest('[data-delete-upload]')

  if (copyButton) {
    const url = copyButton.dataset.copyUrl
    try {
      await navigator.clipboard.writeText(url)
      const original = copyButton.textContent
      copyButton.textContent = '¡Copiado!'
      setTimeout(() => { copyButton.textContent = original }, 1500)
    } catch {
      showStatus('No se pudo copiar la URL automáticamente, selecciónala manualmente.', 'error')
    }
  }

  if (deleteButton) {
    const { publicId, resourceType } = deleteButton.dataset
    const token = getToken()

    try {
      const res = await fetch(`${API_URL}/api/uploads`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ publicId, resourceType }),
      })
      if (!res.ok) throw new Error()

      const index = uploads.findIndex((item) => item.publicId === publicId)
      if (index !== -1) uploads.splice(index, 1)
      renderHistory()
    } catch {
      showStatus('No se pudo eliminar el archivo.', 'error')
    }
  }
})

function renderHistory() {
  if (!historyEl) return
  historyEl.innerHTML = uploads.map((item) => `
    <div class="overflow-hidden rounded-xl border border-verde-100">
      <div class="flex aspect-square items-center justify-center bg-verde-50">
        ${item.resourceType === 'video'
          ? `<video src="${item.url}" class="h-full w-full object-cover" muted></video>`
          : `<img src="${item.url}" alt="" class="h-full w-full object-cover" />`}
      </div>
      <div class="space-y-2 p-2">
        <input type="text" readonly value="${item.url}" class="w-full rounded-md border border-verde-200 px-2 py-1 text-xs text-verde-800" onfocus="this.select()" />
        <button type="button" data-copy-url="${item.url}" class="w-full rounded-full border border-verde-200 px-2 py-1 text-xs font-semibold text-verde-700 hover:bg-verde-100">
          Copiar URL
        </button>
        <button type="button" data-delete-upload data-public-id="${item.publicId}" data-resource-type="${item.resourceType}" class="w-full rounded-full border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
          Eliminar
        </button>
      </div>
    </div>
  `).join('')
}

function showStatus(text, type) {
  if (!statusEl) return
  statusEl.textContent = text
  statusEl.classList.remove('hidden', 'text-verde-700', 'text-red-600', 'text-verde-800/60')
  statusEl.classList.add(
    type === 'error' ? 'text-red-600' : type === 'success' ? 'text-verde-700' : 'text-verde-800/60',
  )
}

function hideStatus() {
  statusEl?.classList.add('hidden')
}
