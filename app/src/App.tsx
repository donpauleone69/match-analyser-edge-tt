import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { initializeDatabase } from './database'
import { Dashboard } from './pages/Dashboard'
import MatchesPage from './pages/Matches'
import TournamentsPage from './pages/Tournaments'
import PlayersPage from './pages/Players'
import MatchCreatePage from './pages/MatchCreate'
import { TaggingScreen } from './pages/TaggingScreen'
import { MatchAnalysis } from './pages/MatchAnalysis'
import { DataViewer } from './pages/DataViewer'
import { TaggingUIPrototypeV1 } from './pages/TaggingUIPrototypeV1'
import { TaggingUIPrototypeV2 } from './pages/TaggingUIPrototypeV2'

function App() {
  // Initialize IndexedDB database
  useEffect(() => {
    initializeDatabase().catch(error => {
      console.error('Failed to initialize database:', error)
    })
  }, [])
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app with sidebar */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/create" element={<MatchCreatePage />} />
          <Route path="/matches/:id" element={<Dashboard />} /> {/* TODO: Match detail */}
          <Route path="/data-viewer" element={<DataViewer />} />
          <Route path="/stats" element={<Dashboard />} /> {/* TODO: Stats */}
          <Route path="/settings" element={<Dashboard />} /> {/* TODO: Settings */}
        </Route>
        
        {/* Unified tagging screen - handles setup, Part 1, and Part 2 */}
        {/* /matches/new -> new match with inline setup */}
        {/* /matches/:id/tagging -> continue tagging existing match */}
        <Route path="/matches/new" element={<TaggingScreen />} />
        <Route path="/matches/:id/tagging" element={<TaggingScreen />} />
        
        {/* Match Analysis - view statistics and validate data */}
        <Route path="/matches/analysis" element={<MatchAnalysis />} />
        
        {/* Tagging UI Prototypes - experimental gesture-based interface */}
        <Route path="/tagging-ui-prototype/v1" element={<TaggingUIPrototypeV1 />} />
        <Route path="/tagging-ui-prototype/v2/:matchId" element={<TaggingUIPrototypeV2 />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
