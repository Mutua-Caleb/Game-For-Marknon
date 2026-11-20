import localforage from 'localforage'

const cacheStore = localforage.createInstance({
  name: 'word-blaster-offline',
  storeName: 'api_cache'
})

const queueStore = localforage.createInstance({
  name: 'word-blaster-offline',
  storeName: 'sync_queue'
})

const authStore = localforage.createInstance({
  name: 'word-blaster-offline',
  storeName: 'offline_learners'
})

const QUEUE_KEY = 'pending_mutations'
const SESSION_MAP_KEY = 'offline_session_id_map'
const LAST_SYNC_KEY = 'meta:last_synced_at'
const OFFLINE_CHEM_PREFIX = 'offline_chem:'
const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const listeners = new Set()

let syncState = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncing: false,
  prefetching: false,
  pendingCount: 0,
  lastSyncedAt: null,
  offlineReady: false
}

let flushPromise = null
let prefetchPromise = null

function notifyListeners() {
  const snapshot = { ...syncState }
  listeners.forEach(fn => {
    try {
      fn(snapshot)
    } catch (err) {
      console.error('Offline status listener error:', err)
    }
  })
}

function updateState(patch) {
  syncState = { ...syncState, ...patch }
  notifyListeners()
}

export function getOfflineStatus() {
  return { ...syncState }
}

export function subscribeOfflineStatus(listener) {
  listeners.add(listener)
  listener({ ...syncState })
  return () => listeners.delete(listener)
}

export function isNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (!error) return false
  if (error.isNetworkError) return true
  if (error.name === 'TypeError' || error.name === 'AbortError') return true
  if (typeof error.status === 'number' && error.status >= 502 && error.status <= 504) return true
  return false
}

export function isOfflineId(id) {
  return typeof id === 'string' && (id.startsWith('offline_session_') || id.startsWith('offline_chem_'))
}

