import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { recordDailyQuestAnswer } from '../data/curriculum'
import {
  CAT4_BATTERIES,
  CAT4_PUZZLES,
  computeUnfoldedHoles
} from '../data/cat4Puzzles'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import {
  MatrixShapeTile,
  PaperFoldSequence,
  UnfoldedSheetSvg
} from '../components/Cat4SvgRenderer'
import './Cat4LabPage.css'

const EXAM_PACE_SECONDS = 35

function getLearnerTrackingId() {
  return localStorage.getItem('learnerId') || 'guest'
}

function Cat4LabPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const trackingId = getLearnerTrackingId()

  const [battery, setBattery] = useState('all')
  const [examMode, setExamMode] = useState(false)
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [checked, setChecked] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [finished, setFinished] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(EXAM_PACE_SECONDS)

  const puzzlePool = useMemo(() => {
    if (battery === 'all') return CAT4_PUZZLES
    return CAT4_PUZZLES.filter(p => p.battery === battery)
  }, [battery])

  const currentPuzzle = puzzlePool[puzzleIndex] || null

  const resetRun = useCallback((nextBattery = battery) => {
    setBattery(nextBattery)
    setPuzzleIndex(0)
    setSelectedId(null)
    setChecked(false)
    setShowHint(false)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFinished(false)
    setSecondsLeft(EXAM_PACE_SECONDS)
  }, [battery])

  const handleSubmitChoice = useCallback((choiceId) => {
    if (!currentPuzzle || checked) return
    const chosen = choiceId ?? selectedId
    if (!chosen) return

    setSelectedId(chosen)
    setChecked(true)

    const isCorrect = chosen === currentPuzzle.correctOptionId
    if (isCorrect) {
      const nextStreak = streak + 1
      playSound('correct', { streak })
      if (nextStreak === 4 || nextStreak === 8) playSound('streak')
      setStreak(nextStreak)
      setCorrectCount(c => c + 1)
      const paceBonus = examMode ? Math.max(10, secondsLeft * 2) : 0
      setScore(s => s + 100 + paceBonus)
      recordDailyQuestAnswer(trackingId, 'CAT4')
    } else {
      playSound('wrong')
      setStreak(0)
    }
  }, [currentPuzzle, checked, selectedId, streak, playSound, examMode, secondsLeft, trackingId])

  // Exam pace countdown timer
  useEffect(() => {
    if (!examMode || checked || finished || !currentPuzzle) return undefined
    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer)
          setChecked(true)
          setStreak(0)
          playSound('wrong')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [examMode, checked, finished, currentPuzzle, playSound])

  const handleNext = () => {
    playSound('click')
    if (puzzleIndex + 1 < puzzlePool.length) {
      setPuzzleIndex(i => i + 1)
      setSelectedId(null)
      setChecked(false)
      setShowHint(false)
      setSecondsLeft(EXAM_PACE_SECONDS)
    } else {
      playSound('focusBlockComplete')
      setFinished(true)
    }
  }

  const isCorrectAnswer = checked && selectedId === currentPuzzle?.correctOptionId
  const accuracy = puzzlePool.length > 0 ? Math.round((correctCount / puzzlePool.length) * 100) : 0

  return (
    <div className="cat4-lab-page" data-realm="cat4">
      <AmbientBackdrop realm="cat4" />

      <div className="cat4-shell">
        {/* Top Bar */}
        <header className="cat4-topbar">
          <div className="cat4-topbar-left">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { playSound('click'); navigate('/') }}
            >
              <ObservatoryIcon name="arrow-left" size={16} />
              <span>Command Center</span>
            </button>

            <div className="cat4-brand">
              <RealmCrest realmId="cat4" size={24} />
              <div>
                <strong>CAT4 Visual Reasoning Lab</strong>
                <span>GL Assessment Levels C–D · Year 6 &amp; Year 7</span>
              </div>
            </div>
          </div>

          <div className="cat4-hud-right">
            <button
              type="button"
              className={`pace-mode-toggle ${examMode ? 'is-exam' : ''}`}
              onClick={() => {
                playSound('click')
                setExamMode(m => !m)
                setSecondsLeft(EXAM_PACE_SECONDS)
              }}
              title="Toggle between untimed Deep Logic and timed CAT4 Exam Pace"
            >
              <ObservatoryIcon name="bolt" size={15} />
              <span>{examMode ? 'Exam Pace (35s)' : 'Deep Logic (Untimed)'}</span>
            </button>

            <span className="cat4-score-pill mono-num">
              <ObservatoryIcon name="trophy" size={15} />
              {score}
            </span>
          </div>
        </header>

        {/* Battery Switcher Tabs */}
        <nav className="cat4-battery-bar" aria-label="CAT4 Reasoning Battery">
          {CAT4_BATTERIES.map(b => (
            <button
              key={b.id}
              type="button"
              className={`battery-tab ${battery === b.id ? 'is-active' : ''}`}
              onClick={() => {
                playSound('click')
                resetRun(b.id)
              }}
            >
              {b.label}
            </button>
          ))}
        </nav>

        {/* Main Stage */}
        {!finished && currentPuzzle ? (
          <Motion.section
            key={currentPuzzle.id}
            className="cat4-stage obs-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Progress & Meta Header */}
            <div className="cat4-stage-head">
              <div className="cat4-stage-badges">
                <span className="cat4-step-pill mono-num">
                  Puzzle {puzzleIndex + 1} / {puzzlePool.length}
                </span>
                <span className="cat4-subtype-pill">{currentPuzzle.subtype}</span>
              </div>

              {examMode && (
                <div className={`cat4-timer mono-num ${secondsLeft <= 10 ? 'is-urgent' : ''}`}>
                  {secondsLeft}s
                </div>
              )}
            </div>

            <div className="cat4-progress-track">
              <div
                className="cat4-progress-fill"
                style={{ width: `${((puzzleIndex + (checked ? 1 : 0)) / puzzlePool.length) * 100}%` }}
              />
            </div>

            <h1 className="cat4-prompt">{currentPuzzle.prompt}</h1>

            {/* VISUAL STIMULUS AREA */}
            <div className="cat4-stimulus-box">
              {/* 1. Non-Verbal 3x3 Matrix */}
              {currentPuzzle.battery === 'non-verbal' && (
                <div className="cat4-matrix-grid">
                  {currentPuzzle.matrix.map((cell, idx) => (
                    <div key={idx} className={`cat4-matrix-cell ${!cell ? 'is-missing' : ''}`}>
                      {cell ? (
                        <MatrixShapeTile spec={cell} size={74} />
                      ) : checked ? (
                        <MatrixShapeTile
                          spec={currentPuzzle.options.find(o => o.id === currentPuzzle.correctOptionId)?.spec}
                          size={74}
                        />
                      ) : (
                        <span className="missing-qmark mono-num">?</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Spatial Paper Folding */}
              {currentPuzzle.battery === 'spatial' && (
                <div className="spatial-stage">
                  <PaperFoldSequence
                    folds={currentPuzzle.folds}
                    punches={currentPuzzle.punches}
                  />
                  {checked && (
                    <Motion.div
                      className="unfold-reveal-card"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <span className="unfold-reveal-label">Unfolded Symmetry Reveal</span>
                      <UnfoldedSheetSvg
                        holes={computeUnfoldedHoles(currentPuzzle.folds, currentPuzzle.punches)}
                        folds={currentPuzzle.folds}
                        showCreases
                        highlight
                        size={112}
                      />
                    </Motion.div>
                  )}
                </div>
              )}

              {/* 3. Quantitative Reasoning */}
              {currentPuzzle.battery === 'quantitative' && currentPuzzle.pairs && (
                <div className="quant-pairs-row">
                  {currentPuzzle.pairs.map(([left, right], i) => (
                    <div key={i} className="quant-pair-chip mono-num">
                      <span>{left}</span>
                      <ObservatoryIcon name="arrow-right" size={16} />
                      <strong className={right === '?' ? 'is-target' : ''}>{right}</strong>
                    </div>
                  ))}
                </div>
              )}

              {currentPuzzle.battery === 'quantitative' && currentPuzzle.series && (
                <div className="quant-series-row mono-num">
                  {currentPuzzle.series.map((num, i) => (
                    <div key={i} className={`series-tile ${num === '?' ? 'is-target' : ''}`}>
                      {num}
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Verbal Reasoning */}
              {currentPuzzle.battery === 'verbal' && currentPuzzle.groupWords && (
                <div className="verbal-group-row">
                  {currentPuzzle.groupWords.map(word => (
                    <span key={word} className="verbal-word-chip">{word}</span>
                  ))}
                  <span className="verbal-word-chip is-target">?</span>
                </div>
              )}

              {currentPuzzle.battery === 'verbal' && currentPuzzle.analogy && (
                <div className="verbal-analogy-bridge">
                  <div className="analogy-pair">
                    <span>{currentPuzzle.analogy.a}</span>
                    <em>is to</em>
                    <strong>{currentPuzzle.analogy.b}</strong>
                  </div>
                  <span className="analogy-colon">::</span>
                  <div className="analogy-pair">
                    <span>{currentPuzzle.analogy.c}</span>
                    <em>is to</em>
                    <strong className="is-target">{currentPuzzle.analogy.d}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 5-CHOICE CAT4 OPTIONS (A–E) */}
            <div className={`cat4-options-grid ${currentPuzzle.battery === 'non-verbal' || currentPuzzle.battery === 'spatial' ? 'is-visual' : 'is-text'}`}>
              {currentPuzzle.options.map(opt => {
                const isSelected = selectedId === opt.id
                const isRight = checked && opt.id === currentPuzzle.correctOptionId
                const isWrong = checked && isSelected && opt.id !== currentPuzzle.correctOptionId
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`cat4-option-tile ${isSelected ? 'is-selected' : ''} ${isRight ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
                    disabled={checked}
                    onClick={() => {
                      playSound('click')
                      setSelectedId(opt.id)
                    }}
                  >
                    <span className="cat4-opt-letter mono-num">{opt.id}</span>
                    {currentPuzzle.battery === 'non-verbal' && (
                      <MatrixShapeTile spec={opt.spec} size={66} />
                    )}
                    {currentPuzzle.battery === 'spatial' && (
                      <UnfoldedSheetSvg holes={opt.holes} size={76} />
                    )}
                    {(currentPuzzle.battery === 'quantitative' || currentPuzzle.battery === 'verbal') && (
                      <span className="cat4-opt-text">{opt.label}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Optional Hint */}
            {!checked && currentPuzzle.hint && (
              <div className="cat4-hint-area">
                {!showHint ? (
                  <button
                    type="button"
                    className="cat4-hint-btn"
                    onClick={() => { playSound('click'); setShowHint(true) }}
                  >
                    Need a pattern clue?
                  </button>
                ) : (
                  <div className="cat4-hint-box">{currentPuzzle.hint}</div>
                )}
              </div>
            )}

            {/* Rule Explanation on Check */}
            {checked && (
              <Motion.div
                className={`cat4-explanation-card ${isCorrectAnswer ? 'is-correct' : 'is-wrong'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="cat4-exp-head">
                  <strong>
                    {isCorrectAnswer
                      ? 'Spot On! Pattern Decoded'
                      : `Correct Answer: Option ${currentPuzzle.correctOptionId}`}
                  </strong>
                  {streak >= 2 && isCorrectAnswer && (
                    <span className="cat4-streak-tag mono-num">{streak}x Logic Streak</span>
                  )}
                </div>
                <p>{currentPuzzle.explanation}</p>
              </Motion.div>
            )}

            {/* Action Bar */}
            <div className="cat4-action-row">
              {!checked ? (
                <button
                  type="button"
                  className="btn-tactile"
                  disabled={!selectedId}
                  onClick={() => handleSubmitChoice(selectedId)}
                >
                  Lock In Answer
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-tactile"
                  onClick={handleNext}
                >
                  <span>
                    {puzzleIndex + 1 < puzzlePool.length ? 'Next Puzzle' : 'View Battery Report'}
                  </span>
                  <ObservatoryIcon name="arrow-right" size={17} />
                </button>
              )}
            </div>
          </Motion.section>
        ) : (
          /* End of Battery Summary */
          <Motion.section
            className="cat4-summary obs-panel"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="cat4-summary-eyebrow">CAT4 Battery Complete</span>
            <div className="cat4-summary-ring">
              <MasteryRing percent={accuracy} size={120} strokeWidth={8} color="#6366f1">
                <strong className="mono-num" style={{ fontSize: '1.65rem' }}>{accuracy}%</strong>
              </MasteryRing>
            </div>
            <h1>
              {accuracy >= 85 ? 'Exceptional Spatial & Logical Precision'
                : accuracy >= 65 ? 'Strong Reasoning Momentum'
                : 'Keep Sharpening Your Pattern Eye'}
            </h1>
            <p className="cat4-summary-meta mono-num">
              {correctCount} / {puzzlePool.length} decoded &middot; {score} points earned
            </p>
            <div className="cat4-summary-actions">
              <button type="button" className="btn-tactile" onClick={() => resetRun(battery)}>
                <ObservatoryIcon name="play" size={16} />
                <span>Replay Battery</span>
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

export default Cat4LabPage
