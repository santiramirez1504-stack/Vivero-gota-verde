import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './src/config/db.js'
import authRouter from './src/routes/auth.routes.js'
import uploadsRouter from './src/routes/uploads.routes.js'
import productsRouter from './src/routes/products.routes.js'
import devAuthRouter from './src/routes/devAuth.routes.js'
import settingsRouter from './src/routes/settings.routes.js'
import ordersRouter from './src/routes/orders.routes.js'
import lossesRouter from './src/routes/losses.routes.js'
import reportsRouter from './src/routes/reports.routes.js'
import inventoryRouter from './src/routes/inventory.routes.js'
import invoicesRouter from './src/routes/invoices.routes.js'
import expensesRouter from './src/routes/expenses.routes.js'
import projectsRouter from './src/routes/projects.routes.js'
import homeContentRouter from './src/routes/homeContent.routes.js'

await connectDB()

const app = express()

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/products', productsRouter)
app.use('/api/dev-auth', devAuthRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/losses', lossesRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/home-content', homeContentRouter)

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`API de Vivero Gota Verde escuchando en http://localhost:${port}`)
})
