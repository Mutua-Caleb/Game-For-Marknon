import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import { quizSessionApi, learnerApi } from '../utils/api'
import { recordDailyQuestAnswer } from '../data/curriculum'
import {
  FRANCOPHONIE_STOPS,
  FRENCH_SENTENCE_BUILDERS,
  FRENCH_VOCAB_DECK
} from '../data/frenchData'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import './FrenchAtelierPage.css'

const FRENCH_PROGRESS_KEY = 'observatory-french-mastered-v1'

function readLearnerAccount() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function readMasteredWords() {
  try {
    const raw = localStorage.getItem(FRENCH_PROGRESS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveMasteredWords(ids) {
  try {
    localStorage.setItem(FRENCH_PROGRESS_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

function speakFrench(text, slow = false) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'fr-FR'
    utter.rate = slow ? 0.68 : 0.94
    window.speechSynthesis.speak(utter)
  } catch {
    // ignore speech errors
  }
}

function getTrackingId() {
  return localStorage.getItem('learnerId') || 'guest'
}

function shuffleDeterministic(arr, seedStr) {
  const copy = [...arr]
  let seed = 0
  for (let i = 0; i < seedStr.length; i += 1) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 100000
  }
  for (let i = copy.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    const j = seed % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function FrenchAtelierPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const trackingId = getTrackingId()

  const [tab, setTab] = useState('atlas') // 'atlas' | 'flashcards' | 'sentences'
  const [selectedStopId, setSelectedStopId] = useState('paris')
  const [masteredIds, setMasteredIds] = useState(() => readMasteredWords())

  // Flashcards / Audio-First state
  const [cardIndex, setCardIndex] = useState(0)
  const [audioFirstMode, setAudioFirstMode] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Sentence Builder state
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [chosenTokens, setChosenTokens] = useState([]) // array of { id, word }
  const [sentenceResult, setSentenceResult] = useState(null) // 'correct' | 'wrong' | null
  const [streak, setStreak] = useState(0)

  const sessionIdRef = useRef(null)
  const sessionPromiseRef = useRef(null)
  const sessionStartRef = useRef(0)
  const questionStartRef = useRef(0)
  const bestStreakRef = useRef(0)
  const scoreRef = useRef(0)
  const topicsUsedRef = useRef(new Set())

  useEffect(() => {
    questionStartRef.current = Date.now()
  }, [sentenceIdx, tab])

  const ensureFrenchSession = useCallback((initialTopic) => {
    if (sessionIdRef.current) return Promise.resolve(sessionIdRef.current)
    if (sessionPromiseRef.current) return sessionPromiseRef.current

    const learner = readLearnerAccount()
    sessionStartRef.current = Date.now()
    if (initialTopic) topicsUsedRef.current.add(initialTopic)

    sessionPromiseRef.current = quizSessionApi.start({
      learnerId: learner?.id || null,
      playerName: learner?.name || 'Anonymous',
      subject: 'French',
      topics: Array.from(topicsUsedRef.current),
      gameMode: 'french',
      minTimeRequired: 10 * 60
    }).then(res => {
      sessionIdRef.current = res?.sessionId || null
      return sessionIdRef.current
    }).catch(err => {
      console.error('Failed to start French session:', err)
      sessionPromiseRef.current = null
      return null
    })
    return sessionPromiseRef.current
  }, [])

  useEffect(() => {
    const topicsSet = topicsUsedRef.current
    return () => {
      if (!sessionIdRef.current || !sessionStartRef.current) return
      const durationSeconds = Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000))
      quizSessionApi.sendActivityBeacon(sessionIdRef.current, {
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
        durationSeconds,
        topics: Array.from(topicsSet),
        completed: true
      })
      const learner = readLearnerAccount()
      if (learner?.id && durationSeconds >= 10) {
        learnerApi.recordTimeBeacon(learner.id, durationSeconds / 60)
      }
    }
  }, [])

  const activeStop = useMemo(
    () => FRANCOPHONIE_STOPS.find(s => s.id === selectedStopId) || FRANCOPHONIE_STOPS[0],
    [selectedStopId]
  )

  const stopCards = useMemo(
    () => FRENCH_VOCAB_DECK.filter(w => w.stopId === activeStop.id),
    [activeStop.id]
  )

  const currentCard = stopCards[cardIndex % Math.max(1, stopCards.length)] || FRENCH_VOCAB_DECK[0]

  const activeSentence = FRENCH_SENTENCE_BUILDERS[sentenceIdx % FRENCH_SENTENCE_BUILDERS.length]

  const sentenceBank = useMemo(() => {
    const raw = [...activeSentence.answerTokens, ...activeSentence.distractors].map((word, idx) => ({
      id: `${activeSentence.id}_t${idx}`,
      word
    }))
    return shuffleDeterministic(raw, activeSentence.id)
  }, [activeSentence])

  const chosenIds = new Set(chosenTokens.map(t => t.id))

  const toggleMastered = (cardId) => {
    const exists = masteredIds.includes(cardId)
    const next = exists ? masteredIds.filter(id => id !== cardId) : [...masteredIds, cardId]
    setMasteredIds(next)
    saveMasteredWords(next)
    if (!exists) {
      playSound('correct', { streak: streak + 1 })
      setStreak(s => s + 1)
      recordDailyQuestAnswer(trackingId, 'French')
    } else {
      playSound('click')
    }
  }

  const handleSelectStop = (stopId) => {
    playSound('click')
    setSelectedStopId(stopId)
    setCardIndex(0)
    setRevealed(false)
  }

  const handlePickToken = (tokenObj) => {
    if (sentenceResult) return
    playSound('click')
    setChosenTokens(prev => [...prev, tokenObj])
  }

  const handleRemoveToken = (tokenId) => {
    if (sentenceResult) return
    playSound('click')
    setChosenTokens(prev => prev.filter(t => t.id !== tokenId))
  }

  const handleCheckSentence = () => {
    const built = chosenTokens.map(t => t.word).join(' ')
    const target = activeSentence.answerTokens.join(' ')
    const isCorrect = built === target
    const timeTakenMs = questionStartRef.current ? Math.max(300, Date.now() - questionStartRef.current) : 0
    const topicName = activeSentence.topic || 'Sentence Builder'
    topicsUsedRef.current.add(topicName)

    setSentenceResult(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) {
      const nextStreak = streak + 1
      playSound('correct', { streak })
      setStreak(nextStreak)
      bestStreakRef.current = Math.max(bestStreakRef.current, nextStreak)
      scoreRef.current += 100
      recordDailyQuestAnswer(trackingId, 'French')
      speakFrench(target, false)
    } else {
      playSound('wrong')
      setStreak(0)
    }

    ensureFrenchSession(topicName).then(sid => {
      if (!sid) return
      quizSessionApi.recordAnswer(sid, {
        questionId: activeSentence.id,
        questionText: `Translate: "${activeSentence.english}"`,
        correctAnswer: target,
        givenAnswer: built,
        isCorrect,
        outcome: isCorrect ? 'correct' : 'wrong',
        subject: 'French',
        topic: topicName,
        timeTakenMs
      }).catch(console.error)
      quizSessionApi.updateActivity(sid, {
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
        durationSeconds: Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000)),
        topics: Array.from(topicsUsedRef.current),
        completed: true
      }).catch(console.error)
    }).catch(console.error)
  }

  const handleNextSentence = () => {
    playSound('click')
    setSentenceIdx(i => (i + 1) % FRENCH_SENTENCE_BUILDERS.length)
    setChosenTokens([])
    setSentenceResult(null)
    questionStartRef.current = Date.now()
  }

  const genderLabel = (g) => {
    if (g === 'm') return { text: 'Masculin (le / un)', cls: 'is-masc' }
    if (g === 'f') return { text: 'Féminin (la / une)', cls: 'is-fem' }
    if (g === 'p') return { text: 'Pluriel (les)', cls: 'is-plur' }
    return { text: 'Verbe / Expression', cls: 'is-verb' }
  }

  return (
    <div className="french-atelier-page" data-realm="french">
      <AmbientBackdrop realm="french" />

      <div className="french-shell">
        {/* Top Bar */}
        <header className="french-topbar">
          <div className="french-topbar-left">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { playSound('click'); navigate('/') }}
            >
              <ObservatoryIcon name="arrow-left" size={16} />
              <span>Command Center</span>
            </button>

            <div className="french-brand">
              <RealmCrest realmId="french" size={24} />
              <div>
                <strong>L&apos;Atelier Français</strong>
                <span>La Francophonie Atlas &middot; Audio Immersion &middot; Sentence Forge</span>
              </div>
            </div>
          </div>

          <div className="french-mode-tabs">
            {[
              { id: 'atlas', label: 'Francophonie Atlas' },
              { id: 'flashcards', label: 'Audio & Gender Deck' },
              { id: 'sentences', label: 'Sentence Builder' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                className={`fr-tab ${tab === item.id ? 'is-active' : ''}`}
                onClick={() => { playSound('click'); setTab(item.id) }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {/* Gender Legend Strip */}
        <div className="gender-legend-bar">
          <span className="legend-pill is-masc">le / un = Masculin (Cobalt)</span>
          <span className="legend-pill is-fem">la / une = Féminin (Coral)</span>
          <span className="legend-pill is-mastered mono-num">
            {masteredIds.length} / {FRENCH_VOCAB_DECK.length} words mastered
          </span>
        </div>

        {/* ============================================================
            TAB 1: LA FRANCOPHONIE EXPEDITION ATLAS
            ============================================================ */}
        {tab === 'atlas' && (
          <div className="atlas-layout">
            <section className="atlas-map-panel obs-panel">
              <div className="atlas-map-head">
                <span className="fr-eyebrow">Interactive Expedition Map</span>
                <h2>Explore La Francophonie</h2>
              </div>

              <div className="atlas-svg-wrap">
                <svg viewBox="0 0 100 72" className="francophonie-map-svg" aria-label="Map of French-speaking regions">
                  {/* Subtle stylized continent silhouettes (100% offline vector) */}
                  <g fill="rgba(59, 130, 246, 0.14)" stroke="rgba(147, 197, 253, 0.25)" strokeWidth="0.45">
                    {/* North America */}
                    <path d="M8,16 L34,14 L36,28 L29,39 L20,42 L13,34 Z" />
                    {/* South America */}
                    <path d="M26,45 L37,48 L34,67 L27,68 L23,54 Z" />
                    {/* Europe */}
                    <path d="M43,19 L59,18 L61,34 L46,36 L43,28 Z" />
                    {/* Africa */}
                    <path d="M42,39 L59,40 L63,56 L54,69 L45,63 L40,51 Z" />
                    {/* Asia / Eurasia */}
                    <path d="M61,18 L92,20 L90,46 L68,45 L61,35 Z" />
                  </g>

                  {/* Flight arc connections from Paris */}
                  {FRANCOPHONIE_STOPS.filter(s => s.id !== 'paris').map(stop => (
                    <line
                      key={stop.id}
                      x1="49"
                      y1="31"
                      x2={stop.mapX}
                      y2={stop.mapY}
                      stroke={stop.id === activeStop.id ? '#fb923c' : 'rgba(147, 197, 253, 0.28)'}
                      strokeWidth={stop.id === activeStop.id ? '0.65' : '0.35'}
                      strokeDasharray="1.4 1.2"
                    />
                  ))}

                  {/* Interactive City Pins */}
                  {FRANCOPHONIE_STOPS.map(stop => {
                    const isSelected = stop.id === activeStop.id
                    const stopWords = FRENCH_VOCAB_DECK.filter(w => w.stopId === stop.id)
                    const allDone = stopWords.every(w => masteredIds.includes(w.id))
                    return (
                      <g
                        key={stop.id}
                        className="map-pin-group"
                        onClick={() => handleSelectStop(stop.id)}
                        role="button"
                        tabIndex={0}
                      >
                        {isSelected && (
                          <circle cx={stop.mapX} cy={stop.mapY} r="4.2" fill="rgba(251, 146, 60, 0.25)" />
                        )}
                        <circle
                          cx={stop.mapX}
                          cy={stop.mapY}
                          r={isSelected ? '2.2' : '1.65'}
                          fill={allDone ? '#10b981' : isSelected ? '#fb923c' : '#60a5fa'}
                          stroke="#ffffff"
                          strokeWidth="0.55"
                        />
                        <text
                          x={stop.mapX}
                          y={stop.mapY - 3}
                          textAnchor="middle"
                          fontSize="2.7"
                          fontWeight="700"
                          fill={isSelected ? '#fde68a' : '#dbeafe'}
                        >
                          {stop.city}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="stop-pill-row">
                {FRANCOPHONIE_STOPS.map(stop => (
                  <button
                    key={stop.id}
                    type="button"
                    className={`stop-pill ${stop.id === activeStop.id ? 'is-active' : ''}`}
                    onClick={() => handleSelectStop(stop.id)}
                  >
                    {stop.city}
                  </button>
                ))}
              </div>
            </section>

            {/* Right Panel: Selected City Dossier */}
            <aside className="stop-dossier obs-panel">
              <span className="fr-eyebrow">{activeStop.country}</span>
              <h2>{activeStop.city} &mdash; {activeStop.theme}</h2>
              <p className="stop-fact">{activeStop.fact}</p>

              <div className="stop-word-list">
                {stopCards.map(card => {
                  const g = genderLabel(card.gender)
                  const isMastered = masteredIds.includes(card.id)
                  return (
                    <div key={card.id} className={`dossier-word-row ${g.cls}`}>
                      <div className="dossier-word-main">
                        <div className="dossier-word-top">
                          <strong>{card.french}</strong>
                          <span className={`gender-tag ${g.cls}`}>{g.text}</span>
                        </div>
                        <span className="dossier-en">{card.english}</span>
                      </div>

                      <div className="dossier-word-actions">
                        <button
                          type="button"
                          className="audio-mini-btn"
                          onClick={() => speakFrench(card.french, false)}
                          title="Listen in French"
                        >
                          <ObservatoryIcon name="sound-on" size={16} />
                        </button>
                        <button
                          type="button"
                          className={`master-mini-btn ${isMastered ? 'is-done' : ''}`}
                          onClick={() => toggleMastered(card.id)}
                          title={isMastered ? 'Mastered' : 'Mark Mastered'}
                        >
                          <ObservatoryIcon name="check" size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                className="btn-tactile"
                onClick={() => { playSound('click'); setTab('flashcards'); setCardIndex(0); setRevealed(false) }}
              >
                <span>Practice {activeStop.city} Audio Deck</span>
                <ObservatoryIcon name="arrow-right" size={17} />
              </button>
            </aside>
          </div>
        )}

        {/* ============================================================
            TAB 2: AUDIO-FIRST & GENDER FLASHCARDS
            ============================================================ */}
        {tab === 'flashcards' && (
          <div className="french-flashcard-stage">
            <div className="flashcard-toolbar obs-panel">
              <div className="stop-pill-row">
                {FRANCOPHONIE_STOPS.map(stop => (
                  <button
                    key={stop.id}
                    type="button"
                    className={`stop-pill ${stop.id === activeStop.id ? 'is-active' : ''}`}
                    onClick={() => handleSelectStop(stop.id)}
                  >
                    {stop.city}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`audio-first-toggle ${audioFirstMode ? 'is-on' : ''}`}
                onClick={() => {
                  playSound('click')
                  setAudioFirstMode(m => !m)
                  setRevealed(false)
                }}
              >
                <ObservatoryIcon name="sound-on" size={15} />
                <span>{audioFirstMode ? 'Audio-First Ear Mode ON' : 'Audio-First Ear Mode OFF'}</span>
              </button>
            </div>

            {currentCard && (
              <Motion.div
                key={currentCard.id}
                className={`fr-flashcard obs-panel ${genderLabel(currentCard.gender).cls}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="fr-card-top">
                  <span className={`gender-tag ${genderLabel(currentCard.gender).cls}`}>
                    {genderLabel(currentCard.gender).text}
                  </span>
                  <div className="fr-audio-controls">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => speakFrench(currentCard.french, false)}
                    >
                      <ObservatoryIcon name="sound-on" size={16} />
                      <span>Listen (FR)</span>
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => speakFrench(currentCard.french, true)}
                    >
                      <span>Slow 0.7×</span>
                    </button>
                  </div>
                </div>

                {audioFirstMode && !revealed ? (
                  <div className="ear-mode-prompt">
                    <p>Press <strong>Listen (FR)</strong>, then guess the French spelling &amp; English meaning before revealing!</p>
                  </div>
                ) : (
                  <>
                    <h2 className="fr-card-word">{currentCard.french}</h2>
                    <span className="fr-card-phonetic mono-num">{currentCard.phonetic}</span>
                  </>
                )}

                {!revealed ? (
                  <button
                    type="button"
                    className="btn-tactile"
                    onClick={() => {
                      playSound('click')
                      setRevealed(true)
                      speakFrench(currentCard.exampleFr, false)
                    }}
                  >
                    Reveal Meaning &amp; Context
                  </button>
                ) : (
                  <Motion.div
                    className="fr-card-reveal"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="fr-card-english">{currentCard.english}</div>
                    <div className="fr-example-box">
                      <p className="fr-ex-fr">&ldquo;{currentCard.exampleFr}&rdquo;</p>
                      <p className="fr-ex-en">{currentCard.exampleEn}</p>
                    </div>
                    <p className="fr-memory-hook">Tip: {currentCard.memoryHook}</p>
                  </Motion.div>
                )}

                <div className="fr-card-nav">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      playSound('click')
                      setRevealed(false)
                      setCardIndex(i => (i - 1 + stopCards.length) % stopCards.length)
                    }}
                  >
                    <ObservatoryIcon name="arrow-left" size={15} /> Previous
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => toggleMastered(currentCard.id)}
                  >
                    <ObservatoryIcon name="check" size={15} />
                    <span>{masteredIds.includes(currentCard.id) ? 'Mastered ✓' : 'Mark Mastered'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      playSound('click')
                      setRevealed(false)
                      setCardIndex(i => (i + 1) % stopCards.length)
                    }}
                  >
                    Next <ObservatoryIcon name="arrow-right" size={15} />
                  </button>
                </div>
              </Motion.div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: INTERACTIVE TILE SENTENCE BUILDER
            ============================================================ */}
        {tab === 'sentences' && (
          <Motion.section
            key={activeSentence.id}
            className="sentence-builder-panel obs-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="sb-header">
              <span className="fr-eyebrow">
                Sentence {sentenceIdx + 1} / {FRENCH_SENTENCE_BUILDERS.length} &middot; {activeSentence.topic}
              </span>
              <span className="sb-prompt-label">Translate into accurate Year 7 French:</span>
              <h2 className="sb-english-prompt">&ldquo;{activeSentence.english}&rdquo;</h2>
            </div>

            {/* Answer Construction Slot */}
            <div className={`sb-dropzone ${sentenceResult ? `is-${sentenceResult}` : ''}`}>
              {chosenTokens.length === 0 ? (
                <span className="sb-placeholder">Tap the French word tiles below in the correct order…</span>
              ) : (
                chosenTokens.map(tok => (
                  <button
                    key={tok.id}
                    type="button"
                    className="sb-tile is-placed"
                    onClick={() => handleRemoveToken(tok.id)}
                  >
                    {tok.word}
                  </button>
                ))
              )}
            </div>

            {/* Word Tile Bank */}
            <div className="sb-bank">
              {sentenceBank.map(tok => {
                const used = chosenIds.has(tok.id)
                return (
                  <button
                    key={tok.id}
                    type="button"
                    className={`sb-tile ${used ? 'is-used' : ''}`}
                    disabled={used || Boolean(sentenceResult)}
                    onClick={() => handlePickToken(tok)}
                  >
                    {tok.word}
                  </button>
                )
              })}
            </div>

            {/* Feedback & Grammar Note */}
            {sentenceResult && (
              <Motion.div
                className={`sb-feedback is-${sentenceResult}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="sb-feedback-head">
                  <strong>
                    {sentenceResult === 'correct' ? 'Très bien! Spotless French!' : 'Almost — check the structure:'}
                  </strong>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => speakFrench(activeSentence.answerTokens.join(' '), false)}
                  >
                    <ObservatoryIcon name="sound-on" size={15} /> Listen
                  </button>
                </div>
                <p className="sb-correct-line">{activeSentence.answerTokens.join(' ')}</p>
                <p className="sb-grammar-note">{activeSentence.grammarNote}</p>
              </Motion.div>
            )}

            <div className="sb-actions">
              {!sentenceResult ? (
                <>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={chosenTokens.length === 0}
                    onClick={() => { playSound('click'); setChosenTokens([]) }}
                  >
                    Clear Tiles
                  </button>
                  <button
                    type="button"
                    className="btn-tactile"
                    disabled={chosenTokens.length === 0}
                    onClick={handleCheckSentence}
                  >
                    Check French Sentence
                  </button>
                </>
              ) : (
                <button type="button" className="btn-tactile" onClick={handleNextSentence}>
                  <span>Next Sentence</span>
                  <ObservatoryIcon name="arrow-right" size={16} />
                </button>
              )}
            </div>
          </Motion.section>
        )}
      </div>
    </div>
  )
}

export default FrenchAtelierPage
