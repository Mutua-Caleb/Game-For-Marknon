import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { learnerApi } from '../utils/api'
import { getRealmBySubject } from '../data/curriculum'
import { MasteryRing } from './RealmIcons'
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
  if (pathname === '/reading') return 'English'
  if (pathname === '/cat4') return 'CAT4'
  if (pathname === '/french') return 'French'
  if (pathname === '/maths-forge' || pathname === '/math') return 'Maths'
  if (pathname === '/latin') return 'Latin'
  if (pathname === '/chemistry') return 'Chemistry'
  if (pathname === '/writing') return 'Writing'
  if (pathname === '/play' || pathname === '/play/sequence' || pathname === '/play/diagram') {
    return selectedSubject || 'Focus Practice'
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
  const { playSound } = useSound()
  const learner = useMemo(readLearner, [pathname])
  const subject = activitySubject(pathname, selectedSubject)
  const realm = getRealmBySubject(subject)
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
    const saved = keyRef.current ? readActiveMs(keyRef.current) : 0
    activeMsRef.current = saved
    lastReportedRef.current = null
    lastActivityRef.current = 0
    setActiveMs(saved)
    setRunning(false)
  }, [learner?.id, subject])

  useEffect(() => {
    if (!subject) return undefined

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
  }, [learner?.id, subject])

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
        playSound('focusBlockComplete')
        setAwardFlash(Number(result.awardKsh))
        window.setTimeout(() => setAwardFlash(0), 2600)
      }
    } catch (error) {
      console.error('Focus credit sync failed:', error)
    } finally {
      syncBusyRef.current = false
    }
  }, [learner?.id, subject, playSound])

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
    <aside
      className={`focus-reward-tracker ${running ? 'running' : 'paused'}`}
      data-realm={realm?.id || undefined}
      aria-live="polite"
    >
      <MasteryRing
        percent={percent}
        size={44}
        strokeWidth={4}
        color={running ? '#f5b942' : 'rgba(148, 163, 184, 0.55)'}
        trackColor="rgba(255, 255, 255, 0.1)"
      >
        <span className={`focus-ring-dot ${running ? 'is-live' : ''}`} />
      </MasteryRing>

      <div className="focus-reward-meta">
        <div className="focus-reward-heading">
          <span>{subject} Focus</span>
          <strong className="mono-num">KSh {todayEarnings.toFixed(0)}</strong>
        </div>
        <div className="focus-reward-time">
          <strong className="mono-num">{formatTime(blockProgressMs)}</strong>
          <span>/ 10:00 &middot; {running ? 'Active' : 'Paused'}</span>
        </div>
      </div>

      {awardFlash > 0 && (
        <div className="focus-reward-award mono-num">+KSh {awardFlash}</div>
      )}
    </aside>
  )
}

export default FocusRewardTracker
