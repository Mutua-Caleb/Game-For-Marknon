import { motion, AnimatePresence } from 'framer-motion'
import './ScoreDisplay.css'

function ScoreDisplay({ score, streak, correct, wrong }) {
  return (
    <div className="score-display">
      <div className="score-main">
        <span className="score-icon">🏆</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={score}
            className="score-value"
            initial={{ scale: 1.5, color: '#fdcb6e' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.3 }}
          >
            {score}
          </motion.span>
        </AnimatePresence>
      </div>

      {streak > 0 && (
        <motion.div
          className="streak-display"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        >
          <span className="streak-icon">🔥</span>
          <span className="streak-value">{streak}</span>
        </motion.div>
      )}

      <div className="stats-mini">
        <span className="stat-correct">✅ {correct}</span>
        <span className="stat-wrong">❌ {wrong}</span>
      </div>
    </div>
  )
}

export default ScoreDisplay
