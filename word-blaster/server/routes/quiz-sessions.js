import { Router } from 'express'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

function parseTzOffset(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(-840, Math.min(840, Math.trunc(n)))
}

function parseDateStr(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

function parseTopicsField(topics) {
  if (!topics) return []
  if (Array.isArray(topics)) return topics.map(String).filter(Boolean)
  if (typeof topics === 'string') {
    const trimmed = topics.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
      return parsed ? [String(parsed)] : []
    } catch {
      return trimmed.split(',').map(s => s.trim()).filter(Boolean)
    }
  }
  return []
}

function buildDateWindow({ range, date, startDate, endDate, tzOffset }) {
  const safeRange = ['day', '7d', '30d', 'all', 'custom'].includes(range) ? range : 'day'
  const validDate = parseDateStr(date)
  const validStart = parseDateStr(startDate)
  const validEnd = parseDateStr(endDate)

  if (safeRange === 'all') {
    return { mode: 'all', startDate: null, endDate: null }
  }
  if (safeRange === 'custom' && (validStart || validEnd)) {
    return {
      mode: 'custom',
      startDate: validStart || validEnd,
      endDate: validEnd || validStart
    }
  }
  if (safeRange === '7d' || safeRange === '30d') {
    const days = safeRange === '7d' ? 6 : 29
    // Compute anchor date in client's local timezone
    const nowLocalMs = Date.now() - tzOffset * 60 * 1000
    const end = validDate ? new Date(`${validDate}T00:00:00Z`) : new Date(nowLocalMs)
    const endIso = end.toISOString().slice(0, 10)
    const start = new Date(`${endIso}T00:00:00Z`)
    start.setUTCDate(start.getUTCDate() - days)
    return {
      mode: safeRange,
      startDate: start.toISOString().slice(0, 10),
      endDate: endIso
    }
  }

  // Default: single day
  const nowLocalMs = Date.now() - tzOffset * 60 * 1000
  const targetDay = validDate || new Date(nowLocalMs).toISOString().slice(0, 10)
  return {
    mode: 'day',
    startDate: targetDay,
    endDate: targetDay
  }
}

// POST /api/quiz-sessions - Start a new quiz session (public)
router.post('/', async (req, res) => {
  try {
    const pool = getPool()
    const { learnerId, playerName, subject, topics, gameMode, minTimeRequired } = req.body
    const parsedLearnerId = Number.isInteger(Number(learnerId)) && Number(learnerId) > 0
      ? Number(learnerId)
      : null

    const result = await pool.query(
      `INSERT INTO quiz_sessions (learner_id, player_name, subject, topics, game_mode, min_time_required, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, started_at`,
      [
        parsedLearnerId,
        (playerName && String(playerName).trim()) || 'Anonymous',
        subject || '',
        topics ? JSON.stringify(Array.isArray(topics) ? topics : [topics]) : '[]',
        gameMode || 'quiz',
        minTimeRequired || 900
      ]
    )

    res.status(201).json({
      sessionId: result.rows[0].id,
      startedAt: result.rows[0].started_at
    })
  } catch (err) {
    console.error('Create quiz session error:', err)
    res.status(500).json({ error: 'Failed to create quiz session' })
  }
})

