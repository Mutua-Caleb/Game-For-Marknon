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
import './App.css'

// Check if learner is logged in
function RequireLearner({ children }) {
  const learnerAccount = localStorage.getItem('learnerAccount')
  if (!learnerAccount) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<LearnerLoginPage />} />
        <Route path="/" element={<RequireLearner><HomePage /></RequireLearner>} />
        <Route path="/topics" element={<RequireLearner><TopicSelectPage /></RequireLearner>} />
        <Route path="/play" element={<RequireLearner><GamePage /></RequireLearner>} />
        <Route path="/play/sequence" element={<RequireLearner><SequenceGamePage /></RequireLearner>} />
        <Route path="/play/diagram" element={<RequireLearner><DiagramGamePage /></RequireLearner>} />
        <Route path="/writing" element={<RequireLearner><WritingPage /></RequireLearner>} />
        <Route path="/latin" element={<RequireLearner><LatinWorldPage /></RequireLearner>} />
        <Route path="/math" element={<RequireLearner><SpeedMathPage /></RequireLearner>} />
        <Route path="/chemistry" element={<RequireLearner><ChemistryPage /></RequireLearner>} />
        <Route path="/results" element={<RequireLearner><ResultsPage /></RequireLearner>} />
        <Route path="/admin-portal-x7k9" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminPage />} />
      </Routes>
    </div>
  )
}

export default App
