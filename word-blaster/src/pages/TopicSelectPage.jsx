import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { learningApi } from '../utils/api'
import {
  ACTIVE_REALMS,
  FEATURE_FLAGS,
  PACE_MODES,
  getMasteryTier,
  getRealmById,
  getRealmBySubject
} from '../data/curriculum'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import './TopicSelectPage.css'

function getLearnerId() {
  let learnerId = localStorage.getItem('learnerId')
  if (!learnerId) {
    learnerId = 'learner_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
    localStorage.setItem('learnerId', learnerId)
  }
  return learnerId
}

function TopicSelectPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { playSound } = useSound()
  const {
    selectedSubject,
    setSelectedSubject,
    setSelectedTopics,
    questions,
    passages,
    gameSettings,
    setGameSettings
  } = useGame()

  const activeRealm = useMemo(() => {
    const fromQuery = getRealmById(searchParams.get('realm'))
    if (fromQuery) return fromQuery
    const fromContext = getRealmBySubject(selectedSubject)
    if (fromContext) return fromContext
    return ACTIVE_REALMS[0]
  }, [searchParams, selectedSubject])

  const [selectedByRealm, setSelectedByRealm] = useState({})
  const [topicMastery, setTopicMastery] = useState({})

  const learnerId = getLearnerId()
  const selectedTopicsLocal = useMemo(
    () => selectedByRealm[activeRealm.id] || [],
    [selectedByRealm, activeRealm.id]
  )

  const setSelectedTopicsLocal = useCallback((updater) => {
    setSelectedByRealm(prev => {
      const current = prev[activeRealm.id] || []
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [activeRealm.id]: next }
    })
  }, [activeRealm.id])

  // Fetch mastery data on mount
  useEffect(() => {
    async function fetchMastery() {
      try {
        const data = await learningApi.getMastery(learnerId)
        const masteryMap = {}
        if (Array.isArray(data?.topics)) {
          data.topics.forEach(t => {
            masteryMap[`${t.subject}:${t.topic}`] = t
          })
        }
        setTopicMastery(masteryMap)
      } catch (err) {
        console.error('Failed to fetch mastery:', err)
      }
    }
    fetchMastery()
  }, [learnerId])

  const getTopicMastery = useCallback((subject, topic) => {
    return topicMastery[`${subject}:${topic}`] || { mastery_percentage: 0, locked: false }
  }, [topicMastery])

  // Merge configured realm topics with any extra DB topics for that subject
  const realmTopics = useMemo(() => {
    const dbTopics = questions
      .filter(q => q.subject === activeRealm.subject)
      .map(q => q.topic)
    const merged = [...activeRealm.topics]
    for (const t of dbTopics) {
      if (t && !merged.includes(t)) merged.push(t)
    }
    return merged
  }, [activeRealm, questions])

  const handleRealmSwitch = (realmId) => {
    playSound('click')
    setSearchParams({ realm: realmId }, { replace: true })
  }

  const handleTopicToggle = (topic) => {
    const mastery = getTopicMastery(activeRealm.subject, topic)
    if (mastery.locked) {
      playSound('wrong')
      return
    }
    playSound('click')
    setSelectedTopicsLocal(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  const handleSelectAll = () => {
    playSound('click')
    const unlocked = realmTopics.filter(t => !getTopicMastery(activeRealm.subject, t).locked)
    setSelectedTopicsLocal(unlocked)
  }

  const handleClearAll = () => {
    playSound('click')
    setSelectedTopicsLocal([])
  }

  const effectiveTopics = selectedTopicsLocal.length > 0 ? selectedTopicsLocal : realmTopics

  const availableQuestionsCount = useMemo(() => {
    return questions.filter(
      q => q.subject === activeRealm.subject && effectiveTopics.includes(q.topic)
    ).length
  }, [questions, activeRealm.subject, effectiveTopics])

  const availablePassagesCount = useMemo(() => {
    return passages.filter(p => p.subject === activeRealm.subject).length
  }, [passages, activeRealm.subject])

  const handleStartGame = () => {
    if (availableQuestionsCount === 0) return
    playSound('gameStart')
    setSelectedSubject(activeRealm.subject)
    setSelectedTopics(effectiveTopics)
    navigate('/play')
  }

  return (
    <div className="topic-select-page" data-realm={activeRealm.id}>
      <AmbientBackdrop realm={activeRealm.id} />

      <div className="topic-shell">
        {/* Top Navigation Row */}
        <header className="topic-topbar">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              playSound('click')
              navigate('/')
            }}
          >
            <ObservatoryIcon name="arrow-left" size={16} />
            <span>Command Center</span>
          </button>

          {/* Realm Switcher Tabs */}
          <nav className="realm-switcher" aria-label="Switch active prep realm">
            {ACTIVE_REALMS.map(realm => (
              <button
                key={realm.id}
                type="button"
                className={`realm-tab ${realm.id === activeRealm.id ? 'is-active' : ''}`}
                data-realm={realm.id}
                onClick={() => handleRealmSwitch(realm.id)}
              >
                <RealmCrest realmId={realm.id} size={18} />
                <span>{realm.shortTitle}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* Active Realm Hero Banner */}
        <Motion.section
          key={activeRealm.id}
          className="realm-banner obs-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="realm-banner-left">
            <div className="banner-crest">
              <RealmCrest realmId={activeRealm.id} size={36} />
            </div>
            <div>
              <span className="banner-kicker">{activeRealm.kicker}</span>
              <h1 className="banner-title">{activeRealm.title}</h1>
              <p className="banner-desc">{activeRealm.description}</p>
            </div>
          </div>

          {activeRealm.id === 'english' && (
            <button
              type="button"
              className="btn-tactile"
              onClick={() => {
                playSound('click')
                navigate('/reading')
              }}
            >
              <ObservatoryIcon name="sparkles" size={16} />
              <span>Open Reading &amp; Vocab Studio</span>
            </button>
          )}

          {activeRealm.id === 'maths' && FEATURE_FLAGS.showSoroMathWarmup && (
            <button
              type="button"
              className="btn-ghost warmup-banner-btn"
              onClick={() => {
                playSound('click')
                navigate('/math')
              }}
            >
              <ObservatoryIcon name="bolt" size={16} />
              <span>3-Min Mental Speed Warm-Up</span>
            </button>
          )}
        </Motion.section>

        {/* Skill Path Nodes */}
        <section className="skill-map-section obs-panel">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Skill Constellation</span>
              <h2 className="section-title">Select Focus Nodes</h2>
              <p className="section-hint">
                Pick specific topics to target, or leave all unselected to train across the entire wing.
              </p>
            </div>
            <div className="section-actions">
              <button type="button" className="btn-ghost action-pill" onClick={handleSelectAll}>
                Select All
              </button>
              <button type="button" className="btn-ghost action-pill" onClick={handleClearAll}>
                Clear
              </button>
            </div>
          </div>

          <div className="skill-nodes-grid">
            {realmTopics.map((topic, idx) => {
              const mastery = getTopicMastery(activeRealm.subject, topic)
              const pct = Math.round(mastery.mastery_percentage || 0)
              const tier = getMasteryTier(pct)
              const isLocked = Boolean(mastery.locked)
              const isSelected = selectedTopicsLocal.includes(topic)
              const topicCount = questions.filter(
                q => q.subject === activeRealm.subject && q.topic === topic
              ).length

              return (
                <Motion.button
                  key={topic}
                  type="button"
                  className={`skill-node ${isSelected ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''}`}
                  onClick={() => handleTopicToggle(topic)}
                  whileHover={!isLocked ? { y: -3 } : {}}
                  whileTap={!isLocked ? { scale: 0.98 } : {}}
                  title={isLocked ? mastery.lockReason : `Select ${topic}`}
                >
                  <div className="node-top-row">
                    <span className="node-index mono-num">0{idx + 1}</span>
                    <span
                      className="node-tier-pill"
                      style={{ color: tier.color, borderColor: `${tier.color}55` }}
                    >
                      {tier.id === 'crown' && <ObservatoryIcon name="crown" size={12} />}
                      {tier.label}
                    </span>
                  </div>

                  <div className="node-body">
                    <MasteryRing
                      percent={pct}
                      size={56}
                      strokeWidth={4.5}
                      color={isLocked ? '#64748b' : activeRealm.accent}
                    >
                      {isLocked ? (
                        <ObservatoryIcon name="lock" size={18} />
                      ) : (
                        <span className="node-pct mono-num">{pct}%</span>
                      )}
                    </MasteryRing>

                    <div className="node-copy">
                      <span className="node-title">{topic}</span>
                      <span className="node-count mono-num">
                        {topicCount} {topicCount === 1 ? 'drill' : 'drills'}
                      </span>
                    </div>
                  </div>

                  {isLocked && mastery.lockReason && (
                    <span className="node-lock-reason">{mastery.lockReason}</span>
                  )}

                  {isSelected && !isLocked && (
                    <span className="node-selected-check" aria-label="Selected">
                      <ObservatoryIcon name="check" size={14} />
                    </span>
                  )}
                </Motion.button>
              )
            })}
          </div>
        </section>

        {/* Training Pace Selector */}
        <section className="pace-section obs-panel">
          <div className="pace-header">
            <div>
              <span className="section-eyebrow">Tempo Control</span>
              <h2 className="section-title">Training Pace</h2>
            </div>
            <span className="pace-caption">Choose deep analytical thinking or exam speed</span>
          </div>

          <div className="pace-grid">
            {PACE_MODES.map(mode => {
              const isActive = gameSettings.questionTime === mode.seconds
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`pace-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    playSound('click')
                    setGameSettings(prev => ({ ...prev, questionTime: mode.seconds }))
                  }}
                >
                  <div className="pace-card-top">
                    <span className="pace-label">{mode.label}</span>
                    <span className="pace-seconds mono-num">{mode.seconds}s</span>
                  </div>
                  <span className="pace-desc">{mode.description}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Launch Session Bar */}
        <div className="launch-bar obs-panel">
          <div className="launch-summary">
            <span className="launch-summary-title">
              {selectedTopicsLocal.length > 0
                ? `${selectedTopicsLocal.length} focus ${selectedTopicsLocal.length === 1 ? 'node' : 'nodes'} selected`
                : `Full ${activeRealm.shortTitle} Wing`}
            </span>
            <span className="launch-summary-meta mono-num">
              {availableQuestionsCount} drills ready
              {availablePassagesCount > 0 ? ` · ${availablePassagesCount} reading passages included` : ''}
            </span>
          </div>

          <button
            type="button"
            className="btn-tactile launch-btn"
            onClick={handleStartGame}
            disabled={availableQuestionsCount === 0}
          >
            <ObservatoryIcon name="play" size={17} />
            <span>Launch Session</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TopicSelectPage
