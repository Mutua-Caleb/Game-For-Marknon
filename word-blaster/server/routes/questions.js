import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Helper to parse question row from DB
function parseQuestion(row) {
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : null
  }
}

// GET /api/questions - Get all questions (public, for game)
router.get('/', (req, res) => {
  try {
    const db = getDb()
    const { subject, topic } = req.query

    let query = 'SELECT q.*, COALESCE(qs.correct, 0) as correctCount, COALESCE(qs.wrong, 0) as wrongCount FROM questions q LEFT JOIN question_stats qs ON q.id = qs.question_id'
    const conditions = []
    const params = []

    if (subject) {
      conditions.push('q.subject = ?')
      params.push(subject)
    }
    if (topic) {
      const topics = topic.split(',')
      conditions.push(`q.topic IN (${topics.map(() => '?').join(',')})`)
      params.push(...topics)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY q.subject, q.topic, q.created_at'

    const questions = db.prepare(query).all(...params)
    res.json(questions.map(parseQuestion))
  } catch (err) {
    console.error('Fetch questions error:', err)
    res.status(500).json({ error: 'Failed to fetch questions.' })
  }
})

// GET /api/questions/topics - Get available subjects and topics
router.get('/topics', (req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT subject, topic, COUNT(*) as count
      FROM questions
      GROUP BY subject, topic
      ORDER BY subject, topic
    `).all()

    const subjects = {}
    for (const row of rows) {
      if (!subjects[row.subject]) {
        subjects[row.subject] = []
      }
      subjects[row.subject].push({ topic: row.topic, count: row.count })
    }

    res.json(subjects)
  } catch (err) {
    console.error('Fetch topics error:', err)
    res.status(500).json({ error: 'Failed to fetch topics.' })
  }
})

// GET /api/questions/:id - Get single question
router.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const question = db.prepare(`
      SELECT q.*, COALESCE(qs.correct, 0) as correctCount, COALESCE(qs.wrong, 0) as wrongCount
      FROM questions q LEFT JOIN question_stats qs ON q.id = qs.question_id
      WHERE q.id = ?
    `).get(req.params.id)

    if (!question) {
      return res.status(404).json({ error: 'Question not found.' })
    }

    res.json(parseQuestion(question))
  } catch (err) {
    console.error('Fetch question error:', err)
    res.status(500).json({ error: 'Failed to fetch question.' })
  }
})

// POST /api/questions - Create question (admin only)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { subject, topic, question, answer, type, options, hint, image } = req.body

    if (!subject || !topic || !question || !answer) {
      return res.status(400).json({ error: 'Subject, topic, question, and answer are required.' })
    }

    if (type === 'multiple' && (!options || !Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ error: 'Multiple choice questions need at least 2 options.' })
    }

    const db = getDb()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO questions (id, subject, topic, question, answer, type, options, hint, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, subject, topic, question, answer, type || 'text', options ? JSON.stringify(options) : null, hint || null, image || null)

    db.prepare('INSERT INTO question_stats (question_id, correct, wrong) VALUES (?, 0, 0)').run(id)

    const created = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
    res.status(201).json(parseQuestion(created))
  } catch (err) {
    console.error('Create question error:', err)
    res.status(500).json({ error: 'Failed to create question.' })
  }
})

// PUT /api/questions/:id - Update question (admin only)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)

    if (!existing) {
      return res.status(404).json({ error: 'Question not found.' })
    }

    const { subject, topic, question, answer, type, options, hint, image } = req.body

    db.prepare(`
      UPDATE questions
      SET subject = ?, topic = ?, question = ?, answer = ?, type = ?, options = ?, hint = ?, image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      subject || existing.subject,
      topic || existing.topic,
      question || existing.question,
      answer || existing.answer,
      type || existing.type,
      options ? JSON.stringify(options) : existing.options,
      hint !== undefined ? hint : existing.hint,
      image !== undefined ? image : existing.image,
      req.params.id
    )

    const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)
    res.json(parseQuestion(updated))
  } catch (err) {
    console.error('Update question error:', err)
    res.status(500).json({ error: 'Failed to update question.' })
  }
})

// DELETE /api/questions/:id - Delete question (admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)

    if (!existing) {
      return res.status(404).json({ error: 'Question not found.' })
    }

    db.prepare('DELETE FROM question_stats WHERE question_id = ?').run(req.params.id)
    db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id)

    res.json({ message: 'Question deleted successfully.' })
  } catch (err) {
    console.error('Delete question error:', err)
    res.status(500).json({ error: 'Failed to delete question.' })
  }
})

// POST /api/questions/bulk - Bulk import questions (admin only)
router.post('/bulk', authenticateToken, (req, res) => {
  try {
    const { questions } = req.body

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required.' })
    }

    const db = getDb()
    const insert = db.prepare(`
      INSERT INTO questions (id, subject, topic, question, answer, type, options, hint, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertStats = db.prepare('INSERT INTO question_stats (question_id, correct, wrong) VALUES (?, 0, 0)')

    let imported = 0
    let errors = []

    const insertMany = db.transaction((questions) => {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        try {
          if (!q.subject || !q.topic || !q.question || !q.answer) {
            errors.push({ row: i + 1, error: 'Missing required fields (subject, topic, question, answer)' })
            continue
          }

          const id = q.id || uuidv4()
          insert.run(
            id, q.subject, q.topic, q.question, q.answer,
            q.type || 'text',
            q.options ? JSON.stringify(q.options) : null,
            q.hint || null,
            q.image || null
          )
          insertStats.run(id)
          imported++
        } catch (err) {
          errors.push({ row: i + 1, error: err.message })
        }
      }
    })

    insertMany(questions)

    res.json({ imported, errors, total: questions.length })
  } catch (err) {
    console.error('Bulk import error:', err)
    res.status(500).json({ error: 'Failed to import questions.' })
  }
})

export default router
