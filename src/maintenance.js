const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

checkStatus()

async function checkStatus() {
  try {
    const res = await fetch(`${API_URL}/api/settings/status`)
    if (!res.ok) return
    const data = await res.json()
    if (data.siteEnabled === false) {
      showMaintenance(data.message)
    }
  } catch {
    // Si no se puede consultar el backend, no bloqueamos el sitio (falla en modo abierto)
  }
}

function showMaintenance(message) {
  document.body.innerHTML = `
    <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-verde-50 px-6 text-center">
      <span class="text-6xl">🌿</span>
      <h1 class="font-display text-2xl font-bold text-verde-900">Sitio en mantenimiento</h1>
      <p class="max-w-md text-verde-800/70">${escapeHtml(message) || 'Estamos realizando mejoras. Vuelve pronto.'}</p>
    </div>
  `
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text ?? ''
  return div.innerHTML
}