// PUT /api/quiz-sessions/:id/answer - Record an answer within a session
router.put('/:id/answer', async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params
    const {
      questionId,
      questionText,
      correctAnswer,
      givenAnswer,
      isCorrect,
      timeTakenMs,
      subject,
      topic,
      outcome
    } = req.body

    const normalizedGiven = givenAnswer !== undefined && givenAnswer !== null && String(givenAnswer).trim() !== ''
      ? String(givenAnswer).trim()
      : null
    const resolvedOutcome = outcome
      || (isCorrect ? 'correct' : (normalizedGiven === null ? 'timeout' : 'wrong'))

    await pool.query(
      `INSERT INTO quiz_session_answers
         (session_id, question_id, question_text, correct_answer, given_answer, is_correct, time_taken_ms, subject, topic, outcome)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        questionId || null,
        questionText || '',
        correctAnswer !== undefined && correctAnswer !== null ? String(correctAnswer) : '',
        normalizedGiven,
        Boolean(isCorrect),
        Math.max(0, Math.round(Number(timeTakenMs) || 0)),
        subject || null,
        topic || null,
        resolvedOutcome
      ]
    )

    // Update running totals on the session
    if (isCorrect) {
      await pool.query(
        'UPDATE quiz_sessions SET correct_answers = correct_answers + 1 WHERE id = $1',
        [id]
      )
    } else {
      await pool.query(
        'UPDATE quiz_sessions SET wrong_answers = wrong_answers + 1 WHERE id = $1',
        [id]
      )
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Record quiz answer error:', err)
    res.status(500).json({ error: 'Failed to record answer' })
  }
})

// PUT /api/quiz-sessions/:id/tab-event - Record a tab switch event
router.put('/:id/tab-event', async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params
    const { eventType } = req.body // 'left' or 'returned'

    await pool.query(
      'INSERT INTO quiz_tab_events (session_id, event_type) VALUES ($1, $2)',
      [id, eventType || 'left']
    )

    // Increment tab_switches count when user leaves
    if (eventType === 'left') {
      await pool.query(
        'UPDATE quiz_sessions SET tab_switches = tab_switches + 1 WHERE id = $1',
        [id]
      )
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Record tab event error:', err)
    res.status(500).json({ error: 'Failed to record tab event' })
  }
})

async function updateSessionActivity(req, res) {
  try {
    const pool = getPool()
    const { id } = req.params
    const {
      score,
      bestStreak,
      durationSeconds,
      correctAnswers,
      wrongAnswers,
      subject,
      topics,
      completed
    } = req.body

    await pool.query(
      `UPDATE quiz_sessions
       SET score = GREATEST(score, COALESCE($2, score)),
           best_streak = GREATEST(best_streak, COALESCE($3, best_streak)),
           duration_seconds = GREATEST(duration_seconds, COALESCE($4, duration_seconds)),
           correct_answers = GREATEST(correct_answers, COALESCE($5, correct_answers)),
           wrong_answers = GREATEST(wrong_answers, COALESCE($6, wrong_answers)),
           subject = COALESCE($7, subject),
           topics = COALESCE($8, topics),
           completed = CASE WHEN $9 = TRUE THEN TRUE ELSE completed END,
           finished_at = CASE WHEN $9 = TRUE THEN COALESCE(finished_at, NOW()) ELSE finished_at END
       WHERE id = $1`,
      [
        id,
        score === undefined ? null : score,
        bestStreak === undefined ? null : bestStreak,
        durationSeconds === undefined ? null : durationSeconds,
        correctAnswers === undefined ? null : correctAnswers,
        wrongAnswers === undefined ? null : wrongAnswers,
        subject || null,
        topics === undefined ? null : JSON.stringify(Array.isArray(topics) ? topics : [topics]),
        completed === true
      ]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Update quiz session activity error:', err)
    res.status(500).json({ error: 'Failed to update session activity' })
  }
}

// PUT/POST /api/quiz-sessions/:id/activity - Update live active time/totals for open-ended activities
router.put('/:id/activity', updateSessionActivity)
router.post('/:id/activity', updateSessionActivity)

// PUT /api/quiz-sessions/:id/complete - Mark session as completed
router.put('/:id/complete', async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params
    const { score, bestStreak, durationSeconds, correctAnswers, wrongAnswers, subject, topics } = req.body

    await pool.query(
      `UPDATE quiz_sessions
       SET completed = TRUE,
           finished_at = NOW(),
           score = GREATEST(score, COALESCE($2, score)),
           best_streak = GREATEST(best_streak, COALESCE($3, best_streak)),
           duration_seconds = GREATEST(duration_seconds, COALESCE($4, duration_seconds)),
           correct_answers = GREATEST(correct_answers, COALESCE($5, correct_answers)),
           wrong_answers = GREATEST(wrong_answers, COALESCE($6, wrong_answers)),
           subject = COALESCE($7, subject),
           topics = COALESCE($8, topics)
       WHERE id = $1`,
      [
        id,
        score === undefined ? null : score,
        bestStreak === undefined ? null : bestStreak,
        durationSeconds === undefined ? null : durationSeconds,
        correctAnswers === undefined ? null : correctAnswers,
        wrongAnswers === undefined ? null : wrongAnswers,
        subject || null,
        topics === undefined ? null : JSON.stringify(Array.isArray(topics) ? topics : [topics])
      ]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Complete quiz session error:', err)
    res.status(500).json({ error: 'Failed to complete session' })
  }
})

// ============================================================================
// ADMIN REPORTING ENDPOINTS (must be declared BEFORE GET /:id)
// ============================================================================

// GET /api/quiz-sessions/daily-report - Comprehensive day/range report for Admin
router.get('/daily-report', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const tzOffset = parseTzOffset(req.query.tzOffset)
    const window = buildDateWindow({
      range: req.query.range || 'day',
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      tzOffset
    })
    const playerFilter = req.query.player ? String(req.query.player).trim() : ''
    const subjectFilter = req.query.subject ? String(req.query.subject).trim() : ''
    const topicFilter = req.query.topic ? String(req.query.topic).trim() : ''
    const statusFilter = req.query.status ? String(req.query.status).trim() : ''

    const localDateExpr = (col) => `((${col} AT TIME ZONE 'UTC') - ($1 * INTERVAL '1 minute'))::date`

    // 1. Build WHERE clause for sessions matching the active filters
    const sessionConditions = []
    const sessionParams = [tzOffset]
    let pIdx = 2

    if (window.startDate) {
      sessionConditions.push(`${localDateExpr('qs.started_at')} >= $${pIdx}::date`)
      sessionParams.push(window.startDate)
      pIdx += 1
    }
    if (window.endDate) {
      sessionConditions.push(`${localDateExpr('qs.started_at')} <= $${pIdx}::date`)
      sessionParams.push(window.endDate)
      pIdx += 1
    }
    if (playerFilter) {
      sessionConditions.push(`LOWER(COALESCE(qs.player_name, 'Anonymous')) = LOWER($${pIdx})`)
      sessionParams.push(playerFilter)
      pIdx += 1
    }
    if (subjectFilter) {
      sessionConditions.push(`LOWER(COALESCE(qs.subject, '')) = LOWER($${pIdx})`)
      sessionParams.push(subjectFilter)
      pIdx += 1
    }
    if (statusFilter === 'completed') {
      sessionConditions.push('qs.completed = TRUE')
    } else if (statusFilter === 'incomplete') {
      sessionConditions.push('qs.completed = FALSE')
    }

    const sessionWhere = sessionConditions.length > 0
      ? `WHERE ${sessionConditions.join(' AND ')}`
      : ''

    // 2. Fetch sessions with aggregated answer metrics
    const sessionsQuery = `
      SELECT
        qs.id,
        qs.learner_id,
        COALESCE(NULLIF(TRIM(qs.player_name), ''), 'Anonymous') AS player_name,
        COALESCE(NULLIF(TRIM(qs.subject), ''), 'General') AS subject,
        qs.topics,
        COALESCE(qs.game_mode, 'quiz') AS game_mode,
        qs.score,
        qs.correct_answers,
        qs.wrong_answers,
        qs.best_streak,
        qs.tab_switches,
        qs.min_time_required,
        qs.duration_seconds,
        qs.started_at,
        qs.finished_at,
        qs.completed,
        ${localDateExpr('qs.started_at')}::text AS local_date,
        COALESCE(ans.total_answers, 0)::int AS total_answers,
        COALESCE(ans.ans_correct, 0)::int AS ans_correct,
        COALESCE(ans.ans_wrong, 0)::int AS ans_wrong,
        COALESCE(ans.ans_timeout, 0)::int AS ans_timeout,
        COALESCE(ans.avg_time_ms, 0)::int AS avg_question_ms,
        ans.last_answered_at,
        COALESCE(ans.answer_topics, ARRAY[]::text[]) AS answer_topics,
        COALESCE(ans.answer_subjects, ARRAY[]::text[]) AS answer_subjects
      FROM quiz_sessions qs
      LEFT JOIN (
        SELECT
          qsa.session_id,
          COUNT(*) AS total_answers,
          COUNT(*) FILTER (WHERE qsa.is_correct = TRUE) AS ans_correct,
          COUNT(*) FILTER (
            WHERE qsa.is_correct = FALSE
              AND COALESCE(qsa.outcome, CASE WHEN qsa.given_answer IS NULL OR TRIM(qsa.given_answer) = '' THEN 'timeout' ELSE 'wrong' END) != 'timeout'
          ) AS ans_wrong,
          COUNT(*) FILTER (
            WHERE qsa.is_correct = FALSE
              AND COALESCE(qsa.outcome, CASE WHEN qsa.given_answer IS NULL OR TRIM(qsa.given_answer) = '' THEN 'timeout' ELSE 'wrong' END) = 'timeout'
          ) AS ans_timeout,
          ROUND(AVG(NULLIF(qsa.time_taken_ms, 0))) AS avg_time_ms,
          MAX(qsa.answered_at) AS last_answered_at,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(NULLIF(TRIM(qsa.topic), ''), NULLIF(TRIM(q.topic), ''))), NULL) AS answer_topics,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(NULLIF(TRIM(qsa.subject), ''), NULLIF(TRIM(q.subject), ''))), NULL) AS answer_subjects
        FROM quiz_session_answers qsa
        LEFT JOIN questions q ON q.id = qsa.question_id
        GROUP BY qsa.session_id
      ) ans ON ans.session_id = qs.id
      ${sessionWhere}
      ORDER BY qs.started_at DESC
      LIMIT 300
    `

    // 3. Calendar activity for the last 42 days (filtered by player & subject if selected)
    const calConditions = [
      `${localDateExpr('qs.started_at')} >= ((((NOW() AT TIME ZONE 'UTC') - ($1 * INTERVAL '1 minute'))::date) - INTERVAL '41 days')::date`
    ]
    const calParams = [tzOffset]
    let cIdx = 2
    if (playerFilter) {
      calConditions.push(`LOWER(COALESCE(qs.player_name, 'Anonymous')) = LOWER($${cIdx})`)
      calParams.push(playerFilter)
      cIdx += 1
    }
    if (subjectFilter) {
      calConditions.push(`LOWER(COALESCE(qs.subject, '')) = LOWER($${cIdx})`)
      calParams.push(subjectFilter)
      cIdx += 1
    }

    const calendarQuery = `
      SELECT
        ${localDateExpr('qs.started_at')}::text AS day,
        COUNT(*)::int AS sessions_count,
        COUNT(*) FILTER (WHERE qs.completed = TRUE)::int AS completed_count,
        COALESCE(SUM(GREATEST(qs.correct_answers, COALESCE(ans.ans_correct, 0))), 0)::int AS correct_count,
        COALESCE(SUM(GREATEST(qs.wrong_answers, COALESCE(ans.ans_wrong_total, 0))), 0)::int AS wrong_count,
        COALESCE(SUM(GREATEST(
          COALESCE(qs.duration_seconds, 0),
          COALESCE(EXTRACT(EPOCH FROM (COALESCE(qs.finished_at, ans.last_answered_at) - qs.started_at))::int, 0)
        )), 0)::int AS duration_seconds,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(TRIM(qs.subject), '')), NULL) AS subjects
      FROM quiz_sessions qs
      LEFT JOIN (
        SELECT
          session_id,
          COUNT(*) FILTER (WHERE is_correct = TRUE) AS ans_correct,
          COUNT(*) FILTER (WHERE is_correct = FALSE) AS ans_wrong_total,
          MAX(answered_at) AS last_answered_at
        FROM quiz_session_answers
        GROUP BY session_id
      ) ans ON ans.session_id = qs.id
      WHERE ${calConditions.join(' AND ')}
      GROUP BY day
      ORDER BY day DESC
    `

    // 4. Per-topic breakdown from answers within the matched sessions
    const topicBreakdownQuery = `
      SELECT
        COALESCE(NULLIF(TRIM(qsa.subject), ''), NULLIF(TRIM(q.subject), ''), NULLIF(TRIM(qs.subject), ''), 'General') AS subject,
        COALESCE(NULLIF(TRIM(qsa.topic), ''), NULLIF(TRIM(q.topic), ''), 'General') AS topic,
        COUNT(*)::int AS attempted,
        COUNT(*) FILTER (WHERE qsa.is_correct = TRUE)::int AS correct,
        COUNT(*) FILTER (
          WHERE qsa.is_correct = FALSE
            AND COALESCE(qsa.outcome, CASE WHEN qsa.given_answer IS NULL OR TRIM(qsa.given_answer) = '' THEN 'timeout' ELSE 'wrong' END) != 'timeout'
        )::int AS wrong,
        COUNT(*) FILTER (
          WHERE qsa.is_correct = FALSE
            AND COALESCE(qsa.outcome, CASE WHEN qsa.given_answer IS NULL OR TRIM(qsa.given_answer) = '' THEN 'timeout' ELSE 'wrong' END) = 'timeout'
        )::int AS timeout,
        COALESCE(ROUND(AVG(NULLIF(qsa.time_taken_ms, 0))), 0)::int AS avg_time_ms,
        COUNT(DISTINCT qsa.session_id)::int AS sessions
      FROM quiz_session_answers qsa
      JOIN quiz_sessions qs ON qs.id = qsa.session_id
      LEFT JOIN questions q ON q.id = qsa.question_id
      ${sessionWhere}
      GROUP BY 1, 2
      ORDER BY attempted DESC, subject, topic
    `

    // 5. Filter dropdown options across all sessions & learners
    const filtersQuery = `
      SELECT
        ARRAY(
          SELECT DISTINCT name FROM (
            SELECT COALESCE(NULLIF(TRIM(player_name), ''), 'Anonymous') AS name FROM quiz_sessions
            UNION
            SELECT name FROM learner_accounts
          ) p ORDER BY name
        ) AS players,
        ARRAY(
          SELECT DISTINCT NULLIF(TRIM(subject), '') FROM quiz_sessions WHERE subject IS NOT NULL AND TRIM(subject) != '' ORDER BY 1
        ) AS subjects
    `

    // 6. Focus time logs for the date window (if available)
    const focusConditions = []
    const focusParams = []
    let fIdx = 1
    if (window.startDate) {
      focusConditions.push(`lfd.focus_date >= $${fIdx}::date`)
      focusParams.push(window.startDate)
      fIdx += 1
    }
    if (window.endDate) {
      focusConditions.push(`lfd.focus_date <= $${fIdx}::date`)
      focusParams.push(window.endDate)
      fIdx += 1
    }
    if (playerFilter) {
      focusConditions.push(`LOWER(la.name) = LOWER($${fIdx})`)
      focusParams.push(playerFilter)
      fIdx += 1
    }
    if (subjectFilter) {
      focusConditions.push(`LOWER(lfd.subject) = LOWER($${fIdx})`)
      focusParams.push(subjectFilter)
      fIdx += 1
    }
    const focusWhere = focusConditions.length > 0 ? `WHERE ${focusConditions.join(' AND ')}` : ''

    const focusQuery = `
      SELECT
        la.name AS player_name,
        lfd.focus_date::text AS focus_date,
        lfd.subject,
        lfd.verified_active_ms,
        lfd.rewarded_blocks,
        lfd.last_heartbeat_at
      FROM learner_focus_daily lfd
      JOIN learner_accounts la ON la.id = lfd.learner_id
      ${focusWhere}
      ORDER BY lfd.focus_date DESC, lfd.verified_active_ms DESC
      LIMIT 100
    `

    const [sessionsRes, calendarRes, topicRes, filtersRes, focusRes] = await Promise.all([
      pool.query(sessionsQuery, sessionParams),
      pool.query(calendarQuery, calParams),
      pool.query(topicBreakdownQuery, sessionParams),
      pool.query(filtersQuery),
      pool.query(focusQuery, focusParams)
    ])

    // Enrich and optionally filter sessions by topicFilter
    let sessions = sessionsRes.rows.map(row => {
      const sessionTopics = parseTopicsField(row.topics)
      const mergedTopics = [...new Set([...sessionTopics, ...(row.answer_topics || [])])].filter(Boolean)
      const effectiveCorrect = Math.max(Number(row.correct_answers) || 0, Number(row.ans_correct) || 0)
      const effectiveWrongTotal = Math.max(
        Number(row.wrong_answers) || 0,
        (Number(row.ans_wrong) || 0) + (Number(row.ans_timeout) || 0)
      )
      const timeoutCount = Number(row.ans_timeout) || 0
      const pureWrongCount = Math.max(0, effectiveWrongTotal - timeoutCount)
      const totalAttempted = Math.max(Number(row.total_answers) || 0, effectiveCorrect + effectiveWrongTotal)

      // Compute duration even if incomplete or duration_seconds wasn't finalized
      let effectiveDuration = Number(row.duration_seconds) || 0
      const endTimestamp = row.finished_at || row.last_answered_at
      if (effectiveDuration === 0 && row.started_at && endTimestamp) {
        effectiveDuration = Math.max(0, Math.round((new Date(endTimestamp) - new Date(row.started_at)) / 1000))
      }

      const accuracy = totalAttempted > 0 ? Math.round((effectiveCorrect / totalAttempted) * 100) : 0

      return {
        id: row.id,
        learnerId: row.learner_id,
        player_name: row.player_name,
        subject: row.subject,
        topics: mergedTopics,
        game_mode: row.game_mode,
        score: Number(row.score) || 0,
        correct_answers: effectiveCorrect,
        wrong_answers: pureWrongCount,
        timeout_count: timeoutCount,
        total_wrong: effectiveWrongTotal,
        total_answers: totalAttempted,
        recorded_answers_count: Number(row.total_answers) || 0,
        accuracy,
        avg_question_ms: Number(row.avg_question_ms) || 0,
        best_streak: Number(row.best_streak) || 0,
        tab_switches: Number(row.tab_switches) || 0,
        duration_seconds: effectiveDuration,
        started_at: row.started_at,
        finished_at: row.finished_at || (row.completed ? row.last_answered_at : null),
        last_activity_at: endTimestamp || row.started_at,
        completed: Boolean(row.completed),
        local_date: row.local_date
      }
    })

    if (topicFilter) {
      const needle = topicFilter.toLowerCase()
      sessions = sessions.filter(s => s.topics.some(t => t.toLowerCase() === needle))
    }

    // Topic breakdown filtered if topicFilter set
    let topicBreakdown = topicRes.rows.map(r => {
      const attempted = Number(r.attempted) || 0
      const correct = Number(r.correct) || 0
      return {
        subject: r.subject,
        topic: r.topic,
        attempted,
        correct,
        wrong: Number(r.wrong) || 0,
        timeout: Number(r.timeout) || 0,
        accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
        avgTimeMs: Number(r.avg_time_ms) || 0,
        sessions: Number(r.sessions) || 0
      }
    })

    if (topicFilter) {
      const needle = topicFilter.toLowerCase()
      topicBreakdown = topicBreakdown.filter(t => t.topic.toLowerCase() === needle)
    }

    // Build subject breakdown from matched sessions
    const subjectMap = new Map()
    for (const s of sessions) {
      const key = s.subject || 'General'
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subject: key,
          sessions: 0,
          completedSessions: 0,
          durationSeconds: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          timeout: 0,
          topicsSet: new Set()
        })
      }
      const entry = subjectMap.get(key)
      entry.sessions += 1
      if (s.completed) entry.completedSessions += 1
      entry.durationSeconds += s.duration_seconds
      entry.attempted += s.total_answers
      entry.correct += s.correct_answers
      entry.wrong += s.wrong_answers
      entry.timeout += s.timeout_count
      s.topics.forEach(t => entry.topicsSet.add(t))
    }

    const subjectBreakdown = Array.from(subjectMap.values())
      .map(e => ({
        subject: e.subject,
        sessions: e.sessions,
        completedSessions: e.completedSessions,
        durationSeconds: e.durationSeconds,
        attempted: e.attempted,
        correct: e.correct,
        wrong: e.wrong,
        timeout: e.timeout,
        accuracy: e.attempted > 0 ? Math.round((e.correct / e.attempted) * 100) : 0,
        topics: Array.from(e.topicsSet)
      }))
      .sort((a, b) => b.durationSeconds - a.durationSeconds || b.attempted - a.attempted)

    // Summary metrics
    const totalSessions = sessions.length
    const completedSessions = sessions.filter(s => s.completed).length
    const totalDurationSeconds = sessions.reduce((acc, s) => acc + s.duration_seconds, 0)
    const totalCorrect = sessions.reduce((acc, s) => acc + s.correct_answers, 0)
    const totalWrong = sessions.reduce((acc, s) => acc + s.wrong_answers, 0)
    const totalTimeout = sessions.reduce((acc, s) => acc + s.timeout_count, 0)
    const totalAttempted = sessions.reduce((acc, s) => acc + s.total_answers, 0)
    const totalTabSwitches = sessions.reduce((acc, s) => acc + s.tab_switches, 0)

    const avgMsSamples = sessions.filter(s => s.avg_question_ms > 0)
    const avgQuestionTimeMs = avgMsSamples.length > 0
      ? Math.round(avgMsSamples.reduce((acc, s) => acc + s.avg_question_ms, 0) / avgMsSamples.length)
      : 0

    const sortedByStart = [...sessions].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    const firstStartedAt = sortedByStart[0]?.started_at || null
    const lastFinishedAt = sortedByStart.length > 0
      ? sortedByStart.reduce((latest, s) => {
          const candidate = s.finished_at || s.last_activity_at || s.started_at
          return !latest || new Date(candidate) > new Date(latest) ? candidate : latest
        }, null)
      : null

    const allTopicsInPeriod = [...new Set(sessions.flatMap(s => s.topics))]
    const allTopicsAvailable = [...new Set([
      ...topicRes.rows.map(r => r.topic),
      ...sessionsRes.rows.flatMap(r => [...parseTopicsField(r.topics), ...(r.answer_topics || [])])
    ])].filter(Boolean).sort()

    res.json({
      window,
      summary: {
        totalSessions,
        completedSessions,
        incompleteSessions: totalSessions - completedSessions,
        totalDurationSeconds,
        avgDurationSeconds: totalSessions > 0 ? Math.round(totalDurationSeconds / totalSessions) : 0,
        totalAttempted,
        totalCorrect,
        totalWrong,
        totalTimeout,
        accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
        avgQuestionTimeMs,
        totalTabSwitches,
        firstStartedAt,
        lastFinishedAt,
        subjectsCount: subjectBreakdown.length,
        topicsCount: allTopicsInPeriod.length
      },
      subjectBreakdown,
      topicBreakdown,
      sessions,
      calendarDays: calendarRes.rows.map(r => {
        const attempted = (Number(r.correct_count) || 0) + (Number(r.wrong_count) || 0)
        return {
          date: r.day,
          sessionsCount: Number(r.sessions_count) || 0,
          completedCount: Number(r.completed_count) || 0,
          correctCount: Number(r.correct_count) || 0,
          wrongCount: Number(r.wrong_count) || 0,
          attemptedCount: attempted,
          accuracy: attempted > 0 ? Math.round((Number(r.correct_count) / attempted) * 100) : 0,
          durationSeconds: Number(r.duration_seconds) || 0,
          subjects: r.subjects || []
        }
      }),
      focusActivity: focusRes.rows.map(r => ({
        playerName: r.player_name,
        focusDate: r.focus_date,
        subject: r.subject,
        verifiedMinutes: Math.round(((Number(r.verified_active_ms) || 0) / 60000) * 10) / 10,
        rewardedBlocks: Number(r.rewarded_blocks) || 0,
        lastHeartbeatAt: r.last_heartbeat_at
      })),
      filters: {
        players: filtersRes.rows[0]?.players || [],
        subjects: filtersRes.rows[0]?.subjects || [],
        topics: allTopicsAvailable
      }
    })
  } catch (err) {
    console.error('Daily report error:', err)
    res.status(500).json({ error: 'Failed to generate daily report' })
  }
})

// GET /api/quiz-sessions/attempts - Searchable log of every individual attempted question
router.get('/attempts', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const tzOffset = parseTzOffset(req.query.tzOffset)
    const window = buildDateWindow({
      range: req.query.range || 'day',
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      tzOffset
    })
    const playerFilter = req.query.player ? String(req.query.player).trim() : ''
    const subjectFilter = req.query.subject ? String(req.query.subject).trim() : ''
    const topicFilter = req.query.topic ? String(req.query.topic).trim() : ''
    const resultFilter = req.query.result ? String(req.query.result).trim() : 'all'
    const search = req.query.search ? String(req.query.search).trim() : ''
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200))
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)

    const localDateExpr = `((qsa.answered_at AT TIME ZONE 'UTC') - ($1 * INTERVAL '1 minute'))::date`
    const resolvedSubjectExpr = `COALESCE(NULLIF(TRIM(qsa.subject), ''), NULLIF(TRIM(q.subject), ''), NULLIF(TRIM(qs.subject), ''), 'General')`
    const resolvedTopicExpr = `COALESCE(NULLIF(TRIM(qsa.topic), ''), NULLIF(TRIM(q.topic), ''), 'General')`
    const resolvedOutcomeExpr = `COALESCE(NULLIF(TRIM(qsa.outcome), ''), CASE WHEN qsa.is_correct = TRUE THEN 'correct' WHEN qsa.given_answer IS NULL OR TRIM(qsa.given_answer) = '' THEN 'timeout' ELSE 'wrong' END)`

    const conditions = []
    const params = [tzOffset]
    let pIdx = 2

    if (window.startDate) {
      conditions.push(`${localDateExpr} >= $${pIdx}::date`)
      params.push(window.startDate)
      pIdx += 1
    }
    if (window.endDate) {
      conditions.push(`${localDateExpr} <= $${pIdx}::date`)
      params.push(window.endDate)
      pIdx += 1
    }
    if (playerFilter) {
      conditions.push(`LOWER(COALESCE(qs.player_name, 'Anonymous')) = LOWER($${pIdx})`)
      params.push(playerFilter)
      pIdx += 1
    }
    if (subjectFilter) {
      conditions.push(`LOWER(${resolvedSubjectExpr}) = LOWER($${pIdx})`)
      params.push(subjectFilter)
      pIdx += 1
    }
    if (topicFilter) {
      conditions.push(`LOWER(${resolvedTopicExpr}) = LOWER($${pIdx})`)
      params.push(topicFilter)
      pIdx += 1
    }
    if (resultFilter === 'correct') {
      conditions.push(`${resolvedOutcomeExpr} = 'correct'`)
    } else if (resultFilter === 'wrong') {
      conditions.push(`${resolvedOutcomeExpr} = 'wrong'`)
    } else if (resultFilter === 'timeout') {
      conditions.push(`${resolvedOutcomeExpr} = 'timeout'`)
    } else if (resultFilter === 'missed') {
      conditions.push(`qsa.is_correct = FALSE`)
    }
    if (search) {
      conditions.push(`(
        qsa.question_text ILIKE $${pIdx}
        OR qsa.correct_answer ILIKE $${pIdx}
        OR COALESCE(qsa.given_answer, '') ILIKE $${pIdx}
        OR ${resolvedTopicExpr} ILIKE $${pIdx}
      )`)
      params.push(`%${search}%`)
      pIdx += 1
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const listQuery = `
      SELECT
        qsa.id,
        qsa.session_id,
        qsa.question_id,
        qsa.question_text,
        qsa.correct_answer,
        qsa.given_answer,
        qsa.is_correct,
        ${resolvedOutcomeExpr} AS outcome,
        qsa.time_taken_ms,
        qsa.answered_at,
        ${resolvedSubjectExpr} AS subject,
        ${resolvedTopicExpr} AS topic,
        COALESCE(NULLIF(TRIM(qs.player_name), ''), 'Anonymous') AS player_name,
        COALESCE(qs.game_mode, 'quiz') AS game_mode
      FROM quiz_session_answers qsa
      JOIN quiz_sessions qs ON qs.id = qsa.session_id
      LEFT JOIN questions q ON q.id = qsa.question_id
      ${whereClause}
      ORDER BY qsa.answered_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `

    const countQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ${resolvedOutcomeExpr} = 'correct')::int AS correct_count,
        COUNT(*) FILTER (WHERE ${resolvedOutcomeExpr} = 'wrong')::int AS wrong_count,
        COUNT(*) FILTER (WHERE ${resolvedOutcomeExpr} = 'timeout')::int AS timeout_count,
        COALESCE(ROUND(AVG(NULLIF(qsa.time_taken_ms, 0))), 0)::int AS avg_time_ms
      FROM quiz_session_answers qsa
      JOIN quiz_sessions qs ON qs.id = qsa.session_id
      LEFT JOIN questions q ON q.id = qsa.question_id
      ${whereClause}
    `

    const [rowsRes, countRes] = await Promise.all([
      pool.query(listQuery, [...params, limit, offset]),
      pool.query(countQuery, params)
    ])

    const stats = countRes.rows[0] || {}
    res.json({
      window,
      total: Number(stats.total) || 0,
      correctCount: Number(stats.correct_count) || 0,
      wrongCount: Number(stats.wrong_count) || 0,
      timeoutCount: Number(stats.timeout_count) || 0,
      avgTimeMs: Number(stats.avg_time_ms) || 0,
      attempts: rowsRes.rows
    })
  } catch (err) {
    console.error('Fetch question attempts error:', err)
    res.status(500).json({ error: 'Failed to fetch question attempts' })
  }
})

