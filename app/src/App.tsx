import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { db } from '@/data'
import { HomePage } from './pages/Home'
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
import { AccountGateComposer } from '@/features/account'

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
          <Route path="/" element={<AccountGateComposer><HomePage /></AccountGateComposer>} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/matches" element={<AccountGateComposer><MatchesPage /></AccountGateComposer>} />
          <Route path="/matches/create" element={<AccountGateComposer><MatchCreatePage /></AccountGateComposer>} />
          <Route path="/matches/:id" element={<AccountGateComposer><MatchReviewPage /></AccountGateComposer>} />
          <Route path="/clips" element={<AccountGateComposer><ClipsPage /></AccountGateComposer>} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/data-viewer" element={<DataViewer />} />
          <Route path="/data-viewer/audit" element={<DataViewerAudit />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        {/* Shot tagging engine - full-screen tagging interface */}
        <Route path="/matches/:matchId/tag" element={<AccountGateComposer><ShotTaggingEngine /></AccountGateComposer>} />
        {/* Single-rally edit - full-screen, saves only that rally */}
        <Route path="/matches/:matchId/edit-rally" element={<AccountGateComposer><RallyEdit /></AccountGateComposer>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
