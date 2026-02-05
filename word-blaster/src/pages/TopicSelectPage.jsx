import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { subjects, topics } from '../data/defaultQuestions'
import './TopicSelectPage.css'

function TopicSelectPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const {
    setSelectedSubject,
    setSelectedTopics,
    questions,
    sequences,
    diagrams,
    gameSettings,
    setGameSettings
  } = useGame()

  const [selectedSubjectLocal, setSelectedSubjectLocal] = useState(null)
  const [selectedTopicsLocal, setSelectedTopicsLocal] = useState([])
  const [gameMode, setGameMode] = useState('quiz') // 'quiz', 'sequence', or 'diagram'

  const handleSubjectSelect = (subject) => {
    playSound('click')
    setSelectedSubjectLocal(subject)
    setSelectedTopicsLocal([])
  }

  const handleTopicToggle = (topic) => {
    playSound('click')
    setSelectedTopicsLocal(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic)
      }
      return [...prev, topic]
    })
  }

  const handleSelectAll = () => {
    playSound('click')
    if (selectedSubjectLocal) {
      setSelectedTopicsLocal(topics[selectedSubjectLocal])
    }
  }

  const handleClearAll = () => {
    playSound('click')
    setSelectedTopicsLocal([])
  }

  const handleStartGame = () => {
    playSound('gameStart')
    setSelectedSubject(selectedSubjectLocal)
    setSelectedTopics(selectedTopicsLocal.length > 0 ? selectedTopicsLocal : topics[selectedSubjectLocal])
    const routes = { quiz: '/play', sequence: '/play/sequence', diagram: '/play/diagram' }
    navigate(routes[gameMode] || '/play')
  }

  const getQuestionCount = () => {
    let filtered = questions.filter(q => q.subject === selectedSubjectLocal)
    if (selectedTopicsLocal.length > 0) {
      filtered = filtered.filter(q => selectedTopicsLocal.includes(q.topic))
    }
    return filtered.length
  }

  const getSequenceCount = () => {
    let filtered = sequences.filter(s => s.subject === selectedSubjectLocal)
    if (selectedTopicsLocal.length > 0) {
      filtered = filtered.filter(s => selectedTopicsLocal.includes(s.topic))
    }
    return filtered.length
  }

  const getDiagramCount = () => {
    let filtered = diagrams.filter(d => d.subject === selectedSubjectLocal)
    if (selectedTopicsLocal.length > 0) {
      filtered = filtered.filter(d => selectedTopicsLocal.includes(d.topic))
    }
    return filtered.length
  }

  const subjectIcons = {
    Science: '🔬',
    English: '📚'
  }

  const topicIcons = {
    'Human Body': '🫀',
    'Physics': '⚡',
    'Chemistry': '🧪',
    'Earth Science': '🌍',
    'Vocabulary': '📖',
    'Grammar': '✏️',
    'Spelling': '🔤',
    'Reading': '📕'
  }

  return (
    <div className="topic-select-page">
      <motion.div
        className="topic-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>

        <h1 className="page-title">Choose Your Adventure!</h1>

        <div className="selection-container">
          {/* Subject Selection */}
          <section className="selection-section">
            <h2 className="section-title">Pick a Subject</h2>
            <div className="subjects-grid">
              {subjects.map(subject => (
                <motion.button
                  key={subject}
                  className={`subject-card ${selectedSubjectLocal === subject ? 'selected' : ''}`}
                  onClick={() => handleSubjectSelect(subject)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="card-icon">{subjectIcons[subject]}</span>
                  <span className="card-label">{subject}</span>
                  <span className="card-count">
                    {questions.filter(q => q.subject === subject).length} questions
                  </span>
                </motion.button>
              ))}
            </div>
          </section>

          {/* Topic Selection */}
          {selectedSubjectLocal && (
            <motion.section
              className="selection-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="section-header">
                <h2 className="section-title">Select Topics</h2>
                <div className="section-actions">
                  <button className="action-btn" onClick={handleSelectAll}>Select All</button>
                  <button className="action-btn" onClick={handleClearAll}>Clear All</button>
                </div>
              </div>
              <div className="topics-grid">
                {topics[selectedSubjectLocal].map(topic => (
                  <motion.button
                    key={topic}
                    className={`topic-card ${selectedTopicsLocal.includes(topic) ? 'selected' : ''}`}
                    onClick={() => handleTopicToggle(topic)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="card-icon">{topicIcons[topic]}</span>
                    <span className="card-label">{topic}</span>
                    <span className="card-count">
                      {questions.filter(q => q.topic === topic).length} questions
                    </span>
                    {selectedTopicsLocal.includes(topic) && (
                      <span className="check-mark">✓</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          {/* Game Mode */}
          {selectedSubjectLocal && (
            <motion.section
              className="selection-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <h2 className="section-title">Game Mode</h2>
              <div className="mode-grid">
                <motion.button
                  className={`mode-card ${gameMode === 'quiz' ? 'selected' : ''}`}
                  onClick={() => { playSound('click'); setGameMode('quiz') }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="card-icon">&#127922;</span>
                  <span className="card-label">Quiz Blaster</span>
                  <span className="card-count">
                    {getQuestionCount()} questions
                  </span>
                  <span className="mode-desc">Answer falling questions before time runs out!</span>
                  {gameMode === 'quiz' && <span className="check-mark">&#10003;</span>}
                </motion.button>
                <motion.button
                  className={`mode-card ${gameMode === 'sequence' ? 'selected' : ''} ${getSequenceCount() === 0 ? 'disabled' : ''}`}
                  onClick={() => {
                    if (getSequenceCount() > 0) {
                      playSound('click')
                      setGameMode('sequence')
                    }
                  }}
                  whileHover={getSequenceCount() > 0 ? { scale: 1.03 } : {}}
                  whileTap={getSequenceCount() > 0 ? { scale: 0.97 } : {}}
                >
                  <span className="card-icon">&#128257;</span>
                  <span className="card-label">Sequence Order</span>
                  <span className="card-count">
                    {getSequenceCount()} sequence{getSequenceCount() !== 1 ? 's' : ''}
                  </span>
                  <span className="mode-desc">Drag steps into the correct order to master processes!</span>
                  {gameMode === 'sequence' && <span className="check-mark">&#10003;</span>}
                </motion.button>
                <motion.button
                  className={`mode-card ${gameMode === 'diagram' ? 'selected' : ''} ${getDiagramCount() === 0 ? 'disabled' : ''}`}
                  onClick={() => {
                    if (getDiagramCount() > 0) {
                      playSound('click')
                      setGameMode('diagram')
                    }
                  }}
                  whileHover={getDiagramCount() > 0 ? { scale: 1.03 } : {}}
                  whileTap={getDiagramCount() > 0 ? { scale: 0.97 } : {}}
                >
                  <span className="card-icon">&#128444;</span>
                  <span className="card-label">Diagram Label</span>
                  <span className="card-count">
                    {getDiagramCount()} diagram{getDiagramCount() !== 1 ? 's' : ''}
                  </span>
                  <span className="mode-desc">Label parts of scientific diagrams and images!</span>
                  {gameMode === 'diagram' && <span className="check-mark">&#10003;</span>}
                </motion.button>
              </div>
            </motion.section>
          )}

          {/* Settings */}
          {selectedSubjectLocal && gameMode === 'quiz' && (
            <motion.section
              className="selection-section settings-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h2 className="section-title">Game Settings</h2>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Time per Question</label>
                  <div className="setting-options">
                    {[30, 45, 60, 90].map(time => (
                      <button
                        key={time}
                        className={`setting-btn ${gameSettings.questionTime === time ? 'active' : ''}`}
                        onClick={() => {
                          playSound('click')
                          setGameSettings(prev => ({ ...prev, questionTime: time }))
                        }}
                      >
                        {time}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* Start Button */}
          {selectedSubjectLocal && (
            <motion.div
              className="start-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="question-summary">
                <span className="summary-icon">
                  {gameMode === 'sequence' ? '\uD83D\uDD00' : gameMode === 'diagram' ? '\uD83D\uDDBC' : '\uD83D\uDCDD'}
                </span>
                <span className="summary-text">
                  {gameMode === 'sequence'
                    ? `${getSequenceCount()} sequence${getSequenceCount() !== 1 ? 's' : ''} ready!`
                    : gameMode === 'diagram'
                    ? `${getDiagramCount()} diagram${getDiagramCount() !== 1 ? 's' : ''} ready!`
                    : `${getQuestionCount()} questions ready to play!`}
                </span>
              </div>
              <motion.button
                className="start-button"
                onClick={handleStartGame}
                disabled={
                  gameMode === 'sequence' ? getSequenceCount() === 0
                  : gameMode === 'diagram' ? getDiagramCount() === 0
                  : getQuestionCount() === 0
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="button-icon">
                  {gameMode === 'sequence' ? '\uD83C\uDFAF' : gameMode === 'diagram' ? '\uD83D\uDDBC' : '\uD83C\uDFAE'}
                </span>
                {gameMode === 'sequence' ? 'Start Sequence!' : gameMode === 'diagram' ? 'Start Labeling!' : 'Start Game!'}
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default TopicSelectPage
