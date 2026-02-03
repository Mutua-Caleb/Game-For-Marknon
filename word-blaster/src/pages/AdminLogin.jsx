import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi } from '../utils/api'
import './AdminLogin.css'

function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [lockTimer, setLockTimer] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Check if already authenticated
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (token) {
      authApi.verify().then(() => {
        navigate('/admin-dashboard')
      }).catch(() => {
        sessionStorage.removeItem('adminToken')
      })
    }
  }, [navigate])

  // Lock timer countdown
  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false)
    }
  }, [lockTimer, isLocked])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLocked || isLoading) return

    setIsLoading(true)
    setError('')

    try {
      const data = await authApi.login(username, password)
      sessionStorage.setItem('adminToken', data.token)
      navigate('/admin-dashboard')
    } catch (err) {
      setPassword('')

      if (err.status === 429) {
        setIsLocked(true)
        setLockTimer(err.data?.lockoutSeconds || 60)
        setError(err.data?.error || 'Too many attempts. Please wait.')
      } else if (err.status === 401) {
        const remaining = err.data?.attemptsRemaining
        setError(
          remaining !== undefined
            ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Invalid username or password.'
        )
      } else {
        setError('Server error. Please try again.')
      }
    } finally {
      setIsLoading(false)
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
          <p>Sign in to manage questions and view analytics</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={isLocked || isLoading}
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isLocked || isLoading}
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
            disabled={isLocked || !password || isLoading}
          >
            {isLoading ? 'Signing in...' : isLocked ? `Locked (${lockTimer}s)` : 'Sign In'}
          </button>
        </form>

        <button
          className="back-link"
          onClick={() => navigate('/')}
        >
          &larr; Back to Game
        </button>

        <div className="security-note">
          <span className="note-icon">&#8505;&#65039;</span>
          <p>This area is for teachers and administrators only. Default login: admin / TeacherAdmin2024!</p>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminLogin
