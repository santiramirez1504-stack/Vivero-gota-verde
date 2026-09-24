import './style.css'
import './maintenance.js'
import './homeContent.js'
import './catalog.js'
import './booking.js'
import './gallery.js'

// TODO: reemplazar por el número de WhatsApp real del vivero (con código de país, sin +, ni espacios)
const WHATSAPP_NUMBER = '10000000000'

const ctaWhatsappButton = document.querySelector('[data-cta-whatsapp]')
ctaWhatsappButton?.addEventListener('click', () => {
  const message = 'Hola, quiero solicitar una cotización.'
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
})

const menuButton = document.querySelector('[data-menu-button]')
const mobileMenu = document.querySelector('[data-mobile-menu]')

menuButton?.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('flex')
  mobileMenu.classList.toggle('hidden')
  menuButton.setAttribute('aria-expanded', String(isOpen))
})

document.querySelectorAll('[data-mobile-menu] a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden')
    mobileMenu.classList.remove('flex')
    menuButton?.setAttribute('aria-expanded', 'false')
  })
})

const header = document.querySelector('[data-header]')
const onScroll = () => {
  if (window.scrollY > 8) {
    header?.classList.add('shadow-md', 'bg-white')
    header?.classList.remove('bg-white/70')
  } else {
    header?.classList.remove('shadow-md')
    header?.classList.add('bg-white/70')
  }
}
window.addEventListener('scroll', onScroll)
onScroll()
