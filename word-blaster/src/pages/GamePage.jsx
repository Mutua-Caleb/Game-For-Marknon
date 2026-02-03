import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import ScoreDisplay from '../components/ScoreDisplay'
import AnswerInput from '../components/AnswerInput'
import './GamePage.css'

const LETTER_BADGES = ['A', 'B', 'C', 'D', 'E', 'F']

function GamePage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const {
    getWeightedQuestions,
    gameSettings,
    recordAnswer,
    setCurrentSession
  } = useGame()

  const [questionPool, setQuestionPool] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    wrong: 0,
    streak: 0,
    score: 0
  })
  const [isPaused, setIsPaused] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef(null)

  // Feedback states
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false)
  const [showWrongFeedback, setShowWrongFeedback] = useState(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const inputRef = useRef(null)

  // Initialize question pool
  useEffect(() => {
    const questions = getWeightedQuestions()
    if (questions.length === 0) {
      navigate('/topics')
      return
    }
    setQuestionPool(questions)
  }, [getWeightedQuestions, navigate])

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

  // Load a single question
  const loadQuestion = useCallback(() => {
    if (questionPool.length === 0 || gameOver) return

    const questionData = questionPool[currentQuestionIndex % questionPool.length]
    const newQuestion = {
      ...questionData,
      instanceId: `${questionData.id}_${Date.now()}`,
      startTime: Date.now()
    }

    setCurrentQuestion(newQuestion)
    setTimeLeft(gameSettings.questionTime)
    setTransitioning(false)
    setCurrentQuestionIndex(prev => prev + 1)
  }, [questionPool, currentQuestionIndex, gameOver, gameSettings.questionTime])

  // Start the first question when game begins
  useEffect(() => {
    if (gameStarted && !gameOver && !currentQuestion && questionPool.length > 0) {
      loadQuestion()
    }
  }, [gameStarted, gameOver, currentQuestion, questionPool.length, loadQuestion])

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused || !currentQuestion || transitioning) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 0.1
        if (newTime <= 0) {
          clearInterval(timerRef.current)
          handleQuestionTimeout()
          return 0
        }
        return newTime
      })
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameStarted, gameOver, isPaused, currentQuestion, transitioning])

  // Handle question timeout
  const handleQuestionTimeout = useCallback(() => {
    if (!currentQuestion || transitioning) return
    setTransitioning(true)

    playSound('explosion')
    setShowExplosion(true)

    setShowWrongFeedback({
      answer: currentQuestion.answer,
      question: currentQuestion.question
    })

    recordAnswer(currentQuestion.id, false)
    setSessionStats(prev => ({
      ...prev,
      wrong: prev.wrong + 1,
      streak: 0
    }))

    setLives(prev => {
      const newLives = prev - 1
      if (newLives <= 0) {
        setTimeout(() => {
          setGameOver(true)
          playSound('gameOver')
        }, 1500)
      }
      return newLives
    })

    // Clear explosion and load next question after delay
    setTimeout(() => {
      setShowExplosion(false)
      setShowWrongFeedback(null)
      setCurrentQuestion(null)
      // loadQuestion will be triggered by the useEffect watching currentQuestion
    }, 2500)
  }, [currentQuestion, transitioning, playSound, recordAnswer])

  // Load next question when current is cleared (and game isn't over)
  useEffect(() => {
    if (gameStarted && !gameOver && !currentQuestion && !transitioning && questionPool.length > 0 && lives > 0) {
      const timer = setTimeout(() => loadQuestion(), 500)
      return () => clearTimeout(timer)
    }
  }, [gameStarted, gameOver, currentQuestion, transitioning, questionPool.length, lives, loadQuestion])

  // Handle answer submission
  const handleAnswer = useCallback((answer) => {
    if (!currentQuestion || transitioning) return

    const normalizedAnswer = answer.trim().toLowerCase()
    const correctAnswer = currentQuestion.answer.toLowerCase()

    const isCorrect = normalizedAnswer === correctAnswer ||
      (currentQuestion.options && currentQuestion.options.some(
        opt => opt.toLowerCase() === normalizedAnswer && opt.toLowerCase() === correctAnswer
      ))

    if (isCorrect) {
      playSound('correct')
      setTransitioning(true)

      const streakBonus = sessionStats.streak >= 3 ? (sessionStats.streak >= 5 ? 3 : 2) : 1
      const timeBonus = Math.max(1, Math.floor(timeLeft / 5))
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

      recordAnswer(currentQuestion.id, true)
      setShowCorrectFeedback(true)

      setTimeout(() => {
        setShowCorrectFeedback(false)
        setCurrentQuestion(null)
        setTransitioning(false)
      }, 1200)
    } else {
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
  }, [currentQuestion, transitioning, playSound, sessionStats.streak, recordAnswer, timeLeft])

  // Handle option click
  const handleOptionClick = useCallback((option) => {
    handleAnswer(option)
  }, [handleAnswer])

  // Pause/Resume
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
    playSound('click')
  }, [playSound])

  // End game
  const endGame = useCallback(() => {
    setCurrentSession({
      ...sessionStats,
      timestamp: Date.now()
    })
    navigate('/results', { state: sessionStats })
  }, [sessionStats, setCurrentSession, navigate])

  // Handle game over
  useEffect(() => {
    if (gameOver) {
      setTimeout(() => endGame(), 2000)
    }
  }, [gameOver, endGame])

  // Timer calculations
  const timePercent = currentQuestion ? (timeLeft / gameSettings.questionTime) * 100 : 100
  const getTimeColor = () => {
    if (timePercent > 50) return '#00b894'
    if (timePercent > 25) return '#fdcb6e'
    return '#e74c3c'
  }

  return (
    <div className="game-page">
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
        <div className="lives-display">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`life-heart ${i < lives ? 'active' : 'lost'}`}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Question Stage - Single question centered */}
      <div className="question-stage">
        <AnimatePresence mode="wait">
          {currentQuestion && !showExplosion && (
            <motion.div
              className="question-card-game"
              key={currentQuestion.instanceId}
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* Topic badge */}
              <div className="topic-badge-game">
                <span className="topic-badge-icon">
                  {currentQuestion.subject === 'Science' ? '🔬' : '📖'}
                </span>
                {currentQuestion.topic}
              </div>

              {/* Timer bar */}
              <div className="timer-bar-game">
                <motion.div
                  className="timer-fill-game"
                  style={{ backgroundColor: getTimeColor() }}
                  animate={{ width: `${timePercent}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="timer-text-game" style={{ color: getTimeColor() }}>
                {Math.ceil(timeLeft)}s
              </div>

              {/* Question image */}
              {currentQuestion.image && (
                <div className="question-image-container">
                  <img
                    src={currentQuestion.image}
                    alt="Question illustration"
                    className="question-image-display"
                  />
                </div>
              )}

              {/* Question text */}
              <div className="question-text-game">
                {currentQuestion.question}
              </div>

              {/* Hint */}
              {currentQuestion.hint && gameSettings.showHints && (
                <div className="question-hint-game">
                  <span className="hint-icon-game">💡</span>
                  {currentQuestion.hint}
                </div>
              )}

              {/* Multiple choice options */}
              {currentQuestion.type === 'multiple' && currentQuestion.options && (
                <div className="options-grid-game">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      className="game-option-btn"
                      onClick={() => handleOptionClick(option)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={transitioning}
                    >
                      <span className="option-letter">{LETTER_BADGES[index]}</span>
                      <span className="option-text">{option}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* MC hint */}
              {currentQuestion.type === 'multiple' && (
                <div className="mc-hint">Click the correct answer above</div>
              )}
            </motion.div>
          )}

          {/* Explosion display */}
          {showExplosion && (
            <motion.div
              className="explosion-stage"
              key="explosion"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <div className="explosion-content">
                <div className="explosion-icon-big">💥</div>
                <div className="explosion-label">Time's Up!</div>
                {showWrongFeedback && (
                  <div className="explosion-answer">
                    Answer: <strong>{showWrongFeedback.answer}</strong>
                  </div>
                )}
              </div>
              {/* Particles */}
              <div className="explosion-particles">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="explosion-particle-game"
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos((i * 45) * Math.PI / 180) * 100,
                      y: Math.sin((i * 45) * Math.PI / 180) * 100,
                      opacity: 0
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      backgroundColor: ['#e74c3c', '#f39c12', '#fdcb6e', '#ff6b6b'][i % 4]
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Correct feedback overlay */}
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
      </div>

      {/* Answer Input - only for text questions */}
      {gameStarted && !gameOver && currentQuestion && currentQuestion.type === 'text' && !transitioning && (
        <div className="input-section" ref={inputRef}>
          <AnswerInput
            onSubmit={handleAnswer}
            disabled={isPaused || !currentQuestion}
            currentQuestion={currentQuestion}
          />
        </div>
      )}

      {/* Waiting message when no question */}
      {gameStarted && !gameOver && !currentQuestion && !showExplosion && (
        <div className="waiting-message">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="waiting-text"
          >
            Next question coming...
          </motion.div>
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
                <button className="quit-btn" onClick={endGame}>
                  🚪 End Game
                </button>
              </div>
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
              <h2>Game Over!</h2>
              <div className="final-score">{sessionStats.score}</div>
              <div className="loading-text">Loading results...</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GamePage
