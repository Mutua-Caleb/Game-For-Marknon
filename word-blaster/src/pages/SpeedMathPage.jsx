import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { useActiveFocusTimer } from '../hooks/useActiveFocusTimer'
import './SpeedMathPage.css'

const MODES = [
  {
    id: 'addition',
    name: 'Addition',
    icon: '+',
    desc: 'Fast sums with two and three digit numbers.'
  },
  {
    id: 'subtraction',
    name: 'Subtraction',
    icon: '-',
    desc: 'Positive answers only, built for speed.'
  },
  {
    id: 'multiplication',
    name: 'Multiplication',
    icon: 'x',
    desc: 'Times tables and two digit products.'
  },
  {
    id: 'division',
    name: 'Division',
    icon: '/',
    desc: 'Exact division, no decimals.'
  },
  {
    id: 'percent',
    name: 'Percentages',
    icon: '%',
    desc: 'Find common percentages quickly.'
  },
  {
    id: 'prime',
    name: 'Prime Factors',
    icon: '#',
    desc: 'Type factors like 2 x 2 x 3.'
  }
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function primeFactors(n) {
  const factors = []
  let value = n
  let divisor = 2
  while (value > 1) {
    while (value % divisor === 0) {
      factors.push(divisor)
      value /= divisor
    }
    divisor += divisor === 2 ? 1 : 2
  }
  return factors
}

function generateProblem(mode) {
  if (mode === 'addition') {
    const a = randomInt(12, 499)
    const b = randomInt(8, 399)
    return { prompt: `${a} + ${b}`, answer: String(a + b), displayAnswer: String(a + b) }
  }

  if (mode === 'subtraction') {
    const a = randomInt(40, 700)
    const b = randomInt(5, a - 1)
    return { prompt: `${a} - ${b}`, answer: String(a - b), displayAnswer: String(a - b) }
  }

  if (mode === 'multiplication') {
    const a = randomInt(6, 24)
    const b = randomInt(4, 18)
    return { prompt: `${a} x ${b}`, answer: String(a * b), displayAnswer: String(a * b) }
  }

  if (mode === 'division') {
    const b = randomInt(3, 18)
    const answer = randomInt(4, 24)
    const a = b * answer
    return { prompt: `${a} / ${b}`, answer: String(answer), displayAnswer: String(answer) }
  }

  if (mode === 'percent') {
    const percentages = [5, 10, 12.5, 20, 25, 50, 75]
    const percent = percentages[randomInt(0, percentages.length - 1)]
    const base = randomInt(4, 40) * 4
    const answer = (percent / 100) * base
    return {
      prompt: `${percent}% of ${base}`,
      answer: String(Number.isInteger(answer) ? answer : Number(answer.toFixed(2))),
      displayAnswer: String(Number.isInteger(answer) ? answer : Number(answer.toFixed(2)))
    }
  }

  const number = randomInt(12, 180)
  const factors = primeFactors(number)
  return {
    prompt: `Prime factorise ${number}`,
    answer: factors.join('x'),
    displayAnswer: factors.join(' x '),
    type: 'prime'
  }
}

function normalizeMathAnswer(value, problem) {
  if (problem?.type === 'prime') {
    return String(value)
      .toLowerCase()
      .replace(/\s/g, '')
      .replace(/[*,]/g, 'x')
      .replace(/×/g, 'x')
  }
  return String(value).trim().replace(/\s/g, '')
}

function SpeedMathPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const activityRef = useRef(null)
  const inputRef = useRef(null)
  const missedQueueRef = useRef([])
  const [mode, setMode] = useState('addition')
  const [problem, setProblem] = useState(() => generateProblem('addition'))
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0, streak: 0, best: 0 })

  const focusTimer = useActiveFocusTimer({
    storageKey: 'word-blaster-math-focus-v1',
    activityRef
  })
  const {
    markActivity,
    recordAttempt,
    resetTimer,
    focusText,
    focusPercent,
    focusStatus,
    focusGoalText,
    attempts: timerAttempts
  } = focusTimer

  const nextProblem = useCallback((nextMode = mode) => {
    const queued = missedQueueRef.current.shift()
    setProblem(queued || generateProblem(nextMode))
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      markActivity()
    })
  }, [markActivity, mode])

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      markActivity()
    })
  }, [markActivity])

  const activeMode = useMemo(() => MODES.find(item => item.id === mode), [mode])

  const handleModeChange = (nextMode) => {
    playSound('click')
    setMode(nextMode)
    missedQueueRef.current = []
    nextProblem(nextMode)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    recordAttempt()

    if (revealed) {
      nextProblem()
      return
    }

    const correct = normalizeMathAnswer(answer, problem) === normalizeMathAnswer(problem.answer, problem)
    if (correct) {
      playSound('correct')
      setStats(prev => {
        const streak = prev.streak + 1
        return {
          correct: prev.correct + 1,
          wrong: prev.wrong,
          streak,
          best: Math.max(prev.best, streak)
        }
      })
      setFeedback('Correct!')
      setTimeout(() => nextProblem(), 650)
      return
    }

    playSound('wrong')
    missedQueueRef.current.push(problem, problem)
    setStats(prev => ({ ...prev, wrong: prev.wrong + 1, streak: 0 }))
    setFeedback(`Answer: ${problem.displayAnswer}`)
    setRevealed(true)
  }

  const attempts = stats.correct + stats.wrong

  return (
    <div className="speed-math-page" ref={activityRef} onPointerDown={markActivity} onKeyDown={markActivity}>
      <div className="math-particles"></div>
      <Motion.div className="math-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="math-topbar">
          <button className="math-back-button" onClick={() => navigate('/')}>Back</button>
          <div>
            <p className="math-kicker">Speed Math</p>
            <h1>Pick a mode. Beat the timer honestly.</h1>
          </div>
          <div className="math-focus-card">
            <span>Active Focus</span>
            <strong>{focusText}</strong>
            <small>{focusStatus} / {focusGoalText}</small>
            <div className="math-focus-bar"><div style={{ width: `${focusPercent}%` }} /></div>
            <button type="button" onClick={resetTimer}>Reset</button>
          </div>
        </div>

        <section className="math-mode-grid">
          {MODES.map(item => (
            <Motion.button
              key={item.id}
              className={`math-mode-card ${mode === item.id ? 'selected' : ''}`}
              onClick={() => handleModeChange(item.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="math-mode-icon">{item.icon}</span>
              <span className="math-mode-name">{item.name}</span>
              <small>{item.desc}</small>
            </Motion.button>
          ))}
        </section>

        <section className="math-play-grid">
          <form className="math-problem-card" onSubmit={handleSubmit}>
            <span className="math-card-badge">{activeMode?.name}</span>
            <h2>{problem.prompt}</h2>
            {problem.type === 'prime' && (
              <p className="math-format-note">Use x between prime factors. Example: 12 = 2 x 2 x 3.</p>
            )}
            <input
              ref={inputRef}
              value={answer}
              onChange={event => { setAnswer(event.target.value); markActivity() }}
              placeholder="Type answer"
              autoComplete="off"
              inputMode={problem.type === 'prime' ? 'text' : 'decimal'}
            />
            <button className="math-submit-button" type="submit">{revealed ? 'Next problem' : 'Enter'}</button>
            {feedback && <div className={`math-feedback ${revealed ? 'wrong' : 'correct'}`}>{feedback}</div>}
          </form>

          <div className="math-score-card">
            <h2>Run Stats</h2>
            <div className="math-stat-list">
              <div><strong>{stats.correct}</strong><span>correct</span></div>
              <div><strong>{stats.wrong}</strong><span>missed</span></div>
              <div><strong>{stats.streak}</strong><span>streak</span></div>
              <div><strong>{stats.best}</strong><span>best streak</span></div>
              <div><strong>{attempts ? Math.round((stats.correct / attempts) * 100) : 100}%</strong><span>accuracy</span></div>
              <div><strong>{timerAttempts}</strong><span>timer attempts</span></div>
            </div>
            <p>Wrong problems return twice in the queue, so weak spots get pulled back into the run quickly.</p>
          </div>
        </section>
      </Motion.div>
    </div>
  )
}

export default SpeedMathPage
