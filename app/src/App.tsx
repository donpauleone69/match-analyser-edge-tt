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
import { MatchAnalysis } from './pages/MatchAnalysis'
import { DataViewer } from './pages/DataViewer'
import { TaggingUIPrototypeV2 } from './pages/TaggingUIPrototypeV2'

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
          <Route path="/data-viewer" element={<DataViewer />} />
          <Route path="/stats" element={<Dashboard />} /> {/* TODO: Stats */}
          <Route path="/settings" element={<Dashboard />} /> {/* TODO: Settings */}
        </Route>
        
        {/* Match tagging route - official tagging interface (formerly V2 prototype) */}
        <Route path="/matches/:matchId/tag" element={<TaggingUIPrototypeV2 />} />
        
        {/* Match Analysis - view statistics and validate data */}
        <Route path="/matches/analysis" element={<MatchAnalysis />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
