import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import './ResultsPage.css'

function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { playSound } = useSound()
  const { playerStats, getMostFailedQuestions } = useGame()

  const sessionStats = location.state || {
    score: 0,
    correct: 0,
    wrong: 0,
    streak: 0
  }

  const totalQuestions = sessionStats.correct + sessionStats.wrong
  const accuracy = totalQuestions > 0 ? Math.round((sessionStats.correct / totalQuestions) * 100) : 0

  const getGrade = () => {
    if (accuracy >= 90) return { grade: 'A+', emoji: '🌟', color: '#00b894' }
    if (accuracy >= 80) return { grade: 'A', emoji: '⭐', color: '#00cec9' }
    if (accuracy >= 70) return { grade: 'B', emoji: '👍', color: '#6c5ce7' }
    if (accuracy >= 60) return { grade: 'C', emoji: '💪', color: '#fdcb6e' }
    return { grade: 'Keep Practicing!', emoji: '📚', color: '#e17055' }
  }

  const { grade, emoji, color } = getGrade()
  const failedQuestions = getMostFailedQuestions(5)

  const handlePlayAgain = () => {
    playSound('click')
    navigate('/topics')
  }

  const handleHome = () => {
    playSound('click')
    navigate('/')
  }

  return (
    <div className="results-page">
      <motion.div
        className="results-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="results-header"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <span className="result-emoji">{emoji}</span>
          <h1 className="result-grade" style={{ color }}>{grade}</h1>
        </motion.div>

        <div className="results-cards">
          <motion.div
            className="result-card score-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="card-icon">🏆</span>
            <span className="card-label">Score</span>
            <span className="card-value">{sessionStats.score}</span>
          </motion.div>

          <motion.div
            className="result-card accuracy-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="card-icon">🎯</span>
            <span className="card-label">Accuracy</span>
            <span className="card-value">{accuracy}%</span>
          </motion.div>
        </div>

        <motion.div
          className="stats-breakdown"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2>Your Performance</h2>
          <div className="stats-grid">
            <div className="stat-item correct">
              <span className="stat-icon">✅</span>
              <span className="stat-value">{sessionStats.correct}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="stat-item wrong">
              <span className="stat-icon">❌</span>
              <span className="stat-value">{sessionStats.wrong}</span>
              <span className="stat-label">Missed</span>
            </div>
            <div className="stat-item streak">
              <span className="stat-icon">🔥</span>
              <span className="stat-value">{playerStats.bestStreak}</span>
              <span className="stat-label">Best Streak</span>
            </div>
            <div className="stat-item total">
              <span className="stat-icon">📊</span>
              <span className="stat-value">{playerStats.totalScore}</span>
              <span className="stat-label">Total Score</span>
            </div>
          </div>
        </motion.div>

        {failedQuestions.length > 0 && (
          <motion.div
            className="practice-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2>Questions to Practice</h2>
            <p className="practice-hint">These questions will appear more often to help you learn!</p>
            <div className="practice-list">
              {failedQuestions.slice(0, 3).map((q, index) => (
                <div key={q.id} className="practice-item">
                  <span className="practice-number">{index + 1}</span>
                  <div className="practice-content">
                    <div className="practice-question">{q.question}</div>
                    <div className="practice-answer">Answer: {q.answer}</div>
                  </div>
                  <div className="practice-stats">
                    {Math.round(q.failureRate * 100)}% missed
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          className="results-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button className="play-again-btn" onClick={handlePlayAgain}>
            <span className="btn-icon">🎮</span>
            Play Again
          </button>
          <button className="home-btn" onClick={handleHome}>
            <span className="btn-icon">🏠</span>
            Home
          </button>
        </motion.div>
      </motion.div>

      {/* Confetti effect for good scores */}
      {accuracy >= 70 && (
        <div className="confetti-container">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="confetti"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 720 - 360
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: Math.random() * 0.5,
                ease: 'linear'
              }}
              style={{
                left: Math.random() * 100 + '%',
                backgroundColor: ['#00b894', '#00cec9', '#6c5ce7', '#fdcb6e', '#fd79a8'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ResultsPage
