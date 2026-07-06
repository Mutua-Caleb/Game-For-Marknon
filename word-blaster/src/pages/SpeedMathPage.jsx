import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { quizSessionApi } from '../utils/api'
import './SpeedMathPage.css'

const SOROMATH_SRC = '/soromath/index.html'

function readLearnerAccount() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function SpeedMathPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const [frameVersion, setFrameVersion] = useState(1)
  const quizSessionIdRef = useRef(null)
  const latestProgressRef = useRef(null)
  const baselineRef = useRef(null)
  const lastSyncRef = useRef(0)

  const getMathPayload = useCallback((completed = false) => {
    const progress = latestProgressRef.current || {
      activeMs: 0,
      correct: 0,
      wrong: 0,
      solved: 0,
      mode: 'SoroMath'
    }
    const baseline = baselineRef.current || {
      activeMs: progress.activeMs || 0,
      correct: progress.correct || 0,
      wrong: progress.wrong || 0,
      solved: progress.solved || 0
    }
    const activeDelta = Math.max(0, (progress.activeMs || 0) - baseline.activeMs)
    const correctDelta = Math.max(0, (progress.correct || 0) - baseline.correct)
    const wrongDelta = Math.max(0, (progress.wrong || 0) - baseline.wrong)

    return {
      subject: 'Math',
      topics: [progress.mode || 'SoroMath'],
      score: correctDelta,
      correctAnswers: correctDelta,
      wrongAnswers: wrongDelta,
      bestStreak: 0,
      durationSeconds: Math.floor(activeDelta / 1000),
      completed
    }
  }, [])

  const syncMathSession = useCallback((completed = false, force = false) => {
    const sessionId = quizSessionIdRef.current
    if (!sessionId) return

    const now = Date.now()
    if (!force && now - lastSyncRef.current < 5000) return
    lastSyncRef.current = now
    quizSessionApi.updateActivity(sessionId, getMathPayload(completed)).catch(console.error)
  }, [getMathPayload])

  useEffect(() => {
    let cancelled = false
    const learner = readLearnerAccount()

    quizSessionApi.start({
      playerName: learner?.name || 'Anonymous',
      subject: 'Math',
      topics: ['SoroMath'],
      gameMode: 'math',
      minTimeRequired: 10 * 60
    }).then(result => {
      if (!cancelled) {
        quizSessionIdRef.current = result.sessionId
      }
    }).catch(console.error)

    const finishSession = () => {
      const sessionId = quizSessionIdRef.current
      if (sessionId) {
        quizSessionApi.sendActivityBeacon(sessionId, getMathPayload(true))
      }
    }

    window.addEventListener('beforeunload', finishSession)
    return () => {
      cancelled = true
      window.removeEventListener('beforeunload', finishSession)
      finishSession()
    }
  }, [getMathPayload])

  useEffect(() => {
    const handleMessage = event => {
      if (event.origin !== window.location.origin) return
      if (event.data?.source !== 'soromath-active-study') return

      const progress = {
        activeMs: Number(event.data.activeMs || 0),
        solved: Number(event.data.solved || 0),
        correct: Number(event.data.correct || 0),
        wrong: Number(event.data.wrong || 0),
        mode: event.data.mode || 'SoroMath'
      }

      latestProgressRef.current = progress
      if (!baselineRef.current || progress.activeMs < baselineRef.current.activeMs) {
        baselineRef.current = { ...progress }
      }

      syncMathSession(false, event.data.eventType === 'problem_complete')
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [syncMathSession])

  const handleBack = () => {
    syncMathSession(true, true)
    playSound('click')
    navigate('/')
  }

  const handleReload = () => {
    syncMathSession(false, true)
    playSound('click')
    setFrameVersion(version => version + 1)
  }

  return (
    <div className="speed-math-page">
      <div className="math-particles"></div>
      <Motion.div
        className="math-shell soromath-shell"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <header className="soromath-topbar">
          <button className="math-back-button" type="button" onClick={handleBack}>Back</button>
          <div className="soromath-title">
            <p className="math-kicker">Speed Math</p>
            <h1>SoroMath</h1>
          </div>
          <button className="math-reload-button" type="button" onClick={handleReload}>Reload</button>
        </header>

        <div className="soromath-mode-strip" aria-label="SoroMath practice areas">
          <span>Arithmetic</span>
          <span>Fractions</span>
          <span>Algebra</span>
          <span>Calendars</span>
          <span>Conversions</span>
          <span>Flash Anzan</span>
        </div>

        <section className="soromath-frame-wrap">
          <iframe
            key={frameVersion}
            className="soromath-frame"
            title="SoroMath trainer"
            src={`${SOROMATH_SRC}?inside=word-blaster&v=${frameVersion}`}
          />
        </section>
      </Motion.div>
    </div>
  )
}

export default SpeedMathPage
