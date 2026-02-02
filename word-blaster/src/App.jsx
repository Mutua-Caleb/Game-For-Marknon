import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import TopicSelectPage from './pages/TopicSelectPage'
import ResultsPage from './pages/ResultsPage'
import AdminPage from './pages/AdminPage'
import AdminLogin from './pages/AdminLogin'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/topics" element={<TopicSelectPage />} />
        <Route path="/play" element={<GamePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/admin-portal-x7k9" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminPage />} />
      </Routes>
    </div>
  )
}

export default App
