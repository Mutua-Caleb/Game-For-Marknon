import { Router } from 'express'
import { getPool } from '../db.js'

const router = Router()

// POST /api/learners/login - Login with name + PIN
router.post('/login', async (req, res) => {
  try {
    const { name, pin } = req.body

    if (!name || !pin) {
      return res.status(400).json({ error: 'Name and PIN are required' })
    }

    const pool = getPool()
    const result = await pool.query(
      'SELECT id, name, daily_required_minutes FROM learner_accounts WHERE LOWER(name) = LOWER($1) AND pin = $2',
      [name.trim(), pin.trim()]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid name or PIN' })
    }

    const learner = result.rows[0]
    res.json({
      id: learner.id,
      name: learner.name,
      dailyRequiredMinutes: learner.daily_required_minutes
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/learners/register - Register a new learner (admin use)
router.post('/register', async (req, res) => {
  try {
    const { name, pin, dailyRequiredMinutes } = req.body

    if (!name || !pin) {
      return res.status(400).json({ error: 'Name and PIN are required' })
    }

    if (pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits' })
    }

    const pool = getPool()

    // Check if name already exists
    const existing = await pool.query(
      'SELECT id FROM learner_accounts WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    )

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A learner with that name already exists' })
    }

    const result = await pool.query(
      'INSERT INTO learner_accounts (name, pin, daily_required_minutes) VALUES ($1, $2, $3) RETURNING id, name, daily_required_minutes',
      [name.trim(), pin.trim(), dailyRequiredMinutes || 30]
    )

    const learner = result.rows[0]
    res.json({
      id: learner.id,
      name: learner.name,
      dailyRequiredMinutes: learner.daily_required_minutes
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/learners/daily-status/:learnerId - Check if daily quota is met
router.get('/daily-status/:learnerId', async (req, res) => {
  try {
    const { learnerId } = req.params
    const pool = getPool()

    // Get learner info
    const learnerResult = await pool.query(
      'SELECT id, name, daily_required_minutes FROM learner_accounts WHERE id = $1',
      [learnerId]
    )

    if (learnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Learner not found' })
    }

    const learner = learnerResult.rows[0]

    // Get today's quiz time
    const timeResult = await pool.query(
      'SELECT minutes_completed, sessions_count FROM daily_quiz_time WHERE learner_id = $1 AND quiz_date = CURRENT_DATE',
      [learnerId]
    )

    const minutesCompleted = timeResult.rows.length > 0 ? parseFloat(timeResult.rows[0].minutes_completed) : 0
    const sessionsCount = timeResult.rows.length > 0 ? parseInt(timeResult.rows[0].sessions_count) : 0
    const minutesRequired = learner.daily_required_minutes
    const quotaMet = minutesCompleted >= minutesRequired

    res.json({
      learnerId: parseInt(learnerId),
      learnerName: learner.name,
      quotaMet,
      minutesCompleted: Math.round(minutesCompleted * 10) / 10,
      minutesRequired,
      sessionsCount
    })
  } catch (err) {
    console.error('Daily status error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/learners/record-time - Record quiz time for a learner
router.post('/record-time', async (req, res) => {
  try {
    const { learnerId, minutes } = req.body

    if (!learnerId || minutes === undefined) {
      return res.status(400).json({ error: 'learnerId and minutes are required' })
    }

    const pool = getPool()

    // Upsert today's quiz time
    const result = await pool.query(
      `INSERT INTO daily_quiz_time (learner_id, quiz_date, minutes_completed, sessions_count, last_updated)
       VALUES ($1, CURRENT_DATE, $2, 1, NOW())
       ON CONFLICT (learner_id, quiz_date)
       DO UPDATE SET
         minutes_completed = daily_quiz_time.minutes_completed + $2,
         sessions_count = daily_quiz_time.sessions_count + 1,
         last_updated = NOW()
       RETURNING minutes_completed, sessions_count`,
      [learnerId, Math.max(0, parseFloat(minutes))]
    )

    const row = result.rows[0]
    res.json({
      minutesCompleted: Math.round(parseFloat(row.minutes_completed) * 10) / 10,
      sessionsCount: parseInt(row.sessions_count)
    })
  } catch (err) {
    console.error('Record time error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/learners/record-earning - Record correct answers and earnings
router.post('/record-earning', async (req, res) => {
  try {
    const { learnerId, correctAnswers } = req.body

    if (!learnerId || !correctAnswers || correctAnswers <= 0) {
      return res.status(400).json({ error: 'learnerId and positive correctAnswers are required' })
    }

    const RATE_PER_CORRECT = 0.50 // KSh 0.50 per correct answer
    const amountKsh = correctAnswers * RATE_PER_CORRECT

    const pool = getPool()

    const result = await pool.query(
      `INSERT INTO learner_earnings (learner_id, earning_date, amount_ksh, correct_answers, last_updated)
       VALUES ($1, CURRENT_DATE, $2, $3, NOW())
       ON CONFLICT (learner_id, earning_date)
       DO UPDATE SET
         amount_ksh = learner_earnings.amount_ksh + $2,
         correct_answers = learner_earnings.correct_answers + $3,
         last_updated = NOW()
       RETURNING amount_ksh, correct_answers`,
      [learnerId, amountKsh, correctAnswers]
    )

    const row = result.rows[0]
    res.json({
      todayEarnings: Math.round(parseFloat(row.amount_ksh) * 100) / 100,
      todayCorrect: parseInt(row.correct_answers)
    })
  } catch (err) {
    console.error('Record earning error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/learners/earnings/:learnerId - Get earnings summary
router.get('/earnings/:learnerId', async (req, res) => {
  try {
    const { learnerId } = req.params
    const pool = getPool()

    // Today's earnings
    const todayResult = await pool.query(
      'SELECT amount_ksh, correct_answers FROM learner_earnings WHERE learner_id = $1 AND earning_date = CURRENT_DATE',
      [learnerId]
    )

    const todayEarnings = todayResult.rows.length > 0 ? parseFloat(todayResult.rows[0].amount_ksh) : 0
    const todayCorrect = todayResult.rows.length > 0 ? parseInt(todayResult.rows[0].correct_answers) : 0

    // This week's earnings (Monday to Sunday)
    const weekResult = await pool.query(
      `SELECT COALESCE(SUM(amount_ksh), 0) as week_total, COALESCE(SUM(correct_answers), 0) as week_correct
       FROM learner_earnings
       WHERE learner_id = $1 AND earning_date >= date_trunc('week', CURRENT_DATE)`,
      [learnerId]
    )

    const weekEarnings = parseFloat(weekResult.rows[0].week_total)
    const weekCorrect = parseInt(weekResult.rows[0].week_correct)

    // Total unpaid balance
    const unpaidResult = await pool.query(
      `SELECT COALESCE(SUM(amount_ksh), 0) as unpaid_total, COALESCE(SUM(correct_answers), 0) as unpaid_correct
       FROM learner_earnings
       WHERE learner_id = $1 AND paid = FALSE`,
      [learnerId]
    )

    const unpaidTotal = parseFloat(unpaidResult.rows[0].unpaid_total)
    const unpaidCorrect = parseInt(unpaidResult.rows[0].unpaid_correct)

    res.json({
      todayEarnings: Math.round(todayEarnings * 100) / 100,
      todayCorrect,
      weekEarnings: Math.round(weekEarnings * 100) / 100,
      weekCorrect,
      unpaidTotal: Math.round(unpaidTotal * 100) / 100,
      unpaidCorrect
    })
  } catch (err) {
    console.error('Get earnings error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/learners/earnings-summary - Admin: get all learners with earnings
router.get('/earnings-summary', async (req, res) => {
  try {
    const pool = getPool()

    const result = await pool.query(
      `SELECT
         la.id, la.name,
         COALESCE(SUM(CASE WHEN le.paid = FALSE THEN le.amount_ksh ELSE 0 END), 0) as unpaid_total,
         COALESCE(SUM(CASE WHEN le.paid = FALSE THEN le.correct_answers ELSE 0 END), 0) as unpaid_correct,
         COALESCE(SUM(le.amount_ksh), 0) as all_time_total,
         COALESCE(SUM(le.correct_answers), 0) as all_time_correct,
         MAX(le.last_updated) as last_active
       FROM learner_accounts la
       LEFT JOIN learner_earnings le ON la.id = le.learner_id
       GROUP BY la.id, la.name
       ORDER BY unpaid_total DESC`
    )

    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      unpaidTotal: Math.round(parseFloat(row.unpaid_total) * 100) / 100,
      unpaidCorrect: parseInt(row.unpaid_correct),
      allTimeTotal: Math.round(parseFloat(row.all_time_total) * 100) / 100,
      allTimeCorrect: parseInt(row.all_time_correct),
      lastActive: row.last_active
    })))
  } catch (err) {
    console.error('Earnings summary error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/learners/payout/:learnerId - Admin: mark all unpaid earnings as paid
router.post('/payout/:learnerId', async (req, res) => {
  try {
    const { learnerId } = req.params
    const pool = getPool()

    const result = await pool.query(
      `UPDATE learner_earnings
       SET paid = TRUE, paid_at = NOW()
       WHERE learner_id = $1 AND paid = FALSE
       RETURNING amount_ksh`,
      [learnerId]
    )

    const paidAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.amount_ksh), 0)

    res.json({
      paidAmount: Math.round(paidAmount * 100) / 100,
      rowsUpdated: result.rows.length
    })
  } catch (err) {
    console.error('Payout error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
