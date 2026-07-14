import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSound } from '../context/SoundContext'
import { motion as Motion } from 'framer-motion'
import { learnerApi } from '../utils/api'
import learningLabArt from '../assets/learning-lab.png'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const { playSound, isMuted, toggleMute } = useSound()
  const [dailyStatus, setDailyStatus] = useState(null)
  const [earnings, setEarnings] = useState(null)

  // Get learner account from localStorage
  const learnerAccount = (() => {
    try {
      return JSON.parse(localStorage.getItem('learnerAccount'))
    } catch {
      return null
    }
  })()

  // Fetch daily status and earnings on mount
  useEffect(() => {
    if (learnerAccount?.id) {
      learnerApi.getDailyStatus(learnerAccount.id)
        .then(setDailyStatus)
        .catch(console.error)
      learnerApi.getEarnings(learnerAccount.id)
        .then(setEarnings)
        .catch(console.error)
    }
  }, [learnerAccount?.id])

  const handlePlay = () => {
    playSound('click')
    navigate('/topics')
  }

  const handleWriting = () => {
    playSound('click')
    navigate('/writing')
  }

  const handleLatin = () => {
    playSound('click')
    navigate('/latin')
  }

  const handleMath = () => {
    playSound('click')
    navigate('/math')
  }

  const handleChemistry = () => {
    playSound('click')
    navigate('/chemistry')
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

      <Motion.div
        className="home-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Motion.div
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
        </Motion.div>

        <p className="tagline">Learn Chemistry, English, Latin, Math & more while having fun!</p>

        {/* Daily Progress Card */}
        {dailyStatus && (
          <Motion.div
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
          </Motion.div>
        )}

        {/* Earnings Card */}
        {earnings && (
          <Motion.div
            className="earnings-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="earnings-card-header">
              <span className="earnings-card-icon">KSh</span>
              <span className="earnings-card-title">My Earnings</span>
            </div>
            <div className="earnings-card-amounts">
              <div className="earnings-stat">
                <span className="earnings-stat-value">KSh {earnings.todayEarnings.toFixed(2)}</span>
                <span className="earnings-stat-label">Today ({earnings.todayFocusBlocks || 0} focus blocks)</span>
              </div>
              <div className="earnings-divider"></div>
              <div className="earnings-stat">
                <span className="earnings-stat-value">KSh {earnings.weekEarnings.toFixed(2)}</span>
                <span className="earnings-stat-label">This week</span>
              </div>
              <div className="earnings-divider"></div>
              <div className="earnings-stat">
                <span className="earnings-stat-value earnings-balance">KSh {earnings.unpaidTotal.toFixed(2)}</span>
                <span className="earnings-stat-label">Balance</span>
              </div>
            </div>
            <div className="earnings-card-rate">
              KSh 20 for every completed focus block
            </div>
          </Motion.div>
        )}

        <Motion.div
          className="learning-lab-card"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
        >
          <img src={learningLabArt} alt="" className="learning-lab-art" />
          <div className="learning-lab-copy">
            <span className="learning-lab-eyebrow">Choose your mission</span>
            <strong>One place for Chemistry Academy, Latin memory, speed math, quizzes, and writing.</strong>
          </div>
        </Motion.div>

        <div className="home-buttons">
          <Motion.button
            className="play-button chemistry-home-button"
            onClick={handleChemistry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="button-icon">&#9879;</span>
            Chemistry Academy
          </Motion.button>

          <Motion.button
            className="play-button"
            onClick={handlePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="button-icon">&#128640;</span>
            Start Playing!
          </Motion.button>

          <Motion.button
            className="play-button latin-home-button"
            onClick={handleLatin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="button-icon">&#127757;</span>
            Latin World
          </Motion.button>

          <Motion.button
            className="play-button math-home-button"
            onClick={handleMath}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="button-icon">&#10133;</span>
            Speed Math
          </Motion.button>

          <Motion.button
            className="play-button writing-button"
            onClick={handleWriting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="button-icon">&#9997;&#65039;</span>
            Writing Practice
          </Motion.button>
        </div>

        <div className="home-features">
          <div className="feature">
            <span className="feature-icon">&#9879;</span>
            <span className="feature-text">Chemistry</span>
          </div>
          <div className="feature">
            <span className="feature-icon">&#128218;</span>
            <span className="feature-text">English</span>
          </div>
          <div className="feature">
            <span className="feature-icon">&#10013;&#65039;</span>
            <span className="feature-text">CRE</span>
          </div>
          <div className="feature">
            <span className="feature-icon">&#127912;</span>
            <span className="feature-text">Creative Arts</span>
          </div>
          <div className="feature">
            <span className="feature-icon">&#127806;</span>
            <span className="feature-text">Agriculture</span>
          </div>
          <div className="feature">
            <span className="feature-icon">&#127757;</span>
            <span className="feature-text">Social Studies</span>
          </div>
        </div>

        <button
          className="sound-toggle"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? 'ðŸ”‡' : 'ðŸ”Š'}
        </button>
      </Motion.div>

      <div className="floating-elements">
        <Motion.span
          className="floating-emoji"
          animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ left: '10%', top: '20%' }}
        >&#128214;</Motion.span>
        <Motion.span
          className="floating-emoji"
          animate={{ y: [0, -15, 0], rotate: [0, -10, 10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
          style={{ right: '15%', top: '30%' }}
        >&#128300;</Motion.span>
        <Motion.span
          className="floating-emoji"
          animate={{ y: [0, -25, 0], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          style={{ left: '20%', bottom: '25%' }}
        >&#127775;</Motion.span>
        <Motion.span
          className="floating-emoji"
          animate={{ y: [0, -18, 0], rotate: [0, -15, 15, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: 0.8 }}
          style={{ right: '10%', bottom: '20%' }}
        >&#127919;</Motion.span>
      </div>
    </div>
  )
}

export default HomePage
