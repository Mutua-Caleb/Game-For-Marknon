import { randomUUID } from 'crypto'
import { Router } from 'express'
import { getPool } from '../db.js'
import {
  chemistryLessons,
  chemistrySections,
  getChemistryLesson,
  toPublicLesson
} from '../data/chemistryLessons.js'

const router = Router()
const PASS_PERCENT = 70
const BASE_QUESTIONS_PER_ATTEMPT = 5
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30]

function shuffled(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function normalize(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function factId(lessonItem, index) {
  return `${lessonItem.id}-${index}`
}

function buildQuestion(lessonItem, factIndex) {
  const currentFact = lessonItem.facts[factIndex]
  const distractors = shuffled(
    lessonItem.facts
      .filter((_, index) => index !== factIndex)
      .map(item => item.text)
  ).slice(0, 3)

  return {
    factId: factId(lessonItem, factIndex),
    question: `Which statement correctly describes ${currentFact.title}?`,
    choices: shuffled([currentFact.text, ...distractors]),
    expectedAnswer: currentFact.text,
    generationSource: 'spaced-repetition'
  }
}

async function generateQuestions(pool, learnerId, lessonItem) {
  const progressResult = await pool.query(
    `SELECT fact_id, repetitions, total_correct, total_wrong, next_review
     FROM chemistry_card_progress
     WHERE learner_id = $1 AND lesson_id = $2`,
    [learnerId, lessonItem.id]
  )
  const progress = new Map(progressResult.rows.map(row => [row.fact_id, row]))
  const ranked = lessonItem.facts.map((_, index) => {
    const id = factId(lessonItem, index)
    const card = progress.get(id)
    const unseen = !card
    const due = unseen || new Date(card.next_review).getTime() <= Date.now()
    const wrong = Number(card?.total_wrong || 0)
    const correct = Number(card?.total_correct || 0)
    return { index, unseen, due, weakness: wrong - correct, tieBreaker: Math.random() }
  }).sort((a, b) => {
    if (a.unseen !== b.unseen) return a.unseen ? -1 : 1
    if (a.due !== b.due) return a.due ? -1 : 1
    return (b.weakness - a.weakness) || (a.tieBreaker - b.tieBreaker)
  })

  const selected = ranked.slice(0, BASE_QUESTIONS_PER_ATTEMPT).map(item => item.index)
  const repeatCandidates = ranked.filter(item => !item.unseen && (item.due || item.weakness > 0))
  repeatCandidates.slice(0, 2).forEach(item => selected.push(item.index))
  return selected.map(index => buildQuestion(lessonItem, index))
}

async function passedLessonIds(pool, learnerId) {
  const result = await pool.query(
    'SELECT lesson_id FROM chemistry_progress WHERE learner_id = $1 AND passed = TRUE',
    [learnerId]
  )
  return new Set(result.rows.map(row => row.lesson_id))
}

function lessonIsUnlocked(lessonId, passedIds) {
  const index = chemistryLessons.findIndex(item => item.id === lessonId)
  return index === 0 || (index > 0 && passedIds.has(chemistryLessons[index - 1].id))
}

async function updateCardProgress(client, learnerId, lessonId, cardId, correct) {
  const result = await client.query(
    `SELECT repetitions, total_correct, total_wrong
     FROM chemistry_card_progress
     WHERE learner_id = $1 AND lesson_id = $2 AND fact_id = $3
     FOR UPDATE`,
    [learnerId, lessonId, cardId]
  )
  const current = result.rows[0]
  const repetitions = correct ? Number(current?.repetitions || 0) + 1 : 0
  const intervalDays = correct
    ? REVIEW_INTERVALS_DAYS[Math.min(repetitions - 1, REVIEW_INTERVALS_DAYS.length - 1)]
    : 0
  const totalCorrect = Number(current?.total_correct || 0) + (correct ? 1 : 0)
  const totalWrong = Number(current?.total_wrong || 0) + (correct ? 0 : 1)

  await client.query(
    `INSERT INTO chemistry_card_progress
      (learner_id, lesson_id, fact_id, repetitions, interval_days, total_correct,
       total_wrong, next_review, last_reviewed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + ($5 * INTERVAL '1 day'), NOW())
     ON CONFLICT (learner_id, lesson_id, fact_id)
     DO UPDATE SET
       repetitions = $4,
       interval_days = $5,
       total_correct = $6,
       total_wrong = $7,
       next_review = NOW() + ($5 * INTERVAL '1 day'),
       last_reviewed = NOW()`,
    [learnerId, lessonId, cardId, repetitions, intervalDays, totalCorrect, totalWrong]
  )

  return { repetitions, intervalDays }
}

router.get('/lessons', (req, res) => {
  res.json({
    sections: chemistrySections,
    lessons: chemistryLessons.map(toPublicLesson),
    passPercent: PASS_PERCENT,
    assessmentMode: 'spaced-repetition'
  })
})

router.get('/progress/:learnerId', async (req, res) => {
  try {
    const pool = getPool()
    const learnerId = Number(req.params.learnerId)
    if (!Number.isInteger(learnerId)) return res.status(400).json({ error: 'Invalid learner ID' })

    const [lessonResult, reviewResult] = await Promise.all([
      pool.query(
        `SELECT lesson_id, best_score, passed, attempts_count, last_attempted
         FROM chemistry_progress WHERE learner_id = $1`,
        [learnerId]
      ),
      pool.query(
        `SELECT COUNT(*) AS due
         FROM chemistry_card_progress
         WHERE learner_id = $1 AND next_review <= NOW()`,
        [learnerId]
      )
    ])
    const passedIds = new Set(lessonResult.rows.filter(row => row.passed).map(row => row.lesson_id))
    const progress = Object.fromEntries(lessonResult.rows.map(row => [row.lesson_id, {
      bestScore: Number(row.best_score) || 0,
      passed: row.passed,
      attemptsCount: Number(row.attempts_count) || 0,
      lastAttempted: row.last_attempted
    }]))

    res.json({
      progress,
      unlockedLessonIds: chemistryLessons
        .filter(item => lessonIsUnlocked(item.id, passedIds))
        .map(item => item.id),
      passedCount: passedIds.size,
      totalLessons: chemistryLessons.length,
      reviewDueCount: Number(reviewResult.rows[0]?.due || 0)
    })
  } catch (error) {
    console.error('Chemistry progress error:', error)
    res.status(500).json({ error: 'Failed to load chemistry progress' })
  }
})

router.post('/attempts', async (req, res) => {
  try {
    const pool = getPool()
    const learnerId = Number(req.body.learnerId)
    const lessonItem = getChemistryLesson(req.body.lessonId)
    if (!Number.isInteger(learnerId) || !lessonItem) {
      return res.status(400).json({ error: 'A valid learner and lesson are required' })
    }

    const learnerResult = await pool.query('SELECT id, name FROM learner_accounts WHERE id = $1', [learnerId])
    if (learnerResult.rows.length === 0) return res.status(404).json({ error: 'Learner not found' })

    const passedIds = await passedLessonIds(pool, learnerId)
    if (!lessonIsUnlocked(lessonItem.id, passedIds)) {
      return res.status(403).json({ error: 'Pass the previous chapter before starting this one' })
    }

    const questions = await generateQuestions(pool, learnerId, lessonItem)
    const attemptId = randomUUID()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const sessionResult = await client.query(
        `INSERT INTO quiz_sessions
          (player_name, subject, topics, game_mode, min_time_required, started_at)
         VALUES ($1, 'Chemistry', $2, 'chemistry-spaced-repetition', 0, NOW()) RETURNING id`,
        [learnerResult.rows[0].name, JSON.stringify([lessonItem.section, lessonItem.title])]
      )
      await client.query(
        `INSERT INTO chemistry_attempts
          (id, learner_id, lesson_id, questions_json, quiz_session_id, started_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [attemptId, learnerId, lessonItem.id, JSON.stringify(questions), sessionResult.rows[0].id]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    res.status(201).json({
      attemptId,
      lessonId: lessonItem.id,
      questions: questions.map((item, index) => ({
        index,
        factId: item.factId,
        question: item.question,
        choices: item.choices
      })),
      marker: 'spaced-repetition'
    })
  } catch (error) {
    console.error('Start chemistry attempt error:', error)
    res.status(500).json({ error: 'Failed to create a fresh chemistry review' })
  }
})

router.post('/attempts/:attemptId/answer', async (req, res) => {
  try {
    const pool = getPool()
    const questionIndex = Number(req.body.questionIndex)
    const learnerAnswer = String(req.body.answer || '').trim()
    const timeTakenMs = Math.max(0, Math.min(30 * 60 * 1000, Number(req.body.timeTakenMs) || 0))
    if (!Number.isInteger(questionIndex) || !learnerAnswer) {
      return res.status(400).json({ error: 'Question index and an answer are required' })
    }

    const attemptResult = await pool.query(
      `SELECT ca.* FROM chemistry_attempts ca WHERE ca.id = $1`,
      [req.params.attemptId]
    )
    if (attemptResult.rows.length === 0) return res.status(404).json({ error: 'Attempt not found' })

    const attempt = attemptResult.rows[0]
    if (attempt.completed_at) return res.status(409).json({ error: 'This review is already complete' })
    const questions = typeof attempt.questions_json === 'string'
      ? JSON.parse(attempt.questions_json)
      : attempt.questions_json
    const question = questions[questionIndex]
    if (!question || !question.choices.some(choice => normalize(choice) === normalize(learnerAnswer))) {
      return res.status(400).json({ error: 'Choose one of the available answers' })
    }

    const correct = normalize(learnerAnswer) === normalize(question.expectedAnswer)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const duplicate = await client.query(
        `SELECT is_correct, mark_score, feedback, missing_points, mark_source
         FROM chemistry_attempt_answers
         WHERE attempt_id = $1 AND question_index = $2 FOR UPDATE`,
        [attempt.id, questionIndex]
      )
      if (duplicate.rows.length > 0) {
        await client.query('ROLLBACK')
        const row = duplicate.rows[0]
        return res.json({
          correct: row.is_correct,
          score: Number(row.mark_score),
          feedback: row.feedback,
          missingPoints: row.missing_points || [],
          source: row.mark_source,
          alreadyRecorded: true
        })
      }

      const card = await updateCardProgress(
        client,
        attempt.learner_id,
        attempt.lesson_id,
        question.factId,
        correct
      )
      const feedback = correct
        ? card.intervalDays >= 30
          ? 'Excellent recall. This card is now firmly established.'
          : `Remembered. This card will return in ${card.intervalDays} day${card.intervalDays === 1 ? '' : 's'}.`
        : `Review this idea: ${question.expectedAnswer}`

      await client.query(
        `INSERT INTO chemistry_attempt_answers
          (attempt_id, question_index, question_text, learner_answer, expected_answer,
           is_correct, mark_score, feedback, missing_points, mark_source, time_taken_ms, reward_ksh)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, 'spaced-repetition', $9, 0)`,
        [
          attempt.id,
          questionIndex,
          question.question,
          learnerAnswer.slice(0, 5000),
          question.expectedAnswer,
          correct,
          correct ? 100 : 0,
          feedback,
          timeTakenMs
        ]
      )

      await client.query(
        `INSERT INTO quiz_session_answers
          (session_id, question_id, question_text, correct_answer, given_answer, is_correct, time_taken_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          attempt.quiz_session_id,
          question.factId,
          question.question,
          question.expectedAnswer,
          learnerAnswer.slice(0, 5000),
          correct,
          timeTakenMs
        ]
      )

      await client.query(
        `UPDATE quiz_sessions SET
           correct_answers = correct_answers + $2,
           wrong_answers = wrong_answers + $3,
           score = score + $4,
           duration_seconds = GREATEST(duration_seconds, FLOOR(EXTRACT(EPOCH FROM (NOW() - started_at)))::INTEGER)
         WHERE id = $1`,
        [attempt.quiz_session_id, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0]
      )
      await client.query('COMMIT')

      res.json({
        correct,
        score: correct ? 100 : 0,
        feedback,
        missingPoints: [],
        source: 'spaced-repetition',
        nextReviewDays: card.intervalDays
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Mark chemistry answer error:', error)
    res.status(500).json({ error: 'Failed to mark this answer' })
  }
})

router.post('/attempts/:attemptId/complete', async (req, res) => {
  try {
    const pool = getPool()
    const attemptResult = await pool.query('SELECT * FROM chemistry_attempts WHERE id = $1', [req.params.attemptId])
    if (attemptResult.rows.length === 0) return res.status(404).json({ error: 'Attempt not found' })
    const attempt = attemptResult.rows[0]
    const questions = typeof attempt.questions_json === 'string'
      ? JSON.parse(attempt.questions_json)
      : attempt.questions_json

    const answerResult = await pool.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_correct = TRUE) AS correct
       FROM chemistry_attempt_answers WHERE attempt_id = $1`,
      [attempt.id]
    )
    const total = Number(answerResult.rows[0].total)
    const correct = Number(answerResult.rows[0].correct)

    if (attempt.completed_at) {
      return res.json({
        scorePercent: Number(attempt.score_percent),
        correct,
        total,
        passed: attempt.passed,
        passPercent: PASS_PERCENT,
        alreadyCompleted: true
      })
    }
    if (total < questions.length) {
      return res.status(400).json({ error: 'Answer every question before finishing the review' })
    }

    const scorePercent = Math.round((correct / total) * 100)
    const passed = scorePercent >= PASS_PERCENT
    const durationResult = await pool.query(
      'SELECT GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (NOW() - started_at)))::INTEGER) AS duration FROM chemistry_attempts WHERE id = $1',
      [attempt.id]
    )
    const durationSeconds = Number(durationResult.rows[0].duration)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE chemistry_attempts
         SET completed_at = NOW(), score_percent = $2, passed = $3
         WHERE id = $1`,
        [attempt.id, scorePercent, passed]
      )
      await client.query(
        `INSERT INTO chemistry_progress
          (learner_id, lesson_id, best_score, passed, attempts_count, last_attempted)
         VALUES ($1, $2, $3, $4, 1, NOW())
         ON CONFLICT (learner_id, lesson_id)
         DO UPDATE SET
           best_score = GREATEST(chemistry_progress.best_score, $3),
           passed = chemistry_progress.passed OR $4,
           attempts_count = chemistry_progress.attempts_count + 1,
           last_attempted = NOW()`,
        [attempt.learner_id, attempt.lesson_id, scorePercent, passed]
      )
      await client.query(
        `UPDATE quiz_sessions SET
           completed = TRUE,
           finished_at = NOW(),
           score = $2,
           duration_seconds = $3
         WHERE id = $1`,
        [attempt.quiz_session_id, scorePercent, durationSeconds]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    const lessonIndex = chemistryLessons.findIndex(item => item.id === attempt.lesson_id)
    const nextLesson = passed ? chemistryLessons[lessonIndex + 1] : null
    res.json({
      scorePercent,
      correct,
      total,
      passed,
      nextLessonId: nextLesson?.id || null,
      passPercent: PASS_PERCENT
    })
  } catch (error) {
    console.error('Complete chemistry attempt error:', error)
    res.status(500).json({ error: 'Failed to finish this chemistry review' })
  }
})

export default router
