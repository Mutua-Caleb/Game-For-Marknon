/**
 * Central curriculum configuration and feature flags for the 4-month British Prep sprint.
 * Focus areas: English & Analytical Reading, CAT4 Prep, Year 7 Maths, and French.
 */

export const FEATURE_FLAGS = {
  showLegacySubjects: false,
  showChemistry: false,
  showLatin: false,
  showDrawingWriting: false,
  showSequenceAndDiagramModes: false,
  showSoroMathWarmup: true
}

export const ACTIVE_REALMS = [
  {
    id: 'english',
    subject: 'English',
    title: 'English & Reading Lab',
    shortTitle: 'English',
    kicker: 'British Year 6–7 Prep',
    description: 'Tier-2 vocabulary, inference, author’s craft, and precision SPaG.',
    accent: '#10b981',
    accentSoft: 'rgba(16, 185, 129, 0.16)',
    accentGlow: 'rgba(16, 185, 129, 0.35)',
    secondary: '#f3e7cf',
    topics: [
      'Vocabulary',
      'Reading',
      'Inference & Analysis',
      'Grammar'
    ],
    dailyGoalLabel: '10 vocab or analytical English questions'
  },
  {
    id: 'cat4',
    subject: 'CAT4',
    title: 'CAT4 Reasoning Vault',
    shortTitle: 'CAT4',
    kicker: 'Cognitive Abilities Test',
    description: 'Verbal analogies, number series, logic patterns, and spatial thinking.',
    accent: '#6366f1',
    accentSoft: 'rgba(99, 102, 241, 0.18)',
    accentGlow: 'rgba(99, 102, 241, 0.38)',
    secondary: '#22d3ee',
    topics: [
      'Verbal Reasoning',
      'Quantitative Reasoning',
      'Non-Verbal Reasoning',
      'Spatial Ability'
    ],
    dailyGoalLabel: '10 CAT4 reasoning puzzles'
  },
  {
    id: 'maths',
    subject: 'Maths',
    title: 'CE 13+ & Year 7 Maths',
    shortTitle: 'Maths',
    kicker: 'Galore Park Chapters 1–7',
    description: 'Chapter-by-chapter Number, Algebra, Area & Perimeter, Geometry, Stats & ISEB Mental Arithmetic.',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.16)',
    accentGlow: 'rgba(245, 158, 11, 0.36)',
    secondary: '#fbbf24',
    topics: [
      'Mental Arithmetic',
      'Number',
      'Algebra',
      'Area, Perimeter & Units',
      'Geometry',
      'Probability & Stats'
    ],
    dailyGoalLabel: '1 Galore Park chapter or Mental test'
  },
  {
    id: 'french',
    subject: 'French',
    title: 'French Atelier',
    shortTitle: 'French',
    kicker: 'Year 6–7 Immersion',
    description: 'Essential vocabulary, present-tense verbs, gender accuracy, and phrases.',
    accent: '#3b82f6',
    accentSoft: 'rgba(59, 130, 246, 0.18)',
    accentGlow: 'rgba(59, 130, 246, 0.38)',
    secondary: '#f97316',
    topics: [
      'Core Vocabulary',
      'Verbs & Tenses',
      'Grammar & Gender',
      'Everyday Phrases'
    ],
    dailyGoalLabel: '10 French vocabulary & phrase cards'
  }
]

export const LEGACY_SUBJECTS = [
  'Christian Religious Education',
  'Creative Arts',
  'Agriculture',
  'Social Studies'
]

export const LEGACY_TOPICS = {
  'Christian Religious Education': ['Old Testament', 'New Testament', 'Christian Living', 'The Church'],
  'Creative Arts': ['Drawing & Painting', 'Music', 'Drama', 'Crafts'],
  Agriculture: ['Crop Farming', 'Animal Husbandry', 'Soil Science', 'Farm Tools'],
  'Social Studies': ['Geography', 'History', 'Civics', 'Culture']
}

export const ACTIVE_SUBJECTS = ACTIVE_REALMS.map(r => r.subject)

export const ACTIVE_TOPICS = ACTIVE_REALMS.reduce((acc, realm) => {
  acc[realm.subject] = realm.topics
  return acc
}, {})

export const ALL_ADMIN_SUBJECTS = [
  ...ACTIVE_SUBJECTS,
  ...LEGACY_SUBJECTS
]

export const ALL_ADMIN_TOPICS = {
  ...ACTIVE_TOPICS,
  English: ['Vocabulary', 'Reading', 'Inference & Analysis', 'Grammar', 'Spelling'],
  ...LEGACY_TOPICS
}

export const PACE_MODES = [
  {
    id: 'standard',
    label: '1-Min Focus (Standard)',
    seconds: 60,
    description: 'Full-screen 60s per question — auto-advances on timeout'
  },
  {
    id: 'deep',
    label: 'Extended Analysis',
    seconds: 90,
    description: 'Extra thinking room for multi-step problems'
  },
  {
    id: 'exam',
    label: 'Rapid Drill',
    seconds: 30,
    description: 'High-tempo recall speed'
  }
]

export function getRealmById(id) {
  if (!id) return null
  return ACTIVE_REALMS.find(r => r.id === String(id).toLowerCase()) || null
}

export function getRealmBySubject(subject) {
  if (!subject) return null
  const normalized = String(subject).toLowerCase()
  return ACTIVE_REALMS.find(
    r => r.subject.toLowerCase() === normalized || r.id === normalized
  ) || null
}

export function getMasteryTier(percentage = 0) {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)))
  if (pct >= 90) return { id: 'crown', label: 'Mastered', color: '#fbbf24' }
  if (pct >= 70) return { id: 'gold', label: 'Gold', color: '#f59e0b' }
  if (pct >= 45) return { id: 'silver', label: 'Silver', color: '#94a3b8' }
  if (pct > 0) return { id: 'bronze', label: 'Bronze', color: '#cd7f32' }
  return { id: 'unstarted', label: 'Ready', color: '#64748b' }
}

export function getScholarRank(avgMastery = 0, sessionsCount = 0) {
  const score = avgMastery + Math.min(25, sessionsCount * 2)
  if (score >= 95) return { title: 'Grand Scholar', tier: 5 }
  if (score >= 75) return { title: 'Senior Fellow', tier: 4 }
  if (score >= 50) return { title: 'Observatory Adept', tier: 3 }
  if (score >= 25) return { title: 'Rising Scholar', tier: 2 }
  return { title: 'Apprentice Scholar', tier: 1 }
}

export function getDailyQuestStorageKey(learnerId) {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `observatory-daily-quests-v1:${learnerId || 'guest'}:${dateStr}`
}

export function readDailyQuestProgress(learnerId) {
  try {
    const raw = localStorage.getItem(getDailyQuestStorageKey(learnerId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function recordDailyQuestAnswer(learnerId, subject) {
  const realm = getRealmBySubject(subject)
  if (!realm) return
  try {
    const key = getDailyQuestStorageKey(learnerId)
    const current = readDailyQuestProgress(learnerId)
    current[realm.id] = (Number(current[realm.id]) || 0) + 1
    localStorage.setItem(key, JSON.stringify(current))
  } catch {
    // Ignore storage errors in restricted environments
  }
}
