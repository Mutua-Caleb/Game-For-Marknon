import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import WritingCanvas from '../components/WritingCanvas'
import { writingApi } from '../utils/api'
import './WritingPage.css'

function WritingPage() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [prompts, setPrompts] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [strokes, setStrokes] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pastSubmissions, setPastSubmissions] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const learnerAccount = (() => {
    try {
      return JSON.parse(localStorage.getItem('learnerAccount'))
    } catch {
      return null
    }
  })()

  // Load topics
  useEffect(() => {
    writingApi.getTopics().then(setTopics).catch(console.error)
  }, [])

  // Load prompts when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      writingApi.getPrompts().then(setPrompts).catch(console.error)
    } else {
      writingApi.getPrompts({ subject: selectedSubject }).then(setPrompts).catch(console.error)
    }
  }, [selectedSubject])

  // Load past submissions
  useEffect(() => {
    if (learnerAccount?.id) {
      writingApi.getLearnerSubmissions(learnerAccount.id).then(setPastSubmissions).catch(console.error)
    }
  }, [learnerAccount?.id, submitted])

  const subjects = [...new Set(topics.map(t => t.subject))]

  const handleSelectPrompt = (prompt) => {
    setSelectedPrompt(prompt)
    setStrokes([])
    setSubmitted(false)
  }

  const handleSubmit = async () => {
    if (strokes.length === 0 || !selectedPrompt || !learnerAccount) return

    setSubmitting(true)
    try {
      // Get thumbnail from canvas
      const canvasEl = document.querySelector('.drawing-canvas')
      let thumbnail = null
      if (canvasEl && canvasEl._getThumbnail) {
        thumbnail = canvasEl._getThumbnail()
      }

      await writingApi.submit({
        prompt_id: selectedPrompt.id,
        learner_id: learnerAccount.id,
        strokes_data: strokes,
        thumbnail
      })

      setSubmitted(true)
    } catch (err) {
      console.error('Submit failed:', err)
      alert('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextPrompt = () => {
    const currentIndex = prompts.findIndex(p => p.id === selectedPrompt?.id)
    if (currentIndex < prompts.length - 1) {
      handleSelectPrompt(prompts[currentIndex + 1])
    } else {
      setSelectedPrompt(null)
    }
  }

  return (
    <div className="writing-page">
      <div className="writing-header">
        <button className="writing-back-btn" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Home
        </button>
        <h1 className="writing-title">Writing Practice</h1>
        <button
          className={`history-toggle-btn ${showHistory ? 'active' : ''}`}
          onClick={() => setShowHistory(!showHistory)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          My Work ({pastSubmissions.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div
            key="history"
            className="writing-history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="history-heading">Past Submissions</h2>
            {pastSubmissions.length === 0 ? (
              <p className="history-empty">No submissions yet. Start writing!</p>
            ) : (
              <div className="history-grid">
                {pastSubmissions.map(sub => (
                  <div key={sub.id} className="history-card">
                    <div className="history-card-header">
                      <span className="history-subject">{sub.subject}</span>
                      <span className="history-topic">{sub.topic}</span>
                    </div>
                    <h3 className="history-card-title">{sub.prompt_title}</h3>
                    <div className="history-card-footer">
                      <span className="history-date">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                      {sub.admin_rating && (
                        <span className="history-rating">
                          {'★'.repeat(sub.admin_rating)}{'☆'.repeat(5 - sub.admin_rating)}
                        </span>
                      )}
                    </div>
                    {sub.admin_feedback && (
                      <div className="history-feedback">
                        <strong>Teacher:</strong> {sub.admin_feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : !selectedPrompt ? (
          <motion.div
            key="selector"
            className="prompt-selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="subject-filter">
              <label>Filter by subject:</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="prompts-grid">
              {prompts.map(prompt => {
                const alreadyDone = pastSubmissions.some(s => s.prompt_id === prompt.id)
                return (
                  <motion.div
                    key={prompt.id}
                    className={`prompt-card ${alreadyDone ? 'done' : ''}`}
                    onClick={() => handleSelectPrompt(prompt)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="prompt-card-top">
                      <span className="prompt-subject-badge">{prompt.subject}</span>
                      <span className="prompt-topic-badge">{prompt.topic}</span>
                      {alreadyDone && <span className="prompt-done-badge">Done</span>}
                    </div>
                    <h3 className="prompt-card-title">{prompt.title}</h3>
                    <p className="prompt-card-preview">{prompt.prompt_text.slice(0, 80)}...</p>
                  </motion.div>
                )
              })}
            </div>

            {prompts.length === 0 && (
              <p className="no-prompts">No writing prompts available yet. Ask your teacher to create some!</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="canvas"
            className="writing-workspace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="prompt-display">
              <button className="change-prompt-btn" onClick={() => setSelectedPrompt(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Change Prompt
              </button>
              <div className="prompt-info">
                <div className="prompt-badges">
                  <span className="prompt-subject-badge">{selectedPrompt.subject}</span>
                  <span className="prompt-topic-badge">{selectedPrompt.topic}</span>
                </div>
                <h2 className="prompt-heading">{selectedPrompt.title}</h2>
                <p className="prompt-text">{selectedPrompt.prompt_text}</p>
              </div>
            </div>

            {submitted ? (
              <motion.div
                className="submit-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="success-icon">&#9989;</div>
                <h2>Great job!</h2>
                <p>Your writing has been submitted. Your teacher will review it soon!</p>
                <div className="success-actions">
                  <button className="next-prompt-btn" onClick={handleNextPrompt}>Next Prompt</button>
                  <button className="back-to-list-btn" onClick={() => setSelectedPrompt(null)}>Back to List</button>
                </div>
              </motion.div>
            ) : (
              <>
                <WritingCanvas
                  guideLines={selectedPrompt.guide_lines !== false}
                  onStrokesChange={setStrokes}
                  height={500}
                />

                <div className="submit-bar">
                  <div className="stroke-count">
                    {strokes.length === 0 ? 'Start writing above...' : `${strokes.length} strokes`}
                  </div>
                  <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={strokes.length === 0 || submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit My Writing'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WritingPage
