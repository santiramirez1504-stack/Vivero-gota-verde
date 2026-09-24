import { jsPDF } from 'jspdf'
import { formatCOP } from '../utils/currency.js'

// Datos del emisor (membrete) — placeholders hasta que el usuario confirme los reales
const BUSINESS_NAME = 'Vivero Gota Verde'
const BUSINESS_NIT = 'NIT: 900.000.000-1'
const BUSINESS_LOCATION = 'Marinilla, Antioquia'

const GREEN_DARK = [28, 64, 35] // --color-verde-900
const GREEN = [42, 122, 58] // --color-verde-600
const GRAY = [110, 110, 110]

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi_daviplata: 'Nequi/Daviplata',
}

export function generateInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 48
  let y = 56

  // ---------- Membrete ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...GREEN_DARK)
  doc.text(BUSINESS_NAME, marginX, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  y += 16
  doc.text(BUSINESS_NIT, marginX, y)
  y += 12
  doc.text(BUSINESS_LOCATION, marginX, y)

  // Datos de la factura (alineados a la derecha, misma altura del membrete)
  const date = new Date(invoice.createdAt).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
  let ry = 56
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...GREEN_DARK)
  drawRight(doc, `Factura N° ${invoice.invoiceNumber}`, pageWidth - marginX, ry)
  ry += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  drawRight(doc, `Fecha: ${date}`, pageWidth - marginX, ry)
  ry += 12
  drawRight(doc, `Cajero: ${invoice.cashier || '—'}`, pageWidth - marginX, ry)
  ry += 12
  if (invoice.status === 'anulada') {
    doc.setTextColor(220, 38, 38)
    doc.setFont('helvetica', 'bold')
    drawRight(doc, 'ANULADA', pageWidth - marginX, ry)
  }

  y = Math.max(y, ry) + 16
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(1.2)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 22

  // ---------- Cliente ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GREEN_DARK)
  doc.text('Cliente', marginX, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text(invoice.customerName || 'Consumidor final', marginX, y)
  if (invoice.customerPhone) {
    y += 13
    doc.text(`Tel: ${invoice.customerPhone}`, marginX, y)
  }
  if (invoice.customerEmail) {
    y += 13
    doc.text(`Correo: ${invoice.customerEmail}`, marginX, y)
  }
  y += 24

  // ---------- Tabla de productos ----------
  const col = { producto: marginX, cant: 330, precio: 380, desc: 450, subtotal: pageWidth - marginX }

  doc.setFillColor(...GREEN)
  doc.rect(marginX, y - 12, pageWidth - marginX * 2, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Producto', col.producto + 6, y + 2)
  doc.text('Cant.', col.cant, y + 2)
  doc.text('Precio', col.precio, y + 2)
  doc.text('Desc.', col.desc, y + 2)
  drawRight(doc, 'Subtotal', col.subtotal - 6, y + 2)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 30, 30)

  invoice.items.forEach((item, index) => {
    if (y > 740) {
      doc.addPage()
      y = 56
    }
    if (index % 2 === 1) {
      doc.setFillColor(244, 249, 245)
      doc.rect(marginX, y - 11, pageWidth - marginX * 2, 18, 'F')
    }
    doc.text(String(item.name), col.producto + 6, y + 2, { maxWidth: col.cant - col.producto - 12 })
    doc.text(String(item.quantity), col.cant, y + 2)
    doc.text(formatCOP(item.unitPrice), col.precio, y + 2)
    doc.text(item.discountPercent ? `${item.discountPercent}%` : '—', col.desc, y + 2)
    drawRight(doc, formatCOP(item.subtotal), col.subtotal - 6, y + 2)
    y += 18
  })

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.6)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 20

  // ---------- Totales ----------
  const totalsX = pageWidth - marginX
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  drawRight(doc, `Subtotal: ${formatCOP(invoice.subtotal)}`, totalsX, y); y += 14
  drawRight(doc, `Descuento: -${formatCOP(invoice.discountTotal)}`, totalsX, y); y += 14
  drawRight(doc, `Impuesto (${invoice.taxRate}%): ${formatCOP(invoice.taxTotal)}`, totalsX, y); y += 16

  doc.setDrawColor(...GREEN)
  doc.line(totalsX - 200, y - 10, totalsX, y - 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...GREEN_DARK)
  drawRight(doc, `Total: ${formatCOP(invoice.total)}`, totalsX, y); y += 26

  // ---------- Pagos ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GREEN_DARK)
  doc.text('Pagos', marginX, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 30, 30)
  invoice.payments.forEach((p) => {
    doc.text(`${PAYMENT_LABELS[p.method] ?? p.method}: ${formatCOP(p.amount)}`, marginX, y)
    y += 13
  })
  if (invoice.changeGiven > 0) {
    doc.text(`Vuelto: ${formatCOP(invoice.changeGiven)}`, marginX, y)
    y += 13
  }

  // ---------- Pie ----------
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text('¡Gracias por su compra!', marginX, pageHeight - 40)

  doc.save(`factura-${invoice.invoiceNumber}.pdf`)
}

function drawRight(doc, text, rightX, y) {
  const width = doc.getTextWidth(text)
  doc.text(text, rightX - width, y)
}
