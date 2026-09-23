// Formato de pesos colombianos: sin decimales, punto como separador de miles (ej. $25.000)
export function formatCOP(value) {
  const rounded = Math.round(Number(value) || 0)
  return `$${rounded.toLocaleString('es-CO')}`
}

// Convierte lo que el usuario escribió (con puntos, comas o espacios de miles) a un entero limpio.
// "1.900" -> 1900, "15,000" -> 15000, "" -> 0. Nunca usa Number() directo sobre el texto crudo,
// porque un <input type="number"> interpreta el punto como decimal (1.900 -> 1.9), no como miles.
export function parseCOPInput(raw) {
  const digitsOnly = String(raw ?? '').replace(/\D/g, '')
  return digitsOnly ? Number(digitsOnly) : 0
}

// Le pone máscara de miles en vivo a un <input type="text"> de precio en COP.
// Solo actúa si el input está en modo texto (para no romper un <input type="number">
// cuando el mismo campo se reutiliza en otro modo, como el descuento % / $ del POS).
export function attachCurrencyMask(input) {
  if (!input) return
  input.addEventListener('input', () => {
    if (input.type !== 'text') return
    const digits = input.value.replace(/\D/g, '')
    input.value = digits ? Number(digits).toLocaleString('es-CO') : ''
  })
}
