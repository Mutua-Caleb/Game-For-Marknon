const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders() {
  const token = sessionStorage.getItem('adminToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse(res) {
  const data = await res.json()
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = res.status
    error.data = data
    throw error
  }
  return data
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

    const res = await fetch(`${API_BASE}/questions?${searchParams}`)
    return handleResponse(res)
  },

  async getTopics() {
    const res = await fetch(`${API_BASE}/questions/topics`)
    return handleResponse(res)
  },

  async getById(id) {
    const res = await fetch(`${API_BASE}/questions/${id}`)
    return handleResponse(res)
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

    const res = await fetch(`${API_BASE}/sequences?${searchParams}`)
    return handleResponse(res)
  },

  async getById(id) {
    const res = await fetch(`${API_BASE}/sequences/${id}`)
    return handleResponse(res)
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

    const res = await fetch(`${API_BASE}/diagrams?${searchParams}`)
    return handleResponse(res)
  },

  async getById(id) {
    const res = await fetch(`${API_BASE}/diagrams/${id}`)
    return handleResponse(res)
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

    const res = await fetch(`${API_BASE}/passages?${searchParams}`)
    return handleResponse(res)
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
    const res = await fetch(`${API_BASE}/quiz-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(res)
  },

  async recordAnswer(sessionId, answerData) {
    const res = await fetch(`${API_BASE}/quiz-sessions/${sessionId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answerData)
    })
    return handleResponse(res)
  },

  async recordTabEvent(sessionId, eventType) {
    const res = await fetch(`${API_BASE}/quiz-sessions/${sessionId}/tab-event`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType })
    })
    return handleResponse(res)
  },

  async complete(sessionId, data) {
    const res = await fetch(`${API_BASE}/quiz-sessions/${sessionId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(res)
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

    const res = await fetch(`${API_BASE}/learning/questions?${searchParams}`)
    return handleResponse(res)
  },

  // Record answer for spaced repetition
  async recordAnswer(learnerId, questionId, isCorrect, timeTakenMs) {
    const res = await fetch(`${API_BASE}/learning/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId, questionId, isCorrect, timeTakenMs })
    })
    return handleResponse(res)
  },

  // Get topic mastery with lock status
  async getMastery(learnerId, subject = null) {
    const searchParams = new URLSearchParams({ learnerId })
    if (subject) searchParams.set('subject', subject)

    const res = await fetch(`${API_BASE}/learning/mastery?${searchParams}`)
    return handleResponse(res)
  },

  // Get learning statistics
  async getStats(learnerId) {
    const res = await fetch(`${API_BASE}/learning/stats?learnerId=${learnerId}`)
    return handleResponse(res)
  }
}

// Learner API (accounts, daily tracking)
export const learnerApi = {
  async login(name, pin) {
    const res = await fetch(`${API_BASE}/learners/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin })
    })
    return handleResponse(res)
  },

  async register(name, pin, dailyRequiredMinutes) {
    const res = await fetch(`${API_BASE}/learners/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin, dailyRequiredMinutes })
    })
    return handleResponse(res)
  },

  async getDailyStatus(learnerId) {
    const res = await fetch(`${API_BASE}/learners/daily-status/${learnerId}`)
    return handleResponse(res)
  },

  async recordTime(learnerId, minutes) {
    const res = await fetch(`${API_BASE}/learners/record-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId, minutes })
    })
    return handleResponse(res)
  },

  async recordEarning(learnerId, correctAnswers) {
    const res = await fetch(`${API_BASE}/learners/record-earning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId, correctAnswers })
    })
    return handleResponse(res)
  },

  async getEarnings(learnerId) {
    const res = await fetch(`${API_BASE}/learners/earnings/${learnerId}`)
    return handleResponse(res)
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

// Writing API
export const writingApi = {
  async getPrompts(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.subject) searchParams.set('subject', params.subject)
    if (params.topic) searchParams.set('topic', params.topic)

    const res = await fetch(`${API_BASE}/writing/prompts?${searchParams}`)
    return handleResponse(res)
  },

  async getTopics() {
    const res = await fetch(`${API_BASE}/writing/prompts/topics`)
    return handleResponse(res)
  },

  async getPromptById(id) {
    const res = await fetch(`${API_BASE}/writing/prompts/${id}`)
    return handleResponse(res)
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
    const res = await fetch(`${API_BASE}/writing/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(res)
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
    const res = await fetch(`${API_BASE}/writing/learner/${learnerId}`)
    return handleResponse(res)
  }
}

// Stats API
export const statsApi = {
  async recordAnswer(questionId, isCorrect) {
    const res = await fetch(`${API_BASE}/stats/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, isCorrect })
    })
    return handleResponse(res)
  },

  async saveSession(sessionData) {
    const res = await fetch(`${API_BASE}/stats/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    })
    return handleResponse(res)
  },

  async getFailedQuestions(limit = 20) {
    const res = await fetch(`${API_BASE}/stats/failed?limit=${limit}`)
    return handleResponse(res)
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
