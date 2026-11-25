import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { quizSessionApi } from '../../utils/api'
import {
  buildRecentDaysList,
  downloadCsv,
  formatClockTime,
  formatClockTimeWithSeconds,
  formatDateTimeCompact,
  formatDurationHuman,
  formatGameMode,
  formatMs,
  formatReadableDate,
  formatShortDayLabel,
  getAccuracyTone,
  getLocalDateString,
  getSubjectTone,
  shiftDateString
} from './adminFormatters'

function DailyTestLogView({ selectedDate, onDateChange, range, onRangeChange, onJumpToAttempts }) {
  const [playerFilter, setPlayerFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Expanded session inspection state
  const [expandedSessionId, setExpandedSessionId] = useState(null)
  const [sessionDetailsCache, setSessionDetailsCache] = useState({})
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [answerOutcomeFilter, setAnswerOutcomeFilter] = useState('all') // 'all' | 'correct' | 'wrong' | 'timeout'
  const [answerSearch, setAnswerSearch] = useState('')
  const [topicSort, setTopicSort] = useState('weakest') // 'weakest' | 'most'

  const todayStr = getLocalDateString()

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await quizSessionApi.getDailyReport({
        range,
        date: selectedDate,
        player: playerFilter,
        subject: subjectFilter,
        topic: topicFilter,
        status: statusFilter
      })
      setReport(data)
    } catch (err) {
      console.error('Failed to load daily report:', err)
      setError(err.message || 'Could not load daily test report.')
    } finally {
      setIsLoading(false)
    }
  }, [range, selectedDate, playerFilter, subjectFilter, topicFilter, statusFilter])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleToggleSession = async (sessionId) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null)
      return
    }
    setExpandedSessionId(sessionId)
    setAnswerOutcomeFilter('all')
    setAnswerSearch('')

    if (sessionDetailsCache[sessionId]) return

    setLoadingDetailId(sessionId)
    try {
      const detail = await quizSessionApi.getById(sessionId)
      setSessionDetailsCache(prev => ({ ...prev, [sessionId]: detail }))
    } catch (err) {
      console.error('Failed to load session detail:', err)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const handleRefresh = () => {
    setSessionDetailsCache({})
    loadReport()
  }

  // Build 14-day calendar strip anchored on today (or including selectedDate if older)
  const calendarMap = useMemo(() => {
    const map = {}
    for (const d of report?.calendarDays || []) {
      map[d.date] = d
    }
    return map
  }, [report?.calendarDays])

  const stripDays = useMemo(() => {
    const anchor = selectedDate > todayStr ? selectedDate : todayStr
    return buildRecentDaysList(14, anchor)
  }, [selectedDate, todayStr])

  const sortedTopics = useMemo(() => {
    const list = [...(report?.topicBreakdown || [])]
    if (topicSort === 'weakest') {
      list.sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted)
    } else {
      list.sort((a, b) => b.attempted - a.attempted || a.accuracy - b.accuracy)
    }
    return list
  }, [report?.topicBreakdown, topicSort])

  const summary = report?.summary || {}
  const sessions = report?.sessions || []
  const subjectBreakdown = report?.subjectBreakdown || []
  const focusActivity = report?.focusActivity || []
  const filterOptions = report?.filters || { players: [], subjects: [], topics: [] }

  const activePeriodLabel = useMemo(() => {
    if (range === 'day') return formatReadableDate(selectedDate)
    if (range === '7d') return `Last 7 Days (ending ${formatReadableDate(selectedDate)})`
    if (range === '30d') return `Last 30 Days (ending ${formatReadableDate(selectedDate)})`
    return 'All Recorded Activity'
  }, [range, selectedDate])

  const handleExportDayCsv = () => {
    const headers = [
      'Date',
      'Start Time',
      'Finish Time',
      'Duration',
      'Student',
      'Subject',
      'Topics',
      'Mode',
      'Status',
      'Questions Attempted',
      'Right',
      'Wrong',
      'Timed Out',
      'Accuracy %',
      'Score',
      'Avg Time/Question',
      'Tab Switches'
    ]
    const rows = sessions.map(s => [
      s.local_date,
      formatClockTimeWithSeconds(s.started_at),
      s.finished_at ? formatClockTimeWithSeconds(s.finished_at) : 'In Progress',
      formatDurationHuman(s.duration_seconds),
      s.player_name,
      s.subject,
      (s.topics || []).join('; '),
      formatGameMode(s.game_mode),
      s.completed ? 'Submitted' : 'In Progress',
      s.total_answers,
      s.correct_answers,
      s.wrong_answers,
      s.timeout_count,
      s.accuracy,
      s.score,
      formatMs(s.avg_question_ms),
      s.tab_switches
    ])
    downloadCsv(`student-tests-${range === 'day' ? selectedDate : range}.csv`, headers, rows)
  }

  const handleExportSessionCsv = (detail) => {
    const headers = [
      '#',
      'Answered At',
      'Subject',
      'Topic',
      'Question',
      'Student Answer',
      'Correct Answer',
      'Result',
      'Time Taken'
    ]
    const rows = (detail.answers || []).map((a, idx) => [
      idx + 1,
      formatClockTimeWithSeconds(a.answered_at),
      a.subject || detail.subject || '',
      a.topic || '',
      a.question_text || '',
      a.given_answer || (a.outcome === 'timeout' ? '(Timed out)' : ''),
      a.correct_answer || '',
      a.outcome === 'correct' ? 'Right' : a.outcome === 'timeout' ? 'Timed Out' : 'Wrong',
      formatMs(a.time_taken_ms)
    ])
    const slug = `${detail.player_name || 'student'}-${detail.subject || 'test'}-${detail.id}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
    downloadCsv(`test-detail-${slug}.csv`, headers, rows)
  }

  const clearAllFilters = () => {
    setPlayerFilter('')
    setSubjectFilter('')
    setTopicFilter('')
    setStatusFilter('')
  }

  const hasActiveFilters = Boolean(playerFilter || subjectFilter || topicFilter || statusFilter)

  return (
    <div className="adm-view">
      {/* Top Date & Range Controller */}
      <section className="adm-panel adm-date-controller">
        <div className="adm-date-top-row">
          <div className="adm-date-nav">
            <button
              type="button"
              className="adm-icon-btn"
              onClick={() => {
                onRangeChange('day')
                onDateChange(shiftDateString(selectedDate, -1))
              }}
              title="Previous day"
              aria-label="Previous day"
            >
              &larr;
            </button>
            <input
              type="date"
              className="adm-date-input mono-num"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => {
                if (e.target.value) {
                  onDateChange(e.target.value)
                  if (range === 'all') onRangeChange('day')
                }
              }}
              aria-label="Select date"
            />
            <button
              type="button"
              className="adm-icon-btn"
              disabled={selectedDate >= todayStr}
              onClick={() => {
                onRangeChange('day')
                const next = shiftDateString(selectedDate, 1)
                onDateChange(next > todayStr ? todayStr : next)
              }}
              title="Next day"
              aria-label="Next day"
            >
              &rarr;
            </button>
            <button
              type="button"
              className={`adm-pill-btn ${range === 'day' && selectedDate === todayStr ? 'is-active' : ''}`}
              onClick={() => {
                onDateChange(todayStr)
                onRangeChange('day')
              }}
            >
              Today
            </button>
          </div>

          <div className="adm-range-segment" role="tablist" aria-label="Time window">
            {[
              { id: 'day', label: 'Single Day' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'all', label: 'All Time' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                className={`adm-seg-btn ${range === item.id ? 'is-active' : ''}`}
                onClick={() => onRangeChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="adm-toolbar-actions">
            <button type="button" className="adm-btn-secondary" onClick={handleRefresh}>
              Refresh
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={handleExportDayCsv}
              disabled={sessions.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Interactive 14-Day Activity Calendar Strip */}
        <div className="adm-calendar-strip" aria-label="Recent 14 days activity">
          {stripDays.map(dayStr => {
            const info = calendarMap[dayStr]
            const { dow, day } = formatShortDayLabel(dayStr)
            const isSelected = range === 'day' && selectedDate === dayStr
            const isToday = dayStr === todayStr
            const hasActivity = Boolean(info && info.sessionsCount > 0)
            const accTone = hasActivity ? getAccuracyTone(info.accuracy) : 'none'

            return (
              <button
                key={dayStr}
                type="button"
                className={`adm-cal-day ${isSelected ? 'is-selected' : ''} ${hasActivity ? 'has-activity' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => {
                  onDateChange(dayStr)
                  onRangeChange('day')
                }}
                title={
                  hasActivity
                    ? `${formatReadableDate(dayStr)}: ${info.sessionsCount} test(s), ${info.correctCount}/${info.attemptedCount} right (${info.accuracy}%), ${formatDurationHuman(info.durationSeconds)}`
                    : `${formatReadableDate(dayStr)}: No tests recorded`
                }
              >
                <span className="adm-cal-dow">{dow}</span>
                <span className="adm-cal-num mono-num">{day}</span>
                <span className={`adm-cal-dot tone-${accTone}`}>
                  {hasActivity ? `${info.sessionsCount}` : '·'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filter Bar */}
        <div className="adm-filter-bar">
          <div className="adm-filter-group">
            <label htmlFor="adm-filter-player">Student</label>
            <select
              id="adm-filter-player"
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
            >
              <option value="">All Students</option>
              {filterOptions.players.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="adm-filter-group">
            <label htmlFor="adm-filter-subject">Subject</label>
            <select
              id="adm-filter-subject"
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value)
                setTopicFilter('')
              }}
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>

          <div className="adm-filter-group">
            <label htmlFor="adm-filter-topic">Topic</label>
            <select
              id="adm-filter-topic"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            >
              <option value="">All Topics</option>
              {filterOptions.topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="adm-filter-group">
            <label htmlFor="adm-filter-status">Status</label>
            <select
              id="adm-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="completed">Submitted Only</option>
              <option value="incomplete">In Progress / Unfinished</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button type="button" className="adm-clear-link" onClick={clearAllFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="adm-alert-error">{error}</div>
      )}

      {/* Active Period Header */}
      <div className="adm-period-heading">
        <div>
          <h2>{activePeriodLabel}</h2>
          <p>
            {summary.firstStartedAt
              ? `Active window: ${formatClockTime(summary.firstStartedAt)} – ${formatClockTime(summary.lastFinishedAt)}`
              : 'Select any highlighted day above or switch to Last 7 Days / All Time to inspect student tests.'}
          </p>
        </div>
        {sessions.length > 0 && onJumpToAttempts && (
          <button
            type="button"
            className="adm-btn-ghost-dark"
            onClick={() => onJumpToAttempts({ player: playerFilter, subject: subjectFilter, topic: topicFilter })}
          >
            View All {summary.totalAttempted || 0} Question Attempts &rarr;
          </button>
        )}
      </div>

      {/* KPI Metrics Row */}
      <section className="adm-kpi-grid">
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Tests Taken</span>
          <strong className="adm-kpi-value mono-num">{summary.totalSessions || 0}</strong>
          <span className="adm-kpi-sub">
            {summary.completedSessions || 0} submitted &middot; {summary.incompleteSessions || 0} in progress
          </span>
        </div>

        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Total Time Spent</span>
          <strong className="adm-kpi-value mono-num">{formatDurationHuman(summary.totalDurationSeconds)}</strong>
          <span className="adm-kpi-sub">
            Avg {formatDurationHuman(summary.avgDurationSeconds)} per test
          </span>
        </div>

        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Accuracy Rate</span>
          <strong className={`adm-kpi-value mono-num tone-${getAccuracyTone(summary.accuracy)}`}>
            {summary.totalAttempted > 0 ? `${summary.accuracy}%` : '—'}
          </strong>
          <span className="adm-kpi-sub">
            {summary.totalCorrect || 0} right &middot; {summary.totalWrong || 0} wrong
            {summary.totalTimeout > 0 ? ` · ${summary.totalTimeout} timed out` : ''}
          </span>
        </div>

        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Questions Attempted</span>
          <strong className="adm-kpi-value mono-num">{summary.totalAttempted || 0}</strong>
          <span className="adm-kpi-sub">
            Avg pace: {summary.avgQuestionTimeMs ? `${formatMs(summary.avgQuestionTimeMs)} / q` : '—'}
          </span>
        </div>

        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Coverage &amp; Focus</span>
          <strong className="adm-kpi-value mono-num">
            {summary.subjectsCount || 0} <small>subj</small> / {summary.topicsCount || 0} <small>topics</small>
          </strong>
          <span className={`adm-kpi-sub ${summary.totalTabSwitches > 0 ? 'is-warn' : ''}`}>
            {summary.totalTabSwitches > 0
              ? `${summary.totalTabSwitches} tab switch${summary.totalTabSwitches !== 1 ? 'es' : ''} detected`
              : 'Zero tab switches'}
          </span>
        </div>
      </section>

      {isLoading ? (
        <div className="adm-panel adm-loading-box">Loading test records...</div>
      ) : sessions.length === 0 ? (
        <div className="adm-panel adm-empty-box">
          <h3>No tests recorded for this selection</h3>
          <p>
            {range === 'day'
              ? `No tests were started on ${formatReadableDate(selectedDate)}. Click a numbered day on the calendar strip above or switch to "Last 30 Days" / "All Time".`
              : 'Try clearing one of the active filters to view recorded student sessions.'}
          </p>
          <div className="adm-empty-actions">
            {range === 'day' && (
              <button type="button" className="adm-btn-primary" onClick={() => onRangeChange('30d')}>
                Show Last 30 Days
              </button>
            )}
            {hasActiveFilters && (
              <button type="button" className="adm-btn-secondary" onClick={clearAllFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Subject & Topic Breakdown Panels */}
          <section className="adm-breakdown-grid">
            {/* Subject Breakdown */}
            <div className="adm-panel adm-breakdown-card">
              <div className="adm-card-head">
                <h3>Subjects Studied ({subjectBreakdown.length})</h3>
                <span className="adm-card-hint">Click a subject to filter</span>
              </div>
              <div className="adm-subject-rows">
                {subjectBreakdown.map(item => (
                  <button
                    key={item.subject}
                    type="button"
                    className={`adm-subject-row ${subjectFilter === item.subject ? 'is-selected' : ''}`}
                    onClick={() => setSubjectFilter(prev => prev === item.subject ? '' : item.subject)}
                  >
                    <div className="adm-subj-top">
                      <div className="adm-subj-title-group">
                        <span className={`adm-subj-badge tone-${getSubjectTone(item.subject)}`}>
                          {item.subject}
                        </span>
                        <span className="adm-subj-meta mono-num">
                          {item.sessions} test{item.sessions !== 1 ? 's' : ''} &middot; {formatDurationHuman(item.durationSeconds)}
                        </span>
                      </div>
                      <strong className={`adm-subj-acc mono-num tone-${getAccuracyTone(item.accuracy)}`}>
                        {item.accuracy}%
                      </strong>
                    </div>

                    <div className="adm-bar-track">
                      <div
                        className="adm-bar-right"
                        style={{ width: `${item.attempted > 0 ? (item.correct / item.attempted) * 100 : 0}%` }}
                      />
                      <div
                        className="adm-bar-timeout"
                        style={{ width: `${item.attempted > 0 ? (item.timeout / item.attempted) * 100 : 0}%` }}
                      />
                    </div>

                    <div className="adm-subj-foot">
                      <span>
                        <strong>{item.correct}</strong> right &middot; <strong>{item.wrong}</strong> wrong
                        {item.timeout > 0 ? <> &middot; <strong>{item.timeout}</strong> timed out</> : null}
                      </span>
                      {item.topics.length > 0 && (
                        <span className="adm-subj-topics-preview">
                          {item.topics.slice(0, 3).join(', ')}
                          {item.topics.length > 3 ? ` +${item.topics.length - 3}` : ''}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Breakdown */}
            <div className="adm-panel adm-breakdown-card">
              <div className="adm-card-head">
                <h3>Topics Attempted ({sortedTopics.length})</h3>
                <div className="adm-mini-sort">
                  <button
                    type="button"
                    className={topicSort === 'weakest' ? 'is-active' : ''}
                    onClick={() => setTopicSort('weakest')}
                  >
                    Needs Work First
                  </button>
                  <button
                    type="button"
                    className={topicSort === 'most' ? 'is-active' : ''}
                    onClick={() => setTopicSort('most')}
                  >
                    Most Attempted
                  </button>
                </div>
              </div>

              {sortedTopics.length === 0 ? (
                <p className="adm-muted-note">No per-question topic records for these tests yet.</p>
              ) : (
                <div className="adm-topic-table-wrap">
                  <table className="adm-compact-table">
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th className="num">Right / Total</th>
                        <th className="num">Avg Pace</th>
                        <th className="num">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTopics.slice(0, 12).map(row => (
                        <tr
                          key={`${row.subject}-${row.topic}`}
                          className={topicFilter === row.topic ? 'is-selected' : ''}
                          onClick={() => setTopicFilter(prev => prev === row.topic ? '' : row.topic)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className="adm-topic-cell">
                              <strong>{row.topic}</strong>
                              <span className={`adm-tiny-tag tone-${getSubjectTone(row.subject)}`}>
                                {row.subject}
                              </span>
                            </div>
                          </td>
                          <td className="num mono-num">
                            <span className="c-good">{row.correct}</span> / {row.attempted}
                            {row.timeout > 0 && <span className="c-warn"> ({row.timeout}⏱)</span>}
                          </td>
                          <td className="num mono-num">{formatMs(row.avgTimeMs)}</td>
                          <td className="num">
                            <span className={`adm-acc-pill mono-num tone-${getAccuracyTone(row.accuracy)}`}>
                              {row.accuracy}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Chronological Submitted Tests List */}
          <section className="adm-panel adm-tests-panel">
            <div className="adm-card-head">
              <div>
                <h3>Submitted Tests &amp; Question-by-Question Review ({sessions.length})</h3>
                <span className="adm-card-hint">
                  Click any test row to inspect exact start/finish times, duration, every question right or wrong, student answers, and timing.
                </span>
              </div>
            </div>

            <div className="adm-session-list">
              {sessions.map(session => {
                const isExpanded = expandedSessionId === session.id
                const detail = sessionDetailsCache[session.id]
                const isLoadingDetail = loadingDetailId === session.id

                const filteredAnswers = (detail?.answers || []).filter(ans => {
                  if (answerOutcomeFilter !== 'all' && ans.outcome !== answerOutcomeFilter) return false
                  if (answerSearch.trim()) {
                    const q = answerSearch.trim().toLowerCase()
                    return (
                      String(ans.question_text || '').toLowerCase().includes(q) ||
                      String(ans.given_answer || '').toLowerCase().includes(q) ||
                      String(ans.correct_answer || '').toLowerCase().includes(q) ||
                      String(ans.topic || '').toLowerCase().includes(q)
                    )
                  }
                  return true
                })

                return (
                  <article key={session.id} className={`adm-session-card ${isExpanded ? 'is-open' : ''}`}>
                    <div
                      className="adm-session-row"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => handleToggleSession(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleToggleSession(session.id)
                        }
                      }}
                    >
                      {/* Column 1: Time & Duration */}
                      <div className="adm-sess-time-col">
                        <div className="adm-sess-clock mono-num">
                          <span>{formatClockTime(session.started_at)}</span>
                          <span className="adm-arrow-sep">&rarr;</span>
                          <span>
                            {session.finished_at
                              ? formatClockTime(session.finished_at)
                              : formatClockTime(session.last_activity_at)}
                          </span>
                        </div>
                        <div className="adm-sess-date-sub mono-num">
                          {range !== 'day' && <span>{formatReadableDate(session.local_date)} &middot; </span>}
                          <strong>{formatDurationHuman(session.duration_seconds)}</strong>
                        </div>
                      </div>

                      {/* Column 2: Student, Subject, Topics & Mode */}
                      <div className="adm-sess-main-col">
                        <div className="adm-sess-title-line">
                          <strong className="adm-sess-student">{session.player_name}</strong>
                          <span className={`adm-subj-badge tone-${getSubjectTone(session.subject)}`}>
                            {session.subject}
                          </span>
                          <span className="adm-mode-badge">{formatGameMode(session.game_mode)}</span>
                          <span className={`adm-status-badge ${session.completed ? 'is-done' : 'is-wip'}`}>
                            {session.completed ? 'Submitted' : 'In Progress'}
                          </span>
                          {session.tab_switches > 0 && (
                            <span className="adm-tab-warn-badge">
                              {session.tab_switches} tab switch{session.tab_switches !== 1 ? 'es' : ''}
                            </span>
                          )}
                        </div>
                        <div className="adm-sess-topics-line">
                          {session.topics && session.topics.length > 0 ? (
                            <>
                              <span className="adm-topics-lbl">Topics:</span>{' '}
                              {session.topics.join(' · ')}
                            </>
                          ) : (
                            <span className="adm-topics-lbl">General Practice</span>
                          )}
                        </div>
                      </div>

                      {/* Column 3: Right / Wrong / Accuracy */}
                      <div className="adm-sess-metrics-col">
                        <div className="adm-sess-counts mono-num">
                          <span className="adm-count-chip is-right">{session.correct_answers} right</span>
                          <span className="adm-count-chip is-wrong">{session.wrong_answers} wrong</span>
                          {session.timeout_count > 0 && (
                            <span className="adm-count-chip is-timeout">{session.timeout_count} timed out</span>
                          )}
                        </div>
                        <div className="adm-sess-acc-row">
                          <div className="adm-mini-bar">
                            <div
                              className="adm-mini-bar-fill"
                              style={{ width: `${session.accuracy}%` }}
                            />
                          </div>
                          <strong className={`mono-num tone-${getAccuracyTone(session.accuracy)}`}>
                            {session.accuracy}%
                          </strong>
                        </div>
                      </div>

                      <div className="adm-sess-chevron" aria-hidden="true">
                        {isExpanded ? '▴' : '▾'}
                      </div>
                    </div>

                    {/* Expanded Full Test Report */}
                    <AnimatePresence>
                      {isExpanded && (
                        <Motion.div
                          className="adm-session-inspector"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                        >
                          {isLoadingDetail ? (
                            <div className="adm-inspector-loading">Loading question-by-question answers...</div>
                          ) : detail ? (
                            <div className="adm-inspector-body">
                              {/* Exact Timestamps & Duration Metadata Strip */}
                              <div className="adm-inspector-meta-grid">
                                <div className="adm-meta-box">
                                  <span>Started</span>
                                  <strong className="mono-num">
                                    {formatDateTimeCompact(detail.started_at)}
                                  </strong>
                                  <small className="mono-num">{formatClockTimeWithSeconds(detail.started_at)}</small>
                                </div>
                                <div className="adm-meta-box">
                                  <span>{detail.completed ? 'Submitted At' : 'Last Activity'}</span>
                                  <strong className="mono-num">
                                    {formatDateTimeCompact(detail.finished_at || detail.last_activity_at)}
                                  </strong>
                                  <small className="mono-num">
                                    {formatClockTimeWithSeconds(detail.finished_at || detail.last_activity_at)}
                                  </small>
                                </div>
                                <div className="adm-meta-box">
                                  <span>Time To Finish</span>
                                  <strong className="mono-num">{formatDurationHuman(detail.duration_seconds)}</strong>
                                  <small className="mono-num">
                                    {detail.avg_question_ms ? `Avg ${formatMs(detail.avg_question_ms)} / question` : 'Total elapsed'}
                                  </small>
                                </div>
                                <div className="adm-meta-box">
                                  <span>Speed Range</span>
                                  <strong className="mono-num">
                                    {detail.fastest_question_ms ? formatMs(detail.fastest_question_ms) : '—'}
                                    {' – '}
                                    {detail.slowest_question_ms ? formatMs(detail.slowest_question_ms) : '—'}
                                  </strong>
                                  <small>Fastest – Slowest Q</small>
                                </div>
                                <div className="adm-meta-box">
                                  <span>Score &amp; Streak</span>
                                  <strong className="mono-num">{detail.score || 0} pts</strong>
                                  <small>Best streak: {detail.best_streak || 0}x</small>
                                </div>
                              </div>

                              {/* Per-Topic Summary inside this session */}
                              {detail.topicBreakdown && detail.topicBreakdown.length > 0 && (
                                <div className="adm-inspector-topics">
                                  <span className="adm-sub-label">Topics in this test:</span>
                                  <div className="adm-topic-chip-row">
                                    {detail.topicBreakdown.map(tb => (
                                      <div key={`${tb.subject}-${tb.topic}`} className="adm-topic-stat-chip">
                                        <strong>{tb.topic}</strong>
                                        <span className="mono-num">
                                          {tb.correct}/{tb.attempted} ({tb.accuracy}%)
                                        </span>
                                        {tb.avgTimeMs > 0 && (
                                          <small className="mono-num">{formatMs(tb.avgTimeMs)}</small>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Tab Switch Timeline Warning */}
                              {detail.tabEvents && detail.tabEvents.length > 0 && (
                                <div className="adm-tab-timeline">
                                  <strong>
                                    Focus Integrity Alert: Student left the test tab {detail.tab_switches} time{detail.tab_switches !== 1 ? 's' : ''}
                                  </strong>
                                  <div className="adm-tab-events-chips">
                                    {detail.tabEvents.map((evt, idx) => (
                                      <span key={idx} className={`adm-tab-chip ${evt.event_type}`}>
                                        {evt.event_type === 'left' ? 'Left tab' : 'Returned'} at{' '}
                                        <span className="mono-num">{formatClockTimeWithSeconds(evt.event_at)}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Question-by-Question Review Controls */}
                              <div className="adm-answers-toolbar">
                                <div className="adm-outcome-tabs">
                                  {[
                                    { id: 'all', label: `All (${detail.answers?.length || 0})` },
                                    {
                                      id: 'correct',
                                      label: `Right (${(detail.answers || []).filter(a => a.outcome === 'correct').length})`
                                    },
                                    {
                                      id: 'wrong',
                                      label: `Wrong (${(detail.answers || []).filter(a => a.outcome === 'wrong').length})`
                                    },
                                    {
                                      id: 'timeout',
                                      label: `Timed Out (${(detail.answers || []).filter(a => a.outcome === 'timeout').length})`
                                    }
                                  ].map(tab => (
                                    <button
                                      key={tab.id}
                                      type="button"
                                      className={`adm-outcome-tab ${answerOutcomeFilter === tab.id ? 'is-active' : ''} tone-${tab.id}`}
                                      onClick={() => setAnswerOutcomeFilter(tab.id)}
                                    >
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>

                                <div className="adm-answers-right-tools">
                                  <input
                                    type="text"
                                    className="adm-inline-search"
                                    placeholder="Search questions in this test..."
                                    value={answerSearch}
                                    onChange={(e) => setAnswerSearch(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="adm-btn-secondary"
                                    onClick={() => handleExportSessionCsv(detail)}
                                    disabled={!detail.answers || detail.answers.length === 0}
                                  >
                                    Export Test CSV
                                  </button>
                                </div>
                              </div>

                              {/* Per-Question Table */}
                              {!detail.answers || detail.answers.length === 0 ? (
                                <div className="adm-no-answers-note">
                                  No individual question answers were logged for this session (e.g., open-ended practice or session exited before answering).
                                </div>
                              ) : filteredAnswers.length === 0 ? (
                                <div className="adm-no-answers-note">
                                  No questions match this filter.
                                </div>
                              ) : (
                                <div className="adm-q-review-table-wrap">
                                  <table className="adm-q-review-table">
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        <th>Question &amp; Topic</th>
                                        <th>Student Answer</th>
                                        <th>Correct Answer</th>
                                        <th className="num">Pace</th>
                                        <th className="num">Time</th>
                                        <th className="num">Result</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredAnswers.map((ans, idx) => (
                                        <tr key={ans.id || idx} className={`outcome-${ans.outcome}`}>
                                          <td className="mono-num adm-q-idx">{idx + 1}</td>
                                          <td className="adm-q-text-cell">
                                            <div className="adm-q-prompt">{ans.question_text || '(Untitled question)'}</div>
                                            <div className="adm-q-sub-tags">
                                              <span className={`adm-tiny-tag tone-${getSubjectTone(ans.subject)}`}>
                                                {ans.subject}
                                              </span>
                                              {ans.topic && <span className="adm-q-topic-tag">{ans.topic}</span>}
                                            </div>
                                          </td>
                                          <td className="adm-ans-cell">
                                            {ans.outcome === 'timeout' ? (
                                              <span className="adm-timeout-text">No answer (timed out)</span>
                                            ) : (
                                              <span className={ans.is_correct ? 'adm-ans-right' : 'adm-ans-wrong'}>
                                                {ans.given_answer || '—'}
                                              </span>
                                            )}
                                          </td>
                                          <td className="adm-ans-cell">
                                            <strong className="adm-ans-correct">{ans.correct_answer || '—'}</strong>
                                          </td>
                                          <td className="num mono-num">{formatMs(ans.time_taken_ms)}</td>
                                          <td className="num mono-num adm-muted-time">
                                            {formatClockTimeWithSeconds(ans.answered_at)}
                                          </td>
                                          <td className="num">
                                            <span className={`adm-result-pill is-${ans.outcome}`}>
                                              {ans.outcome === 'correct'
                                                ? '✓ Right'
                                                : ans.outcome === 'timeout'
                                                  ? '⏱ Timed Out'
                                                  : '✗ Wrong'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="adm-inspector-loading">Could not load session details.</div>
                          )}
                        </Motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                )
              })}
            </div>
          </section>

          {/* Verified Active Focus Time (from FocusRewardTracker) */}
          {focusActivity.length > 0 && (
            <section className="adm-panel adm-focus-panel">
              <div className="adm-card-head">
                <h3>Verified Active Study Time ({focusActivity.length})</h3>
                <span className="adm-card-hint">Server-verified active focus minutes tracked per subject</span>
              </div>
              <div className="adm-focus-chips">
                {focusActivity.map((fa, idx) => (
                  <div key={`${fa.playerName}-${fa.focusDate}-${fa.subject}-${idx}`} className="adm-focus-card">
                    <div className="adm-focus-top">
                      <strong>{fa.playerName}</strong>
                      <span className={`adm-tiny-tag tone-${getSubjectTone(fa.subject)}`}>{fa.subject}</span>
                    </div>
                    <div className="adm-focus-val mono-num">{fa.verifiedMinutes} min verified</div>
                    <div className="adm-focus-sub mono-num">
                      {fa.focusDate} &middot; {fa.rewardedBlocks} focus block{fa.rewardedBlocks !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default DailyTestLogView
