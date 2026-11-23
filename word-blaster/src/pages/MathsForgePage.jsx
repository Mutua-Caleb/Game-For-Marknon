import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { FEATURE_FLAGS, recordDailyQuestAnswer } from '../data/curriculum'
import { MATHS_STRANDS, YEAR7_MATHS_CHALLENGES } from '../data/year7MathsData'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import { MathsVisualDiagram } from '../components/MathsVisualModels'
import './MathsForgePage.css'

function getTrackingId() {
  return localStorage.getItem('learnerId') || 'guest'
}

function normalizeMathAnswer(val) {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/[£°\s]/g, '')
}

function MathsForgePage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const trackingId = getTrackingId()

  const [strand, setStrand] = useState('all')
  const [idx, setIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [scratchpad, setScratchpad] = useState('')
  const [showScratchpad, setShowScratchpad] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [checked, setChecked] = useState(null) // 'correct' | 'wrong' | null
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [finished, setFinished] = useState(false)

  const pool = useMemo(() => {
    if (strand === 'all') return YEAR7_MATHS_CHALLENGES
    return YEAR7_MATHS_CHALLENGES.filter(c => c.strand === strand)
  }, [strand])

  const current = pool[idx] || null

  const resetSet = (nextStrand = strand) => {
    setStrand(nextStrand)
    setIdx(0)
    setUserAnswer('')
    setScratchpad('')
    setShowHint(false)
    setChecked(null)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFinished(false)
  }

  const handleCheck = (e) => {
    e.preventDefault()
    if (!current || !userAnswer.trim() || checked) return

    const isRight = normalizeMathAnswer(userAnswer) === normalizeMathAnswer(current.answer)
    setChecked(isRight ? 'correct' : 'wrong')

    if (isRight) {
      const nextStreak = streak + 1
      playSound('correct', { streak })
      if (nextStreak === 3 || nextStreak === 6) playSound('streak')
      setStreak(nextStreak)
      setCorrectCount(c => c + 1)
      setScore(s => s + 100 + nextStreak * 15)
      recordDailyQuestAnswer(trackingId, 'Maths')
    } else {
      playSound('wrong')
      setStreak(0)
    }
  }

  const handleNext = () => {
    playSound('click')
    if (idx + 1 < pool.length) {
      setIdx(i => i + 1)
      setUserAnswer('')
      setScratchpad('')
      setShowHint(false)
      setChecked(null)
    } else {
      playSound('focusBlockComplete')
      setFinished(true)
    }
  }

  const accuracy = pool.length > 0 ? Math.round((correctCount / pool.length) * 100) : 0

  return (
    <div className="maths-forge-page" data-realm="maths">
      <AmbientBackdrop realm="maths" />

      <div className="maths-shell">
        {/* Top Bar */}
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
              <RealmCrest realmId="maths" size={24} />
              <div>
                <strong>Year 7 Maths Forge</strong>
                <span>British KS3 Visual Models &middot; Step-by-Step Worked Solutions</span>
              </div>
            </div>
          </div>

          <div className="maths-hud-right">
            {FEATURE_FLAGS.showSoroMathWarmup && (
              <button
                type="button"
                className="btn-ghost soro-link-btn"
                onClick={() => { playSound('click'); navigate('/math') }}
              >
                <ObservatoryIcon name="bolt" size={15} />
                <span>Speed Warm-Up</span>
              </button>
            )}
            <span className="maths-score-pill mono-num">
              <ObservatoryIcon name="trophy" size={15} />
              {score}
            </span>
          </div>
        </header>

        {/* Strand Switcher */}
        <nav className="maths-strand-bar" aria-label="Year 7 Maths Strands">
          {MATHS_STRANDS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`strand-tab ${strand === s.id ? 'is-active' : ''}`}
              onClick={() => { playSound('click'); resetSet(s.id) }}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Active Challenge Stage */}
        {!finished && current ? (
          <Motion.section
            key={current.id}
            className="maths-stage obs-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="maths-stage-head">
              <span className="maths-step mono-num">
                Challenge {idx + 1} / {pool.length}
              </span>
              <span className="maths-strand-pill">{current.strandLabel}</span>
            </div>

            <div className="maths-progress-track">
              <div
                className="maths-progress-fill"
                style={{ width: `${((idx + (checked ? 1 : 0)) / pool.length) * 100}%` }}
              />
            </div>

            <div className="maths-split-grid">
              {/* Left: Visual Diagram & Problem */}
              <div className="maths-problem-col">
                <h1 className="maths-challenge-title">{current.title}</h1>
                <p className="maths-prompt">{current.prompt}</p>

                <div className="maths-visual-frame">
                  <div className="maths-equation-pill mono-num">{current.equation}</div>
                  <MathsVisualDiagram visual={current.visual} />
                </div>
              </div>

              {/* Right: Answer + Scratchpad + Worked Steps */}
              <div className="maths-work-col">
                <form onSubmit={handleCheck} className="maths-answer-form">
                  <label htmlFor="maths-answer-input" className="maths-input-label">
                    Your Final Answer
                  </label>
                  <div className="maths-input-row">
                    <span className="maths-unit-prefix mono-num">{current.unit}</span>
                    <input
                      id="maths-answer-input"
                      type="text"
                      className="maths-answer-input mono-num"
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      placeholder="Enter number..."
                      disabled={Boolean(checked)}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>

                  {!checked && (
                    <button
                      type="submit"
                      className="btn-tactile maths-submit-btn"
                      disabled={!userAnswer.trim()}
                    >
                      Check Solution
                    </button>
                  )}
                </form>

                {/* Built-in Working Scratchpad Toggle */}
                <div className="scratchpad-wrap">
                  <div className="scratchpad-head">
                    <button
                      type="button"
                      className="scratchpad-toggle"
                      onClick={() => { playSound('click'); setShowScratchpad(v => !v) }}
                    >
                      {showScratchpad ? 'Hide Working Scratchpad' : '+ Open Working Scratchpad'}
                    </button>
                    {!checked && (
                      <button
                        type="button"
                        className="maths-hint-trigger"
                        onClick={() => { playSound('click'); setShowHint(true) }}
                      >
                        Method Hint
                      </button>
                    )}
                  </div>

                  {showScratchpad && (
                    <textarea
                      className="scratchpad-box mono-num"
                      rows={4}
                      value={scratchpad}
                      onChange={e => setScratchpad(e.target.value)}
                      placeholder="Jot your working steps here (e.g. 3x = 28 - 7 = 21)..."
                    />
                  )}

                  {showHint && !checked && (
                    <div className="maths-hint-box">{current.hint}</div>
                  )}
                </div>

                {/* Step-by-Step Worked Method on Check */}
                {checked && (
                  <Motion.div
                    className={`worked-solution-card is-${checked}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="worked-head">
                      <strong>
                        {checked === 'correct'
                          ? 'Spotless Maths!'
                          : `Correct Answer: ${current.answer}`}
                      </strong>
                      {streak >= 2 && checked === 'correct' && (
                        <span className="maths-streak-tag mono-num">{streak}x Streak</span>
                      )}
                    </div>

                    <ol className="worked-steps-list">
                      {current.workedSteps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>

                    <button
                      type="button"
                      className="btn-tactile maths-next-btn"
                      onClick={handleNext}
                    >
                      <span>{idx + 1 < pool.length ? 'Next Challenge' : 'Finish Strand'}</span>
                      <ObservatoryIcon name="arrow-right" size={17} />
                    </button>
                  </Motion.div>
                )}
              </div>
            </div>
          </Motion.section>
        ) : (
          <Motion.section
            className="maths-summary obs-panel"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="maths-summary-eyebrow">Year 7 Maths Forge Complete</span>
            <MasteryRing percent={accuracy} size={120} strokeWidth={8} color="#f59e0b">
              <strong className="mono-num" style={{ fontSize: '1.65rem' }}>{accuracy}%</strong>
            </MasteryRing>
            <h1>
              {accuracy >= 85 ? 'Mastery Forged — KS3 Extension Ready!'
                : accuracy >= 60 ? 'Solid Year 7 Foundation Built'
                : 'Review the Worked Steps & Forge Again'}
            </h1>
            <p className="maths-summary-meta mono-num">
              {correctCount} / {pool.length} solved &middot; {score} points earned
            </p>
            <div className="maths-summary-actions">
              <button type="button" className="btn-tactile" onClick={() => resetSet(strand)}>
                <ObservatoryIcon name="play" size={16} />
                <span>Practice Again</span>
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
                <ObservatoryIcon name="arrow-left" size={16} />
                <span>Command Center</span>
              </button>
            </div>
          </Motion.section>
        )}
      </div>
    </div>
  )
}

export default MathsForgePage
