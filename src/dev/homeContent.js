import { getToken } from './session.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const form = document.querySelector('[data-home-form]')
const statusEl = document.querySelector('[data-home-status]')

const logoInput = document.querySelector('[data-logo-input]')
const logoUploadButton = document.querySelector('[data-logo-upload]')
const logoPreviewEl = document.querySelector('[data-logo-preview]')

const heroImageInput = document.querySelector('[data-hero-image-input]')
const heroImageUploadButton = document.querySelector('[data-hero-image-upload]')
const heroImagePreviewEl = document.querySelector('[data-hero-image-preview]')

const backgroundInput = document.querySelector('[data-background-input]')
const backgroundUploadButton = document.querySelector('[data-background-upload]')
const backgroundPreviewEl = document.querySelector('[data-background-preview]')
const backgroundRemoveButton = document.querySelector('[data-background-remove]')

const statsListEl = document.querySelector('[data-stats-list]')
const statsAddButton = document.querySelector('[data-stats-add]')

if (form) {
  let logoUrl = ''
  let logoPublicId = ''
  let backgroundUrl = ''
  let backgroundPublicId = ''
  let heroImageUrl = ''
  let heroImagePublicId = ''
  let stats = []

  loadContent()

  logoInput?.addEventListener('change', () => {
    if (logoUploadButton) logoUploadButton.disabled = !logoInput.files?.length
  })

  logoUploadButton?.addEventListener('click', async () => {
    const result = await uploadFile(logoInput.files?.[0])
    if (!result) return
    logoUrl = result.url
    logoPublicId = result.publicId
    renderLogoPreview()
    logoInput.value = ''
    logoUploadButton.disabled = true
  })

  backgroundInput?.addEventListener('change', () => {
    if (backgroundUploadButton) backgroundUploadButton.disabled = !backgroundInput.files?.length
  })

  backgroundUploadButton?.addEventListener('click', async () => {
    const result = await uploadFile(backgroundInput.files?.[0])
    if (!result) return
    backgroundUrl = result.url
    backgroundPublicId = result.publicId
    renderBackgroundPreview()
    backgroundInput.value = ''
    backgroundUploadButton.disabled = true
  })

  backgroundRemoveButton?.addEventListener('click', () => {
    backgroundUrl = ''
    backgroundPublicId = ''
    renderBackgroundPreview()
  })

  heroImageInput?.addEventListener('change', () => {
    if (heroImageUploadButton) heroImageUploadButton.disabled = !heroImageInput.files?.length
  })

  heroImageUploadButton?.addEventListener('click', async () => {
    const result = await uploadFile(heroImageInput.files?.[0])
    if (!result) return
    heroImageUrl = result.url
    heroImagePublicId = result.publicId
    renderHeroImagePreview()
    heroImageInput.value = ''
    heroImageUploadButton.disabled = true
  })

  statsAddButton?.addEventListener('click', () => {
    stats.push({ value: '', label: '' })
    renderStats()
  })

  statsListEl?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-stat-remove]')
    if (!removeButton) return
    stats.splice(Number(removeButton.dataset.statRemove), 1)
    renderStats()
  })

  statsListEl?.addEventListener('input', (event) => {
    const valueInput = event.target.closest('[data-stat-value]')
    const labelInput = event.target.closest('[data-stat-label]')
    if (valueInput) stats[Number(valueInput.dataset.statValue)].value = valueInput.value
    if (labelInput) stats[Number(labelInput.dataset.statLabel)].label = labelInput.value
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
    const payload = {
      colors: {
        primary: formData.get('colorPrimary'),
        textDark: formData.get('colorTextDark'),
      },
      logoUrl,
      logoPublicId,
      backgroundUrl,
      backgroundPublicId,
      hero: {
        badge: formData.get('heroBadge'),
        title: formData.get('heroTitle'),
        description: formData.get('heroDescription'),
        imageUrl: heroImageUrl,
        imagePublicId: heroImagePublicId,
        floatingTitle: formData.get('heroFloatingTitle'),
        floatingDescription: formData.get('heroFloatingDescription'),
      },
      stats: stats.filter((s) => s.value && s.label),
      cta: {
        title: formData.get('ctaTitle'),
        description: formData.get('ctaDescription'),
      },
      footer: {
        tagline: formData.get('footerTagline'),
        address: formData.get('footerAddress'),
        phone: formData.get('footerPhone'),
        email: formData.get('footerEmail'),
        instagram: formData.get('footerInstagram'),
        facebook: formData.get('footerFacebook'),
        whatsapp: formData.get('footerWhatsapp'),
      },
    }

    try {
      const res = await fetch(`${API_URL}/api/home-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        showStatus(data.error || 'No se pudo guardar el contenido', 'error')
        return
      }

      showStatus('Contenido del Home actualizado. Los cambios ya se ven en el sitio público.', 'success')
      populateForm(data)
    } catch {
      showStatus('No se pudo conectar con el servidor.', 'error')
    }
  })

  async function loadContent() {
    try {
      const res = await fetch(`${API_URL}/api/home-content`)
      if (!res.ok) return
      const data = await res.json()
      populateForm(data)
    } catch {
      // el formulario queda con los valores por defecto si falla; no bloquea el resto del panel
    }
  }

  function populateForm(data) {
    if (data.colors?.primary) form.elements.colorPrimary.value = data.colors.primary
    if (data.colors?.textDark) form.elements.colorTextDark.value = data.colors.textDark

    logoUrl = data.logoUrl || ''
    logoPublicId = data.logoPublicId || ''
    renderLogoPreview()

    backgroundUrl = data.backgroundUrl || ''
    backgroundPublicId = data.backgroundPublicId || ''
    renderBackgroundPreview()

    form.elements.heroBadge.value = data.hero?.badge || ''
    form.elements.heroTitle.value = data.hero?.title || ''
    form.elements.heroDescription.value = data.hero?.description || ''
    form.elements.heroFloatingTitle.value = data.hero?.floatingTitle || ''
    form.elements.heroFloatingDescription.value = data.hero?.floatingDescription || ''

    heroImageUrl = data.hero?.imageUrl || ''
    heroImagePublicId = data.hero?.imagePublicId || ''
    renderHeroImagePreview()

    stats = Array.isArray(data.stats) && data.stats.length ? data.stats.map((s) => ({ ...s })) : []
    renderStats()

    form.elements.ctaTitle.value = data.cta?.title || ''
    form.elements.ctaDescription.value = data.cta?.description || ''

    form.elements.footerTagline.value = data.footer?.tagline || ''
    form.elements.footerAddress.value = data.footer?.address || ''
    form.elements.footerPhone.value = data.footer?.phone || ''
    form.elements.footerEmail.value = data.footer?.email || ''
    form.elements.footerInstagram.value = data.footer?.instagram || ''
    form.elements.footerFacebook.value = data.footer?.facebook || ''
    form.elements.footerWhatsapp.value = data.footer?.whatsapp || ''
  }

  function renderLogoPreview() {
    if (!logoPreviewEl) return
    if (!logoUrl) {
      logoPreviewEl.classList.add('hidden')
      logoPreviewEl.innerHTML = ''
      return
    }
    logoPreviewEl.classList.remove('hidden')
    logoPreviewEl.innerHTML = `<img src="${logoUrl}" alt="Logo" class="h-full w-full object-cover" />`
  }

  function renderBackgroundPreview() {
    if (!backgroundPreviewEl) return
    if (!backgroundUrl) {
      backgroundPreviewEl.classList.add('hidden')
      backgroundPreviewEl.innerHTML = ''
      backgroundRemoveButton?.classList.add('hidden')
      return
    }
    backgroundPreviewEl.classList.remove('hidden')
    backgroundPreviewEl.innerHTML = `<img src="${backgroundUrl}" alt="Imagen de fondo" class="h-full w-full object-cover" />`
    backgroundRemoveButton?.classList.remove('hidden')
  }

  function renderHeroImagePreview() {
    if (!heroImagePreviewEl) return
    if (!heroImageUrl) {
      heroImagePreviewEl.classList.add('hidden')
      heroImagePreviewEl.innerHTML = ''
      return
    }
    heroImagePreviewEl.classList.remove('hidden')
    heroImagePreviewEl.innerHTML = `<img src="${heroImageUrl}" alt="Imagen del hero" class="h-full w-full object-cover" />`
  }

  function renderStats() {
    if (!statsListEl) return
    if (!stats.length) {
      statsListEl.innerHTML = `<p class="text-sm text-verde-800/50">Sin métricas — usa "Agregar métrica".</p>`
      return
    }
    statsListEl.innerHTML = stats.map((s, index) => `
      <div class="flex items-center gap-2">
        <input type="text" placeholder="10+" value="${s.value}" data-stat-value="${index}" class="w-24 rounded-lg border border-verde-200 px-3 py-1.5 text-sm focus:border-verde-500 focus:outline-none focus:ring-2 focus:ring-verde-200" />
        <input type="text" placeholder="Años de experiencia" value="${s.label}" data-stat-label="${index}" class="flex-1 rounded-lg border border-verde-200 px-3 py-1.5 text-sm focus:border-verde-500 focus:outline-none focus:ring-2 focus:ring-verde-200" />
        <button type="button" data-stat-remove="${index}" class="text-red-500 hover:text-red-700" aria-label="Quitar métrica">✕</button>
      </div>
    `).join('')
  }

  async function uploadFile(file) {
    if (!file) return null

    const token = getToken()
    if (!token) {
      showStatus('Debes iniciar sesión de nuevo.', 'error')
      return null
    }

    showStatus('Subiendo archivo...', 'info')
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
        return null
      }

      hideStatus()
      return data
    } catch {
      showStatus('No se pudo conectar con el servidor.', 'error')
      return null
    }
  }
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
