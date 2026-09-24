import '../style.css'
import './uploads.js'
import './catalog.js'
import './orders.js'
import './reports.js'
import './losses.js'
import './inventory.js'
import './invoices.js'
import './projects.js'
import { getToken, setToken, clearToken } from './session.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const loginView = document.querySelector('[data-login-view]')
const dashboardView = document.querySelector('[data-dashboard-view]')
const loginForm = document.querySelector('[data-login-form]')
const loginError = document.querySelector('[data-login-error]')
const logoutButton = document.querySelector('[data-logout]')
const adminUserEl = document.querySelector('[data-admin-user]')
const menuButton = document.querySelector('[data-admin-menu-button]')
const mobileMenu = document.querySelector('[data-admin-mobile-menu]')

init()

menuButton?.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('flex')
  mobileMenu.classList.toggle('hidden')
  menuButton.setAttribute('aria-expanded', String(isOpen))
})

document.querySelectorAll('[data-admin-mobile-menu] a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden')
    mobileMenu.classList.remove('flex')
    menuButton?.setAttribute('aria-expanded', 'false')
  })
})

async function init() {
  const token = getToken()
  if (token && (await isTokenValid(token))) {
    showDashboard()
  } else {
    clearToken()
    showLogin()
  }
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  hideError()

  const formData = new FormData(loginForm)
  const usuario = formData.get('usuario')
  const contrasena = formData.get('contrasena')

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contrasena }),
    })
    const data = await res.json()

    if (!res.ok) {
      showError(data.error || 'No se pudo iniciar sesión')
      return
    }

    setToken(data.token)
    await isTokenValid(data.token)
    showDashboard()
  } catch {
    showError('No se pudo conectar con el servidor. ¿Está corriendo el backend (npm run dev en /backend)?')
  }
})

logoutButton?.addEventListener('click', () => {
  clearToken()
  showLogin()
})

async function isTokenValid(token) {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    if (adminUserEl) adminUserEl.textContent = data.usuario
    return true
  } catch {
    return false
  }
}

function showDashboard() {
  loginView?.classList.add('hidden')
  dashboardView?.classList.remove('hidden')
}

function showLogin() {
  dashboardView?.classList.add('hidden')
  loginView?.classList.remove('hidden')
  loginForm?.reset()
}

function showError(message) {
  if (!loginError) return
  loginError.textContent = message
  loginError.classList.remove('hidden')
}

function hideError() {
  loginError?.classList.add('hidden')
}
