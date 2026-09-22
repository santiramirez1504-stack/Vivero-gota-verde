import jwt from 'jsonwebtoken'

export function requireDevAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'developer') {
      return res.status(403).json({ error: 'No tienes permisos de desarrollador' })
    }
    req.developer = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
