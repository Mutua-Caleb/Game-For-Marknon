import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { subjects, topics } from '../data/defaultQuestions'
import './AdminPage.css'

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
    setQuestions
  } = useGame()

  const [activeTab, setActiveTab] = useState('questions')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Check authentication
  useEffect(() => {
    const authToken = sessionStorage.getItem('adminAuth')
    if (authToken !== 'authenticated') {
      navigate('/admin-portal-x7k9')
    }
  }, [navigate])

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth')
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

  const failedQuestions = getMostFailedQuestions(10)

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="header-left">
          <h1>📚 Question Manager</h1>
        </div>
        <div className="header-right">
          <button className="preview-btn" onClick={() => navigate('/')}>
            👁️ Preview Game
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          📝 Questions ({questions.length})
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 Import/Export
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
                  {subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  disabled={!filterSubject}
                >
                  <option value="">All Topics</option>
                  {filterSubject && topics[filterSubject].map(t => (
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
                ➕ Add Question
              </button>
            </div>

            <div className="questions-list">
              {filteredQuestions.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
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
          <div className="analytics-section">
            <div className="analytics-grid">
              <div className="stat-card">
                <span className="stat-icon">📝</span>
                <span className="stat-value">{questions.length}</span>
                <span className="stat-label">Total Questions</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🔬</span>
                <span className="stat-value">
                  {questions.filter(q => q.subject === 'Science').length}
                </span>
                <span className="stat-label">Science Questions</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📚</span>
                <span className="stat-value">
                  {questions.filter(q => q.subject === 'English').length}
                </span>
                <span className="stat-label">English Questions</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🖼️</span>
                <span className="stat-value">
                  {questions.filter(q => q.image).length}
                </span>
                <span className="stat-label">With Images</span>
              </div>
            </div>

            <div className="failed-questions-section">
              <h2>❌ Most Missed Questions</h2>
              <p className="section-description">
                These questions are automatically shown more frequently to help students learn.
              </p>
              {failedQuestions.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📊</span>
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
                        <div className="failed-topic">{q.subject} → {q.topic}</div>
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

              <button
                className="reset-stats-btn"
                onClick={() => {
                  if (confirm('Are you sure? This will reset all player statistics.')) {
                    resetStats()
                  }
                }}
              >
                🔄 Reset All Statistics
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <ImportExportSection
            questions={questions}
            setQuestions={setQuestions}
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
            onSave={(questionData) => {
              if (editingQuestion) {
                updateQuestion(editingQuestion.id, questionData)
              } else {
                addQuestion(questionData)
              }
              setShowAddModal(false)
              setEditingQuestion(null)
            }}
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
                <button
                  className="cancel-btn"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="delete-btn"
                  onClick={() => {
                    deleteQuestion(showDeleteConfirm.id)
                    setShowDeleteConfirm(null)
                  }}
                >
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
  const typeLabel = question.type === 'multiple' ? '🔘 Multiple Choice' : '⌨️ Type Answer'

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
        <div className="question-text">{question.question}</div>
        <div className="answer-text">
          <strong>Answer:</strong> {question.answer}
        </div>
        {question.options && (
          <div className="options-preview">
            <strong>Options:</strong> {question.options.join(', ')}
          </div>
        )}
        {question.hint && (
          <div className="hint-text">
            <strong>Hint:</strong> {question.hint}
          </div>
        )}
        {question.image && (
          <div className="image-preview">
            <img src={question.image} alt="Question" />
          </div>
        )}
      </div>

      {stats && (
        <div className="card-stats">
          <span className="stat correct">✅ {stats.correct}</span>
          <span className="stat wrong">❌ {stats.wrong}</span>
        </div>
      )}

      <div className="card-actions">
        <button className="edit-btn" onClick={onEdit}>✏️ Edit</button>
        <button className="delete-btn" onClick={onDelete}>🗑️ Delete</button>
      </div>
    </motion.div>
  )
}

// Question Modal Component
function QuestionModal({ question, onClose, onSave }) {
  const [formData, setFormData] = useState({
    subject: question?.subject || 'Science',
    topic: question?.topic || 'Human Body',
    question: question?.question || '',
    answer: question?.answer || '',
    type: question?.type || 'text',
    options: question?.options || ['', '', '', ''],
    hint: question?.hint || '',
    image: question?.image || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...formData,
      options: formData.type === 'multiple' ? formData.options.filter(o => o.trim()) : null
    }
    onSave(data)
  }

  const updateOption = (index, value) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
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
                  setFormData({
                    ...formData,
                    subject: e.target.value,
                    topic: topics[e.target.value][0]
                  })
                }}
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Topic</label>
              <select
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              >
                {topics[formData.subject].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
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
              <div className="options-inputs">
                {formData.options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                ))}
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

          <div className="form-group">
            <label>Image URL (optional)</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
            {formData.image && (
              <div className="image-preview-small">
                <img src={formData.image} alt="Preview" />
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {question ? 'Save Changes' : 'Add Question'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Import/Export Section
function ImportExportSection({ questions, setQuestions }) {
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

  const handleExport = () => {
    const dataStr = JSON.stringify(questions, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wordblaster-questions-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    try {
      const data = JSON.parse(importText)
      if (!Array.isArray(data)) {
        throw new Error('Invalid format: expected an array of questions')
      }
      // Validate basic structure
      const validQuestions = data.filter(q =>
        q.question && q.answer && q.subject && q.topic
      ).map(q => ({
        ...q,
        id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))

      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in import data')
      }

      setQuestions(prev => [...prev, ...validQuestions])
      setImportText('')
      setImportError('')
      alert(`Successfully imported ${validQuestions.length} questions!`)
    } catch (error) {
      setImportError(error.message)
    }
  }

  return (
    <div className="import-export-section">
      <div className="export-section">
        <h2>📤 Export Questions</h2>
        <p>Download all questions as a JSON file for backup or sharing.</p>
        <button className="export-btn" onClick={handleExport}>
          Download Questions ({questions.length})
        </button>
      </div>

      <div className="import-section">
        <h2>📥 Import Questions</h2>
        <p>Paste JSON data to add new questions. Questions must have: question, answer, subject, topic.</p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='[{"question": "...", "answer": "...", "subject": "Science", "topic": "Physics", "type": "text"}]'
          rows={10}
        />
        {importError && <div className="import-error">{importError}</div>}
        <button
          className="import-btn"
          onClick={handleImport}
          disabled={!importText.trim()}
        >
          Import Questions
        </button>
      </div>

      <div className="template-section">
        <h2>📋 Question Template</h2>
        <pre className="template-code">
{`[
  {
    "question": "What organ pumps blood?",
    "answer": "heart",
    "subject": "Science",
    "topic": "Human Body",
    "type": "text",
    "hint": "It beats about 100,000 times a day",
    "image": null
  },
  {
    "question": "What is 2 + 2?",
    "answer": "4",
    "subject": "Science",
    "topic": "Physics",
    "type": "multiple",
    "options": ["2", "3", "4", "5"],
    "hint": "Count on your fingers"
  }
]`}
        </pre>
      </div>
    </div>
  )
}

export default AdminPage
