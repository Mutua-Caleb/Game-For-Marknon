import { Router } from 'express'
import { getPool } from '../db.js'

const router = Router()

// SM-2 Algorithm Constants
const MIN_EASE_FACTOR = 1.3
const INITIAL_EASE_FACTOR = 2.5

/**
 * Calculate next review interval using SM-2 algorithm
 * @param {number} quality - Answer quality (0-5): 0-2 = wrong, 3 = hard, 4 = good, 5 = easy
 * @param {number} easeFactor - Current ease factor
 * @param {number} interval - Current interval in days
 * @param {number} repetitions - Number of successful repetitions
 */
function calculateSM2(quality, easeFactor, interval, repetitions) {
  let newEaseFactor = easeFactor
  let newInterval = interval
  let newRepetitions = repetitions

  if (quality >= 3) {
    // Correct answer
    if (repetitions === 0) {
      newInterval = 1 // Review tomorrow
    } else if (repetitions === 1) {
      newInterval = 3 // Review in 3 days
    } else {
      newInterval = Math.round(interval * easeFactor)
    }
    newRepetitions = repetitions + 1
  } else {
    // Incorrect answer - reset
    newRepetitions = 0
    newInterval = 0 // Review immediately (same session)
  }

  // Update ease factor based on quality
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (newEaseFactor < MIN_EASE_FACTOR) {
    newEaseFactor = MIN_EASE_FACTOR
  }

  return {
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    interval: newInterval,
    repetitions: newRepetitions
  }
}

// GET /api/learning/questions - Get questions with spaced repetition and interleaving
router.get('/questions', async (req, res) => {
  try {
    const pool = getPool()
    const { learnerId, subject, topics, limit = 20, interleave = true } = req.query

    if (!learnerId) {
      return res.status(400).json({ error: 'learnerId is required' })
    }

    const topicList = topics ? topics.split(',') : []

    // Build query to get questions with their review status
    let query = `
      SELECT
        q.*,
        COALESCE(lp.ease_factor, 2.5) as ease_factor,
        COALESCE(lp.interval_days, 0) as interval_days,
        COALESCE(lp.repetitions, 0) as repetitions,
        COALESCE(lp.consecutive_correct, 0) as consecutive_correct,
        COALESCE(lp.total_attempts, 0) as total_attempts,
        lp.next_review,
        CASE
          WHEN lp.next_review IS NULL THEN 1  -- New questions first
          WHEN lp.next_review <= NOW() THEN 2  -- Due for review
          ELSE 3  -- Not due yet
        END as priority
      FROM questions q
      LEFT JOIN learner_progress lp ON q.id = lp.question_id AND lp.learner_id = $1
      WHERE 1=1
    `
    const params = [learnerId]

    if (subject) {
      params.push(subject)
      query += ` AND q.subject = $${params.length}`
    }

    if (topicList.length > 0) {
      params.push(topicList)
      query += ` AND q.topic = ANY($${params.length})`
    }

    // Order by priority (new/due first) then by next_review date
    query += ` ORDER BY priority ASC, lp.next_review ASC NULLS FIRST`

    params.push(parseInt(limit))
    query += ` LIMIT $${params.length}`

    const result = await pool.query(query, params)
    let questions = result.rows

    // Interleave questions from different topics if enabled
    if (interleave === 'true' && topicList.length > 1) {
      questions = interleaveByTopic(questions)
    }

    // Parse options JSON
    questions = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null
    }))

    res.json({
      questions,
      totalDue: questions.filter(q => q.priority <= 2).length,
      totalNew: questions.filter(q => q.priority === 1).length
    })
  } catch (err) {
    console.error('Error fetching learning questions:', err)
    res.status(500).json({ error: 'Failed to fetch questions' })
  }
})

// POST /api/learning/record - Record answer and update spaced repetition
router.post('/record', async (req, res) => {
  try {
    const pool = getPool()
    const { learnerId, questionId, isCorrect, timeTakenMs } = req.body

    if (!learnerId || !questionId || typeof isCorrect !== 'boolean') {
      return res.status(400).json({ error: 'learnerId, questionId, and isCorrect are required' })
    }

    // Get current progress
    const progressResult = await pool.query(
      'SELECT * FROM learner_progress WHERE learner_id = $1 AND question_id = $2',
      [learnerId, questionId]
    )

    let currentProgress = progressResult.rows[0] || {
      ease_factor: INITIAL_EASE_FACTOR,
      interval_days: 0,
      repetitions: 0,
      consecutive_correct: 0,
      total_attempts: 0,
      total_correct: 0
    }

    // Calculate quality score (0-5)
    // 5 = correct quickly, 4 = correct normally, 3 = correct slowly
    // 2 = wrong but close, 1 = wrong, 0 = complete blank
    let quality = isCorrect ? 4 : 1
    if (isCorrect && timeTakenMs) {
      if (timeTakenMs < 3000) quality = 5 // Fast answer
      else if (timeTakenMs > 15000) quality = 3 // Slow but correct
    }

    // Apply SM-2 algorithm
    const sm2Result = calculateSM2(
      quality,
      currentProgress.ease_factor,
      currentProgress.interval_days,
      currentProgress.repetitions
    )

    // Calculate next review date
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + sm2Result.interval)

    // Update progress
    const newConsecutiveCorrect = isCorrect ? currentProgress.consecutive_correct + 1 : 0
    const newTotalAttempts = currentProgress.total_attempts + 1
    const newTotalCorrect = currentProgress.total_correct + (isCorrect ? 1 : 0)

    await pool.query(`
      INSERT INTO learner_progress
        (learner_id, question_id, ease_factor, interval_days, repetitions, next_review, last_reviewed, consecutive_correct, total_attempts, total_correct)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
      ON CONFLICT (learner_id, question_id) DO UPDATE SET
        ease_factor = $3,
        interval_days = $4,
        repetitions = $5,
        next_review = $6,
        last_reviewed = NOW(),
        consecutive_correct = $7,
        total_attempts = $8,
        total_correct = $9
    `, [
      learnerId, questionId,
      sm2Result.easeFactor, sm2Result.interval, sm2Result.repetitions,
      nextReview, newConsecutiveCorrect, newTotalAttempts, newTotalCorrect
    ])

    // Update topic mastery
    const questionResult = await pool.query('SELECT subject, topic FROM questions WHERE id = $1', [questionId])
    if (questionResult.rows.length > 0) {
      const { subject, topic } = questionResult.rows[0]
      await updateTopicMastery(pool, learnerId, subject, topic)
    }

    res.json({
      success: true,
      nextReview: nextReview.toISOString(),
      intervalDays: sm2Result.interval,
      easeFactor: sm2Result.easeFactor,
      consecutiveCorrect: newConsecutiveCorrect,
      mastered: newConsecutiveCorrect >= 3 // Consider mastered after 3 consecutive correct
    })
  } catch (err) {
    console.error('Error recording answer:', err)
    res.status(500).json({ error: 'Failed to record answer' })
  }
})

// GET /api/learning/mastery - Get topic mastery for a learner
router.get('/mastery', async (req, res) => {
  try {
    const pool = getPool()
    const { learnerId, subject } = req.query

    if (!learnerId) {
      return res.status(400).json({ error: 'learnerId is required' })
    }

    // Get all topics with their mastery status
    let topicsQuery = `
      SELECT DISTINCT subject, topic FROM questions
    `
    const topicParams = []
    if (subject) {
      topicParams.push(subject)
      topicsQuery += ` WHERE subject = $1`
    }
    topicsQuery += ` ORDER BY subject, topic`

    const topicsResult = await pool.query(topicsQuery, topicParams)
    const allTopics = topicsResult.rows

    // Get prerequisites
    const prereqResult = await pool.query('SELECT * FROM topic_prerequisites')
    const prerequisites = prereqResult.rows

    // Get learner's mastery for each topic
    const masteryResult = await pool.query(
      'SELECT * FROM topic_mastery WHERE learner_id = $1',
      [learnerId]
    )
    const masteryMap = {}
    masteryResult.rows.forEach(m => {
      masteryMap[`${m.subject}:${m.topic}`] = m
    })

    // Build topic list with lock status
    const topics = allTopics.map(t => {
      const key = `${t.subject}:${t.topic}`
      const mastery = masteryMap[key] || { mastery_percentage: 0, questions_attempted: 0, questions_mastered: 0 }

      // Check if topic has prerequisites
      const topicPrereqs = prerequisites.filter(p => p.subject === t.subject && p.topic === t.topic)

      let locked = false
      let lockReason = null
      let requiredPrereqs = []

      for (const prereq of topicPrereqs) {
        const prereqKey = `${prereq.subject}:${prereq.prerequisite_topic}`
        const prereqMastery = masteryMap[prereqKey]?.mastery_percentage || 0

        if (prereqMastery < prereq.required_mastery) {
          locked = true
          requiredPrereqs.push({
            topic: prereq.prerequisite_topic,
            currentMastery: Math.round(prereqMastery),
            requiredMastery: prereq.required_mastery
          })
        }
      }

      if (locked) {
        lockReason = `Complete ${requiredPrereqs.map(p => `${p.topic} (${p.currentMastery}%/${p.requiredMastery}%)`).join(', ')} first`
      }

      return {
        subject: t.subject,
        topic: t.topic,
        mastery_percentage: Math.round(mastery.mastery_percentage || 0),
        questions_attempted: mastery.questions_attempted || 0,
        questions_mastered: mastery.questions_mastered || 0,
        locked,
        lockReason,
        requiredPrereqs
      }
    })

    res.json({ topics })
  } catch (err) {
    console.error('Error fetching mastery:', err)
    res.status(500).json({ error: 'Failed to fetch mastery' })
  }
})

