import { useEffect, useMemo, useRef, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { chemistryApi, learnerApi } from '../utils/api'
import './ChemistryPage.css'

function readLearner() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function ChemistryVisual({ type = 'reaction' }) {
  if (type === 'particles' || type === 'diffusion' || type === 'pressure' || type === 'state-change' || type === 'curve') {
    return (
      <div className={`chem-visual particle-visual ${type}`} aria-hidden="true">
        <div className="particle-box solid-box">
          {[...Array(12)].map((_, index) => <i key={index} />)}
        </div>
        <div className="particle-arrow">-&gt;</div>
        <div className="particle-box gas-box">
          {[...Array(7)].map((_, index) => <i key={index} />)}
        </div>
      </div>
    )
  }

  if (type === 'atom' || type === 'molecules') {
    return (
      <div className="chem-visual atom-visual" aria-hidden="true">
        <div className="atom-orbit orbit-one"><i /></div>
        <div className="atom-orbit orbit-two"><i /></div>
        <div className="atom-nucleus"><span>p+</span><span>n</span></div>
      </div>
    )
  }

  if (type === 'ph' || type === 'neutralise') {
    return (
      <div className="chem-visual ph-visual" aria-hidden="true">
        <div className="ph-drops"><span>H+</span><span>7</span><span>OH-</span></div>
        <div className="ph-bar">{[0, 2, 4, 6, 8, 10, 12, 14].map(value => <i key={value} />)}</div>
        <div className="ph-labels"><span>acid</span><span>neutral</span><span>alkali</span></div>
      </div>
    )
  }

  if (type === 'earth' || type === 'rocks' || type === 'resources' || type === 'atmosphere' || type === 'carbon') {
    return (
      <div className={`chem-visual earth-visual ${type}`} aria-hidden="true">
        <div className="earth-shell shell-one"><div className="earth-shell shell-two"><div className="earth-core" /></div></div>
        <div className="earth-caption">Crust&nbsp;&nbsp; Mantle&nbsp;&nbsp; Core</div>
      </div>
    )
  }

  return (
    <div className={`chem-visual formula-visual ${type}`} aria-hidden="true">
      <span className="formula-tile">H<sub>2</sub>O</span>
      <span className="formula-operator">+</span>
      <span className="formula-tile accent">CO<sub>2</sub></span>
      <span className="formula-arrow">-&gt;</span>
      <span className="formula-tile warm">NaCl</span>
    </div>
  )
}

function ChemistryPage() {
  const navigate = useNavigate()
  const learner = readLearner()
  const [catalog, setCatalog] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [earnings, setEarnings] = useState(null)
  const [view, setView] = useState('chapters')
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const markingRef = useRef(false)
  const questionStartedAtRef = useRef(Date.now())

  const loadProgress = async () => {
    if (!learner?.id) return
    const [nextProgress, nextEarnings] = await Promise.all([
      chemistryApi.getProgress(learner.id),
      learnerApi.getEarnings(learner.id)
    ])
    setProgressData(nextProgress)
    setEarnings(nextEarnings)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [nextCatalog, nextProgress, nextEarnings] = await Promise.all([
          chemistryApi.getLessons(),
          chemistryApi.getProgress(learner.id),
          learnerApi.getEarnings(learner.id)
        ])
        if (!cancelled) {
          setCatalog(nextCatalog)
          setProgressData(nextProgress)
          setEarnings(nextEarnings)
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Chemistry Academy could not be loaded.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (learner?.id) load()
    else setIsLoading(false)
    return () => {
      cancelled = true
    }
  }, [learner?.id])

  const lessonsBySection = useMemo(() => {
    if (!catalog) return []
    return catalog.sections.map(section => ({
      section,
      lessons: catalog.lessons.filter(item => item.section === section)
    }))
  }, [catalog])

  const unlockedIds = new Set(progressData?.unlockedLessonIds || [])

  const openLesson = lesson => {
    if (!unlockedIds.has(lesson.id)) return
    setSelectedLesson(lesson)
    setResults(null)
    setError('')
    setView('study')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const returnToNotes = () => {
    setView('study')
  }

  const startCheck = async () => {
    if (!selectedLesson || isStarting) return
    setIsStarting(true)
    setError('')
    try {
      const nextAttempt = await chemistryApi.startAttempt(learner.id, selectedLesson.id)
      setAttempt(nextAttempt)
      setQuestionIndex(0)
      setAnswer('')
      setFeedback(null)
      setResults(null)
      questionStartedAtRef.current = Date.now()
      setView('quiz')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (startError) {
      setError(startError.message || 'A fresh chapter check could not be created.')
    } finally {
      setIsStarting(false)
    }
  }

  const finishAttempt = async () => {
    try {
      const completed = await chemistryApi.completeAttempt(attempt.attemptId)
      setResults(completed)
      setView('results')
      await loadProgress()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (completeError) {
      setError(completeError.message || 'The chapter result could not be saved.')
    }
  }

  const moveNext = async () => {
    if (questionIndex >= attempt.questions.length - 1) {
      await finishAttempt()
      return
    }
    setQuestionIndex(current => current + 1)
    setAnswer('')
    setFeedback(null)
    questionStartedAtRef.current = Date.now()
  }

  const submitAnswer = async () => {
    if (!answer.trim() || markingRef.current || feedback) return
    markingRef.current = true
    setIsMarking(true)
    setError('')
    try {
      const marked = await chemistryApi.submitAnswer(attempt.attemptId, {
        questionIndex,
        answer: answer.trim(),
        timeTakenMs: Date.now() - questionStartedAtRef.current
      })
      setFeedback(marked)
    } catch (markError) {
      setError(markError.message || 'Your answer could not be marked. Please try again.')
    } finally {
      markingRef.current = false
      setIsMarking(false)
    }
  }

  if (isLoading) {
    return <div className="chemistry-page chemistry-loading"><div className="chemistry-spinner" /><p>Preparing the lab...</p></div>
  }

  if (!learner?.id || (!catalog && error)) {
    return (
      <div className="chemistry-page chemistry-loading">
        <div className="chemistry-error-panel">
          <h1>Chemistry Academy</h1>
          <p>{error || 'Please sign in again to continue.'}</p>
          <button onClick={() => navigate('/')}>Return home</button>
        </div>
      </div>
    )
  }

  const currentQuestion = attempt?.questions?.[questionIndex]
  const completionPercent = progressData?.totalLessons
    ? Math.round((progressData.passedCount / progressData.totalLessons) * 100)
    : 0

  return (
    <div className="chemistry-page">
      <header className="chemistry-topbar">
        <button className="chem-icon-button" onClick={() => navigate('/')} title="Home" aria-label="Home">&larr;</button>
        <div className="chemistry-brand">
          <span className="chemistry-brand-mark">C</span>
          <div><strong>Chemistry Academy</strong><small>KS3 learning path</small></div>
        </div>
        <div className="chemistry-wallet">
          <span>Balance</span>
          <strong>KSh {(earnings?.unpaidTotal || 0).toFixed(2)}</strong>
        </div>
      </header>

      {view === 'chapters' && (
        <main className="chemistry-shell">
          <section className="chemistry-hero">
            <div className="chemistry-hero-copy">
              <span className="chemistry-eyebrow">Workbook journey</span>
              <h1>Master chemistry, one chapter at a time.</h1>
              <p>Study the notes, strengthen each idea with spaced review, and score at least {catalog.passPercent}% to unlock what comes next.</p>
              <div className="chemistry-hero-badges">
                <span>{catalog.lessons.length} chapters</span>
                <span>KSh 20 per focus block</span>
                <span>{progressData?.reviewDueCount || 0} cards due now</span>
              </div>
            </div>
            <ChemistryVisual type="particles" />
          </section>

          <section className="chemistry-progress-band">
            <div><strong>{progressData?.passedCount || 0} of {progressData?.totalLessons || 0}</strong><span>chapters mastered</span></div>
            <div className="chemistry-progress-track"><i style={{ width: `${completionPercent}%` }} /></div>
            <strong>{completionPercent}%</strong>
          </section>

          {error && <div className="chemistry-inline-error">{error}</div>}

          <div className="chemistry-sections">
            {lessonsBySection.map((group, sectionIndex) => (
              <section className="chemistry-section" key={group.section}>
                <div className="chemistry-section-heading">
                  <span>{String(sectionIndex + 1).padStart(2, '0')}</span>
                  <div><h2>{group.section}</h2><p>{group.lessons.length} chapters</p></div>
                </div>
                <div className="chemistry-chapter-grid">
                  {group.lessons.map(item => {
                    const itemProgress = progressData?.progress?.[item.id]
                    const unlocked = unlockedIds.has(item.id)
                    return (
                      <Motion.button
                        key={item.id}
                        className={`chemistry-chapter-card ${itemProgress?.passed ? 'passed' : ''} ${!unlocked ? 'locked' : ''}`}
                        onClick={() => openLesson(item)}
                        disabled={!unlocked}
                        whileHover={unlocked ? { y: -3 } : {}}
                        whileTap={unlocked ? { scale: 0.98 } : {}}
                      >
                        <span className="chapter-number">{String(item.order).padStart(2, '0')}</span>
                        <span className="chapter-status">{itemProgress?.passed ? 'Passed' : unlocked ? 'Open' : 'Locked'}</span>
                        <strong>{item.title}</strong>
                        <small>Workbook page {item.page}</small>
                        {itemProgress?.attemptsCount > 0 && <em>Best {Math.round(itemProgress.bestScore)}%</em>}
                      </Motion.button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>
      )}

      {view === 'study' && selectedLesson && (
        <main className="chemistry-shell lesson-shell">
          <div className="lesson-actions-top">
            <button onClick={() => setView('chapters')}>&larr; Chapters</button>
            <span>Chapter {selectedLesson.order} of {catalog.lessons.length}</span>
          </div>

          <section className="lesson-title-band">
            <div>
              <span className="chemistry-eyebrow">{selectedLesson.section} / workbook p. {selectedLesson.page}</span>
              <h1>{selectedLesson.title}</h1>
              <p>{selectedLesson.summary}</p>
            </div>
            <ChemistryVisual type={selectedLesson.visual} />
          </section>

          <section className="chemistry-notes">
            <div className="notes-header">
              <div><span>Study notes</span><h2>Build the picture first</h2></div>
              <span className="no-copy-label">Spaced review</span>
            </div>
            <div className="notes-list">
              {selectedLesson.notes.map((note, index) => (
                <article key={note}>
                  <span>{index + 1}</span>
                  <p>{note}</p>
                </article>
              ))}
            </div>
            <div className="key-terms">
              <strong>Key terms</strong>
              <div>{selectedLesson.keyTerms.map(term => <span key={term}>{term}</span>)}</div>
            </div>
            <p className="chemistry-source-note">
              Lesson reference: The Science Doctor KS3 Science Workbook by Dr Peter Edmunds, page {selectedLesson.page}.
            </p>
          </section>

          {error && <div className="chemistry-inline-error">{error}</div>}

          <section className="ready-band">
            <div><span>Ready?</span><strong>Review 5-7 cards and reach {catalog.passPercent}% to pass this chapter.</strong></div>
            <button onClick={startCheck} disabled={isStarting}>{isStarting ? 'Building a fresh review...' : 'Start spaced review'}</button>
          </section>
        </main>
      )}

      {view === 'quiz' && selectedLesson && currentQuestion && (
        <main className="chemistry-shell quiz-shell">
          <section className="quiz-status-row">
            <button onClick={returnToNotes} disabled={isMarking}>&larr; Notes</button>
            <div className="quiz-dots">
              {attempt.questions.map((_, index) => (
                <i key={index} className={index < questionIndex ? 'done' : index === questionIndex ? 'current' : ''} />
              ))}
            </div>
            <div className="quiz-earnings"><span>Review</span><strong>{questionIndex + 1} / {attempt.questions.length}</strong></div>
          </section>

          <section className="chemistry-question-panel">
            <div className="question-kicker">
              <span>Question {questionIndex + 1} / {attempt.questions.length}</span>
              <span>Spaced review</span>
            </div>
            <h1>{currentQuestion.question}</h1>
            <p className="answer-instruction">Recall the idea first, then choose the best statement.</p>
            <div className="chemistry-answer-options">
              {currentQuestion.choices.map((choice, index) => (
                <button
                  type="button"
                  key={choice}
                  className={answer === choice ? 'selected' : ''}
                  onClick={() => setAnswer(choice)}
                  disabled={isMarking || Boolean(feedback)}
                  aria-pressed={answer === choice}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{choice}</strong>
                </button>
              ))}
            </div>
            <div className="answer-footer">
              <span>{answer ? 'Answer selected' : 'Choose one answer'}</span>
              <button onClick={submitAnswer} disabled={!answer.trim() || isMarking || Boolean(feedback)}>
                {isMarking ? 'Checking recall...' : 'Check answer'}
              </button>
            </div>
          </section>

          {error && <div className="chemistry-inline-error">{error}</div>}

          {feedback && (
            <Motion.section
              className={`chemistry-feedback ${feedback.correct ? 'correct' : 'wrong'}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="feedback-mark">{feedback.correct ? 'Remembered' : 'Review'}</div>
              <div>
                <strong>{feedback.correct ? 'Correct.' : 'Not quite yet.'}</strong>
                <p>{feedback.feedback}</p>
              </div>
              <button onClick={moveNext}>Next question &rarr;</button>
            </Motion.section>
          )}
        </main>
      )}

      {view === 'results' && selectedLesson && results && (
        <main className="chemistry-shell result-shell">
          <Motion.section
            className={`chemistry-result ${results.passed ? 'passed' : 'failed'}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="result-label">{results.passed ? 'Chapter passed' : 'Chapter locked'}</span>
            <h1>{results.scorePercent}%</h1>
            <h2>{selectedLesson.title}</h2>
            <p>{results.passed
              ? 'Strong work. The next chapter is now open.'
              : `You need at least ${results.passPercent}% to advance. Return to the notes, rebuild the idea, and try a fresh check.`}</p>
            <div className="result-stats">
              <div><strong>{results.correct}/{results.total}</strong><span>correct</span></div>
              <div><strong>{progressData?.reviewDueCount || 0}</strong><span>cards due now</span></div>
              <div><strong>KSh 20</strong><span>per focus block</span></div>
            </div>
            <div className="result-actions">
              {!results.passed && <button className="primary" onClick={returnToNotes}>Review the notes</button>}
              {results.passed && results.nextLessonId && (
                <button
                  className="primary"
                  onClick={() => openLesson(catalog.lessons.find(item => item.id === results.nextLessonId))}
                >
                  Open next chapter
                </button>
              )}
              <button onClick={() => setView('chapters')}>Chapter map</button>
            </div>
          </Motion.section>
        </main>
      )}
    </div>
  )
}

export default ChemistryPage
