import { Router } from 'express'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// GET /api/passages - Get all passages with their questions
router.get('/', async (req, res) => {
  try {
    const pool = getPool()
    const { subject, topic } = req.query

    let query = 'SELECT * FROM passages'
    const params = []
    const conditions = []

    if (subject) {
      params.push(subject)
      conditions.push(`subject = $${params.length}`)
    }
    if (topic) {
      params.push(topic)
      conditions.push(`topic = $${params.length}`)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)

    const passages = []
    for (const p of result.rows) {
      const questionsResult = await pool.query(
        'SELECT id, question, answer, type, options, hint FROM passage_questions WHERE passage_id = $1 ORDER BY id',
        [p.id]
      )
      passages.push({
        ...p,
        questions: questionsResult.rows.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        }))
      })
    }

    res.json(passages)
  } catch (err) {
    console.error('Error fetching passages:', err)
    res.status(500).json({ error: 'Failed to fetch passages' })
  }
})

// POST /api/passages - Create a new passage (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id, subject, topic, title, content, questions } = req.body

    if (!id || !subject || !topic || !title || !content || !questions || !Array.isArray(questions) || questions.length < 1) {
      return res.status(400).json({ error: 'id, subject, topic, title, content, and at least 1 question are required' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        'INSERT INTO passages (id, subject, topic, title, content) VALUES ($1, $2, $3, $4, $5)',
        [id, subject, topic, title, content]
      )

      for (const q of questions) {
        await client.query(
          'INSERT INTO passage_questions (passage_id, question, answer, type, options, hint) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, q.question, q.answer, q.type || 'text', q.options ? JSON.stringify(q.options) : null, q.hint || null]
        )
      }

      await client.query('COMMIT')

      const questionsResult = await pool.query(
        'SELECT id, question, answer, type, options, hint FROM passage_questions WHERE passage_id = $1 ORDER BY id',
        [id]
      )

      res.status(201).json({
        id, subject, topic, title, content,
        questions: questionsResult.rows.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        }))
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Error creating passage:', err)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A passage with this ID already exists' })
    }
    res.status(500).json({ error: 'Failed to create passage' })
  }
})

// PUT /api/passages/:id - Update a passage (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params
    const { subject, topic, title, content, questions } = req.body

    if (!subject || !topic || !title || !content || !questions || !Array.isArray(questions) || questions.length < 1) {
      return res.status(400).json({ error: 'subject, topic, title, content, and at least 1 question are required' })
    }

    const exists = await pool.query('SELECT id FROM passages WHERE id = $1', [id])
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Passage not found' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        'UPDATE passages SET subject = $1, topic = $2, title = $3, content = $4 WHERE id = $5',
        [subject, topic, title, content, id]
      )

      await client.query('DELETE FROM passage_questions WHERE passage_id = $1', [id])

      for (const q of questions) {
        await client.query(
          'INSERT INTO passage_questions (passage_id, question, answer, type, options, hint) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, q.question, q.answer, q.type || 'text', q.options ? JSON.stringify(q.options) : null, q.hint || null]
        )
      }

      await client.query('COMMIT')

      const questionsResult = await pool.query(
        'SELECT id, question, answer, type, options, hint FROM passage_questions WHERE passage_id = $1 ORDER BY id',
        [id]
      )

      res.json({
        id, subject, topic, title, content,
        questions: questionsResult.rows.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        }))
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Error updating passage:', err)
    res.status(500).json({ error: 'Failed to update passage' })
  }
})

// DELETE /api/passages/:id - Delete a passage (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params

    const result = await pool.query('DELETE FROM passages WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Passage not found' })
    }

    res.json({ message: 'Passage deleted successfully' })
  } catch (err) {
    console.error('Error deleting passage:', err)
    res.status(500).json({ error: 'Failed to delete passage' })
  }
})

export default router
