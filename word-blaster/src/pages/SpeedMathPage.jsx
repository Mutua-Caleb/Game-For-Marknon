import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { quizSessionApi, learnerApi } from '../utils/api'
import { recordDailyQuestAnswer } from '../data/curriculum'
import { CE_MATHS_QUESTIONS, isMathsAnswerCorrect } from '../data/ceMathsCurriculum'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import './SpeedMathPage.css'

const QUESTION_SECONDS = 60

function readLearnerAccount() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function getTrackingId() {
  return localStorage.getItem('learnerId') || 'guest'
}

function speakMentalQuestion(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-GB'
    utter.rate = 0.92
    window.speechSynthesis.speak(utter)
  } catch {
    // ignore speech errors
  }
}

function formatClock(s) {
  const safe = Math.max(0, Math.ceil(s))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

/**
 * Rewritten Native ISEB Mental Arithmetic Arena (replaces legacy SoroMath iframe).
 * Follows Galore Park Common Entrance 13+ Chapter 1 (1.1 Basic Skills & 1.2 Mental Strategies)
 * with full-screen 1-minute timed questions and optional British Examiner Read-Aloud.
 */
function SpeedMathPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const trackingId = getTrackingId()

  const [mode, setMode] = useState(null) // null (lobby) | 'basic' | 'strategies' | 'full'
  const [autoReadAloud, setAutoReadAloud] = useState(true)
  const [qIndex, setQIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS)
  const [userAnswer, setUserAnswer] = useState('')
  const [status, setStatus] = useState('active') // 'active' | 'correct' | 'wrong' | 'timeout'
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [log, setLog] = useState([])
  const [finished, setFinished] = useState(false)

  const sessionIdRef = useRef(null)
  const sessionPromiseRef = useRef(null)
  const startedAtRef = useRef(0)
  const questionStartRef = useRef(0)
  const bestStreakRef = useRef(0)
  const scoreRef = useRef(0)
  const completedRef = useRef(false)
  const advanceRef = useRef(null)
  const inputRef = useRef(null)

  const mentalQuestions = useMemo(() => {
    const ch1 = CE_MATHS_QUESTIONS.filter(q => q.chapterId === 'ch1-mental')
    if (mode === 'basic') return ch1.filter(q => q.section === '1.1 Basic Skills')
    if (mode === 'strategies') return ch1.filter(q => q.section === '1.2 Mental Strategies')
    return ch1
  }, [mode])

  const currentQuestion = mentalQuestions[qIndex] || null

  const clearAdvance = useCallback(() => {
    if (advanceRef.current) {
      window.clearTimeout(advanceRef.current)
      advanceRef.current = null
    }
  }, [])

  const flushPartialSession = useCallback(() => {
    if (completedRef.current || !sessionIdRef.current || !startedAtRef.current) return
    const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000))
    quizSessionApi.sendActivityBeacon(sessionIdRef.current, {
      score: scoreRef.current,
      bestStreak: bestStreakRef.current,
      durationSeconds
    })
    const learner = readLearnerAccount()
    if (learner?.id && durationSeconds >= 10) {
      learnerApi.recordTimeBeacon(learner.id, durationSeconds / 60)
    }
    sessionIdRef.current = null
    sessionPromiseRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearAdvance()
      flushPartialSession()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [clearAdvance, flushPartialSession])

  useEffect(() => {
    if (!mode || finished) return undefined
    const handleVis = () => {
      if (!sessionIdRef.current) return
      quizSessionApi.recordTabEvent(sessionIdRef.current, document.hidden ? 'left' : 'returned').catch(console.error)
    }
    document.addEventListener('visibilitychange', handleVis)
    return () => document.removeEventListener('visibilitychange', handleVis)
  }, [mode, finished])

  const recordMentalAnswer = useCallback((payload) => {
    if (sessionIdRef.current) {
      quizSessionApi.recordAnswer(sessionIdRef.current, payload).catch(console.error)
    } else if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(sid => {
        if (sid) quizSessionApi.recordAnswer(sid, payload).catch(console.error)
      }).catch(console.error)
    }
  }, [])

  // Start quiz session tracking on server when entering a test
  const startMentalMode = (selectedMode) => {
    clearAdvance()
    flushPartialSession()
    playSound('gameStart')
    setMode(selectedMode)
    setQIndex(0)
    setSecondsLeft(QUESTION_SECONDS)
    setUserAnswer('')
    setStatus('active')
    setScore(0)
    setStreak(0)
    setLog([])
    setFinished(false)
    startedAtRef.current = Date.now()
    questionStartRef.current = Date.now()
    bestStreakRef.current = 0
    scoreRef.current = 0
    completedRef.current = false
    sessionIdRef.current = null

    const modeLabel = selectedMode === 'basic'
      ? 'Mental Arithmetic · 1.1 Basic Skills'
      : selectedMode === 'strategies'
        ? 'Mental Arithmetic · 1.2 Mental Strategies'
        : 'Mental Arithmetic · Full Exam'

    const learner = readLearnerAccount()
    sessionPromiseRef.current = quizSessionApi.start({
      learnerId: learner?.id || null,
      playerName: learner?.name || 'Anonymous',
      subject: 'Maths',
      topics: [modeLabel],
      gameMode: 'math',
      minTimeRequired: 10 * 60
    }).then(res => {
      sessionIdRef.current = res?.sessionId || null
      return sessionIdRef.current
    }).catch(err => {
      console.error('Failed to start mental arithmetic session:', err)
      return null
    })
  }

  // Optional British Examiner Read-Aloud when a new question appears
  useEffect(() => {
    if (!mode || finished || status !== 'active' || !currentQuestion) return
    if (autoReadAloud) {
      speakMentalQuestion(currentQuestion.prompt)
    }
    window.setTimeout(() => inputRef.current?.focus(), 60)
  }, [mode, finished, status, currentQuestion, autoReadAloud])

  const advanceQuestion = useCallback((latestLog) => {
    clearAdvance()
    if (qIndex + 1 < mentalQuestions.length) {
      setQIndex(i => i + 1)
      setSecondsLeft(QUESTION_SECONDS)
      setUserAnswer('')
      setStatus('active')
      questionStartRef.current = Date.now()
    } else {
      playSound('focusBlockComplete')
      setFinished(true)
      completedRef.current = true
      const finalLog = latestLog || log
      const correct = finalLog.filter(x => x.outcome === 'correct').length
      const wrong = finalLog.length - correct
      const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000))
      const completePayload = {
        subject: 'Maths',
        score: scoreRef.current,
        correctAnswers: correct,
        wrongAnswers: wrong,
        bestStreak: bestStreakRef.current,
        durationSeconds
      }
      if (sessionIdRef.current) {
        quizSessionApi.complete(sessionIdRef.current, completePayload).catch(console.error)
      } else if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(sid => {
          if (sid) quizSessionApi.complete(sid, completePayload).catch(console.error)
        }).catch(console.error)
      }
      const learner = readLearnerAccount()
      if (learner?.id && durationSeconds > 0) {
        learnerApi.recordTime(learner.id, durationSeconds / 60).catch(console.error)
      }
    }
  }, [clearAdvance, qIndex, mentalQuestions.length, playSound, log])

  // Strict 1-minute countdown per question; disappears & advances automatically on timeout
  useEffect(() => {
    if (!mode || finished || status !== 'active' || !currentQuestion) return undefined

    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer)
          playSound('wrong')
          setStreak(0)
          setStatus('timeout')
          const timeTakenMs = questionStartRef.current
            ? Date.now() - questionStartRef.current
            : QUESTION_SECONDS * 1000
          recordMentalAnswer({
            questionId: currentQuestion.id,
            questionText: currentQuestion.prompt,
            correctAnswer: currentQuestion.answer,
            givenAnswer: null,
            isCorrect: false,
            outcome: 'timeout',
            subject: 'Maths',
            topic: currentQuestion.section || 'Mental Arithmetic',
            timeTakenMs
          })
          const entry = { question: currentQuestion, given: '', outcome: 'timeout' }
          setLog(prevLog => {
            const nextLog = [...prevLog, entry]
            advanceRef.current = window.setTimeout(() => advanceQuestion(nextLog), 2000)
            return nextLog
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [mode, finished, status, currentQuestion, playSound, advanceQuestion, recordMentalAnswer])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!currentQuestion || status !== 'active' || !userAnswer.trim()) return

    const trimmed = userAnswer.trim()
    const ok = isMathsAnswerCorrect(trimmed, currentQuestion)
    const outcome = ok ? 'correct' : 'wrong'
    const timeTakenMs = questionStartRef.current
      ? Math.max(200, Date.now() - questionStartRef.current)
      : (QUESTION_SECONDS - secondsLeft) * 1000

    recordMentalAnswer({
      questionId: currentQuestion.id,
      questionText: currentQuestion.prompt,
      correctAnswer: currentQuestion.answer,
      givenAnswer: trimmed,
      isCorrect: ok,
      outcome,
      subject: 'Maths',
      topic: currentQuestion.section || 'Mental Arithmetic',
      timeTakenMs
    })

    const entry = { question: currentQuestion, given: trimmed, outcome }
    const nextLog = [...log, entry]
    setLog(nextLog)
    setStatus(outcome)

    if (ok) {
      const nextStreak = streak + 1
      playSound('correct', { streak })
      if (nextStreak === 5 || nextStreak === 10) playSound('streak')
      setStreak(nextStreak)
      bestStreakRef.current = Math.max(bestStreakRef.current, nextStreak)
      setScore(s => {
        const next = s + 100 + secondsLeft
        scoreRef.current = next
        return next
      })
      recordDailyQuestAnswer(trackingId, 'Maths')
    } else {
      playSound('wrong')
      setStreak(0)
    }
  }

  const basicCount = CE_MATHS_QUESTIONS.filter(q => q.section === '1.1 Basic Skills').length
  const stratCount = CE_MATHS_QUESTIONS.filter(q => q.section === '1.2 Mental Strategies').length
  const timerPct = (secondsLeft / QUESTION_SECONDS) * 100
  const timerColor = secondsLeft > 20 ? '#10b981' : secondsLeft > 10 ? '#f5b942' : '#f43f5e'
  const correctTotal = log.filter(l => l.outcome === 'correct').length
  const accuracy = mentalQuestions.length > 0 ? Math.round((correctTotal / mentalQuestions.length) * 100) : 0

  return (
    <div className="speed-math-page" data-realm="maths">
      <AmbientBackdrop realm="maths" />

      {/* LOBBY */}
      {!mode && (
        <div className="mental-shell">
          <header className="mental-topbar">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { playSound('click'); navigate('/') }}
            >
              <ObservatoryIcon name="arrow-left" size={16} />
              <span>Command Center</span>
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => { playSound('click'); navigate('/maths-forge') }}
            >
              <span>All Maths Chapters (Ch. 1–7)</span>
              <ObservatoryIcon name="arrow-right" size={15} />
            </button>
          </header>

          <section className="mental-hero obs-panel">
            <div className="mental-hero-crest">
              <RealmCrest realmId="maths" size={32} />
            </div>
            <span className="mental-eyebrow">Galore Park Chapter 1 · No Calculator</span>
            <h1>ISEB Common Entrance Mental Arithmetic</h1>
            <p>
              Rebuilt directly from your Galore Park PDF curriculum. Each question fills the entire
              screen for <strong>1 minute</strong>, with optional British Examiner audio read-aloud.
            </p>

            <label className="audioread-toggle">
              <input
                type="checkbox"
                checked={autoReadAloud}
                onChange={e => setAutoReadAloud(e.target.checked)}
              />
              <span>Read each question aloud automatically (British exam voice)</span>
            </label>
          </section>

          <div className="mental-mode-grid">
            <Motion.article
              className="mental-mode-card obs-panel"
              whileHover={{ y: -4 }}
              onClick={() => startMentalMode('basic')}
            >
              <span className="mental-part-pill mono-num">Part 1.1</span>
              <h2>Basic Skills</h2>
              <p>Place value, ×/÷ 100 &amp; 1000, HCF/LCM, mental arithmetic, BIDMAS, FDP, rounding &amp; quick algebra.</p>
              <div className="mental-card-foot">
                <span className="mono-num">{basicCount} questions · 1:00 each</span>
                <span className="mental-go">Start <ObservatoryIcon name="arrow-right" size={15} /></span>
              </div>
            </Motion.article>

            <Motion.article
              className="mental-mode-card obs-panel"
              whileHover={{ y: -4 }}
              onClick={() => startMentalMode('strategies')}
            >
              <span className="mental-part-pill mono-num">Part 1.2</span>
              <h2>Mental Strategies</h2>
              <p>Word problems without written working: interest, recipes, money, ages, speed, percentages &amp; primes.</p>
              <div className="mental-card-foot">
                <span className="mono-num">{stratCount} questions · 1:00 each</span>
                <span className="mental-go">Start <ObservatoryIcon name="arrow-right" size={15} /></span>
              </div>
            </Motion.article>

            <Motion.article
              className="mental-mode-card obs-panel is-featured"
              whileHover={{ y: -4 }}
              onClick={() => startMentalMode('full')}
            >
              <span className="mental-part-pill mono-num">Full Exam</span>
              <h2>Complete Chapter 1 Test</h2>
              <p>Full ISEB Mental Arithmetic paper combining Part 1.1 Basic Skills and Part 1.2 Mental Strategies.</p>
              <div className="mental-card-foot">
                <span className="mono-num">{basicCount + stratCount} questions · 1:00 each</span>
                <span className="mental-go">Begin Exam <ObservatoryIcon name="arrow-right" size={15} /></span>
              </div>
            </Motion.article>
          </div>
        </div>
      )}

      {/* FULL-SCREEN 1-MINUTE MENTAL ARITHMETIC STAGE */}
      {mode && !finished && currentQuestion && (
        <div className="mental-arena">
          <div className="arena-top-progress">
            <div
              className="arena-top-progress-fill"
              style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
            />
          </div>

          <header className="arena-header">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { clearAdvance(); setMode(null) }}
            >
              <ObservatoryIcon name="arrow-left" size={15} />
              <span>Mental Lobby</span>
            </button>

            <div className="arena-center-counter mono-num">
              Question <strong>{qIndex + 1}</strong> / {mentalQuestions.length}
            </div>

            <div className="arena-header-right">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => speakMentalQuestion(currentQuestion.prompt)}
                title="Replay British Examiner audio"
              >
                <ObservatoryIcon name="sound-on" size={16} />
                <span>Replay Audio</span>
              </button>
              <span className="arena-score-pill mono-num">
                <ObservatoryIcon name="trophy" size={15} /> {score}
              </span>
            </div>
          </header>

          <main className="arena-stage-center">
            <AnimatePresence mode="wait">
              {status === 'timeout' ? (
                <Motion.div
                  key={`to_${currentQuestion.id}`}
                  className="arena-timeout-card obs-panel"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="timeout-badge">Time&apos;s Up (1:00)</span>
                  <h2>Question Disappeared</h2>
                  <p className="timeout-answer-reveal">
                    Answer: <strong className="mono-num">{currentQuestion.answer}</strong>
                  </p>
                  <p className="timeout-next-note">Next mental question incoming…</p>
                </Motion.div>
              ) : (
                <Motion.div
                  key={currentQuestion.id}
                  className="arena-question-card obs-panel"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                >
                  <div className="arena-q-top">
                    <span className="arena-section-pill">{currentQuestion.section} · Mental Only</span>
                    <div className={`arena-timer-cluster ${secondsLeft <= 10 ? 'is-urgent' : ''}`}>
                      <MasteryRing percent={timerPct} size={56} strokeWidth={5} color={timerColor}>
                        <span className="mono-num arena-timer-text" style={{ color: timerColor }}>
                          {formatClock(secondsLeft)}
                        </span>
                      </MasteryRing>
                    </div>
                  </div>

                  <h1 className="arena-prompt-text">{currentQuestion.prompt}</h1>

                  {currentQuestion.equation && (
                    <div className="arena-equation-banner mono-num">{currentQuestion.equation}</div>
                  )}

                  <form onSubmit={handleSubmit} className="arena-answer-form">
                    <div className="arena-input-box">
                      <span className="arena-unit-label mono-num">{currentQuestion.unit}</span>
                      <input
                        ref={inputRef}
                        type="text"
                        className="arena-answer-input mono-num"
                        value={userAnswer}
                        onChange={e => setUserAnswer(e.target.value)}
                        placeholder="Mental answer & press Enter…"
                        disabled={status !== 'active'}
                        autoComplete="off"
                        autoFocus
                      />
                      {status === 'active' && (
                        <button type="submit" className="btn-tactile arena-submit-btn" disabled={!userAnswer.trim()}>
                          Submit
                        </button>
                      )}
                    </div>
                  </form>

                  {(status === 'correct' || status === 'wrong') && (
                    <Motion.div
                      className={`arena-worked-panel is-${status}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="arena-worked-head">
                        <strong>
                          {status === 'correct'
                            ? 'Sharp Mental Maths!'
                            : `Answer: ${currentQuestion.answer}`}
                        </strong>
                        <span className="mono-num">{QUESTION_SECONDS - secondsLeft}s</span>
                      </div>
                      <ol className="arena-worked-steps">
                        {currentQuestion.workedSteps.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ol>
                      <button
                        type="button"
                        className="btn-tactile arena-next-btn"
                        onClick={() => advanceQuestion()}
                        autoFocus
                      >
                        <span>{qIndex + 1 < mentalQuestions.length ? 'Next Question' : 'View Results'}</span>
                        <ObservatoryIcon name="arrow-right" size={16} />
                      </button>
                    </Motion.div>
                  )}
                </Motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      )}

      {/* RESULTS SUMMARY */}
      {mode && finished && (
        <div className="mental-shell">
          <Motion.section
            className="chapter-debrief obs-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="mental-eyebrow">ISEB Mental Arithmetic Debrief</span>
            <MasteryRing percent={accuracy} size={122} strokeWidth={8} color="#f59e0b">
              <strong className="mono-num" style={{ fontSize: '1.7rem' }}>{accuracy}%</strong>
            </MasteryRing>
            <h1>{accuracy >= 85 ? 'Rapid Mental Mastery!' : 'Strong Mental Workout'}</h1>
            <p className="debrief-meta mono-num">
              {correctTotal} / {mentalQuestions.length} correct &middot; {score} points
            </p>
            <div className="debrief-actions">
              <button type="button" className="btn-tactile" onClick={() => startMentalMode(mode)}>
                <ObservatoryIcon name="play" size={16} /> Retake Test
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMode(null)}>
                Choose Mental Section
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate('/maths-forge')}>
                Explore All Maths Chapters
              </button>
            </div>
          </Motion.section>
        </div>
      )}
    </div>
  )
}

export default SpeedMathPage
