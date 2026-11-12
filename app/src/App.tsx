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
import MatchReviewPage from './pages/MatchReview'
import { ShotTaggingEngine } from './pages/ShotTaggingEngine'
import { RallyEdit } from './pages/RallyEdit'
import { Settings } from './pages/Settings'
import { DataViewer } from './pages/DataViewer'
import { DataViewerAudit } from './pages/DataViewerAudit'
import { AnalyticsPage } from './pages/Analytics'
import { ClipsPage } from './pages/Clips'
import { useCloudStore } from './stores/cloudStore'

function App() {
  const initCloud = useCloudStore((s) => s.init)

  // Initialize IndexedDB database
  useEffect(() => {
    // Database initializes automatically when imported
    db.open().catch(error => {
      console.error('Failed to initialize database:', error)
    })
    initCloud()
  }, [initCloud])
  
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
          <Route path="/matches/:id" element={<MatchReviewPage />} />
          <Route path="/clips" element={<ClipsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/data-viewer" element={<DataViewer />} />
          <Route path="/data-viewer/audit" element={<DataViewerAudit />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        {/* Shot tagging engine - full-screen tagging interface */}
        <Route path="/matches/:matchId/tag" element={<ShotTaggingEngine />} />
        {/* Single-rally edit - full-screen, saves only that rally */}
        <Route path="/matches/:matchId/edit-rally" element={<RallyEdit />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
