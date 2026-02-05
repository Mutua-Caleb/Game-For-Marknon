import { Router } from 'express'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// GET /api/sequences - Get all sequences (optionally filtered by subject/topic)
router.get('/', async (req, res) => {
  try {
    const pool = getPool()
    const { subject, topic } = req.query

    let query = 'SELECT * FROM sequence_questions'
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

    // For each sequence, fetch its steps
    const sequences = []
    for (const seq of result.rows) {
      const stepsResult = await pool.query(
        'SELECT step_number, step_text FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_number',
        [seq.id]
      )
      sequences.push({
        ...seq,
        steps: stepsResult.rows
      })
    }

    res.json(sequences)
  } catch (err) {
    console.error('Error fetching sequences:', err)
    res.status(500).json({ error: 'Failed to fetch sequences' })
  }
})

// GET /api/sequences/:id - Get a single sequence with steps
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params

    const seqResult = await pool.query('SELECT * FROM sequence_questions WHERE id = $1', [id])
    if (seqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sequence not found' })
    }

    const stepsResult = await pool.query(
      'SELECT step_number, step_text FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_number',
      [id]
    )

    res.json({
      ...seqResult.rows[0],
      steps: stepsResult.rows
    })
  } catch (err) {
    console.error('Error fetching sequence:', err)
    res.status(500).json({ error: 'Failed to fetch sequence' })
  }
})

// POST /api/sequences - Create a new sequence (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id, subject, topic, title, description, image, steps } = req.body

    if (!id || !subject || !topic || !title || !steps || !Array.isArray(steps) || steps.length < 2) {
      return res.status(400).json({ error: 'id, subject, topic, title, and at least 2 steps are required' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO sequence_questions (id, subject, topic, title, description, image)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, subject, topic, title, description || null, image || null]
      )

      for (let i = 0; i < steps.length; i++) {
        await client.query(
          'INSERT INTO sequence_steps (sequence_id, step_number, step_text) VALUES ($1, $2, $3)',
          [id, i + 1, steps[i].step_text || steps[i]]
        )
      }

      await client.query('COMMIT')

      // Return the created sequence
      const stepsResult = await pool.query(
        'SELECT step_number, step_text FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_number',
        [id]
      )

      res.status(201).json({
        id, subject, topic, title, description, image,
        steps: stepsResult.rows
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Error creating sequence:', err)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A sequence with this ID already exists' })
    }
    res.status(500).json({ error: 'Failed to create sequence' })
  }
})

// DELETE /api/sequences/:id - Delete a sequence (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params

    const result = await pool.query('DELETE FROM sequence_questions WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sequence not found' })
    }

    res.json({ message: 'Sequence deleted successfully' })
  } catch (err) {
    console.error('Error deleting sequence:', err)
    res.status(500).json({ error: 'Failed to delete sequence' })
  }
})

export default router
