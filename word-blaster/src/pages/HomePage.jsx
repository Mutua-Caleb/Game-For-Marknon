import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSound } from '../context/SoundContext'
import { motion } from 'framer-motion'
import { learnerApi } from '../utils/api'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const { playSound, isMuted, toggleMute } = useSound()
  const [dailyStatus, setDailyStatus] = useState(null)

  // Get learner account from localStorage
  const learnerAccount = (() => {
    try {
      return JSON.parse(localStorage.getItem('learnerAccount'))
    } catch {
      return null
    }
  })()

  // Fetch daily status on mount
  useEffect(() => {
    if (learnerAccount?.id) {
      learnerApi.getDailyStatus(learnerAccount.id)
        .then(setDailyStatus)
        .catch(console.error)
    }
  }, [learnerAccount?.id])

  const handlePlay = () => {
    playSound('click')
    navigate('/topics')
  }

  const handleLogout = () => {
    localStorage.removeItem('learnerAccount')
    localStorage.removeItem('learnerId')
    navigate('/login')
  }

  const progressPercent = dailyStatus
    ? Math.min(100, (dailyStatus.minutesCompleted / dailyStatus.minutesRequired) * 100)
    : 0

  return (
    <div className="home-page">
      <div className="stars-bg"></div>

      {/* Learner info bar */}
      <div className="learner-bar">
        <span className="learner-name">Hi, {learnerAccount?.name || 'Learner'}!</span>
        <button className="logout-button" onClick={handleLogout}>Log out</button>
      </div>

      <motion.div
        className="home-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="logo-container"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <h1 className="game-title">
            <span className="title-word">Word</span>
            <span className="title-blaster">Blaster!</span>
          </h1>
          <div className="title-stars">
            <span className="star">&#11088;</span>
            <span className="star">&#11088;</span>
            <span className="star">&#11088;</span>
          </div>
        </motion.div>

        <p className="tagline">Learn Science & English while having fun!</p>

        {/* Daily Progress Card */}
        {dailyStatus && (
          <motion.div
            className="daily-progress-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="progress-title">Today's Progress</div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {dailyStatus.minutesCompleted} / {dailyStatus.minutesRequired} minutes
              {dailyStatus.quotaMet && <span className="quota-met"> - Done!</span>}
            </div>
          </motion.div>
        )}

        <motion.button
          className="play-button"
          onClick={handlePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="button-icon">&#128640;</span>
          Start Playing!
        </motion.button>

        <div className="home-features">
          <div className="feature">
            <span className="feature-icon">&#129504;</span>
            <span className="feature-text">Science</span>
          </div>
          <div className="feature">
            <span className="feature-icon">&#128218;</span>
            <span className="feature-text">English</span>
          </div>
          <div className="feature">
            <span className="feature-icon">&#127918;</span>
            <span className="feature-text">Fun Games</span>
          </div>
        </div>

        <button
          className="sound-toggle"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </motion.div>

      <div className="floating-elements">
        <motion.span
          className="floating-emoji"
          animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ left: '10%', top: '20%' }}
        >&#128214;</motion.span>
        <motion.span
          className="floating-emoji"
          animate={{ y: [0, -15, 0], rotate: [0, -10, 10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
          style={{ right: '15%', top: '30%' }}
        >&#128300;</motion.span>
        <motion.span
          className="floating-emoji"
          animate={{ y: [0, -25, 0], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          style={{ left: '20%', bottom: '25%' }}
        >&#127775;</motion.span>
        <motion.span
          className="floating-emoji"
          animate={{ y: [0, -18, 0], rotate: [0, -15, 15, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: 0.8 }}
          style={{ right: '10%', bottom: '20%' }}
        >&#127919;</motion.span>
      </div>
    </div>
  )
}

export default HomePage
