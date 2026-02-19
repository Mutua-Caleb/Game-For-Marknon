import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { quizSessionApi, learningApi, learnerApi } from '../utils/api'
import { speakQuestionAnswer, cancelSpeech } from '../utils/voiceover'
import FallingQuestion from '../components/FallingQuestion'
import AnswerInput from '../components/AnswerInput'
import ScoreDisplay from '../components/ScoreDisplay'
import ExplosionEffect from '../components/ExplosionEffect'
import EarningsBar from '../components/EarningsBar'
import './GamePage.css'

// Get learner ID from account or fallback to random
function getLearnerId() {
  let learnerId = localStorage.getItem('learnerId')
  if (!learnerId) {
    learnerId = 'learner_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('learnerId', learnerId)
  }
  return learnerId
}

// Get learner account ID (numeric, for daily tracking)
function getLearnerAccountId() {
  try {
    const account = JSON.parse(localStorage.getItem('learnerAccount'))
    return account?.id || null
  } catch {
    return null
  }
}

function GamePage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const {
    getWeightedQuestions,
    gameSettings,
    recordAnswer,
    playerStats,
    setCurrentSession,
    selectedSubject,
    selectedTopics
  } = useGame()

  const [activeQuestions, setActiveQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionPool, setQuestionPool] = useState([])
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    wrong: 0,
    streak: 0,
    score: 0
  })
  const [isPaused, setIsPaused] = useState(false)
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false)
  const [showWrongFeedback, setShowWrongFeedback] = useState(null)
  const [explosions, setExplosions] = useState([])
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)

  // Quiz monitoring state
  const [quizSessionId, setQuizSessionId] = useState(null)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeSeconds, setActiveSeconds] = useState(0)
  const [minTimeReached, setMinTimeReached] = useState(false)
  const gameStartTimeRef = useRef(null)

  // Earnings tracking
  const [serverEarnings, setServerEarnings] = useState(0)
  const sessionCorrectRef = useRef(0)
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0)

  // Anti-slacking: only count active time
  const lastInteractionRef = useRef(Date.now())
  const activeSecondsRef = useRef(0)
  const IDLE_THRESHOLD = 30000 // 30 seconds of no interaction = idle

  const MIN_QUIZ_TIME = 900 // 15 minutes in seconds
  const learnerId = getLearnerId()

  const failedQuestionsRef = useRef(new Set())
  const originalPoolSizeRef = useRef(0)
  const lastRebuildCycleRef = useRef(0)

  const gameAreaRef = useRef(null)
  const inputRef = useRef(null)
  const questionTimerRef = useRef(null)

  // Initialize question pool
  useEffect(() => {
    const questions = getWeightedQuestions()
    if (questions.length === 0) {
      navigate('/topics')
      return
    }
    setQuestionPool(questions)
    originalPoolSizeRef.current = questions.length
  }, [getWeightedQuestions, navigate])

  // Rebuild question pool with spaced repetition after each full cycle
  useEffect(() => {
    if (originalPoolSizeRef.current === 0 || currentQuestionIndex === 0) return

    const cycle = Math.floor(currentQuestionIndex / originalPoolSizeRef.current)
    if (cycle > lastRebuildCycleRef.current) {
      lastRebuildCycleRef.current = cycle

      const base = getWeightedQuestions()
      if (base.length === 0) return

      const newPool = []
      for (const q of base) {
        newPool.push(q)
        // Failed questions appear 3x as often (spaced repetition)
        if (failedQuestionsRef.current.has(q.id)) {
          newPool.push({ ...q })
          newPool.push({ ...q })
        }
      }

      // Fisher-Yates shuffle
      for (let i = newPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPool[i], newPool[j]] = [newPool[j], newPool[i]]
      }

      setQuestionPool(newPool)
    }
  }, [currentQuestionIndex, getWeightedQuestions])

  // Countdown before game starts
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
      gameMode: 'quiz',
      minTimeRequired: MIN_QUIZ_TIME
    }).then(result => {
      setQuizSessionId(result.sessionId)
    }).catch(err => {
      console.error('Failed to create quiz session:', err)
    })
  }, [gameStarted, quizSessionId, selectedSubject, selectedTopics])

  // Fetch today's earnings on mount
  useEffect(() => {
    const accountId = getLearnerAccountId()
    if (accountId) {
      learnerApi.getEarnings(accountId)
        .then(data => setServerEarnings(data.todayEarnings))
        .catch(console.error)
    }
  }, [])

  // Track user interactions for anti-slacking
  useEffect(() => {
    if (!gameStarted) return

    const markActive = () => { lastInteractionRef.current = Date.now() }

    window.addEventListener('pointerdown', markActive)
    window.addEventListener('keydown', markActive)
    window.addEventListener('touchstart', markActive)

    return () => {
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('keydown', markActive)
      window.removeEventListener('touchstart', markActive)
    }
  }, [gameStarted])

  // Cancel any voice-over speech when leaving the page
  useEffect(() => {
    return () => cancelSpeech()
  }, [])

  // Elapsed time counter - counts only active time (anti-slacking)
  useEffect(() => {
    if (!gameStarted) return

    const timer = setInterval(() => {
      if (gameStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        setElapsedSeconds(elapsed)

        // Only count active seconds toward quota (anti-slacking)
        if (Date.now() - lastInteractionRef.current < IDLE_THRESHOLD) {
          activeSecondsRef.current += 1
          setActiveSeconds(activeSecondsRef.current)
        }

        if (activeSecondsRef.current >= MIN_QUIZ_TIME) {
          setMinTimeReached(true)
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted])

  // Save progress on page unload (so reload doesn't lose time)
  useEffect(() => {
    if (!gameStarted) return

    const saveProgress = () => {
      const accountId = getLearnerAccountId()
      const apiBase = import.meta.env.VITE_API_URL || '/api'
      if (accountId && activeSecondsRef.current > 0) {
        const activeMinutes = activeSecondsRef.current / 60
        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({ learnerId: accountId, minutes: activeMinutes })
        navigator.sendBeacon(apiBase + '/learners/record-time', new Blob([data], { type: 'application/json' }))
        activeSecondsRef.current = 0 // Reset so endGame doesn't double-count
      }
      // Also save earnings on page unload
      if (accountId && sessionCorrectRef.current > 0) {
        const earningsData = JSON.stringify({ learnerId: accountId, correctAnswers: sessionCorrectRef.current })
        navigator.sendBeacon(apiBase + '/learners/record-earning', new Blob([earningsData], { type: 'application/json' }))
        sessionCorrectRef.current = 0
      }
    }

    window.addEventListener('beforeunload', saveProgress)
    return () => window.removeEventListener('beforeunload', saveProgress)
  }, [gameStarted])

  // Tab visibility detection
  useEffect(() => {
    if (!gameStarted || !quizSessionId) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the tab
        setTabSwitchCount(prev => prev + 1)
        quizSessionApi.recordTabEvent(quizSessionId, 'left').catch(console.error)
      } else {
        // User returned to the tab
        setShowTabWarning(true)
        quizSessionApi.recordTabEvent(quizSessionId, 'returned').catch(console.error)
        setTimeout(() => setShowTabWarning(false), 4000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [gameStarted, quizSessionId])

  // Determine question size class based on content
  const getQuestionSize = useCallback((q) => {
    const textLen = q.question.length
    const hasImage = !!q.image
    const hasOptions = q.type === 'multiple' && q.options
    const longestOption = hasOptions ? Math.max(...q.options.map(o => o.length)) : 0

    if (hasImage) return 'large'
    if (hasOptions && (textLen > 60 || longestOption > 20)) return 'large'
    if (hasOptions || textLen > 50) return 'medium'
    return 'compact'
  }, [])

  // Spawn new question
  const spawnQuestion = useCallback(() => {
    if (questionPool.length === 0 || gameOver || isPaused) return

    const questionData = questionPool[currentQuestionIndex % questionPool.length]
    const size = getQuestionSize(questionData)

    // Assign lanes: check which lanes are occupied
    const occupiedLanes = activeQuestions.map(q => q.lane)
    let lane
    if (!occupiedLanes.includes('left')) {
      lane = 'left'
    } else if (!occupiedLanes.includes('right')) {
      lane = 'right'
    } else {
      lane = 'left' // fallback
    }

    // X positions based on lane and size
    let x
    if (size === 'large') {
      // Large questions center more
      x = lane === 'left' ? 30 : 70
    } else if (size === 'medium') {
      x = lane === 'left' ? 25 : 75
    } else {
      x = lane === 'left' ? 20 : 80
    }

    const newQuestion = {
      ...questionData,
      instanceId: `${questionData.id}_${Date.now()}`,
      x,
      lane,
      size,
      startTime: Date.now()
    }

    setActiveQuestions(prev => [...prev, newQuestion])
    setCurrentQuestionIndex(prev => prev + 1)
  }, [questionPool, currentQuestionIndex, gameOver, isPaused, activeQuestions, getQuestionSize])

  // Game loop - spawn questions
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return

    // Spawn first question immediately
    if (activeQuestions.length === 0) {
      spawnQuestion()
    }

    // Spawn new question every few seconds based on difficulty
    const spawnInterval = setInterval(() => {
      if (activeQuestions.length < 2) { // Max 2 questions at once
        spawnQuestion()
      }
    }, 8000)

    return () => clearInterval(spawnInterval)
  }, [gameStarted, gameOver, isPaused, activeQuestions.length, spawnQuestion])

  // Handle question timeout (falls to bottom)
  const handleQuestionTimeout = useCallback((question) => {
    playSound('explosion')

    // Create explosion at the bottom
    const explosion = {
      id: Date.now(),
      x: question.x,
      y: 85,
      answer: question.answer
    }
    setExplosions(prev => [...prev, explosion])

    // Show wrong feedback with correct answer
    setShowWrongFeedback({
      answer: question.answer,
      question: question.question
    })
    setTimeout(() => setShowWrongFeedback(null), 2500)

    // Voice-over: read the question and correct answer aloud
    speakQuestionAnswer(question.question, question.answer)

    // Record as wrong and track for spaced repetition
    recordAnswer(question.id, false)
    failedQuestionsRef.current.add(question.id)

    // Record detailed answer for quiz session
    if (quizSessionId) {
      quizSessionApi.recordAnswer(quizSessionId, {
        questionId: question.id,
        questionText: question.question,
        correctAnswer: question.answer,
        givenAnswer: null,
        isCorrect: false,
        timeTakenMs: Date.now() - question.startTime
      }).catch(console.error)
    }

    // Record for spaced repetition (wrong/timeout)
    learningApi.recordAnswer(
      learnerId,
      question.id,
      false,
      Date.now() - question.startTime
    ).catch(console.error)

    setSessionStats(prev => ({
      ...prev,
      wrong: prev.wrong + 1,
      streak: 0
    }))

    // Remove question
    setActiveQuestions(prev => prev.filter(q => q.instanceId !== question.instanceId))

    // Remove explosion after animation
    setTimeout(() => {
      setExplosions(prev => prev.filter(e => e.id !== explosion.id))
    }, 1000)

    // Lose a life
    setLives(prev => {
      const newLives = prev - 1
      if (newLives <= 0) {
        setGameOver(true)
        playSound('gameOver')
      }
      return newLives
    })
  }, [playSound, recordAnswer])

  // Handle answer submission
  const handleAnswer = useCallback((answer) => {
    if (activeQuestions.length === 0) return

    const normalizedAnswer = answer.trim().toLowerCase()

    // Check against all active questions
    const matchedQuestion = activeQuestions.find(q => {
      const correctAnswer = q.answer.toLowerCase()
      return normalizedAnswer === correctAnswer ||
             (q.options && q.options.some(opt => opt.toLowerCase() === normalizedAnswer && opt.toLowerCase() === correctAnswer))
    })

    if (matchedQuestion) {
      // Correct answer!
      playSound('correct')

      const streakBonus = sessionStats.streak >= 3 ? (sessionStats.streak >= 5 ? 3 : 2) : 1
      const timeBonus = Math.max(1, Math.floor((gameSettings.questionTime * 1000 - (Date.now() - matchedQuestion.startTime)) / 1000 / 5))
      const points = 10 * streakBonus + timeBonus

      setSessionStats(prev => {
        const newStreak = prev.streak + 1
        if (newStreak === 5 || newStreak === 10) {
          playSound('streak')
        }
        return {
          ...prev,
          correct: prev.correct + 1,
          streak: newStreak,
          score: prev.score + points
        }
      })

      // Track earnings (KSh 0.25 per correct answer)
      sessionCorrectRef.current += 1
      setSessionCorrectCount(sessionCorrectRef.current)

      recordAnswer(matchedQuestion.id, true)

      // Record detailed answer for quiz session
      if (quizSessionId) {
        quizSessionApi.recordAnswer(quizSessionId, {
          questionId: matchedQuestion.id,
          questionText: matchedQuestion.question,
          correctAnswer: matchedQuestion.answer,
          givenAnswer: answer.trim(),
          isCorrect: true,
          timeTakenMs: Date.now() - matchedQuestion.startTime
        }).catch(console.error)
      }

      // Record for spaced repetition
      learningApi.recordAnswer(
        learnerId,
        matchedQuestion.id,
        true,
        Date.now() - matchedQuestion.startTime
      ).catch(console.error)

      setShowCorrectFeedback(true)
      setTimeout(() => setShowCorrectFeedback(false), 500)

      // Remove the answered question
      setActiveQuestions(prev => prev.filter(q => q.instanceId !== matchedQuestion.instanceId))

      // Spawn next question after a short delay
      setTimeout(() => {
        if (!gameOver && !isPaused) {
          spawnQuestion()
        }
      }, 1000)
    } else {
      // Wrong answer - shake effect
      playSound('wrong')
      if (inputRef.current) {
        inputRef.current.classList.add('shake-animation')
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.classList.remove('shake-animation')
          }
        }, 500)
      }
    }
  }, [activeQuestions, playSound, gameSettings.questionTime, recordAnswer, sessionStats.streak, spawnQuestion, gameOver, isPaused])

  // Handle option click for multiple choice
  const handleOptionClick = useCallback((option) => {
    handleAnswer(option)
  }, [handleAnswer])

  // Pause/Resume game
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
    playSound('click')
  }, [playSound])

  // End game
  const endGame = useCallback(() => {
    const durationSeconds = gameStartTimeRef.current
      ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
      : 0

    // Complete quiz session on server
    if (quizSessionId) {
      quizSessionApi.complete(quizSessionId, {
        score: sessionStats.score,
        bestStreak: sessionStats.streak,
        durationSeconds
      }).catch(console.error)
    }

    // Record ACTIVE time only for daily tracking (anti-slacking)
    const accountId = getLearnerAccountId()
    if (accountId && activeSecondsRef.current > 0) {
      const activeMinutes = activeSecondsRef.current / 60
      learnerApi.recordTime(accountId, activeMinutes).catch(console.error)
    }

    // Record earnings for this session
    if (accountId && sessionCorrectRef.current > 0) {
      learnerApi.recordEarning(accountId, sessionCorrectRef.current).catch(console.error)
      sessionCorrectRef.current = 0
    }

    setCurrentSession({
      ...sessionStats,
      tabSwitches: tabSwitchCount,
      durationSeconds,
      timestamp: Date.now()
    })
    navigate('/results', { state: { ...sessionStats, tabSwitches: tabSwitchCount, durationSeconds } })
  }, [sessionStats, setCurrentSession, navigate, quizSessionId, tabSwitchCount])

  // Handle game over - enforce minimum time
  useEffect(() => {
    if (gameOver) {
      if (minTimeReached) {
        setTimeout(() => {
          endGame()
        }, 2000)
      } else {
        // Reset lives and keep going - minimum time not met
        setTimeout(() => {
          setGameOver(false)
          setLives(3)
        }, 1500)
      }
    }
  }, [gameOver, endGame, minTimeReached])

  // Current question for input display
  const currentQuestion = activeQuestions[0]

  return (
    <div className="game-page" ref={gameAreaRef}>
      {/* Earnings Bar */}
      {gameStarted && (
        <EarningsBar sessionCorrect={sessionCorrectCount} serverEarnings={serverEarnings} />
      )}

      {/* Background particles */}
      <div className="game-particles"></div>

      {/* Countdown */}
      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            className="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
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
            <div className="countdown-text">Get Ready!</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Switch Warning */}
      <AnimatePresence>
        {showTabWarning && (
          <motion.div
            className="tab-warning-banner"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
          >
            <span className="warning-icon">&#9888;</span>
            Tab switch detected! This has been logged. (Total: {tabSwitchCount})
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Header */}
      <div className="game-header">
        <button className="pause-button" onClick={togglePause}>
          {isPaused ? '▶️' : '⏸️'}
        </button>
        <ScoreDisplay
          score={sessionStats.score}
          streak={sessionStats.streak}
          correct={sessionStats.correct}
          wrong={sessionStats.wrong}
        />
        <div className="header-right-info">
          <div className="quiz-timer">
            {Math.floor(activeSeconds / 60)}:{String(activeSeconds % 60).padStart(2, '0')}
            {!minTimeReached && (
              <span className="min-time-note"> / 15:00</span>
            )}
          </div>
          <div className="lives-display">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`life-heart ${i < lives ? 'active' : 'lost'}`}>
                &#10084;&#65039;
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tab switch counter (persistent small badge) */}
      {tabSwitchCount > 0 && gameStarted && (
        <div className="tab-switch-badge">
          <span className="warning-icon">&#9888;</span> {tabSwitchCount} tab switch{tabSwitchCount !== 1 ? 'es' : ''}
        </div>
      )}

      {/* Game Area */}
      <div className="game-area">
        {/* Falling Questions */}
        <AnimatePresence>
          {activeQuestions.map(question => (
            <FallingQuestion
              key={question.instanceId}
              question={question}
              duration={gameSettings.questionTime}
              isPaused={isPaused}
              onTimeout={() => handleQuestionTimeout(question)}
              onOptionClick={handleOptionClick}
            />
          ))}
        </AnimatePresence>

        {/* Explosions */}
        <AnimatePresence>
          {explosions.map(explosion => (
            <ExplosionEffect
              key={explosion.id}
              x={explosion.x}
              y={explosion.y}
              answer={explosion.answer}
            />
          ))}
        </AnimatePresence>

        {/* Feedback Overlays */}
        <AnimatePresence>
          {showCorrectFeedback && (
            <motion.div
              className="feedback-overlay correct"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <span className="feedback-icon">✨</span>
              <span className="feedback-text">Correct!</span>
              {sessionStats.streak >= 3 && (
                <span className="streak-bonus">🔥 {sessionStats.streak}x Streak!</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showWrongFeedback && (
            <motion.div
              className="feedback-overlay wrong"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
            >
              <span className="feedback-icon">💥</span>
              <span className="feedback-text">Oops!</span>
              <span className="correct-answer">
                Answer: <strong>{showWrongFeedback.answer}</strong>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ground/Target Zone */}
        <div className="ground-zone">
          <div className="danger-line"></div>
        </div>
      </div>

      {/* Answer Input - floating compact at bottom-right */}
      {gameStarted && !gameOver && (
        <div className="input-floating" ref={inputRef}>
          <AnswerInput
            onSubmit={handleAnswer}
            disabled={isPaused || activeQuestions.length === 0}
            currentQuestion={currentQuestion}
          />
        </div>
      )}

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="pause-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pause-content">
              <h2>Game Paused</h2>
              <div className="pause-stats">
                <div>Score: {sessionStats.score}</div>
                <div>Correct: {sessionStats.correct}</div>
                <div>Wrong: {sessionStats.wrong}</div>
              </div>
              <div className="pause-buttons">
                <button className="resume-btn" onClick={togglePause}>
                  ▶️ Resume
                </button>
                <button className="quit-btn" onClick={endGame} disabled={!minTimeReached}>
                  🚪 End Game
                </button>
              </div>
              {!minTimeReached && (
                <div className="min-time-note" style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
                  Active time remaining: {Math.floor(Math.max(0, MIN_QUIZ_TIME - activeSeconds) / 60)}:{String(Math.max(0, MIN_QUIZ_TIME - activeSeconds) % 60).padStart(2, '0')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            className="game-over-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="game-over-content"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {minTimeReached ? (
                <>
                  <h2>Game Over!</h2>
                  <div className="final-score">{sessionStats.score}</div>
                  <div className="loading-text">Loading results...</div>
                </>
              ) : (
                <>
                  <h2>Keep Going!</h2>
                  <div className="min-time-message">
                    Minimum quiz time: 15 minutes
                  </div>
                  <div className="time-remaining">
                    {Math.floor((MIN_QUIZ_TIME - elapsedSeconds) / 60)}:{String((MIN_QUIZ_TIME - elapsedSeconds) % 60).padStart(2, '0')} remaining
                  </div>
                  <div className="loading-text">Lives restored. Continuing...</div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GamePage
