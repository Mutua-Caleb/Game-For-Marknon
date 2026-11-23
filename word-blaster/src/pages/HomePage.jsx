import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { useGame } from '../context/GameContext'
import { learnerApi, learningApi } from '../utils/api'
import {
  ACTIVE_REALMS,
  FEATURE_FLAGS,
  getScholarRank,
  readDailyQuestProgress
} from '../data/curriculum'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import './HomePage.css'

const DAILY_QUEST_TARGET = 10

function readLearnerAccount() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function getLearnerTrackingId(account) {
  if (account?.id) return `learner_${account.id}`
  return localStorage.getItem('learnerId') || 'guest'
}

function HomePage() {
  const navigate = useNavigate()
  const { playSound, isMuted, toggleMute, isMusicPlaying, toggleAmbience } = useSound()
  const { questions, passages, getActiveFailedQuestions, setSelectedSubject, setSelectedTopics } = useGame()

  const learnerAccount = useMemo(() => readLearnerAccount(), [])
  const trackingId = getLearnerTrackingId(learnerAccount)

  const [dailyStatus, setDailyStatus] = useState(null)
  const [earnings, setEarnings] = useState(null)
  const [masteryTopics, setMasteryTopics] = useState([])
  const [dailyQuests, setDailyQuests] = useState(() => readDailyQuestProgress(trackingId))

  useEffect(() => {
    if (!learnerAccount?.id) return undefined

    const refreshLearnerData = () => {
      learnerApi.getDailyStatus(learnerAccount.id)
        .then(setDailyStatus)
        .catch(console.error)
      learnerApi.getEarnings(learnerAccount.id)
        .then(setEarnings)
        .catch(console.error)
      learningApi.getMastery(trackingId)
        .then(data => setMasteryTopics(Array.isArray(data?.topics) ? data.topics : []))
        .catch(console.error)
      setDailyQuests(readDailyQuestProgress(trackingId))
    }

    refreshLearnerData()
    window.addEventListener('wordblaster:synced', refreshLearnerData)
    return () => window.removeEventListener('wordblaster:synced', refreshLearnerData)
  }, [learnerAccount?.id, trackingId])

  // Aggregate mastery per active realm
  const realmMetrics = useMemo(() => {
    const metrics = {}
    for (const realm of ACTIVE_REALMS) {
      const realmMasteries = masteryTopics.filter(t => t.subject === realm.subject)
      const avgMastery = realmMasteries.length > 0
        ? Math.round(realmMasteries.reduce((sum, t) => sum + (Number(t.mastery_percentage) || 0), 0) / realmMasteries.length)
        : 0
      const qCount = questions.filter(q => q.subject === realm.subject).length
      const pCount = passages.filter(p => p.subject === realm.subject).length
      const todayCount = Number(dailyQuests[realm.id]) || 0
      metrics[realm.id] = {
        mastery: avgMastery,
        questionCount: qCount,
        passageCount: pCount,
        todayCount,
        questDone: todayCount >= DAILY_QUEST_TARGET
      }
    }
    return metrics
  }, [masteryTopics, questions, passages, dailyQuests])

  const overallMastery = useMemo(() => {
    const values = Object.values(realmMetrics).map(m => m.mastery)
    if (!values.length) return 0
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }, [realmMetrics])

  const scholarRank = getScholarRank(overallMastery, dailyStatus?.sessionsCount || 0)
  const failedQuestions = useMemo(() => getActiveFailedQuestions(12), [getActiveFailedQuestions])

  const nextRecommendedRealm = useMemo(() => {
    return ACTIVE_REALMS.find(r => !realmMetrics[r.id]?.questDone) || ACTIVE_REALMS[0]
  }, [realmMetrics])

  const completedQuestsCount = ACTIVE_REALMS.filter(r => realmMetrics[r.id]?.questDone).length

  const progressPercent = dailyStatus && dailyStatus.minutesRequired > 0
    ? Math.min(100, Math.round((dailyStatus.minutesCompleted / dailyStatus.minutesRequired) * 100))
    : 0

  const learnerInitial = (learnerAccount?.name || 'S').trim().charAt(0).toUpperCase()

  const handleEnterRealm = (realmId) => {
    playSound('click')
    navigate(`/topics?realm=${realmId}`)
  }

  const handleLaunchMistakeForge = () => {
    playSound('gameStart')
    setSelectedSubject('Mistake Forge')
    setSelectedTopics([])
    navigate('/play?mode=mistakes')
  }

  const handleMentalWarmup = (e) => {
    e.stopPropagation()
    playSound('click')
    navigate('/math')
  }

  const handleLogout = () => {
    playSound('click')
    localStorage.removeItem('learnerAccount')
    localStorage.removeItem('learnerId')
    navigate('/login')
  }

  return (
    <div className="home-page">
      <AmbientBackdrop realm={nextRecommendedRealm.id} />

      {/* Top Command Bar */}
      <header className="command-topbar">
        <div className="topbar-inner">
          <div className="brand-cluster">
            <div className="scholar-avatar" aria-hidden="true">{learnerInitial}</div>
            <div className="scholar-identity">
              <div className="scholar-name-row">
                <span className="scholar-name">{learnerAccount?.name || 'Scholar'}</span>
                <span className="scholar-rank-pill">
                  <ObservatoryIcon name="crown" size={13} />
                  {scholarRank.title}
                </span>
              </div>
              <span className="brand-sub">Scholar&apos;s Observatory &middot; 4-Month Prep Sprint</span>
            </div>
          </div>

          <div className="topbar-controls">
            <button
              type="button"
              className={`hud-icon-btn ${isMusicPlaying ? 'is-active' : ''}`}
              onClick={() => {
                toggleAmbience()
                playSound('click')
              }}
              title={isMusicPlaying ? 'Turn off focus rain ambience' : 'Turn on focus rain ambience'}
            >
              <ObservatoryIcon name="ambience" size={18} />
              <span className="hud-btn-label">Focus Rain</span>
            </button>

            <button
              type="button"
              className={`hud-icon-btn ${isMuted ? 'is-muted' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              <ObservatoryIcon name={isMuted ? 'sound-off' : 'sound-on'} size={18} />
            </button>

            <button type="button" className="btn-ghost logout-btn" onClick={handleLogout}>
              <ObservatoryIcon name="logout" size={16} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="command-main">
        {/* Hero Strip: Daily Prep Mission + KSh Focus Vault */}
        <section className="hero-grid">
          <Motion.div
            className="mission-panel obs-panel"
            data-realm={nextRecommendedRealm.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mission-header">
              <div>
                <span className="panel-eyebrow">Today&apos;s Prep Mission</span>
                <h1 className="mission-title">
                  {dailyStatus?.quotaMet
                    ? 'Daily target complete — push for mastery!'
                    : 'Your British Prep Command Deck'}
                </h1>
              </div>

              <MasteryRing
                percent={progressPercent}
                size={76}
                strokeWidth={6}
                color={dailyStatus?.quotaMet ? '#10b981' : '#f5b942'}
              >
                <div className="quota-ring-label">
                  <strong className="mono-num">{progressPercent}%</strong>
                  <span>quota</span>
                </div>
              </MasteryRing>
            </div>

            <div className="mission-time-meta">
              <span className="mono-num">
                {dailyStatus ? `${dailyStatus.minutesCompleted} / ${dailyStatus.minutesRequired} min` : 'Active focus tracking ready'}
              </span>
              <span className="meta-dot">&middot;</span>
              <span>{completedQuestsCount} of {ACTIVE_REALMS.length} realms trained today</span>
            </div>

            <div className="daily-quest-list">
              {ACTIVE_REALMS.map(realm => {
                const stat = realmMetrics[realm.id] || { todayCount: 0, questDone: false }
                return (
                  <button
                    key={realm.id}
                    type="button"
                    className={`quest-row ${stat.questDone ? 'is-complete' : ''}`}
                    data-realm={realm.id}
                    onClick={() => handleEnterRealm(realm.id)}
                  >
                    <span className="quest-check">
                      {stat.questDone
                        ? <ObservatoryIcon name="check" size={14} />
                        : <span className="quest-dot" />}
                    </span>
                    <span className="quest-realm-name">{realm.shortTitle}</span>
                    <span className="quest-goal-desc">{realm.dailyGoalLabel}</span>
                    <span className="quest-count mono-num">
                      {Math.min(stat.todayCount, DAILY_QUEST_TARGET)}/{DAILY_QUEST_TARGET}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mission-cta-row">
              <button
                type="button"
                className="btn-tactile"
                onClick={() => handleEnterRealm(nextRecommendedRealm.id)}
              >
                <span>Continue {nextRecommendedRealm.shortTitle}</span>
                <ObservatoryIcon name="arrow-right" size={18} />
              </button>
            </div>
          </Motion.div>

          {/* KSh Focus Vault */}
          <Motion.div
            className="vault-panel obs-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <div className="vault-header">
              <div className="vault-icon-badge">
                <ObservatoryIcon name="vault" size={22} />
              </div>
              <div>
                <span className="panel-eyebrow">Reward Vault</span>
                <h2 className="vault-title">Focus Earnings</h2>
              </div>
            </div>

            <div className="vault-balance-block">
              <span className="vault-balance-label">Unpaid Balance</span>
              <div className="vault-balance-value mono-num">
                KSh {earnings ? earnings.unpaidTotal.toFixed(2) : '0.00'}
              </div>
            </div>

            <div className="vault-substats">
              <div className="vault-substat">
                <span className="vault-substat-label">Earned Today</span>
                <strong className="mono-num">
                  KSh {earnings ? earnings.todayEarnings.toFixed(2) : '0.00'}
                </strong>
                <small>{earnings?.todayFocusBlocks || 0} focus blocks</small>
              </div>
              <div className="vault-divider" />
              <div className="vault-substat">
                <span className="vault-substat-label">This Week</span>
                <strong className="mono-num">
                  KSh {earnings ? earnings.weekEarnings.toFixed(2) : '0.00'}
                </strong>
                <small>KSh 20 / 10-min block</small>
              </div>
            </div>

            <div className="vault-mastery-footer">
              <div className="vault-mastery-row">
                <span>Overall Sprint Mastery</span>
                <strong className="mono-num">{overallMastery}%</strong>
              </div>
              <div className="vault-mastery-bar">
                <div className="vault-mastery-fill" style={{ width: `${overallMastery}%` }} />
              </div>
            </div>
          </Motion.div>
        </section>

        {/* Mistake Forge Boss Rematch (only when weak spots exist) */}
        {failedQuestions.length > 0 && (
          <Motion.section
            className="mistake-forge-banner obs-panel"
            data-realm="mistakes"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14 }}
          >
            <div className="forge-left">
              <div className="forge-crest">
                <RealmCrest realmId="mistakes" size={30} />
              </div>
              <div>
                <span className="forge-eyebrow">Weak-Spot Boss Rematch</span>
                <h2 className="forge-title">
                  Mistake Forge &middot; {failedQuestions.length} {failedQuestions.length === 1 ? 'question' : 'questions'} to conquer
                </h2>
                <p className="forge-desc">
                  Turn your missed answers into permanent mastery with a focused rematch.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-tactile forge-cta"
              onClick={handleLaunchMistakeForge}
            >
              <ObservatoryIcon name="bolt" size={17} />
              <span>Challenge Forge</span>
            </button>
          </Motion.section>
        )}

        {/* The 4 Realms Grid */}
        <section className="realms-section">
          <div className="section-heading-row">
            <div>
              <span className="panel-eyebrow">Active Study Realms</span>
              <h2 className="realms-heading">Choose Your Wing</h2>
            </div>
            <span className="realms-caption">4 focused pillars &middot; zero clutter</span>
          </div>

          <div className="realms-grid">
            {ACTIVE_REALMS.map((realm, index) => {
              const stat = realmMetrics[realm.id] || { mastery: 0, questionCount: 0, passageCount: 0 }
              return (
                <Motion.article
                  key={realm.id}
                  className="realm-card obs-panel"
                  data-realm={realm.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.06 }}
                  whileHover={{ y: -4 }}
                  onClick={() => handleEnterRealm(realm.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleEnterRealm(realm.id)
                    }
                  }}
                >
                  <div className="realm-card-glow" aria-hidden="true" />

                  <div className="realm-card-top">
                    <div className="realm-crest-box">
                      <RealmCrest realmId={realm.id} size={30} />
                    </div>
                    <MasteryRing
                      percent={stat.mastery}
                      size={52}
                      strokeWidth={4}
                      color={realm.accent}
                    >
                      <span className="realm-ring-pct mono-num">{stat.mastery}%</span>
                    </MasteryRing>
                  </div>

                  <span className="realm-kicker">{realm.kicker}</span>
                  <h3 className="realm-title">{realm.title}</h3>
                  <p className="realm-desc">{realm.description}</p>

                  <div className="realm-topic-pills">
                    {realm.topics.slice(0, 3).map(topic => (
                      <span key={topic} className="realm-topic-pill">{topic}</span>
                    ))}
                    {realm.topics.length > 3 && (
                      <span className="realm-topic-pill">+{realm.topics.length - 3}</span>
                    )}
                  </div>

                  <div className="realm-card-footer">
                    <span className="realm-count mono-num">
                      {stat.questionCount} drills
                      {stat.passageCount > 0 ? ` · ${stat.passageCount} passages` : ''}
                    </span>

                    <div className="realm-footer-actions">
                      {realm.id === 'maths' && FEATURE_FLAGS.showSoroMathWarmup && (
                        <button
                          type="button"
                          className="warmup-chip"
                          onClick={handleMentalWarmup}
                          title="Open 3-minute mental speed arithmetic warm-up"
                        >
                          <ObservatoryIcon name="bolt" size={13} />
                          <span>Speed Warm-Up</span>
                        </button>
                      )}
                      <span className="realm-enter-link">
                        Enter
                        <ObservatoryIcon name="arrow-right" size={15} />
                      </span>
                    </div>
                  </div>
                </Motion.article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomePage
