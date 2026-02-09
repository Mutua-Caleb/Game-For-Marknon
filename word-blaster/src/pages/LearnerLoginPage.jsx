import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { learnerApi } from '../utils/api'
import './LearnerLoginPage.css'

function LearnerLoginPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !pin.trim()) {
      setError('Please enter your name and PIN')
      return
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    setIsLoading(true)

    try {
      let learner
      if (isRegistering) {
        learner = await learnerApi.register(name.trim(), pin.trim())
      } else {
        learner = await learnerApi.login(name.trim(), pin.trim())
      }

      // Store learner info in localStorage
      localStorage.setItem('learnerAccount', JSON.stringify(learner))
      localStorage.setItem('learnerId', `learner_${learner.id}`)

      navigate('/')
    } catch (err) {
      if (isRegistering && err.status === 409) {
        setError('That name is already taken. Try logging in instead.')
      } else if (!isRegistering && err.status === 401) {
        setError('Wrong name or PIN. Try again.')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="learner-login-page">
      <div className="stars-bg"></div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="login-title"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Word Blaster!
        </motion.h1>

        <p className="login-subtitle">
          {isRegistering ? 'Create your account' : 'Welcome back! Log in to play'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="4-digit PIN"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          {error && (
            <motion.div
              className="login-error"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {error}
            </motion.div>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Log In')}
          </button>
        </form>

        <button
          className="toggle-mode"
          onClick={() => {
            setIsRegistering(!isRegistering)
            setError('')
          }}
        >
          {isRegistering ? 'Already have an account? Log in' : "New here? Create an account"}
        </button>
      </motion.div>
    </div>
  )
}

export default LearnerLoginPage
