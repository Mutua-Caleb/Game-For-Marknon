import { useState, useEffect, useRef, useCallback } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  uploadApi,
  questionsApi,
  diagramsApi,
  passagesApi,
  learnerApi,
  writingApi
} from '../../utils/api'
import WritingCanvas from '../WritingCanvas'
import { ALL_ADMIN_SUBJECTS, ALL_ADMIN_TOPICS } from '../../data/curriculum'
import { getSubjectTone } from './adminFormatters'

const SUBJECTS = ALL_ADMIN_SUBJECTS
const TOPICS = ALL_ADMIN_TOPICS

// ============================================================================
// 1. QUESTIONS MANAGER VIEW
// ============================================================================
export function QuestionsView({
  questions,
  questionStats,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  showNotification
}) {
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  const filteredQuestions = questions.filter(q => {
    if (filterSubject && q.subject !== filterSubject) return false
    if (filterTopic && q.topic !== filterTopic) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        String(q.question || '').toLowerCase().includes(query) ||
        String(q.answer || '').toLowerCase().includes(query) ||
        String(q.topic || '').toLowerCase().includes(query)
      )
    }
    return true
  })

  const availableTopics = filterSubject
    ? [...new Set(questions.filter(q => q.subject === filterSubject).map(q => q.topic))]
    : []

  const handleSave = async (questionData) => {
    try {
      if (editingQuestion) {
        await onUpdateQuestion(editingQuestion.id, questionData)
        showNotification('Question updated successfully!')
      } else {
        await onAddQuestion(questionData)
        showNotification('Question added successfully!')
      }
      setShowAddModal(false)
      setEditingQuestion(null)
    } catch (err) {
      showNotification(err.message || 'Failed to save question', 'error')
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) return
    try {
      await onDeleteQuestion(showDeleteConfirm.id)
      setShowDeleteConfirm(null)
      showNotification('Question deleted')
    } catch {
      showNotification('Failed to delete question', 'error')
    }
  }

  return (
    <div className="adm-view">
      <section className="adm-panel adm-date-controller">
        <div className="adm-filter-bar">
          <div className="adm-filter-group">
            <label htmlFor="q-filter-subj">Subject</label>
            <select
              id="q-filter-subj"
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value)
                setFilterTopic('')
              }}
            >
              <option value="">All Subjects</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="adm-filter-group">
            <label htmlFor="q-filter-topic">Topic</label>
            <select
              id="q-filter-topic"
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              disabled={!filterSubject}
            >
              <option value="">All Topics</option>
              {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="adm-filter-group adm-filter-grow">
            <label htmlFor="q-filter-search">Search</label>
            <input
              id="q-filter-search"
              type="text"
              placeholder="Search questions or answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="adm-btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Question
          </button>
        </div>
      </section>

      <div className="adm-cms-grid">
        {filteredQuestions.length === 0 ? (
          <div className="adm-panel adm-empty-box">
            <h3>No questions found</h3>
            <p>Adjust your filters or add a new question to the bank.</p>
          </div>
        ) : (
          filteredQuestions.map(q => {
            const stats = questionStats[q.id]
            const opts = q.options
              ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options))
              : null
            return (
              <article key={q.id} className="adm-panel adm-cms-card">
                <div className="adm-cms-card-top">
                  <div className="adm-q-sub-tags">
                    <span className={`adm-subj-badge tone-${getSubjectTone(q.subject)}`}>
                      {q.subject}
                    </span>
                    <span className="adm-q-topic-tag">{q.topic}</span>
                    <span className="adm-mode-badge">
                      {q.type === 'multiple' ? 'Multiple Choice' : 'Type Answer'}
                    </span>
                  </div>
                  <div className="adm-cms-actions">
                    <button type="button" className="adm-btn-secondary" onClick={() => setEditingQuestion(q)}>
                      Edit
                    </button>
                    <button type="button" className="adm-btn-danger-outline" onClick={() => setShowDeleteConfirm(q)}>
                      Delete
                    </button>
                  </div>
                </div>

                {q.image && (
                  <div className="adm-cms-thumb">
                    <img src={q.image} alt="Question" onError={(e) => { e.target.style.display = 'none' }} />
                  </div>
                )}

                <div className="adm-cms-question">{q.question}</div>
                <div className="adm-cms-meta-lines">
                  <div><strong>Answer:</strong> <span className="c-good">{q.answer}</span></div>
                  {opts && <div><strong>Options:</strong> {opts.join(' · ')}</div>}
                  {q.hint && <div><strong>Hint:</strong> {q.hint}</div>}
                </div>

                {stats && (stats.correct > 0 || stats.wrong > 0) && (
                  <div className="adm-cms-stats-bar mono-num">
                    <span className="c-good">Right: {stats.correct}</span>
                    <span className="c-bad">Missed: {stats.wrong}</span>
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {(showAddModal || editingQuestion) && (
          <QuestionModal
            question={editingQuestion}
            onClose={() => {
              setShowAddModal(false)
              setEditingQuestion(null)
            }}
            onSave={handleSave}
            showNotification={showNotification}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmDeleteModal
            title="Delete Question?"
            description={`"${showDeleteConfirm.question}"`}
            onCancel={() => setShowDeleteConfirm(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ConfirmDeleteModal({ title, description, onCancel, onConfirm }) {
  return (
    <Motion.div
      className="adm-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <Motion.div
        className="adm-modal-box adm-modal-sm"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        <p className="adm-muted-note">{description}</p>
        <div className="adm-modal-actions">
          <button type="button" className="adm-btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="adm-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

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

  return (
    <Motion.div
      className="adm-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.div
        className="adm-modal-box"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{question ? 'Edit Question' : 'Add New Question'}</h3>
        <form onSubmit={handleSubmit} className="adm-form-stack">
          <div className="adm-form-row-2">
            <div className="adm-field">
              <label>Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => {
                  const s = e.target.value
                  setFormData({ ...formData, subject: s, topic: TOPICS[s]?.[0] || '' })
                  setUseCustomTopic(false)
                }}
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label className="adm-label-with-link">
                <span>Topic</span>
                <button type="button" className="adm-clear-link" onClick={() => setUseCustomTopic(v => !v)}>
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
                  {currentTopics.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="adm-field">
            <label>Question</label>
            <textarea
              rows={3}
              required
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Enter the question..."
            />
          </div>

          <div className="adm-field">
            <label>Question Image (optional)</label>
            <div className="adm-upload-row">
              {formData.image && (
                <img src={formData.image} alt="Preview" className="adm-upload-preview" />
              )}
              <button
                type="button"
                className="adm-btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : formData.image ? 'Change Image' : 'Upload Image'}
              </button>
              {formData.image && (
                <button
                  type="button"
                  className="adm-btn-danger-outline"
                  onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                >
                  Remove
                </button>
              )}
              <input
                type="url"
                value={formData.image || ''}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="Or paste image URL..."
                className="adm-flex-input"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="adm-form-row-2">
            <div className="adm-field">
              <label>Answer Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="text">Type Answer</option>
                <option value="multiple">Multiple Choice</option>
              </select>
            </div>
            <div className="adm-field">
              <label>Correct Answer</label>
              <input
                type="text"
                required
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter the correct answer..."
              />
            </div>
          </div>

          {formData.type === 'multiple' && (
            <div className="adm-field">
              <label>Options (include the correct answer)</label>
              <div className="adm-options-stack">
                {formData.options.map((opt, i) => (
                  <div key={i} className="adm-option-row">
                    <span className="adm-opt-letter mono-num">{String.fromCharCode(65 + i)}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...formData.options]
                        next[i] = e.target.value
                        setFormData({ ...formData, options: next })
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        className="adm-btn-danger-outline"
                        onClick={() => setFormData(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }))}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {formData.options.length < 6 && (
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    onClick={() => setFormData(prev => ({ ...prev, options: [...prev.options, ''] }))}
                  >
                    + Add Option
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="adm-field">
            <label>Hint (optional)</label>
            <input
              type="text"
              value={formData.hint}
              onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
              placeholder="Helpful clue for the student..."
            />
          </div>

          <div className="adm-modal-actions">
            <button type="button" className="adm-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="adm-btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : question ? 'Save Changes' : 'Add Question'}
            </button>
          </div>
        </form>
      </Motion.div>
    </Motion.div>
  )
}

// ============================================================================
// 2. EARNINGS & PAYOUTS VIEW
// ============================================================================
export function EarningsView({ showNotification }) {
  const [learners, setLearners] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [payingOut, setPayingOut] = useState(null)

  const loadEarnings = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await learnerApi.getEarningsSummary()
      setLearners(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load earnings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEarnings()
  }, [loadEarnings])

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

  const totalUnpaid = learners.reduce((sum, l) => sum + l.unpaidTotal, 0)
  const totalAllTime = learners.reduce((sum, l) => sum + l.allTimeTotal, 0)

  return (
    <div className="adm-view">
      <section className="adm-kpi-grid adm-kpi-grid-4">
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Total Unpaid Balance</span>
          <strong className="adm-kpi-value mono-num tone-mid">KSh {totalUnpaid.toFixed(2)}</strong>
          <span className="adm-kpi-sub">Pending payout</span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">All-Time Earned</span>
          <strong className="adm-kpi-value mono-num">KSh {totalAllTime.toFixed(2)}</strong>
          <span className="adm-kpi-sub">Across all verified blocks</span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Learners</span>
          <strong className="adm-kpi-value mono-num">{learners.length}</strong>
          <span className="adm-kpi-sub">Tracked accounts</span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Reward Rate</span>
          <strong className="adm-kpi-value mono-num">KSh 20.00</strong>
          <span className="adm-kpi-sub">Per 20-min verified block</span>
        </div>
      </section>

      <section className="adm-panel adm-tests-panel">
        <div className="adm-card-head">
          <h3>Learner Balances</h3>
          <button type="button" className="adm-btn-secondary" onClick={loadEarnings}>Refresh</button>
        </div>

        {isLoading ? (
          <div className="adm-loading-box">Loading earnings...</div>
        ) : learners.length === 0 ? (
          <div className="adm-empty-box">
            <h3>No learner earnings yet</h3>
            <p>Earnings accumulate automatically when verified focus blocks are completed.</p>
          </div>
        ) : (
          <div className="adm-earnings-list">
            {learners.map(learner => (
              <div key={learner.id} className="adm-earning-row">
                <div>
                  <strong>{learner.name}</strong>
                  <div className="adm-muted-note">
                    {learner.lastActive
                      ? `Last active: ${new Date(learner.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : 'No activity recorded yet'}
                  </div>
                </div>
                <div className="adm-earning-nums">
                  <div>
                    <span className="adm-st-lbl">Unpaid</span>
                    <strong className="mono-num tone-mid">KSh {learner.unpaidTotal.toFixed(2)}</strong>
                    <small className="mono-num">
                      {learner.unpaidFocusBlocks || 0} blocks · {Math.round(learner.unpaidFocusMinutes || 0)} min
                    </small>
                  </div>
                  <div>
                    <span className="adm-st-lbl">All Time</span>
                    <strong className="mono-num">KSh {learner.allTimeTotal.toFixed(2)}</strong>
                    <small className="mono-num">
                      {learner.allTimeFocusBlocks || 0} blocks · {Math.round(learner.allTimeFocusMinutes || 0)} min
                    </small>
                  </div>
                </div>
                <div>
                  {learner.unpaidTotal > 0 ? (
                    <button
                      type="button"
                      className="adm-btn-primary"
                      onClick={() => handlePayout(learner.id, learner.name)}
                      disabled={payingOut === learner.id}
                    >
                      {payingOut === learner.id ? 'Processing...' : `Pay KSh ${learner.unpaidTotal.toFixed(2)}`}
                    </button>
                  ) : (
                    <span className="adm-status-badge is-done">Paid Up</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ============================================================================
// 3. PASSAGES MANAGER VIEW
// ============================================================================
export function PassagesView({ showNotification }) {
  const [passages, setPassages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadPassages = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await passagesApi.getAll()
      setPassages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load passages:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPassages()
  }, [loadPassages])

  const handleDelete = async (id) => {
    try {
      await passagesApi.delete(id)
      setPassages(prev => prev.filter(p => p.id !== id))
      setDeleteTarget(null)
      showNotification('Passage deleted')
    } catch {
      showNotification('Failed to delete passage', 'error')
    }
  }

  return (
    <div className="adm-view">
      <div className="adm-panel adm-tests-panel">
        <div className="adm-card-head">
          <h3>Reading Passages ({passages.length})</h3>
          <div className="adm-toolbar-actions">
            <button type="button" className="adm-btn-secondary" onClick={loadPassages}>Refresh</button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={() => {
                setShowForm(v => !v)
                setEditing(null)
              }}
            >
              {showForm && !editing ? 'Cancel' : '+ Add Passage'}
            </button>
          </div>
        </div>

        {showForm && (
          <PassageForm
            passage={editing}
            onSaved={(saved, isEdit) => {
              setPassages(prev => isEdit ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev])
              setShowForm(false)
              setEditing(null)
              showNotification(isEdit ? 'Passage updated!' : 'Passage created!')
            }}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
            showNotification={showNotification}
          />
        )}

        {isLoading ? (
          <div className="adm-loading-box">Loading passages...</div>
        ) : passages.length === 0 && !showForm ? (
          <div className="adm-empty-box">
            <h3>No custom passages yet</h3>
            <p>Click &ldquo;+ Add Passage&rdquo; to create a comprehension passage with questions.</p>
          </div>
        ) : (
          <div className="adm-cms-grid">
            {passages.map(p => (
              <article key={p.id} className="adm-panel adm-cms-card">
                <div className="adm-cms-card-top">
                  <div>
                    <h4>{p.title}</h4>
                    <div className="adm-q-sub-tags">
                      <span className={`adm-tiny-tag tone-${getSubjectTone(p.subject)}`}>{p.subject}</span>
                      <span className="adm-q-topic-tag">{p.topic}</span>
                      <span className="adm-mode-badge">{p.questions?.length || 0} questions</span>
                    </div>
                  </div>
                  <div className="adm-cms-actions">
                    <button
                      type="button"
                      className="adm-btn-secondary"
                      onClick={() => {
                        setEditing(p)
                        setShowForm(true)
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="adm-btn-danger-outline" onClick={() => setDeleteTarget(p)}>
                      Delete
                    </button>
                  </div>
                </div>
                <p className="adm-muted-note">
                  {String(p.content || '').slice(0, 220)}{String(p.content || '').length > 220 ? '...' : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            title="Delete Passage?"
            description={`"${deleteTarget.title}" (${deleteTarget.questions?.length || 0} questions)`}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => handleDelete(deleteTarget.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PassageForm({ passage, onSaved, onCancel, showNotification }) {
  const isEditing = Boolean(passage)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valid = questions.filter(q => q.question.trim() && q.answer.trim())
    if (!formData.title.trim() || !formData.content.trim() || valid.length === 0) {
      showNotification('Title, content, and at least one question with an answer are required.', 'error')
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        id: isEditing ? passage.id : `passage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        subject: formData.subject,
        topic: formData.topic,
        title: formData.title.trim(),
        content: formData.content.trim(),
        questions: valid.map(q => ({
          question: q.question.trim(),
          answer: q.answer.trim(),
          type: q.type,
          options: q.type === 'multiple' ? q.options.filter(o => o.trim()) : null,
          hint: q.hint.trim() || null
        }))
      }
      const res = isEditing
        ? await passagesApi.update(passage.id, payload)
        : await passagesApi.create(payload)
      onSaved(res, isEditing)
    } catch (err) {
      showNotification(err.message || 'Failed to save passage', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="adm-sub-form" onSubmit={handleSubmit}>
      <h4>{isEditing ? 'Edit Passage' : 'Create New Passage'}</h4>
      <div className="adm-form-row-2">
        <div className="adm-field">
          <label>Subject</label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value, topic: TOPICS[e.target.value]?.[0] || '' })}
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label>Topic</label>
          <input
            type="text"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          />
        </div>
      </div>
      <div className="adm-field">
        <label>Passage Title</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. The Fog on the Moor"
        />
      </div>
      <div className="adm-field">
        <label>Passage Content</label>
        <textarea
          rows={6}
          required
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Paste or type the passage text..."
        />
      </div>

      <div className="adm-card-head">
        <strong>Comprehension Questions ({questions.length})</strong>
        <button
          type="button"
          className="adm-btn-secondary"
          onClick={() => setQuestions(prev => [...prev, { question: '', answer: '', type: 'text', options: ['', '', '', ''], hint: '' }])}
        >
          + Add Question
        </button>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="adm-nested-box">
          <div className="adm-cms-card-top">
            <strong>Question {qi + 1}</strong>
            <div className="adm-cms-actions">
              <select
                value={q.type}
                onChange={(e) => setQuestions(prev => prev.map((item, idx) => idx === qi ? { ...item, type: e.target.value } : item))}
              >
                <option value="text">Type Answer</option>
                <option value="multiple">Multiple Choice</option>
              </select>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="adm-btn-danger-outline"
                  onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== qi))}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder="Question prompt..."
            value={q.question}
            onChange={(e) => setQuestions(prev => prev.map((item, idx) => idx === qi ? { ...item, question: e.target.value } : item))}
          />
          <input
            type="text"
            placeholder="Correct answer..."
            value={q.answer}
            onChange={(e) => setQuestions(prev => prev.map((item, idx) => idx === qi ? { ...item, answer: e.target.value } : item))}
          />
          {q.type === 'multiple' && (
            <div className="adm-form-row-2">
              {q.options.map((opt, oi) => (
                <input
                  key={oi}
                  type="text"
                  placeholder={`Option ${oi + 1}`}
                  value={opt}
                  onChange={(e) => setQuestions(prev => prev.map((item, idx) => {
                    if (idx !== qi) return item
                    const nextOpts = [...item.options]
                    nextOpts[oi] = e.target.value
                    return { ...item, options: nextOpts }
                  }))}
                />
              ))}
            </div>
          )}
          <input
            type="text"
            placeholder="Hint (optional)"
            value={q.hint}
            onChange={(e) => setQuestions(prev => prev.map((item, idx) => idx === qi ? { ...item, hint: e.target.value } : item))}
          />
        </div>
      ))}

      <div className="adm-modal-actions">
        <button type="button" className="adm-btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="adm-btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving...' : isEditing ? 'Update Passage' : 'Save Passage'}
        </button>
      </div>
    </form>
  )
}

// ============================================================================
// 4. DIAGRAMS MANAGER VIEW
// ============================================================================
export function DiagramsView({ showNotification }) {
  const [diagrams, setDiagrams] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadDiagrams = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await diagramsApi.getAll()
      setDiagrams(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load diagrams:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDiagrams()
  }, [loadDiagrams])

  const handleDelete = async (id) => {
    try {
      await diagramsApi.delete(id)
      setDiagrams(prev => prev.filter(d => d.id !== id))
      setDeleteTarget(null)
      showNotification('Diagram deleted')
    } catch {
      showNotification('Failed to delete diagram', 'error')
    }
  }

  return (
    <div className="adm-view">
      <div className="adm-panel adm-tests-panel">
        <div className="adm-card-head">
          <h3>Labeled Diagrams ({diagrams.length})</h3>
          <div className="adm-toolbar-actions">
            <button type="button" className="adm-btn-secondary" onClick={loadDiagrams}>Refresh</button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={() => {
                setShowForm(v => !v)
                setEditing(null)
              }}
            >
              {showForm && !editing ? 'Cancel' : '+ Add Diagram'}
            </button>
          </div>
        </div>

        {showForm && (
          <DiagramForm
            diagram={editing}
            onSaved={(saved, isEdit) => {
              setDiagrams(prev => isEdit ? prev.map(d => d.id === saved.id ? saved : d) : [saved, ...prev])
              setShowForm(false)
              setEditing(null)
              showNotification(isEdit ? 'Diagram updated!' : 'Diagram created!')
            }}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
            showNotification={showNotification}
          />
        )}

        {isLoading ? (
          <div className="adm-loading-box">Loading diagrams...</div>
        ) : diagrams.length === 0 && !showForm ? (
          <div className="adm-empty-box">
            <h3>No diagrams yet</h3>
            <p>Click &ldquo;+ Add Diagram&rdquo; to upload an image and configure A/B/C answer labels.</p>
          </div>
        ) : (
          <div className="adm-cms-grid">
            {diagrams.map(d => (
              <article key={d.id} className="adm-panel adm-cms-card">
                <div className="adm-cms-card-top">
                  <div>
                    <h4>{d.title}</h4>
                    <div className="adm-q-sub-tags">
                      <span className={`adm-tiny-tag tone-${getSubjectTone(d.subject)}`}>{d.subject}</span>
                      <span className="adm-q-topic-tag">{d.topic}</span>
                      <span className="adm-mode-badge">{d.labels?.length || 0} labels</span>
                    </div>
                  </div>
                  <div className="adm-cms-actions">
                    <button type="button" className="adm-btn-secondary" onClick={() => { setEditing(d); setShowForm(true) }}>
                      Edit
                    </button>
                    <button type="button" className="adm-btn-danger-outline" onClick={() => setDeleteTarget(d)}>
                      Delete
                    </button>
                  </div>
                </div>
                {d.image_url && (
                  <div className="adm-cms-thumb">
                    <img src={d.image_url} alt={d.title} />
                  </div>
                )}
                {d.labels?.length > 0 && (
                  <div className="adm-topic-chip-row">
                    {d.labels.map(l => (
                      <span key={l.label_key} className="adm-topic-stat-chip">
                        <strong>{l.label_key}</strong> = {l.correct_answer}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            title="Delete Diagram?"
            description={`"${deleteTarget.title}" (${deleteTarget.labels?.length || 0} labels)`}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => handleDelete(deleteTarget.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function DiagramForm({ diagram, onSaved, onCancel, showNotification }) {
  const isEditing = Boolean(diagram)
  const [formData, setFormData] = useState({
    subject: diagram?.subject || 'English',
    topic: diagram?.topic || 'Vocabulary',
    title: diagram?.title || '',
    description: diagram?.description || ''
  })
  const [imageUrl, setImageUrl] = useState(diagram?.image_url || '')
  const [labels, setLabels] = useState(diagram?.labels || [{ label_key: 'A', correct_answer: '', hint: '' }])
  const [isSaving, setIsSaving] = useState(false)
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image must be under 5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result)
    reader.readAsDataURL(file)
  }

  const addLabel = () => {
    const used = new Set(labels.map(l => l.label_key))
    let nextKey = 'A'
    for (let i = 0; i < 26; i += 1) {
      const letter = String.fromCharCode(65 + i)
      if (!used.has(letter)) {
        nextKey = letter
        break
      }
    }
    setLabels(prev => [...prev, { label_key: nextKey, correct_answer: '', hint: '' }])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validLabels = labels.filter(l => l.correct_answer.trim())
    if (!formData.title.trim() || !imageUrl || validLabels.length === 0) {
      showNotification('Title, image, and at least one labeled answer are required.', 'error')
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        subject: formData.subject,
        topic: formData.topic,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        image_url: imageUrl,
        labels: validLabels
      }
      const res = isEditing
        ? await diagramsApi.update(diagram.id, payload)
        : await diagramsApi.create({ id: `diag_${Date.now()}`, ...payload })
      onSaved(res, isEditing)
    } catch (err) {
      showNotification(err.message || 'Failed to save diagram', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="adm-sub-form" onSubmit={handleSubmit}>
      <h4>{isEditing ? 'Edit Diagram' : 'Create New Diagram'}</h4>
      <div className="adm-form-row-2">
        <div className="adm-field">
          <label>Subject</label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value, topic: TOPICS[e.target.value]?.[0] || '' })}
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label>Topic</label>
          <input type="text" value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} />
        </div>
      </div>
      <div className="adm-form-row-2">
        <div className="adm-field">
          <label>Title</label>
          <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
        </div>
        <div className="adm-field">
          <label>Description (optional)</label>
          <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </div>
      </div>

      <div className="adm-field">
        <label>Diagram Image</label>
        <div className="adm-upload-row">
          <button type="button" className="adm-btn-secondary" onClick={() => fileRef.current?.click()}>
            {imageUrl ? 'Change Image' : 'Upload Image'}
          </button>
          <input
            type="url"
            className="adm-flex-input"
            placeholder="Or paste image URL..."
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
        {imageUrl && (
          <div className="adm-cms-thumb" style={{ marginTop: '0.75rem' }}>
            <img src={imageUrl} alt="Diagram preview" />
          </div>
        )}
      </div>

      <div className="adm-card-head">
        <strong>Answer Labels ({labels.length})</strong>
        <button type="button" className="adm-btn-secondary" onClick={addLabel}>+ Add Label</button>
      </div>

      <div className="adm-options-stack">
        {labels.map((lbl, idx) => (
          <div key={idx} className="adm-option-row">
            <input
              type="text"
              style={{ width: 56, textAlign: 'center', fontWeight: 700 }}
              value={lbl.label_key}
              onChange={(e) => setLabels(prev => prev.map((l, i) => i === idx ? { ...l, label_key: e.target.value.toUpperCase().slice(0, 3) } : l))}
            />
            <input
              type="text"
              placeholder="Correct answer..."
              value={lbl.correct_answer}
              onChange={(e) => setLabels(prev => prev.map((l, i) => i === idx ? { ...l, correct_answer: e.target.value } : l))}
            />
            <input
              type="text"
              placeholder="Hint (optional)"
              value={lbl.hint || ''}
              onChange={(e) => setLabels(prev => prev.map((l, i) => i === idx ? { ...l, hint: e.target.value } : l))}
            />
            {labels.length > 1 && (
              <button
                type="button"
                className="adm-btn-danger-outline"
                onClick={() => setLabels(prev => prev.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="adm-modal-actions">
        <button type="button" className="adm-btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="adm-btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving...' : isEditing ? 'Update Diagram' : 'Save Diagram'}
        </button>
      </div>
    </form>
  )
}

// ============================================================================
// 5. WRITING SUBMISSIONS & PROMPTS VIEW
// ============================================================================
export function WritingView({ showNotification }) {
  const [subView, setSubView] = useState('submissions')
  const [submissions, setSubmissions] = useState([])
  const [prompts, setPrompts] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [filterLearner, setFilterLearner] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [newPrompt, setNewPrompt] = useState({
    subject: 'English',
    topic: 'Handwriting',
    title: '',
    prompt_text: '',
    guide_lines: true
  })

  const loadSubmissions = useCallback(async () => {
    try {
      const params = filterLearner ? { learner_id: filterLearner } : {}
      const data = await writingApi.getSubmissions(params)
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load writing submissions:', err)
    }
  }, [filterLearner])

  const loadPrompts = useCallback(async () => {
    try {
      const data = await writingApi.getPrompts()
      setPrompts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load prompts:', err)
    }
  }, [])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  const handleViewSubmission = async (sub) => {
    try {
      const full = await writingApi.getSubmission(sub.id)
      setSelectedSubmission(full)
      setReviewRating(full.admin_rating || 0)
      setReviewFeedback(full.admin_feedback || '')
      setSubView('detail')
    } catch (err) {
      console.error('Failed to load submission:', err)
    }
  }

  const handleSaveReview = async () => {
    if (!selectedSubmission) return
    setReviewSubmitting(true)
    try {
      await writingApi.reviewSubmission(selectedSubmission.id, {
        rating: reviewRating || null,
        feedback: reviewFeedback || null
      })
      showNotification('Writing review saved!')
      setSubView('submissions')
      loadSubmissions()
    } catch {
      showNotification('Failed to save review', 'error')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleCreatePrompt = async (e) => {
    e.preventDefault()
    if (!newPrompt.title.trim() || !newPrompt.prompt_text.trim()) return
    try {
      await writingApi.createPrompt(newPrompt)
      showNotification('Writing prompt created!')
      setNewPrompt({ subject: 'English', topic: 'Handwriting', title: '', prompt_text: '', guide_lines: true })
      loadPrompts()
      setSubView('prompts')
    } catch {
      showNotification('Failed to create prompt', 'error')
    }
  }

  const handleDeletePrompt = async (id) => {
    if (!confirm('Delete this writing prompt and all its submissions?')) return
    try {
      await writingApi.deletePrompt(id)
      showNotification('Prompt deleted')
      loadPrompts()
    } catch {
      showNotification('Failed to delete prompt', 'error')
    }
  }

  if (subView === 'detail' && selectedSubmission) {
    return (
      <div className="adm-view">
        <div className="adm-panel adm-tests-panel">
          <div className="adm-card-head">
            <div>
              <h3>{selectedSubmission.prompt_title}</h3>
              <span className="adm-card-hint">
                By {selectedSubmission.learner_name} &middot; {selectedSubmission.subject} &middot;{' '}
                {selectedSubmission.topic} &middot; {new Date(selectedSubmission.submitted_at).toLocaleString()}
              </span>
            </div>
            <button type="button" className="adm-btn-secondary" onClick={() => setSubView('submissions')}>
              &larr; Back to Submissions
            </button>
          </div>

          <p className="adm-muted-note"><strong>Prompt:</strong> {selectedSubmission.prompt_text}</p>

          <div className="adm-writing-canvas-box">
            <WritingCanvas
              readOnly={true}
              initialStrokes={selectedSubmission.strokes_data}
              guideLines={true}
              height={460}
            />
          </div>

          <div className="adm-sub-form">
            <h4>Teacher Review</h4>
            <div className="adm-star-row">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`adm-star-btn ${n <= reviewRating ? 'is-active' : ''}`}
                  onClick={() => setReviewRating(n)}
                >
                  {n <= reviewRating ? '★' : '☆'}
                </button>
              ))}
              {reviewRating > 0 && (
                <button type="button" className="adm-clear-link" onClick={() => setReviewRating(0)}>Clear</button>
              )}
            </div>
            <textarea
              rows={3}
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder="Write encouraging feedback for the student..."
            />
            <div className="adm-modal-actions">
              <button
                type="button"
                className="adm-btn-primary"
                onClick={handleSaveReview}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const learnerNames = [...new Set(submissions.map(s => s.learner_name))].sort()

  return (
    <div className="adm-view">
      <div className="adm-panel adm-tests-panel">
        <div className="adm-card-head">
          <div className="adm-range-segment">
            <button
              type="button"
              className={`adm-seg-btn ${subView === 'submissions' ? 'is-active' : ''}`}
              onClick={() => setSubView('submissions')}
            >
              Submissions ({submissions.length})
            </button>
            <button
              type="button"
              className={`adm-seg-btn ${subView === 'prompts' ? 'is-active' : ''}`}
              onClick={() => setSubView('prompts')}
            >
              Prompts ({prompts.length})
            </button>
            <button
              type="button"
              className={`adm-seg-btn ${subView === 'create' ? 'is-active' : ''}`}
              onClick={() => setSubView('create')}
            >
              + New Prompt
            </button>
          </div>
          {subView === 'submissions' && (
            <div className="adm-toolbar-actions">
              <select value={filterLearner} onChange={(e) => setFilterLearner(e.target.value)}>
                <option value="">All Students</option>
                {learnerNames.map(name => (
                  <option key={name} value={submissions.find(s => s.learner_name === name)?.learner_id}>
                    {name}
                  </option>
                ))}
              </select>
              <button type="button" className="adm-btn-secondary" onClick={loadSubmissions}>Refresh</button>
            </div>
          )}
        </div>

        {subView === 'submissions' && (
          submissions.length === 0 ? (
            <div className="adm-empty-box">
              <h3>No writing submissions yet</h3>
              <p>Handwriting submissions will appear here once submitted.</p>
            </div>
          ) : (
            <div className="adm-students-grid">
              {submissions.map(sub => (
                <article
                  key={sub.id}
                  className="adm-student-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleViewSubmission(sub)}
                >
                  {sub.thumbnail && (
                    <div className="adm-cms-thumb">
                      <img src={sub.thumbnail} alt="Writing preview" />
                    </div>
                  )}
                  <h4>{sub.prompt_title}</h4>
                  <div className="adm-muted-note">
                    <strong>{sub.learner_name}</strong> &middot; {sub.subject} &middot;{' '}
                    {new Date(sub.submitted_at).toLocaleDateString()}
                  </div>
                  <div>
                    {sub.admin_rating ? (
                      <span className="adm-status-badge is-done">Reviewed {'★'.repeat(sub.admin_rating)}</span>
                    ) : (
                      <span className="adm-status-badge is-wip">Needs Review</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        )}

        {subView === 'prompts' && (
          <div className="adm-cms-grid">
            {prompts.map(p => (
              <article key={p.id} className="adm-panel adm-cms-card">
                <div className="adm-cms-card-top">
                  <div>
                    <h4>{p.title}</h4>
                    <span className="adm-q-topic-tag">{p.subject} &middot; {p.topic}</span>
                  </div>
                  <button type="button" className="adm-btn-danger-outline" onClick={() => handleDeletePrompt(p.id)}>
                    Delete
                  </button>
                </div>
                <p className="adm-muted-note">{p.prompt_text}</p>
              </article>
            ))}
          </div>
        )}

        {subView === 'create' && (
          <form className="adm-sub-form" onSubmit={handleCreatePrompt}>
            <div className="adm-form-row-2">
              <div className="adm-field">
                <label>Subject</label>
                <select value={newPrompt.subject} onChange={(e) => setNewPrompt({ ...newPrompt, subject: e.target.value })}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label>Topic</label>
                <input
                  type="text"
                  value={newPrompt.topic}
                  onChange={(e) => setNewPrompt({ ...newPrompt, topic: e.target.value })}
                />
              </div>
            </div>
            <div className="adm-field">
              <label>Title</label>
              <input
                type="text"
                required
                value={newPrompt.title}
                onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                placeholder="e.g. Write the Alphabet"
              />
            </div>
            <div className="adm-field">
              <label>Prompt Instructions</label>
              <textarea
                rows={4}
                required
                value={newPrompt.prompt_text}
                onChange={(e) => setNewPrompt({ ...newPrompt, prompt_text: e.target.value })}
                placeholder="Detailed prompt for the student..."
              />
            </div>
            <label className="adm-checkbox-inline">
              <input
                type="checkbox"
                checked={newPrompt.guide_lines}
                onChange={(e) => setNewPrompt({ ...newPrompt, guide_lines: e.target.checked })}
              />
              <span>Show handwriting guide lines on canvas</span>
            </label>
            <div className="adm-modal-actions">
              <button type="submit" className="adm-btn-primary">Create Prompt</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 6. IMPORT / EXPORT VIEW
// ============================================================================
export function ImportExportView({ questions, onImportComplete }) {
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
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `observatory-questions-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
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
      if (result.imported > 0) onImportComplete(result.imported)
    } catch (err) {
      setImportError(err.message || 'Failed to import Excel file')
    } finally {
      setIsImporting(false)
      if (excelInputRef.current) excelInputRef.current.value = ''
    }
  }

  const handleJsonImport = async () => {
    setImportError('')
    setIsImporting(true)
    try {
      const data = JSON.parse(importText)
      if (!Array.isArray(data)) throw new Error('Expected a JSON array of questions')
      const valid = data.filter(q => q.question && q.answer && q.subject && q.topic)
      if (valid.length === 0) throw new Error('No valid questions found in JSON')
      const result = await questionsApi.bulkImport(valid)
      setImportText('')
      onImportComplete(result.imported)
      if (result.errors?.length > 0) {
        setImportError(`${result.imported} imported, ${result.errors.length} errors`)
      }
    } catch (err) {
      setImportError(err instanceof SyntaxError ? 'Invalid JSON format.' : err.message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="adm-view">
      <div className="adm-breakdown-grid">
        <section className="adm-panel adm-tests-panel">
          <h3>Import from Excel / CSV</h3>
          <p className="adm-muted-note">
            Bulk-upload questions using .xlsx, .xls, or .csv. Required columns: Subject, Topic, Question, Answer.
          </p>
          <div className="adm-toolbar-actions">
            <button
              type="button"
              className="adm-btn-primary"
              onClick={() => excelInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Choose Excel / CSV File'}
            </button>
            <button
              type="button"
              className="adm-btn-secondary"
              onClick={() => { window.location.href = uploadApi.getTemplateUrl() }}
            >
              Download Template
            </button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              style={{ display: 'none' }}
            />
          </div>
          {excelResult && (
            <div className="adm-alert-success" style={{ marginTop: '1rem' }}>
              <strong>{excelResult.message}</strong>
            </div>
          )}
        </section>

        <section className="adm-panel adm-tests-panel">
          <h3>Export Question Bank (JSON)</h3>
          <p className="adm-muted-note">
            Download a complete backup of all {questions.length} questions in JSON format.
          </p>
          <button type="button" className="adm-btn-primary" onClick={handleExport}>
            Download Questions ({questions.length})
          </button>
        </section>
      </div>

      <section className="adm-panel adm-tests-panel">
        <h3>Import from JSON</h3>
        <p className="adm-muted-note">Paste a JSON array of questions below.</p>
        <textarea
          rows={7}
          className="adm-code-area"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='[{"question": "...", "answer": "...", "subject": "English", "topic": "Vocabulary", "type": "text"}]'
        />
        {importError && <div className="adm-alert-error">{importError}</div>}
        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="adm-btn-primary"
            onClick={handleJsonImport}
            disabled={!importText.trim() || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import JSON Questions'}
          </button>
        </div>
      </section>
    </div>
  )
}
