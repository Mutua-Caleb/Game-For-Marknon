import {
  appendCachedWritingSubmission,
  completeOfflineChemistryAttempt,
  createOfflineChemistryAttempt,
  enqueueSync,
  flushSyncQueue,
  generateLocalId,
  getCached,
  gradeOfflineChemistryAnswer,
  isNetworkError,
  isOfflineId,
  prefetchAllForOffline,
  rememberLearnerForOffline,
  setCached,
  updateCachedDailyMinutes,
  verifyOfflineLearnerLogin
} from './offlineStore'

export const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders() {
  const token = sessionStorage.getItem('adminToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse(res) {
  let data = {}
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = {}
    }
  }
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

async function cachedGet(url, cacheKey, fallbackFn = null) {
  try {
    const res = await fetch(url)
    const data = await handleResponse(res)
    await setCached(cacheKey, data)
    return data
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = await getCached(cacheKey)
      if (cached !== null && cached !== undefined) {
        return cached
      }
      if (fallbackFn) {
        const computed = await fallbackFn()
        if (computed !== null && computed !== undefined) {
          return computed
        }
      }
    }
    throw err
  }
}

function filterBySubjectAndTopic(items, params = {}) {
  if (!Array.isArray(items)) return null
  let filtered = items
  if (params.subject) {
    filtered = filtered.filter(item => item.subject === params.subject)
  }
  if (params.topic) {
    filtered = filtered.filter(item => item.topic === params.topic)
  }
  return filtered
}

export function syncOfflineData() {
  return flushSyncQueue(API_BASE)
}

export function prefetchOfflineData(learner = null) {
  return prefetchAllForOffline(API_BASE, learner)
}

// Auth API
export const authApi = {
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    return handleResponse(res)
  },

  async verify() {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    })
    return handleResponse(res)
  },

  async changePassword(currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ currentPassword, newPassword })
    })
    return handleResponse(res)
  }
}

// Questions API
export const questionsApi = {
  async getAll(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.subject) searchParams.set('subject', params.subject)
    if (params.topic) searchParams.set('topic', params.topic)

    const isUnfiltered = !params.subject && !params.topic
    const cacheKey = isUnfiltered ? 'questions:all' : `questions:${searchParams.toString()}`
    return cachedGet(
      `${API_BASE}/questions?${searchParams}`,
      cacheKey,
      async () => filterBySubjectAndTopic(await getCached('questions:all'), params)
    )
  },

  async getTopics() {
    return cachedGet(`${API_BASE}/questions/topics`, 'questions:topics')
  },

  async getById(id) {
    return cachedGet(
      `${API_BASE}/questions/${id}`,
      `questions:id:${id}`,
      async () => {
        const all = await getCached('questions:all')
        return Array.isArray(all) ? all.find(q => q.id === id) || null : null
      }
    )
  },

  async create(question) {
    const res = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(question)
    })
    return handleResponse(res)
  },

  async update(id, question) {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(question)
    })
    return handleResponse(res)
  },

  async delete(id) {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  },

  async bulkImport(questions) {
    const res = await fetch(`${API_BASE}/questions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ questions })
    })
    return handleResponse(res)
  }
}

// Upload API
export const uploadApi = {
  async uploadImage(file) {
    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
    return handleResponse(res)
  },

  async importExcel(file) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE}/upload/excel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
    return handleResponse(res)
  },

  getTemplateUrl() {
    return `${API_BASE}/upload/template`
  },

  async deleteImage(filename) {
    const res = await fetch(`${API_BASE}/upload/image/${filename}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  }
}

// Sequences API
export const sequencesApi = {
  async getAll(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.subject) searchParams.set('subject', params.subject)
    if (params.topic) searchParams.set('topic', params.topic)

    const isUnfiltered = !params.subject && !params.topic
    const cacheKey = isUnfiltered ? 'sequences:all' : `sequences:${searchParams.toString()}`
    return cachedGet(
      `${API_BASE}/sequences?${searchParams}`,
      cacheKey,
      async () => filterBySubjectAndTopic(await getCached('sequences:all'), params)
    )
  },

  async getById(id) {
    return cachedGet(
      `${API_BASE}/sequences/${id}`,
      `sequences:id:${id}`,
      async () => {
        const all = await getCached('sequences:all')
        return Array.isArray(all) ? all.find(s => s.id === id) || null : null
      }
    )
  },

  async create(sequence) {
    const res = await fetch(`${API_BASE}/sequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(sequence)
    })
    return handleResponse(res)
  },

  async delete(id) {
    const res = await fetch(`${API_BASE}/sequences/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  }
}

