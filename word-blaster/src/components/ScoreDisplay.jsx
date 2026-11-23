import { motion as Motion, AnimatePresence } from 'framer-motion'
import { ObservatoryIcon } from './RealmIcons'
import './ScoreDisplay.css'

function ScoreDisplay({ score, streak, correct, wrong }) {
  return (
    <div className="score-display">
      <div className="score-main">
        <span className="score-icon">
          <ObservatoryIcon name="trophy" size={18} />
        </span>
        <AnimatePresence mode="wait">
          <Motion.span
            key={score}
            className="score-value mono-num"
            initial={{ scale: 1.32, color: '#f5b942' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.25 }}
          >
            {score}
          </Motion.span>
        </AnimatePresence>
      </div>

      {streak > 0 && (
        <Motion.div
          className="streak-display"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        >
          <span className="streak-icon">
            <ObservatoryIcon name="flame" size={15} />
          </span>
          <span className="streak-value mono-num">{streak}x</span>
        </Motion.div>
      )}

      <div className="stats-mini mono-num">
        <span className="stat-correct">
          <ObservatoryIcon name="check" size={14} />
          {correct}
        </span>
        <span className="stat-wrong">
          <ObservatoryIcon name="target" size={14} />
          {wrong}
        </span>
      </div>
    </div>
  )
}

export default ScoreDisplay
