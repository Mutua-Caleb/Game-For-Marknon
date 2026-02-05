import { Router } from 'express'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// POST /api/quiz-sessions - Start a new quiz session (public)
router.post('/', async (req, res) => {
  try {
    const pool = getPool()
    const { playerName, subject, topics, gameMode, minTimeRequired } = req.body

    const result = await pool.query(
      `INSERT INTO quiz_sessions (player_name, subject, topics, game_mode, min_time_required, started_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, started_at`,
      [
        playerName || 'Anonymous',
        subject || '',
        topics ? JSON.stringify(topics) : '[]',
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
    const { questionId, questionText, correctAnswer, givenAnswer, isCorrect, timeTakenMs } = req.body

    await pool.query(
      `INSERT INTO quiz_session_answers (session_id, question_id, question_text, correct_answer, given_answer, is_correct, time_taken_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, questionId, questionText, correctAnswer, givenAnswer || null, isCorrect, timeTakenMs || 0]
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
      [id, eventType]
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

// PUT /api/quiz-sessions/:id/complete - Mark session as completed
router.put('/:id/complete', async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params
    const { score, bestStreak, durationSeconds } = req.body

    await pool.query(
      `UPDATE quiz_sessions
       SET completed = TRUE, finished_at = NOW(), score = $2, best_streak = $3, duration_seconds = $4
       WHERE id = $1`,
      [id, score || 0, bestStreak || 0, durationSeconds || 0]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Complete quiz session error:', err)
    res.status(500).json({ error: 'Failed to complete session' })
  }
})

// GET /api/quiz-sessions - Admin: list all sessions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

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
        totalAnswers: parseInt(s.totalAnswers)
      })),
      total: parseInt(countResult.rows[0].count)
    })
  } catch (err) {
    console.error('Fetch quiz sessions error:', err)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

// GET /api/quiz-sessions/:id - Admin: get session detail with answers and tab events
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params

    const sessionResult = await pool.query('SELECT * FROM quiz_sessions WHERE id = $1', [id])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const [answersResult, tabEventsResult] = await Promise.all([
      pool.query(
        'SELECT * FROM quiz_session_answers WHERE session_id = $1 ORDER BY answered_at',
        [id]
      ),
      pool.query(
        'SELECT * FROM quiz_tab_events WHERE session_id = $1 ORDER BY event_at',
        [id]
      )
    ])

    res.json({
      ...sessionResult.rows[0],
      answers: answersResult.rows,
      tabEvents: tabEventsResult.rows
    })
  } catch (err) {
    console.error('Fetch quiz session detail error:', err)
    res.status(500).json({ error: 'Failed to fetch session details' })
  }
})

export default router
