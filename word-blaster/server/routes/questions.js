import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

function parseQuestion(row) {
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : null
  }
}

// GET /api/questions - Get all questions (public, for game)
router.get('/', async (req, res) => {
  try {
    const pool = getPool()
    const { subject, topic } = req.query

    let query = 'SELECT q.*, COALESCE(qs.correct, 0) as "correctCount", COALESCE(qs.wrong, 0) as "wrongCount" FROM questions q LEFT JOIN question_stats qs ON q.id = qs.question_id'
    const conditions = []
    const params = []
    let paramIndex = 1

    if (subject) {
      conditions.push(`q.subject = $${paramIndex++}`)
      params.push(subject)
    }
    if (topic) {
      const topics = topic.split(',')
      const placeholders = topics.map(() => `$${paramIndex++}`)
      conditions.push(`q.topic IN (${placeholders.join(',')})`)
      params.push(...topics)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY q.subject, q.topic, q.created_at'

    const result = await pool.query(query, params)
    res.json(result.rows.map(parseQuestion))
  } catch (err) {
    console.error('Fetch questions error:', err)
    res.status(500).json({ error: 'Failed to fetch questions.' })
  }
})

// GET /api/questions/topics - Get available subjects and topics
router.get('/topics', async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT subject, topic, COUNT(*) as count
      FROM questions
      GROUP BY subject, topic
      ORDER BY subject, topic
    `)

    const subjects = {}
    for (const row of result.rows) {
      if (!subjects[row.subject]) {
        subjects[row.subject] = []
      }
      subjects[row.subject].push({ topic: row.topic, count: parseInt(row.count) })
    }

    res.json(subjects)
  } catch (err) {
    console.error('Fetch topics error:', err)
    res.status(500).json({ error: 'Failed to fetch topics.' })
  }
})

// GET /api/questions/:id - Get single question
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT q.*, COALESCE(qs.correct, 0) as "correctCount", COALESCE(qs.wrong, 0) as "wrongCount"
      FROM questions q LEFT JOIN question_stats qs ON q.id = qs.question_id
      WHERE q.id = $1
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' })
    }

    res.json(parseQuestion(result.rows[0]))
  } catch (err) {
    console.error('Fetch question error:', err)
    res.status(500).json({ error: 'Failed to fetch question.' })
  }
})

// POST /api/questions - Create question (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject, topic, question, answer, type, options, hint, image } = req.body

    if (!subject || !topic || !question || !answer) {
      return res.status(400).json({ error: 'Subject, topic, question, and answer are required.' })
    }

    if (type === 'multiple' && (!options || !Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ error: 'Multiple choice questions need at least 2 options.' })
    }

    const pool = getPool()
    const id = uuidv4()

    await pool.query(
      `INSERT INTO questions (id, subject, topic, question, answer, type, options, hint, image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, subject, topic, question, answer, type || 'text', options ? JSON.stringify(options) : null, hint || null, image || null]
    )

    await pool.query('INSERT INTO question_stats (question_id, correct, wrong) VALUES ($1, 0, 0)', [id])

    const result = await pool.query('SELECT * FROM questions WHERE id = $1', [id])
    res.status(201).json(parseQuestion(result.rows[0]))
  } catch (err) {
    console.error('Create question error:', err)
    res.status(500).json({ error: 'Failed to create question.' })
  }
})

// PUT /api/questions/:id - Update question (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const existing = await pool.query('SELECT * FROM questions WHERE id = $1', [req.params.id])

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' })
    }

    const row = existing.rows[0]
    const { subject, topic, question, answer, type, options, hint, image } = req.body

    await pool.query(
      `UPDATE questions
       SET subject = $1, topic = $2, question = $3, answer = $4, type = $5, options = $6, hint = $7, image = $8, updated_at = NOW()
       WHERE id = $9`,
      [
        subject || row.subject,
        topic || row.topic,
        question || row.question,
        answer || row.answer,
        type || row.type,
        options ? JSON.stringify(options) : row.options,
        hint !== undefined ? hint : row.hint,
        image !== undefined ? image : row.image,
        req.params.id
      ]
    )

    const result = await pool.query('SELECT * FROM questions WHERE id = $1', [req.params.id])
    res.json(parseQuestion(result.rows[0]))
  } catch (err) {
    console.error('Update question error:', err)
    res.status(500).json({ error: 'Failed to update question.' })
  }
})

// DELETE /api/questions/:id - Delete question (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const existing = await pool.query('SELECT * FROM questions WHERE id = $1', [req.params.id])

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' })
    }

    await pool.query('DELETE FROM question_stats WHERE question_id = $1', [req.params.id])
    await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id])

    res.json({ message: 'Question deleted successfully.' })
  } catch (err) {
    console.error('Delete question error:', err)
    res.status(500).json({ error: 'Failed to delete question.' })
  }
})

// POST /api/questions/bulk - Bulk import questions (admin only)
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { questions } = req.body

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required.' })
    }

    const pool = getPool()
    const client = await pool.connect()
    let imported = 0
    let errors = []

    try {
      await client.query('BEGIN')

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        try {
          if (!q.subject || !q.topic || !q.question || !q.answer) {
            errors.push({ row: i + 1, error: 'Missing required fields (subject, topic, question, answer)' })
            continue
          }

          const id = q.id || uuidv4()
          await client.query(
            `INSERT INTO questions (id, subject, topic, question, answer, type, options, hint, image)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, q.subject, q.topic, q.question, q.answer, q.type || 'text', q.options ? JSON.stringify(q.options) : null, q.hint || null, q.image || null]
          )
          await client.query('INSERT INTO question_stats (question_id, correct, wrong) VALUES ($1, 0, 0)', [id])
          imported++
        } catch (err) {
          errors.push({ row: i + 1, error: err.message })
        }
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    res.json({ imported, errors, total: questions.length })
  } catch (err) {
    console.error('Bulk import error:', err)
    res.status(500).json({ error: 'Failed to import questions.' })
  }
})

export default router
