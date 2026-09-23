import { CATEGORIES } from './data/categories.js'
import { formatCOP } from './utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const STORAGE_KEY = 'gotaverde_cart'
const CUSTOMER_STORAGE_KEY = 'gotaverde_customer'
// TODO: reemplazar por el número de WhatsApp real del vivero (con código de país, sin +, ni espacios)
const WHATSAPP_NUMBER = '10000000000'

const filtersEl = document.querySelector('[data-filters]')
const gridEl = document.querySelector('[data-product-grid]')
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
    const button = event.target.closest('[data-add]')
    if (!button) return
    addToCart(button.dataset.add)
  })

  cartItemsEl?.addEventListener('click', (event) => {
    const plus = event.target.closest('[data-qty-plus]')
    const minus = event.target.closest('[data-qty-minus]')
    const remove = event.target.closest('[data-remove]')
    if (plus) changeQty(plus.dataset.qtyPlus, 1)
    if (minus) changeQty(minus.dataset.qtyMinus, -1)
    if (remove) removeFromCart(remove.dataset.remove)
  })

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
    const items = activeCategory === 'todos'
      ? products
      : products.filter((p) => p.category === activeCategory)

    if (!items.length) {
      gridEl.innerHTML = `<p class="col-span-full py-10 text-center text-verde-800/60">Todavía no hay productos en esta categoría.</p>`
      return
    }

    gridEl.innerHTML = items.map((p) => `
      <article class="rounded-2xl border border-verde-100 bg-white p-5 flex flex-col hover:shadow-lg transition-shadow">
        <div class="aspect-square rounded-xl bg-gradient-to-br from-verde-100 to-verde-300 flex items-center justify-center text-6xl overflow-hidden">
          ${p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" class="h-full w-full object-cover" />`
            : p.emoji}
        </div>
        <span class="mt-4 text-xs font-semibold uppercase tracking-wide text-verde-600">${categoryLabel(p.category)}</span>
        <h3 class="mt-1 font-display font-bold text-lg text-verde-900">${p.name}</h3>
        <p class="mt-1 text-sm text-verde-800/70 flex-1">${p.description}</p>
        <div class="mt-4 flex items-center justify-between gap-2">
          <span class="font-display font-bold text-verde-700">${formatPrice(p.price)} <span class="text-xs font-normal text-verde-800/50">/ ${p.unit}</span></span>
          <button type="button" data-add="${p._id}" class="rounded-full bg-verde-600 px-4 py-2 text-sm font-semibold text-white hover:bg-verde-700 transition-colors">
            Agregar
          </button>
        </div>
      </article>
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
              ${item.product.imageUrl
                ? `<img src="${item.product.imageUrl}" alt="${item.product.name}" class="h-full w-full object-cover" />`
                : item.product.emoji}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-verde-900 text-sm truncate">${item.product.name}</p>
              <p class="text-xs text-verde-800/60">${formatPrice(item.product.price)} / ${item.product.unit}</p>
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
