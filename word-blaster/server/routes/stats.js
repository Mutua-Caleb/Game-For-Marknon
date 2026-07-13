import { Router } from 'express'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// POST /api/stats/record - Record answer result (public, for game)
router.post('/record', async (req, res) => {
  try {
    const { questionId, isCorrect } = req.body

    if (!questionId || isCorrect === undefined) {
      return res.status(400).json({ error: 'questionId and isCorrect are required.' })
    }

    const pool = getPool()

    const existing = await pool.query('SELECT * FROM question_stats WHERE question_id = $1', [questionId])

    if (existing.rows.length > 0) {
      if (isCorrect) {
        await pool.query('UPDATE question_stats SET correct = correct + 1, last_attempted = NOW() WHERE question_id = $1', [questionId])
      } else {
        await pool.query('UPDATE question_stats SET wrong = wrong + 1, last_attempted = NOW() WHERE question_id = $1', [questionId])
      }
    } else {
      await pool.query(
        'INSERT INTO question_stats (question_id, correct, wrong, last_attempted) VALUES ($1, $2, $3, NOW())',
        [questionId, isCorrect ? 1 : 0, isCorrect ? 0 : 1]
      )
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Record stat error:', err)
    res.status(500).json({ error: 'Failed to record answer.' })
  }
})

// POST /api/stats/session - Save game session
router.post('/session', async (req, res) => {
  try {
    const { playerName, subject, topics, score, correctAnswers, wrongAnswers, bestStreak, durationSeconds } = req.body

    const pool = getPool()
    const result = await pool.query(
      `INSERT INTO game_sessions (player_name, subject, topics, score, correct_answers, wrong_answers, best_streak, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        playerName || 'Anonymous',
        subject || '',
        topics ? JSON.stringify(topics) : '[]',
        score || 0,
        correctAnswers || 0,
        wrongAnswers || 0,
        bestStreak || 0,
        durationSeconds || 0
      ]
    )

    res.json({ success: true, sessionId: result.rows[0].id })
  } catch (err) {
    console.error('Save session error:', err)
    res.status(500).json({ error: 'Failed to save session.' })
  }
})

// GET /api/stats/failed - Get most failed questions
router.get('/failed', async (req, res) => {
  try {
    const pool = getPool()
    const limit = parseInt(req.query.limit) || 20

    const result = await pool.query(`
      SELECT q.*, qs.correct as "correctCount", qs.wrong as "wrongCount",
        CASE WHEN (qs.correct + qs.wrong) > 0
          THEN ROUND(CAST(qs.wrong AS NUMERIC) / (qs.correct + qs.wrong) * 100, 1)
          ELSE 0
        END as "failRate"
      FROM questions q
      JOIN question_stats qs ON q.id = qs.question_id
      WHERE qs.wrong > 0
      ORDER BY "failRate" DESC, qs.wrong DESC
      LIMIT $1
    `, [limit])

    res.json(result.rows.map(row => ({
      ...row,
      options: row.options ? JSON.parse(row.options) : null
    })))
  } catch (err) {
    console.error('Fetch failed questions error:', err)
    res.status(500).json({ error: 'Failed to fetch statistics.' })
  }
})

// GET /api/stats/overview - Admin analytics overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()

    const [totalQ, chemistryAttempts, englishQ, imagesQ, attempts, correct, wrong, sessions, avgScoreResult, topicResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM questions'),
      pool.query('SELECT COUNT(*) as count FROM chemistry_attempts'),
      pool.query("SELECT COUNT(*) as count FROM questions WHERE subject = 'English'"),
      pool.query("SELECT COUNT(*) as count FROM questions WHERE image IS NOT NULL AND image != ''"),
      pool.query('SELECT COALESCE(SUM(correct + wrong), 0) as total FROM question_stats'),
      pool.query('SELECT COALESCE(SUM(correct), 0) as total FROM question_stats'),
      pool.query('SELECT COALESCE(SUM(wrong), 0) as total FROM question_stats'),
      pool.query('SELECT COUNT(*) as count FROM game_sessions'),
      pool.query('SELECT COALESCE(AVG(score), 0) as avg FROM game_sessions'),
      pool.query(`
        SELECT subject, topic, COUNT(*) as count
        FROM questions
        GROUP BY subject, topic
        ORDER BY subject, topic
      `)
    ])

    const totalQuestions = parseInt(totalQ.rows[0].count)
    const chemistryAttemptCount = parseInt(chemistryAttempts.rows[0].count)
    const englishCount = parseInt(englishQ.rows[0].count)
    const withImages = parseInt(imagesQ.rows[0].count)
    const totalAttempts = parseInt(attempts.rows[0].total)
    const totalCorrect = parseInt(correct.rows[0].total)
    const totalWrong = parseInt(wrong.rows[0].total)
    const totalSessions = parseInt(sessions.rows[0].count)
    const avgScore = parseFloat(avgScoreResult.rows[0].avg)

    res.json({
      totalQuestions,
      chemistryAttemptCount,
      englishCount,
      withImages,
      totalAttempts,
      totalCorrect,
      totalWrong,
      successRate: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      totalSessions,
      avgScore: Math.round(avgScore),
      topicBreakdown: topicResult.rows.map(r => ({ ...r, count: parseInt(r.count) }))
    })
  } catch (err) {
    console.error('Stats overview error:', err)
    res.status(500).json({ error: 'Failed to fetch overview.' })
  }
})

// POST /api/stats/reset - Reset all question stats (admin only)
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    await pool.query('UPDATE question_stats SET correct = 0, wrong = 0, last_attempted = NULL')
    res.json({ message: 'All statistics have been reset.' })
  } catch (err) {
    console.error('Reset stats error:', err)
    res.status(500).json({ error: 'Failed to reset statistics.' })
  }
})

export default router
