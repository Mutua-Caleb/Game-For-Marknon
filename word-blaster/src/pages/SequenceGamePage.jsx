import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { quizSessionApi, learnerApi } from '../utils/api'
import { speakSequenceOrder, cancelSpeech } from '../utils/voiceover'
import EarningsBar from '../components/EarningsBar'
import './SequenceGamePage.css'

function SequenceGamePage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const { getFilteredSequences, selectedSubject, selectedTopics } = useGame()

  const [allSequences, setAllSequences] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [shuffledSteps, setShuffledSteps] = useState([])
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState(null) // 'correct' | 'wrong' | null
  const [wrongPositions, setWrongPositions] = useState([])
  const [attempts, setAttempts] = useState(0)
  const [score, setScore] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [gameStarted, setGameStarted] = useState(false)
  const [sequenceResults, setSequenceResults] = useState([])

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

  // Load sequences
  useEffect(() => {
    const seqs = getFilteredSequences()
    if (seqs.length === 0) {
      navigate('/topics')
      return
    }
    setAllSequences(seqs)
  }, [getFilteredSequences, navigate])

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
      gameMode: 'sequence',
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

  // Shuffle steps for current sequence
  useEffect(() => {
    if (allSequences.length === 0 || !gameStarted) return

    const currentSeq = allSequences[currentIndex]
    if (!currentSeq) return

    // Shuffle the steps
    const steps = currentSeq.steps.map((s, i) => ({
      ...s,
      id: `step-${i}`,
      originalIndex: i
    }))

    // Fisher-Yates shuffle - ensure it's actually shuffled
    const shuffled = [...steps]
    let shuffleAttempts = 0
    do {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      shuffleAttempts++
    } while (
      shuffleAttempts < 5 &&
      shuffled.every((s, i) => s.step_number === i + 1)
    )

    setShuffledSteps(shuffled)
    setResult(null)
    setWrongPositions([])
    setAttempts(0)
    setShowHint(false)
    setIsChecking(false)
  }, [allSequences, currentIndex, gameStarted])

  const currentSequence = allSequences[currentIndex]

  const handleCheck = useCallback(() => {
    if (isChecking || !currentSequence) return

    setIsChecking(true)
    setAttempts(prev => prev + 1)

    // Check if order is correct
    const isCorrect = shuffledSteps.every((step, i) => step.step_number === i + 1)

    if (isCorrect) {
      setResult('correct')
      playSound('correct')

      // Score: more points for fewer attempts
      const attemptScore = Math.max(10, 50 - (attempts * 10))
      setScore(prev => prev + attemptScore)

      // Track earnings (each correct sequence = 1 correct answer)
      sessionCorrectRef.current += 1
      setSessionCorrectCount(sessionCorrectRef.current)

      setSequenceResults(prev => [...prev, {
        title: currentSequence.title,
        attempts: attempts + 1,
        score: attemptScore
      }])

      // Record in quiz session
      if (quizSessionId) {
        quizSessionApi.recordAnswer(quizSessionId, {
          questionId: currentSequence.id,
          questionText: currentSequence.title,
          correctAnswer: 'Correct order',
          givenAnswer: `Solved in ${attempts + 1} attempt(s)`,
          isCorrect: true,
          timeTakenMs: 0
        }).catch(console.error)
      }

      // Auto-advance after showing success
      setTimeout(() => {
        if (currentIndex < allSequences.length - 1) {
          setCurrentIndex(prev => prev + 1)
        } else {
          setCompleted(true)
        }
      }, 2500)
    } else {
      setResult('wrong')
      playSound('wrong')

      // Mark which positions are wrong
      const wrong = shuffledSteps
        .map((step, i) => step.step_number !== i + 1 ? i : -1)
        .filter(i => i !== -1)
      setWrongPositions(wrong)

      // Show hint after 2 failed attempts
      if (attempts >= 1) {
        setShowHint(true)
      }

      // Clear result after a moment so they can try again
      setTimeout(() => {
        setResult(null)
        setIsChecking(false)
      }, 1500)
    }
  }, [isChecking, shuffledSteps, currentSequence, attempts, playSound, currentIndex, allSequences.length])

  const handleSkip = useCallback(() => {
    playSound('click')
    setSequenceResults(prev => [...prev, {
      title: currentSequence?.title || 'Unknown',
      attempts: attempts,
      score: 0,
      skipped: true
    }])

    if (quizSessionId) {
      quizSessionApi.recordAnswer(quizSessionId, {
        questionId: currentSequence?.id,
        questionText: currentSequence?.title || 'Unknown',
        correctAnswer: 'Correct order',
        givenAnswer: 'Skipped',
        isCorrect: false,
        timeTakenMs: 0
      }).catch(console.error)
    }

    // Voice-over: read the correct order aloud
    if (currentSequence?.steps) {
      speakSequenceOrder(currentSequence.title, currentSequence.steps)
    }

    if (currentIndex < allSequences.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setCompleted(true)
    }
  }, [playSound, currentSequence, attempts, currentIndex, allSequences.length, quizSessionId])

  const handleRevealAnswer = useCallback(() => {
    playSound('click')
    // Sort steps into correct order
    const sorted = [...shuffledSteps].sort((a, b) => a.step_number - b.step_number)
    setShuffledSteps(sorted)
    setResult('revealed')
    setWrongPositions([])

    // Voice-over: read the correct order aloud
    if (currentSequence?.steps) {
      speakSequenceOrder(currentSequence.title, currentSequence.steps)
    }

    setSequenceResults(prev => [...prev, {
      title: currentSequence?.title || 'Unknown',
      attempts: attempts,
      score: 0,
      revealed: true
    }])

    setTimeout(() => {
      if (currentIndex < allSequences.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setCompleted(true)
      }
    }, 3000)
  }, [playSound, shuffledSteps, currentSequence, attempts, currentIndex, allSequences.length])

  // Complete quiz session when all sequences done
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
      <div className="sequence-page">
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
          <p className="countdown-text">Get ready to order the steps!</p>
        </div>
      </div>
    )
  }

  // Completed screen
  if (completed) {
    const totalPossible = allSequences.length * 50
    const percentage = Math.round((score / totalPossible) * 100)

    return (
      <div className="sequence-page">
        <div className="sequence-results">
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
                <span className="score-number">{score}</span>
                <span className="score-label">points</span>
              </div>
            </div>

            <div className="results-breakdown">
              {sequenceResults.map((r, i) => (
                <div key={i} className={`result-row ${r.skipped ? 'skipped' : r.revealed ? 'revealed' : r.score > 0 ? 'success' : ''}`}>
                  <span className="result-title">{r.title}</span>
                  <span className="result-detail">
                    {r.skipped ? 'Skipped' : r.revealed ? 'Revealed' : `${r.attempts} attempt${r.attempts !== 1 ? 's' : ''} - ${r.score} pts`}
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
                  setSequenceResults([])
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

  if (!currentSequence || shuffledSteps.length === 0) {
    return (
      <div className="sequence-page">
        <div className="loading-text">Loading sequence...</div>
      </div>
    )
  }

  return (
    <div className="sequence-page" ref={containerRef}>
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
      <div className="sequence-header">
        <button className="seq-back-button" onClick={() => navigate('/topics')}>
          Back
        </button>
        <div className="seq-progress">
          {currentIndex + 1} / {allSequences.length}
        </div>
        <div className="seq-timer">
          {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
        </div>
        <div className="seq-score">
          Score: {score}
        </div>
      </div>

      {/* Tab switch badge */}
      {tabSwitchCount > 0 && (
        <div className="seq-tab-badge">
          &#9888; {tabSwitchCount} tab switch{tabSwitchCount !== 1 ? 'es' : ''}
        </div>
      )}

      {/* Sequence Title & Description */}
      <motion.div
        className="sequence-info"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        key={currentIndex}
      >
        <h2 className="sequence-title">{currentSequence.title}</h2>
        {currentSequence.description && (
          <p className="sequence-description">{currentSequence.description}</p>
        )}
        <p className="sequence-instruction">
          Drag and drop the steps into the correct order, then click "Check Order"
        </p>
      </motion.div>

      {/* Steps to reorder */}
      <div className="steps-container">
        <Reorder.Group
          axis="y"
          values={shuffledSteps}
          onReorder={setShuffledSteps}
          className="steps-list"
        >
          <AnimatePresence>
            {shuffledSteps.map((step, index) => (
              <Reorder.Item
                key={step.id}
                value={step}
                className={`step-card ${
                  result === 'correct' || result === 'revealed' ? 'correct' : ''
                } ${
                  result === 'wrong' && wrongPositions.includes(index) ? 'wrong' : ''
                } ${
                  result === 'wrong' && !wrongPositions.includes(index) ? 'right-position' : ''
                }`}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileDrag={{ scale: 1.03, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', zIndex: 50 }}
                dragListener={!result}
              >
                <div className="step-number-badge">{index + 1}</div>
                <div className="step-text">{step.step_text}</div>
                <div className="step-drag-handle">
                  <span className="drag-dots">&#8942;&#8942;</span>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* Hint */}
      {showHint && (
        <motion.div
          className="sequence-hint"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="hint-icon">&#128161;</span>
          <span>Hint: The first step is "{currentSequence.steps[0].step_text.substring(0, 60)}..."</span>
        </motion.div>
      )}

      {/* Actions */}
      <div className="sequence-actions">
        {!result && (
          <>
            <motion.button
              className="seq-button check"
              onClick={handleCheck}
              disabled={isChecking}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Check Order
            </motion.button>
            {attempts >= 3 && (
              <motion.button
                className="seq-button reveal"
                onClick={handleRevealAnswer}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Show Answer
              </motion.button>
            )}
            <motion.button
              className="seq-button skip"
              onClick={handleSkip}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Skip
            </motion.button>
          </>
        )}

        {result === 'correct' && (
          <motion.div
            className="result-banner correct-banner"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            Correct! Well done!
          </motion.div>
        )}

        {result === 'wrong' && (
          <motion.div
            className="result-banner wrong-banner"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            Not quite right. The red steps are in the wrong position. Try again!
          </motion.div>
        )}

        {result === 'revealed' && (
          <motion.div
            className="result-banner revealed-banner"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            Here's the correct order. Study it carefully!
          </motion.div>
        )}
      </div>

      {/* Attempt counter */}
      <div className="attempt-counter">
        Attempts: {attempts}
      </div>
    </div>
  )
}

export default SequenceGamePage
