import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { quizSessionApi } from '../utils/api'
import { speakCorrections } from '../utils/voiceover'
import './DiagramChallenge.css'

/**
 * Inline diagram challenge that appears within the Quiz Blaster flow.
 * Shows a diagram image with labels to fill in, then calls onComplete when done.
 */
function DiagramChallenge({ diagram, onComplete, playSound, quizSessionId }) {
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [activeLabel, setActiveLabel] = useState(null)
  const [showHints, setShowHints] = useState({})
  const [imageBounds, setImageBounds] = useState(null)

  const imageContainerRef = useRef(null)
  const imageRef = useRef(null)
  const inputRefs = useRef({})

  // Calculate actual image bounds within container (accounting for object-fit: contain)
  const updateImageBounds = useCallback(() => {
    if (!imageRef.current || !imageContainerRef.current) return

    const container = imageContainerRef.current.getBoundingClientRect()
    const img = imageRef.current

    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight
    if (!naturalWidth || !naturalHeight) return

    const containerAspect = container.width / container.height
    const imageAspect = naturalWidth / naturalHeight

    let renderWidth, renderHeight, offsetX, offsetY

    if (imageAspect > containerAspect) {
      renderWidth = container.width
      renderHeight = container.width / imageAspect
      offsetX = 0
      offsetY = (container.height - renderHeight) / 2
    } else {
      renderHeight = container.height
      renderWidth = container.height * imageAspect
      offsetX = (container.width - renderWidth) / 2
      offsetY = 0
    }

    setImageBounds({ left: offsetX, top: offsetY, width: renderWidth, height: renderHeight })
  }, [])

  // Update bounds on resize
  useEffect(() => {
    const observer = new ResizeObserver(updateImageBounds)
    if (imageContainerRef.current) {
      observer.observe(imageContainerRef.current)
    }
    return () => observer.disconnect()
  }, [updateImageBounds])

  // Update bounds when image might already be cached
  useEffect(() => {
    if (!imageRef.current) return
    if (imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      requestAnimationFrame(updateImageBounds)
    }
  }, [diagram, updateImageBounds])

  const handleAnswerChange = useCallback((labelKey, value) => {
    setAnswers(prev => ({ ...prev, [labelKey]: value }))
  }, [])

  const handleLabelClick = useCallback((labelKey) => {
    setActiveLabel(labelKey)
    if (inputRefs.current[labelKey]) {
      inputRefs.current[labelKey].focus()
    }
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

      // Record in quiz session for monitoring
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

    // Voice-over for wrong labels
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
  }, [diagram, answers, playSound])

  const handleContinue = useCallback(() => {
    if (!diagram || !results) return

    const correctCount = Object.values(results).filter(Boolean).length
    const totalLabels = diagram.labels.length

    onComplete({
      correctCount,
      totalLabels,
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
          {/* Diagram image with labels */}
          <div className="dc-image-container" ref={imageContainerRef}>
            <img
              ref={imageRef}
              src={diagram.image_url}
              alt={diagram.title}
              className="dc-image"
              onLoad={updateImageBounds}
            />

            {imageBounds && (
              <div
                className="dc-overlay-wrapper"
                style={{
                  position: 'absolute',
                  left: imageBounds.left,
                  top: imageBounds.top,
                  width: imageBounds.width,
                  height: imageBounds.height,
                  pointerEvents: 'none'
                }}
              >
                <svg className="dc-overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {diagram.labels.map(label => (
                    <line
                      key={`line-${label.label_key}`}
                      x1={label.x_percent}
                      y1={label.y_percent}
                      x2={label.pointer_x}
                      y2={label.pointer_y}
                      stroke={results ? (results[label.label_key] ? '#22c55e' : '#ef4444') : (activeLabel === label.label_key ? '#f59e0b' : '#475569')}
                      strokeWidth="0.3"
                      strokeDasharray={results ? 'none' : '1,0.5'}
                    />
                  ))}
                </svg>

                {diagram.labels.map(label => (
                  <motion.div
                    key={`label-${label.label_key}`}
                    className={`dc-label-marker ${
                      activeLabel === label.label_key ? 'active' : ''
                    } ${
                      results ? (results[label.label_key] ? 'correct' : 'wrong') : ''
                    }`}
                    style={{
                      left: `${label.x_percent}%`,
                      top: `${label.y_percent}%`,
                      pointerEvents: 'auto'
                    }}
                    onClick={() => handleLabelClick(label.label_key)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {label.label_key}
                  </motion.div>
                ))}

                {diagram.labels.map(label => (
                  <div
                    key={`dot-${label.label_key}`}
                    className={`dc-pointer-dot ${
                      results ? (results[label.label_key] ? 'correct' : 'wrong') : ''
                    }`}
                    style={{
                      left: `${label.pointer_x}%`,
                      top: `${label.pointer_y}%`
                    }}
                  />
                ))}
              </div>
            )}
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
