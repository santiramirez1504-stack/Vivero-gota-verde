import { getToken } from './session.js'
import { formatCOP } from '../utils/currency.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const periodButtons = document.querySelectorAll('[data-period]')
const chartEl = document.querySelector('[data-sales-chart]')
const topProductsEl = document.querySelector('[data-top-products]')

if (chartEl) {
  let activePeriod = 'month'

  loadSales()
  loadTopProducts()

  periodButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activePeriod = button.dataset.period
      renderPeriodButtons()
      loadSales()
    })
  })

  function renderPeriodButtons() {
    periodButtons.forEach((button) => {
      const active = button.dataset.period === activePeriod
      button.classList.toggle('bg-verde-600', active)
      button.classList.toggle('text-white', active)
      button.classList.toggle('text-verde-700', !active)
    })
  }

  async function loadSales() {
    chartEl.innerHTML = `<p class="w-full text-center text-sm text-verde-800/60">Cargando...</p>`
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/reports/sales-by-period?period=${activePeriod}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      renderChart(data)
    } catch {
      chartEl.innerHTML = `<p class="w-full text-center text-sm text-verde-800/60">No se pudo cargar el reporte de ventas.</p>`
    }
  }

  function renderChart(data) {
    if (!data.length) {
      chartEl.innerHTML = `<p class="w-full text-center text-sm text-verde-800/60">Todavía no hay ventas registradas en este período.</p>`
      return
    }

    const max = Math.max(...data.map((d) => d.total), 1)

    chartEl.innerHTML = data.map((d) => `
      <div class="flex min-w-[2.5rem] flex-1 flex-col items-center justify-end gap-1">
        <span class="text-[10px] font-semibold text-verde-800">${formatCOP(d.total)}</span>
        <div class="w-full rounded-t-md bg-verde-500" style="height: ${Math.max((d.total / max) * 100, 4)}%"></div>
        <span class="whitespace-nowrap text-[10px] text-verde-800/60">${formatLabel(d.label)}</span>
      </div>
    `).join('')
  }

  function formatLabel(label) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
      const [, m, d] = label.split('-')
      return `${d} ${MONTHS[Number(m) - 1]}`
    }
    if (/^\d{4}-W\d{2}$/.test(label)) {
      const week = label.split('-W')[1]
      return `sem ${week}`
    }
    if (/^\d{4}-\d{2}$/.test(label)) {
      const [y, m] = label.split('-')
      return `${MONTHS[Number(m) - 1]} ${y}`
    }
    return label
  }

  async function loadTopProducts() {
    if (!topProductsEl) return
    topProductsEl.innerHTML = `<p class="text-sm text-verde-800/60">Cargando...</p>`
    const token = getToken()
    try {
      const res = await fetch(`${API_URL}/api/reports/top-products?limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      renderTopProducts(data)
    } catch {
      topProductsEl.innerHTML = `<p class="text-sm text-verde-800/60">No se pudo cargar el ranking de productos.</p>`
    }
  }

  function renderTopProducts(data) {
    if (!data.length) {
      topProductsEl.innerHTML = `<p class="text-sm text-verde-800/60">Todavía no hay productos vendidos.</p>`
      return
    }

    const max = Math.max(...data.map((d) => d.qty), 1)

    topProductsEl.innerHTML = data.map((d, index) => `
      <div class="flex items-center gap-3">
        <span class="w-5 text-sm font-bold text-verde-400">${index + 1}</span>
        <div class="flex-1">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-verde-900">${d.name}</span>
            <span class="text-verde-800/60">${d.qty} vendidas</span>
          </div>
          <div class="mt-1 h-2 rounded-full bg-verde-100">
            <div class="h-2 rounded-full bg-verde-500" style="width: ${(d.qty / max) * 100}%"></div>
          </div>
        </div>
      </div>
    `).join('')
  }
}
