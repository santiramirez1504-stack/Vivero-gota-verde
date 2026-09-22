import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body ?? {}

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' })
  }

  const validUser = usuario === process.env.ADMIN_USER
  const validPassword = validUser && await bcrypt.compare(contrasena, process.env.ADMIN_PASSWORD_HASH || '')

  if (!validUser || !validPassword) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '8h' })
  res.json({ token })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ usuario: req.admin.usuario })
})

export default router
