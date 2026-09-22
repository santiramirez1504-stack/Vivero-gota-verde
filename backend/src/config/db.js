import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.warn('⚠️  MONGODB_URI no está configurada en backend/.env — el catálogo no funcionará hasta que la agregues.')
    return
  }

  try {
    await mongoose.connect(uri)
    console.log('Conectado a MongoDB')
  } catch (error) {
    console.error('Error conectando a MongoDB:', error.message)
  }
}
