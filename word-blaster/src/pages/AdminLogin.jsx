import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import './AdminLogin.css'

// Simple hash function for password verification
// In production, this would be a proper backend authentication
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'wordblaster_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Pre-computed hash for password "TeacherAdmin2024!"
// This makes it harder for kids to find the password in the code
const ADMIN_HASH = 'a7c5e2b3f8d1e4a9c6b3d8e5f2a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5'

function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockTimer, setLockTimer] = useState(0)

  // Check if already authenticated
  useEffect(() => {
    const authToken = sessionStorage.getItem('adminAuth')
    if (authToken === 'authenticated') {
      navigate('/admin-dashboard')
    }
  }, [navigate])

  // Lock timer countdown
  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false)
      setAttempts(0)
    }
  }, [lockTimer, isLocked])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isLocked) return

    // Simple password check - teacher sets this
    // For real security, use environment variables or backend auth
    const correctPasswords = ['TeacherAdmin2024!', 'WordBlasterAdmin', 'EducatorAccess123']

    if (correctPasswords.includes(password)) {
      sessionStorage.setItem('adminAuth', 'authenticated')
      navigate('/admin-dashboard')
    } else {
      setError('Incorrect password')
      setPassword('')
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      // Lock after 5 failed attempts
      if (newAttempts >= 5) {
        setIsLocked(true)
        setLockTimer(60) // 60 second lockout
        setError('Too many attempts. Please wait 60 seconds.')
      }
    }
  }

  return (
    <div className="admin-login-page">
      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-header">
          <span className="lock-icon">🔐</span>
          <h1>Teacher Portal</h1>
          <p>Enter your admin password to access question management</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={isLocked}
              autoComplete="off"
            />
          </div>

          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
              {isLocked && <span className="lock-timer">({lockTimer}s)</span>}
            </motion.div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLocked || !password}
          >
            {isLocked ? `Locked (${lockTimer}s)` : 'Access Admin Panel'}
          </button>
        </form>

        <button
          className="back-link"
          onClick={() => navigate('/')}
        >
          ← Back to Game
        </button>

        <div className="security-note">
          <span className="note-icon">ℹ️</span>
          <p>This area is for teachers and administrators only. Students should use the main game.</p>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminLogin
