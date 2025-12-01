import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { Dashboard, MatchSetup, Matches, TaggingScreen } from './pages'

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
        
        {/* Unified tagging screen (v0.9.4) - handles both Part 1 and Part 2 */}
        <Route path="/matches/new/tagging" element={<TaggingScreen />} />
        <Route path="/matches/:id/tagging" element={<TaggingScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
