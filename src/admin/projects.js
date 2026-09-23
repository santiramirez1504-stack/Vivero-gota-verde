import { getToken } from './session.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const CATEGORY_LABELS = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  eventos: 'Eventos',
  vertical: 'Jardinería vertical',
}

const form = document.querySelector('[data-project-form]')
const idInput = document.querySelector('[data-project-id-input]')
const submitLabel = document.querySelector('[data-project-submit-label]')
const cancelButton = document.querySelector('[data-project-cancel-edit]')
const statusEl = document.querySelector('[data-project-status]')
const listEl = document.querySelector('[data-project-list]')

const mediaInput = document.querySelector('[data-project-media-input]')
const mediaUploadButton = document.querySelector('[data-project-media-upload]')
const mediaStatusEl = document.querySelector('[data-project-media-status]')
const mediaPreviewEl = document.querySelector('[data-project-media-preview]')

if (form && listEl) {
  let projects = []
  let currentMedia = [] // { type, url, publicId }

  loadProjects()

  mediaInput?.addEventListener('change', () => {
    if (mediaUploadButton) mediaUploadButton.disabled = !mediaInput.files?.length
    hideMediaStatus()
  })

  mediaUploadButton?.addEventListener('click', async () => {
    const file = mediaInput?.files?.[0]
    if (!file) return

    const token = getToken()
    if (!token) {
      showMediaStatus('Debes iniciar sesión de nuevo.', 'error')
      return
    }

    mediaUploadButton.disabled = true
    showMediaStatus('Subiendo...', 'info')

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
        showMediaStatus(data.error || 'No se pudo subir el archivo', 'error')
        return
      }

      currentMedia.push({
        type: data.resourceType === 'video' ? 'video' : 'image',
        url: data.url,
        publicId: data.publicId,
      })
      renderMediaPreview()
      hideMediaStatus()
      mediaInput.value = ''
    } catch {
      showMediaStatus('No se pudo conectar con el servidor.', 'error')
    } finally {
      mediaUploadButton.disabled = !mediaInput?.files?.length
    }
  })

  mediaPreviewEl?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-media]')
    if (!removeButton) return
    currentMedia.splice(Number(removeButton.dataset.removeMedia), 1)
    renderMediaPreview()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideStatus()

    const token = getToken()
    if (!token) {
      showStatus('Debes iniciar sesión de nuevo.', 'error')
      return
    }

    if (!currentMedia.length) {
      showStatus('Sube al menos una foto o video del proyecto.', 'error')
      return
    }

    const formData = new FormData(form)
    const payload = {
      title: formData.get('title'),
      category: formData.get('category'),
      location: formData.get('location'),
      description: formData.get('description'),
      media: currentMedia,
    }

    const editingId = idInput.value
    const url = editingId ? `${API_URL}/api/projects/${editingId}` : `${API_URL}/api/projects`
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
        showStatus(data.error || 'No se pudo guardar el proyecto', 'error')
        return
      }

      showStatus(editingId ? 'Proyecto actualizado.' : 'Proyecto agregado a la galería.', 'success')
      resetForm()
      loadProjects()
    } catch {
      showStatus('No se pudo conectar con el servidor.', 'error')
    }
  })

  cancelButton?.addEventListener('click', resetForm)

  listEl.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-project]')
    const deleteButton = event.target.closest('[data-delete-project]')

    if (editButton) startEdit(editButton.dataset.editProject)

    if (deleteButton) {
      const id = deleteButton.dataset.deleteProject
      const title = deleteButton.dataset.deleteProjectTitle
      if (!window.confirm(`¿Eliminar "${title}" de la galería? Esto también borra sus fotos/videos de Cloudinary.`)) return
      await deleteProject(id)
    }
  })

  async function loadProjects() {
    listEl.innerHTML = `<p class="col-span-full py-6 text-center text-sm text-verde-800/60">Cargando proyectos...</p>`
    try {
      const res = await fetch(`${API_URL}/api/projects`)
      if (!res.ok) throw new Error()
      projects = await res.json()
      renderList()
    } catch {
      listEl.innerHTML = `<p class="col-span-full py-6 text-center text-sm text-verde-800/60">No se pudo cargar la galería.</p>`
    }
  }

  function renderMediaPreview() {
    if (!mediaPreviewEl) return
    mediaPreviewEl.innerHTML = currentMedia.map((m, index) => `
      <div class="group relative aspect-square overflow-hidden rounded-lg bg-verde-100">
        ${m.type === 'video'
          ? `<video src="${m.url}" class="h-full w-full object-cover" muted playsinline></video>`
          : `<img src="${m.url}" alt="" class="h-full w-full object-cover" />`}
        <button type="button" data-remove-media="${index}"
          class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80">
          ✕
        </button>
      </div>
    `).join('')
  }

  function renderList() {
    if (!projects.length) {
      listEl.innerHTML = `<p class="col-span-full py-6 text-center text-sm text-verde-800/60">Todavía no hay proyectos en la galería.</p>`
      return
    }

    listEl.innerHTML = projects.map((p) => {
      const cover = p.media[0]
      return `
        <div class="overflow-hidden rounded-xl border border-verde-100">
          <div class="aspect-video bg-verde-100">
            ${cover
              ? cover.type === 'video'
                ? `<video src="${cover.url}" class="h-full w-full object-cover" muted playsinline></video>`
                : `<img src="${cover.url}" alt="${p.title}" class="h-full w-full object-cover" />`
              : `<div class="flex h-full items-center justify-center text-3xl">🌿</div>`}
          </div>
          <div class="p-4">
            <span class="text-xs font-semibold uppercase tracking-wide text-verde-600">${CATEGORY_LABELS[p.category] ?? p.category}</span>
            <p class="mt-1 font-semibold text-verde-900">${p.title}</p>
            <p class="text-xs text-verde-800/60">${p.media.length} archivo${p.media.length === 1 ? '' : 's'}</p>
            <div class="mt-3 flex gap-2">
              <button type="button" data-edit-project="${p._id}" class="rounded-full border border-verde-200 px-3 py-1 text-xs font-semibold text-verde-700 hover:bg-verde-100">
                Editar
              </button>
              <button type="button" data-delete-project="${p._id}" data-delete-project-title="${p.title}" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      `
    }).join('')
  }

  function startEdit(id) {
    const project = projects.find((p) => p._id === id)
    if (!project) return

    idInput.value = project._id
    form.elements.title.value = project.title
    form.elements.category.value = project.category
    form.elements.location.value = project.location
    form.elements.description.value = project.description
    currentMedia = project.media.map((m) => ({ ...m }))
    renderMediaPreview()

    if (submitLabel) submitLabel.textContent = 'Guardar cambios'
    cancelButton?.classList.remove('hidden')
    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function deleteProject(id) {
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      showStatus('Proyecto eliminado.', 'success')
      loadProjects()
    } catch {
      showStatus('No se pudo eliminar el proyecto.', 'error')
    }
  }

  function resetForm() {
    form.reset()
    idInput.value = ''
    currentMedia = []
    renderMediaPreview()
    if (submitLabel) submitLabel.textContent = 'Agregar proyecto'
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

function showMediaStatus(text, type) {
  if (!mediaStatusEl) return
  mediaStatusEl.textContent = text
  mediaStatusEl.classList.remove('hidden', 'text-verde-700', 'text-red-600', 'text-verde-800/60')
  mediaStatusEl.classList.add(
    type === 'error' ? 'text-red-600' : type === 'success' ? 'text-verde-700' : 'text-verde-800/60',
  )
}

function hideMediaStatus() {
  mediaStatusEl?.classList.add('hidden')
}
