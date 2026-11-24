import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { recordDailyQuestAnswer } from '../data/curriculum'
import {
  CE_MATHS_QUESTIONS,
  MATHS_CHAPTERS,
  isMathsAnswerCorrect,
  readMathsChapterProgress,
  saveMathsChapterResult
} from '../data/ceMathsCurriculum'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import { MathsVisualDiagram } from '../components/MathsVisualModels'
import './MathsForgePage.css'

const QUESTION_DURATION_SEC = 60

function getTrackingId() {
  return localStorage.getItem('learnerId') || 'guest'
}

function formatSec(s) {
  const safe = Math.max(0, Math.ceil(s))
  const m = Math.floor(safe / 60)
  const rem = safe % 60
  return `${m}:${String(rem).padStart(2, '0')}`
}

function MathsForgePage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const trackingId = getTrackingId()

  const [chapterProgress, setChapterProgress] = useState(() => readMathsChapterProgress())
  const [activeChapterId, setActiveChapterId] = useState(null)

  // Active full-screen timed session state
  const [qIndex, setQIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_DURATION_SEC)
  const [userAnswer, setUserAnswer] = useState('')
  const [scratchpad, setScratchpad] = useState('')
  const [showScratchpad, setShowScratchpad] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [status, setStatus] = useState('active') // 'active' | 'correct' | 'wrong' | 'timeout'
  const [isPaused, setIsPaused] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [resultsLog, setResultsLog] = useState([]) // { question, given, outcome }
  const [finished, setFinished] = useState(false)

  const inputRef = useRef(null)
  const advanceTimerRef = useRef(null)

  const activeChapter = useMemo(
    () => MATHS_CHAPTERS.find(c => c.id === activeChapterId) || null,
    [activeChapterId]
  )

  const chapterQuestions = useMemo(() => {
    if (!activeChapterId) return []
    return CE_MATHS_QUESTIONS.filter(q => q.chapterId === activeChapterId)
  }, [activeChapterId])

  const currentQuestion = chapterQuestions[qIndex] || null

  const clearPendingAdvance = useCallback(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  useEffect(() => clearPendingAdvance, [clearPendingAdvance])

  const startChapter = (chapterId) => {
    clearPendingAdvance()
    playSound('gameStart')
    setActiveChapterId(chapterId)
    setQIndex(0)
    setSecondsLeft(QUESTION_DURATION_SEC)
    setUserAnswer('')
    setScratchpad('')
    setShowScratchpad(false)
    setShowHint(false)
    setStatus('active')
    setIsPaused(false)
    setScore(0)
    setStreak(0)
    setResultsLog([])
    setFinished(false)
  }

  const exitToChapters = () => {
    clearPendingAdvance()
    playSound('click')
    setActiveChapterId(null)
  }

  const moveToNextQuestion = useCallback((latestLog) => {
    clearPendingAdvance()
    if (qIndex + 1 < chapterQuestions.length) {
      setQIndex(i => i + 1)
      setSecondsLeft(QUESTION_DURATION_SEC)
      setUserAnswer('')
      setScratchpad('')
      setShowHint(false)
      setStatus('active')
      window.setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      const correctTotal = (latestLog || resultsLog).filter(r => r.outcome === 'correct').length
      if (activeChapterId) {
        const updated = saveMathsChapterResult(activeChapterId, {
          correct: correctTotal,
          total: chapterQuestions.length
        })
        setChapterProgress(updated)
      }
      playSound('focusBlockComplete')
      setFinished(true)
    }
  }, [clearPendingAdvance, qIndex, chapterQuestions.length, resultsLog, activeChapterId, playSound])

  // Strict 60-second countdown per question; disappears and auto-advances on 0:00
  useEffect(() => {
    if (!activeChapterId || finished || status !== 'active' || isPaused || !currentQuestion) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(interval)
          playSound('wrong')
          setStreak(0)
          setStatus('timeout')
          const entry = { question: currentQuestion, given: '', outcome: 'timeout' }
          setResultsLog(log => {
            const nextLog = [...log, entry]
            advanceTimerRef.current = window.setTimeout(() => {
              moveToNextQuestion(nextLog)
            }, 2200)
            return nextLog
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeChapterId, finished, status, isPaused, currentQuestion, playSound, moveToNextQuestion])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!currentQuestion || status !== 'active' || !userAnswer.trim()) return

    const correct = isMathsAnswerCorrect(userAnswer, currentQuestion)
    const outcome = correct ? 'correct' : 'wrong'
    const entry = { question: currentQuestion, given: userAnswer.trim(), outcome }
    setResultsLog(prev => [...prev, entry])
    setStatus(outcome)

    if (correct) {
      const nextStreak = streak + 1
      playSound('correct', { streak })
      if (nextStreak === 3 || nextStreak === 6) playSound('streak')
      setStreak(nextStreak)
      const timeBonus = Math.round(secondsLeft * 1.5)
      setScore(s => s + 100 + timeBonus)
      recordDailyQuestAnswer(trackingId, 'Maths')
    } else {
      playSound('wrong')
      setStreak(0)
    }
  }

  const timerPct = (secondsLeft / QUESTION_DURATION_SEC) * 100
  const timerColor = secondsLeft > 20 ? '#10b981' : secondsLeft > 10 ? '#f5b942' : '#f43f5e'
  const correctCount = resultsLog.filter(r => r.outcome === 'correct').length
  const timeoutCount = resultsLog.filter(r => r.outcome === 'timeout').length
  const accuracy = chapterQuestions.length > 0 ? Math.round((correctCount / chapterQuestions.length) * 100) : 0

  return (
    <div className="maths-forge-page" data-realm="maths">
      <AmbientBackdrop realm="maths" />

      {/* ================================================================
          VIEW 1: CHAPTER PICKER LOBBY (Galore Park CE 13+ Chapters 1–7)
          ================================================================ */}
      {!activeChapter && (
        <div className="maths-lobby-shell">
          <header className="maths-topbar">
            <div className="maths-topbar-left">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { playSound('click'); navigate('/') }}
              >
                <ObservatoryIcon name="arrow-left" size={16} />
                <span>Command Center</span>
              </button>

              <div className="maths-brand">
                <RealmCrest realmId="maths" size={26} />
                <div>
                  <strong>Common Entrance 13+ Maths Chapters</strong>
                  <span>Galore Park Curriculum &middot; 1-Minute Timed Full-Screen Focus</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-tactile"
              onClick={() => { playSound('click'); navigate('/math') }}
            >
              <ObservatoryIcon name="bolt" size={16} />
              <span>Mental Arithmetic Exam (Ch. 1)</span>
            </button>
          </header>

          <section className="maths-hero obs-panel">
            <div>
              <span className="maths-eyebrow">Pick Today&apos;s Chapter</span>
              <h1>Structured British Prep Mathematics</h1>
              <p>
                Every question fills the screen cleanly with zero distractions and a strict{' '}
                <strong>1-minute timer</strong>. If time expires, the question disappears and the
                next one appears automatically.
              </p>
            </div>
            <div className="maths-hero-stat">
              <strong className="mono-num">{CE_MATHS_QUESTIONS.length}</strong>
              <span>Verified CE 13+ Questions</span>
            </div>
          </section>

          <div className="chapters-grid">
            {MATHS_CHAPTERS.map((ch, idx) => {
              const qCount = CE_MATHS_QUESTIONS.filter(q => q.chapterId === ch.id).length
              const prog = chapterProgress[ch.id]
              const pct = prog && prog.total > 0 ? Math.round((prog.bestCorrect / prog.total) * 100) : 0

              return (
                <Motion.article
                  key={ch.id}
                  className="chapter-card obs-panel"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -4 }}
                  onClick={() => startChapter(ch.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      startChapter(ch.id)
                    }
                  }}
                >
                  <div className="chapter-card-top">
                    <span className="chapter-num-badge mono-num" style={{ color: ch.accent, borderColor: `${ch.accent}55` }}>
                      Chapter 0{ch.number}
                    </span>
                    <MasteryRing percent={pct} size={50} strokeWidth={4} color={ch.accent}>
                      <span className="mono-num" style={{ fontSize: '0.7rem', fontWeight: 700 }}>{pct}%</span>
                    </MasteryRing>
                  </div>

                  <h2 className="chapter-card-title">{ch.shortTitle}</h2>
                  <p className="chapter-card-sub">{ch.subtitle}</p>

                  <div className="chapter-subtopic-pills">
                    {ch.subtopics.map(st => (
                      <span key={st} className="chapter-pill">{st}</span>
                    ))}
                  </div>

                  <div className="chapter-card-footer">
                    <span className="mono-num chapter-qcount">{qCount} questions &middot; 1:00 each</span>
                    <span className="chapter-start-link" style={{ color: ch.accent }}>
                      Start Chapter <ObservatoryIcon name="arrow-right" size={15} />
                    </span>
                  </div>
                </Motion.article>
              )
            })}
          </div>
        </div>
      )}

      {/* ================================================================
          VIEW 2: FULL-SCREEN 1-MINUTE TIMED QUESTION ARENA
          ================================================================ */}
      {activeChapter && !finished && currentQuestion && (
        <div className="fullscreen-arena">
          {/* Top 60-Second Progress Bar */}
          <div className="arena-top-progress">
            <div
              className="arena-top-progress-fill"
              style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
            />
          </div>

          <header className="arena-header">
            <div className="arena-header-left">
              <button type="button" className="btn-ghost" onClick={exitToChapters}>
                <ObservatoryIcon name="arrow-left" size={15} />
                <span>Chapters</span>
              </button>
              <div className="arena-chapter-crumb">
                <strong>{activeChapter.shortTitle}</strong>
                <span>{currentQuestion.section}</span>
              </div>
            </div>

            <div className="arena-center-counter mono-num">
              Question <strong>{qIndex + 1}</strong> / {chapterQuestions.length}
            </div>

            <div className="arena-header-right">
              {streak > 0 && (
                <span className="arena-streak-pill mono-num">
                  <ObservatoryIcon name="flame" size={14} /> {streak}x
                </span>
              )}
              <span className="arena-score-pill mono-num">
                <ObservatoryIcon name="trophy" size={15} /> {score}
              </span>
              <button
                type="button"
                className="btn-ghost arena-pause-btn"
                onClick={() => { playSound('click'); setIsPaused(p => !p) }}
                aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
              >
                <ObservatoryIcon name={isPaused ? 'play' : 'pause'} size={15} />
              </button>
            </div>
          </header>

          {/* Centered Full-Screen Question Stage */}
          <main className="arena-stage-center">
            <AnimatePresence mode="wait">
              {status === 'timeout' ? (
                <Motion.div
                  key={`timeout_${currentQuestion.id}`}
                  className="arena-timeout-card obs-panel"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <span className="timeout-badge">Time&apos;s Up (1:00)</span>
                  <h2>Question Expired</h2>
                  <p className="timeout-answer-reveal">
                    Correct Answer: <strong className="mono-num">{currentQuestion.answer}</strong>
                  </p>
                  <p className="timeout-next-note">Loading next question automatically…</p>
                </Motion.div>
              ) : (
                <Motion.div
                  key={currentQuestion.id}
                  className="arena-question-card obs-panel"
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -18, scale: 0.97 }}
                  transition={{ duration: 0.28 }}
                >
                  {/* Countdown Ring + Section Badge */}
                  <div className="arena-q-top">
                    <span className="arena-section-pill">{currentQuestion.section}</span>

                    <div className={`arena-timer-cluster ${secondsLeft <= 10 ? 'is-urgent' : ''}`}>
                      <MasteryRing percent={timerPct} size={56} strokeWidth={5} color={timerColor}>
                        <span className="mono-num arena-timer-text" style={{ color: timerColor }}>
                          {formatSec(secondsLeft)}
                        </span>
                      </MasteryRing>
                    </div>
                  </div>

                  {/* Main Question Prompt */}
                  <h1 className="arena-prompt-text">{currentQuestion.prompt}</h1>

                  {currentQuestion.equation && (
                    <div className="arena-equation-banner mono-num">
                      {currentQuestion.equation}
                    </div>
                  )}

                  {currentQuestion.visual && (
                    <div className="arena-visual-wrap">
                      <MathsVisualDiagram visual={currentQuestion.visual} />
                    </div>
                  )}

                  {/* Answer Input Form */}
                  <form onSubmit={handleSubmit} className="arena-answer-form">
                    <div className="arena-input-box">
                      <span className="arena-unit-label mono-num">{currentQuestion.unit}</span>
                      <input
                        ref={inputRef}
                        type="text"
                        className="arena-answer-input mono-num"
                        value={userAnswer}
                        onChange={e => setUserAnswer(e.target.value)}
                        placeholder="Type your answer & press Enter…"
                        disabled={status !== 'active' || isPaused}
                        autoComplete="off"
                        autoFocus
                      />
                      {status === 'active' && (
                        <button
                          type="submit"
                          className="btn-tactile arena-submit-btn"
                          disabled={!userAnswer.trim() || isPaused}
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Scratchpad & Hint Controls */}
                  {status === 'active' && (
                    <div className="arena-tools-row">
                      <button
                        type="button"
                        className="arena-tool-link"
                        onClick={() => { playSound('click'); setShowScratchpad(v => !v) }}
                      >
                        {showScratchpad ? 'Hide Scratchpad' : '+ Working Scratchpad'}
                      </button>
                      {currentQuestion.hint && (
                        <button
                          type="button"
                          className="arena-tool-link is-gold"
                          onClick={() => { playSound('click'); setShowHint(true) }}
                        >
                          Method Clue
                        </button>
                      )}
                    </div>
                  )}

                  {showScratchpad && status === 'active' && (
                    <textarea
                      className="arena-scratchpad mono-num"
                      rows={3}
                      value={scratchpad}
                      onChange={e => setScratchpad(e.target.value)}
                      placeholder="Show your working steps here…"
                    />
                  )}

                  {showHint && status === 'active' && (
                    <div className="arena-hint-box">{currentQuestion.hint}</div>
                  )}

                  {/* Worked Solution Feedback */}
                  {(status === 'correct' || status === 'wrong') && (
                    <Motion.div
                      className={`arena-worked-panel is-${status}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="arena-worked-head">
                        <strong>
                          {status === 'correct'
                            ? 'Spotless! Correct Answer'
                            : `Not quite — Answer: ${currentQuestion.answer}`}
                        </strong>
                        <span className="mono-num">
                          Answered in {QUESTION_DURATION_SEC - secondsLeft}s
                        </span>
                      </div>
                      <ol className="arena-worked-steps">
                        {currentQuestion.workedSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                      <button
                        type="button"
                        className="btn-tactile arena-next-btn"
                        onClick={() => moveToNextQuestion()}
                        autoFocus
                      >
                        <span>
                          {qIndex + 1 < chapterQuestions.length ? 'Next Question' : 'View Chapter Report'}
                        </span>
                        <ObservatoryIcon name="arrow-right" size={17} />
                      </button>
                    </Motion.div>
                  )}
                </Motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Pause Overlay */}
          {isPaused && (
            <div className="arena-pause-overlay">
              <div className="arena-pause-modal obs-panel">
                <h2>Timer Paused</h2>
                <p className="mono-num">{formatSec(secondsLeft)} left on Question {qIndex + 1}</p>
                <div className="arena-pause-actions">
                  <button type="button" className="btn-tactile" onClick={() => setIsPaused(false)}>
                    <ObservatoryIcon name="play" size={16} /> Resume
                  </button>
                  <button type="button" className="btn-ghost" onClick={exitToChapters}>
                    Exit Chapter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          VIEW 3: CHAPTER DEBRIEF
          ================================================================ */}
      {activeChapter && finished && (
        <div className="maths-lobby-shell">
          <Motion.section
            className="chapter-debrief obs-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="maths-eyebrow">{activeChapter.title} &middot; Complete</span>
            <MasteryRing percent={accuracy} size={126} strokeWidth={8} color={activeChapter.accent}>
              <strong className="mono-num" style={{ fontSize: '1.75rem' }}>{accuracy}%</strong>
            </MasteryRing>
            <h1>
              {accuracy >= 85 ? 'Common Entrance Distinction!'
                : accuracy >= 65 ? 'Strong Chapter Progress'
                : 'Review the Worked Methods & Retry'}
            </h1>
            <p className="debrief-meta mono-num">
              {correctCount} / {chapterQuestions.length} correct &middot; {timeoutCount} timed out &middot; {score} pts
            </p>

            {/* Review Missed & Timed-Out Questions */}
            {resultsLog.some(r => r.outcome !== 'correct') && (
              <div className="debrief-review-list">
                <h3>Questions to Review</h3>
                {resultsLog.filter(r => r.outcome !== 'correct').map((item, i) => (
                  <div key={item.question.id} className="debrief-review-item">
                    <span className="mono-num debrief-idx">0{i + 1}</span>
                    <div className="debrief-review-body">
                      <div className="debrief-q">{item.question.prompt}</div>
                      <div className="debrief-ans">
                        Answer: <strong className="mono-num">{item.question.answer}</strong>
                        <span className="debrief-tag">
                          {item.outcome === 'timeout' ? 'Timed out (1:00)' : `You entered: ${item.given}`}
                        </span>
                      </div>
                      <div className="debrief-method">{item.question.workedSteps.join(' → ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="debrief-actions">
              <button type="button" className="btn-tactile" onClick={() => startChapter(activeChapter.id)}>
                <ObservatoryIcon name="play" size={16} /> Replay Chapter
              </button>
              <button type="button" className="btn-ghost" onClick={exitToChapters}>
                <ObservatoryIcon name="arrow-left" size={16} /> All Chapters
              </button>
            </div>
          </Motion.section>
        </div>
      )}
    </div>
  )
}

export default MathsForgePage
