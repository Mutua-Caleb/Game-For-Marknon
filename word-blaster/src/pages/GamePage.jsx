import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { quizSessionApi, learningApi, learnerApi } from '../utils/api'
import { speakQuestionAnswer, cancelSpeech } from '../utils/voiceover'
import { FEATURE_FLAGS, getRealmBySubject, recordDailyQuestAnswer } from '../data/curriculum'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon } from '../components/RealmIcons'
import ScoreDisplay from '../components/ScoreDisplay'
import DiagramChallenge from '../components/DiagramChallenge'
import PassageChallenge from '../components/PassageChallenge'
import './GamePage.css'

const MIN_QUIZ_TIME = 20 * 60
const DISPLAY_DIVISOR = 2
const DEFAULT_QUESTION_SECONDS = 60

function normalizeAnswerText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/−/g, '-')
    .replace(/[.,!?]+$/g, '')
    .replace(/\s+/g, ' ')
}

function formatClock(sec) {
  const safe = Math.max(0, Math.ceil(sec))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function getLearnerId() {
  let learnerId = localStorage.getItem('learnerId')
  if (!learnerId) {
    learnerId = 'learner_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
    localStorage.setItem('learnerId', learnerId)
  }
  return learnerId
}

function getLearnerAccount() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function getLearnerAccountId() {
  return getLearnerAccount()?.id || null
}

/**
 * Full-Screen Timed Focus Arena (replaces distracting falling bubbles).
 * One question occupies the full screen cleanly for 1 minute (60s).
 * If unanswered when the timer hits 0:00, it disappears and loads the next question automatically.
 */
function GamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMistakeMode = searchParams.get('mode') === 'mistakes'
  const { playSound } = useSound()
  const {
    getWeightedQuestions,
    getActiveFailedQuestions,
    getFilteredDiagrams,
    getFilteredPassages,
    gameSettings,
    recordAnswer,
    setCurrentSession,
    selectedSubject,
    selectedTopics
  } = useGame()

  const questionDuration = Number(gameSettings?.questionTime) || DEFAULT_QUESTION_SECONDS

  const activeRealm = isMistakeMode
    ? { id: 'mistakes', shortTitle: 'Mistake Forge' }
    : (getRealmBySubject(selectedSubject) || { id: 'cat4', shortTitle: selectedSubject || 'Observatory' })

  const [questionPool, setQuestionPool] = useState(() => (
    isMistakeMode ? getActiveFailedQuestions(20) : getWeightedQuestions()
  ))
  const [poolIndex, setPoolIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(questionDuration)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [questionPhase, setQuestionPhase] = useState('active') // 'active' | 'correct' | 'wrong' | 'timeout'
  const [feedbackPayload, setFeedbackPayload] = useState(null)

  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    score: 0
  })
  const [isPaused, setIsPaused] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)

  // Quiz monitoring & active time tracking
  const [quizSessionId, setQuizSessionId] = useState(null)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeSeconds, setActiveSeconds] = useState(0)
  const [minTimeReached, setMinTimeReached] = useState(false)

  const gameStartTimeRef = useRef(null)
  const questionStartTimeRef = useRef(0)
  const lastInteractionRef = useRef(0)
  const activeSecondsRef = useRef(0)
  const IDLE_THRESHOLD = 30000

  const learnerId = getLearnerId()
  const failedQuestionsRef = useRef(new Set())
  const originalPoolSizeRef = useRef(questionPool.length)
  const lastRebuildCycleRef = useRef(0)
  const advanceTimerRef = useRef(null)
  const inputRef = useRef(null)

  // Diagram + Passage challenge pools
  const [diagramPool] = useState(() => (
    FEATURE_FLAGS.showSequenceAndDiagramModes && !isMistakeMode
      ? [...getFilteredDiagrams()].sort(() => Math.random() - 0.5)
      : []
  ))
  const [passagePool] = useState(() => (
    !isMistakeMode
      ? [...getFilteredPassages()].sort(() => Math.random() - 0.5)
      : []
  ))
  const [activeDiagram, setActiveDiagram] = useState(null)
  const [activePassage, setActivePassage] = useState(null)
  const diagramIndexRef = useRef(0)
  const passageIndexRef = useRef(0)
  const questionsUntilChallengeRef = useRef(8)
  const nextChallengeTypeRef = useRef('passage')

  const currentQuestion = questionPool.length > 0
    ? questionPool[poolIndex % questionPool.length]
    : null

  const clearPendingAdvance = useCallback(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  useEffect(() => clearPendingAdvance, [clearPendingAdvance])

  // Redirect back to topic select if no questions exist
  useEffect(() => {
    if (questionPool.length === 0) {
      navigate('/topics')
    }
  }, [questionPool.length, navigate])

  // Countdown before starting
  useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = window.setTimeout(() => {
      const nextCount = countdown - 1
      setCountdown(nextCount)
      if (nextCount === 0) {
        setGameStarted(true)
        questionStartTimeRef.current = Date.now()
        playSound('gameStart')
      }
    }, 850)
    return () => window.clearTimeout(timer)
  }, [countdown, playSound])

  // Start quiz session on server
  useEffect(() => {
    if (!gameStarted || quizSessionId) return
    gameStartTimeRef.current = Date.now()
    lastInteractionRef.current = Date.now()

    const learner = getLearnerAccount()
    quizSessionApi.start({
      learnerId: learner?.id || null,
      playerName: learner?.name || 'Anonymous',
      subject: selectedSubject || activeRealm.shortTitle,
      topics: selectedTopics,
      gameMode: isMistakeMode ? 'mistakes' : 'quiz',
      minTimeRequired: MIN_QUIZ_TIME
    }).then(result => {
      setQuizSessionId(result.sessionId)
    }).catch(err => {
      console.error('Failed to create quiz session:', err)
    })
  }, [gameStarted, quizSessionId, selectedSubject, selectedTopics, activeRealm.shortTitle, isMistakeMode])

  // Track user interaction for anti-slacking
  useEffect(() => {
    if (!gameStarted) return undefined
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

  useEffect(() => () => cancelSpeech(), [])

  // Active study time ticker
  useEffect(() => {
    if (!gameStarted) return undefined
    const timer = window.setInterval(() => {
      if (gameStartTimeRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - gameStartTimeRef.current) / 1000))
        if (Date.now() - lastInteractionRef.current < IDLE_THRESHOLD) {
          activeSecondsRef.current += 1
          setActiveSeconds(activeSecondsRef.current)
        }
        if (activeSecondsRef.current >= MIN_QUIZ_TIME) {
          setMinTimeReached(true)
        }
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [gameStarted])

  // Save active time on page unload
  useEffect(() => {
    if (!gameStarted) return undefined
    const saveProgress = () => {
      const accountId = getLearnerAccountId()
      if (accountId && activeSecondsRef.current > 0) {
        learnerApi.recordTimeBeacon(accountId, activeSecondsRef.current / 60)
        activeSecondsRef.current = 0
      }
      if (quizSessionId && gameStartTimeRef.current) {
        quizSessionApi.sendActivityBeacon(quizSessionId, {
          durationSeconds: Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        })
      }
    }
    window.addEventListener('beforeunload', saveProgress)
    return () => window.removeEventListener('beforeunload', saveProgress)
  }, [gameStarted, quizSessionId])

  // Tab visibility detection
  useEffect(() => {
    if (!gameStarted || !quizSessionId) return undefined
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1)
        quizSessionApi.recordTabEvent(quizSessionId, 'left').catch(console.error)
      } else {
        quizSessionApi.recordTabEvent(quizSessionId, 'returned').catch(console.error)
        setShowTabWarning(true)
        window.setTimeout(() => setShowTabWarning(false), 4000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [gameStarted, quizSessionId])

  const advanceToNext = useCallback(() => {
    clearPendingAdvance()
    setPoolIndex(prevIdx => {
      const nextIdx = prevIdx + 1
      if (originalPoolSizeRef.current > 0) {
        const cycle = Math.floor(nextIdx / originalPoolSizeRef.current)
        if (cycle > lastRebuildCycleRef.current) {
          lastRebuildCycleRef.current = cycle
          const base = isMistakeMode ? getActiveFailedQuestions(20) : getWeightedQuestions()
          if (base.length > 0) {
            const newPool = []
            for (const q of base) {
              newPool.push(q)
              if (failedQuestionsRef.current.has(q.id)) {
                newPool.push({ ...q })
                newPool.push({ ...q })
              }
            }
            for (let i = newPool.length - 1; i > 0; i -= 1) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[newPool[i], newPool[j]] = [newPool[j], newPool[i]]
            }
            setQuestionPool(newPool)
          }
        }
      }
      return nextIdx
    })
    setSecondsLeft(questionDuration)
    setTypedAnswer('')
    setShowHint(false)
    setFeedbackPayload(null)
    setQuestionPhase('active')
    questionStartTimeRef.current = Date.now()
    window.setTimeout(() => inputRef.current?.focus(), 60)
  }, [clearPendingAdvance, questionDuration, isMistakeMode, getActiveFailedQuestions, getWeightedQuestions])

  // Strict per-question 60-second countdown; disappears & auto-advances when 0:00 hits
  useEffect(() => {
    if (!gameStarted || isPaused || gameOver || activeDiagram || activePassage || questionPhase !== 'active' || !currentQuestion) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer)
          playSound('wrong')
          setQuestionPhase('timeout')
          setFeedbackPayload({ answer: currentQuestion.answer, question: currentQuestion.question })
          speakQuestionAnswer(currentQuestion.question, currentQuestion.answer)

          recordAnswer(currentQuestion.id, false)
          failedQuestionsRef.current.add(currentQuestion.id)

          const timeTakenMs = Date.now() - questionStartTimeRef.current
          if (quizSessionId) {
            quizSessionApi.recordAnswer(quizSessionId, {
              questionId: currentQuestion.id,
              questionText: currentQuestion.question,
              correctAnswer: currentQuestion.answer,
              givenAnswer: null,
              isCorrect: false,
              outcome: 'timeout',
              subject: currentQuestion.subject || selectedSubject || activeRealm.shortTitle,
              topic: currentQuestion.topic || null,
              timeTakenMs
            }).catch(console.error)
          }
          learningApi.recordAnswer(learnerId, currentQuestion.id, false, timeTakenMs).catch(console.error)

          setSessionStats(s => ({ ...s, wrong: s.wrong + 1, streak: 0 }))
          setLives(l => {
            const nextL = l - 1
            if (nextL <= 0) {
              setGameOver(true)
              playSound('gameOver')
            }
            return nextL
          })

          advanceTimerRef.current = window.setTimeout(() => {
            advanceToNext()
          }, 2100)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [
    gameStarted,
    isPaused,
    gameOver,
    activeDiagram,
    activePassage,
    questionPhase,
    currentQuestion,
    playSound,
    recordAnswer,
    quizSessionId,
    learnerId,
    advanceToNext,
    selectedSubject,
    activeRealm.shortTitle
  ])

  const submitAnswer = useCallback((rawAnswer) => {
    if (!currentQuestion || questionPhase !== 'active' || isPaused) return
    const normalizedGiven = normalizeAnswerText(rawAnswer)
    if (!normalizedGiven) return

    const correctAnswer = normalizeAnswerText(currentQuestion.answer)
    const isCorrect = normalizedGiven === correctAnswer || (
      Array.isArray(currentQuestion.options) &&
      currentQuestion.options.some(
        opt => normalizeAnswerText(opt) === normalizedGiven && normalizeAnswerText(opt) === correctAnswer
      )
    )

    const timeTakenMs = Date.now() - questionStartTimeRef.current

    if (isCorrect) {
      playSound('correct', { streak: sessionStats.streak })
      recordDailyQuestAnswer(learnerId, currentQuestion.subject)

      const streakBonus = sessionStats.streak >= 3 ? (sessionStats.streak >= 5 ? 3 : 2) : 1
      const timeBonus = Math.max(1, Math.floor(secondsLeft / 5))
      const points = 10 * streakBonus + timeBonus

      setSessionStats(prev => {
        const newStreak = prev.streak + 1
        if (newStreak === 5 || newStreak === 10 || newStreak === 15) {
          playSound('streak')
        }
        return {
          ...prev,
          correct: prev.correct + 1,
          streak: newStreak,
          bestStreak: Math.max(prev.bestStreak || 0, newStreak),
          score: prev.score + points
        }
      })

      recordAnswer(currentQuestion.id, true)
      if (quizSessionId) {
        quizSessionApi.recordAnswer(quizSessionId, {
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          correctAnswer: currentQuestion.answer,
          givenAnswer: String(rawAnswer).trim(),
          isCorrect: true,
          outcome: 'correct',
          subject: currentQuestion.subject || selectedSubject || activeRealm.shortTitle,
          topic: currentQuestion.topic || null,
          timeTakenMs
        }).catch(console.error)
      }
      learningApi.recordAnswer(learnerId, currentQuestion.id, true, timeTakenMs).catch(console.error)

      setQuestionPhase('correct')
      setFeedbackPayload({ answer: currentQuestion.answer, points })

      // Periodically trigger inline reading passage challenge if available
      questionsUntilChallengeRef.current -= 1
      const hasDiagrams = diagramPool.length > 0
      const hasPassages = passagePool.length > 0

      if (questionsUntilChallengeRef.current <= 0 && (hasDiagrams || hasPassages)) {
        advanceTimerRef.current = window.setTimeout(() => {
          let showDiagram = false
          if (hasDiagrams && hasPassages) {
            showDiagram = nextChallengeTypeRef.current === 'diagram'
            nextChallengeTypeRef.current = showDiagram ? 'passage' : 'diagram'
          } else {
            showDiagram = hasDiagrams
          }
          if (showDiagram) {
            const diagram = diagramPool[diagramIndexRef.current % diagramPool.length]
            diagramIndexRef.current += 1
            setActiveDiagram(diagram)
          } else {
            const passage = passagePool[passageIndexRef.current % passagePool.length]
            passageIndexRef.current += 1
            setActivePassage(passage)
          }
          questionsUntilChallengeRef.current = 6 + Math.floor(Math.random() * 5)
          advanceToNext()
        }, 900)
      } else {
        advanceTimerRef.current = window.setTimeout(() => {
          advanceToNext()
        }, 900)
      }
    } else {
      playSound('wrong')
      setQuestionPhase('wrong')
      setFeedbackPayload({ answer: currentQuestion.answer, given: String(rawAnswer).trim() })
      speakQuestionAnswer(currentQuestion.question, currentQuestion.answer)

      recordAnswer(currentQuestion.id, false)
      failedQuestionsRef.current.add(currentQuestion.id)

      if (quizSessionId) {
        quizSessionApi.recordAnswer(quizSessionId, {
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          correctAnswer: currentQuestion.answer,
          givenAnswer: String(rawAnswer).trim(),
          isCorrect: false,
          outcome: 'wrong',
          subject: currentQuestion.subject || selectedSubject || activeRealm.shortTitle,
          topic: currentQuestion.topic || null,
          timeTakenMs
        }).catch(console.error)
      }
      learningApi.recordAnswer(learnerId, currentQuestion.id, false, timeTakenMs).catch(console.error)

      setSessionStats(prev => ({ ...prev, wrong: prev.wrong + 1, streak: 0 }))
      setLives(prev => {
        const nextL = prev - 1
        if (nextL <= 0) {
          setGameOver(true)
          playSound('gameOver')
        }
        return nextL
      })

      advanceTimerRef.current = window.setTimeout(() => {
        advanceToNext()
      }, 2200)
    }
  }, [
    currentQuestion,
    questionPhase,
    isPaused,
    playSound,
    sessionStats.streak,
    learnerId,
    secondsLeft,
    recordAnswer,
    quizSessionId,
    diagramPool,
    passagePool,
    advanceToNext,
    selectedSubject,
    activeRealm.shortTitle
  ])

  const handleDiagramComplete = useCallback(({ correctCount, totalLabels }) => {
    const points = Math.round((correctCount / totalLabels) * 100)
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + correctCount,
      wrong: prev.wrong + (totalLabels - correctCount),
      score: prev.score + points
    }))
    setActiveDiagram(null)
  }, [])

  const handlePassageComplete = useCallback(({ correctCount, totalQuestions }) => {
    const points = Math.round((correctCount / totalQuestions) * 100)
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + correctCount,
      wrong: prev.wrong + (totalQuestions - correctCount),
      score: prev.score + points
    }))
    setActivePassage(null)
  }, [])

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
    playSound('click')
  }, [playSound])

  const endGame = useCallback(() => {
    clearPendingAdvance()
    const durationSeconds = gameStartTimeRef.current
      ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
      : 0

    if (quizSessionId) {
      quizSessionApi.complete(quizSessionId, {
        score: sessionStats.score,
        bestStreak: Math.max(sessionStats.bestStreak || 0, sessionStats.streak || 0),
        correctAnswers: sessionStats.correct,
        wrongAnswers: sessionStats.wrong,
        durationSeconds
      }).catch(console.error)
    }

    const accountId = getLearnerAccountId()
    if (accountId && activeSecondsRef.current > 0) {
      learnerApi.recordTime(accountId, activeSecondsRef.current / 60).catch(console.error)
    }

    setCurrentSession({
      ...sessionStats,
      tabSwitches: tabSwitchCount,
      durationSeconds,
      timestamp: Date.now()
    })
    navigate('/results', { state: { ...sessionStats, tabSwitches: tabSwitchCount, durationSeconds } })
  }, [clearPendingAdvance, sessionStats, setCurrentSession, navigate, quizSessionId, tabSwitchCount])

  useEffect(() => {
    if (gameOver) {
      if (minTimeReached) {
        const t = window.setTimeout(() => endGame(), 1800)
        return () => window.clearTimeout(t)
      }
      const t = window.setTimeout(() => {
        setGameOver(false)
        setLives(3)
      }, 1600)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [gameOver, endGame, minTimeReached])

  const timerPct = (secondsLeft / questionDuration) * 100
  const timerColor = secondsLeft > 20 ? '#10b981' : secondsLeft > 10 ? '#f5b942' : '#f43f5e'

  return (
    <div className="game-page" data-realm={activeRealm.id}>
      <AmbientBackdrop realm={activeRealm.id} />

      {/* Top Per-Question 1-Minute Countdown Bar */}
      {gameStarted && !activeDiagram && !activePassage && (
        <div className="game-top-timer-track">
          <div
            className="game-top-timer-fill"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>
      )}

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown > 0 && (
          <Motion.div
            className="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="countdown-realm-tag">{activeRealm.shortTitle}</div>
            <Motion.div
              className="countdown-number mono-num"
              key={countdown}
              initial={{ scale: 1.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {countdown}
            </Motion.div>
            <div className="countdown-text">Full-Screen Focus &middot; {formatClock(questionDuration)} per Question</div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Tab Switch Warning */}
      <AnimatePresence>
        {showTabWarning && (
          <Motion.div
            className="tab-warning-banner"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
          >
            <ObservatoryIcon name="alert" size={18} />
            Tab switch detected! This has been logged. (Total: {tabSwitchCount})
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Game Header */}
      <header className="game-header">
        <div className="header-left-group">
          <button
            className="pause-button"
            onClick={togglePause}
            aria-label={isPaused ? 'Resume session' : 'Pause session'}
          >
            <ObservatoryIcon name={isPaused ? 'play' : 'pause'} size={18} />
          </button>
          <span className="game-realm-pill">{activeRealm.shortTitle}</span>
        </div>

        <ScoreDisplay
          score={sessionStats.score}
          streak={sessionStats.streak}
          correct={sessionStats.correct}
          wrong={sessionStats.wrong}
        />

        <div className="header-right-info">
          <div className="quiz-timer mono-num">
            {Math.floor(Math.floor(activeSeconds / DISPLAY_DIVISOR) / 60)}:{String(Math.floor(activeSeconds / DISPLAY_DIVISOR) % 60).padStart(2, '0')}
            {!minTimeReached && <span className="min-time-note"> / 30:00</span>}
          </div>
          <div className="lives-display">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`life-heart ${i < lives ? 'active' : 'lost'}`}>
                <ObservatoryIcon name="heart" size={18} />
              </span>
            ))}
          </div>
        </div>
      </header>

      {tabSwitchCount > 0 && gameStarted && (
        <div className="tab-switch-badge">
          <ObservatoryIcon name="alert" size={13} /> {tabSwitchCount} tab switch{tabSwitchCount !== 1 ? 'es' : ''}
        </div>
      )}

      {/* FULL-SCREEN FOCUSED QUESTION STAGE (Zero Falling Bubbles!) */}
      <main className="focus-stage-main">
        {!activeDiagram && !activePassage && gameStarted && currentQuestion && (
          <AnimatePresence mode="wait">
            {questionPhase === 'timeout' ? (
              <Motion.div
                key={`timeout_${poolIndex}`}
                className="focus-question-card obs-panel is-timeout"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
              >
                <span className="focus-timeout-badge">Time&apos;s Up ({formatClock(questionDuration)})</span>
                <h2 className="focus-timeout-heading">Question Expired</h2>
                <p className="focus-timeout-answer">
                  Correct Answer: <strong>{feedbackPayload?.answer}</strong>
                </p>
                <span className="focus-timeout-sub">Moving to next question…</span>
              </Motion.div>
            ) : (
              <Motion.div
                key={`q_${poolIndex}_${currentQuestion.id}`}
                className="focus-question-card obs-panel"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -18, scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                {/* Card Top Meta + 1-Minute Countdown Ring */}
                <div className="focus-card-top">
                  <div className="focus-topic-badges">
                    <span className="focus-topic-pill">{currentQuestion.topic || activeRealm.shortTitle}</span>
                    <span className="focus-qnum mono-num">Question #{poolIndex + 1}</span>
                  </div>

                  <div className={`focus-ring-wrap ${secondsLeft <= 10 ? 'is-urgent' : ''}`}>
                    <MasteryRing percent={timerPct} size={58} strokeWidth={5} color={timerColor}>
                      <span className="mono-num focus-ring-time" style={{ color: timerColor }}>
                        {formatClock(secondsLeft)}
                      </span>
                    </MasteryRing>
                  </div>
                </div>

                {/* Optional Question Image */}
                {currentQuestion.image && (
                  <div className="focus-q-image">
                    <img src={currentQuestion.image} alt="Question illustration" />
                  </div>
                )}

                {/* Large Centered Question Text */}
                <h1 className="focus-q-prompt">{currentQuestion.question}</h1>

                {/* Multiple Choice Grid OR Clean Typed Input */}
                {currentQuestion.type === 'multiple' && Array.isArray(currentQuestion.options) ? (
                  <div className="focus-mc-grid">
                    {currentQuestion.options.map((opt, oi) => {
                      const letter = String.fromCharCode(65 + oi)
                      const isRight = questionPhase !== 'active' &&
                        normalizeAnswerText(opt) === normalizeAnswerText(currentQuestion.answer)
                      const isWrongChosen = questionPhase === 'wrong' &&
                        normalizeAnswerText(opt) === normalizeAnswerText(feedbackPayload?.given)
                      return (
                        <button
                          key={oi}
                          type="button"
                          className={`focus-mc-option ${isRight ? 'is-correct' : ''} ${isWrongChosen ? 'is-wrong' : ''}`}
                          disabled={questionPhase !== 'active' || isPaused}
                          onClick={() => submitAnswer(opt)}
                        >
                          <span className="focus-mc-letter mono-num">{letter}</span>
                          <span className="focus-mc-label">{opt}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <form
                    className="focus-text-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      submitAnswer(typedAnswer)
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      className="focus-text-input"
                      value={typedAnswer}
                      onChange={e => setTypedAnswer(e.target.value)}
                      placeholder="Type your answer and press Enter…"
                      disabled={questionPhase !== 'active' || isPaused}
                      autoComplete="off"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-tactile focus-submit-btn"
                      disabled={questionPhase !== 'active' || !typedAnswer.trim() || isPaused}
                    >
                      Submit
                    </button>
                  </form>
                )}

                {/* Optional Hint Toggle */}
                {currentQuestion.hint && questionPhase === 'active' && (
                  <div className="focus-hint-row">
                    {!showHint ? (
                      <button
                        type="button"
                        className="focus-hint-trigger"
                        onClick={() => { playSound('click'); setShowHint(true) }}
                      >
                        Need a hint?
                      </button>
                    ) : (
                      <div className="focus-hint-box">{currentQuestion.hint}</div>
                    )}
                  </div>
                )}

                {/* Instant Inline Feedback Banner */}
                {questionPhase === 'correct' && (
                  <Motion.div
                    className="focus-feedback-strip is-correct"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ObservatoryIcon name="check" size={18} />
                    <strong>Correct!</strong>
                    <span className="mono-num">+{feedbackPayload?.points || 10} pts</span>
                  </Motion.div>
                )}

                {questionPhase === 'wrong' && (
                  <Motion.div
                    className="focus-feedback-strip is-wrong"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ObservatoryIcon name="alert" size={18} />
                    <span>
                      Correct Answer: <strong>{feedbackPayload?.answer}</strong>
                    </span>
                  </Motion.div>
                )}
              </Motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Diagram Challenge Overlay */}
      <AnimatePresence>
        {activeDiagram && (
          <DiagramChallenge
            diagram={activeDiagram}
            onComplete={handleDiagramComplete}
            playSound={playSound}
            quizSessionId={quizSessionId}
          />
        )}
      </AnimatePresence>

      {/* Passage Challenge Overlay */}
      <AnimatePresence>
        {activePassage && (
          <PassageChallenge
            passage={activePassage}
            onComplete={handlePassageComplete}
            playSound={playSound}
            quizSessionId={quizSessionId}
          />
        )}
      </AnimatePresence>

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <Motion.div
            className="pause-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pause-content">
              <h2>Session Paused</h2>
              <div className="pause-stats mono-num">
                <div>Score: {sessionStats.score}</div>
                <div>Correct: {sessionStats.correct}</div>
                <div>Missed: {sessionStats.wrong}</div>
              </div>
              <div className="pause-buttons">
                <button className="resume-btn" onClick={togglePause}>
                  <ObservatoryIcon name="play" size={16} /> Resume
                </button>
                <button className="quit-btn" onClick={endGame} disabled={!minTimeReached}>
                  End Session
                </button>
              </div>
              {!minTimeReached && (
                <div className="min-time-note" style={{ marginTop: '0.85rem', fontSize: '0.84rem' }}>
                  Active time remaining: {Math.floor(Math.floor(Math.max(0, MIN_QUIZ_TIME - activeSeconds) / DISPLAY_DIVISOR) / 60)}:{String(Math.floor(Math.max(0, MIN_QUIZ_TIME - activeSeconds) / DISPLAY_DIVISOR) % 60).padStart(2, '0')}
                </div>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameOver && (
          <Motion.div
            className="game-over-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Motion.div
              className="game-over-content"
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
            >
              {minTimeReached ? (
                <>
                  <h2>Session Complete</h2>
                  <div className="final-score">{sessionStats.score}</div>
                  <div className="loading-text">Preparing mission debrief…</div>
                </>
              ) : (
                <>
                  <h2>Keep Going!</h2>
                  <div className="min-time-message">Minimum focus session: 30 minutes</div>
                  <div className="time-remaining">
                    {Math.floor(Math.floor(Math.max(0, MIN_QUIZ_TIME - elapsedSeconds) / DISPLAY_DIVISOR) / 60)}:{String(Math.floor(Math.max(0, MIN_QUIZ_TIME - elapsedSeconds) / DISPLAY_DIVISOR) % 60).padStart(2, '0')} remaining
                  </div>
                  <div className="loading-text">Lives restored — next question loading…</div>
                </>
              )}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GamePage
