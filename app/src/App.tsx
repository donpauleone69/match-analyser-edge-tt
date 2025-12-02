import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { Dashboard, Matches, TaggingScreen, MatchAnalysis } from './pages'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app with sidebar */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<Dashboard />} /> {/* TODO: Match detail */}
          <Route path="/players" element={<Dashboard />} /> {/* TODO: Players list */}
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
