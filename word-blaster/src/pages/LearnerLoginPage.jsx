import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { learnerApi } from '../utils/api'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { ObservatoryIcon } from '../components/RealmIcons'
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
    <div className="learner-login-page" data-realm="cat4">
      <AmbientBackdrop realm="cat4" />

      <Motion.div
        className="login-card obs-panel"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-crest">
          <ObservatoryIcon name="sparkles" size={26} />
        </div>

        <span className="login-eyebrow">British Year 6–7 Prep Academy</span>
        <h1 className="login-title">Scholar&apos;s Observatory</h1>

        <p className="login-subtitle">
          {isRegistering
            ? 'Register your scholar profile to track mastery & rewards'
            : 'Sign in to continue your daily prep mission'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Scholar Name</label>
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
            <label htmlFor="pin">Access PIN</label>
            <input
              id="pin"
              type="password"
              className="pin-input mono-num"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          {error && (
            <Motion.div
              className="login-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ObservatoryIcon name="alert" size={16} />
              <span>{error}</span>
            </Motion.div>
          )}

          <button type="submit" className="btn-tactile login-button" disabled={isLoading}>
            {isLoading ? 'Entering Observatory...' : (isRegistering ? 'Create Scholar Profile' : 'Enter Observatory')}
            {!isLoading && <ObservatoryIcon name="arrow-right" size={18} />}
          </button>
        </form>

        <button
          type="button"
          className="toggle-mode"
          onClick={() => {
            setIsRegistering(!isRegistering)
            setError('')
          }}
        >
          {isRegistering ? 'Already registered? Sign in' : 'New scholar? Create an account'}
        </button>
      </Motion.div>
    </div>
  )
}

export default LearnerLoginPage