// GET /api/learning/stats - Get learning statistics for a learner
router.get('/stats', async (req, res) => {
  try {
    const pool = getPool()
    const { learnerId } = req.query

    if (!learnerId) {
      return res.status(400).json({ error: 'learnerId is required' })
    }

    // Get overall stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_questions_seen,
        SUM(total_correct) as total_correct,
        SUM(total_attempts) as total_attempts,
        COUNT(CASE WHEN consecutive_correct >= 3 THEN 1 END) as questions_mastered,
        COUNT(CASE WHEN next_review <= NOW() THEN 1 END) as questions_due
      FROM learner_progress
      WHERE learner_id = $1
    `, [learnerId])

    const stats = statsResult.rows[0]

    // Get mastery by subject
    const masteryBySubject = await pool.query(`
      SELECT
        subject,
        ROUND(AVG(mastery_percentage)::numeric, 1) as avg_mastery,
        COUNT(*) as topics_practiced
      FROM topic_mastery
      WHERE learner_id = $1
      GROUP BY subject
    `, [learnerId])

    res.json({
      totalQuestionsSeen: parseInt(stats.total_questions_seen) || 0,
      totalCorrect: parseInt(stats.total_correct) || 0,
      totalAttempts: parseInt(stats.total_attempts) || 0,
      questionsMastered: parseInt(stats.questions_mastered) || 0,
      questionsDue: parseInt(stats.questions_due) || 0,
      accuracy: stats.total_attempts > 0
        ? Math.round((stats.total_correct / stats.total_attempts) * 100)
        : 0,
      masteryBySubject: masteryBySubject.rows
    })
  } catch (err) {
    console.error('Error fetching stats:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Helper function to update topic mastery
async function updateTopicMastery(pool, learnerId, subject, topic) {
  // Count mastered questions (3+ consecutive correct) for this topic
  const masteryStats = await pool.query(`
    SELECT
      COUNT(*) as total_attempted,
      COUNT(CASE WHEN consecutive_correct >= 3 THEN 1 END) as mastered
    FROM learner_progress lp
    JOIN questions q ON lp.question_id = q.id
    WHERE lp.learner_id = $1 AND q.subject = $2 AND q.topic = $3
  `, [learnerId, subject, topic])

  const { total_attempted, mastered } = masteryStats.rows[0]

  // Get total questions for this topic
  const totalQuestions = await pool.query(
    'SELECT COUNT(*) as count FROM questions WHERE subject = $1 AND topic = $2',
    [subject, topic]
  )
  const totalInTopic = parseInt(totalQuestions.rows[0].count)

  // Calculate mastery percentage based on mastered questions vs total
  const masteryPercentage = totalInTopic > 0
    ? (parseInt(mastered) / totalInTopic) * 100
    : 0

  await pool.query(`
    INSERT INTO topic_mastery (learner_id, subject, topic, questions_attempted, questions_mastered, mastery_percentage, last_practiced)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (learner_id, subject, topic) DO UPDATE SET
      questions_attempted = $4,
      questions_mastered = $5,
      mastery_percentage = $6,
      last_practiced = NOW()
  `, [learnerId, subject, topic, parseInt(total_attempted), parseInt(mastered), masteryPercentage])
}

// Helper function to interleave questions by topic
function interleaveByTopic(questions) {
  if (questions.length === 0) return questions

  // Group by topic
  const byTopic = {}
  questions.forEach(q => {
    if (!byTopic[q.topic]) byTopic[q.topic] = []
    byTopic[q.topic].push(q)
  })

  // Interleave - take one from each topic in round-robin fashion
  const result = []
  const topics = Object.keys(byTopic)
  let index = 0

  while (result.length < questions.length) {
    const topic = topics[index % topics.length]
    if (byTopic[topic].length > 0) {
      result.push(byTopic[topic].shift())
    }
    index++

    // Safety check - if all topics are empty, break
    if (topics.every(t => byTopic[t].length === 0)) break
  }

  return result
}

export default router
