const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

loadHomeContent()

async function loadHomeContent() {
  try {
    const res = await fetch(`${API_URL}/api/home-content`)
    if (!res.ok) return
    const content = await res.json()
    applyContent(content)
  } catch {
    // Si falla, se queda el contenido estático de respaldo que ya trae el HTML
  }
}

function applyContent(content) {
  applyColors(content.colors)
  applyLogo(content.logoUrl)
  applyBackground(content.backgroundUrl)
  applyHero(content.hero)
  applyStats(content.stats)
  applyCta(content.cta)
  applyFooter(content.footer)
}

// Tailwind v4 genera los colores del @theme como variables CSS reales en :root,
// así que sobreescribirlas aquí cambia todos los bg-verde-*/text-verde-* del sitio al instante
function applyColors(colors) {
  if (!colors) return
  const root = document.documentElement

  if (colors.primary) {
    root.style.setProperty('--color-verde-600', colors.primary)
    root.style.setProperty('--color-verde-500', shade(colors.primary, 0.15))
    root.style.setProperty('--color-verde-700', shade(colors.primary, -0.2))
    root.style.setProperty('--color-verde-50', shade(colors.primary, 0.94))
  }

  if (colors.textDark) {
    root.style.setProperty('--color-verde-900', colors.textDark)
  }
}

// Aclara (percent > 0) u oscurece (percent < 0) un color hex, ej. shade('#3a984c', -0.2)
function shade(hex, percent) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex

  const num = parseInt(clean, 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff

  const target = percent < 0 ? 0 : 255
  const p = Math.abs(percent)
  r = Math.round(r + (target - r) * p)
  g = Math.round(g + (target - g) * p)
  b = Math.round(b + (target - b) * p)

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function applyLogo(logoUrl) {
  if (!logoUrl) return
  document.querySelectorAll('[data-site-logo]').forEach((el) => {
    el.innerHTML = `<img src="${logoUrl}" alt="Logo" class="h-full w-full rounded-full object-cover" />`
  })
}

function applyBackground(backgroundUrl) {
  if (!backgroundUrl) return
  const section = document.querySelector('[data-hero-background]')
  const overlay = document.querySelector('[data-hero-background-overlay]')
  if (section) section.style.backgroundImage = `url(${backgroundUrl})`
  if (overlay) overlay.classList.remove('hidden')
}

function applyHero(hero) {
  if (!hero) return
  setText('[data-hero-badge]', hero.badge)
  setText('[data-hero-title]', hero.title)
  setText('[data-hero-description]', hero.description)
  setText('[data-hero-floating-title]', hero.floatingTitle)
  setText('[data-hero-floating-description]', hero.floatingDescription)

  if (hero.imageUrl) {
    const imageEl = document.querySelector('[data-hero-image]')
    if (imageEl) {
      imageEl.innerHTML = `<img src="${hero.imageUrl}" alt="${hero.title || 'Vivero Gota Verde'}" class="h-full w-full object-cover" />`
    }
  }
}

function applyStats(stats) {
  if (!Array.isArray(stats) || !stats.length) return
  const container = document.querySelector('[data-stats-container]')
  if (!container) return

  container.innerHTML = stats.map((s) => `
    <div>
      <dd class="font-display text-3xl font-extrabold text-verde-700">${s.value}</dd>
      <dd class="text-sm text-verde-800/70">${s.label}</dd>
    </div>
  `).join('')
}

function applyCta(cta) {
  if (!cta) return
  setText('[data-cta-title]', cta.title)
  setText('[data-cta-description]', cta.description)
}

function applyFooter(footer) {
  if (!footer) return
  setText('[data-footer-tagline]', footer.tagline)
  setText('[data-footer-address]', footer.address)
  setText('[data-footer-phone]', footer.phone)
  setText('[data-footer-email]', footer.email)

  setHref('[data-footer-instagram]', footer.instagram)
  setHref('[data-footer-facebook]', footer.facebook)
  setHref('[data-footer-whatsapp]', footer.whatsapp)
}

function setText(selector, value) {
  if (!value) return
  const el = document.querySelector(selector)
  if (el) el.textContent = value
}

function setHref(selector, value) {
  if (!value) return
  const el = document.querySelector(selector)
  if (el) el.href = value
}
