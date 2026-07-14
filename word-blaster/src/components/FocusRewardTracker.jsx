import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { learnerApi } from '../utils/api'
import './FocusRewardTracker.css'

const CREDIT_BLOCK_MS = 10 * 60 * 1000
const DISPLAY_RATE = 0.5
const IDLE_AFTER_MS = 7000
const SYNC_EVERY_MS = 5000

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function readLearner() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function activitySubject(pathname, selectedSubject) {
  if (pathname === '/math') return 'Math'
  if (pathname === '/latin') return 'Latin'
  if (pathname === '/chemistry') return 'Chemistry'
  if (pathname === '/writing') return 'Writing'
  if (pathname === '/play' || pathname === '/play/sequence' || pathname === '/play/diagram') {
    return selectedSubject || 'Quiz practice'
  }
  return null
}

function storageKey(learnerId, subject, date) {
  return `word-blaster-focus-v2:${learnerId}:${date}:${subject}`
}

function readActiveMs(key) {
  const value = Number(localStorage.getItem(key))
  return Number.isFinite(value) && value > 0 ? value : 0
}

function FocusRewardTracker() {
  const { pathname } = useLocation()
  const { selectedSubject } = useGame()
  const learner = useMemo(readLearner, [pathname])
  const subject = activitySubject(pathname, selectedSubject)
  const isMath = subject === 'Math'
  const [activeMs, setActiveMs] = useState(0)
  const [running, setRunning] = useState(false)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [awardFlash, setAwardFlash] = useState(0)
  const activeMsRef = useRef(0)
  const lastActivityRef = useRef(0)
  const lastReportedRef = useRef(null)
  const syncBusyRef = useRef(false)
  const dateRef = useRef(todayKey())
  const keyRef = useRef(null)

  useEffect(() => {
    if (!learner?.id) return
    learnerApi.getEarnings(learner.id)
      .then(data => setTodayEarnings(Number(data.todayEarnings) || 0))
      .catch(console.error)
  }, [learner?.id])

  useEffect(() => {
    dateRef.current = todayKey()
    keyRef.current = learner?.id && subject
      ? storageKey(learner.id, subject, dateRef.current)
      : null
    const saved = !isMath && keyRef.current ? readActiveMs(keyRef.current) : 0
    activeMsRef.current = saved
    lastReportedRef.current = null
    lastActivityRef.current = 0
    setActiveMs(saved)
    setRunning(false)
  }, [isMath, learner?.id, subject])

  useEffect(() => {
    if (!subject || isMath) return undefined

    const markActivity = () => {
      lastActivityRef.current = Date.now()
    }
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll']
    events.forEach(eventName => window.addEventListener(eventName, markActivity, { passive: true }))

    let lastTick = Date.now()
    const interval = window.setInterval(() => {
      const now = Date.now()
      const delta = Math.min(1000, now - lastTick)
      lastTick = now

      if (dateRef.current !== todayKey()) {
        dateRef.current = todayKey()
        keyRef.current = storageKey(learner.id, subject, dateRef.current)
        activeMsRef.current = 0
        lastReportedRef.current = null
        setActiveMs(0)
      }

      const isActive = document.visibilityState === 'visible'
        && document.hasFocus()
        && lastActivityRef.current > 0
        && now - lastActivityRef.current <= IDLE_AFTER_MS

      setRunning(isActive)
      if (!isActive) return

      activeMsRef.current += delta
      setActiveMs(activeMsRef.current)
      if (keyRef.current) localStorage.setItem(keyRef.current, String(Math.floor(activeMsRef.current)))
    }, 1000)

    return () => {
      window.clearInterval(interval)
      events.forEach(eventName => window.removeEventListener(eventName, markActivity))
    }
  }, [isMath, learner?.id, subject])

  useEffect(() => {
    if (!isMath) return undefined

    const handleMathProgress = event => {
      if (event.origin !== window.location.origin) return
      if (event.data?.source !== 'soromath-active-study') return
      const nextActiveMs = Math.max(0, Number(event.data.activeMs) || 0)
      activeMsRef.current = nextActiveMs
      setActiveMs(nextActiveMs)
      setRunning(event.data.running === true)
    }

    window.addEventListener('message', handleMathProgress)
    return () => window.removeEventListener('message', handleMathProgress)
  }, [isMath])

  const syncFocus = useCallback(async () => {
    if (!learner?.id || !subject || syncBusyRef.current) return
    const reported = Math.floor(activeMsRef.current)
    if (reported === lastReportedRef.current) return

    syncBusyRef.current = true
    try {
      const result = await learnerApi.recordFocus(learner.id, subject, reported)
      lastReportedRef.current = reported
      setTodayEarnings(Number(result.todayEarnings) || 0)
      if (result.awardKsh > 0) {
        setAwardFlash(Number(result.awardKsh))
        window.setTimeout(() => setAwardFlash(0), 2400)
      }
    } catch (error) {
      console.error('Focus credit sync failed:', error)
    } finally {
      syncBusyRef.current = false
    }
  }, [learner?.id, subject])

  useEffect(() => {
    if (!subject) return undefined
    syncFocus()
    const interval = window.setInterval(syncFocus, SYNC_EVERY_MS)
    return () => window.clearInterval(interval)
  }, [subject, syncFocus])

  if (!learner?.id || !subject) return null

  const creditedTotalMs = Math.floor(activeMs * DISPLAY_RATE)
  const blockProgressMs = creditedTotalMs % CREDIT_BLOCK_MS
  const percent = Math.min(100, (blockProgressMs / CREDIT_BLOCK_MS) * 100)

  return (
    <aside className={`focus-reward-tracker ${running ? 'running' : 'paused'}`} aria-live="polite">
      <div className="focus-reward-heading">
        <span>{subject} focus</span>
        <strong>KSh {todayEarnings.toFixed(2)}</strong>
      </div>
      <div className="focus-reward-time">
        <strong>{formatTime(blockProgressMs)}</strong>
        <span>/ 10:00</span>
      </div>
      <div className="focus-reward-track"><div style={{ width: `${percent}%` }} /></div>
      <small>{running ? 'Focus counting' : 'Paused'} &middot; KSh20 at 10:00</small>
      {awardFlash > 0 && <div className="focus-reward-award">+ KSh {awardFlash}</div>}
    </aside>
  )
}

export default FocusRewardTracker
