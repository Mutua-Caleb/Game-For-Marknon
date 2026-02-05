import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { questionsApi, sequencesApi, statsApi } from '../utils/api'

const GameContext = createContext()

export function GameProvider({ children }) {
  const [questions, setQuestions] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [gameSettings, setGameSettings] = useState({
    questionTime: 45,
    difficultyLevel: 1,
    showHints: true
  })
  const [playerStats, setPlayerStats] = useState({
    totalScore: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    streak: 0,
    bestStreak: 0
  })
  const [questionStats, setQuestionStats] = useState({})
  const [sequences, setSequences] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load questions from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        const fetchedQuestions = await questionsApi.getAll()
        setQuestions(fetchedQuestions)

        // Build local stats map from fetched data
        const statsMap = {}
        for (const q of fetchedQuestions) {
          statsMap[q.id] = {
            correct: q.correctCount || 0,
            wrong: q.wrongCount || 0
          }
        }
        setQuestionStats(statsMap)

        // Load sequences
        try {
          const fetchedSequences = await sequencesApi.getAll()
          setSequences(fetchedSequences)
        } catch (seqError) {
          console.error('Error loading sequences:', seqError)
        }

        // Load settings from localStorage
        const savedSettings = localStorage.getItem('gameSettings')
        if (savedSettings) {
          setGameSettings(JSON.parse(savedSettings))
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Save settings locally
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('gameSettings', JSON.stringify(gameSettings))
    }
  }, [gameSettings, isLoading])

  // Refresh questions from API
  const refreshQuestions = useCallback(async () => {
    try {
      const fetchedQuestions = await questionsApi.getAll()
      setQuestions(fetchedQuestions)

      const statsMap = {}
      for (const q of fetchedQuestions) {
        statsMap[q.id] = {
          correct: q.correctCount || 0,
          wrong: q.wrongCount || 0
        }
      }
      setQuestionStats(statsMap)
    } catch (error) {
      console.error('Error refreshing questions:', error)
    }
  }, [])

  // Get questions filtered by subject and topics
  const getFilteredQuestions = useCallback(() => {
    let filtered = questions

    if (selectedSubject) {
      filtered = filtered.filter(q => q.subject === selectedSubject)
    }

    if (selectedTopics.length > 0) {
      filtered = filtered.filter(q => selectedTopics.includes(q.topic))
    }

    return filtered
  }, [questions, selectedSubject, selectedTopics])

  // Get sequences filtered by subject and topics
  const getFilteredSequences = useCallback(() => {
    let filtered = sequences

    if (selectedSubject) {
      filtered = filtered.filter(s => s.subject === selectedSubject)
    }

    if (selectedTopics.length > 0) {
      filtered = filtered.filter(s => selectedTopics.includes(s.topic))
    }

    return filtered
  }, [sequences, selectedSubject, selectedTopics])

  // Get questions weighted by failure rate (failed questions appear more often)
  const getWeightedQuestions = useCallback(() => {
    const filtered = getFilteredQuestions()
    const weighted = []

    filtered.forEach(q => {
      const stats = questionStats[q.id] || { correct: 0, wrong: 0 }
      const total = stats.correct + stats.wrong

      let weight = 1
      if (total > 0) {
        const failureRate = stats.wrong / total
        weight = Math.max(1, Math.round(1 + failureRate * 4))
      }

      for (let i = 0; i < weight; i++) {
        weighted.push(q)
      }
    })

    return weighted.sort(() => Math.random() - 0.5)
  }, [getFilteredQuestions, questionStats])

  // Record answer result - sends to server
  const recordAnswer = useCallback(async (questionId, isCorrect) => {
    // Update local state immediately
    setQuestionStats(prev => {
      const stats = prev[questionId] || { correct: 0, wrong: 0 }
      return {
        ...prev,
        [questionId]: {
          correct: stats.correct + (isCorrect ? 1 : 0),
          wrong: stats.wrong + (isCorrect ? 0 : 1)
        }
      }
    })

    setPlayerStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0
      return {
        ...prev,
        totalScore: prev.totalScore + (isCorrect ? 10 * (prev.streak + 1) : 0),
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
        wrongAnswers: prev.wrongAnswers + (isCorrect ? 0 : 1),
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak)
      }
    })

    // Send to server in background
    try {
      await statsApi.recordAnswer(questionId, isCorrect)
    } catch (err) {
      console.error('Failed to record answer on server:', err)
    }
  }, [])

  // Add a new question via API
  const addQuestion = useCallback(async (question) => {
    try {
      const created = await questionsApi.create(question)
      setQuestions(prev => [...prev, created])
      return created
    } catch (err) {
      console.error('Failed to add question:', err)
      throw err
    }
  }, [])

  // Update a question via API
  const updateQuestion = useCallback(async (id, updates) => {
    try {
      const updated = await questionsApi.update(id, updates)
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q))
      return updated
    } catch (err) {
      console.error('Failed to update question:', err)
      throw err
    }
  }, [])

  // Delete a question via API
  const deleteQuestion = useCallback(async (id) => {
    try {
      await questionsApi.delete(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      console.error('Failed to delete question:', err)
      throw err
    }
  }, [])

  // Reset player stats
  const resetStats = useCallback(async () => {
    setPlayerStats({
      totalScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      streak: 0,
      bestStreak: 0
    })
    setQuestionStats({})

    try {
      await statsApi.resetStats()
    } catch (err) {
      console.error('Failed to reset stats on server:', err)
    }
  }, [])

  // Get available topics for a subject
  const getTopicsForSubject = useCallback((subject) => {
    const topics = [...new Set(questions.filter(q => q.subject === subject).map(q => q.topic))]
    return topics.sort()
  }, [questions])

  // Get most failed questions
  const getMostFailedQuestions = useCallback((limit = 10) => {
    const questionsWithStats = questions.map(q => {
      const stats = questionStats[q.id] || { correct: 0, wrong: 0 }
      const total = stats.correct + stats.wrong
      const failureRate = total > 0 ? stats.wrong / total : 0
      return { ...q, stats, failureRate, totalAttempts: total }
    })

    return questionsWithStats
      .filter(q => q.totalAttempts > 0)
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, limit)
  }, [questions, questionStats])

  // Save game session to server
  const saveSession = useCallback(async (sessionData) => {
    try {
      await statsApi.saveSession(sessionData)
    } catch (err) {
      console.error('Failed to save session:', err)
    }
  }, [])

  const value = {
    questions,
    sequences,
    selectedSubject,
    setSelectedSubject,
    selectedTopics,
    setSelectedTopics,
    gameSettings,
    setGameSettings,
    playerStats,
    questionStats,
    currentSession,
    setCurrentSession,
    isLoading,
    getFilteredQuestions,
    getFilteredSequences,
    getWeightedQuestions,
    recordAnswer,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    resetStats,
    getTopicsForSubject,
    getMostFailedQuestions,
    setQuestions,
    refreshQuestions,
    saveSession
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
