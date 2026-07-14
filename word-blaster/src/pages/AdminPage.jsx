import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { uploadApi, questionsApi, diagramsApi, passagesApi, statsApi, authApi, quizSessionApi, learnerApi, writingApi } from '../utils/api'
import WritingCanvas from '../components/WritingCanvas'
import './AdminPage.css'

const SUBJECTS = ['English', 'Christian Religious Education', 'Creative Arts', 'Agriculture', 'Social Studies']
const TOPICS = {
  English: ['Vocabulary', 'Grammar', 'Spelling', 'Reading'],
  'Christian Religious Education': ['Old Testament', 'New Testament', 'Christian Living', 'The Church'],
  'Creative Arts': ['Drawing & Painting', 'Music', 'Drama', 'Crafts'],
  Agriculture: ['Crop Farming', 'Animal Husbandry', 'Soil Science', 'Farm Tools'],
  'Social Studies': ['Geography', 'History', 'Civics', 'Culture']
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
          className={`tab ${activeTab === 'passages' ? 'active' : ''}`}
          onClick={() => setActiveTab('passages')}
        >
          Passages
        </button>
        <button
          className={`tab ${activeTab === 'earnings' ? 'active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          Earnings
        </button>
        <button
          className={`tab ${activeTab === 'writing' ? 'active' : ''}`}
          onClick={() => setActiveTab('writing')}
        >
          Writing
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

        {activeTab === 'passages' && (
          <PassagesSection showNotification={showNotification} />
        )}

        {activeTab === 'earnings' && (
          <EarningsSection showNotification={showNotification} />
        )}

        {activeTab === 'writing' && (
          <WritingSection showNotification={showNotification} />
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
    subject: question?.subject || 'English',
    topic: question?.topic || 'Vocabulary',
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
          <span className="stat-value">{overview?.chemistryAttemptCount || 0}</span>
          <span className="stat-label">Chemistry Checks</span>
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

  const formatGameMode = (mode) => {
    const labels = {
      quiz: 'Quiz',
      sequence: 'Sequence',
      latin: 'Latin',
      math: 'Math'
    }
    return labels[mode] || mode || 'Quiz'
  }

  const modeClass = (mode) => String(mode || 'quiz').replace(/[^a-z0-9-]/gi, '').toLowerCase()

  const formatTopics = (topics) => {
    if (!topics) return ''
    if (Array.isArray(topics)) return topics.join(', ')
    try {
      const parsed = JSON.parse(topics)
      return Array.isArray(parsed) ? parsed.join(', ') : String(parsed)
    } catch {
      return String(topics)
    }
  }

  const timeBySubject = sessions.reduce((summary, session) => {
    const subject = session.subject || formatGameMode(session.game_mode)
    const key = subject || 'Unsorted'
    if (!summary[key]) {
      summary[key] = {
        subject: key,
        sessions: 0,
        duration: 0,
        correct: 0,
        wrong: 0
      }
    }
    summary[key].sessions += 1
    summary[key].duration += Number(session.duration_seconds || 0)
    summary[key].correct += Number(session.correct_answers || 0)
    summary[key].wrong += Number(session.wrong_answers || 0)
    return summary
  }, {})

  const subjectTimeRows = Object.values(timeBySubject).sort((a, b) => b.duration - a.duration)

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
          <p>No quiz sessions recorded yet. Sessions are created when students play quiz, Latin, or math activities.</p>
        </div>
      ) : (
        <>
          <div className="session-time-summary">
            {subjectTimeRows.map(row => (
              <div key={row.subject} className="session-time-card">
                <span>{row.subject}</span>
                <strong>{formatDuration(row.duration)}</strong>
                <small>{row.sessions} sessions / {row.correct} right / {row.wrong} wrong</small>
              </div>
            ))}
          </div>

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
                      <span className={`mode-tag ${modeClass(session.game_mode)}`}>
                        {formatGameMode(session.game_mode)}
                      </span>
                      <span className="session-subject">{session.subject}</span>
                      {formatTopics(session.topics) && (
                        <span className="session-topics">{formatTopics(session.topics)}</span>
                      )}
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
        </>
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

// Diagram Create Form - Click image to place letter markers, type answers in list
function DiagramCreateForm({ diagram, onCreated, onUpdated, onCancel, showNotification }) {
  const isEditing = !!diagram

  const [formData, setFormData] = useState({
    subject: diagram?.subject || 'English',
    topic: diagram?.topic || 'Vocabulary',
    title: diagram?.title || '',
    description: diagram?.description || ''
  })
  const [imageUrl, setImageUrl] = useState(diagram?.image_url || '')
  const [labels, setLabels] = useState(diagram?.labels || [])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [useCustomTopic, setUseCustomTopic] = useState(false)
  const [customTopic, setCustomTopic] = useState('')
  const fileInputRef = useRef(null)

  const currentTopics = TOPICS[formData.subject] || []

  // Get next letter (A, B, C, ...)
  const getNextLetter = useCallback(() => {
    const usedLetters = new Set(labels.map(l => l.label_key))
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i)
      if (!usedLetters.has(letter)) return letter
    }
    return '?'
  }, [labels])

  // Reset form when diagram prop changes
  useEffect(() => {
    if (diagram) {
      setFormData({
        subject: diagram.subject || 'English',
        topic: diagram.topic || 'Vocabulary',
        title: diagram.title || '',
        description: diagram.description || ''
      })
      setImageUrl(diagram.image_url || '')
      setLabels(diagram.labels || [])
    } else {
      setFormData({ subject: 'English', topic: 'Vocabulary', title: '', description: '' })
      setImageUrl('')
      setLabels([])
    }
  }, [diagram])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image must be under 5MB', 'error')
      return
    }

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        setImageUrl(reader.result)
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

  const addLabel = () => {
    const letter = getNextLetter()
    setLabels(prev => [...prev, {
      label_key: letter,  // Pre-fills next letter, but user can change it
      correct_answer: '',
      hint: ''
    }])
  }

  const handleRemoveLabel = (index) => {
    setLabels(prev => prev.filter((_, i) => i !== index))
  }

  const updateLabelField = (index, field, value) => {
    setLabels(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
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
    const validLabels = labels.filter(l => l.correct_answer.trim())
    if (validLabels.length === 0) {
      showNotification('Add at least one label with an answer', 'error')
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
        labels: validLabels
      }

      if (isEditing) {
        const result = await diagramsApi.update(diagram.id, diagramData)
        onUpdated(result)
      } else {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (formData.title.trim() && imageUrl && labels.some(l => l.correct_answer.trim()) && !isSaving) {
          handleSubmit()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [formData, imageUrl, labels, isSaving, handleSubmit])

  return (
    <div className="diagram-create-form">
      <h3>{isEditing ? 'Edit Diagram' : 'Create New Diagram'}</h3>

      <div className="shortcuts-bar">
        <span className="shortcut-item"><kbd>Ctrl+S</kbd> Save Diagram</span>
      </div>

      <div className="diagram-form-header">
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

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Label the parts of the human heart"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Description (optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Identify each structure marked with a letter"
            />
          </div>
        </div>
      </div>

      <div className="diagram-form-content">

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
                className="editor-btn change"
                onClick={() => { setImageUrl(''); setLabels([]); if (fileInputRef.current) fileInputRef.current.value = '' }}
              >
                Change Image
              </button>
              <span className="placement-hint">Pre-label your image (A, B, C...) in an image editor before uploading</span>
            </div>

            {/* Diagram image preview (labels are drawn on the image itself) */}
            <div className="diagram-editor-canvas" style={{ display: 'inline-block', width: '100%' }}>
              <img
                src={imageUrl}
                alt="Diagram"
                className="editor-image"
                style={{ width: '100%', display: 'block', borderRadius: '8px' }}
              />
            </div>

            {/* Labels answer list */}
            <div className="labels-list-admin">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>Answer Key ({labels.length} label{labels.length !== 1 ? 's' : ''})</h4>
                <button
                  type="button"
                  className="editor-btn"
                  onClick={addLabel}
                >
                  + Add Label
                </button>
              </div>
              <div className="labels-table">
                {labels.map((label, i) => (
                  <div key={i} className="label-row-admin">
                    <input
                      type="text"
                      value={label.label_key}
                      onChange={(e) => updateLabelField(i, 'label_key', e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="A"
                      className="label-key-input"
                      style={{ width: '42px', padding: '0.3rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(99,102,241,0.15)', color: 'white', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>=</span>
                    <input
                      type="text"
                      value={label.correct_answer}
                      onChange={(e) => updateLabelField(i, 'correct_answer', e.target.value)}
                      placeholder="Correct answer..."
                      className="label-answer-input"
                      style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'inherit' }}
                    />
                    <input
                      type="text"
                      value={label.hint || ''}
                      onChange={(e) => updateLabelField(i, 'hint', e.target.value)}
                      placeholder="Hint (optional)"
                      className="label-hint-input"
                      style={{ width: '160px', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      className="remove-option-btn"
                      onClick={() => handleRemoveLabel(i)}
                      title="Remove label"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              {labels.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>
                  Click "+ Add Label" to add answer mappings (A = skull, B = patella, etc.)
                </p>
              )}
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
      </div>

      </div>{/* end diagram-form-content */}

      <div className="diagram-form-footer">
        <div className="footer-status">
          {!formData.title.trim() && <span className="status-missing">Title required</span>}
          {!imageUrl && <span className="status-missing">Image required</span>}
          {imageUrl && labels.length === 0 && <span className="status-missing">Add at least 1 label</span>}
          {imageUrl && labels.length > 0 && !labels.some(l => l.correct_answer.trim()) && <span className="status-missing">Fill in answers for labels</span>}
          {formData.title.trim() && imageUrl && labels.some(l => l.correct_answer.trim()) && (
            <span className="status-ready">Ready to save ({labels.filter(l => l.correct_answer.trim()).length} label{labels.filter(l => l.correct_answer.trim()).length !== 1 ? 's' : ''})</span>
          )}
        </div>
        <div className="footer-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="save-btn"
            onClick={handleSubmit}
            disabled={isSaving || !formData.title.trim() || !imageUrl || !labels.some(l => l.correct_answer.trim())}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update Diagram' : 'Save Diagram'} <kbd>Ctrl+S</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}

// Passages Section - CRUD for reading comprehension passages
function PassagesSection({ showNotification }) {
  const [passages, setPassages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPassage, setEditingPassage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadPassages()
  }, [])

  const loadPassages = async () => {
    setIsLoading(true)
    try {
      const data = await passagesApi.getAll()
      setPassages(data)
    } catch (err) {
      console.error('Failed to load passages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await passagesApi.delete(id)
      setPassages(prev => prev.filter(p => p.id !== id))
      setDeleteConfirm(null)
      showNotification('Passage deleted')
    } catch (err) {
      showNotification('Failed to delete passage', 'error')
    }
  }

  const handleCreated = (newPassage) => {
    setPassages(prev => [newPassage, ...prev])
    setShowCreateForm(false)
    setEditingPassage(null)
    showNotification('Passage created successfully!')
  }

  const handleUpdated = (updatedPassage) => {
    setPassages(prev => prev.map(p => p.id === updatedPassage.id ? updatedPassage : p))
    setEditingPassage(null)
    setShowCreateForm(false)
    showNotification('Passage updated successfully!')
  }

  const handleEdit = (passage) => {
    setEditingPassage(passage)
    setShowCreateForm(true)
  }

  const handleCancelForm = () => {
    setShowCreateForm(false)
    setEditingPassage(null)
  }

  if (isLoading) {
    return <div className="sessions-loading">Loading passages...</div>
  }

  return (
    <div className="diagrams-admin-section">
      <div className="sessions-header">
        <h2>Passages ({passages.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="refresh-btn" onClick={loadPassages}>Refresh</button>
          <button className="add-question-btn" onClick={() => { setShowCreateForm(!showCreateForm); setEditingPassage(null) }}>
            {showCreateForm && !editingPassage ? 'Cancel' : '+ Add Passage'}
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
            <PassageCreateForm
              passage={editingPassage}
              onCreated={handleCreated}
              onUpdated={handleUpdated}
              onCancel={handleCancelForm}
              showNotification={showNotification}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passages list */}
      {passages.length === 0 && !showCreateForm ? (
        <div className="empty-state">
          <span className="empty-icon">&#128214;</span>
          <p>No passages yet. Click "+ Add Passage" to create one.</p>
        </div>
      ) : (
        <div className="diagrams-list">
          {passages.map(p => (
            <div key={p.id} className="diagram-admin-card">
              <div className="diagram-card-info" style={{ flex: 1 }}>
                <h3>{p.title}</h3>
                <div className="diagram-card-meta">
                  <span className="subject-badge">{p.subject}</span>
                  <span className="topic-badge">{p.topic}</span>
                  <span className="label-count">{p.questions?.length || 0} questions</span>
                </div>
                <p className="diagram-card-desc" style={{ whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden' }}>
                  {p.content?.substring(0, 200)}{p.content?.length > 200 ? '...' : ''}
                </p>
                {p.questions && p.questions.length > 0 && (
                  <div className="diagram-card-labels">
                    {p.questions.map((q, i) => (
                      <span key={i} className="label-chip">
                        <strong>Q{i + 1}:</strong> {q.question.substring(0, 40)}{q.question.length > 40 ? '...' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="diagram-card-actions">
                <button className="edit-btn" onClick={() => handleEdit(p)}>Edit</button>
                <button className="delete-btn" onClick={() => setDeleteConfirm(p)}>Delete</button>
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
              <h3>Delete Passage?</h3>
              <p>"{deleteConfirm.title}" with {deleteConfirm.questions?.length || 0} questions</p>
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

// Passage Create/Edit Form
function PassageCreateForm({ passage, onCreated, onUpdated, onCancel, showNotification }) {
  const isEditing = !!passage

  const [formData, setFormData] = useState({
    subject: passage?.subject || 'English',
    topic: passage?.topic || 'Reading',
    title: passage?.title || '',
    content: passage?.content || ''
  })
  const [questions, setQuestions] = useState(
    passage?.questions?.map(q => ({
      question: q.question,
      answer: q.answer,
      type: q.type || 'text',
      options: q.options || ['', '', '', ''],
      hint: q.hint || ''
    })) || [{ question: '', answer: '', type: 'text', options: ['', '', '', ''], hint: '' }]
  )
  const [isSaving, setIsSaving] = useState(false)
  const [useCustomTopic, setUseCustomTopic] = useState(false)
  const [customTopic, setCustomTopic] = useState('')

  const currentTopics = TOPICS[formData.subject] || []

  useEffect(() => {
    if (passage) {
      setFormData({
        subject: passage.subject || 'English',
        topic: passage.topic || 'Reading',
        title: passage.title || '',
        content: passage.content || ''
      })
      setQuestions(
        passage.questions?.map(q => ({
          question: q.question,
          answer: q.answer,
          type: q.type || 'text',
          options: q.options || ['', '', '', ''],
          hint: q.hint || ''
        })) || [{ question: '', answer: '', type: 'text', options: ['', '', '', ''], hint: '' }]
      )
    } else {
      setFormData({ subject: 'English', topic: 'Reading', title: '', content: '' })
      setQuestions([{ question: '', answer: '', type: 'text', options: ['', '', '', ''], hint: '' }])
    }
  }, [passage])

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question: '', answer: '', type: 'text', options: ['', '', '', ''], hint: '' }])
  }

  const removeQuestion = (index) => {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  const updateQuestionOption = (qIndex, optIndex, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const newOptions = [...q.options]
      newOptions[optIndex] = value
      return { ...q, options: newOptions }
    }))
  }

  const handleSubmit = async () => {
    const topic = useCustomTopic && customTopic.trim() ? customTopic.trim() : formData.topic

    if (!formData.title.trim() || !formData.content.trim()) {
      showNotification('Title and content are required', 'error')
      return
    }

    const validQuestions = questions.filter(q => q.question.trim() && q.answer.trim())
    if (validQuestions.length === 0) {
      showNotification('At least one question with an answer is required', 'error')
      return
    }

    setIsSaving(true)
    try {
      const passageData = {
        id: isEditing ? passage.id : `passage_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        subject: formData.subject,
        topic,
        title: formData.title.trim(),
        content: formData.content.trim(),
        questions: validQuestions.map(q => ({
          question: q.question.trim(),
          answer: q.answer.trim(),
          type: q.type,
          options: q.type === 'multiple' ? q.options.filter(o => o.trim()) : null,
          hint: q.hint.trim() || null
        }))
      }

      if (isEditing) {
        const result = await passagesApi.update(passage.id, passageData)
        onUpdated(result)
      } else {
        const result = await passagesApi.create(passageData)
        onCreated(result)
      }
    } catch (err) {
      showNotification(err.message || 'Failed to save passage', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="diagram-create-form" style={{ maxWidth: '100%' }}>
      <h3>{isEditing ? 'Edit Passage' : 'Create New Passage'}</h3>

      <div className="form-row">
        <div className="form-group">
          <label>Subject</label>
          <select
            value={formData.subject}
            onChange={(e) => {
              const newSubject = e.target.value
              setFormData(prev => ({
                ...prev,
                subject: newSubject,
                topic: TOPICS[newSubject]?.[0] || ''
              }))
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
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            >
              {currentTopics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Passage Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g. The Human Digestive System"
        />
      </div>

      <div className="form-group">
        <label>Passage Content</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Paste or type the full passage here..."
          rows={8}
          style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
        />
      </div>

      <div style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Questions ({questions.length})</h4>
        <button className="add-question-btn" onClick={addQuestion} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
          + Add Question
        </button>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '0.75rem',
          background: 'rgba(255,255,255,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ fontSize: '0.9rem' }}>Question {qi + 1}</strong>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={q.type}
                onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}
              >
                <option value="text">Type Answer</option>
                <option value="multiple">Multiple Choice</option>
              </select>
              {questions.length > 1 && (
                <button
                  className="delete-btn"
                  onClick={() => removeQuestion(qi)}
                  style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <input
              type="text"
              value={q.question}
              onChange={(e) => updateQuestion(qi, 'question', e.target.value)}
              placeholder="Enter question..."
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <input
              type="text"
              value={q.answer}
              onChange={(e) => updateQuestion(qi, 'answer', e.target.value)}
              placeholder="Correct answer..."
            />
          </div>

          {q.type === 'multiple' && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Options (include the correct answer)</label>
              {q.options.map((opt, oi) => (
                <input
                  key={oi}
                  type="text"
                  value={opt}
                  onChange={(e) => updateQuestionOption(qi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}`}
                  style={{ marginBottom: '0.25rem' }}
                />
              ))}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <input
              type="text"
              value={q.hint}
              onChange={(e) => updateQuestion(qi, 'hint', e.target.value)}
              placeholder="Hint (optional)"
              style={{ fontSize: '0.85rem', opacity: 0.8 }}
            />
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button
          className="add-question-btn"
          onClick={handleSubmit}
          disabled={isSaving || !formData.title.trim() || !formData.content.trim() || questions.every(q => !q.question.trim() || !q.answer.trim())}
        >
          {isSaving ? 'Saving...' : isEditing ? 'Update Passage' : 'Save Passage'}
        </button>
      </div>
    </div>
  )
}

// Earnings Section - Admin view of learner earnings with payout
function EarningsSection({ showNotification }) {
  const [learners, setLearners] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [payingOut, setPayingOut] = useState(null)

  useEffect(() => {
    loadEarnings()
  }, [])

  const loadEarnings = async () => {
    setIsLoading(true)
    try {
      const data = await learnerApi.getEarningsSummary()
      setLearners(data)
    } catch (err) {
      console.error('Failed to load earnings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayout = async (learnerId, learnerName) => {
    if (!confirm(`Pay out all unpaid earnings for ${learnerName}? This will reset their balance to KSh 0.`)) return

    setPayingOut(learnerId)
    try {
      const result = await learnerApi.payout(learnerId)
      showNotification(`Paid KSh ${result.paidAmount.toFixed(2)} to ${learnerName}`)
      loadEarnings()
    } catch (err) {
      showNotification('Payout failed: ' + (err.message || 'Server error'), 'error')
    } finally {
      setPayingOut(null)
    }
  }

  if (isLoading) {
    return <div className="sessions-loading">Loading earnings data...</div>
  }

  const totalUnpaid = learners.reduce((sum, l) => sum + l.unpaidTotal, 0)

  return (
    <div className="earnings-admin-section">
      <div className="sessions-header">
        <h2>Learner Earnings</h2>
        <button className="refresh-btn" onClick={loadEarnings}>Refresh</button>
      </div>

      <div className="earnings-admin-summary">
        <div className="stat-card">
          <span className="stat-value">KSh {totalUnpaid.toFixed(2)}</span>
          <span className="stat-label">Total Unpaid</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{learners.length}</span>
          <span className="stat-label">Learners</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">KSh 20.00</span>
          <span className="stat-label">Per Focus Block</span>
        </div>
      </div>

      {learners.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">&#128176;</span>
          <p>No learner earnings yet. Earnings are tracked after verified focus blocks are completed.</p>
        </div>
      ) : (
        <div className="earnings-learner-list">
          {learners.map(learner => (
            <div key={learner.id} className="earnings-learner-card">
              <div className="earnings-learner-info">
                <h3 className="earnings-learner-name">{learner.name}</h3>
                {learner.lastActive && (
                  <span className="earnings-last-active">
                    Last active: {new Date(learner.lastActive).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                )}
              </div>

              <div className="earnings-learner-stats">
                <div className="earnings-learner-stat">
                  <span className="earnings-learner-stat-value unpaid">KSh {learner.unpaidTotal.toFixed(2)}</span>
                  <span className="earnings-learner-stat-label">
                    Unpaid ({learner.unpaidFocusBlocks || 0} blocks, {Math.round(learner.unpaidFocusMinutes || 0)} verified minutes)
                  </span>
                </div>
                <div className="earnings-learner-stat">
                  <span className="earnings-learner-stat-value">KSh {learner.allTimeTotal.toFixed(2)}</span>
                  <span className="earnings-learner-stat-label">
                    All time ({learner.allTimeFocusBlocks || 0} blocks, {Math.round(learner.allTimeFocusMinutes || 0)} verified minutes)
                  </span>
                </div>
              </div>

              <div className="earnings-learner-actions">
                {learner.unpaidTotal > 0 ? (
                  <button
                    className="payout-btn"
                    onClick={() => handlePayout(learner.id, learner.name)}
                    disabled={payingOut === learner.id}
                  >
                    {payingOut === learner.id ? 'Processing...' : `Pay KSh ${learner.unpaidTotal.toFixed(2)}`}
                  </button>
                ) : (
                  <span className="paid-up-badge">Paid up</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
              <span className="column-desc">e.g. English, Agriculture, Social Studies, etc.</span>
            </div>
            <div className="column-item required">
              <span className="column-name">Topic</span>
              <span className="column-desc">e.g., Vocabulary, Grammar</span>
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
          placeholder='[{"question": "...", "answer": "...", "subject": "English", "topic": "Vocabulary", "type": "text"}]'
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

// ── Writing Section ─────────────────────────────────────────
function WritingSection({ showNotification }) {
  const [view, setView] = useState('submissions') // submissions | prompts | create | viewSubmission
  const [submissions, setSubmissions] = useState([])
  const [prompts, setPrompts] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [filterLearner, setFilterLearner] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  // New prompt form
  const [newPrompt, setNewPrompt] = useState({
    subject: 'English', topic: 'Handwriting', title: '', prompt_text: '', guide_lines: true
  })

  useEffect(() => {
    loadSubmissions()
    loadPrompts()
  }, [])

  const loadSubmissions = async () => {
    try {
      const params = {}
      if (filterLearner) params.learner_id = filterLearner
      const data = await writingApi.getSubmissions(params)
      setSubmissions(data)
    } catch (err) {
      console.error('Failed to load submissions:', err)
    }
  }

  const loadPrompts = async () => {
    try {
      const data = await writingApi.getPrompts()
      setPrompts(data)
    } catch (err) {
      console.error('Failed to load prompts:', err)
    }
  }

  useEffect(() => {
    loadSubmissions()
  }, [filterLearner])

  const handleViewSubmission = async (sub) => {
    try {
      const full = await writingApi.getSubmission(sub.id)
      setSelectedSubmission(full)
      setReviewRating(full.admin_rating || 0)
      setReviewFeedback(full.admin_feedback || '')
      setView('viewSubmission')
    } catch (err) {
      console.error('Failed to load submission:', err)
    }
  }

  const handleReview = async () => {
    if (!selectedSubmission) return
    setReviewSubmitting(true)
    try {
      await writingApi.reviewSubmission(selectedSubmission.id, {
        rating: reviewRating || null,
        feedback: reviewFeedback || null
      })
      showNotification('Review saved!')
      setView('submissions')
      loadSubmissions()
    } catch (err) {
      console.error('Review failed:', err)
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleCreatePrompt = async () => {
    if (!newPrompt.title || !newPrompt.prompt_text) return
    try {
      await writingApi.createPrompt(newPrompt)
      showNotification('Writing prompt created!')
      setNewPrompt({ subject: 'English', topic: 'Handwriting', title: '', prompt_text: '', guide_lines: true })
      loadPrompts()
      setView('prompts')
    } catch (err) {
      console.error('Create prompt failed:', err)
    }
  }

  const handleDeletePrompt = async (id) => {
    if (!confirm('Delete this writing prompt? All submissions for it will also be deleted.')) return
    try {
      await writingApi.deletePrompt(id)
      showNotification('Prompt deleted')
      loadPrompts()
    } catch (err) {
      console.error('Delete prompt failed:', err)
    }
  }

  const learnerNames = [...new Set(submissions.map(s => s.learner_name))].sort()

  if (view === 'viewSubmission' && selectedSubmission) {
    return (
      <div className="writing-admin-section">
        <button className="back-btn-admin" onClick={() => setView('submissions')}>
          &larr; Back to Submissions
        </button>

        <div className="submission-detail">
          <div className="submission-detail-header">
            <div>
              <h2>{selectedSubmission.prompt_title}</h2>
              <p className="submission-meta">
                By <strong>{selectedSubmission.learner_name}</strong> &middot;{' '}
                {selectedSubmission.subject} &middot; {selectedSubmission.topic} &middot;{' '}
                {new Date(selectedSubmission.submitted_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="submission-prompt-text">
            <strong>Prompt:</strong> {selectedSubmission.prompt_text}
          </div>

          <div className="submission-canvas-view">
            <WritingCanvas
              readOnly={true}
              initialStrokes={selectedSubmission.strokes_data}
              guideLines={true}
              height={500}
            />
          </div>

          <div className="review-form">
            <h3>Review</h3>
            <div className="review-stars">
              <label>Rating:</label>
              <div className="star-picker">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`star-btn ${n <= reviewRating ? 'active' : ''}`}
                    onClick={() => setReviewRating(n)}
                  >
                    {n <= reviewRating ? '\u2605' : '\u2606'}
                  </button>
                ))}
                {reviewRating > 0 && (
                  <button className="clear-rating-btn" onClick={() => setReviewRating(0)}>Clear</button>
                )}
              </div>
            </div>
            <div className="review-feedback-field">
              <label>Feedback:</label>
              <textarea
                value={reviewFeedback}
                onChange={e => setReviewFeedback(e.target.value)}
                placeholder="Great handwriting! Try to keep your letters more evenly spaced..."
                rows={3}
              />
            </div>
            <button
              className="save-review-btn"
              onClick={handleReview}
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="writing-admin-section">
      <div className="writing-admin-tabs">
        <button
          className={`writing-tab ${view === 'submissions' ? 'active' : ''}`}
          onClick={() => setView('submissions')}
        >
          Submissions ({submissions.length})
        </button>
        <button
          className={`writing-tab ${view === 'prompts' ? 'active' : ''}`}
          onClick={() => setView('prompts')}
        >
          Prompts ({prompts.length})
        </button>
        <button
          className={`writing-tab ${view === 'create' ? 'active' : ''}`}
          onClick={() => setView('create')}
        >
          + New Prompt
        </button>
      </div>

      {view === 'submissions' && (
        <>
          <div className="writing-filter-bar">
            <select value={filterLearner} onChange={e => setFilterLearner(e.target.value)}>
              <option value="">All Learners</option>
              {learnerNames.map(name => (
                <option key={name} value={submissions.find(s => s.learner_name === name)?.learner_id}>
                  {name}
                </option>
              ))}
            </select>
            <button className="refresh-btn-small" onClick={loadSubmissions}>Refresh</button>
          </div>

          {submissions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">&#128221;</span>
              <p>No writing submissions yet</p>
            </div>
          ) : (
            <div className="submissions-grid">
              {submissions.map(sub => (
                <div key={sub.id} className="submission-card" onClick={() => handleViewSubmission(sub)}>
                  {sub.thumbnail && (
                    <div className="submission-thumbnail">
                      <img src={sub.thumbnail} alt="Writing preview" />
                    </div>
                  )}
                  <div className="submission-card-body">
                    <h4>{sub.prompt_title}</h4>
                    <p className="submission-card-meta">
                      <strong>{sub.learner_name}</strong> &middot; {sub.subject}
                    </p>
                    <p className="submission-card-date">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                    <div className="submission-card-status">
                      {sub.admin_rating ? (
                        <span className="reviewed-badge">
                          Reviewed {'\u2605'.repeat(sub.admin_rating)}
                        </span>
                      ) : (
                        <span className="pending-badge">Needs Review</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'prompts' && (
        <div className="prompts-admin-list">
          {prompts.map(p => (
            <div key={p.id} className="prompt-admin-card">
              <div className="prompt-admin-header">
                <span className="prompt-admin-badge">{p.subject} &middot; {p.topic}</span>
                <button className="delete-prompt-btn" onClick={() => handleDeletePrompt(p.id)}>Delete</button>
              </div>
              <h4>{p.title}</h4>
              <p>{p.prompt_text}</p>
            </div>
          ))}
        </div>
      )}

      {view === 'create' && (
        <div className="create-prompt-form">
          <h3>Create Writing Prompt</h3>
          <div className="form-row">
            <label>Subject</label>
            <select value={newPrompt.subject} onChange={e => setNewPrompt({...newPrompt, subject: e.target.value})}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Topic</label>
            <input
              type="text"
              value={newPrompt.topic}
              onChange={e => setNewPrompt({...newPrompt, topic: e.target.value})}
              placeholder="e.g. Handwriting, Creative Writing..."
            />
          </div>
          <div className="form-row">
            <label>Title</label>
            <input
              type="text"
              value={newPrompt.title}
              onChange={e => setNewPrompt({...newPrompt, title: e.target.value})}
              placeholder="e.g. Write the Alphabet"
            />
          </div>
          <div className="form-row">
            <label>Prompt Text (what the student sees)</label>
            <textarea
              value={newPrompt.prompt_text}
              onChange={e => setNewPrompt({...newPrompt, prompt_text: e.target.value})}
              placeholder="Write detailed instructions for the student..."
              rows={5}
            />
          </div>
          <div className="form-row checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={newPrompt.guide_lines}
                onChange={e => setNewPrompt({...newPrompt, guide_lines: e.target.checked})}
              />
              Show guide lines on canvas
            </label>
          </div>
          <button
            className="create-prompt-submit-btn"
            onClick={handleCreatePrompt}
            disabled={!newPrompt.title || !newPrompt.prompt_text}
          >
            Create Prompt
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminPage
