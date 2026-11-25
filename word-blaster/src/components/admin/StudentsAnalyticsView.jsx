import { useState, useEffect, useCallback } from 'react'
import { quizSessionApi, statsApi, learnerApi } from '../../utils/api'
import {
  formatDateTimeCompact,
  formatDurationHuman,
  getAccuracyTone,
  getSubjectTone
} from './adminFormatters'

function StudentsAnalyticsView({ failedQuestions, onResetStats, showNotification, onInspectStudent }) {
  const [learners, setLearners] = useState([])
  const [overview, setOverview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Add student form
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', pin: '', dailyRequiredMinutes: 30 })
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [learnersData, overviewData] = await Promise.all([
        quizSessionApi.getLearnersOverview(),
        statsApi.getOverview()
      ])
      setLearners(Array.isArray(learnersData) ? learnersData : [])
      setOverview(overviewData)
    } catch (err) {
      console.error('Failed to load students & analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateStudent = async (e) => {
    e.preventDefault()
    if (!newStudent.name.trim() || newStudent.pin.trim().length < 4) {
      showNotification('Enter a student name and at least a 4-digit PIN.', 'error')
      return
    }
    setCreating(true)
    try {
      await learnerApi.register(
        newStudent.name.trim(),
        newStudent.pin.trim(),
        Number(newStudent.dailyRequiredMinutes) || 30
      )
      showNotification(`Student "${newStudent.name.trim()}" added!`)
      setNewStudent({ name: '', pin: '', dailyRequiredMinutes: 30 })
      setShowAddStudent(false)
      loadData()
    } catch (err) {
      showNotification(err.message || 'Could not register student', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="adm-view">
      {/* Top KPI Row */}
      <section className="adm-kpi-grid adm-kpi-grid-4">
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Registered Students</span>
          <strong className="adm-kpi-value mono-num">{learners.length}</strong>
          <span className="adm-kpi-sub">Active learner accounts</span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Question Bank</span>
          <strong className="adm-kpi-value mono-num">{overview?.totalQuestions || 0}</strong>
          <span className="adm-kpi-sub">{overview?.withImages || 0} with images</span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">All-Time Attempts</span>
          <strong className="adm-kpi-value mono-num">{overview?.totalAttempts || 0}</strong>
          <span className="adm-kpi-sub">
            {overview?.totalCorrect || 0} right &middot; {overview?.totalWrong || 0} missed
          </span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Overall Bank Success</span>
          <strong className={`adm-kpi-value mono-num tone-${getAccuracyTone(overview?.successRate)}`}>
            {overview?.successRate || 0}%
          </strong>
          <span className="adm-kpi-sub">Avg score: {overview?.avgScore || 0}</span>
        </div>
      </section>

      {/* Students Roster */}
      <section className="adm-panel adm-tests-panel">
        <div className="adm-card-head">
          <div>
            <h3>Student Accounts &amp; Study Progress ({learners.length})</h3>
            <span className="adm-card-hint">
              Today&apos;s study progress, all-time tests, accuracy, and subjects covered per student.
            </span>
          </div>
          <div className="adm-toolbar-actions">
            <button type="button" className="adm-btn-secondary" onClick={loadData}>
              Refresh
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={() => setShowAddStudent(v => !v)}
            >
              {showAddStudent ? 'Cancel' : '+ Add Student'}
            </button>
          </div>
        </div>

        {showAddStudent && (
          <form className="adm-inline-form" onSubmit={handleCreateStudent}>
            <div className="adm-filter-group">
              <label htmlFor="new-student-name">Student Name</label>
              <input
                id="new-student-name"
                type="text"
                placeholder="e.g. Marknon"
                value={newStudent.name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="adm-filter-group">
              <label htmlFor="new-student-pin">4+ Digit PIN</label>
              <input
                id="new-student-pin"
                type="text"
                placeholder="e.g. 1234"
                value={newStudent.pin}
                onChange={(e) => setNewStudent(prev => ({ ...prev, pin: e.target.value }))}
                required
              />
            </div>
            <div className="adm-filter-group">
              <label htmlFor="new-student-goal">Daily Goal (min)</label>
              <input
                id="new-student-goal"
                type="number"
                min={5}
                max={240}
                value={newStudent.dailyRequiredMinutes}
                onChange={(e) => setNewStudent(prev => ({ ...prev, dailyRequiredMinutes: e.target.value }))}
              />
            </div>
            <button type="submit" className="adm-btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="adm-loading-box">Loading student profiles...</div>
        ) : learners.length === 0 ? (
          <div className="adm-empty-box">
            <h3>No student accounts yet</h3>
            <p>Click &ldquo;+ Add Student&rdquo; above to register a learner account.</p>
          </div>
        ) : (
          <div className="adm-students-grid">
            {learners.map(student => {
              const quotaPct = student.dailyRequiredMinutes > 0
                ? Math.min(100, Math.round((student.todayMinutes / student.dailyRequiredMinutes) * 100))
                : 0
              return (
                <article key={student.id} className="adm-student-card">
                  <div className="adm-student-head">
                    <div className="adm-student-avatar">
                      {(student.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="adm-student-id">
                      <h4>{student.name}</h4>
                      <span className="adm-student-last">
                        {student.lastSessionAt
                          ? `Last test: ${formatDateTimeCompact(student.lastSessionAt)}`
                          : 'No tests recorded yet'}
                      </span>
                    </div>
                    {onInspectStudent && (
                      <button
                        type="button"
                        className="adm-btn-ghost-dark"
                        onClick={() => onInspectStudent(student.name)}
                      >
                        View Tests &rarr;
                      </button>
                    )}
                  </div>

                  {/* Today's Quota Progress */}
                  <div className="adm-quota-block">
                    <div className="adm-quota-labels">
                      <span>Today&apos;s Study Goal</span>
                      <strong className="mono-num">
                        {student.todayMinutes} / {student.dailyRequiredMinutes} min ({quotaPct}%)
                      </strong>
                    </div>
                    <div className="adm-bar-track">
                      <div className="adm-bar-right" style={{ width: `${quotaPct}%` }} />
                    </div>
                    {student.todayVerifiedMinutes > 0 && (
                      <span className="adm-quota-sub mono-num">
                        {student.todayVerifiedMinutes} min server-verified focus today
                      </span>
                    )}
                  </div>

                  <div className="adm-student-stats-grid">
                    <div>
                      <span className="adm-st-lbl">Tests</span>
                      <strong className="mono-num">
                        {student.completedSessions} / {student.totalSessions}
                      </strong>
                    </div>
                    <div>
                      <span className="adm-st-lbl">Total Time</span>
                      <strong className="mono-num">
                        {formatDurationHuman(student.totalDurationSeconds)}
                      </strong>
                    </div>
                    <div>
                      <span className="adm-st-lbl">Accuracy</span>
                      <strong className={`mono-num tone-${getAccuracyTone(student.accuracy)}`}>
                        {student.totalAttempted > 0 ? `${student.accuracy}%` : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="adm-st-lbl">Questions</span>
                      <strong className="mono-num">
                        <span className="c-good">{student.totalCorrect}</span> / {student.totalAttempted}
                      </strong>
                    </div>
                  </div>

                  {student.subjects && student.subjects.length > 0 && (
                    <div className="adm-student-subjects">
                      {student.subjects.map(subj => (
                        <span key={subj} className={`adm-tiny-tag tone-${getSubjectTone(subj)}`}>
                          {subj}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Most Missed Questions */}
      <section className="adm-panel adm-tests-panel">
        <div className="adm-card-head">
          <div>
            <h3>Most Missed Questions ({failedQuestions.length})</h3>
            <span className="adm-card-hint">
              Questions with the highest miss rate are surfaced more frequently in adaptive drills.
            </span>
          </div>
          <button
            type="button"
            className="adm-btn-danger-outline"
            onClick={async () => {
              await onResetStats()
              loadData()
            }}
          >
            Reset Question Stats
          </button>
        </div>

        {failedQuestions.length === 0 ? (
          <div className="adm-empty-box">
            <h3>No missed question data yet</h3>
            <p>As students answer topic quiz questions, frequently missed items will appear here.</p>
          </div>
        ) : (
          <div className="adm-q-review-table-wrap">
            <table className="adm-q-review-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Subject &amp; Topic</th>
                  <th>Correct Answer</th>
                  <th className="num">Attempts</th>
                  <th className="num">Miss Rate</th>
                </tr>
              </thead>
              <tbody>
                {failedQuestions.map((q, idx) => (
                  <tr key={q.id}>
                    <td className="mono-num adm-q-idx">{idx + 1}</td>
                    <td className="adm-q-text-cell">
                      <div className="adm-q-prompt">{q.question}</div>
                    </td>
                    <td>
                      <div className="adm-q-sub-tags">
                        <span className={`adm-tiny-tag tone-${getSubjectTone(q.subject)}`}>
                          {q.subject}
                        </span>
                        <span className="adm-q-topic-tag">{q.topic}</span>
                      </div>
                    </td>
                    <td className="adm-ans-cell">
                      <strong className="adm-ans-correct">{q.answer}</strong>
                    </td>
                    <td className="num mono-num">{q.totalAttempts}</td>
                    <td className="num">
                      <span className="adm-result-pill is-wrong mono-num">
                        {Math.round(q.failureRate * 100)}% missed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default StudentsAnalyticsView
