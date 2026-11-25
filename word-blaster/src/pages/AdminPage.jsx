import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { authApi } from '../utils/api'
import { getLocalDateString } from '../components/admin/adminFormatters'
import DailyTestLogView from '../components/admin/DailyTestLogView'
import AttemptedQuestionsView from '../components/admin/AttemptedQuestionsView'
import StudentsAnalyticsView from '../components/admin/StudentsAnalyticsView'
import {
  QuestionsView,
  EarningsView,
  PassagesView,
  DiagramsView,
  WritingView,
  ImportExportView
} from '../components/admin/ContentManagerViews'
import './AdminPage.css'

const NAV_GROUPS = [
  {
    group: 'Student Monitoring',
    items: [
      { id: 'daily-log', label: 'Daily Test Log', desc: 'Tests by day, time, duration & answers' },
      { id: 'attempts', label: 'Question Attempts', desc: 'Every question attempted & outcome' },
      { id: 'students', label: 'Students & Weak Spots', desc: 'Student accounts, goals & missed items' },
      { id: 'earnings', label: 'Focus Earnings', desc: 'Verified focus rewards & payouts' }
    ]
  },
  {
    group: 'Content & Bank',
    items: [
      { id: 'questions', label: 'Question Bank', desc: 'Manage quiz questions & answers' },
      { id: 'passages', label: 'Reading Passages', desc: 'Comprehension texts & questions' },
      { id: 'diagrams', label: 'Diagrams', desc: 'Labeled image challenges' },
      { id: 'writing', label: 'Writing Review', desc: 'Handwriting submissions & prompts' },
      { id: 'import', label: 'Import / Export', desc: 'Excel, CSV & JSON bulk tools' }
    ]
  }
]

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

function AdminPage() {
  const navigate = useNavigate()
  const {
    questions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    getMostFailedQuestions,
    questionStats,
    resetStats,
    refreshQuestions
  } = useGame()

  const [activeTab, setActiveTab] = useState('daily-log')
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString())
  const [range, setRange] = useState('day') // 'day' | '7d' | '30d' | 'all'
  const [attemptsJumpFilters, setAttemptsJumpFilters] = useState(null)
  const [notification, setNotification] = useState(null)

  // Check admin authentication
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin-portal-x7k9')
      return
    }
    authApi.verify().catch(() => {
      sessionStorage.removeItem('adminToken')
      navigate('/admin-portal-x7k9')
    })
  }, [navigate])

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    window.setTimeout(() => setNotification(null), 3200)
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken')
    navigate('/')
  }

  const handleJumpToAttempts = (filters) => {
    setAttemptsJumpFilters({ ...filters, _ts: Date.now() })
    setActiveTab('attempts')
  }

  const handleInspectStudent = (studentName) => {
    setRange('30d')
    setAttemptsJumpFilters({ player: studentName, subject: '', topic: '', _ts: Date.now() })
    setActiveTab('attempts')
  }

  const failedQuestions = getMostFailedQuestions(20)
  const activeMeta = ALL_NAV_ITEMS.find(item => item.id === activeTab) || ALL_NAV_ITEMS[0]

  return (
    <div className="adm-shell">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <Motion.div
            className={`adm-toast is-${notification.type}`}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
          >
            <span>{notification.type === 'success' ? '✓' : '!'}</span>
            <span>{notification.message}</span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Left Sidebar Navigation */}
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <div className="adm-brand-mark">SO</div>
          <div>
            <strong>Observatory Admin</strong>
            <span>Parent &amp; Teacher Console</span>
          </div>
        </div>

        <nav className="adm-nav" aria-label="Admin navigation">
          {NAV_GROUPS.map(section => (
            <div key={section.group} className="adm-nav-group">
              <div className="adm-nav-group-label">{section.group}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`adm-nav-item ${activeTab === item.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="adm-nav-item-label">{item.label}</span>
                  {item.id === 'questions' && (
                    <span className="adm-nav-count mono-num">{questions.length}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <button type="button" className="adm-side-btn" onClick={() => navigate('/')}>
            Open Student App
          </button>
          <button type="button" className="adm-side-btn is-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="adm-main-wrap">
        <header className="adm-topbar">
          <div>
            <h1>{activeMeta.label}</h1>
            <p>{activeMeta.desc}</p>
          </div>
          <div className="adm-topbar-actions">
            <button type="button" className="adm-btn-secondary" onClick={() => navigate('/')}>
              Preview Game
            </button>
            <button type="button" className="adm-btn-danger-outline" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Tab Strip */}
        <nav className="adm-mobile-tabs" aria-label="Admin sections">
          {ALL_NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`adm-mobile-tab ${activeTab === item.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="adm-content">
          {activeTab === 'daily-log' && (
            <DailyTestLogView
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              range={range}
              onRangeChange={setRange}
              onJumpToAttempts={handleJumpToAttempts}
            />
          )}

          {activeTab === 'attempts' && (
            <AttemptedQuestionsView
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              range={range}
              onRangeChange={setRange}
              initialFilters={attemptsJumpFilters}
            />
          )}

          {activeTab === 'students' && (
            <StudentsAnalyticsView
              failedQuestions={failedQuestions}
              showNotification={showNotification}
              onInspectStudent={handleInspectStudent}
              onResetStats={async () => {
                if (confirm('Reset all question bank statistics? (Submitted test history will be preserved.)')) {
                  await resetStats()
                  showNotification('Question statistics reset')
                }
              }}
            />
          )}

          {activeTab === 'earnings' && (
            <EarningsView showNotification={showNotification} />
          )}

          {activeTab === 'questions' && (
            <QuestionsView
              questions={questions}
              questionStats={questionStats}
              onAddQuestion={addQuestion}
              onUpdateQuestion={updateQuestion}
              onDeleteQuestion={deleteQuestion}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'passages' && (
            <PassagesView showNotification={showNotification} />
          )}

          {activeTab === 'diagrams' && (
            <DiagramsView showNotification={showNotification} />
          )}

          {activeTab === 'writing' && (
            <WritingView showNotification={showNotification} />
          )}

          {activeTab === 'import' && (
            <ImportExportView
              questions={questions}
              onImportComplete={async (count) => {
                await refreshQuestions()
                showNotification(`Successfully imported ${count} questions!`)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminPage
