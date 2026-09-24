import { CATEGORIES } from './data/categories.js'
import { formatCOP } from './utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const STORAGE_KEY = 'gotaverde_cart'
const CUSTOMER_STORAGE_KEY = 'gotaverde_customer'
// TODO: reemplazar por el número de WhatsApp real del vivero (con código de país, sin +, ni espacios)
const WHATSAPP_NUMBER = '10000000000'

const filtersEl = document.querySelector('[data-filters]')
const gridEl = document.querySelector('[data-product-grid]')
const searchInput = document.querySelector('[data-catalog-search]')

const productLightboxEl = document.querySelector('[data-product-lightbox]')
const productLightboxOverlay = document.querySelector('[data-product-lightbox-overlay]')
const productLightboxClose = document.querySelector('[data-product-lightbox-close]')
const productLightboxCategory = document.querySelector('[data-product-lightbox-category]')
const productLightboxTitle = document.querySelector('[data-product-lightbox-title]')
const productLightboxDescription = document.querySelector('[data-product-lightbox-description]')
const productLightboxPrice = document.querySelector('[data-product-lightbox-price]')
const productLightboxMedia = document.querySelector('[data-product-lightbox-media]')
const productLightboxThumbs = document.querySelector('[data-product-lightbox-thumbs]')
const productLightboxPrev = document.querySelector('[data-product-lightbox-prev]')
const productLightboxNext = document.querySelector('[data-product-lightbox-next]')
const productLightboxAdd = document.querySelector('[data-product-lightbox-add]')

const cartButton = document.querySelector('[data-cart-button]')
const cartClose = document.querySelector('[data-cart-close]')
const cartOverlay = document.querySelector('[data-cart-overlay]')
const cartPanel = document.querySelector('[data-cart-panel]')
const cartItemsEl = document.querySelector('[data-cart-items]')
const cartCountEl = document.querySelector('[data-cart-count]')
const cartTotalEl = document.querySelector('[data-cart-total]')
const cartWhatsappEl = document.querySelector('[data-cart-whatsapp]')
const cartNameEl = document.querySelector('[data-cart-name]')
const cartPhoneEl = document.querySelector('[data-cart-phone]')
const cartErrorEl = document.querySelector('[data-cart-error]')

if (filtersEl && gridEl) {
  let activeCategory = 'todos'
  let cart = loadCart()
  let products = []
  let currentProduct = null
  let currentImageIndex = 0

  renderFilters()
  renderCart()
  loadProducts()
  loadCustomer()

  filtersEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]')
    if (!button) return
    activeCategory = button.dataset.filter
    renderFilters()
    renderGrid()
  })

  gridEl.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add]')
    const openButton = event.target.closest('[data-open-product]')
    if (addButton) addToCart(addButton.dataset.add)
    if (openButton) openProductLightbox(openButton.dataset.openProduct)
  })

  productLightboxClose?.addEventListener('click', closeProductLightbox)
  productLightboxOverlay?.addEventListener('click', closeProductLightbox)
  productLightboxPrev?.addEventListener('click', () => stepProduct(-1))
  productLightboxNext?.addEventListener('click', () => stepProduct(1))
  productLightboxThumbs?.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-product-thumb]')
    if (!thumb) return
    currentImageIndex = Number(thumb.dataset.productThumb)
    renderProductMedia()
    renderProductThumbs()
  })
  productLightboxAdd?.addEventListener('click', () => {
    if (!currentProduct) return
    const id = currentProduct._id
    closeProductLightbox()
    addToCart(id)
  })

  document.addEventListener('keydown', (event) => {
    if (productLightboxEl?.classList.contains('hidden')) return
    if (event.key === 'Escape') closeProductLightbox()
    if (event.key === 'ArrowLeft') stepProduct(-1)
    if (event.key === 'ArrowRight') stepProduct(1)
  })

  cartItemsEl?.addEventListener('click', (event) => {
    const plus = event.target.closest('[data-qty-plus]')
    const minus = event.target.closest('[data-qty-minus]')
    const remove = event.target.closest('[data-remove]')
    if (plus) changeQty(plus.dataset.qtyPlus, 1)
    if (minus) changeQty(minus.dataset.qtyMinus, -1)
    if (remove) removeFromCart(remove.dataset.remove)
  })

  searchInput?.addEventListener('input', renderGrid)

  cartButton?.addEventListener('click', openCart)
  cartClose?.addEventListener('click', closeCart)
  cartOverlay?.addEventListener('click', closeCart)
  cartWhatsappEl?.addEventListener('click', sendOrder)

  async function loadProducts() {
    gridEl.innerHTML = `<p class="col-span-full py-10 text-center text-verde-800/60">Cargando catálogo...</p>`
    try {
      const res = await fetch(`${API_URL}/api/products`)
      if (!res.ok) throw new Error()
      products = await res.json()
      renderGrid()
    } catch {
      gridEl.innerHTML = `<p class="col-span-full py-10 text-center text-verde-800/60">No se pudo cargar el catálogo en este momento. Intenta de nuevo más tarde.</p>`
    }
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // localStorage no disponible (modo privado, etc.); el carrito sigue funcionando en memoria
    }
  }

  function formatPrice(value) {
    return formatCOP(value)
  }

  function categoryLabel(id) {
    return CATEGORIES.find((c) => c.id === id)?.label ?? id
  }

  // Los productos creados antes de admitir varias fotos solo tienen "imageUrl" (una sola foto)
  function productImages(p) {
    if (p.images?.length) return p.images
    if (p.imageUrl) return [{ url: p.imageUrl }]
    return []
  }

  // Si el vivero no cargó stock para este producto, no se muestra ningún dato de disponibilidad
  function stockLabel(p) {
    return p.stock !== null && p.stock !== undefined
      ? `<span class="block text-xs font-semibold text-verde-600">${p.stock} disponibles</span>`
      : ''
  }

  function renderFilters() {
    filtersEl.innerHTML = CATEGORIES.map((cat) => `
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
    let items = activeCategory === 'todos'
      ? products
      : products.filter((p) => p.category === activeCategory)

    const query = searchInput?.value.trim().toLowerCase() ?? ''
    if (query) {
      items = items.filter((p) => p.name?.toLowerCase().includes(query))
    }

    if (!items.length) {
      gridEl.innerHTML = query
        ? `<p class="col-span-full py-10 text-center text-verde-800/60">No se encontró ninguna planta con "${searchInput.value.trim()}".</p>`
        : `<p class="col-span-full py-10 text-center text-verde-800/60">Todavía no hay productos en esta categoría.</p>`
      return
    }

    gridEl.innerHTML = items.map((p) => {
      const cover = productImages(p)[0]
      return `
      <article class="rounded-2xl border border-verde-100 bg-white p-5 flex flex-col hover:shadow-lg transition-shadow">
        <button type="button" data-open-product="${p._id}" class="block text-left">
          <div class="aspect-square rounded-xl bg-gradient-to-br from-verde-100 to-verde-300 flex items-center justify-center text-6xl overflow-hidden">
            ${cover
              ? `<img src="${cover.url}" alt="${p.name}" class="h-full w-full object-cover" />`
              : p.emoji}
          </div>
          <span class="mt-4 block text-xs font-semibold uppercase tracking-wide text-verde-600">${categoryLabel(p.category)}</span>
          <h3 class="mt-1 font-display font-bold text-lg text-verde-900">${p.name}</h3>
        </button>
        <p class="mt-1 text-sm text-verde-800/70 flex-1">${p.description}</p>
        <div class="mt-4 flex items-center justify-between gap-2">
          <span class="font-display font-bold text-verde-700">
            ${formatPrice(p.price)}
            ${stockLabel(p)}
          </span>
          <button type="button" data-add="${p._id}" class="rounded-full bg-verde-600 px-4 py-2 text-sm font-semibold text-white hover:bg-verde-700 transition-colors">
            Agregar
          </button>
        </div>
      </article>
    `
    }).join('')
  }

  function openProductLightbox(id) {
    currentProduct = products.find((p) => p._id === id)
    if (!currentProduct) return
    currentImageIndex = 0
    if (productLightboxCategory) productLightboxCategory.textContent = categoryLabel(currentProduct.category)
    if (productLightboxTitle) productLightboxTitle.textContent = currentProduct.name
    if (productLightboxDescription) productLightboxDescription.textContent = currentProduct.description
    if (productLightboxPrice) {
      const stock = currentProduct.stock !== null && currentProduct.stock !== undefined
        ? `<span class="ml-2 text-sm font-semibold text-verde-600">${currentProduct.stock} disponibles</span>`
        : ''
      productLightboxPrice.innerHTML = `${formatPrice(currentProduct.price)}${stock}`
    }
    renderProductMedia()
    renderProductThumbs()
    productLightboxEl?.classList.remove('hidden')
    document.body.classList.add('overflow-hidden')
  }

  function closeProductLightbox() {
    productLightboxEl?.classList.add('hidden')
    document.body.classList.remove('overflow-hidden')
    currentProduct = null
  }

  function stepProduct(delta) {
    if (!currentProduct) return
    const images = productImages(currentProduct)
    if (images.length <= 1) return
    currentImageIndex = (currentImageIndex + delta + images.length) % images.length
    renderProductMedia()
    renderProductThumbs()
  }

  function renderProductMedia() {
    if (!currentProduct || !productLightboxMedia) return
    const images = productImages(currentProduct)
    const image = images[currentImageIndex]
    productLightboxMedia.innerHTML = image
      ? `<img src="${image.url}" alt="${currentProduct.name}" class="max-h-full max-w-full object-contain" />`
      : `<span>${currentProduct.emoji || '🌿'}</span>`

    const showNav = images.length > 1
    productLightboxPrev?.classList.toggle('hidden', !showNav)
    productLightboxNext?.classList.toggle('hidden', !showNav)
  }

  function renderProductThumbs() {
    if (!currentProduct || !productLightboxThumbs) return
    const images = productImages(currentProduct)
    if (images.length <= 1) {
      productLightboxThumbs.innerHTML = ''
      return
    }
    productLightboxThumbs.innerHTML = images.map((image, index) => `
      <button
        type="button"
        data-product-thumb="${index}"
        class="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg transition-colors ${
          index === currentImageIndex ? 'ring-2 ring-verde-600' : 'bg-verde-100 hover:bg-verde-200'
        }"
      ><img src="${image.url}" alt="" class="h-full w-full object-cover" /></button>
    `).join('')
  }

  function renderCart() {
    const entries = Object.values(cart)
    const count = entries.reduce((sum, item) => sum + item.qty, 0)
    const total = entries.reduce((sum, item) => sum + item.qty * item.product.price, 0)

    if (cartCountEl) cartCountEl.textContent = String(count)
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(total)

    if (cartItemsEl) {
      cartItemsEl.innerHTML = entries.length
        ? entries.map((item) => `
          <div class="flex items-center gap-3">
            <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-verde-100 flex items-center justify-center text-2xl">
              ${productImages(item.product)[0]
                ? `<img src="${productImages(item.product)[0].url}" alt="${item.product.name}" class="h-full w-full object-cover" />`
                : item.product.emoji}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-verde-900 text-sm truncate">${item.product.name}</p>
              <p class="text-xs text-verde-800/60">${formatPrice(item.product.price)}</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" data-qty-minus="${item.product._id}" class="h-7 w-7 rounded-full border border-verde-200 text-verde-700 hover:bg-verde-100">−</button>
              <span class="w-5 text-center text-sm font-semibold">${item.qty}</span>
              <button type="button" data-qty-plus="${item.product._id}" class="h-7 w-7 rounded-full border border-verde-200 text-verde-700 hover:bg-verde-100">+</button>
            </div>
            <button type="button" data-remove="${item.product._id}" class="ml-1 text-verde-400 hover:text-red-500" aria-label="Quitar">✕</button>
          </div>
        `).join('')
        : `<p class="text-sm text-verde-800/60 text-center py-10">Aún no agregas plantas a tu cotización.</p>`
    }

    saveCart()
  }

  function loadCustomer() {
    try {
      const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY)
      if (!raw) return
      const { name, phone } = JSON.parse(raw)
      if (cartNameEl) cartNameEl.value = name ?? ''
      if (cartPhoneEl) cartPhoneEl.value = phone ?? ''
    } catch {
      // sin datos guardados, el cliente los escribe de nuevo
    }
  }

  function saveCustomer(name, phone) {
    try {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({ name, phone }))
    } catch {
      // localStorage no disponible; no afecta el envío del pedido
    }
  }

  function buildWhatsappLink(entries, total) {
    const lines = entries.map((item) => `• ${item.qty} x ${item.product.name} (${formatPrice(item.product.price)})`)
    const message = [
      'Hola, quiero cotizar estas plantas:',
      ...lines,
      `Total estimado: ${formatPrice(total)}`,
    ].join('\n')
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }

  async function sendOrder() {
    hideCartError()

    const entries = Object.values(cart)
    if (!entries.length) {
      showCartError('Agrega al menos una planta a tu cotización.')
      return
    }

    const name = cartNameEl?.value.trim()
    const phone = cartPhoneEl?.value.trim()
    if (!name || !phone) {
      showCartError('Escribe tu nombre y teléfono para continuar.')
      return
    }

    const total = entries.reduce((sum, item) => sum + item.qty * item.product.price, 0)
    saveCustomer(name, phone)

    try {
      await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          items: entries.map((item) => ({
            name: item.product.name,
            price: item.product.price,
            qty: item.qty,
          })),
        }),
      })
    } catch {
      // Si falla el registro del pedido, igual dejamos que el cliente complete el envío por WhatsApp
    }

    window.open(buildWhatsappLink(entries, total), '_blank', 'noopener')
  }

  function showCartError(message) {
    if (!cartErrorEl) return
    cartErrorEl.textContent = message
    cartErrorEl.classList.remove('hidden')
  }

  function hideCartError() {
    cartErrorEl?.classList.add('hidden')
  }

  function addToCart(id) {
    const product = products.find((p) => p._id === id)
    if (!product) return
    if (cart[id]) {
      cart[id].qty += 1
    } else {
      cart[id] = { product, qty: 1 }
    }
    renderCart()
    openCart()
  }

  function changeQty(id, delta) {
    if (!cart[id]) return
    cart[id].qty += delta
    if (cart[id].qty <= 0) delete cart[id]
    renderCart()
  }

  function removeFromCart(id) {
    delete cart[id]
    renderCart()
  }

  function openCart() {
    cartPanel?.classList.remove('translate-x-full')
    cartOverlay?.classList.remove('hidden')
  }

  function closeCart() {
    cartPanel?.classList.add('translate-x-full')
    cartOverlay?.classList.add('hidden')
  }
}
