import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import { recordDailyQuestAnswer } from '../data/curriculum'
import {
  ANALYTICAL_PASSAGES,
  BRITISH_PREP_VOCAB,
  addWordToVocabVault,
  readReadingProgress,
  readVocabVault,
  saveReadingPassageResult,
  saveVocabVault
} from '../data/readingPassages'
import AmbientBackdrop from '../components/AmbientBackdrop'
import { MasteryRing, ObservatoryIcon, RealmCrest } from '../components/RealmIcons'
import './ReadingStudioPage.css'

const HIGHLIGHT_TOOLS = [
  { id: 'none', label: 'Inspect', color: 'transparent' },
  { id: 'evidence', label: 'Evidence', color: '#f5b942' },
  { id: 'craft', label: 'Craft', color: '#22d3ee' },
  { id: 'vocab', label: 'Vocab', color: '#fb7185' }
]

function getLearnerTrackingId() {
  return localStorage.getItem('learnerId') || 'guest'
}

function speakBritishWord(word) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(word)
    utter.lang = 'en-GB'
    utter.rate = 0.9
    window.speechSynthesis.speak(utter)
  } catch {
    // Ignore speech synthesis errors
  }
}

/**
 * Convert custom DB passages into the Reading Studio format cleanly
 */
function normalizeDbPassage(p) {
  const paragraphs = String(p.content || '')
    .split(/\n\s*\n/)
    .map(chunk => chunk.trim())
    .filter(Boolean)

  return {
    id: `db_${p.id}`,
    title: p.title,
    genre: p.topic || 'Reading Comprehension',
    difficulty: 'Custom Passage',
    readingTimeMin: Math.max(2, Math.ceil(String(p.content || '').split(/\s+/).length / 130)),
    contextNote: 'Read carefully and check every answer against textual evidence.',
    paragraphs: paragraphs.length > 0 ? paragraphs : [p.content || ''],
    glossary: {},
    questions: (p.questions || []).map((q, idx) => ({
      id: `db_${p.id}_q${idx}`,
      skill: 'Comprehension',
      question: q.question,
      options: q.type === 'multiple' && Array.isArray(q.options) ? q.options : null,
      answer: q.answer,
      evidenceParagraph: 0,
      evidenceQuote: '',
      hint: q.hint || '',
      explanation: `Correct answer: ${q.answer}. Always re-read the passage to verify key details.`
    })),
    peelPrompt: `In 2–3 sentences, summarise the main idea or key mood of "${p.title}" using one short quotation from the text.`,
    peelModel: 'Make sure your response states a clear Point, embeds a short quoted phrase as Evidence, Explains what the wording suggests, and Links back to the question.'
  }
}

function ReadingStudioPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const { passages: dbPassages } = useGame()
  const trackingId = getLearnerTrackingId()

  const [studioTab, setStudioTab] = useState('passages') // 'passages' | 'vocab'
  const [activePassageId, setActivePassageId] = useState(null)
  const [readingProgress, setReadingProgress] = useState(() => readReadingProgress())

  // Close-reading desk state
  const [paperTheme, setPaperTheme] = useState('parchment') // 'parchment' | 'midnight'
  const [activeTool, setActiveTool] = useState('none')
  const [paragraphMarks, setParagraphMarks] = useState({}) // { pIdx: 'evidence'|'craft'|'vocab' }
  const [pinnedParagraph, setPinnedParagraph] = useState(null)
  const [inspectedWord, setInspectedWord] = useState(null)
  const [savedNotice, setSavedNotice] = useState('')

  // Question progression state
  const [qIndex, setQIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState('')
  const [typedAnswer, setTypedAnswer] = useState('')
  const [checkedResult, setCheckedResult] = useState(null) // { isCorrect, pinnedRight }
  const [showHint, setShowHint] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [inPeelStage, setInPeelStage] = useState(false)

  // PEEL Builder state
  const [peel, setPeel] = useState({ point: '', evidence: '', explain: '', link: '' })
  const [showPeelModel, setShowPeelModel] = useState(false)

  // Vocab Vault state
  const [vocabVault, setVocabVault] = useState(() => readVocabVault())
  const [vocabFilter, setVocabFilter] = useState('all') // 'all' | 'practice' | 'mastered'
  const [vocabIndex, setVocabIndex] = useState(0)
  const [vocabFlipped, setVocabFlipped] = useState(false)

  const allPassages = useMemo(() => {
    const customEnglish = (dbPassages || [])
      .filter(p => p.subject === 'English')
      .map(normalizeDbPassage)
    return [...ANALYTICAL_PASSAGES, ...customEnglish]
  }, [dbPassages])

  const activePassage = useMemo(
    () => allPassages.find(p => p.id === activePassageId) || null,
    [allPassages, activePassageId]
  )

  const currentQuestion = activePassage && !inPeelStage
    ? activePassage.questions[qIndex]
    : null

  const openPassage = (passage) => {
    playSound('gameStart')
    setActivePassageId(passage.id)
    setQIndex(0)
    setSelectedOption('')
    setTypedAnswer('')
    setCheckedResult(null)
    setShowHint(false)
    setSessionScore(0)
    setCorrectCount(0)
    setStreak(0)
    setInPeelStage(false)
    setParagraphMarks({})
    setPinnedParagraph(null)
    setInspectedWord(null)
    setPeel({ point: '', evidence: '', explain: '', link: '' })
    setShowPeelModel(false)
  }

  const closePassage = () => {
    playSound('click')
    setActivePassageId(null)
  }

  const handleParagraphClick = (pIdx) => {
    if (activeTool === 'none') {
      // Pin as textual evidence for the active question
      if (!checkedResult && !inPeelStage) {
        playSound('click')
        setPinnedParagraph(prev => (prev === pIdx ? null : pIdx))
      }
      return
    }

    playSound('click')
    setParagraphMarks(prev => ({
      ...prev,
      [pIdx]: prev[pIdx] === activeTool ? undefined : activeTool
    }))
  }

  const handleInspectGlossaryWord = useCallback((e, entry) => {
    e.stopPropagation()
    playSound('click')
    setInspectedWord(entry)
  }, [playSound])

  const handleSaveWordToVault = (entry) => {
    const updated = addWordToVocabVault(entry)
    setVocabVault(updated)
    playSound('correct', { streak: 2 })
    setSavedNotice(`"${entry.word}" saved to Vocab Vault`)
    window.setTimeout(() => setSavedNotice(''), 2200)
  }

  const handleCheckAnswer = () => {
    if (!currentQuestion) return
    const given = currentQuestion.options ? selectedOption : typedAnswer.trim()
    if (!given) return

    const isCorrect = given.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase()
    const pinnedRight = pinnedParagraph === currentQuestion.evidenceParagraph

    if (isCorrect) {
      const nextStreak = streak + 1
      playSound('correct', { streak })
      if (nextStreak === 3 || nextStreak === 5) playSound('streak')
      setStreak(nextStreak)
      setCorrectCount(c => c + 1)
      setSessionScore(s => s + 100 + (pinnedRight ? 50 : 0))
      recordDailyQuestAnswer(trackingId, 'English')
    } else {
      playSound('wrong')
      setStreak(0)
    }

    setCheckedResult({ isCorrect, pinnedRight })
  }

  const handleNextQuestion = () => {
    if (!activePassage) return
    playSound('click')

    if (qIndex + 1 < activePassage.questions.length) {
      setQIndex(i => i + 1)
      setSelectedOption('')
      setTypedAnswer('')
      setCheckedResult(null)
      setShowHint(false)
      setPinnedParagraph(null)
    } else {
      // Save reading score and advance to PEEL analytical builder
      const nextProg = saveReadingPassageResult(activePassage.id, {
        score: correctCount,
        total: activePassage.questions.length,
        peelCompleted: false
      })
      setReadingProgress(nextProg)
      setInPeelStage(true)
    }
  }

  const handleCompletePeel = () => {
    if (!activePassage) return
    playSound('focusBlockComplete')
    setShowPeelModel(true)
    recordDailyQuestAnswer(trackingId, 'English')
    const nextProg = saveReadingPassageResult(activePassage.id, {
      score: correctCount,
      total: activePassage.questions.length,
      peelCompleted: true
    })
    setReadingProgress(nextProg)
  }

  // Render paragraph text with clickable glossary terms & evidence quote spotlight
  const renderAnnotatedParagraph = useCallback((text, pIdx) => {
    const glossaryMap = activePassage?.glossary || {}
    const glossaryKeys = Object.keys(glossaryMap)
    const spotlightQuote = checkedResult && currentQuestion?.evidenceParagraph === pIdx
      ? currentQuestion.evidenceQuote
      : ''

    // First split by spotlight quote if present
    const segments = spotlightQuote && text.toLowerCase().includes(spotlightQuote.toLowerCase())
      ? (() => {
          const idx = text.toLowerCase().indexOf(spotlightQuote.toLowerCase())
          return [
            { text: text.slice(0, idx), isEvidence: false },
            { text: text.slice(idx, idx + spotlightQuote.length), isEvidence: true },
            { text: text.slice(idx + spotlightQuote.length), isEvidence: false }
          ]
        })()
      : [{ text, isEvidence: false }]

    const regex = glossaryKeys.length > 0
      ? new RegExp(`\\b(${glossaryKeys.join('|')})\\b`, 'gi')
      : null

    return segments.map((seg, sIdx) => {
      const content = !regex
        ? seg.text
        : seg.text.split(regex).map((part, partIdx) => {
            const entry = glossaryMap[part.toLowerCase()]
            if (!entry) return part
            return (
              <button
                key={`${sIdx}-${partIdx}`}
                type="button"
                className="glossary-token"
                onClick={(e) => handleInspectGlossaryWord(e, entry)}
                title={`Inspect "${entry.word}"`}
              >
                {part}
              </button>
            )
          })

      if (seg.isEvidence) {
        return <mark key={sIdx} className="evidence-spotlight-mark">{content}</mark>
      }
      return <span key={sIdx}>{content}</span>
    })
  }, [activePassage, checkedResult, currentQuestion, handleInspectGlossaryWord])

  // Vocab Vault derived list
  const filteredVocab = useMemo(() => {
    if (vocabFilter === 'practice') return vocabVault.filter(w => !w.mastered)
    if (vocabFilter === 'mastered') return vocabVault.filter(w => w.mastered)
    return vocabVault
  }, [vocabVault, vocabFilter])

  const activeVocabCard = filteredVocab[vocabIndex % Math.max(1, filteredVocab.length)] || null

  const handleToggleVocabMastered = (wordId) => {
    const next = vocabVault.map(w => w.id === wordId ? { ...w, mastered: !w.mastered } : w)
    setVocabVault(next)
    saveVocabVault(next)
    playSound('correct', { streak: 3 })
    recordDailyQuestAnswer(trackingId, 'English')
  }

  const handleAddPackWords = () => {
    let next = [...vocabVault]
    for (const w of BRITISH_PREP_VOCAB) {
      if (!next.some(item => item.word.toLowerCase() === w.word.toLowerCase())) {
        next.push({ ...w, mastered: false })
      }
    }
    setVocabVault(next)
    saveVocabVault(next)
    playSound('streak')
  }

  const peelHasQuote = /["“”'‘’].+["“”'‘’]/.test(peel.evidence)
  const peelReady = peel.point.trim().length >= 8 && peel.evidence.trim().length >= 4 && peel.explain.trim().length >= 12

  return (
    <div className="reading-studio-page" data-realm="english">
      <AmbientBackdrop realm="english" />

      <div className="reading-shell">
        {/* Top Bar */}
        <header className="reading-topbar">
          <div className="reading-topbar-left">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => activePassage ? closePassage() : navigate('/')}
            >
              <ObservatoryIcon name="arrow-left" size={16} />
              <span>{activePassage ? 'All Passages' : 'Command Center'}</span>
            </button>

            <div className="reading-brand">
              <RealmCrest realmId="english" size={24} />
              <div>
                <strong>Analytical Reading Studio</strong>
                <span>British Year 6–7 Close Reading &amp; Tier-2 Vocabulary</span>
              </div>
            </div>
          </div>

          {!activePassage ? (
            <div className="studio-mode-tabs">
              <button
                type="button"
                className={`studio-tab ${studioTab === 'passages' ? 'is-active' : ''}`}
                onClick={() => { playSound('click'); setStudioTab('passages') }}
              >
                Passages ({allPassages.length})
              </button>
              <button
                type="button"
                className={`studio-tab ${studioTab === 'vocab' ? 'is-active' : ''}`}
                onClick={() => { playSound('click'); setStudioTab('vocab') }}
              >
                Vocab Vault ({vocabVault.length})
              </button>
            </div>
          ) : (
            <div className="desk-score-cluster mono-num">
              <span className="desk-score-pill">
                <ObservatoryIcon name="trophy" size={15} />
                {sessionScore} pts
              </span>
              {streak > 0 && (
                <span className="desk-streak-pill">
                  <ObservatoryIcon name="flame" size={14} />
                  {streak}x
                </span>
              )}
            </div>
          )}
        </header>

        {/* ============================================================
            VIEW 1: PASSAGES LIBRARY
            ============================================================ */}
        {!activePassage && studioTab === 'passages' && (
          <Motion.div
            className="library-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <section className="studio-hero obs-panel">
              <div>
                <span className="studio-eyebrow">Close-Reading Workbench</span>
                <h1>Read Like a Literary Detective</h1>
                <p>
                  Highlight techniques, pin textual evidence before answering, uncover examiner breakdowns,
                  and craft crisp PEEL analytical paragraphs.
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { playSound('click'); navigate('/topics?realm=english') }}
              >
                <span>Quick Vocab &amp; SPaG Blaster</span>
                <ObservatoryIcon name="arrow-right" size={15} />
              </button>
            </section>

            <div className="passages-grid">
              {allPassages.map((passage, idx) => {
                const prog = readingProgress[passage.id]
                const pct = prog && prog.total > 0 ? Math.round((prog.bestScore / prog.total) * 100) : 0
                return (
                  <Motion.article
                    key={passage.id}
                    className="passage-card obs-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => openPassage(passage)}
                  >
                    <div className="passage-card-top">
                      <span className="genre-pill">{passage.genre}</span>
                      <MasteryRing percent={pct} size={46} strokeWidth={4} color="#10b981">
                        <span className="mono-num" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                          {pct}%
                        </span>
                      </MasteryRing>
                    </div>

                    <h2 className="passage-card-title">{passage.title}</h2>
                    <p className="passage-card-excerpt">
                      {passage.paragraphs[0]?.slice(0, 145)}…
                    </p>

                    <div className="passage-card-meta">
                      <span>{passage.difficulty}</span>
                      <span>&middot;</span>
                      <span className="mono-num">{passage.questions.length} analytical Qs</span>
                      <span>&middot;</span>
                      <span>{passage.readingTimeMin} min read</span>
                    </div>

                    <div className="passage-card-footer">
                      {prog?.peelCompleted ? (
                        <span className="peel-badge-done">
                          <ObservatoryIcon name="check" size={13} />
                          PEEL Completed
                        </span>
                      ) : (
                        <span className="peel-badge-pending">Includes PEEL Challenge</span>
                      )}
                      <span className="open-passage-link">
                        Open Folio <ObservatoryIcon name="arrow-right" size={15} />
                      </span>
                    </div>
                  </Motion.article>
                )
              })}
            </div>
          </Motion.div>
        )}

        {/* ============================================================
            VIEW 2: VOCABULARY VAULT STUDIO
            ============================================================ */}
        {!activePassage && studioTab === 'vocab' && (
          <Motion.div
            className="vocab-vault-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="vocab-controls-bar obs-panel">
              <div className="vocab-filter-group">
                {['all', 'practice', 'mastered'].map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`vocab-filter-btn ${vocabFilter === f ? 'is-active' : ''}`}
                    onClick={() => {
                      playSound('click')
                      setVocabFilter(f)
                      setVocabIndex(0)
                      setVocabFlipped(false)
                    }}
                  >
                    {f === 'all' ? `All (${vocabVault.length})`
                      : f === 'practice' ? `To Practice (${vocabVault.filter(w => !w.mastered).length})`
                      : `Mastered (${vocabVault.filter(w => w.mastered).length})`}
                  </button>
                ))}
              </div>

              {vocabVault.length < BRITISH_PREP_VOCAB.length && (
                <button type="button" className="btn-ghost" onClick={handleAddPackWords}>
                  <ObservatoryIcon name="sparkles" size={15} />
                  <span>Unlock Full 11+/KS3 Word Pack</span>
                </button>
              )}
            </div>

            {activeVocabCard ? (
              <div className="vocab-trainer-stage">
                <Motion.div
                  key={activeVocabCard.id}
                  className={`vocab-flashcard obs-panel ${vocabFlipped ? 'is-flipped' : ''}`}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    playSound('click')
                    setVocabFlipped(f => !f)
                  }}
                >
                  <div className="vocab-card-header">
                    <span className="vocab-pos-pill">{activeVocabCard.pos}</span>
                    <button
                      type="button"
                      className="vocab-speak-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        speakBritishWord(activeVocabCard.word)
                      }}
                      title="Listen (British English)"
                    >
                      <ObservatoryIcon name="sound-on" size={16} />
                      <span>Pronounce</span>
                    </button>
                  </div>

                  <h2 className="vocab-headword">{activeVocabCard.word}</h2>
                  {activeVocabCard.phonetic && (
                    <span className="vocab-phonetic mono-num">{activeVocabCard.phonetic}</span>
                  )}

                  {!vocabFlipped ? (
                    <p className="vocab-flip-hint">Click card to reveal definition, synonyms &amp; context</p>
                  ) : (
                    <Motion.div
                      className="vocab-revealed"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="vocab-definition">{activeVocabCard.definition}</p>
                      {activeVocabCard.example && (
                        <blockquote className="vocab-example">&ldquo;{activeVocabCard.example}&rdquo;</blockquote>
                      )}
                      {activeVocabCard.synonyms?.length > 0 && (
                        <div className="vocab-syn-row">
                          <span>Synonyms:</span>
                          {activeVocabCard.synonyms.map(s => (
                            <span key={s} className="syn-chip">{s}</span>
                          ))}
                        </div>
                      )}
                    </Motion.div>
                  )}
                </Motion.div>

                <div className="vocab-stage-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      playSound('click')
                      setVocabFlipped(false)
                      setVocabIndex(i => (i - 1 + filteredVocab.length) % filteredVocab.length)
                    }}
                  >
                    <ObservatoryIcon name="arrow-left" size={16} />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    className="btn-tactile"
                    onClick={() => handleToggleVocabMastered(activeVocabCard.id)}
                  >
                    <ObservatoryIcon name="check" size={16} />
                    <span>{activeVocabCard.mastered ? 'Mastered ✓' : 'Mark Mastered'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      playSound('click')
                      setVocabFlipped(false)
                      setVocabIndex(i => (i + 1) % filteredVocab.length)
                    }}
                  >
                    <span>Next</span>
                    <ObservatoryIcon name="arrow-right" size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="vocab-empty obs-panel">
                <p>No words in this filter yet. Click words inside any reading passage to add them here!</p>
              </div>
            )}
          </Motion.div>
        )}

        {/* ============================================================
            VIEW 3: SPLIT CLOSE-READING DESK
            ============================================================ */}
        {activePassage && (
          <div className="reading-desk">
            {/* LEFT PANEL: Illuminated Literary Folio */}
            <section className={`folio-panel ${paperTheme === 'parchment' ? 'theme-parchment' : 'theme-midnight'}`}>
              <div className="folio-toolbar">
                <div className="highlighter-group">
                  {HIGHLIGHT_TOOLS.map(tool => (
                    <button
                      key={tool.id}
                      type="button"
                      className={`hl-tool-btn ${activeTool === tool.id ? 'is-active' : ''}`}
                      onClick={() => { playSound('click'); setActiveTool(tool.id) }}
                    >
                      {tool.id !== 'none' && (
                        <span className="hl-swatch" style={{ background: tool.color }} />
                      )}
                      <span>{tool.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="paper-toggle-btn"
                  onClick={() => {
                    playSound('click')
                    setPaperTheme(t => (t === 'parchment' ? 'midnight' : 'parchment'))
                  }}
                >
                  {paperTheme === 'parchment' ? 'Midnight Ink' : 'Warm Parchment'}
                </button>
              </div>

              <div className="folio-scroll">
                <span className="folio-genre">{activePassage.genre} &middot; {activePassage.difficulty}</span>
                <h1 className="folio-title">{activePassage.title}</h1>
                <p className="folio-context-note">{activePassage.contextNote}</p>

                <div className="folio-paragraphs">
                  {activePassage.paragraphs.map((para, pIdx) => {
                    const mark = paragraphMarks[pIdx]
                    const isPinned = pinnedParagraph === pIdx
                    const isEvidenceTarget = checkedResult && currentQuestion?.evidenceParagraph === pIdx
                    return (
                      <div
                        key={pIdx}
                        className={`folio-paragraph ${mark ? `mark-${mark}` : ''} ${isPinned ? 'is-pinned' : ''} ${isEvidenceTarget ? 'is-evidence-reveal' : ''}`}
                        onClick={() => handleParagraphClick(pIdx)}
                      >
                        <span className="para-num mono-num">P{pIdx + 1}</span>
                        <p className="para-text">
                          {renderAnnotatedParagraph(para, pIdx)}
                        </p>
                        {isPinned && !checkedResult && (
                          <span className="pin-tag">Pinned Evidence</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Floating Glossary Word Inspector */}
              <AnimatePresence>
                {inspectedWord && (
                  <Motion.div
                    className="glossary-popover"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    <div className="glossary-pop-head">
                      <div>
                        <strong>{inspectedWord.word}</strong>
                        <span className="glossary-pos">{inspectedWord.pos}</span>
                      </div>
                      <button
                        type="button"
                        className="glossary-close"
                        onClick={() => setInspectedWord(null)}
                        aria-label="Close word definition"
                      >
                        &times;
                      </button>
                    </div>
                    <p className="glossary-def">{inspectedWord.definition}</p>
                    {inspectedWord.synonyms?.length > 0 && (
                      <div className="glossary-syns">
                        Synonyms: {inspectedWord.synonyms.join(', ')}
                      </div>
                    )}
                    <div className="glossary-pop-actions">
                      <button
                        type="button"
                        className="glossary-action-btn"
                        onClick={() => speakBritishWord(inspectedWord.word)}
                      >
                        <ObservatoryIcon name="sound-on" size={14} /> Listen
                      </button>
                      <button
                        type="button"
                        className="glossary-action-btn is-primary"
                        onClick={() => handleSaveWordToVault(inspectedWord)}
                      >
                        + Save to Vocab Vault
                      </button>
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>

              {savedNotice && <div className="saved-toast">{savedNotice}</div>}
            </section>

            {/* RIGHT PANEL: Analytical Workbench / PEEL Studio */}
            <aside className="workbench-panel obs-panel">
              {!inPeelStage && currentQuestion ? (
                <div className="workbench-body">
                  <div className="workbench-progress-row">
                    <span className="wb-step mono-num">
                      Question {qIndex + 1} / {activePassage.questions.length}
                    </span>
                    <span className="skill-badge">{currentQuestion.skill}</span>
                  </div>

                  <div className="wb-progress-bar">
                    <div
                      className="wb-progress-fill"
                      style={{ width: `${((qIndex + (checkedResult ? 1 : 0)) / activePassage.questions.length) * 100}%` }}
                    />
                  </div>

                  <h2 className="wb-question">{currentQuestion.question}</h2>

                  {/* Evidence Pinning Incentive */}
                  {!checkedResult && (
                    <div className={`evidence-pin-box ${pinnedParagraph !== null ? 'has-pin' : ''}`}>
                      <ObservatoryIcon name="target" size={15} />
                      <span>
                        {pinnedParagraph !== null
                          ? `Evidence pinned: Paragraph P${pinnedParagraph + 1} (+50 bonus if exact!)`
                          : 'Optional +50 Bonus: Click a paragraph on the left (in Inspect mode) to pin your textual evidence.'}
                      </span>
                    </div>
                  )}

                  {/* Options or Text Input */}
                  {currentQuestion.options ? (
                    <div className="wb-options">
                      {currentQuestion.options.map((opt, oi) => {
                        const letter = String.fromCharCode(65 + oi)
                        const isChosen = selectedOption === opt
                        const isRightOpt = checkedResult && opt.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase()
                        const isWrongChosen = checkedResult && isChosen && !checkedResult.isCorrect
                        return (
                          <button
                            key={oi}
                            type="button"
                            className={`wb-option-card ${isChosen ? 'is-selected' : ''} ${isRightOpt ? 'is-correct' : ''} ${isWrongChosen ? 'is-wrong' : ''}`}
                            disabled={Boolean(checkedResult)}
                            onClick={() => {
                              playSound('click')
                              setSelectedOption(opt)
                            }}
                          >
                            <span className="wb-opt-letter mono-num">{letter}</span>
                            <span className="wb-opt-text">{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="wb-text-input"
                      value={typedAnswer}
                      onChange={e => setTypedAnswer(e.target.value)}
                      placeholder="Type your concise analytical answer..."
                      disabled={Boolean(checkedResult)}
                    />
                  )}

                  {/* Optional Literary Hint */}
                  {!checkedResult && currentQuestion.hint && (
                    <div className="wb-hint-area">
                      {!showHint ? (
                        <button
                          type="button"
                          className="wb-hint-trigger"
                          onClick={() => { playSound('click'); setShowHint(true) }}
                        >
                          Need a literary clue?
                        </button>
                      ) : (
                        <div className="wb-hint-box">{currentQuestion.hint}</div>
                      )}
                    </div>
                  )}

                  {/* Examiner's Breakdown on Check */}
                  {checkedResult && (
                    <Motion.div
                      className={`examiner-box ${checkedResult.isCorrect ? 'is-correct' : 'is-wrong'}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="examiner-head">
                        <strong>
                          {checkedResult.isCorrect ? 'Sharp Analysis!' : 'Let’s Examine the Text'}
                        </strong>
                        {checkedResult.pinnedRight && checkedResult.isCorrect && (
                          <span className="bonus-chip mono-num">+50 Evidence Pin</span>
                        )}
                      </div>
                      <p className="examiner-explanation">{currentQuestion.explanation}</p>
                      {currentQuestion.evidenceQuote && (
                        <div className="examiner-quote">
                          Key Clue (P{currentQuestion.evidenceParagraph + 1}): &ldquo;{currentQuestion.evidenceQuote}&rdquo;
                        </div>
                      )}
                    </Motion.div>
                  )}

                  <div className="wb-actions">
                    {!checkedResult ? (
                      <button
                        type="button"
                        className="btn-tactile wb-submit-btn"
                        disabled={currentQuestion.options ? !selectedOption : !typedAnswer.trim()}
                        onClick={handleCheckAnswer}
                      >
                        Check Analysis
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-tactile wb-submit-btn"
                        onClick={handleNextQuestion}
                      >
                        <span>
                          {qIndex + 1 < activePassage.questions.length
                            ? 'Next Question'
                            : 'Proceed to PEEL Challenge'}
                        </span>
                        <ObservatoryIcon name="arrow-right" size={17} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* PEEL ANALYTICAL PARAGRAPH STUDIO */
                <div className="workbench-body peel-studio">
                  <div className="workbench-progress-row">
                    <span className="wb-step">Final Stage · Analytical Writing</span>
                    <span className="skill-badge">PEEL Builder</span>
                  </div>

                  <h2 className="wb-question">{activePassage.peelPrompt}</h2>

                  <div className="peel-checklist">
                    <span className={peel.point.trim().length >= 8 ? 'is-ok' : ''}>P · Clear Point</span>
                    <span className={peelHasQuote ? 'is-ok' : ''}>E · Quoted Evidence</span>
                    <span className={peel.explain.trim().length >= 12 ? 'is-ok' : ''}>E · Effect Explained</span>
                    <span className={peel.link.trim().length >= 6 ? 'is-ok' : ''}>L · Link Back</span>
                  </div>

                  <div className="peel-fields">
                    <label>
                      <span>Point — Your main analytical claim</span>
                      <textarea
                        rows={2}
                        value={peel.point}
                        onChange={e => setPeel(p => ({ ...p, point: e.target.value }))}
                        placeholder="e.g. The writer portrays the setting as eerie and forgotten..."
                      />
                    </label>
                    <label>
                      <span>Evidence — Embed a short quote in &ldquo;quotation marks&rdquo;</span>
                      <textarea
                        rows={2}
                        value={peel.evidence}
                        onChange={e => setPeel(p => ({ ...p, evidence: e.target.value }))}
                        placeholder='e.g. For instance, sunlight visited "only by accident"...'
                      />
                    </label>
                    <label>
                      <span>Explain — Why did the writer choose those exact words?</span>
                      <textarea
                        rows={3}
                        value={peel.explain}
                        onChange={e => setPeel(p => ({ ...p, explain: e.target.value }))}
                        placeholder="e.g. This personification suggests brightness is rare and unwelcome..."
                      />
                    </label>
                    <label>
                      <span>Link — Tie back to the question or reader’s reaction</span>
                      <textarea
                        rows={2}
                        value={peel.link}
                        onChange={e => setPeel(p => ({ ...p, link: e.target.value }))}
                        placeholder="e.g. Consequently, the reader immediately senses mystery..."
                      />
                    </label>
                  </div>

                  {showPeelModel && (
                    <Motion.div
                      className="peel-model-card"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span className="peel-model-eyebrow">Model British Prep Band-9 Response</span>
                      <p>{activePassage.peelModel}</p>
                    </Motion.div>
                  )}

                  <div className="wb-actions">
                    {!showPeelModel ? (
                      <button
                        type="button"
                        className="btn-tactile wb-submit-btn"
                        disabled={!peelReady}
                        onClick={handleCompletePeel}
                      >
                        Compare with Model Answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-tactile wb-submit-btn"
                        onClick={closePassage}
                      >
                        <span>Complete Folio &amp; Return</span>
                        <ObservatoryIcon name="check" size={17} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReadingStudioPage
