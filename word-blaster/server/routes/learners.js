import { Router } from 'express'
import { getPool } from '../db.js'

const router = Router()
const FOCUS_BLOCK_REAL_MS = 20 * 60 * 1000
const FOCUS_REWARD_KSH = 20
const HEARTBEAT_GRACE_MS = 1500
const MAX_HEARTBEAT_DELTA_MS = 2 * 60 * 1000

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

// Legacy answer payouts are disabled. Earnings now come only from verified focus blocks.
router.post('/record-earning', (req, res) => {
  res.status(410).json({ error: 'Answer-based earnings have been replaced by focus-time earnings' })
})

// POST /api/learners/record-focus - Verify active time and award completed focus blocks
router.post('/record-focus', async (req, res) => {
  const learnerId = Number(req.body.learnerId)
  const subject = String(req.body.subject || '').trim().slice(0, 80)
  const reportedActiveMs = Math.min(
    24 * 60 * 60 * 1000,
    Math.max(0, Math.floor(Number(req.body.activeMs) || 0))
  )

  if (!Number.isInteger(learnerId) || !subject) {
    return res.status(400).json({ error: 'A valid learner, subject and active time are required' })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const learnerResult = await client.query('SELECT id FROM learner_accounts WHERE id = $1', [learnerId])
    if (learnerResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Learner not found' })
    }

    const inserted = await client.query(
      `INSERT INTO learner_focus_daily
        (learner_id, focus_date, subject, client_active_ms, verified_active_ms,
         rewarded_blocks, last_heartbeat_at, last_updated)
       VALUES ($1, CURRENT_DATE, $2, $3, 0, 0, NOW(), NOW())
       ON CONFLICT (learner_id, focus_date, subject) DO NOTHING
       RETURNING *`,
      [learnerId, subject, reportedActiveMs]
    )

    let focusRow = inserted.rows[0]
    let acceptedDeltaMs = 0

    if (!focusRow) {
      const current = await client.query(
        `SELECT *,
                GREATEST(0, EXTRACT(EPOCH FROM (NOW() - last_heartbeat_at)) * 1000) AS elapsed_ms
         FROM learner_focus_daily
         WHERE learner_id = $1 AND focus_date = CURRENT_DATE AND subject = $2
         FOR UPDATE`,
        [learnerId, subject]
      )
      focusRow = current.rows[0]

      const previousClientMs = Number(focusRow.client_active_ms) || 0
      const reportedDeltaMs = reportedActiveMs >= previousClientMs
        ? reportedActiveMs - previousClientMs
        : 0
      const elapsedMs = Math.max(0, Number(focusRow.elapsed_ms) || 0)
      acceptedDeltaMs = Math.floor(Math.min(
        reportedDeltaMs,
        elapsedMs + HEARTBEAT_GRACE_MS,
        MAX_HEARTBEAT_DELTA_MS
      ))
    }

    const verifiedActiveMs = (Number(focusRow.verified_active_ms) || 0) + acceptedDeltaMs
    const previousBlocks = Number(focusRow.rewarded_blocks) || 0
    const totalBlocks = Math.floor(verifiedActiveMs / FOCUS_BLOCK_REAL_MS)
    const newlyEarnedBlocks = Math.max(0, totalBlocks - previousBlocks)

    await client.query(
      `UPDATE learner_focus_daily
       SET client_active_ms = $3,
           verified_active_ms = $4,
           rewarded_blocks = $5,
           last_heartbeat_at = NOW(),
           last_updated = NOW()
       WHERE learner_id = $1 AND focus_date = CURRENT_DATE AND subject = $2`,
      [learnerId, subject, reportedActiveMs, verifiedActiveMs, totalBlocks]
    )

    if (newlyEarnedBlocks > 0) {
      const rewardAmount = newlyEarnedBlocks * FOCUS_REWARD_KSH
      const rewardedMinutes = newlyEarnedBlocks * (FOCUS_BLOCK_REAL_MS / 60000)
      await client.query(
        `INSERT INTO learner_earnings
          (learner_id, earning_date, amount_ksh, focus_minutes, focus_blocks, last_updated)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, NOW())
         ON CONFLICT (learner_id, earning_date)
         DO UPDATE SET
           amount_ksh = learner_earnings.amount_ksh + $2,
           focus_minutes = learner_earnings.focus_minutes + $3,
           focus_blocks = learner_earnings.focus_blocks + $4,
           paid = FALSE,
           paid_at = NULL,
           last_updated = NOW()`,
        [learnerId, rewardAmount, rewardedMinutes, newlyEarnedBlocks]
      )
    }

    const earningsResult = await client.query(
      `SELECT COALESCE(amount_ksh, 0) AS amount_ksh
       FROM learner_earnings WHERE learner_id = $1 AND earning_date = CURRENT_DATE`,
      [learnerId]
    )
    await client.query('COMMIT')

    res.json({
      subject,
      acceptedDeltaMs,
      verifiedActiveMs,
      creditedMs: Math.floor(verifiedActiveMs / 2),
      completedBlocks: totalBlocks,
      newlyEarnedBlocks,
      awardKsh: newlyEarnedBlocks * FOCUS_REWARD_KSH,
      todayEarnings: Math.round(Number(earningsResult.rows[0]?.amount_ksh || 0) * 100) / 100
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Record focus error:', err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// GET /api/learners/earnings/:learnerId - Get earnings summary
router.get('/earnings/:learnerId', async (req, res) => {
  try {
    const { learnerId } = req.params
    const pool = getPool()

    // Today's earnings
    const todayResult = await pool.query(
      `SELECT amount_ksh, correct_answers, quiz_correct_answers, chemistry_correct_answers,
              focus_minutes, focus_blocks
       FROM learner_earnings WHERE learner_id = $1 AND earning_date = CURRENT_DATE`,
      [learnerId]
    )

    const todayEarnings = todayResult.rows.length > 0 ? parseFloat(todayResult.rows[0].amount_ksh) : 0
    const todayCorrect = todayResult.rows.length > 0 ? parseInt(todayResult.rows[0].correct_answers) : 0
    const todayQuizCorrect = todayResult.rows.length > 0 ? parseInt(todayResult.rows[0].quiz_correct_answers) : 0
    const todayChemistryCorrect = todayResult.rows.length > 0 ? parseInt(todayResult.rows[0].chemistry_correct_answers) : 0
    const todayFocusMinutes = todayResult.rows.length > 0 ? Number(todayResult.rows[0].focus_minutes) || 0 : 0
    const todayFocusBlocks = todayResult.rows.length > 0 ? Number(todayResult.rows[0].focus_blocks) || 0 : 0

    // This week's earnings (Monday to Sunday)
    const weekResult = await pool.query(
      `SELECT COALESCE(SUM(amount_ksh), 0) as week_total,
              COALESCE(SUM(correct_answers), 0) as week_correct,
              COALESCE(SUM(quiz_correct_answers), 0) as week_quiz_correct,
              COALESCE(SUM(chemistry_correct_answers), 0) as week_chemistry_correct,
              COALESCE(SUM(focus_minutes), 0) as week_focus_minutes,
              COALESCE(SUM(focus_blocks), 0) as week_focus_blocks
       FROM learner_earnings
       WHERE learner_id = $1 AND earning_date >= date_trunc('week', CURRENT_DATE)`,
      [learnerId]
    )

    const weekEarnings = parseFloat(weekResult.rows[0].week_total)
    const weekCorrect = parseInt(weekResult.rows[0].week_correct)
    const weekQuizCorrect = parseInt(weekResult.rows[0].week_quiz_correct)
    const weekChemistryCorrect = parseInt(weekResult.rows[0].week_chemistry_correct)
    const weekFocusMinutes = Number(weekResult.rows[0].week_focus_minutes) || 0
    const weekFocusBlocks = Number(weekResult.rows[0].week_focus_blocks) || 0

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
      todayQuizCorrect,
      todayChemistryCorrect,
      todayFocusMinutes,
      todayFocusBlocks,
      weekEarnings: Math.round(weekEarnings * 100) / 100,
      weekCorrect,
      weekQuizCorrect,
      weekChemistryCorrect,
      weekFocusMinutes,
      weekFocusBlocks,
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
         COALESCE(SUM(CASE WHEN le.paid = FALSE THEN le.chemistry_correct_answers ELSE 0 END), 0) as unpaid_chemistry_correct,
         COALESCE(SUM(CASE WHEN le.paid = FALSE THEN le.focus_minutes ELSE 0 END), 0) as unpaid_focus_minutes,
         COALESCE(SUM(CASE WHEN le.paid = FALSE THEN le.focus_blocks ELSE 0 END), 0) as unpaid_focus_blocks,
         COALESCE(SUM(le.amount_ksh), 0) as all_time_total,
         COALESCE(SUM(le.correct_answers), 0) as all_time_correct,
         COALESCE(SUM(le.chemistry_correct_answers), 0) as all_time_chemistry_correct,
         COALESCE(SUM(le.focus_minutes), 0) as all_time_focus_minutes,
         COALESCE(SUM(le.focus_blocks), 0) as all_time_focus_blocks,
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
      unpaidChemistryCorrect: parseInt(row.unpaid_chemistry_correct),
      unpaidFocusMinutes: Number(row.unpaid_focus_minutes) || 0,
      unpaidFocusBlocks: Number(row.unpaid_focus_blocks) || 0,
      allTimeTotal: Math.round(parseFloat(row.all_time_total) * 100) / 100,
      allTimeCorrect: parseInt(row.all_time_correct),
      allTimeChemistryCorrect: parseInt(row.all_time_chemistry_correct),
      allTimeFocusMinutes: Number(row.all_time_focus_minutes) || 0,
      allTimeFocusBlocks: Number(row.all_time_focus_blocks) || 0,
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
