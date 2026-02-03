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
