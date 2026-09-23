import 'dotenv/config'
import mongoose from 'mongoose'
import Product from '../src/models/Product.js'

// Precios en pesos colombianos (COP)
const PRODUCTS = [
  { name: 'Ficus benjamina', category: 'arboles', price: 25000, unit: 'unidad', emoji: '🌳', description: 'Árbol de interior o exterior, ideal para dar sombra y estructura al jardín.' },
  { name: 'Palma areca', category: 'arboles', price: 32000, unit: 'unidad', emoji: '🌴', description: 'Aporta un toque tropical, perfecta para patios y entradas.' },
  { name: 'Limón dulce', category: 'arboles', price: 28000, unit: 'unidad', emoji: '🍋', description: 'Árbol frutal de bajo mantenimiento, ideal para huertos familiares.' },
  { name: 'Boj (Buxus)', category: 'arbustos', price: 14000, unit: 'unidad', emoji: '🌿', description: 'Perfecto para setos y bordes geométricos en el jardín.' },
  { name: 'Hortensia', category: 'arbustos', price: 18000, unit: 'unidad', emoji: '💐', description: 'Flores abundantes y coloridas, ideal para zonas semisombreadas.' },
  { name: 'Lavanda', category: 'arbustos', price: 12000, unit: 'unidad', emoji: '🪻', description: 'Aromática y resistente, atrae polinizadores a tu jardín.' },
  { name: 'Orquídea Phalaenopsis', category: 'ornamentales', price: 22000, unit: 'unidad', emoji: '🌸', description: 'Elegante planta de interior con flores de larga duración.' },
  { name: 'Potus', category: 'ornamentales', price: 9000, unit: 'unidad', emoji: '🍃', description: 'Planta colgante muy fácil de cuidar, ideal para interiores.' },
  { name: 'Suculenta variada', category: 'ornamentales', price: 6000, unit: 'unidad', emoji: '🌵', description: 'Mezcla de suculentas de bajo riego, perfectas para escritorios.' },
  { name: 'Maceta de barro 25cm', category: 'macetas', price: 10000, unit: 'unidad', emoji: '🏺', description: 'Maceta artesanal de barro cocido, con excelente drenaje.' },
  { name: 'Maceta cerámica decorativa', category: 'macetas', price: 16000, unit: 'unidad', emoji: '🪴', description: 'Diseño moderno, disponible en varios colores.' },
  { name: 'Jardinera de madera', category: 'macetas', price: 35000, unit: 'unidad', emoji: '🪵', description: 'Ideal para balcones y huertos urbanos elevados.' },
]

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('Falta MONGODB_URI en backend/.env')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Conectado a MongoDB. Insertando catálogo de ejemplo...')

  await Product.deleteMany({})
  await Product.insertMany(PRODUCTS)

  console.log(`${PRODUCTS.length} productos insertados correctamente.`)
  await mongoose.disconnect()
}

seed().catch((error) => {
  console.error('Error al poblar la base de datos:', error.message)
  process.exit(1)
})
