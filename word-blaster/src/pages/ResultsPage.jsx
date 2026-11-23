import { useLocation, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { getRealmBySubject } from '../data/curriculum'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon } from '../components/RealmIcons'
import './ResultsPage.css'

function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { playSound } = useSound()
  const { playerStats, selectedSubject, getActiveFailedQuestions } = useGame()

  const sessionStats = location.state || {
    score: 0,
    correct: 0,
    wrong: 0,
    streak: 0
  }

  const realm = getRealmBySubject(selectedSubject)
  const totalQuestions = sessionStats.correct + sessionStats.wrong
  const accuracy = totalQuestions > 0 ? Math.round((sessionStats.correct / totalQuestions) * 100) : 0

  const getGrade = () => {
    if (accuracy >= 90) return { grade: 'Distinction', tag: 'A+', color: '#10b981' }
    if (accuracy >= 80) return { grade: 'Commended', tag: 'A', color: '#22d3ee' }
    if (accuracy >= 70) return { grade: 'Strong Effort', tag: 'B', color: '#818cf8' }
    if (accuracy >= 55) return { grade: 'Building Momentum', tag: 'C', color: '#f5b942' }
    return { grade: 'Forge Your Mastery', tag: 'Keep Going', color: '#fb7185' }
  }

  const { grade, tag, color } = getGrade()
  const failedQuestions = getActiveFailedQuestions(4)

  const handlePlayAgain = () => {
    playSound('click')
    navigate(realm ? `/topics?realm=${realm.id}` : '/topics')
  }

  const handleRematchMistakes = () => {
    playSound('gameStart')
    navigate('/play?mode=mistakes')
  }

  const handleHome = () => {
    playSound('click')
    navigate('/')
  }

  return (
    <div className="results-page" data-realm={realm?.id || 'cat4'}>
      <AmbientBackdrop realm={realm?.id || 'cat4'} />

      <Motion.div
        className="results-content"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {/* Header Debrief Card */}
        <section className="debrief-hero obs-panel">
          <span className="debrief-eyebrow">
            {selectedSubject || 'Training Session'} &middot; Mission Debrief
          </span>

          <div className="debrief-ring-wrap">
            <MasteryRing percent={accuracy} size={126} strokeWidth={8} color={color}>
              <div className="debrief-ring-center">
                <strong className="mono-num" style={{ color }}>{accuracy}%</strong>
                <span>accuracy</span>
              </div>
            </MasteryRing>
          </div>

          <div className="debrief-grade-badge" style={{ color, borderColor: `${color}55` }}>
            {tag}
          </div>
          <h1 className="result-grade">{grade}</h1>

          <div className="stats-grid">
            <div className="stat-tile">
              <span className="stat-icon" style={{ color: '#f5b942' }}>
                <ObservatoryIcon name="trophy" size={18} />
              </span>
              <strong className="stat-value mono-num">{sessionStats.score}</strong>
              <span className="stat-label">Session Score</span>
            </div>

            <div className="stat-tile">
              <span className="stat-icon" style={{ color: '#10b981' }}>
                <ObservatoryIcon name="check" size={18} />
              </span>
              <strong className="stat-value mono-num">{sessionStats.correct}</strong>
              <span className="stat-label">Correct</span>
            </div>

            <div className="stat-tile">
              <span className="stat-icon" style={{ color: '#fb7185' }}>
                <ObservatoryIcon name="target" size={18} />
              </span>
              <strong className="stat-value mono-num">{sessionStats.wrong}</strong>
              <span className="stat-label">Missed</span>
            </div>

            <div className="stat-tile">
              <span className="stat-icon" style={{ color: '#fb923c' }}>
                <ObservatoryIcon name="flame" size={18} />
              </span>
              <strong className="stat-value mono-num">{Math.max(sessionStats.streak || 0, playerStats.bestStreak || 0)}</strong>
              <span className="stat-label">Best Streak</span>
            </div>
          </div>
        </section>

        {/* Mistake Forge Review */}
        {failedQuestions.length > 0 && (
          <section className="practice-section obs-panel">
            <div className="practice-header">
              <div>
                <span className="practice-eyebrow">Mistake Forge Queue</span>
                <h2>Weak Spots to Master</h2>
              </div>
              <button
                type="button"
                className="btn-ghost rematch-pill"
                onClick={handleRematchMistakes}
              >
                <ObservatoryIcon name="bolt" size={15} />
                <span>Rematch Now</span>
              </button>
            </div>

            <div className="practice-list">
              {failedQuestions.map((q, index) => (
                <div key={q.id} className="practice-item">
                  <span className="practice-number mono-num">0{index + 1}</span>
                  <div className="practice-content">
                    <div className="practice-question">{q.question}</div>
                    <div className="practice-answer">
                      Answer: <strong>{q.answer}</strong>
                    </div>
                  </div>
                  <div className="practice-stats mono-num">
                    {Math.round(q.failureRate * 100)}% miss
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="results-actions">
          <button type="button" className="btn-tactile" onClick={handlePlayAgain}>
            <ObservatoryIcon name="play" size={17} />
            <span>Train Again</span>
          </button>

          <button type="button" className="btn-ghost home-return-btn" onClick={handleHome}>
            <ObservatoryIcon name="arrow-left" size={17} />
            <span>Command Center</span>
          </button>
        </div>
      </Motion.div>
    </div>
  )
}

export default ResultsPage
