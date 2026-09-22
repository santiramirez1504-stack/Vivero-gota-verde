// TODO: reemplazar por el número real de WhatsApp del vivero (mismo que en catalog.js)
const WHATSAPP_NUMBER = '10000000000'

const form = document.querySelector('[data-booking-form]')
const feedbackEl = document.querySelector('[data-booking-feedback]')

if (form) {
  const fechaInput = form.querySelector('#fecha')
  if (fechaInput) {
    fechaInput.min = new Date().toISOString().split('T')[0]
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()

    if (!form.reportValidity()) return

    const data = new FormData(form)
    const message = buildMessage(data)

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')

    showFeedback('¡Listo! Te llevamos a WhatsApp para confirmar los detalles de tu reserva.')
    form.reset()
  })
}

function buildMessage(data) {
  const lines = [
    'Hola, quiero agendar un servicio de paisajismo:',
    `• Tipo de proyecto: ${data.get('tipoProyecto')}`,
    `• Nombre: ${data.get('nombre')}`,
    `• Teléfono: ${data.get('telefono')}`,
    `• Correo: ${data.get('correo')}`,
    `• Dirección / ciudad: ${data.get('direccion')}`,
    `• Fecha tentativa: ${data.get('fecha')}`,
    `• Horario preferido: ${data.get('horario')}`,
    `• Tamaño aproximado: ${data.get('tamano')}`,
  ]

  const mensaje = data.get('mensaje')
  if (mensaje) lines.push(`• Detalles adicionales: ${mensaje}`)

  return lines.join('\n')
}

function showFeedback(text) {
  if (!feedbackEl) return
  feedbackEl.textContent = text
  feedbackEl.classList.remove('hidden')
}
