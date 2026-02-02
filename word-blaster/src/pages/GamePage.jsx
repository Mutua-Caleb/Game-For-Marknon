import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import FallingQuestion from '../components/FallingQuestion'
import AnswerInput from '../components/AnswerInput'
import ScoreDisplay from '../components/ScoreDisplay'
import ExplosionEffect from '../components/ExplosionEffect'
import './GamePage.css'

function GamePage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const {
    getWeightedQuestions,
    gameSettings,
    recordAnswer,
    playerStats,
    setCurrentSession
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

  // Spawn new question
  const spawnQuestion = useCallback(() => {
    if (questionPool.length === 0 || gameOver || isPaused) return

    const questionData = questionPool[currentQuestionIndex % questionPool.length]
    const newQuestion = {
      ...questionData,
      instanceId: `${questionData.id}_${Date.now()}`,
      x: Math.random() * 60 + 20, // 20-80% of screen width
      startTime: Date.now()
    }

    setActiveQuestions(prev => [...prev, newQuestion])
    setCurrentQuestionIndex(prev => prev + 1)
  }, [questionPool, currentQuestionIndex, gameOver, isPaused])

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

    // Record as wrong
    recordAnswer(question.id, false)
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

      recordAnswer(matchedQuestion.id, true)
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
    setCurrentSession({
      ...sessionStats,
      timestamp: Date.now()
    })
    navigate('/results', { state: sessionStats })
  }, [sessionStats, setCurrentSession, navigate])

  // Handle game over
  useEffect(() => {
    if (gameOver) {
      setTimeout(() => {
        endGame()
      }, 2000)
    }
  }, [gameOver, endGame])

  // Current question for input display
  const currentQuestion = activeQuestions[0]

  return (
    <div className="game-page" ref={gameAreaRef}>
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

      {/* Answer Input */}
      {gameStarted && !gameOver && (
        <div className="input-section" ref={inputRef}>
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
