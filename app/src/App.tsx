import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout'
import { db } from '@/data'
import { HomePage } from './pages/Home'
import MatchesPage from './pages/Matches'
import MatchCreatePage from './pages/MatchCreate'
import MatchReviewPage from './pages/MatchReview'
import { ShotTaggingEngine } from './pages/ShotTaggingEngine'
import { RallyEdit } from './pages/RallyEdit'
import { Settings } from './pages/Settings'
import { ClipsPage } from './pages/Clips'
import { TrainingPage } from './pages/Training'
import { ScopeReviewPage } from './pages/ScopeReview'
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
        {/* Library shell: match review payoff + Training stub */}
        <Route element={<AppShell />}>
          <Route path="/" element={<AccountGateComposer><HomePage /></AccountGateComposer>} />
          <Route path="/matches" element={<AccountGateComposer><MatchesPage /></AccountGateComposer>} />
          <Route path="/matches/create" element={<AccountGateComposer><MatchCreatePage /></AccountGateComposer>} />
          <Route path="/matches/:id" element={<AccountGateComposer><MatchReviewPage /></AccountGateComposer>} />
          <Route path="/training" element={<AccountGateComposer><TrainingPage /></AccountGateComposer>} />
          <Route path="/review" element={<AccountGateComposer><ScopeReviewPage /></AccountGateComposer>} />
          <Route path="/clips" element={<AccountGateComposer><ClipsPage /></AccountGateComposer>} />
          <Route path="/settings" element={<Settings />} />
          {/* Old shell destinations removed from the path */}
          <Route path="/clubs" element={<Navigate to="/" replace />} />
          <Route path="/tournaments" element={<Navigate to="/" replace />} />
          <Route path="/players" element={<Navigate to="/" replace />} />
          <Route path="/analytics" element={<Navigate to="/" replace />} />
          <Route path="/data-viewer" element={<Navigate to="/" replace />} />
          <Route path="/data-viewer/audit" element={<Navigate to="/" replace />} />
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
