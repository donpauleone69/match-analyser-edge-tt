import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { db } from '@/data'
import { Dashboard } from './pages/Dashboard'
import { Clubs } from './pages/Clubs'
import MatchesPage from './pages/Matches'
import TournamentsPage from './pages/Tournaments'
import PlayersPage from './pages/Players'
import MatchCreatePage from './pages/MatchCreate'
import { ShotTaggingEngine } from './pages/ShotTaggingEngine'
import { Settings } from './pages/Settings'
import { DataViewer } from './pages/DataViewer'
import { StatsPage } from './pages/Stats'

function App() {
  // Initialize IndexedDB database
  useEffect(() => {
    // Database initializes automatically when imported
    db.open().catch(error => {
      console.error('Failed to initialize database:', error)
    })
  }, [])
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app with sidebar */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/create" element={<MatchCreatePage />} />
          <Route path="/matches/:id" element={<Dashboard />} /> {/* TODO: Match detail */}
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/data-viewer" element={<DataViewer />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        {/* Shot tagging engine - full-screen tagging interface */}
        <Route path="/matches/:matchId/tag" element={<ShotTaggingEngine />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
