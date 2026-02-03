import { Router } from 'express'
import { getDb } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// POST /api/stats/record - Record answer result (public, for game)
router.post('/record', (req, res) => {
  try {
    const { questionId, isCorrect } = req.body

    if (!questionId || isCorrect === undefined) {
      return res.status(400).json({ error: 'questionId and isCorrect are required.' })
    }

    const db = getDb()

    // Check if stats row exists
    const existing = db.prepare('SELECT * FROM question_stats WHERE question_id = ?').get(questionId)

    if (existing) {
      if (isCorrect) {
        db.prepare('UPDATE question_stats SET correct = correct + 1, last_attempted = CURRENT_TIMESTAMP WHERE question_id = ?').run(questionId)
      } else {
        db.prepare('UPDATE question_stats SET wrong = wrong + 1, last_attempted = CURRENT_TIMESTAMP WHERE question_id = ?').run(questionId)
      }
    } else {
      db.prepare('INSERT INTO question_stats (question_id, correct, wrong, last_attempted) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(
        questionId,
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1
      )
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Record stat error:', err)
    res.status(500).json({ error: 'Failed to record answer.' })
  }
})

// POST /api/stats/session - Save game session
router.post('/session', (req, res) => {
  try {
    const { playerName, subject, topics, score, correctAnswers, wrongAnswers, bestStreak, durationSeconds } = req.body

    const db = getDb()
    const result = db.prepare(`
      INSERT INTO game_sessions (player_name, subject, topics, score, correct_answers, wrong_answers, best_streak, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      playerName || 'Anonymous',
      subject || '',
      topics ? JSON.stringify(topics) : '[]',
      score || 0,
      correctAnswers || 0,
      wrongAnswers || 0,
      bestStreak || 0,
      durationSeconds || 0
    )

    res.json({ success: true, sessionId: result.lastInsertRowid })
  } catch (err) {
    console.error('Save session error:', err)
    res.status(500).json({ error: 'Failed to save session.' })
  }
})

// GET /api/stats/failed - Get most failed questions
router.get('/failed', (req, res) => {
  try {
    const db = getDb()
    const limit = parseInt(req.query.limit) || 20

    const failed = db.prepare(`
      SELECT q.*, qs.correct as correctCount, qs.wrong as wrongCount,
        CASE WHEN (qs.correct + qs.wrong) > 0
          THEN ROUND(CAST(qs.wrong AS REAL) / (qs.correct + qs.wrong) * 100, 1)
          ELSE 0
        END as failRate
      FROM questions q
      JOIN question_stats qs ON q.id = qs.question_id
      WHERE qs.wrong > 0
      ORDER BY failRate DESC, qs.wrong DESC
      LIMIT ?
    `).all(limit)

    res.json(failed.map(row => ({
      ...row,
      options: row.options ? JSON.parse(row.options) : null
    })))
  } catch (err) {
    console.error('Fetch failed questions error:', err)
    res.status(500).json({ error: 'Failed to fetch statistics.' })
  }
})

// GET /api/stats/overview - Admin analytics overview
router.get('/overview', authenticateToken, (req, res) => {
  try {
    const db = getDb()

    const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count
    const scienceCount = db.prepare("SELECT COUNT(*) as count FROM questions WHERE subject = 'Science'").get().count
    const englishCount = db.prepare("SELECT COUNT(*) as count FROM questions WHERE subject = 'English'").get().count
    const withImages = db.prepare('SELECT COUNT(*) as count FROM questions WHERE image IS NOT NULL AND image != ""').get().count

    const totalAttempts = db.prepare('SELECT COALESCE(SUM(correct + wrong), 0) as total FROM question_stats').get().total
    const totalCorrect = db.prepare('SELECT COALESCE(SUM(correct), 0) as total FROM question_stats').get().total
    const totalWrong = db.prepare('SELECT COALESCE(SUM(wrong), 0) as total FROM question_stats').get().total

    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM game_sessions').get().count
    const avgScore = db.prepare('SELECT COALESCE(AVG(score), 0) as avg FROM game_sessions').get().avg

    const topicBreakdown = db.prepare(`
      SELECT subject, topic, COUNT(*) as count
      FROM questions
      GROUP BY subject, topic
      ORDER BY subject, topic
    `).all()

    res.json({
      totalQuestions,
      scienceCount,
      englishCount,
      withImages,
      totalAttempts,
      totalCorrect,
      totalWrong,
      successRate: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      totalSessions,
      avgScore: Math.round(avgScore),
      topicBreakdown
    })
  } catch (err) {
    console.error('Stats overview error:', err)
    res.status(500).json({ error: 'Failed to fetch overview.' })
  }
})

// POST /api/stats/reset - Reset all question stats (admin only)
router.post('/reset', authenticateToken, (req, res) => {
  try {
    const db = getDb()
    db.prepare('UPDATE question_stats SET correct = 0, wrong = 0, last_attempted = NULL').run()
    res.json({ message: 'All statistics have been reset.' })
  } catch (err) {
    console.error('Reset stats error:', err)
    res.status(500).json({ error: 'Failed to reset statistics.' })
  }
})

export default router
