import { useNavigate } from 'react-router-dom'
import { useSound } from '../context/SoundContext'
import { motion } from 'framer-motion'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const { playSound, isMuted, toggleMute } = useSound()

  const handlePlay = () => {
    playSound('click')
    navigate('/topics')
  }

  return (
    <div className="home-page">
      <div className="stars-bg"></div>

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
            <span className="star">⭐</span>
            <span className="star">⭐</span>
            <span className="star">⭐</span>
          </div>
        </motion.div>

        <p className="tagline">Learn Science & English while having fun!</p>

        <motion.button
          className="play-button"
          onClick={handlePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="button-icon">🚀</span>
          Start Playing!
        </motion.button>

        <div className="home-features">
          <div className="feature">
            <span className="feature-icon">🧠</span>
            <span className="feature-text">Science</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📚</span>
            <span className="feature-text">English</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🎮</span>
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
        >📖</motion.span>
        <motion.span
          className="floating-emoji"
          animate={{ y: [0, -15, 0], rotate: [0, -10, 10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
          style={{ right: '15%', top: '30%' }}
        >🔬</motion.span>
        <motion.span
          className="floating-emoji"
          animate={{ y: [0, -25, 0], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          style={{ left: '20%', bottom: '25%' }}
        >🌟</motion.span>
        <motion.span
          className="floating-emoji"
          animate={{ y: [0, -18, 0], rotate: [0, -15, 15, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: 0.8 }}
          style={{ right: '10%', bottom: '20%' }}
        >🎯</motion.span>
      </div>
    </div>
  )
}

export default HomePage
