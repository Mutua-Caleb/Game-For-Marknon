import { Router } from 'express'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// GET /api/diagrams - Get all diagrams (optionally filtered by subject/topic)
router.get('/', async (req, res) => {
  try {
    const pool = getPool()
    const { subject, topic } = req.query

    let query = 'SELECT * FROM diagram_questions'
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

    // For each diagram, fetch its labels
    const diagrams = []
    for (const diag of result.rows) {
      const labelsResult = await pool.query(
        'SELECT label_key, correct_answer, x_percent, y_percent, pointer_x, pointer_y, hint FROM diagram_labels WHERE diagram_id = $1 ORDER BY label_key',
        [diag.id]
      )
      diagrams.push({
        ...diag,
        labels: labelsResult.rows
      })
    }

    res.json(diagrams)
  } catch (err) {
    console.error('Error fetching diagrams:', err)
    res.status(500).json({ error: 'Failed to fetch diagrams' })
  }
})

// GET /api/diagrams/:id - Get a single diagram with labels
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params

    const diagResult = await pool.query('SELECT * FROM diagram_questions WHERE id = $1', [id])
    if (diagResult.rows.length === 0) {
      return res.status(404).json({ error: 'Diagram not found' })
    }

    const labelsResult = await pool.query(
      'SELECT label_key, correct_answer, x_percent, y_percent, pointer_x, pointer_y, hint FROM diagram_labels WHERE diagram_id = $1 ORDER BY label_key',
      [id]
    )

    res.json({
      ...diagResult.rows[0],
      labels: labelsResult.rows
    })
  } catch (err) {
    console.error('Error fetching diagram:', err)
    res.status(500).json({ error: 'Failed to fetch diagram' })
  }
})

// POST /api/diagrams - Create a new diagram (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id, subject, topic, title, description, image_url, labels } = req.body

    if (!id || !subject || !topic || !title || !image_url || !labels || !Array.isArray(labels) || labels.length < 1) {
      return res.status(400).json({ error: 'id, subject, topic, title, image_url, and at least 1 label are required' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO diagram_questions (id, subject, topic, title, description, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, subject, topic, title, description || null, image_url]
      )

      for (const label of labels) {
        await client.query(
          `INSERT INTO diagram_labels (diagram_id, label_key, correct_answer, x_percent, y_percent, pointer_x, pointer_y, hint)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, label.label_key, label.correct_answer, label.x_percent, label.y_percent, label.pointer_x, label.pointer_y, label.hint || null]
        )
      }

      await client.query('COMMIT')

      const labelsResult = await pool.query(
        'SELECT label_key, correct_answer, x_percent, y_percent, pointer_x, pointer_y, hint FROM diagram_labels WHERE diagram_id = $1 ORDER BY label_key',
        [id]
      )

      res.status(201).json({
        id, subject, topic, title, description, image_url,
        labels: labelsResult.rows
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Error creating diagram:', err)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A diagram with this ID already exists' })
    }
    res.status(500).json({ error: 'Failed to create diagram' })
  }
})

// DELETE /api/diagrams/:id - Delete a diagram (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { id } = req.params

    const result = await pool.query('DELETE FROM diagram_questions WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Diagram not found' })
    }

    res.json({ message: 'Diagram deleted successfully' })
  } catch (err) {
    console.error('Error deleting diagram:', err)
    res.status(500).json({ error: 'Failed to delete diagram' })
  }
})

export default router