// GET /api/quiz-sessions/learners-overview - All students with study & performance summary
router.get('/learners-overview', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT
        la.id,
        la.name,
        la.daily_required_minutes,
        la.created_at,
        COALESCE(dqt.minutes_completed, 0) AS today_minutes,
        COALESCE(dqt.sessions_count, 0) AS today_sessions,
        COALESCE(sess.total_sessions, 0)::int AS total_sessions,
        COALESCE(sess.completed_sessions, 0)::int AS completed_sessions,
        COALESCE(sess.total_duration_seconds, 0)::int AS total_duration_seconds,
        COALESCE(sess.total_correct, 0)::int AS total_correct,
        COALESCE(sess.total_wrong, 0)::int AS total_wrong,
        COALESCE(sess.total_tab_switches, 0)::int AS total_tab_switches,
        sess.last_session_at,
        COALESCE(sess.subjects, ARRAY[]::text[]) AS subjects,
        COALESCE(earn.unpaid_ksh, 0) AS unpaid_ksh,
        COALESCE(focus.today_verified_ms, 0) AS today_verified_ms
      FROM learner_accounts la
      LEFT JOIN daily_quiz_time dqt
        ON dqt.learner_id = la.id AND dqt.quiz_date = CURRENT_DATE
      LEFT JOIN (
        SELECT
          LOWER(COALESCE(player_name, '')) AS pkey,
          COUNT(*) AS total_sessions,
          COUNT(*) FILTER (WHERE completed = TRUE) AS completed_sessions,
          COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds,
          COALESCE(SUM(correct_answers), 0) AS total_correct,
          COALESCE(SUM(wrong_answers), 0) AS total_wrong,
          COALESCE(SUM(tab_switches), 0) AS total_tab_switches,
          MAX(started_at) AS last_session_at,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(TRIM(subject), '')), NULL) AS subjects
        FROM quiz_sessions
        GROUP BY LOWER(COALESCE(player_name, ''))
      ) sess ON sess.pkey = LOWER(la.name)
      LEFT JOIN (
        SELECT
          learner_id,
          COALESCE(SUM(CASE WHEN paid = FALSE THEN amount_ksh ELSE 0 END), 0) AS unpaid_ksh
        FROM learner_earnings
        GROUP BY learner_id
      ) earn ON earn.learner_id = la.id
      LEFT JOIN (
        SELECT
          learner_id,
          COALESCE(SUM(verified_active_ms), 0) AS today_verified_ms
        FROM learner_focus_daily
        WHERE focus_date = CURRENT_DATE
        GROUP BY learner_id
      ) focus ON focus.learner_id = la.id
      ORDER BY sess.last_session_at DESC NULLS LAST, la.name ASC
    `)

    res.json(result.rows.map(r => {
      const attempted = (Number(r.total_correct) || 0) + (Number(r.total_wrong) || 0)
      return {
        id: r.id,
        name: r.name,
        dailyRequiredMinutes: Number(r.daily_required_minutes) || 30,
        createdAt: r.created_at,
        todayMinutes: Math.round((Number(r.today_minutes) || 0) * 10) / 10,
        todayVerifiedMinutes: Math.round(((Number(r.today_verified_ms) || 0) / 60000) * 10) / 10,
        todaySessions: Number(r.today_sessions) || 0,
        totalSessions: Number(r.total_sessions) || 0,
        completedSessions: Number(r.completed_sessions) || 0,
        totalDurationSeconds: Number(r.total_duration_seconds) || 0,
        totalCorrect: Number(r.total_correct) || 0,
        totalWrong: Number(r.total_wrong) || 0,
        totalAttempted: attempted,
        accuracy: attempted > 0 ? Math.round((Number(r.total_correct) / attempted) * 100) : 0,
        totalTabSwitches: Number(r.total_tab_switches) || 0,
        lastSessionAt: r.last_session_at,
        subjects: r.subjects || [],
        unpaidKsh: Math.round((Number(r.unpaid_ksh) || 0) * 100) / 100
      }
    }))
  } catch (err) {
    console.error('Learners overview error:', err)
    res.status(500).json({ error: 'Failed to load learners overview' })
  }
})

// GET /api/quiz-sessions - Admin: list all sessions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const limit = parseInt(req.query.limit, 10) || 50
    const offset = parseInt(req.query.offset, 10) || 0

    const result = await pool.query(
      `SELECT qs.*,
        (SELECT COUNT(*) FROM quiz_session_answers WHERE session_id = qs.id) as "totalAnswers"
       FROM quiz_sessions qs
       ORDER BY qs.started_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    const countResult = await pool.query('SELECT COUNT(*) as count FROM quiz_sessions')

    res.json({
      sessions: result.rows.map(s => ({
        ...s,
        totalAnswers: parseInt(s.totalAnswers, 10)
      })),
      total: parseInt(countResult.rows[0].count, 10)
    })
  } catch (err) {
    console.error('Fetch quiz sessions error:', err)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

// GET /api/quiz-sessions/:id - Admin: get rich session detail with enriched answers, topics & tab events
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params

    const sessionResult = await pool.query('SELECT * FROM quiz_sessions WHERE id = $1', [id])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const session = sessionResult.rows[0]

    const [answersResult, tabEventsResult] = await Promise.all([
      pool.query(
        `SELECT
           qsa.*,
           COALESCE(NULLIF(TRIM(qsa.subject), ''), NULLIF(TRIM(q.subject), ''), $2, 'General') AS resolved_subject,
           COALESCE(NULLIF(TRIM(qsa.topic), ''), NULLIF(TRIM(q.topic), ''), 'General') AS resolved_topic,
           COALESCE(
             NULLIF(TRIM(qsa.outcome), ''),
             CASE
               WHEN qsa.is_correct = TRUE THEN 'correct'
               WHEN qsa.given_answer IS NULL OR TRIM(qsa.given_answer) = '' THEN 'timeout'
               ELSE 'wrong'
             END
           ) AS resolved_outcome
         FROM quiz_session_answers qsa
         LEFT JOIN questions q ON q.id = qsa.question_id
         WHERE qsa.session_id = $1
         ORDER BY qsa.answered_at ASC, qsa.id ASC`,
        [id, session.subject || null]
      ),
      pool.query(
        'SELECT * FROM quiz_tab_events WHERE session_id = $1 ORDER BY event_at ASC',
        [id]
      )
    ])

    const answers = answersResult.rows.map(a => ({
      ...a,
      subject: a.resolved_subject,
      topic: a.resolved_topic,
      outcome: a.resolved_outcome
    }))

    // Compute per-topic breakdown and timing stats inside this session
    const topicMap = new Map()
    let timeoutCount = 0
    let pureWrongCount = 0
    let correctCount = 0
    const validTimes = []

    for (const a of answers) {
      if (a.outcome === 'correct') correctCount += 1
      else if (a.outcome === 'timeout') timeoutCount += 1
      else pureWrongCount += 1

      const ms = Number(a.time_taken_ms) || 0
      if (ms > 0) validTimes.push(ms)

      const key = `${a.subject}:::${a.topic}`
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          subject: a.subject,
          topic: a.topic,
          attempted: 0,
          correct: 0,
          wrong: 0,
          timeout: 0,
          totalMs: 0,
          timedCount: 0
        })
      }
      const bucket = topicMap.get(key)
      bucket.attempted += 1
      if (a.outcome === 'correct') bucket.correct += 1
      else if (a.outcome === 'timeout') bucket.timeout += 1
      else bucket.wrong += 1
      if (ms > 0) {
        bucket.totalMs += ms
        bucket.timedCount += 1
      }
    }

    const topicBreakdown = Array.from(topicMap.values()).map(b => ({
      subject: b.subject,
      topic: b.topic,
      attempted: b.attempted,
      correct: b.correct,
      wrong: b.wrong,
      timeout: b.timeout,
      accuracy: b.attempted > 0 ? Math.round((b.correct / b.attempted) * 100) : 0,
      avgTimeMs: b.timedCount > 0 ? Math.round(b.totalMs / b.timedCount) : 0
    }))

    const avgQuestionTimeMs = validTimes.length > 0
      ? Math.round(validTimes.reduce((s, v) => s + v, 0) / validTimes.length)
      : 0
    const fastestQuestionMs = validTimes.length > 0 ? Math.min(...validTimes) : 0
    const slowestQuestionMs = validTimes.length > 0 ? Math.max(...validTimes) : 0

    let effectiveDuration = Number(session.duration_seconds) || 0
    const lastAnswerAt = answers.length > 0 ? answers[answers.length - 1].answered_at : null
    const effectiveFinish = session.finished_at || lastAnswerAt
    if (effectiveDuration === 0 && session.started_at && effectiveFinish) {
      effectiveDuration = Math.max(0, Math.round((new Date(effectiveFinish) - new Date(session.started_at)) / 1000))
    }

    const mergedTopics = [
      ...new Set([
        ...parseTopicsField(session.topics),
        ...topicBreakdown.map(t => t.topic).filter(t => t && t !== 'General')
      ])
    ]

    res.json({
      ...session,
      topics: mergedTopics,
      duration_seconds: effectiveDuration,
      finished_at: session.finished_at || (session.completed ? lastAnswerAt : null),
      last_activity_at: effectiveFinish || session.started_at,
      correct_answers: Math.max(Number(session.correct_answers) || 0, correctCount),
      wrong_answers: Math.max(Number(session.wrong_answers) || 0, pureWrongCount + timeoutCount),
      pure_wrong_count: pureWrongCount,
      timeout_count: timeoutCount,
      avg_question_ms: avgQuestionTimeMs,
      fastest_question_ms: fastestQuestionMs,
      slowest_question_ms: slowestQuestionMs,
      topicBreakdown,
      answers,
      tabEvents: tabEventsResult.rows
    })
  } catch (err) {
    console.error('Fetch quiz session detail error:', err)
    res.status(500).json({ error: 'Failed to fetch session details' })
  }
})

export default router
