import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { quizSessionApi } from '../utils/api'
import { speakQuestionAnswer } from '../utils/voiceover'
import './PassageChallenge.css'

/**
 * Reading comprehension challenge that appears within the Quiz Blaster flow.
 * Passage on the left, questions on the right. No scrolling needed.
 */
function PassageChallenge({ passage, onComplete, playSound, quizSessionId }) {
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)

  const handleAnswerChange = useCallback((qIndex, value) => {
    setAnswers(prev => ({ ...prev, [qIndex]: value }))
  }, [])

  const handleOptionSelect = useCallback((qIndex, option) => {
    setAnswers(prev => ({ ...prev, [qIndex]: option }))
  }, [])

  const handleCheckAnswers = useCallback(() => {
    if (!passage) return

    playSound('click')
    const checkResults = {}
    let correctCount = 0

    passage.questions.forEach((q, i) => {
      const userAnswer = (answers[i] || '').trim().toLowerCase()
      const correctAnswer = q.answer.toLowerCase()

      const isCorrect = userAnswer === correctAnswer ||
        (q.type === 'multiple' && q.options &&
          q.options.some(opt => opt.toLowerCase() === userAnswer && opt.toLowerCase() === correctAnswer))

      checkResults[i] = isCorrect
      if (isCorrect) correctCount++

      // Record in quiz session
      if (quizSessionId) {
        quizSessionApi.recordAnswer(quizSessionId, {
          questionId: `passage_${passage.id}_q${i}`,
          questionText: q.question,
          correctAnswer: q.answer,
          givenAnswer: answers[i] || '',
          isCorrect,
          timeTakenMs: 0
        }).catch(console.error)
      }
    })

    setResults(checkResults)

    // Voice-over for wrong answers
    const wrongQuestions = passage.questions.filter((_, i) => !checkResults[i])
    if (wrongQuestions.length > 0) {
      // Read the first wrong one (avoid overwhelming with too many)
      const first = wrongQuestions[0]
      speakQuestionAnswer(first.question, first.answer)
    }

    if (correctCount === passage.questions.length) {
      playSound('correct')
    } else if (correctCount > 0) {
      playSound('click')
    } else {
      playSound('wrong')
    }
  }, [passage, answers, playSound, quizSessionId])

  const handleContinue = useCallback(() => {
    if (!passage || !results) return

    const correctCount = Object.values(results).filter(Boolean).length
    onComplete({
      correctCount,
      totalQuestions: passage.questions.length,
      passageTitle: passage.title
    })
  }, [passage, results, onComplete])

  if (!passage) return null

  return (
    <motion.div
      className="passage-challenge-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="passage-challenge">
        <div className="pc-header">
          <div className="pc-badge">Reading Challenge</div>
          <h2 className="pc-title">{passage.title}</h2>
        </div>

        <div className="pc-content">
          {/* Passage text - left side */}
          <div className="pc-passage-panel">
            <div className="pc-passage-text">
              {passage.content}
            </div>
          </div>

          {/* Questions - right side */}
          <div className="pc-questions-panel">
            <h3 className="pc-panel-title">Answer the questions:</h3>

            <div className="pc-question-list">
              {passage.questions.map((q, i) => (
                <div
                  key={i}
                  className={`pc-question-row ${
                    results ? (results[i] ? 'correct' : 'wrong') : ''
                  }`}
                >
                  <div className="pc-question-num">{i + 1}</div>
                  <div className="pc-question-body">
                    <div className="pc-question-text">{q.question}</div>

                    {q.type === 'multiple' && q.options ? (
                      <div className="pc-options">
                        {q.options.map((opt, oi) => (
                          <button
                            key={oi}
                            className={`pc-option ${
                              answers[i] === opt ? 'selected' : ''
                            } ${
                              results && opt.toLowerCase() === q.answer.toLowerCase() ? 'correct-option' : ''
                            } ${
                              results && answers[i] === opt && !results[i] ? 'wrong-option' : ''
                            }`}
                            onClick={() => !results && handleOptionSelect(i, opt)}
                            disabled={!!results}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="pc-input-wrapper">
                        <input
                          type="text"
                          className="pc-answer-input"
                          value={answers[i] || ''}
                          onChange={e => handleAnswerChange(i, e.target.value)}
                          placeholder="Type your answer..."
                          disabled={!!results}
                          autoComplete="off"
                        />
                      </div>
                    )}

                    {results && !results[i] && (
                      <div className="pc-correct-answer">
                        Answer: {q.answer}
                      </div>
                    )}
                    {results && results[i] && (
                      <div className="pc-correct-check">&#10003; Correct!</div>
                    )}

                    {!results && q.hint && (
                      <div className="pc-hint">{q.hint}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pc-actions">
              {!results ? (
                <motion.button
                  className="pc-btn check"
                  onClick={handleCheckAnswers}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={Object.keys(answers).length === 0}
                >
                  Check Answers
                </motion.button>
              ) : (
                <motion.button
                  className="pc-btn continue"
                  onClick={handleContinue}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continue Quiz &#10140;
                </motion.button>
              )}
            </div>

            {results && (
              <motion.div
                className="pc-result-summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {Object.values(results).filter(Boolean).length} / {passage.questions.length} correct
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default PassageChallenge
