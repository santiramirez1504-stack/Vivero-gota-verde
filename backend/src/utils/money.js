// Convierte un valor de dinero recibido del cliente a un entero limpio en pesos colombianos.
// Si llega como número, solo redondea. Si llega como texto (ej. "1.900" o "15,000"),
// quita todo lo que no sea dígito antes de convertir, para no interpretar el punto de
// miles como decimal (Number("1.900") === 1.9, que es justo el bug que se quiere evitar).
export function toCOPInt(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : 0
  }
  const digitsOnly = String(value ?? '').replace(/\D/g, '')
  return digitsOnly ? Number(digitsOnly) : 0
}
