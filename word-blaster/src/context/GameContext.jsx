import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import localforage from 'localforage'
import { defaultQuestions } from '../data/defaultQuestions'

const GameContext = createContext()

// Initialize localforage
localforage.config({
  name: 'WordBlaster',
  storeName: 'gameData'
})

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
  const [questionStats, setQuestionStats] = useState({}) // Track success/failure per question
  const [currentSession, setCurrentSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load data from storage on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [savedQuestions, savedStats, savedQuestionStats, savedSettings] = await Promise.all([
          localforage.getItem('questions'),
          localforage.getItem('playerStats'),
          localforage.getItem('questionStats'),
          localforage.getItem('gameSettings')
        ])

        if (savedQuestions && savedQuestions.length > 0) {
          setQuestions(savedQuestions)
        } else {
          setQuestions(defaultQuestions)
          await localforage.setItem('questions', defaultQuestions)
        }

        if (savedStats) setPlayerStats(savedStats)
        if (savedQuestionStats) setQuestionStats(savedQuestionStats)
        if (savedSettings) setGameSettings(savedSettings)
      } catch (error) {
        console.error('Error loading data:', error)
        setQuestions(defaultQuestions)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Save data to storage when it changes
  useEffect(() => {
    if (!isLoading && questions.length > 0) {
      localforage.setItem('questions', questions)
    }
  }, [questions, isLoading])

  useEffect(() => {
    if (!isLoading) {
      localforage.setItem('playerStats', playerStats)
    }
  }, [playerStats, isLoading])

  useEffect(() => {
    if (!isLoading) {
      localforage.setItem('questionStats', questionStats)
    }
  }, [questionStats, isLoading])

  useEffect(() => {
    if (!isLoading) {
      localforage.setItem('gameSettings', gameSettings)
    }
  }, [gameSettings, isLoading])

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

  // Get questions weighted by failure rate (failed questions appear more often)
  const getWeightedQuestions = useCallback(() => {
    const filtered = getFilteredQuestions()
    const weighted = []

    filtered.forEach(q => {
      const stats = questionStats[q.id] || { correct: 0, wrong: 0 }
      const total = stats.correct + stats.wrong

      // Calculate weight: more failures = higher weight
      let weight = 1
      if (total > 0) {
        const failureRate = stats.wrong / total
        weight = Math.max(1, Math.round(1 + failureRate * 4)) // 1-5 weight based on failure rate
      }

      // Add question multiple times based on weight
      for (let i = 0; i < weight; i++) {
        weighted.push(q)
      }
    })

    // Shuffle the weighted array
    return weighted.sort(() => Math.random() - 0.5)
  }, [getFilteredQuestions, questionStats])

  // Record answer result
  const recordAnswer = useCallback((questionId, isCorrect) => {
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
  }, [])

  // Add a new question
  const addQuestion = useCallback((question) => {
    const newQuestion = {
      ...question,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    setQuestions(prev => [...prev, newQuestion])
    return newQuestion
  }, [])

  // Update a question
  const updateQuestion = useCallback((id, updates) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
  }, [])

  // Delete a question
  const deleteQuestion = useCallback((id) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }, [])

  // Reset player stats
  const resetStats = useCallback(() => {
    setPlayerStats({
      totalScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      streak: 0,
      bestStreak: 0
    })
    setQuestionStats({})
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

  const value = {
    questions,
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
    getWeightedQuestions,
    recordAnswer,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    resetStats,
    getTopicsForSubject,
    getMostFailedQuestions,
    setQuestions
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
