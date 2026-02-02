import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './FallingQuestion.css'

function FallingQuestion({ question, duration, isPaused, onTimeout, onOptionClick }) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [position, setPosition] = useState(0)
  const intervalRef = useRef(null)
  const hasTimedOut = useRef(false)

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    const updateInterval = 50 // Update every 50ms for smooth animation
    const decrementAmount = (100 / (duration * 1000)) * updateInterval // How much to move per interval

    intervalRef.current = setInterval(() => {
      setPosition(prev => {
        const newPos = prev + decrementAmount
        if (newPos >= 100 && !hasTimedOut.current) {
          hasTimedOut.current = true
          clearInterval(intervalRef.current)
          onTimeout()
        }
        return Math.min(newPos, 100)
      })

      setTimeLeft(prev => {
        const newTime = prev - (updateInterval / 1000)
        return Math.max(newTime, 0)
      })
    }, updateInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [duration, isPaused, onTimeout])

  const timePercent = (timeLeft / duration) * 100
  const getTimeColor = () => {
    if (timePercent > 50) return '#00b894'
    if (timePercent > 25) return '#fdcb6e'
    return '#e74c3c'
  }

  return (
    <motion.div
      className="falling-question"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        top: `${position}%`,
        left: `${question.x}%`
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'tween', duration: 0.05 }}
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="question-bubble">
        {question.image && (
          <div className="question-image">
            <img src={question.image} alt="" />
          </div>
        )}

        <div className="question-text">{question.question}</div>

        {question.hint && (
          <div className="question-hint">
            <span className="hint-icon">💡</span>
            {question.hint}
          </div>
        )}

        {/* Multiple choice options */}
        {question.type === 'multiple' && question.options && (
          <div className="question-options">
            {question.options.map((option, index) => (
              <button
                key={index}
                className="option-button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOptionClick(option)
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Timer bar */}
        <div className="timer-bar">
          <div
            className="timer-fill"
            style={{
              width: `${timePercent}%`,
              backgroundColor: getTimeColor()
            }}
          />
        </div>

        <div className="timer-text" style={{ color: getTimeColor() }}>
          {Math.ceil(timeLeft)}s
        </div>
      </div>
    </motion.div>
  )
}

export default FallingQuestion
