import { PROJECT_CATEGORIES } from './data/projects.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const filtersEl = document.querySelector('[data-project-filters]')
const gridEl = document.querySelector('[data-project-grid]')
const lightboxEl = document.querySelector('[data-lightbox]')
const lightboxOverlay = document.querySelector('[data-lightbox-overlay]')
const lightboxClose = document.querySelector('[data-lightbox-close]')
const lightboxTitle = document.querySelector('[data-lightbox-title]')
const lightboxLocation = document.querySelector('[data-lightbox-location]')
const lightboxDescription = document.querySelector('[data-lightbox-description]')
const lightboxMedia = document.querySelector('[data-lightbox-media]')
const lightboxThumbs = document.querySelector('[data-lightbox-thumbs]')
const lightboxPrev = document.querySelector('[data-lightbox-prev]')
const lightboxNext = document.querySelector('[data-lightbox-next]')

if (filtersEl && gridEl) {
  let activeCategory = 'todos'
  let currentProject = null
  let currentIndex = 0
  let projects = []

  renderFilters()
  loadProjects()

  filtersEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]')
    if (!button) return
    activeCategory = button.dataset.filter
    renderFilters()
    renderGrid()
  })

  gridEl.addEventListener('click', (event) => {
    const card = event.target.closest('[data-open-project]')
    if (!card) return
    openLightbox(card.dataset.openProject)
  })

  lightboxClose?.addEventListener('click', closeLightbox)
  lightboxOverlay?.addEventListener('click', closeLightbox)
  lightboxPrev?.addEventListener('click', () => step(-1))
  lightboxNext?.addEventListener('click', () => step(1))
  lightboxThumbs?.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-thumb]')
    if (!thumb) return
    currentIndex = Number(thumb.dataset.thumb)
    renderMedia()
    renderThumbs()
  })

  document.addEventListener('keydown', (event) => {
    if (lightboxEl?.classList.contains('hidden')) return
    if (event.key === 'Escape') closeLightbox()
    if (event.key === 'ArrowLeft') step(-1)
    if (event.key === 'ArrowRight') step(1)
  })

  async function loadProjects() {
    gridEl.innerHTML = `<p class="col-span-full py-10 text-center text-verde-800/60">Cargando proyectos...</p>`
    try {
      const res = await fetch(`${API_URL}/api/projects`)
      if (!res.ok) throw new Error()
      projects = await res.json()
      renderGrid()
    } catch {
      gridEl.innerHTML = `<p class="col-span-full py-10 text-center text-verde-800/60">No se pudieron cargar los proyectos en este momento.</p>`
    }
  }

  function categoryLabel(id) {
    return PROJECT_CATEGORIES.find((c) => c.id === id)?.label ?? id
  }

  function renderFilters() {
    filtersEl.innerHTML = PROJECT_CATEGORIES.map((cat) => `
      <button
        type="button"
        data-filter="${cat.id}"
        class="rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          cat.id === activeCategory
            ? 'bg-verde-600 text-white'
            : 'border border-verde-200 text-verde-700 hover:bg-verde-100'
        }"
      >${cat.label}</button>
    `).join('')
  }

  function renderGrid() {
    const items = activeCategory === 'todos'
      ? projects
      : projects.filter((p) => p.category === activeCategory)

    if (!items.length) {
      gridEl.innerHTML = `<p class="col-span-full py-10 text-center text-verde-800/60">Todavía no hay proyectos en esta categoría.</p>`
      return
    }

    gridEl.innerHTML = items.map((p) => {
      const hasVideo = p.media.some((m) => m.type === 'video')
      const cover = p.media[0]
      return `
        <button type="button" data-open-project="${p._id}" class="group overflow-hidden rounded-2xl border border-verde-100 bg-white text-left transition-shadow hover:shadow-lg">
          <div class="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-verde-100 to-verde-300 text-6xl">
            ${cover
              ? cover.type === 'video'
                ? `<video src="${cover.url}" class="h-full w-full object-cover" muted playsinline></video>`
                : `<img src="${cover.url}" alt="${p.title}" class="h-full w-full object-cover" />`
              : '🌿'}
            ${hasVideo ? '<span class="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">▶ Video</span>' : ''}
          </div>
          <div class="p-5">
            <span class="text-xs font-semibold uppercase tracking-wide text-verde-600">${categoryLabel(p.category)}</span>
            <h3 class="mt-1 font-display font-bold text-lg text-verde-900">${p.title}</h3>
            <p class="mt-1 text-sm text-verde-800/60">📍 ${p.location}</p>
          </div>
        </button>
      `
    }).join('')
  }

  function openLightbox(id) {
    currentProject = projects.find((p) => p._id === id)
    if (!currentProject) return
    currentIndex = 0
    if (lightboxTitle) lightboxTitle.textContent = currentProject.title
    if (lightboxLocation) lightboxLocation.textContent = `📍 ${currentProject.location}`
    if (lightboxDescription) lightboxDescription.textContent = currentProject.description
    renderMedia()
    renderThumbs()
    lightboxEl?.classList.remove('hidden')
    document.body.classList.add('overflow-hidden')
  }

  function closeLightbox() {
    lightboxEl?.classList.add('hidden')
    document.body.classList.remove('overflow-hidden')
    currentProject = null
  }

  function step(delta) {
    if (!currentProject) return
    const total = currentProject.media.length
    if (!total) return
    currentIndex = (currentIndex + delta + total) % total
    renderMedia()
    renderThumbs()
  }

  function renderMedia() {
    if (!currentProject || !lightboxMedia) return
    const media = currentProject.media[currentIndex]
    if (!media) {
      lightboxMedia.innerHTML = `<span class="text-8xl">🌿</span>`
      return
    }
    if (media.type === 'video') {
      lightboxMedia.innerHTML = `<video src="${media.url}" controls class="max-h-full max-w-full"></video>`
    } else {
      lightboxMedia.innerHTML = `<img src="${media.url}" alt="${currentProject.title}" class="max-h-full max-w-full object-contain" />`
    }
  }

  function renderThumbs() {
    if (!currentProject || !lightboxThumbs) return
    lightboxThumbs.innerHTML = currentProject.media.map((m, index) => `
      <button
        type="button"
        data-thumb="${index}"
        class="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg text-2xl transition-colors ${
          index === currentIndex ? 'ring-2 ring-verde-600' : 'bg-verde-100 text-verde-700 hover:bg-verde-200'
        }"
      >${m.type === 'video'
          ? `<video src="${m.url}" class="h-full w-full object-cover" muted playsinline></video>`
          : `<img src="${m.url}" alt="" class="h-full w-full object-cover" />`}</button>
    `).join('')
  }
}
