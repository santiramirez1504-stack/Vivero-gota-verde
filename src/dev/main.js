import '../style.css'
import './homeContent.js'
import { getToken, setToken, clearToken } from './session.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const loginView = document.querySelector('[data-login-view]')
const dashboardView = document.querySelector('[data-dashboard-view]')
const loginForm = document.querySelector('[data-login-form]')
const loginError = document.querySelector('[data-login-error]')
const logoutButton = document.querySelector('[data-logout]')
const devUserEl = document.querySelector('[data-dev-user]')
const statusBadge = document.querySelector('[data-status-badge]')
const toggleButton = document.querySelector('[data-toggle-button]')
const messageForm = document.querySelector('[data-message-form]')
const messageInput = document.querySelector('[data-message-input]') ?? document.getElementById('mensaje')
const messageStatus = document.querySelector('[data-message-status]')

init()

async function init() {
  const token = getToken()
  if (token && (await isTokenValid(token))) {
    showDashboard()
    loadStatus()
  } else {
    clearToken()
    showLogin()
  }
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  hideError()

  const formData = new FormData(loginForm)

  try {
    const res = await fetch(`${API_URL}/api/dev-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: formData.get('usuario'),
        contrasena: formData.get('contrasena'),
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      showError(data.error || 'No se pudo iniciar sesión')
      return
    }

    setToken(data.token)
    await isTokenValid(data.token)
    showDashboard()
    loadStatus()
  } catch {
    showError('No se pudo conectar con el servidor.')
  }
})

logoutButton?.addEventListener('click', () => {
  clearToken()
  showLogin()
})

toggleButton?.addEventListener('click', async () => {
  const token = getToken()
  const currentlyEnabled = toggleButton.dataset.enabled === 'true'

  toggleButton.disabled = true
  try {
    const res = await fetch(`${API_URL}/api/settings/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ siteEnabled: !currentlyEnabled }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error()
    renderStatus(data)
  } catch {
    window.alert('No se pudo cambiar el estado del sitio.')
  } finally {
    toggleButton.disabled = false
  }
})

messageForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const token = getToken()
  const formData = new FormData(messageForm)

  try {
    const res = await fetch(`${API_URL}/api/settings/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ maintenanceMessage: formData.get('message') }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error()
    renderStatus(data)
    showMessageStatus('Mensaje guardado.', 'success')
  } catch {
    showMessageStatus('No se pudo guardar el mensaje.', 'error')
  }
})

async function loadStatus() {
  try {
    const res = await fetch(`${API_URL}/api/settings/status`)
    const data = await res.json()
    renderStatus(data)
  } catch {
    // se deja el badge en "Cargando..." si falla; el usuario puede reintentar recargando
  }
}

function renderStatus(data) {
  if (statusBadge) {
    statusBadge.textContent = data.siteEnabled ? '🟢 Sitio activo' : '🔴 Sitio en mantenimiento'
    statusBadge.classList.remove('bg-verde-100', 'text-verde-700', 'bg-red-100', 'text-red-700')
    statusBadge.classList.add(...(data.siteEnabled ? ['bg-verde-100', 'text-verde-700'] : ['bg-red-100', 'text-red-700']))
  }

  if (toggleButton) {
    toggleButton.dataset.enabled = String(data.siteEnabled)
    toggleButton.textContent = data.siteEnabled ? 'Desactivar sitio' : 'Reactivar sitio'
    toggleButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'bg-verde-600', 'hover:bg-verde-700')
    toggleButton.classList.add(...(data.siteEnabled ? ['bg-red-600', 'hover:bg-red-700'] : ['bg-verde-600', 'hover:bg-verde-700']))
  }

  if (messageInput && document.activeElement !== messageInput) {
    messageInput.value = data.message ?? ''
  }
}

async function isTokenValid(token) {
  try {
    const res = await fetch(`${API_URL}/api/dev-auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    if (devUserEl) devUserEl.textContent = data.usuario
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

function showMessageStatus(text, type) {
  if (!messageStatus) return
  messageStatus.textContent = text
  messageStatus.classList.remove('hidden', 'text-verde-700', 'text-red-600')
  messageStatus.classList.add(type === 'error' ? 'text-red-600' : 'text-verde-700')
}
