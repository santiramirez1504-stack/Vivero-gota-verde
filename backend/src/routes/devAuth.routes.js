import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { requireDevAuth } from '../middleware/requireDevAuth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body ?? {}

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' })
  }

  const validUser = usuario === process.env.DEV_USER
  const validPassword = validUser && await bcrypt.compare(contrasena, process.env.DEV_PASSWORD_HASH || '')

  if (!validUser || !validPassword) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const token = jwt.sign({ usuario, role: 'developer' }, process.env.JWT_SECRET, { expiresIn: '4h' })
  res.json({ token })
})

router.get('/me', requireDevAuth, (req, res) => {
  res.json({ usuario: req.developer.usuario })
})

export default router
