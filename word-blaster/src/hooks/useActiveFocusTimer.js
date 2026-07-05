import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_GOAL_MS = 10 * 60 * 1000
const DEFAULT_IDLE_MS = 7000

function todayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function readSavedTimer(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    const date = todayKey()
    if (saved?.date === date) {
      return {
        date,
        activeMs: Number(saved.activeMs || 0),
        attempts: Number(saved.attempts || 0)
      }
    }
  } catch {
    // Ignore broken timer data and start fresh.
  }

  return {
    date: todayKey(),
    activeMs: 0,
    attempts: 0
  }
}

export function formatFocusTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function useActiveFocusTimer({
  storageKey,
  activityRef,
  goalMs = DEFAULT_GOAL_MS,
  idleMs = DEFAULT_IDLE_MS,
  enabled = true
}) {
  const [timer, setTimer] = useState(() => readSavedTimer(storageKey))
  const [status, setStatus] = useState('Paused')
  const lastActivityRef = useRef(0)
  const activeMsRef = useRef(timer.activeMs)
  const attemptsRef = useRef(timer.attempts)

  const saveTimer = useCallback((activeMs = activeMsRef.current, attempts = attemptsRef.current) => {
    localStorage.setItem(storageKey, JSON.stringify({
      date: todayKey(),
      activeMs: Math.round(activeMs),
      attempts
    }))
  }, [storageKey])

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const recordAttempt = useCallback(() => {
    attemptsRef.current += 1
    markActivity()
    setTimer(prev => ({
      ...prev,
      attempts: attemptsRef.current
    }))
    saveTimer(activeMsRef.current, attemptsRef.current)
  }, [markActivity, saveTimer])

  const resetTimer = useCallback(() => {
    activeMsRef.current = 0
    attemptsRef.current = 0
    lastActivityRef.current = Date.now()
    setTimer({
      date: todayKey(),
      activeMs: 0,
      attempts: 0
    })
    saveTimer(0, 0)
  }, [saveTimer])

  useEffect(() => {
    activeMsRef.current = timer.activeMs
    attemptsRef.current = timer.attempts
  }, [timer.activeMs, timer.attempts])

  useEffect(() => {
    if (!enabled) {
      setStatus('Paused')
      return undefined
    }

    let lastTick = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      const delta = Math.min(1000, now - lastTick)
      lastTick = now

      const root = activityRef?.current
      const activeElement = document.activeElement
      const hasActiveFocus = root ? root.contains(activeElement) : document.hasFocus()
      const recent = now - lastActivityRef.current < idleMs
      const complete = activeMsRef.current >= goalMs
      const running = document.visibilityState === 'visible' && document.hasFocus() && hasActiveFocus && recent && !complete

      if (running) {
        activeMsRef.current = Math.min(goalMs, activeMsRef.current + delta)
        setTimer(prev => ({
          ...prev,
          activeMs: activeMsRef.current,
          attempts: attemptsRef.current
        }))
        saveTimer(activeMsRef.current, attemptsRef.current)
        setStatus('Counting')
      } else if (complete) {
        setStatus('Daily focus met')
      } else if (lastActivityRef.current && !recent) {
        setStatus('Paused: idle')
      } else {
        setStatus('Paused')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activityRef, enabled, goalMs, idleMs, saveTimer])

  return {
    activeMs: timer.activeMs,
    attempts: timer.attempts,
    focusText: formatFocusTime(timer.activeMs),
    focusPercent: Math.min(100, (timer.activeMs / goalMs) * 100),
    focusStatus: status,
    focusGoalText: formatFocusTime(goalMs),
    markActivity,
    recordAttempt,
    resetTimer
  }
}