export function generateLocalId(prefix) {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}${rand}`
}

export async function getCached(key) {
  try {
    return await cacheStore.getItem(key)
  } catch (err) {
    console.warn('Cache read failed:', key, err)
    return null
  }
}

export async function setCached(key, value) {
  try {
    await cacheStore.setItem(key, value)
  } catch (err) {
    console.warn('Cache write failed:', key, err)
  }
}

async function readQueue() {
  const items = await queueStore.getItem(QUEUE_KEY)
  return Array.isArray(items) ? items : []
}

async function writeQueue(items) {
  await queueStore.setItem(QUEUE_KEY, items)
  updateState({ pendingCount: items.length })
}

async function readSessionMap() {
  const map = await queueStore.getItem(SESSION_MAP_KEY)
  return map && typeof map === 'object' ? map : {}
}

async function writeSessionMap(map) {
  await queueStore.setItem(SESSION_MAP_KEY, map)
}

export async function initOfflineState() {
  try {
    const [queue, lastSyncedAt, cachedQuestions] = await Promise.all([
      readQueue(),
      cacheStore.getItem(LAST_SYNC_KEY),
      cacheStore.getItem('questions:all')
    ])
    updateState({
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingCount: queue.length,
      lastSyncedAt: lastSyncedAt || null,
      offlineReady: Array.isArray(cachedQuestions) && cachedQuestions.length > 0
    })
  } catch (err) {
    console.warn('Offline state initialization failed:', err)
  }
}

function localDateKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export async function enqueueSync(type, payload) {
  const queue = await readQueue()
  const now = Date.now()

  // Coalesce high-frequency activity updates for the same session
  if (type === 'quizSession.updateActivity') {
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (queue[i].type === type && queue[i].payload.sessionId === payload.sessionId) {
        queue[i] = {
          ...queue[i],
          payload: { ...queue[i].payload, data: payload.data },
          updatedAt: now
        }
        await writeQueue(queue)
        return queue[i]
      }
    }
  }

  // Coalesce focus heartbeats per learner + subject + day while keeping earliest start time
  if (type === 'learner.recordFocus') {
    const dateKey = payload.dateKey || localDateKey()
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      const existing = queue[i]
      if (
        existing.type === type &&
        existing.payload.learnerId === payload.learnerId &&
        existing.payload.subject === payload.subject &&
        existing.payload.dateKey === dateKey
      ) {
        queue[i] = {
          ...existing,
          payload: {
            ...existing.payload,
            activeMs: Math.max(Number(existing.payload.activeMs) || 0, Number(payload.activeMs) || 0),
            offlineStartedAt: existing.payload.offlineStartedAt || payload.offlineStartedAt || now
          },
          updatedAt: now
        }
        await writeQueue(queue)
        return queue[i]
      }
    }
    payload = {
      ...payload,
      dateKey,
      offlineStartedAt: payload.offlineStartedAt || now
    }
  }

  const entry = {
    id: generateLocalId('sync_'),
    type,
    payload,
    createdAt: now
  }
  queue.push(entry)
  await writeQueue(queue)
  return entry
}

async function sendJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

async function replayMutation(item, apiBase, sessionMap) {
  const { type, payload } = item

  const resolveSessionId = (id) => {
    if (typeof id === 'string' && sessionMap[id]) {
      return sessionMap[id]
    }
    return id
  }

  switch (type) {
    case 'quizSession.start': {
      const res = await sendJson(`${apiBase}/quiz-sessions`, 'POST', payload.data)
      if (res?.sessionId && payload.offlineSessionId) {
        sessionMap[payload.offlineSessionId] = res.sessionId
        await writeSessionMap(sessionMap)
      }
      return
    }
    case 'quizSession.recordAnswer': {
      const realId = resolveSessionId(payload.sessionId)
      if (isOfflineId(realId)) return
      await sendJson(`${apiBase}/quiz-sessions/${realId}/answer`, 'PUT', payload.answerData)
      return
    }
    case 'quizSession.recordTabEvent': {
      const realId = resolveSessionId(payload.sessionId)
      if (isOfflineId(realId)) return
      await sendJson(`${apiBase}/quiz-sessions/${realId}/tab-event`, 'PUT', { eventType: payload.eventType })
      return
    }
    case 'quizSession.updateActivity': {
      const realId = resolveSessionId(payload.sessionId)
      if (isOfflineId(realId)) return
      await sendJson(`${apiBase}/quiz-sessions/${realId}/activity`, 'PUT', payload.data)
      return
    }
    case 'quizSession.complete': {
      const realId = resolveSessionId(payload.sessionId)
      if (isOfflineId(realId)) return
      await sendJson(`${apiBase}/quiz-sessions/${realId}/complete`, 'PUT', payload.data)
      return
    }
    case 'learning.recordAnswer': {
      await sendJson(`${apiBase}/learning/record`, 'POST', payload)
      return
    }
    case 'stats.recordAnswer': {
      await sendJson(`${apiBase}/stats/record`, 'POST', payload)
      return
    }
    case 'stats.saveSession': {
      await sendJson(`${apiBase}/stats/session`, 'POST', payload)
      return
    }
    case 'learner.recordTime': {
      await sendJson(`${apiBase}/learners/record-time`, 'POST', payload)
      return
    }
    case 'learner.recordFocus': {
      await sendJson(`${apiBase}/learners/record-focus`, 'POST', {
        learnerId: payload.learnerId,
        subject: payload.subject,
        activeMs: payload.activeMs,
        offlineSync: true,
        offlineStartedAt: payload.offlineStartedAt
      })
      return
    }
    case 'writing.submit': {
      await sendJson(`${apiBase}/writing/submissions`, 'POST', payload)
      return
    }
    case 'chemistry.syncOfflineAttempt': {
      await sendJson(`${apiBase}/chemistry/attempts/sync-offline`, 'POST', payload)
      return
    }
    default:
      console.warn('Unknown sync mutation type, skipping:', type)
  }
}

export async function flushSyncQueue(apiBase = '/api') {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateState({ online: false })
    return { synced: 0, remaining: syncState.pendingCount }
  }

  if (flushPromise) return flushPromise

  flushPromise = (async () => {
    const queue = await readQueue()
    if (queue.length === 0) {
      updateState({ pendingCount: 0, syncing: false })
      return { synced: 0, remaining: 0 }
    }

    updateState({ syncing: true })
    const sessionMap = await readSessionMap()
    let synced = 0
    const remaining = []
    let networkFailed = false

    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i]
      if (networkFailed) {
        remaining.push(item)
        continue
      }

      try {
        await replayMutation(item, apiBase, sessionMap)
        synced += 1
      } catch (err) {
        if (isNetworkError(err)) {
          networkFailed = true
          remaining.push(item)
        } else if (err.status >= 400 && err.status < 500) {
          // Drop permanently invalid 4xx items so the queue never deadlocks
          console.warn('Dropping unrecoverable offline sync item:', item.type, err.status, err.message)
        } else {
          // Retry 5xx errors later
          networkFailed = true
          remaining.push(item)
        }
      }
    }

    await writeQueue(remaining)
    if (remaining.length === 0) {
      await writeSessionMap({})
    }

    const now = Date.now()
    if (synced > 0) {
      await cacheStore.setItem(LAST_SYNC_KEY, now)
    }

    updateState({
      syncing: false,
      online: !networkFailed && (typeof navigator !== 'undefined' ? navigator.onLine : true),
      pendingCount: remaining.length,
      ...(synced > 0 ? { lastSyncedAt: now } : {})
    })

    return { synced, remaining: remaining.length }
  })().finally(() => {
    flushPromise = null
  })

  return flushPromise
}

// Hash credentials locally so known learners can re-login offline without storing plaintext PINs
async function hashPin(name, pin) {
  const normalized = `${String(name).trim().toLowerCase()}::${String(pin).trim()}`
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(normalized)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return btoa(normalized)
}

export async function rememberLearnerForOffline(name, pin, learnerProfile) {
  try {
    const key = String(name).trim().toLowerCase()
    const pinHash = await hashPin(name, pin)
    await authStore.setItem(key, {
      pinHash,
      learner: learnerProfile,
      savedAt: Date.now()
    })
  } catch (err) {
    console.warn('Could not save offline learner profile:', err)
  }
}

export async function verifyOfflineLearnerLogin(name, pin) {
  try {
    const key = String(name).trim().toLowerCase()
    const record = await authStore.getItem(key)
    if (!record) return null
    const pinHash = await hashPin(name, pin)
    if (record.pinHash !== pinHash) {
      const err = new Error('Wrong name or PIN. Try again.')
      err.status = 401
      throw err
    }
    return record.learner
  } catch (err) {
    if (err.status === 401) throw err
    return null
  }
}

// Optimistic local cache updates when offline
export async function updateCachedDailyMinutes(learnerId, addedMinutes) {
  const key = `learner:daily:${learnerId}`
  const existing = await getCached(key)
  if (!existing) return
  const nextMinutes = Math.round(((Number(existing.minutesCompleted) || 0) + Math.max(0, Number(addedMinutes) || 0)) * 10) / 10
  const required = Number(existing.minutesRequired) || 30
  await setCached(key, {
    ...existing,
    minutesCompleted: nextMinutes,
    sessionsCount: (Number(existing.sessionsCount) || 0) + 1,
    quotaMet: nextMinutes >= required
  })
}

export async function appendCachedWritingSubmission(learnerId, submissionData) {
  const key = `writing:learner:${learnerId}`
  const existing = (await getCached(key)) || []
  const prompts = (await getCached('writing:prompts:all')) || []
  const matchedPrompt = prompts.find(p => p.id === submissionData.prompt_id)

  const localEntry = {
    id: generateLocalId('offline_writing_'),
    prompt_id: submissionData.prompt_id,
    learner_id: learnerId,
    thumbnail: submissionData.thumbnail || null,
    prompt_title: matchedPrompt?.title || 'Writing Practice',
    subject: matchedPrompt?.subject || 'Writing',
    topic: matchedPrompt?.topic || '',
    admin_rating: null,
    admin_feedback: null,
    submitted_at: new Date().toISOString(),
    pendingSync: true
  }

  await setCached(key, [localEntry, ...existing])
  return localEntry
}

// Local Chemistry Academy offline practice engine
function shuffled(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function normalizeChem(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function createOfflineChemistryAttempt(learnerId, lessonId) {
  const catalog = await getCached('chemistry:lessons')
  const lesson = catalog?.lessons?.find(item => item.id === lessonId)
  if (!lesson || !Array.isArray(lesson.facts) || lesson.facts.length === 0) {
    throw new Error('This Chemistry lesson is not cached yet. Connect once online to download lessons.')
  }

  const indices = shuffled(lesson.facts.map((_, index) => index)).slice(0, Math.min(5, lesson.facts.length))
  const questions = indices.map((factIndex, index) => {
    const currentFact = lesson.facts[factIndex]
    const distractors = shuffled(
      lesson.facts
        .filter((_, idx) => idx !== factIndex)
        .map(item => item.text)
    ).slice(0, 3)
    return {
      index,
      factId: `${lesson.id}-${factIndex}`,
      question: `Which statement correctly describes ${currentFact.title}?`,
      choices: shuffled([currentFact.text, ...distractors]),
      expectedAnswer: currentFact.text
    }
  })

  const attemptId = generateLocalId('offline_chem_')
  const attemptRecord = {
    attemptId,
    learnerId,
    lessonId,
    startedAt: Date.now(),
    questions,
    answers: {}
  }

  await setCached(`${OFFLINE_CHEM_PREFIX}${attemptId}`, attemptRecord)

  return {
    attemptId,
    lessonId,
    questions: questions.map(({ index, factId, question, choices }) => ({
      index,
      factId,
      question,
      choices
    })),
    marker: 'offline-practice'
  }
}

export async function gradeOfflineChemistryAnswer(attemptId, { questionIndex, answer, timeTakenMs }) {
  const record = await getCached(`${OFFLINE_CHEM_PREFIX}${attemptId}`)
  if (!record) {
    throw new Error('Offline chemistry attempt not found.')
  }

  const question = record.questions[questionIndex]
  if (!question) {
    throw new Error('Question not found.')
  }

  const learnerAnswer = String(answer || '').trim()
  const correct = normalizeChem(learnerAnswer) === normalizeChem(question.expectedAnswer)
  const feedback = correct
    ? 'Remembered! Saved locally and will sync when you are back online.'
    : `Review this idea: ${question.expectedAnswer}`

  record.answers[questionIndex] = {
    factId: question.factId,
    question: question.question,
    choices: question.choices,
    learnerAnswer,
    expectedAnswer: question.expectedAnswer,
    isCorrect: correct,
    timeTakenMs: Number(timeTakenMs) || 0
  }

  await setCached(`${OFFLINE_CHEM_PREFIX}${attemptId}`, record)

  return {
    correct,
    score: correct ? 100 : 0,
    feedback,
    missingPoints: [],
    source: 'offline-practice'
  }
}

export async function completeOfflineChemistryAttempt(attemptId) {
  const record = await getCached(`${OFFLINE_CHEM_PREFIX}${attemptId}`)
  if (!record) {
    throw new Error('Offline chemistry attempt not found.')
  }

  const orderedAnswers = record.questions
    .map((q, idx) => record.answers[idx])
    .filter(Boolean)

  const total = orderedAnswers.length || record.questions.length
  const correct = orderedAnswers.filter(a => a.isCorrect).length
  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0
  const passPercent = 70
  const passed = scorePercent >= passPercent
  const durationSeconds = Math.max(1, Math.floor((Date.now() - (record.startedAt || Date.now())) / 1000))

  // Update cached chemistry progress optimistically so next chapter unlocks offline
  const catalog = await getCached('chemistry:lessons')
  const progressKey = `chemistry:progress:${record.learnerId}`
  const existingProgress = await getCached(progressKey)
  let nextLessonId = null

  if (catalog?.lessons) {
    const lessonIdx = catalog.lessons.findIndex(item => item.id === record.lessonId)
    if (passed && lessonIdx >= 0 && catalog.lessons[lessonIdx + 1]) {
      nextLessonId = catalog.lessons[lessonIdx + 1].id
    }
  }

  if (existingProgress) {
    const byLesson = { ...(existingProgress.progressByLesson || {}) }
    const prev = byLesson[record.lessonId] || { bestScore: 0, passed: false, attemptsCount: 0 }
    byLesson[record.lessonId] = {
      ...prev,
      bestScore: Math.max(Number(prev.bestScore) || 0, scorePercent),
      passed: Boolean(prev.passed || passed),
      attemptsCount: (Number(prev.attemptsCount) || 0) + 1
    }

    const unlockedSet = new Set(existingProgress.unlockedLessonIds || [])
    if (nextLessonId) unlockedSet.add(nextLessonId)
    const passedCount = Object.values(byLesson).filter(entry => entry.passed).length

    await setCached(progressKey, {
      ...existingProgress,
      progressByLesson: byLesson,
      unlockedLessonIds: Array.from(unlockedSet),
      passedCount
    })
  }

  await enqueueSync('chemistry.syncOfflineAttempt', {
    learnerId: record.learnerId,
    lessonId: record.lessonId,
    answers: orderedAnswers,
    durationSeconds
  })

  await cacheStore.removeItem(`${OFFLINE_CHEM_PREFIX}${attemptId}`).catch(() => {})

  return {
    scorePercent,
    correct,
    total,
    passed,
    nextLessonId,
    passPercent,
    savedOffline: true
  }
}

// Proactive background download of all study content & images while online
async function fetchAndCache(url, cacheKey) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    await setCached(cacheKey, data)
    return data
  } catch {
    return null
  }
}

export async function prefetchAllForOffline(apiBase = '/api', learner = null) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  if (prefetchPromise) return prefetchPromise

  prefetchPromise = (async () => {
    updateState({ prefetching: true })
    try {
      const [questions, sequences, diagrams] = await Promise.all([
        fetchAndCache(`${apiBase}/questions`, 'questions:all'),
        fetchAndCache(`${apiBase}/sequences`, 'sequences:all'),
        fetchAndCache(`${apiBase}/diagrams`, 'diagrams:all'),
        fetchAndCache(`${apiBase}/questions/topics`, 'questions:topics'),
        fetchAndCache(`${apiBase}/passages`, 'passages:all'),
        fetchAndCache(`${apiBase}/writing/prompts`, 'writing:prompts:all'),
        fetchAndCache(`${apiBase}/writing/prompts/topics`, 'writing:topics'),
        fetchAndCache(`${apiBase}/chemistry/lessons`, 'chemistry:lessons')
      ])

      if (learner?.id) {
        const learnerKey = localStorage.getItem('learnerId') || `learner_${learner.id}`
        await Promise.all([
          fetchAndCache(`${apiBase}/learners/daily-status/${learner.id}`, `learner:daily:${learner.id}`),
          fetchAndCache(`${apiBase}/learners/earnings/${learner.id}`, `learner:earnings:${learner.id}`),
          fetchAndCache(`${apiBase}/chemistry/progress/${learner.id}`, `chemistry:progress:${learner.id}`),
          fetchAndCache(`${apiBase}/writing/learner/${learner.id}`, `writing:learner:${learner.id}`),
          fetchAndCache(`${apiBase}/learning/mastery?learnerId=${encodeURIComponent(learnerKey)}`, `learning:mastery:${learnerKey}:all`),
          fetchAndCache(`${apiBase}/learning/stats?learnerId=${encodeURIComponent(learnerKey)}`, `learning:stats:${learnerKey}`)
        ])
      }

      // Warm Service Worker cache for uploaded study images + Latin World Atlas
      const imageUrls = new Set()
      ;(questions || []).forEach(q => {
        if (q?.image && typeof q.image === 'string' && q.image.startsWith('/api/uploads/')) {
          imageUrls.add(q.image)
        }
      })
      ;(sequences || []).forEach(s => {
        if (s?.image && typeof s.image === 'string' && s.image.startsWith('/api/uploads/')) {
          imageUrls.add(s.image)
        }
      })
      ;(diagrams || []).forEach(d => {
        if (d?.image_url && typeof d.image_url === 'string' && d.image_url.startsWith('/api/uploads/')) {
          imageUrls.add(d.image_url)
        }
      })

      const assetUrls = [...imageUrls, WORLD_ATLAS_URL]
      // Fetch in small batches so we don't overwhelm the connection
      const batchSize = 6
      for (let i = 0; i < assetUrls.length; i += batchSize) {
        const batch = assetUrls.slice(i, i + batchSize)
        await Promise.allSettled(batch.map(url => fetch(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' })))
      }

      const now = Date.now()
      await cacheStore.setItem(LAST_SYNC_KEY, now)
      updateState({
        prefetching: false,
        offlineReady: true,
        lastSyncedAt: now,
        online: true
      })
      return true
    } catch (err) {
      console.warn('Offline prefetch incomplete:', err)
      updateState({ prefetching: false })
      return false
    }
  })().finally(() => {
    prefetchPromise = null
  })

  return prefetchPromise
}

export function setOnlineStatus(isOnline) {
  updateState({ online: isOnline })
}
