import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { Dashboard, MatchSetup, Matches, Step1ContactTagger, Step1Review } from './pages'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app with sidebar */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/new" element={<MatchSetup />} />
          <Route path="/matches/:id" element={<Dashboard />} /> {/* TODO: Match detail */}
          <Route path="/players" element={<Dashboard />} /> {/* TODO: Players list */}
          <Route path="/stats" element={<Dashboard />} /> {/* TODO: Stats */}
          <Route path="/settings" element={<Dashboard />} /> {/* TODO: Settings */}
        </Route>
        
        {/* Full-screen tagging views (no sidebar) */}
        <Route path="/matches/new/step1" element={<Step1ContactTagger />} />
        <Route path="/matches/:id/step1" element={<Step1ContactTagger />} />
        <Route path="/matches/new/review" element={<Step1Review />} />
        <Route path="/matches/:id/review" element={<Step1Review />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
