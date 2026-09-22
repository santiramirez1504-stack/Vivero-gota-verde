import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { connectDB } from './src/config/db.js'
import authRouter from './src/routes/auth.routes.js'
import uploadsRouter from './src/routes/uploads.routes.js'
import productsRouter from './src/routes/products.routes.js'
import devAuthRouter from './src/routes/devAuth.routes.js'
import settingsRouter from './src/routes/settings.routes.js'

await connectDB()

const app = express()

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

function fingerprint(value) {
  if (!value) return null
  return {
    length: value.length,
    sha256_8: crypto.createHash('sha256').update(value).digest('hex').slice(0, 8),
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    env: {
      ADMIN_USER: fingerprint(process.env.ADMIN_USER),
      ADMIN_PASSWORD_HASH: fingerprint(process.env.ADMIN_PASSWORD_HASH),
      DEV_USER: fingerprint(process.env.DEV_USER),
      DEV_PASSWORD_HASH: fingerprint(process.env.DEV_PASSWORD_HASH),
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
      MONGODB_URI: Boolean(process.env.MONGODB_URI),
      CLOUDINARY_CLOUD_NAME: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
    },
  })
})

app.use('/api/auth', authRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/products', productsRouter)
app.use('/api/dev-auth', devAuthRouter)
app.use('/api/settings', settingsRouter)

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`API de Vivero Gota Verde escuchando en http://localhost:${port}`)
})
