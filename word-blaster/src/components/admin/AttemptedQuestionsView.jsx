import { useState, useEffect, useCallback } from 'react'
import { quizSessionApi } from '../../utils/api'
import {
  downloadCsv,
  formatClockTimeWithSeconds,
  formatDateTimeCompact,
  formatGameMode,
  formatMs,
  formatReadableDate,
  getLocalDateString,
  getSubjectTone,
  shiftDateString
} from './adminFormatters'

function AttemptedQuestionsView({
  selectedDate,
  onDateChange,
  range,
  onRangeChange,
  initialFilters = null
}) {
  const [player, setPlayer] = useState(initialFilters?.player || '')
  const [subject, setSubject] = useState(initialFilters?.subject || '')
  const [topic, setTopic] = useState(initialFilters?.topic || '')
  const [resultFilter, setResultFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [data, setData] = useState({
    attempts: [],
    total: 0,
    correctCount: 0,
    wrongCount: 0,
    timeoutCount: 0,
    avgTimeMs: 0
  })
  const [filterMeta, setFilterMeta] = useState({ players: [], subjects: [], topics: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const todayStr = getLocalDateString()

  useEffect(() => {
    if (!initialFilters) return
    if (initialFilters.player !== undefined) setPlayer(initialFilters.player)
    if (initialFilters.subject !== undefined) setSubject(initialFilters.subject)
    if (initialFilters.topic !== undefined) setTopic(initialFilters.topic)
  }, [initialFilters])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(t)
  }, [search])

  // Load filter dropdown options once
  useEffect(() => {
    quizSessionApi.getDailyReport({ range: 'all' })
      .then(res => {
        if (res?.filters) setFilterMeta(res.filters)
      })
      .catch(console.error)
  }, [])

  const loadAttempts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await quizSessionApi.getAttempts({
        range,
        date: selectedDate,
        player,
        subject,
        topic,
        result: resultFilter,
        search: debouncedSearch,
        limit: 300
      })
      setData(res)
    } catch (err) {
      console.error('Failed to load attempts:', err)
      setError(err.message || 'Failed to load attempted questions.')
    } finally {
      setIsLoading(false)
    }
  }, [range, selectedDate, player, subject, topic, resultFilter, debouncedSearch])

  useEffect(() => {
    loadAttempts()
  }, [loadAttempts])

  const accuracy = data.total > 0 ? Math.round((data.correctCount / data.total) * 100) : 0

  const handleExportCsv = () => {
    const headers = [
      'Answered At',
      'Student',
      'Subject',
      'Topic',
      'Mode',
      'Question',
      'Student Answer',
      'Correct Answer',
      'Result',
      'Time Taken'
    ]
    const rows = (data.attempts || []).map(a => [
      formatDateTimeCompact(a.answered_at),
      a.player_name,
      a.subject,
      a.topic,
      formatGameMode(a.game_mode),
      a.question_text,
      a.given_answer || (a.outcome === 'timeout' ? '(Timed out)' : ''),
      a.correct_answer,
      a.outcome === 'correct' ? 'Right' : a.outcome === 'timeout' ? 'Timed Out' : 'Wrong',
      formatMs(a.time_taken_ms)
    ])
    downloadCsv(`attempted-questions-${range === 'day' ? selectedDate : range}.csv`, headers, rows)
  }

  return (
    <div className="adm-view">
      {/* Date + Filter Toolbar */}
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

          <div className="adm-range-segment">
            {[
              { id: 'day', label: 'Single Day' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'all', label: 'All Time' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                className={`adm-seg-btn ${range === item.id ? 'is-active' : ''}`}
                onClick={() => onRangeChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="adm-toolbar-actions">
            <button type="button" className="adm-btn-secondary" onClick={loadAttempts}>
              Refresh
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={handleExportCsv}
              disabled={!data.attempts || data.attempts.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="adm-filter-bar">
          <div className="adm-filter-group">
            <label htmlFor="att-player">Student</label>
            <select id="att-player" value={player} onChange={(e) => setPlayer(e.target.value)}>
              <option value="">All Students</option>
              {filterMeta.players.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="adm-filter-group">
            <label htmlFor="att-subject">Subject</label>
            <select id="att-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {filterMeta.subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="adm-filter-group">
            <label htmlFor="att-topic">Topic</label>
            <select id="att-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">All Topics</option>
              {filterMeta.topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="adm-filter-group">
            <label htmlFor="att-result">Result</label>
            <select id="att-result" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
              <option value="all">All Results</option>
              <option value="correct">Right Only</option>
              <option value="missed">All Missed (Wrong + Timed Out)</option>
              <option value="wrong">Wrong Answer Only</option>
              <option value="timeout">Timed Out Only</option>
            </select>
          </div>

          <div className="adm-filter-group adm-filter-grow">
            <label htmlFor="att-search">Search</label>
            <input
              id="att-search"
              type="text"
              placeholder="Search question, topic, or answer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Compact Metrics Strip */}
      <section className="adm-kpi-grid adm-kpi-grid-4">
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Questions Matched</span>
          <strong className="adm-kpi-value mono-num">{data.total || 0}</strong>
          <span className="adm-kpi-sub">
            {range === 'day' ? formatReadableDate(selectedDate) : `Showing up to 300 latest`}
          </span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Answered Right</span>
          <strong className="adm-kpi-value mono-num tone-good">{data.correctCount || 0}</strong>
          <span className="adm-kpi-sub">{accuracy}% accuracy</span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Wrong / Timed Out</span>
          <strong className="adm-kpi-value mono-num tone-low">
            {(data.wrongCount || 0) + (data.timeoutCount || 0)}
          </strong>
          <span className="adm-kpi-sub">
            {data.wrongCount || 0} wrong &middot; {data.timeoutCount || 0} timed out
          </span>
        </div>
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Avg Time / Question</span>
          <strong className="adm-kpi-value mono-num">{formatMs(data.avgTimeMs)}</strong>
          <span className="adm-kpi-sub">Across timed attempts</span>
        </div>
      </section>

      {error && <div className="adm-alert-error">{error}</div>}

      <section className="adm-panel adm-tests-panel">
        <div className="adm-card-head">
          <h3>Every Question Attempted ({data.attempts?.length || 0} of {data.total || 0})</h3>
          <span className="adm-card-hint">Ordered most recent first</span>
        </div>

        {isLoading ? (
          <div className="adm-loading-box">Loading question attempts...</div>
        ) : !data.attempts || data.attempts.length === 0 ? (
          <div className="adm-empty-box">
            <h3>No attempted questions found</h3>
            <p>Try picking a different day, switching to "Last 30 Days" or "All Time", or broadening your filters.</p>
          </div>
        ) : (
          <div className="adm-q-review-table-wrap">
            <table className="adm-q-review-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Question &amp; Topic</th>
                  <th>Student Answer</th>
                  <th>Correct Answer</th>
                  <th className="num">Pace</th>
                  <th className="num">Result</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map(att => (
                  <tr key={att.id} className={`outcome-${att.outcome}`}>
                    <td className="mono-num adm-muted-time">
                      {range === 'day'
                        ? formatClockTimeWithSeconds(att.answered_at)
                        : formatDateTimeCompact(att.answered_at)}
                    </td>
                    <td>
                      <strong className="adm-cell-student">{att.player_name}</strong>
                      <div className="adm-cell-mode">{formatGameMode(att.game_mode)}</div>
                    </td>
                    <td className="adm-q-text-cell">
                      <div className="adm-q-prompt">{att.question_text || '(Untitled question)'}</div>
                      <div className="adm-q-sub-tags">
                        <span className={`adm-tiny-tag tone-${getSubjectTone(att.subject)}`}>
                          {att.subject}
                        </span>
                        {att.topic && <span className="adm-q-topic-tag">{att.topic}</span>}
                      </div>
                    </td>
                    <td className="adm-ans-cell">
                      {att.outcome === 'timeout' ? (
                        <span className="adm-timeout-text">No answer (timed out)</span>
                      ) : (
                        <span className={att.is_correct ? 'adm-ans-right' : 'adm-ans-wrong'}>
                          {att.given_answer || '—'}
                        </span>
                      )}
                    </td>
                    <td className="adm-ans-cell">
                      <strong className="adm-ans-correct">{att.correct_answer || '—'}</strong>
                    </td>
                    <td className="num mono-num">{formatMs(att.time_taken_ms)}</td>
                    <td className="num">
                      <span className={`adm-result-pill is-${att.outcome}`}>
                        {att.outcome === 'correct'
                          ? '✓ Right'
                          : att.outcome === 'timeout'
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
      </section>
    </div>
  )
}

export default AttemptedQuestionsView
