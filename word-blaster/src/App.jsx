import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import SequenceGamePage from './pages/SequenceGamePage'
import DiagramGamePage from './pages/DiagramGamePage'
import TopicSelectPage from './pages/TopicSelectPage'
import ResultsPage from './pages/ResultsPage'
import AdminPage from './pages/AdminPage'
import AdminLogin from './pages/AdminLogin'
import LearnerLoginPage from './pages/LearnerLoginPage'
import WritingPage from './pages/WritingPage'
import LatinWorldPage from './pages/LatinWorldPage'
import SpeedMathPage from './pages/SpeedMathPage'
import ChemistryPage from './pages/ChemistryPage'
import ReadingStudioPage from './pages/ReadingStudioPage'
import Cat4LabPage from './pages/Cat4LabPage'
import FocusRewardTracker from './components/FocusRewardTracker'
import OfflineSyncBanner from './components/OfflineSyncBanner'
import { FEATURE_FLAGS } from './data/curriculum'
import './App.css'

// Check if learner is logged in
function RequireLearner({ children }) {
  const learnerAccount = localStorage.getItem('learnerAccount')
  if (!learnerAccount) {
    return <Navigate to="/login" replace />
  }
  return children
}

function FeatureGate({ enabled, children }) {
  if (!enabled) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  return (
    <div className="app">
      <FocusRewardTracker />
      <OfflineSyncBanner />
      <Routes>
        <Route path="/login" element={<LearnerLoginPage />} />
        <Route path="/" element={<RequireLearner><HomePage /></RequireLearner>} />
        <Route path="/topics" element={<RequireLearner><TopicSelectPage /></RequireLearner>} />
        <Route path="/reading" element={<RequireLearner><ReadingStudioPage /></RequireLearner>} />
        <Route path="/cat4" element={<RequireLearner><Cat4LabPage /></RequireLearner>} />
        <Route path="/play" element={<RequireLearner><GamePage /></RequireLearner>} />
        <Route
          path="/play/sequence"
          element={
            <RequireLearner>
              <FeatureGate enabled={FEATURE_FLAGS.showSequenceAndDiagramModes}>
                <SequenceGamePage />
              </FeatureGate>
            </RequireLearner>
          }
        />
        <Route
          path="/play/diagram"
          element={
            <RequireLearner>
              <FeatureGate enabled={FEATURE_FLAGS.showSequenceAndDiagramModes}>
                <DiagramGamePage />
              </FeatureGate>
            </RequireLearner>
          }
        />
        <Route
          path="/writing"
          element={
            <RequireLearner>
              <FeatureGate enabled={FEATURE_FLAGS.showDrawingWriting}>
                <WritingPage />
              </FeatureGate>
            </RequireLearner>
          }
        />
        <Route
          path="/latin"
          element={
            <RequireLearner>
              <FeatureGate enabled={FEATURE_FLAGS.showLatin}>
                <LatinWorldPage />
              </FeatureGate>
            </RequireLearner>
          }
        />
        <Route
          path="/math"
          element={
            <RequireLearner>
              <FeatureGate enabled={FEATURE_FLAGS.showSoroMathWarmup}>
                <SpeedMathPage />
              </FeatureGate>
            </RequireLearner>
          }
        />
        <Route
          path="/chemistry"
          element={
            <RequireLearner>
              <FeatureGate enabled={FEATURE_FLAGS.showChemistry}>
                <ChemistryPage />
              </FeatureGate>
            </RequireLearner>
          }
        />
        <Route path="/results" element={<RequireLearner><ResultsPage /></RequireLearner>} />
        <Route path="/admin-portal-x7k9" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
