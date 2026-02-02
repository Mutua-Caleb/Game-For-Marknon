import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import './AnswerInput.css'

function AnswerInput({ onSubmit, disabled, currentQuestion }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  // Focus input when question changes
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentQuestion, disabled])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSubmit(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e)
    }
  }

  return (
    <div className="answer-input-container">
      <form onSubmit={handleSubmit} className="answer-form">
        <div className="input-wrapper">
          <span className="input-icon">⌨️</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Waiting for question..." : "Type your answer and press Enter..."}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <motion.button
            type="submit"
            disabled={disabled || !input.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="submit-button"
          >
            <span className="button-icon">🚀</span>
            <span className="button-text">Blast!</span>
          </motion.button>
        </div>
      </form>

      {currentQuestion && currentQuestion.type === 'text' && (
        <div className="input-hint">
          Type the answer and press Enter or click Blast!
        </div>
      )}

      {currentQuestion && currentQuestion.type === 'multiple' && (
        <div className="input-hint">
          Click an option above or type the answer!
        </div>
      )}
    </div>
  )
}

export default AnswerInput
