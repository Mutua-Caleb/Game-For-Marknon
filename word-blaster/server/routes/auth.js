import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../db.js'
import { generateToken } from '../middleware/auth.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'word-blaster-admin-secret-key-change-in-production'

// Track login attempts per IP
const loginAttempts = new Map()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 60 * 1000 // 60 seconds

function checkRateLimit(ip) {
  const attempts = loginAttempts.get(ip)
  if (!attempts) return { allowed: true }

  if (attempts.count >= MAX_ATTEMPTS) {
    const elapsed = Date.now() - attempts.lastAttempt
    if (elapsed < LOCKOUT_DURATION) {
      return {
        allowed: false,
        remainingSeconds: Math.ceil((LOCKOUT_DURATION - elapsed) / 1000)
      }
    }
    loginAttempts.delete(ip)
    return { allowed: true }
  }
  return { allowed: true }
}

function recordAttempt(ip) {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }
  attempts.count++
  attempts.lastAttempt = Date.now()
  loginAttempts.set(ip, attempts)
}

function clearAttempts(ip) {
  loginAttempts.delete(ip)
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress
  const rateLimit = checkRateLimit(ip)

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${rateLimit.remainingSeconds} seconds.`,
      lockoutSeconds: rateLimit.remainingSeconds
    })
  }

  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' })
  }

  try {
    const db = getDb()
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.toLowerCase())

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      recordAttempt(ip)
      const attempts = loginAttempts.get(ip)
      const remaining = MAX_ATTEMPTS - attempts.count

      return res.status(401).json({
        error: 'Invalid username or password.',
        attemptsRemaining: Math.max(0, remaining)
      })
    }

    clearAttempts(ip)
    const token = generateToken(user.id, user.username)

    res.json({
      token,
      user: { id: user.id, username: user.username }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error during login.' })
  }
})

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ valid: false })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    res.json({ valid: true, user: { id: decoded.userId, username: decoded.username } })
  } catch (err) {
    res.status(401).json({ valid: false })
  }
})

// POST /api/auth/change-password
router.post('/change-password', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(decoded.userId)

    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' })
    }

    const newHash = bcrypt.hashSync(newPassword, 10)
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, decoded.userId)

    res.json({ message: 'Password changed successfully.' })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

export default router
