import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { quizSessionApi, learnerApi } from '../utils/api'
import { speakCorrections, cancelSpeech } from '../utils/voiceover'
import EarningsBar from '../components/EarningsBar'
import './DiagramGamePage.css'

function DiagramGamePage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const { getFilteredDiagrams, selectedSubject, selectedTopics } = useGame()

  const [allDiagrams, setAllDiagrams] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { labelKey: userAnswer }
  const [results, setResults] = useState(null) // null or { labelKey: true/false }
  const [showHints, setShowHints] = useState({})
  const [score, setScore] = useState(0)
  const [diagramResults, setDiagramResults] = useState([])
  const [completed, setCompleted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [gameStarted, setGameStarted] = useState(false)
  const [activeLabel, setActiveLabel] = useState(null) // which label is highlighted

  // Quiz monitoring state
  const [quizSessionId, setQuizSessionId] = useState(null)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const gameStartTimeRef = useRef(null)

  // Earnings tracking
  const [serverEarnings, setServerEarnings] = useState(0)
  const sessionCorrectRef = useRef(0)
  const flushedCorrectRef = useRef(0) // Track what's already been sent to server
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0)

  // Anti-slacking: only count active time
  const lastInteractionRef = useRef(Date.now())
  const activeSecondsRef = useRef(0)
  const IDLE_THRESHOLD = 30000 // 30 seconds of no interaction = idle

  const containerRef = useRef(null)
  const imageContainerRef = useRef(null)
  const imageRef = useRef(null)
  const inputRefs = useRef({})
  const [imageBounds, setImageBounds] = useState(null)

  // Fetch today's earnings on mount
  useEffect(() => {
    try {
      const account = JSON.parse(localStorage.getItem('learnerAccount'))
      if (account?.id) {
        learnerApi.getEarnings(account.id)
          .then(data => setServerEarnings(data.todayEarnings))
          .catch(console.error)
      }
    } catch { /* no account */ }
  }, [])

  // Track user interactions for anti-slacking
  useEffect(() => {
    if (!gameStarted || completed) return

    const markActive = () => { lastInteractionRef.current = Date.now() }

    window.addEventListener('pointerdown', markActive)
    window.addEventListener('keydown', markActive)
    window.addEventListener('touchstart', markActive)

    // Count active seconds every second
    const timer = setInterval(() => {
      if (Date.now() - lastInteractionRef.current < IDLE_THRESHOLD) {
        activeSecondsRef.current += 1
      }
    }, 1000)

    return () => {
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('keydown', markActive)
      window.removeEventListener('touchstart', markActive)
      clearInterval(timer)
    }
  }, [gameStarted, completed])

  // Cancel any voice-over speech when leaving the page
  useEffect(() => {
    return () => cancelSpeech()
  }, [])

  // Flush pending earnings to server
  const flushEarnings = useCallback((useSendBeacon = false) => {
    try {
      const account = JSON.parse(localStorage.getItem('learnerAccount'))
      const pending = sessionCorrectRef.current - flushedCorrectRef.current
      if (!account?.id || pending <= 0) return

      if (useSendBeacon) {
        const apiBase = import.meta.env.VITE_API_URL || '/api'
        const earningsData = JSON.stringify({ learnerId: account.id, correctAnswers: pending })
        navigator.sendBeacon(apiBase + '/learners/record-earning', new Blob([earningsData], { type: 'application/json' }))
      } else {
        learnerApi.recordEarning(account.id, pending).catch(console.error)
      }
      flushedCorrectRef.current = sessionCorrectRef.current
    } catch { /* no account */ }
  }, [])

  // Periodic earnings flush every 15 seconds + flush on unmount (React Router navigation)
  useEffect(() => {
    if (!gameStarted) return

    const interval = setInterval(() => {
      flushEarnings(false)
    }, 15000)

    return () => {
      clearInterval(interval)
      flushEarnings(false)
    }
  }, [gameStarted, flushEarnings])

  // Save progress on page unload (so reload doesn't lose time)
  useEffect(() => {
    if (!gameStarted) return

    const saveProgress = () => {
      try {
        const account = JSON.parse(localStorage.getItem('learnerAccount'))
        const apiBase = import.meta.env.VITE_API_URL || '/api'
        if (account?.id && activeSecondsRef.current > 0) {
          const activeMinutes = activeSecondsRef.current / 60
          const data = JSON.stringify({ learnerId: account.id, minutes: activeMinutes })
          navigator.sendBeacon(apiBase + '/learners/record-time', new Blob([data], { type: 'application/json' }))
          activeSecondsRef.current = 0
        }
        // Flush any remaining earnings via sendBeacon
        flushEarnings(true)
      } catch { /* no account */ }
    }

    window.addEventListener('beforeunload', saveProgress)
    return () => window.removeEventListener('beforeunload', saveProgress)
  }, [gameStarted, flushEarnings])

  // Load diagrams
  useEffect(() => {
    const diags = getFilteredDiagrams()
    if (diags.length === 0) {
      navigate('/topics')
      return
    }
    setAllDiagrams(diags)
  }, [getFilteredDiagrams, navigate])

  // Countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !gameStarted) {
      setGameStarted(true)
      playSound('gameStart')
    }
  }, [countdown, gameStarted, playSound])

  // Create quiz session when game starts
  useEffect(() => {
    if (!gameStarted || quizSessionId) return

    gameStartTimeRef.current = Date.now()

    quizSessionApi.start({
      subject: selectedSubject,
      topics: selectedTopics,
      gameMode: 'diagram',
      minTimeRequired: 0
    }).then(result => {
      setQuizSessionId(result.sessionId)
    }).catch(err => {
      console.error('Failed to create quiz session:', err)
    })
  }, [gameStarted, quizSessionId, selectedSubject, selectedTopics])

  // Elapsed time counter
  useEffect(() => {
    if (!gameStarted || completed) return

    const timer = setInterval(() => {
      if (gameStartTimeRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - gameStartTimeRef.current) / 1000))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, completed])

  // Tab visibility detection
  useEffect(() => {
    if (!gameStarted || !quizSessionId) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1)
        quizSessionApi.recordTabEvent(quizSessionId, 'left').catch(console.error)
      } else {
        setShowTabWarning(true)
        quizSessionApi.recordTabEvent(quizSessionId, 'returned').catch(console.error)
        setTimeout(() => setShowTabWarning(false), 4000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [gameStarted, quizSessionId])

  // Reset state when diagram changes
  useEffect(() => {
    if (allDiagrams.length === 0 || !gameStarted) return
    setAnswers({})
    setResults(null)
    setShowHints({})
    setActiveLabel(null)
    // Don't reset imageBounds here - let the image load handler update it
  }, [currentIndex, allDiagrams.length, gameStarted])

  // Calculate actual image bounds within container (accounting for object-fit: contain)
  const updateImageBounds = useCallback(() => {
    if (!imageRef.current || !imageContainerRef.current) return

    const container = imageContainerRef.current.getBoundingClientRect()
    const img = imageRef.current

    // Get natural dimensions
    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight
    if (!naturalWidth || !naturalHeight) return

    // Calculate the actual rendered size and position (object-fit: contain)
    const containerAspect = container.width / container.height
    const imageAspect = naturalWidth / naturalHeight

    let renderWidth, renderHeight, offsetX, offsetY

    if (imageAspect > containerAspect) {
      // Image is wider than container - letterbox top/bottom
      renderWidth = container.width
      renderHeight = container.width / imageAspect
      offsetX = 0
      offsetY = (container.height - renderHeight) / 2
    } else {
      // Image is taller than container - letterbox left/right
      renderHeight = container.height
      renderWidth = container.height * imageAspect
      offsetX = (container.width - renderWidth) / 2
      offsetY = 0
    }

    setImageBounds({
      left: offsetX,
      top: offsetY,
      width: renderWidth,
      height: renderHeight
    })
  }, [])

  // Set up ResizeObserver to update bounds when container resizes
  useEffect(() => {
    const observer = new ResizeObserver(updateImageBounds)
    if (imageContainerRef.current) {
      observer.observe(imageContainerRef.current)
    }
    return () => observer.disconnect()
  }, [updateImageBounds])

  const currentDiagram = allDiagrams[currentIndex]

  // Also update bounds when diagram changes (image might be cached)
  useEffect(() => {
    if (!currentDiagram || !imageRef.current) return

    // If image is already loaded (from cache), update bounds immediately
    if (imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      // Small delay to ensure container is sized
      requestAnimationFrame(updateImageBounds)
    }
  }, [currentIndex, currentDiagram, updateImageBounds])

  const handleAnswerChange = useCallback((labelKey, value) => {
    setAnswers(prev => ({ ...prev, [labelKey]: value }))
  }, [])

  const handleLabelClick = useCallback((labelKey) => {
    setActiveLabel(labelKey)
    // Focus the corresponding input
    if (inputRefs.current[labelKey]) {
      inputRefs.current[labelKey].focus()
    }
  }, [])

  const toggleHint = useCallback((labelKey) => {
    playSound('click')
    setShowHints(prev => ({ ...prev, [labelKey]: !prev[labelKey] }))
  }, [playSound])

  const handleCheckAnswers = useCallback(() => {
    if (!currentDiagram) return

    playSound('click')
    const checkResults = {}
    let correctCount = 0

    for (const label of currentDiagram.labels) {
      const userAnswer = (answers[label.label_key] || '').trim().toLowerCase()
      const correctAnswer = label.correct_answer.toLowerCase()

      // Allow partial matches (e.g., "left ventricle" matches "Left Ventricle")
      const isCorrect = userAnswer === correctAnswer ||
        userAnswer === correctAnswer.replace(/\s+/g, '') ||
        correctAnswer.includes(userAnswer) && userAnswer.length > 3

      checkResults[label.label_key] = isCorrect
      if (isCorrect) correctCount++

      // Record each label answer in quiz session
      if (quizSessionId) {
        quizSessionApi.recordAnswer(quizSessionId, {
          questionId: `${currentDiagram.id}_${label.label_key}`,
          questionText: `${currentDiagram.title} - Label ${label.label_key}`,
          correctAnswer: label.correct_answer,
          givenAnswer: answers[label.label_key] || '',
          isCorrect,
          timeTakenMs: 0
        }).catch(console.error)
      }
    }

    setResults(checkResults)

    const totalLabels = currentDiagram.labels.length
    const points = Math.round((correctCount / totalLabels) * 100)
    setScore(prev => prev + points)

    // Track earnings (each correct label = 1 correct answer = KSh 0.25)
    if (correctCount > 0) {
      sessionCorrectRef.current += correctCount
      setSessionCorrectCount(sessionCorrectRef.current)
    }

    setDiagramResults(prev => [...prev, {
      title: currentDiagram.title,
      correct: correctCount,
      total: totalLabels,
      points
    }])

    if (correctCount === totalLabels) {
      playSound('correct')
    } else if (correctCount > 0) {
      playSound('click')
    } else {
      playSound('wrong')
    }

    // Voice-over: read out the wrong labels with correct answers
    const wrongLabels = currentDiagram.labels.filter(l => !checkResults[l.label_key])
    if (wrongLabels.length > 0) {
      const corrections = wrongLabels.map(l =>
        `Label ${l.label_key} is ${l.correct_answer}`
      )
      speakCorrections(corrections)
    }
  }, [currentDiagram, answers, playSound, quizSessionId])

  const handleNextDiagram = useCallback(() => {
    playSound('click')
    if (currentIndex < allDiagrams.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setCompleted(true)
    }
  }, [playSound, currentIndex, allDiagrams.length])

  // Complete quiz session when done
  useEffect(() => {
    if (!completed) return

    const durationSeconds = gameStartTimeRef.current
      ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
      : 0

    if (quizSessionId) {
      quizSessionApi.complete(quizSessionId, {
        score,
        bestStreak: 0,
        durationSeconds
      }).catch(console.error)
    }

    // Record active time for daily tracking (YouTube blocker)
    try {
      const account = JSON.parse(localStorage.getItem('learnerAccount'))
      if (account?.id && activeSecondsRef.current > 0) {
        const activeMinutes = activeSecondsRef.current / 60
        learnerApi.recordTime(account.id, activeMinutes).catch(console.error)
      }
    } catch { /* no account */ }

    // Record any remaining unflushed earnings
    flushEarnings(false)
  }, [completed, quizSessionId, score, flushEarnings])

  // Countdown screen
  if (countdown > 0) {
    return (
      <div className="diagram-page">
        <div className="countdown-overlay">
          <motion.div
            className="countdown-number"
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {countdown}
          </motion.div>
          <p className="countdown-text">Get ready to label the diagram!</p>
        </div>
      </div>
    )
  }

  // Completed screen
  if (completed) {
    const totalPoints = diagramResults.reduce((sum, r) => sum + r.points, 0)
    const maxPoints = diagramResults.length * 100
    const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0

    return (
      <div className="diagram-page">
        <div className="diagram-results">
          <motion.div
            className="results-card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="results-title">
              {percentage >= 80 ? 'Excellent!' : percentage >= 50 ? 'Good Job!' : 'Keep Practicing!'}
            </h1>

            <div className="results-score">
              <div className="score-circle">
                <span className="score-number">{totalPoints}</span>
                <span className="score-label">points</span>
              </div>
            </div>

            <div className="results-breakdown">
              {diagramResults.map((r, i) => (
                <div key={i} className={`result-row ${r.correct === r.total ? 'success' : r.correct > 0 ? 'partial' : ''}`}>
                  <span className="result-title">{r.title}</span>
                  <span className="result-detail">
                    {r.correct}/{r.total} correct - {r.points} pts
                  </span>
                </div>
              ))}
            </div>

            <div className="results-actions">
              <motion.button
                className="action-button retry"
                onClick={() => {
                  setCurrentIndex(0)
                  setScore(0)
                  setDiagramResults([])
                  setCompleted(false)
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Again
              </motion.button>
              <motion.button
                className="action-button home"
                onClick={() => navigate('/topics')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Topics
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!currentDiagram) {
    return (
      <div className="diagram-page">
        <div className="loading-text">Loading diagram...</div>
      </div>
    )
  }

  return (
    <div className="diagram-page" ref={containerRef}>
      {/* Earnings Bar */}
      <EarningsBar sessionCorrect={sessionCorrectCount} serverEarnings={serverEarnings} />

      {/* Tab Switch Warning */}
      <AnimatePresence>
        {showTabWarning && (
          <motion.div
            className="tab-warning-banner"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
          >
            &#9888; Tab switch detected! This has been logged. (Total: {tabSwitchCount})
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="diagram-header">
        <button className="diag-back-button" onClick={() => navigate('/topics')}>
          Back
        </button>
        <div className="diag-progress">
          {currentIndex + 1} / {allDiagrams.length}
        </div>
        <div className="diag-timer">
          {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
        </div>
        <div className="diag-score">
          Score: {score}
        </div>
      </div>

      {/* Tab switch badge */}
      {tabSwitchCount > 0 && (
        <div className="diag-tab-badge">
          &#9888; {tabSwitchCount} tab switch{tabSwitchCount !== 1 ? 'es' : ''}
        </div>
      )}

      {/* Title */}
      <motion.div
        className="diagram-title-section"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        key={currentIndex}
      >
        <h2 className="diagram-title">{currentDiagram.title}</h2>
        {currentDiagram.description && (
          <p className="diagram-description">{currentDiagram.description}</p>
        )}
      </motion.div>

      {/* Main content: diagram + answer panel */}
      <div className="diagram-content">
        {/* Diagram with labels */}
        <div className="diagram-image-container" ref={imageContainerRef}>
          <img
            ref={imageRef}
            src={currentDiagram.image_url}
            alt={currentDiagram.title}
            className="diagram-image"
            onLoad={updateImageBounds}
          />

          {/* Overlay wrapper positioned exactly over the rendered image */}
          {imageBounds && (
            <div
              className="diagram-overlay-wrapper"
              style={{
                position: 'absolute',
                left: imageBounds.left,
                top: imageBounds.top,
                width: imageBounds.width,
                height: imageBounds.height,
                pointerEvents: 'none'
              }}
            >
              {/* SVG overlay for pointer lines */}
              <svg className="diagram-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                {currentDiagram.labels.map(label => (
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

              {/* Label circles positioned on the diagram */}
              {currentDiagram.labels.map(label => (
                <motion.div
                  key={`label-${label.label_key}`}
                  className={`diagram-label-marker ${
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

              {/* Pointer dots on the diagram */}
              {currentDiagram.labels.map(label => (
                <div
                  key={`dot-${label.label_key}`}
                  className={`diagram-pointer-dot ${
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
        <div className="diagram-answer-panel">
          <h3 className="panel-title">Label each part:</h3>

          <div className="answer-list">
            {currentDiagram.labels.map(label => (
              <div
                key={`answer-${label.label_key}`}
                className={`answer-row ${
                  activeLabel === label.label_key ? 'active' : ''
                } ${
                  results ? (results[label.label_key] ? 'correct' : 'wrong') : ''
                }`}
                onClick={() => setActiveLabel(label.label_key)}
              >
                <div className="answer-label-key">{label.label_key}</div>
                <div className="answer-input-wrapper">
                  <input
                    ref={el => { inputRefs.current[label.label_key] = el }}
                    type="text"
                    className="answer-input"
                    value={answers[label.label_key] || ''}
                    onChange={e => handleAnswerChange(label.label_key, e.target.value)}
                    onFocus={() => setActiveLabel(label.label_key)}
                    placeholder="Type the name..."
                    disabled={!!results}
                    autoComplete="off"
                  />
                  {results && !results[label.label_key] && (
                    <div className="correct-answer-show">
                      {label.correct_answer}
                    </div>
                  )}
                  {results && results[label.label_key] && (
                    <div className="correct-check">&#10003;</div>
                  )}
                </div>
                {!results && label.hint && (
                  <button
                    className="hint-toggle"
                    onClick={(e) => { e.stopPropagation(); toggleHint(label.label_key) }}
                    title="Show hint"
                  >
                    ?
                  </button>
                )}
                {showHints[label.label_key] && !results && (
                  <div className="label-hint">{label.hint}</div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="diagram-actions">
            {!results ? (
              <motion.button
                className="diag-button check"
                onClick={handleCheckAnswers}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={Object.keys(answers).length === 0}
              >
                Check Answers
              </motion.button>
            ) : (
              <motion.button
                className="diag-button next"
                onClick={handleNextDiagram}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {currentIndex < allDiagrams.length - 1 ? 'Next Diagram' : 'See Results'}
              </motion.button>
            )}
          </div>

          {/* Results summary for current diagram */}
          {results && (
            <motion.div
              className="diagram-result-summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {Object.values(results).filter(Boolean).length} / {currentDiagram.labels.length} correct
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DiagramGamePage
