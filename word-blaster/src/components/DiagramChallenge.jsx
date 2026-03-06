import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { quizSessionApi } from '../utils/api'
import { speakCorrections } from '../utils/voiceover'
import './DiagramChallenge.css'

/**
 * Inline diagram challenge that appears within the Quiz Blaster flow.
 * Shows a pre-labeled diagram image (labels drawn on the image itself).
 * Student types answers in a list on the right: A = ___, B = ___, etc.
 */
function DiagramChallenge({ diagram, onComplete, playSound, quizSessionId }) {
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [activeLabel, setActiveLabel] = useState(null)
  const [showHints, setShowHints] = useState({})

  const inputRefs = useRef({})

  const handleAnswerChange = useCallback((labelKey, value) => {
    setAnswers(prev => ({ ...prev, [labelKey]: value }))
  }, [])

  const toggleHint = useCallback((labelKey) => {
    playSound('click')
    setShowHints(prev => ({ ...prev, [labelKey]: !prev[labelKey] }))
  }, [playSound])

  const handleCheckAnswers = useCallback(() => {
    if (!diagram) return

    playSound('click')
    const checkResults = {}
    let correctCount = 0

    for (const label of diagram.labels) {
      const userAnswer = (answers[label.label_key] || '').trim().toLowerCase()
      const correctAnswer = label.correct_answer.toLowerCase()

      const isCorrect = userAnswer === correctAnswer ||
        userAnswer === correctAnswer.replace(/\s+/g, '') ||
        (correctAnswer.includes(userAnswer) && userAnswer.length > 3)

      checkResults[label.label_key] = isCorrect
      if (isCorrect) correctCount++

      if (quizSessionId) {
        quizSessionApi.recordAnswer(quizSessionId, {
          questionId: `diagram_${diagram.id}_${label.label_key}`,
          questionText: `${diagram.title} - Label ${label.label_key}`,
          correctAnswer: label.correct_answer,
          givenAnswer: answers[label.label_key] || '',
          isCorrect,
          timeTakenMs: 0
        }).catch(console.error)
      }
    }

    setResults(checkResults)

    const wrongLabels = diagram.labels.filter(l => !checkResults[l.label_key])
    if (wrongLabels.length > 0) {
      const corrections = wrongLabels.map(l =>
        `Label ${l.label_key} is ${l.correct_answer}`
      )
      speakCorrections(corrections)
    }

    if (correctCount === diagram.labels.length) {
      playSound('correct')
    } else if (correctCount > 0) {
      playSound('click')
    } else {
      playSound('wrong')
    }
  }, [diagram, answers, playSound, quizSessionId])

  const handleContinue = useCallback(() => {
    if (!diagram || !results) return

    const correctCount = Object.values(results).filter(Boolean).length
    onComplete({
      correctCount,
      totalLabels: diagram.labels.length,
      diagramTitle: diagram.title
    })
  }, [diagram, results, onComplete])

  if (!diagram) return null

  return (
    <motion.div
      className="diagram-challenge-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="diagram-challenge">
        <div className="dc-header">
          <div className="dc-badge">Diagram Challenge</div>
          <h2 className="dc-title">{diagram.title}</h2>
          {diagram.description && (
            <p className="dc-description">{diagram.description}</p>
          )}
        </div>

        <div className="dc-content">
          {/* Diagram image (labels are pre-drawn on the image) */}
          <div className="dc-image-container">
            <img
              src={diagram.image_url}
              alt={diagram.title}
              className="dc-image"
            />
          </div>

          {/* Answer panel */}
          <div className="dc-answer-panel">
            <h3 className="dc-panel-title">Label each part:</h3>

            <div className="dc-answer-list">
              {diagram.labels.map(label => (
                <div
                  key={`answer-${label.label_key}`}
                  className={`dc-answer-row ${
                    activeLabel === label.label_key ? 'active' : ''
                  } ${
                    results ? (results[label.label_key] ? 'correct' : 'wrong') : ''
                  }`}
                  onClick={() => setActiveLabel(label.label_key)}
                >
                  <div className="dc-answer-key">{label.label_key}</div>
                  <div className="dc-answer-input-wrapper">
                    <input
                      ref={el => { inputRefs.current[label.label_key] = el }}
                      type="text"
                      className="dc-answer-input"
                      value={answers[label.label_key] || ''}
                      onChange={e => handleAnswerChange(label.label_key, e.target.value)}
                      onFocus={() => setActiveLabel(label.label_key)}
                      placeholder="Type the name..."
                      disabled={!!results}
                      autoComplete="off"
                    />
                    {results && !results[label.label_key] && (
                      <div className="dc-correct-answer">{label.correct_answer}</div>
                    )}
                    {results && results[label.label_key] && (
                      <div className="dc-correct-check">&#10003;</div>
                    )}
                  </div>
                  {!results && label.hint && (
                    <button
                      className="dc-hint-btn"
                      onClick={(e) => { e.stopPropagation(); toggleHint(label.label_key) }}
                      title="Show hint"
                    >
                      ?
                    </button>
                  )}
                  {showHints[label.label_key] && !results && (
                    <div className="dc-hint-text">{label.hint}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="dc-actions">
              {!results ? (
                <motion.button
                  className="dc-btn check"
                  onClick={handleCheckAnswers}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={Object.keys(answers).length === 0}
                >
                  Check Answers
                </motion.button>
              ) : (
                <motion.button
                  className="dc-btn continue"
                  onClick={handleContinue}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continue Quiz &#10140;
                </motion.button>
              )}
            </div>

            {results && (
              <motion.div
                className="dc-result-summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {Object.values(results).filter(Boolean).length} / {diagram.labels.length} correct
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default DiagramChallenge