// Diagrams API
export const diagramsApi = {
  async getAll(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.subject) searchParams.set('subject', params.subject)
    if (params.topic) searchParams.set('topic', params.topic)

    const isUnfiltered = !params.subject && !params.topic
    const cacheKey = isUnfiltered ? 'diagrams:all' : `diagrams:${searchParams.toString()}`
    return cachedGet(
      `${API_BASE}/diagrams?${searchParams}`,
      cacheKey,
      async () => filterBySubjectAndTopic(await getCached('diagrams:all'), params)
    )
  },

  async getById(id) {
    return cachedGet(
      `${API_BASE}/diagrams/${id}`,
      `diagrams:id:${id}`,
      async () => {
        const all = await getCached('diagrams:all')
        return Array.isArray(all) ? all.find(d => d.id === id) || null : null
      }
    )
  },

  async create(diagram) {
    const res = await fetch(`${API_BASE}/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(diagram)
    })
    return handleResponse(res)
  },

  async update(id, diagram) {
    const res = await fetch(`${API_BASE}/diagrams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(diagram)
    })
    return handleResponse(res)
  },

  async delete(id) {
    const res = await fetch(`${API_BASE}/diagrams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  }
}

// Passages API
export const passagesApi = {
  async getAll(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.subject) searchParams.set('subject', params.subject)
    if (params.topic) searchParams.set('topic', params.topic)

    const isUnfiltered = !params.subject && !params.topic
    const cacheKey = isUnfiltered ? 'passages:all' : `passages:${searchParams.toString()}`
    return cachedGet(
      `${API_BASE}/passages?${searchParams}`,
      cacheKey,
      async () => filterBySubjectAndTopic(await getCached('passages:all'), params)
    )
  },

  async create(passage) {
    const res = await fetch(`${API_BASE}/passages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(passage)
    })
    return handleResponse(res)
  },

  async update(id, passage) {
    const res = await fetch(`${API_BASE}/passages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(passage)
    })
    return handleResponse(res)
  },

  async delete(id) {
    const res = await fetch(`${API_BASE}/passages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  }
}

// Quiz Sessions API
export const quizSessionApi = {
  async start(data) {
    try {
      const res = await fetch(`${API_BASE}/quiz-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        const offlineSessionId = generateLocalId('offline_session_')
        await enqueueSync('quizSession.start', { offlineSessionId, data })
        return { sessionId: offlineSessionId, offline: true }
      }
      throw err
    }
  },

  async recordAnswer(sessionId, answerData) {
    if (isOfflineId(sessionId)) {
      await enqueueSync('quizSession.recordAnswer', { sessionId, answerData })
      return { queued: true }
    }
    try {
      const res = await fetch(`${API_BASE}/quiz-sessions/${sessionId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answerData)
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('quizSession.recordAnswer', { sessionId, answerData })
        return { queued: true }
      }
      throw err
    }
  },

  async recordTabEvent(sessionId, eventType) {
    if (isOfflineId(sessionId)) {
      await enqueueSync('quizSession.recordTabEvent', { sessionId, eventType })
      return { queued: true }
    }
    try {
      const res = await fetch(`${API_BASE}/quiz-sessions/${sessionId}/tab-event`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType })
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('quizSession.recordTabEvent', { sessionId, eventType })
        return { queued: true }
      }
      throw err
    }
  },

  async updateActivity(sessionId, data) {
    if (isOfflineId(sessionId)) {
      await enqueueSync('quizSession.updateActivity', { sessionId, data })
      return { queued: true }
    }
    try {
      const res = await fetch(`${API_BASE}/quiz-sessions/${sessionId}/activity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('quizSession.updateActivity', { sessionId, data })
        return { queued: true }
      }
      throw err
    }
  },

  sendActivityBeacon(sessionId, data) {
    if (isOfflineId(sessionId) || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      enqueueSync('quizSession.updateActivity', { sessionId, data }).catch(console.error)
      return true
    }

    const body = JSON.stringify(data)
    const url = `${API_BASE}/quiz-sessions/${sessionId}/activity`
    if (navigator.sendBeacon) {
      return navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {
      enqueueSync('quizSession.updateActivity', { sessionId, data }).catch(console.error)
    })
    return false
  },

  async complete(sessionId, data) {
    if (isOfflineId(sessionId)) {
      await enqueueSync('quizSession.complete', { sessionId, data })
      return { queued: true }
    }
    try {
      const res = await fetch(`${API_BASE}/quiz-sessions/${sessionId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('quizSession.complete', { sessionId, data })
        return { queued: true }
      }
      throw err
    }
  },

  async getAll(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.limit) searchParams.set('limit', params.limit)
    if (params.offset) searchParams.set('offset', params.offset)

    const res = await fetch(`${API_BASE}/quiz-sessions?${searchParams}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  },

  async getById(id) {
    const res = await fetch(`${API_BASE}/quiz-sessions/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  }
}

