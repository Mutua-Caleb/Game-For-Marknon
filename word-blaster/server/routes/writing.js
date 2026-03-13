import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getPool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// GET /api/writing/prompts - Get all writing prompts (public, for learners)
router.get('/prompts', async (req, res) => {
  try {
    const pool = getPool()
    const { subject, topic } = req.query

    let query = 'SELECT * FROM writing_prompts'
    const conditions = []
    const params = []
    let paramIndex = 1

    if (subject) {
      conditions.push(`subject = $${paramIndex++}`)
      params.push(subject)
    }
    if (topic) {
      conditions.push(`topic = $${paramIndex++}`)
      params.push(topic)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY subject, topic, created_at'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error('Fetch writing prompts error:', err)
    res.status(500).json({ error: 'Failed to fetch writing prompts.' })
  }
})

// GET /api/writing/prompts/topics - Get available subjects and topics for writing
router.get('/prompts/topics', async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT subject, topic, COUNT(*) as count
      FROM writing_prompts
      GROUP BY subject, topic
      ORDER BY subject, topic
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Fetch writing topics error:', err)
    res.status(500).json({ error: 'Failed to fetch writing topics.' })
  }
})

// GET /api/writing/prompts/:id - Get a single writing prompt
router.get('/prompts/:id', async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query('SELECT * FROM writing_prompts WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Writing prompt not found.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Fetch writing prompt error:', err)
    res.status(500).json({ error: 'Failed to fetch writing prompt.' })
  }
})

// POST /api/writing/prompts - Create a writing prompt (admin only)
router.post('/prompts', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { subject, topic, title, prompt_text, guide_lines } = req.body

    if (!subject || !topic || !title || !prompt_text) {
      return res.status(400).json({ error: 'Subject, topic, title, and prompt_text are required.' })
    }

    const id = `wp_${uuidv4().slice(0, 8)}`
    await pool.query(
      `INSERT INTO writing_prompts (id, subject, topic, title, prompt_text, guide_lines)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, subject, topic, title, prompt_text, guide_lines !== false]
    )

    res.status(201).json({ id, subject, topic, title, prompt_text, guide_lines: guide_lines !== false })
  } catch (err) {
    console.error('Create writing prompt error:', err)
    res.status(500).json({ error: 'Failed to create writing prompt.' })
  }
})

// PUT /api/writing/prompts/:id - Update a writing prompt (admin only)
router.put('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { subject, topic, title, prompt_text, guide_lines } = req.body

    const result = await pool.query(
      `UPDATE writing_prompts SET subject = COALESCE($1, subject), topic = COALESCE($2, topic),
       title = COALESCE($3, title), prompt_text = COALESCE($4, prompt_text),
       guide_lines = COALESCE($5, guide_lines)
       WHERE id = $6 RETURNING *`,
      [subject, topic, title, prompt_text, guide_lines, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Writing prompt not found.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Update writing prompt error:', err)
    res.status(500).json({ error: 'Failed to update writing prompt.' })
  }
})

// DELETE /api/writing/prompts/:id - Delete a writing prompt (admin only)
router.delete('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query('DELETE FROM writing_prompts WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Writing prompt not found.' })
    }
    res.json({ message: 'Writing prompt deleted.', id: result.rows[0].id })
  } catch (err) {
    console.error('Delete writing prompt error:', err)
    res.status(500).json({ error: 'Failed to delete writing prompt.' })
  }
})

// POST /api/writing/submissions - Submit handwriting (learner)
router.post('/submissions', async (req, res) => {
  try {
    const pool = getPool()
    const { prompt_id, learner_id, strokes_data, thumbnail } = req.body

    if (!prompt_id || !learner_id || !strokes_data) {
      return res.status(400).json({ error: 'prompt_id, learner_id, and strokes_data are required.' })
    }

    const result = await pool.query(
      `INSERT INTO writing_submissions (prompt_id, learner_id, strokes_data, thumbnail)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [prompt_id, learner_id, JSON.stringify(strokes_data), thumbnail || null]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Create submission error:', err)
    res.status(500).json({ error: 'Failed to save submission.' })
  }
})

// GET /api/writing/submissions - Get all submissions (admin only)
router.get('/submissions', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { learner_id, prompt_id, limit = 50, offset = 0 } = req.query

    let query = `
      SELECT ws.*, wp.title as prompt_title, wp.prompt_text, wp.subject, wp.topic,
             la.name as learner_name
      FROM writing_submissions ws
      JOIN writing_prompts wp ON ws.prompt_id = wp.id
      JOIN learner_accounts la ON ws.learner_id = la.id
    `
    const conditions = []
    const params = []
    let paramIndex = 1

    if (learner_id) {
      conditions.push(`ws.learner_id = $${paramIndex++}`)
      params.push(learner_id)
    }
    if (prompt_id) {
      conditions.push(`ws.prompt_id = $${paramIndex++}`)
      params.push(prompt_id)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ` ORDER BY ws.submitted_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error('Fetch submissions error:', err)
    res.status(500).json({ error: 'Failed to fetch submissions.' })
  }
})

// GET /api/writing/submissions/:id - Get a single submission (admin only)
router.get('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT ws.*, wp.title as prompt_title, wp.prompt_text, wp.subject, wp.topic,
             la.name as learner_name
      FROM writing_submissions ws
      JOIN writing_prompts wp ON ws.prompt_id = wp.id
      JOIN learner_accounts la ON ws.learner_id = la.id
      WHERE ws.id = $1
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Fetch submission error:', err)
    res.status(500).json({ error: 'Failed to fetch submission.' })
  }
})

// PUT /api/writing/submissions/:id/review - Admin reviews a submission
router.put('/submissions/:id/review', authenticateToken, async (req, res) => {
  try {
    const pool = getPool()
    const { rating, feedback } = req.body

    const result = await pool.query(
      `UPDATE writing_submissions SET admin_rating = $1, admin_feedback = $2
       WHERE id = $3 RETURNING *`,
      [rating || null, feedback || null, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Review submission error:', err)
    res.status(500).json({ error: 'Failed to review submission.' })
  }
})

// GET /api/writing/learner/:learnerId - Get a learner's own submissions
router.get('/learner/:learnerId', async (req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT ws.id, ws.prompt_id, ws.admin_rating, ws.admin_feedback, ws.submitted_at,
             wp.title as prompt_title, wp.subject, wp.topic
      FROM writing_submissions ws
      JOIN writing_prompts wp ON ws.prompt_id = wp.id
      WHERE ws.learner_id = $1
      ORDER BY ws.submitted_at DESC
    `, [req.params.learnerId])

    res.json(result.rows)
  } catch (err) {
    console.error('Fetch learner submissions error:', err)
    res.status(500).json({ error: 'Failed to fetch submissions.' })
  }
})

export default router
