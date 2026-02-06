import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { uploadApi, questionsApi, diagramsApi, statsApi, authApi, quizSessionApi } from '../utils/api'
import './AdminPage.css'

const SUBJECTS = ['Science', 'English']
const TOPICS = {
  Science: ['Human Body', 'Physics', 'Chemistry', 'Earth Science'],
  English: ['Vocabulary', 'Grammar', 'Spelling', 'Reading']
}

function AdminPage() {
  const navigate = useNavigate()
  const {
    questions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    getMostFailedQuestions,
    questionStats,
    resetStats,
    refreshQuestions
  } = useGame()

  const [activeTab, setActiveTab] = useState('questions')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [overview, setOverview] = useState(null)
  const [notification, setNotification] = useState(null)

  // Check authentication
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin-portal-x7k9')
      return
    }
    authApi.verify().catch(() => {
      sessionStorage.removeItem('adminToken')
      navigate('/admin-portal-x7k9')
    })
  }, [navigate])

  // Load analytics overview
  useEffect(() => {
    if (activeTab === 'analytics') {
      statsApi.getOverview().then(setOverview).catch(console.error)
    }
  }, [activeTab])

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken')
    navigate('/')
  }

  const filteredQuestions = questions.filter(q => {
    if (filterSubject && q.subject !== filterSubject) return false
    if (filterTopic && q.topic !== filterTopic) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return q.question.toLowerCase().includes(query) ||
             q.answer.toLowerCase().includes(query)
    }
    return true
  })

  const availableTopics = filterSubject
    ? [...new Set(questions.filter(q => q.subject === filterSubject).map(q => q.topic))]
    : []

  const failedQuestions = getMostFailedQuestions(10)

  const handleSaveQuestion = async (questionData) => {
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData)
        showNotification('Question updated successfully!')
      } else {
        await addQuestion(questionData)
        showNotification('Question added successfully!')
      }
      setShowAddModal(false)
      setEditingQuestion(null)
    } catch (err) {
      showNotification(err.message || 'Failed to save question', 'error')
    }
  }

  const handleDeleteQuestion = async () => {
    if (!showDeleteConfirm) return
    try {
      await deleteQuestion(showDeleteConfirm.id)
      setShowDeleteConfirm(null)
      showNotification('Question deleted')
    } catch (err) {
      showNotification('Failed to delete question', 'error')
    }
  }

  return (
    <div className="admin-page">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`notification-toast ${notification.type}`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            <span>{notification.type === 'success' ? '\u2705' : '\u274c'}</span>
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="admin-header">
        <div className="header-left">
          <h1>Question Manager</h1>
        </div>
        <div className="header-right">
          <button className="preview-btn" onClick={() => navigate('/')}>
            Preview Game
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Questions ({questions.length})
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Quiz Sessions
        </button>
        <button
          className={`tab ${activeTab === 'diagrams' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagrams')}
        >
          Diagrams
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import/Export
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'questions' && (
          <div className="questions-section">
            <div className="questions-toolbar">
              <div className="filters">
                <select
                  value={filterSubject}
                  onChange={(e) => {
                    setFilterSubject(e.target.value)
                    setFilterTopic('')
                  }}
                >
                  <option value="">All Subjects</option>
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  disabled={!filterSubject}
                >
                  <option value="">All Topics</option>
                  {availableTopics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <button
                className="add-question-btn"
                onClick={() => setShowAddModal(true)}
              >
                + Add Question
              </button>
            </div>

            <div className="questions-list">
              {filteredQuestions.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">&#128237;</span>
                  <p>No questions found</p>
                </div>
              ) : (
                filteredQuestions.map(question => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    stats={questionStats[question.id]}
                    onEdit={() => setEditingQuestion(question)}
                    onDelete={() => setShowDeleteConfirm(question)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsSection
            overview={overview}
            failedQuestions={failedQuestions}
            onResetStats={async () => {
              if (confirm('Are you sure? This will reset all player statistics.')) {
                await resetStats()
                showNotification('Statistics reset')
                statsApi.getOverview().then(setOverview).catch(console.error)
              }
            }}
          />
        )}

        {activeTab === 'sessions' && (
          <QuizSessionsSection />
        )}

        {activeTab === 'diagrams' && (
          <DiagramsSection showNotification={showNotification} />
        )}

        {activeTab === 'import' && (
          <ImportExportSection
            questions={questions}
            onImportComplete={async (count) => {
              await refreshQuestions()
              showNotification(`Successfully imported ${count} questions!`)
            }}
            showNotification={showNotification}
          />
        )}
      </main>

      {/* Add/Edit Question Modal */}
      <AnimatePresence>
        {(showAddModal || editingQuestion) && (
          <QuestionModal
            question={editingQuestion}
            onClose={() => {
              setShowAddModal(false)
              setEditingQuestion(null)
            }}
            onSave={handleSaveQuestion}
            showNotification={showNotification}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="delete-confirm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3>Delete Question?</h3>
              <p>"{showDeleteConfirm.question}"</p>
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </button>
                <button className="delete-btn" onClick={handleDeleteQuestion}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Question Card Component
function QuestionCard({ question, stats, onEdit, onDelete }) {
  const typeLabel = question.type === 'multiple' ? 'Multiple Choice' : 'Type Answer'

  return (
    <motion.div
      className="question-card"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="card-header">
        <span className={`subject-badge ${question.subject.toLowerCase()}`}>
          {question.subject}
        </span>
        <span className="topic-badge">{question.topic}</span>
        <span className="type-badge">{typeLabel}</span>
      </div>

      <div className="card-body">
        {question.image && (
          <div className="image-preview">
            <img
              src={question.image}
              alt="Question"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}
        <div className="question-text">{question.question}</div>
        <div className="answer-text">
          <strong>Answer:</strong> {question.answer}
        </div>
        {question.options && (
          <div className="options-preview">
            <strong>Options:</strong> {(Array.isArray(question.options) ? question.options : JSON.parse(question.options)).join(', ')}
          </div>
        )}
        {question.hint && (
          <div className="hint-text">
            <strong>Hint:</strong> {question.hint}
          </div>
        )}
      </div>

      {stats && (stats.correct > 0 || stats.wrong > 0) && (
        <div className="card-stats">
          <span className="stat correct">Correct: {stats.correct}</span>
          <span className="stat wrong">Wrong: {stats.wrong}</span>
        </div>
      )}

      <div className="card-actions">
        <button className="edit-btn" onClick={onEdit}>Edit</button>
        <button className="delete-btn" onClick={onDelete}>Delete</button>
      </div>
    </motion.div>
  )
}

// Question Modal Component with Image Upload
function QuestionModal({ question, onClose, onSave, showNotification }) {
  const [formData, setFormData] = useState({
    subject: question?.subject || 'Science',
    topic: question?.topic || 'Human Body',
    question: question?.question || '',
    answer: question?.answer || '',
    type: question?.type || 'text',
    options: question?.options
      ? (Array.isArray(question.options) ? question.options : JSON.parse(question.options))
      : ['', '', '', ''],
    hint: question?.hint || '',
    image: question?.image || ''
  })
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [customTopic, setCustomTopic] = useState('')
  const [useCustomTopic, setUseCustomTopic] = useState(false)
  const fileInputRef = useRef(null)

  const currentTopics = TOPICS[formData.subject] || []

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image must be under 5MB', 'error')
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadApi.uploadImage(file)
      setFormData(prev => ({ ...prev, image: result.url }))
      showNotification('Image uploaded!')
    } catch (err) {
      showNotification(err.message || 'Failed to upload image', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    const topic = useCustomTopic && customTopic.trim() ? customTopic.trim() : formData.topic

    const data = {
      ...formData,
      topic,
      options: formData.type === 'multiple' ? formData.options.filter(o => o.trim()) : null,
      image: formData.image || null,
      hint: formData.hint || null
    }

    try {
      await onSave(data)
    } finally {
      setIsSaving(false)
    }
  }

  const updateOption = (index, value) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }))
  }

  const removeOption = (index) => {
    if (formData.options.length <= 2) return
    const newOptions = formData.options.filter((_, i) => i !== index)
    setFormData({ ...formData, options: newOptions })
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="question-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{question ? 'Edit Question' : 'Add New Question'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => {
                  const newSubject = e.target.value
                  setFormData({
                    ...formData,
                    subject: newSubject,
                    topic: TOPICS[newSubject]?.[0] || ''
                  })
                  setUseCustomTopic(false)
                }}
              >
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Topic
                <button
                  type="button"
                  className="custom-topic-toggle"
                  onClick={() => setUseCustomTopic(!useCustomTopic)}
                >
                  {useCustomTopic ? 'Use existing' : '+ Custom'}
                </button>
              </label>
              {useCustomTopic ? (
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Enter custom topic..."
                />
              ) : (
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                >
                  {currentTopics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Question</label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Enter the question..."
              required
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label>Question Image (optional)</label>
            <div className="image-upload-area">
              {formData.image ? (
                <div className="image-upload-preview">
                  <img
                    src={formData.image}
                    alt="Question"
                    onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14">Error</text></svg>' }}
                  />
                  <div className="image-upload-actions">
                    <button
                      type="button"
                      className="change-image-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="image-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="dropzone-content">
                    <span className="dropzone-icon">&#128247;</span>
                    <p>{isUploading ? 'Uploading...' : 'Click to upload an image'}</p>
                    <span className="dropzone-hint">JPEG, PNG, GIF, WebP (max 5MB)</span>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <div className="image-url-option">
                <span className="divider-text">or paste URL</span>
                <input
                  type="url"
                  value={formData.image || ''}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="image-url-input"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Answer Type</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="text"
                  checked={formData.type === 'text'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
                Type Answer
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="multiple"
                  checked={formData.type === 'multiple'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
                Multiple Choice
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Correct Answer</label>
            <input
              type="text"
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Enter the correct answer..."
              required
            />
          </div>

          {formData.type === 'multiple' && (
            <div className="form-group">
              <label>Options (include the correct answer)</label>
              <div className="options-list">
                {formData.options.map((opt, i) => (
                  <div key={i} className="option-row">
                    <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        className="remove-option-btn"
                        onClick={() => removeOption(i)}
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
                {formData.options.length < 6 && (
                  <button type="button" className="add-option-btn" onClick={addOption}>
                    + Add Option
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Hint (optional)</label>
            <input
              type="text"
              value={formData.hint}
              onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
              placeholder="Enter a hint for the student..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : question ? 'Save Changes' : 'Add Question'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Analytics Section
function AnalyticsSection({ overview, failedQuestions, onResetStats }) {
  return (
    <div className="analytics-section">
      <div className="analytics-grid">
        <div className="stat-card">
          <span className="stat-icon">&#128221;</span>
          <span className="stat-value">{overview?.totalQuestions || 0}</span>
          <span className="stat-label">Total Questions</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#128300;</span>
          <span className="stat-value">{overview?.scienceCount || 0}</span>
          <span className="stat-label">Science</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#128218;</span>
          <span className="stat-value">{overview?.englishCount || 0}</span>
          <span className="stat-label">English</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#127912;</span>
          <span className="stat-value">{overview?.withImages || 0}</span>
          <span className="stat-label">With Images</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#127919;</span>
          <span className="stat-value">{overview?.totalAttempts || 0}</span>
          <span className="stat-label">Total Attempts</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#128200;</span>
          <span className="stat-value">{overview?.successRate || 0}%</span>
          <span className="stat-label">Success Rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#127918;</span>
          <span className="stat-value">{overview?.totalSessions || 0}</span>
          <span className="stat-label">Games Played</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#11088;</span>
          <span className="stat-value">{overview?.avgScore || 0}</span>
          <span className="stat-label">Avg Score</span>
        </div>
      </div>

      <div className="failed-questions-section">
        <h2>Most Missed Questions</h2>
        <p className="section-description">
          These questions are automatically shown more frequently to help students learn.
        </p>
        {failedQuestions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">&#128202;</span>
            <p>No data yet. Play the game to see analytics!</p>
          </div>
        ) : (
          <div className="failed-list">
            {failedQuestions.map((q, index) => (
              <div key={q.id} className="failed-item">
                <span className="failed-rank">#{index + 1}</span>
                <div className="failed-content">
                  <div className="failed-question">{q.question}</div>
                  <div className="failed-answer">Answer: {q.answer}</div>
                  <div className="failed-topic">{q.subject} &rarr; {q.topic}</div>
                </div>
                <div className="failed-stats">
                  <div className="fail-rate">
                    {Math.round(q.failureRate * 100)}% miss rate
                  </div>
                  <div className="attempt-count">
                    {q.totalAttempts} attempts
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="reset-stats-btn" onClick={onResetStats}>
          Reset All Statistics
        </button>
      </div>
    </div>
  )
}

// Quiz Sessions Section
function QuizSessionsSection() {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState(null)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    setIsLoading(true)
    try {
      const data = await quizSessionApi.getAll({ limit: 50 })
      setSessions(data.sessions)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDetail = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null)
      setSessionDetail(null)
      return
    }

    setExpandedSession(sessionId)
    setLoadingDetail(true)
    try {
      const detail = await quizSessionApi.getById(sessionId)
      setSessionDetail(detail)
    } catch (err) {
      console.error('Failed to load session detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (isLoading) {
    return <div className="sessions-loading">Loading quiz sessions...</div>
  }

  return (
    <div className="sessions-section">
      <div className="sessions-header">
        <h2>Quiz Sessions ({total})</h2>
        <button className="refresh-btn" onClick={loadSessions}>Refresh</button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">&#128203;</span>
          <p>No quiz sessions recorded yet. Sessions are created when students play the game.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map(session => (
            <div key={session.id} className="session-item">
              <div
                className={`session-summary ${expandedSession === session.id ? 'expanded' : ''}`}
                onClick={() => loadDetail(session.id)}
              >
                <div className="session-main">
                  <div className="session-player">
                    {session.player_name || 'Anonymous'}
                  </div>
                  <div className="session-meta">
                    <span className={`mode-tag ${session.game_mode}`}>
                      {session.game_mode === 'sequence' ? 'Sequence' : 'Quiz'}
                    </span>
                    <span className="session-subject">{session.subject}</span>
                    <span className="session-date">{formatDate(session.started_at)}</span>
                  </div>
                </div>

                <div className="session-stats-row">
                  <div className="session-stat">
                    <span className="stat-val correct-val">{session.correct_answers}</span>
                    <span className="stat-lbl">Correct</span>
                  </div>
                  <div className="session-stat">
                    <span className="stat-val wrong-val">{session.wrong_answers}</span>
                    <span className="stat-lbl">Wrong</span>
                  </div>
                  <div className="session-stat">
                    <span className="stat-val">{session.score}</span>
                    <span className="stat-lbl">Score</span>
                  </div>
                  <div className="session-stat">
                    <span className="stat-val">{formatDuration(session.duration_seconds)}</span>
                    <span className="stat-lbl">Duration</span>
                  </div>
                  <div className="session-stat">
                    <span className={`stat-val ${session.tab_switches > 0 ? 'warning-val' : ''}`}>
                      {session.tab_switches}
                    </span>
                    <span className="stat-lbl">Tab Switches</span>
                  </div>
                  <div className="session-stat">
                    <span className={`status-badge ${session.completed ? 'completed' : 'incomplete'}`}>
                      {session.completed ? 'Completed' : 'Incomplete'}
                    </span>
                  </div>
                </div>

                <div className="expand-arrow">
                  {expandedSession === session.id ? '\u25B2' : '\u25BC'}
                </div>
              </div>

              {/* Expanded Detail */}
              <AnimatePresence>
                {expandedSession === session.id && (
                  <motion.div
                    className="session-detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {loadingDetail ? (
                      <div className="detail-loading">Loading details...</div>
                    ) : sessionDetail ? (
                      <div className="detail-content">
                        {/* Accuracy Bar */}
                        <div className="accuracy-section">
                          <h4>Accuracy</h4>
                          <div className="accuracy-bar-container">
                            <div className="accuracy-bar">
                              <div
                                className="accuracy-fill correct-fill"
                                style={{
                                  width: `${sessionDetail.correct_answers + sessionDetail.wrong_answers > 0
                                    ? (sessionDetail.correct_answers / (sessionDetail.correct_answers + sessionDetail.wrong_answers) * 100)
                                    : 0}%`
                                }}
                              />
                            </div>
                            <span className="accuracy-text">
                              {sessionDetail.correct_answers + sessionDetail.wrong_answers > 0
                                ? Math.round(sessionDetail.correct_answers / (sessionDetail.correct_answers + sessionDetail.wrong_answers) * 100)
                                : 0}%
                            </span>
                          </div>
                        </div>

                        {/* Tab Events */}
                        {sessionDetail.tabEvents && sessionDetail.tabEvents.length > 0 && (
                          <div className="tab-events-section">
                            <h4>Tab Switch Timeline ({sessionDetail.tab_switches} switches)</h4>
                            <div className="tab-events-list">
                              {sessionDetail.tabEvents.map((evt, i) => (
                                <div key={i} className={`tab-event ${evt.event_type}`}>
                                  <span className="event-icon">
                                    {evt.event_type === 'left' ? '\u274C' : '\u2705'}
                                  </span>
                                  <span className="event-type">
                                    {evt.event_type === 'left' ? 'Left tab' : 'Returned'}
                                  </span>
                                  <span className="event-time">
                                    {new Date(evt.event_at).toLocaleTimeString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Per-Question Answers */}
                        {sessionDetail.answers && sessionDetail.answers.length > 0 && (
                          <div className="answers-section">
                            <h4>Question-by-Question Results ({sessionDetail.answers.length} questions)</h4>
                            <div className="answers-list">
                              {sessionDetail.answers.map((ans, i) => (
                                <div key={i} className={`answer-row ${ans.is_correct ? 'correct' : 'wrong'}`}>
                                  <div className="answer-index">#{i + 1}</div>
                                  <div className="answer-content">
                                    <div className="answer-question">{ans.question_text}</div>
                                    <div className="answer-details">
                                      <span className="correct-ans">
                                        Correct: <strong>{ans.correct_answer}</strong>
                                      </span>
                                      {ans.given_answer && (
                                        <span className={`given-ans ${ans.is_correct ? '' : 'wrong-given'}`}>
                                          Given: <strong>{ans.given_answer}</strong>
                                        </span>
                                      )}
                                      {!ans.given_answer && !ans.is_correct && (
                                        <span className="given-ans wrong-given">Timed out</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="answer-time">
                                    {ans.time_taken_ms ? `${(ans.time_taken_ms / 1000).toFixed(1)}s` : '-'}
                                  </div>
                                  <div className={`answer-badge ${ans.is_correct ? 'correct' : 'wrong'}`}>
                                    {ans.is_correct ? '\u2713' : '\u2717'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Diagrams Management Section
function DiagramsSection({ showNotification }) {
  const [diagrams, setDiagrams] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingDiagram, setEditingDiagram] = useState(null) // Diagram being edited
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadDiagrams()
  }, [])

  const loadDiagrams = async () => {
    setIsLoading(true)
    try {
      const data = await diagramsApi.getAll()
      setDiagrams(data)
    } catch (err) {
      console.error('Failed to load diagrams:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await diagramsApi.delete(id)
      setDiagrams(prev => prev.filter(d => d.id !== id))
      setDeleteConfirm(null)
      showNotification('Diagram deleted')
    } catch (err) {
      showNotification('Failed to delete diagram', 'error')
    }
  }

  const handleCreated = (newDiagram) => {
    setDiagrams(prev => [newDiagram, ...prev])
    setShowCreateForm(false)
    setEditingDiagram(null)
    showNotification('Diagram created successfully!')
  }

  const handleUpdated = (updatedDiagram) => {
    setDiagrams(prev => prev.map(d => d.id === updatedDiagram.id ? updatedDiagram : d))
    setEditingDiagram(null)
    setShowCreateForm(false)
    showNotification('Diagram updated successfully!')
  }

  const handleEdit = (diagram) => {
    setEditingDiagram(diagram)
    setShowCreateForm(true)
  }

  const handleCancelForm = () => {
    setShowCreateForm(false)
    setEditingDiagram(null)
  }

  if (isLoading) {
    return <div className="sessions-loading">Loading diagrams...</div>
  }

  return (
    <div className="diagrams-admin-section">
      <div className="sessions-header">
        <h2>Diagrams ({diagrams.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="refresh-btn" onClick={loadDiagrams}>Refresh</button>
          <button className="add-question-btn" onClick={() => { setShowCreateForm(!showCreateForm); setEditingDiagram(null) }}>
            {showCreateForm && !editingDiagram ? 'Cancel' : '+ Add Diagram'}
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <DiagramCreateForm
              diagram={editingDiagram}
              onCreated={handleCreated}
              onUpdated={handleUpdated}
              onCancel={handleCancelForm}
              showNotification={showNotification}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagrams list */}
      {diagrams.length === 0 && !showCreateForm ? (
        <div className="empty-state">
          <span className="empty-icon">&#128444;</span>
          <p>No diagrams yet. Click "+ Add Diagram" to create one.</p>
        </div>
      ) : (
        <div className="diagrams-list">
          {diagrams.map(diag => (
            <div key={diag.id} className="diagram-admin-card">
              <div className="diagram-card-preview">
                <img src={diag.image_url} alt={diag.title} className="diagram-thumb" />
              </div>
              <div className="diagram-card-info">
                <h3>{diag.title}</h3>
                <div className="diagram-card-meta">
                  <span className="subject-badge">{diag.subject}</span>
                  <span className="topic-badge">{diag.topic}</span>
                  <span className="label-count">{diag.labels?.length || 0} labels</span>
                </div>
                {diag.description && <p className="diagram-card-desc">{diag.description}</p>}
                {diag.labels && diag.labels.length > 0 && (
                  <div className="diagram-card-labels">
                    {diag.labels.map(l => (
                      <span key={l.label_key} className="label-chip">
                        <strong>{l.label_key}</strong>: {l.correct_answer}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="diagram-card-actions">
                <button className="edit-btn" onClick={() => handleEdit(diag)}>Edit</button>
                <button className="delete-btn" onClick={() => setDeleteConfirm(diag)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="delete-confirm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3>Delete Diagram?</h3>
              <p>"{deleteConfirm.title}" with {deleteConfirm.labels?.length || 0} labels</p>
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="delete-btn" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Diagram Create Form with Interactive Label Placement
function DiagramCreateForm({ diagram, onCreated, onUpdated, onCancel, showNotification }) {
  const isEditing = !!diagram

  const [formData, setFormData] = useState({
    subject: diagram?.subject || 'Science',
    topic: diagram?.topic || 'Human Body',
    title: diagram?.title || '',
    description: diagram?.description || ''
  })
  const [imageUrl, setImageUrl] = useState(diagram?.image_url || '')
  const [labels, setLabels] = useState(diagram?.labels || [])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [placementMode, setPlacementMode] = useState(null) // null, 'pointer', or 'label'
  const [pendingLabel, setPendingLabel] = useState(null) // label being placed
  const [editingLabelIndex, setEditingLabelIndex] = useState(null)
  const [useCustomTopic, setUseCustomTopic] = useState(false)
  const [customTopic, setCustomTopic] = useState('')
  const [imageBounds, setImageBounds] = useState(null)
  const fileInputRef = useRef(null)
  const imageContainerRef = useRef(null)
  const imageRef = useRef(null)

  const currentTopics = TOPICS[formData.subject] || []

  // Reset form when diagram prop changes (switching between create/edit)
  useEffect(() => {
    if (diagram) {
      setFormData({
        subject: diagram.subject || 'Science',
        topic: diagram.topic || 'Human Body',
        title: diagram.title || '',
        description: diagram.description || ''
      })
      setImageUrl(diagram.image_url || '')
      setLabels(diagram.labels || [])
    } else {
      setFormData({ subject: 'Science', topic: 'Human Body', title: '', description: '' })
      setImageUrl('')
      setLabels([])
    }
    setPlacementMode(null)
    setPendingLabel(null)
    setEditingLabelIndex(null)
    setImageBounds(null)
  }, [diagram])

  // Calculate actual image bounds within container (accounting for object-fit: contain)
  const updateImageBounds = useCallback(() => {
    if (!imageRef.current || !imageContainerRef.current) return

    const container = imageContainerRef.current.getBoundingClientRect()
    const img = imageRef.current

    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight
    if (!naturalWidth || !naturalHeight) return

    const containerAspect = container.width / container.height
    const imageAspect = naturalWidth / naturalHeight

    let renderWidth, renderHeight, offsetX, offsetY

    if (imageAspect > containerAspect) {
      renderWidth = container.width
      renderHeight = container.width / imageAspect
      offsetX = 0
      offsetY = (container.height - renderHeight) / 2
    } else {
      renderHeight = container.height
      renderWidth = container.height * imageAspect
      offsetX = (container.width - renderWidth) / 2
      offsetY = 0
    }

    setImageBounds({
      left: offsetX,
      top: offsetY,
      width: renderWidth,
      height: renderHeight
    })
  }, [])

  // Set up ResizeObserver
  useEffect(() => {
    const observer = new ResizeObserver(updateImageBounds)
    if (imageContainerRef.current) {
      observer.observe(imageContainerRef.current)
    }
    return () => observer.disconnect()
  }, [updateImageBounds])

  // Convert image to base64 data URI for persistent storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image must be under 5MB', 'error')
      return
    }

    setIsUploading(true)
    try {
      // Convert to base64 data URI for persistent storage in database
      const reader = new FileReader()
      reader.onload = () => {
        setImageUrl(reader.result) // This is a data:image/... URI
        setIsUploading(false)
        showNotification('Image loaded!')
      }
      reader.onerror = () => {
        showNotification('Failed to read image file', 'error')
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      showNotification(err.message || 'Failed to load image', 'error')
      setIsUploading(false)
    }
  }

  const handleImageClick = (e) => {
    if (!placementMode || !imageContainerRef.current || !imageBounds) return

    // Calculate click position relative to the actual rendered image, not the container
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const clickX = e.clientX - containerRect.left
    const clickY = e.clientY - containerRect.top

    // Check if click is within the actual image bounds
    if (clickX < imageBounds.left || clickX > imageBounds.left + imageBounds.width ||
        clickY < imageBounds.top || clickY > imageBounds.top + imageBounds.height) {
      return // Click was in the letterbox area, ignore
    }

    // Calculate percentage relative to the actual image, not the container
    const xPercent = ((clickX - imageBounds.left) / imageBounds.width) * 100
    const yPercent = ((clickY - imageBounds.top) / imageBounds.height) * 100

    if (placementMode === 'pointer') {
      // First click: set where the structure is on the diagram
      const labelX = xPercent < 50 ? Math.max(2, xPercent - 18) : Math.min(98, xPercent + 18)
      const labelY = yPercent

      setPendingLabel({
        label_key: '',
        correct_answer: '',
        hint: '',
        pointer_x: Math.round(xPercent * 10) / 10,
        pointer_y: Math.round(yPercent * 10) / 10,
        x_percent: Math.round(labelX * 10) / 10,
        y_percent: Math.round(labelY * 10) / 10
      })
      setPlacementMode('details')
    } else if (placementMode === 'move-label' && editingLabelIndex !== null) {
      // Reposition the label circle
      setLabels(prev => prev.map((l, i) =>
        i === editingLabelIndex
          ? { ...l, x_percent: Math.round(xPercent * 10) / 10, y_percent: Math.round(yPercent * 10) / 10 }
          : l
      ))
      setPlacementMode(null)
      setEditingLabelIndex(null)
    } else if (placementMode === 'move-pointer' && editingLabelIndex !== null) {
      // Reposition the pointer dot
      setLabels(prev => prev.map((l, i) =>
        i === editingLabelIndex
          ? { ...l, pointer_x: Math.round(xPercent * 10) / 10, pointer_y: Math.round(yPercent * 10) / 10 }
          : l
      ))
      setPlacementMode(null)
      setEditingLabelIndex(null)
    }
  }

  const handleSaveLabel = () => {
    if (!pendingLabel || !pendingLabel.label_key.trim() || !pendingLabel.correct_answer.trim()) {
      showNotification('Letter and correct answer are required', 'error')
      return
    }

    // Check for duplicate label keys
    if (labels.some(l => l.label_key.toUpperCase() === pendingLabel.label_key.toUpperCase())) {
      showNotification('This letter is already used', 'error')
      return
    }

    setLabels(prev => [...prev, {
      ...pendingLabel,
      label_key: pendingLabel.label_key.toUpperCase()
    }])
    setPendingLabel(null)
    setPlacementMode(null)
  }

  const handleRemoveLabel = (index) => {
    setLabels(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const topic = useCustomTopic && customTopic.trim() ? customTopic.trim() : formData.topic

    if (!formData.title.trim()) {
      showNotification('Title is required', 'error')
      return
    }
    if (!imageUrl) {
      showNotification('Please upload a diagram image', 'error')
      return
    }
    if (labels.length === 0) {
      showNotification('Add at least one label', 'error')
      return
    }

    setIsSaving(true)
    try {
      const diagramData = {
        subject: formData.subject,
        topic,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        image_url: imageUrl,
        labels
      }

      if (isEditing) {
        // Update existing diagram
        const result = await diagramsApi.update(diagram.id, diagramData)
        onUpdated(result)
      } else {
        // Create new diagram
        const id = `diag_${Date.now()}`
        const result = await diagramsApi.create({ id, ...diagramData })
        onCreated(result)
      }
    } catch (err) {
      showNotification(err.message || `Failed to ${isEditing ? 'update' : 'create'} diagram`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="diagram-create-form">
      <h3>{isEditing ? 'Edit Diagram' : 'Create New Diagram'}</h3>

      {/* Basic fields */}
      <div className="form-row">
        <div className="form-group">
          <label>Subject</label>
          <select
            value={formData.subject}
            onChange={(e) => {
              setFormData(prev => ({
                ...prev,
                subject: e.target.value,
                topic: TOPICS[e.target.value]?.[0] || ''
              }))
              setUseCustomTopic(false)
            }}
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>
            Topic
            <button
              type="button"
              className="custom-topic-toggle"
              onClick={() => setUseCustomTopic(!useCustomTopic)}
            >
              {useCustomTopic ? 'Use existing' : '+ Custom'}
            </button>
          </label>
          {useCustomTopic ? (
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Enter custom topic..."
            />
          ) : (
            <select
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            >
              {currentTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g., The Human Heart"
        />
      </div>

      <div className="form-group">
        <label>Description (optional)</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="e.g., Label the parts of the human heart"
        />
      </div>

      {/* Image upload */}
      <div className="form-group">
        <label>Diagram Image</label>
        {!imageUrl ? (
          <div className="diagram-upload-area">
            <div
              className="image-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-content">
                <span className="dropzone-icon">&#128444;</span>
                <p>{isUploading ? 'Uploading...' : 'Click to upload diagram image'}</p>
                <span className="dropzone-hint">JPEG, PNG, GIF, SVG, WebP (max 5MB)</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <div className="image-url-option">
              <span className="divider-text">or paste image URL</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/diagram.png"
                className="image-url-input"
              />
            </div>
          </div>
        ) : (
          <div className="diagram-editor-area">
            <div className="diagram-editor-toolbar">
              <button
                type="button"
                className={`editor-btn ${placementMode === 'pointer' ? 'active' : ''}`}
                onClick={() => {
                  setPlacementMode(placementMode === 'pointer' ? null : 'pointer')
                  setPendingLabel(null)
                  setEditingLabelIndex(null)
                }}
              >
                + Add Label (click on structure)
              </button>
              <button
                type="button"
                className="editor-btn change"
                onClick={() => { setImageUrl(''); setLabels([]); if (fileInputRef.current) fileInputRef.current.value = '' }}
              >
                Change Image
              </button>
              {placementMode && (
                <span className="placement-hint">
                  {placementMode === 'pointer' && 'Click on the structure you want to label'}
                  {placementMode === 'details' && 'Fill in the label details below'}
                  {placementMode === 'move-label' && 'Click where to place the label circle'}
                  {placementMode === 'move-pointer' && 'Click on the structure to move the pointer'}
                </span>
              )}
            </div>

            {/* Interactive diagram preview */}
            <div
              ref={imageContainerRef}
              className={`diagram-editor-canvas ${placementMode && placementMode !== 'details' ? 'placing' : ''}`}
              onClick={handleImageClick}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Diagram"
                className="editor-image"
                onLoad={updateImageBounds}
              />

              {/* Overlay wrapper positioned exactly over the rendered image */}
              {imageBounds && (
                <div
                  className="editor-overlay-wrapper"
                  style={{
                    position: 'absolute',
                    left: imageBounds.left,
                    top: imageBounds.top,
                    width: imageBounds.width,
                    height: imageBounds.height,
                    pointerEvents: 'none'
                  }}
                >
                  {/* SVG overlay for lines */}
                  <svg className="editor-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {labels.map((label, i) => (
                      <line
                        key={`line-${i}`}
                        x1={label.x_percent}
                        y1={label.y_percent}
                        x2={label.pointer_x}
                        y2={label.pointer_y}
                        stroke="#f59e0b"
                        strokeWidth="0.3"
                        strokeDasharray="1,0.5"
                      />
                    ))}
                    {pendingLabel && (
                      <line
                        x1={pendingLabel.x_percent}
                        y1={pendingLabel.y_percent}
                        x2={pendingLabel.pointer_x}
                        y2={pendingLabel.pointer_y}
                        stroke="#22c55e"
                        strokeWidth="0.3"
                      />
                    )}
                  </svg>

                  {/* Existing labels */}
                  {labels.map((label, i) => (
                    <div key={`marker-${i}`}>
                      <div
                        className="editor-label-marker"
                        style={{ left: `${label.x_percent}%`, top: `${label.y_percent}%` }}
                        title={`${label.label_key}: ${label.correct_answer}`}
                      >
                        {label.label_key}
                      </div>
                      <div
                        className="editor-pointer-dot"
                        style={{ left: `${label.pointer_x}%`, top: `${label.pointer_y}%` }}
                      />
                    </div>
                  ))}

                  {/* Pending label */}
                  {pendingLabel && (
                    <>
                      <div
                        className="editor-label-marker pending"
                        style={{ left: `${pendingLabel.x_percent}%`, top: `${pendingLabel.y_percent}%` }}
                      >
                        {pendingLabel.label_key || '?'}
                      </div>
                      <div
                        className="editor-pointer-dot pending"
                        style={{ left: `${pendingLabel.pointer_x}%`, top: `${pendingLabel.pointer_y}%` }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pending label detail form */}
            {placementMode === 'details' && pendingLabel && (
              <div className="label-detail-form">
                <h4>New Label Details</h4>
                <div className="label-detail-fields">
                  <div className="form-group compact">
                    <label>Letter</label>
                    <input
                      type="text"
                      value={pendingLabel.label_key}
                      onChange={(e) => setPendingLabel(prev => ({ ...prev, label_key: e.target.value.slice(0, 2) }))}
                      placeholder="e.g., A"
                      maxLength={2}
                      autoFocus
                      className="letter-input"
                    />
                  </div>
                  <div className="form-group compact">
                    <label>Correct Answer</label>
                    <input
                      type="text"
                      value={pendingLabel.correct_answer}
                      onChange={(e) => setPendingLabel(prev => ({ ...prev, correct_answer: e.target.value }))}
                      placeholder="e.g., Left Ventricle"
                    />
                  </div>
                  <div className="form-group compact">
                    <label>Hint (optional)</label>
                    <input
                      type="text"
                      value={pendingLabel.hint}
                      onChange={(e) => setPendingLabel(prev => ({ ...prev, hint: e.target.value }))}
                      placeholder="e.g., The thickest chamber..."
                    />
                  </div>
                </div>
                <div className="label-detail-actions">
                  <button type="button" className="save-btn" onClick={handleSaveLabel}>
                    Add Label
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => { setPendingLabel(null); setPlacementMode(null) }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Labels list */}
            {labels.length > 0 && (
              <div className="labels-list-admin">
                <h4>Labels ({labels.length})</h4>
                <div className="labels-table">
                  {labels.map((label, i) => (
                    <div key={i} className="label-row-admin">
                      <span className="label-key-badge">{label.label_key}</span>
                      <span className="label-answer-text">{label.correct_answer}</span>
                      <span className="label-hint-text">{label.hint || '-'}</span>
                      <div className="label-row-actions">
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => { setEditingLabelIndex(i); setPlacementMode('move-label') }}
                          title="Move label position"
                        >
                          Move
                        </button>
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => { setEditingLabelIndex(i); setPlacementMode('move-pointer') }}
                          title="Move pointer position"
                        >
                          Pointer
                        </button>
                        <button
                          type="button"
                          className="remove-option-btn"
                          onClick={() => handleRemoveLabel(i)}
                          title="Remove label"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Actions */}
      <div className="modal-actions">
        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="save-btn"
          onClick={handleSubmit}
          disabled={isSaving || !formData.title.trim() || !imageUrl || labels.length === 0}
        >
          {isSaving ? 'Saving...' : isEditing ? 'Update Diagram' : 'Save Diagram'}
        </button>
      </div>
    </div>
  )
}

// Import/Export Section with Excel Support
function ImportExportSection({ questions, onImportComplete, showNotification }) {
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [excelResult, setExcelResult] = useState(null)
  const excelInputRef = useRef(null)

  const handleExport = () => {
    const exportData = questions.map(q => ({
      subject: q.subject,
      topic: q.topic,
      question: q.question,
      answer: q.answer,
      type: q.type,
      options: q.options,
      hint: q.hint,
      image: q.image
    }))
    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wordblaster-questions-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleJsonImport = async () => {
    setImportError('')
    setIsImporting(true)
    try {
      const data = JSON.parse(importText)
      if (!Array.isArray(data)) {
        throw new Error('Invalid format: expected an array of questions')
      }

      const validQuestions = data.filter(q =>
        q.question && q.answer && q.subject && q.topic
      )

      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in import data')
      }

      const result = await questionsApi.bulkImport(validQuestions)
      setImportText('')
      onImportComplete(result.imported)

      if (result.errors?.length > 0) {
        setImportError(`${result.imported} imported, ${result.errors.length} errors`)
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        setImportError('Invalid JSON format. Please check your data.')
      } else {
        setImportError(error.message)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleExcelImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsImporting(true)
    setExcelResult(null)
    setImportError('')

    try {
      const result = await uploadApi.importExcel(file)
      setExcelResult(result)
      if (result.imported > 0) {
        onImportComplete(result.imported)
      }
    } catch (err) {
      setImportError(err.message || 'Failed to import Excel file')
    } finally {
      setIsImporting(false)
      if (excelInputRef.current) excelInputRef.current.value = ''
    }
  }

  const handleDownloadTemplate = () => {
    window.location.href = uploadApi.getTemplateUrl()
  }

  return (
    <div className="import-export-section">
      {/* Excel Import - Primary */}
      <div className="import-section excel-section">
        <div className="section-header-row">
          <h2>Import from Excel</h2>
          <span className="recommended-badge">Recommended</span>
        </div>
        <p>Upload an Excel file (.xlsx) or CSV to bulk-import questions. This is the fastest way to add many questions at once.</p>

        <div className="excel-upload-area">
          <div
            className="excel-dropzone"
            onClick={() => excelInputRef.current?.click()}
          >
            <span className="excel-icon">&#128196;</span>
            <p>{isImporting ? 'Importing...' : 'Click to upload Excel or CSV file'}</p>
            <span className="dropzone-hint">.xlsx, .xls, or .csv files supported</span>
          </div>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelImport}
            style={{ display: 'none' }}
          />
        </div>

        <button className="template-download-btn" onClick={handleDownloadTemplate}>
          Download Excel Template
        </button>

        <div className="excel-column-guide">
          <h3>Expected Columns</h3>
          <div className="column-list">
            <div className="column-item required">
              <span className="column-name">Subject</span>
              <span className="column-desc">Science or English</span>
            </div>
            <div className="column-item required">
              <span className="column-name">Topic</span>
              <span className="column-desc">e.g., Physics, Grammar</span>
            </div>
            <div className="column-item required">
              <span className="column-name">Question</span>
              <span className="column-desc">The question text</span>
            </div>
            <div className="column-item required">
              <span className="column-name">Answer</span>
              <span className="column-desc">The correct answer</span>
            </div>
            <div className="column-item">
              <span className="column-name">Type</span>
              <span className="column-desc">"text" or "multiple"</span>
            </div>
            <div className="column-item">
              <span className="column-name">Option1-4</span>
              <span className="column-desc">For multiple choice</span>
            </div>
            <div className="column-item">
              <span className="column-name">Hint</span>
              <span className="column-desc">Optional hint</span>
            </div>
            <div className="column-item">
              <span className="column-name">Image</span>
              <span className="column-desc">Image URL (optional)</span>
            </div>
          </div>
          <p className="column-note">Columns marked with no asterisk are optional. Required columns are shown in bold.</p>
        </div>

        {excelResult && (
          <div className={`import-result ${excelResult.errors?.length > 0 ? 'has-errors' : 'success'}`}>
            <div className="result-summary">
              <strong>{excelResult.message}</strong>
            </div>
            {excelResult.errors?.length > 0 && (
              <div className="result-errors">
                <p>Errors:</p>
                <ul>
                  {excelResult.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.error}</li>
                  ))}
                  {excelResult.errors.length > 10 && (
                    <li>...and {excelResult.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* JSON Import/Export */}
      <div className="export-section">
        <h2>Export Questions (JSON)</h2>
        <p>Download all questions as a JSON file for backup or sharing.</p>
        <button className="export-btn" onClick={handleExport}>
          Download Questions ({questions.length})
        </button>
      </div>

      <div className="import-section">
        <h2>Import from JSON</h2>
        <p>Paste JSON data to add new questions.</p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='[{"question": "...", "answer": "...", "subject": "Science", "topic": "Physics", "type": "text"}]'
          rows={8}
        />
        {importError && <div className="import-error">{importError}</div>}
        <button
          className="import-btn"
          onClick={handleJsonImport}
          disabled={!importText.trim() || isImporting}
        >
          {isImporting ? 'Importing...' : 'Import Questions'}
        </button>
      </div>
    </div>
  )
}

export default AdminPage