// Learning API (Spaced Repetition, Mastery, Interleaving)
export const learningApi = {
  // Get questions with spaced repetition and interleaving
  async getQuestions(learnerId, params = {}) {
    const searchParams = new URLSearchParams({ learnerId })
    if (params.subject) searchParams.set('subject', params.subject)
    if (params.topics) searchParams.set('topics', params.topics.join(','))
    if (params.limit) searchParams.set('limit', params.limit)
    if (params.interleave !== undefined) searchParams.set('interleave', params.interleave)

    const cacheKey = `learning:questions:${searchParams.toString()}`
    return cachedGet(
      `${API_BASE}/learning/questions?${searchParams}`,
      cacheKey,
      async () => {
        const all = await getCached('questions:all')
        if (!Array.isArray(all)) return null
        let filtered = all
        if (params.subject) {
          filtered = filtered.filter(q => q.subject === params.subject)
        }
        if (params.topics && params.topics.length > 0) {
          filtered = filtered.filter(q => params.topics.includes(q.topic))
        }
        const limit = Number(params.limit) || filtered.length
        return { questions: filtered.slice(0, limit), offline: true }
      }
    )
  },

  // Record answer for spaced repetition
  async recordAnswer(learnerId, questionId, isCorrect, timeTakenMs) {
    try {
      const res = await fetch(`${API_BASE}/learning/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId, questionId, isCorrect, timeTakenMs })
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('learning.recordAnswer', { learnerId, questionId, isCorrect, timeTakenMs })
        return { queued: true }
      }
      throw err
    }
  },

  // Get topic mastery with lock status
  async getMastery(learnerId, subject = null) {
    const searchParams = new URLSearchParams({ learnerId })
    if (subject) searchParams.set('subject', subject)

    const cacheKey = `learning:mastery:${learnerId}:${subject || 'all'}`
    return cachedGet(
      `${API_BASE}/learning/mastery?${searchParams}`,
      cacheKey,
      async () => ({ topics: [], offline: true })
    )
  },

  // Get learning statistics
  async getStats(learnerId) {
    return cachedGet(
      `${API_BASE}/learning/stats?learnerId=${encodeURIComponent(learnerId)}`,
      `learning:stats:${learnerId}`,
      async () => null
    )
  }
}

// Learner API (accounts, daily tracking)
export const learnerApi = {
  async login(name, pin) {
    try {
      const res = await fetch(`${API_BASE}/learners/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin })
      })
      const learner = await handleResponse(res)
      await rememberLearnerForOffline(name, pin, learner)
      return learner
    } catch (err) {
      if (isNetworkError(err)) {
        const offlineLearner = await verifyOfflineLearnerLogin(name, pin)
        if (offlineLearner) {
          return offlineLearner
        }
        throw new Error('You are offline. Connect to the internet once to sign in on this computer.')
      }
      throw err
    }
  },

  async register(name, pin, dailyRequiredMinutes) {
    try {
      const res = await fetch(`${API_BASE}/learners/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin, dailyRequiredMinutes })
      })
      const learner = await handleResponse(res)
      await rememberLearnerForOffline(name, pin, learner)
      return learner
    } catch (err) {
      if (isNetworkError(err)) {
        throw new Error('Creating a new account requires an internet connection.')
      }
      throw err
    }
  },

  async getDailyStatus(learnerId) {
    return cachedGet(
      `${API_BASE}/learners/daily-status/${learnerId}`,
      `learner:daily:${learnerId}`
    )
  },

  async recordTime(learnerId, minutes) {
    try {
      const res = await fetch(`${API_BASE}/learners/record-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId, minutes })
      })
      const data = await handleResponse(res)
      await updateCachedDailyMinutes(learnerId, minutes)
      return data
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('learner.recordTime', { learnerId, minutes })
        await updateCachedDailyMinutes(learnerId, minutes)
        return { queued: true }
      }
      throw err
    }
  },

  recordTimeBeacon(learnerId, minutes) {
    if (!learnerId || !(minutes > 0)) return false
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueSync('learner.recordTime', { learnerId, minutes }).catch(console.error)
      updateCachedDailyMinutes(learnerId, minutes).catch(console.error)
      return true
    }

    const data = JSON.stringify({ learnerId, minutes })
    if (navigator.sendBeacon) {
      return navigator.sendBeacon(`${API_BASE}/learners/record-time`, new Blob([data], { type: 'application/json' }))
    }

    fetch(`${API_BASE}/learners/record-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true
    }).catch(() => {
      enqueueSync('learner.recordTime', { learnerId, minutes }).catch(console.error)
    })
    return false
  },

  async recordFocus(learnerId, subject, activeMs) {
    try {
      const res = await fetch(`${API_BASE}/learners/record-focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId, subject, activeMs })
      })
      const result = await handleResponse(res)
      const cachedEarnings = await getCached(`learner:earnings:${learnerId}`)
      if (cachedEarnings && typeof result.todayEarnings === 'number') {
        await setCached(`learner:earnings:${learnerId}`, {
          ...cachedEarnings,
          todayEarnings: result.todayEarnings
        })
      }
      return result
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('learner.recordFocus', {
          learnerId,
          subject,
          activeMs,
          offlineStartedAt: Date.now()
        })
        const cachedEarnings = await getCached(`learner:earnings:${learnerId}`)
        return {
          subject,
          todayEarnings: Number(cachedEarnings?.todayEarnings) || 0,
          awardKsh: 0,
          queued: true
        }
      }
      throw err
    }
  },

  async getEarnings(learnerId) {
    return cachedGet(
      `${API_BASE}/learners/earnings/${learnerId}`,
      `learner:earnings:${learnerId}`,
      async () => ({
        todayEarnings: 0,
        todayFocusBlocks: 0,
        weekEarnings: 0,
        unpaidTotal: 0,
        offline: true
      })
    )
  },

  async getEarningsSummary() {
    const res = await fetch(`${API_BASE}/learners/earnings-summary`, {
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  },

  async payout(learnerId) {
    const res = await fetch(`${API_BASE}/learners/payout/${learnerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    })
    return handleResponse(res)
  }
}

// Chemistry Academy API
export const chemistryApi = {
  async getLessons() {
    return cachedGet(`${API_BASE}/chemistry/lessons`, 'chemistry:lessons')
  },

  async getProgress(learnerId) {
    return cachedGet(
      `${API_BASE}/chemistry/progress/${learnerId}`,
      `chemistry:progress:${learnerId}`,
      async () => {
        const catalog = await getCached('chemistry:lessons')
        const firstLessonId = catalog?.lessons?.[0]?.id
        return {
          totalLessons: catalog?.lessons?.length || 0,
          passedCount: 0,
          unlockedLessonIds: firstLessonId ? [firstLessonId] : [],
          progressByLesson: {},
          offline: true
        }
      }
    )
  },

  async startAttempt(learnerId, lessonId) {
    try {
      const res = await fetch(`${API_BASE}/chemistry/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId, lessonId })
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        return createOfflineChemistryAttempt(learnerId, lessonId)
      }
      throw err
    }
  },

  async submitAnswer(attemptId, data) {
    if (isOfflineId(attemptId)) {
      return gradeOfflineChemistryAnswer(attemptId, data)
    }
    const res = await fetch(`${API_BASE}/chemistry/attempts/${attemptId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(res)
  },

  async completeAttempt(attemptId) {
    if (isOfflineId(attemptId)) {
      return completeOfflineChemistryAttempt(attemptId)
    }
    const res = await fetch(`${API_BASE}/chemistry/attempts/${attemptId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    return handleResponse(res)
  }
}

// Writing API
export const writingApi = {
  async getPrompts(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.subject) searchParams.set('subject', params.subject)
    if (params.topic) searchParams.set('topic', params.topic)

    const isUnfiltered = !params.subject && !params.topic
    const cacheKey = isUnfiltered ? 'writing:prompts:all' : `writing:prompts:${searchParams.toString()}`
    return cachedGet(
      `${API_BASE}/writing/prompts?${searchParams}`,
      cacheKey,
      async () => filterBySubjectAndTopic(await getCached('writing:prompts:all'), params)
    )
  },

  async getTopics() {
    return cachedGet(`${API_BASE}/writing/prompts/topics`, 'writing:topics')
  },

  async getPromptById(id) {
    return cachedGet(
      `${API_BASE}/writing/prompts/${id}`,
      `writing:prompts:id:${id}`,
      async () => {
        const all = await getCached('writing:prompts:all')
        return Array.isArray(all) ? all.find(p => p.id === id) || null : null
      }
    )
  },

  async createPrompt(prompt) {
    const res = await fetch(`${API_BASE}/writing/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(prompt)
    })
    return handleResponse(res)
  },

  async updatePrompt(id, prompt) {
    const res = await fetch(`${API_BASE}/writing/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(prompt)
    })
    return handleResponse(res)
  },

  async deletePrompt(id) {
    const res = await fetch(`${API_BASE}/writing/prompts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  },

  async submit(data) {
    try {
      const res = await fetch(`${API_BASE}/writing/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('writing.submit', data)
        const localEntry = await appendCachedWritingSubmission(data.learner_id, data)
        return { ...localEntry, queued: true }
      }
      throw err
    }
  },

  async getSubmissions(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.learner_id) searchParams.set('learner_id', params.learner_id)
    if (params.prompt_id) searchParams.set('prompt_id', params.prompt_id)
    if (params.limit) searchParams.set('limit', params.limit)

    const res = await fetch(`${API_BASE}/writing/submissions?${searchParams}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  },

  async getSubmission(id) {
    const res = await fetch(`${API_BASE}/writing/submissions/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  },

  async reviewSubmission(id, data) {
    const res = await fetch(`${API_BASE}/writing/submissions/${id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    })
    return handleResponse(res)
  },

  async getLearnerSubmissions(learnerId) {
    return cachedGet(
      `${API_BASE}/writing/learner/${learnerId}`,
      `writing:learner:${learnerId}`,
      async () => []
    )
  }
}

// Stats API
export const statsApi = {
  async recordAnswer(questionId, isCorrect) {
    try {
      const res = await fetch(`${API_BASE}/stats/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, isCorrect })
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('stats.recordAnswer', { questionId, isCorrect })
        return { queued: true }
      }
      throw err
    }
  },

  async saveSession(sessionData) {
    try {
      const res = await fetch(`${API_BASE}/stats/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })
      return await handleResponse(res)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSync('stats.saveSession', sessionData)
        return { queued: true }
      }
      throw err
    }
  },

  async getFailedQuestions(limit = 20) {
    return cachedGet(`${API_BASE}/stats/failed?limit=${limit}`, `stats:failed:${limit}`, async () => [])
  },

  async getOverview() {
    const res = await fetch(`${API_BASE}/stats/overview`, {
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  },

  async resetStats() {
    const res = await fetch(`${API_BASE}/stats/reset`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse(res)
  }
}
