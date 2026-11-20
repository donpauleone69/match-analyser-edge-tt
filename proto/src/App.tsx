import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { ScrollToTop } from '@/layout/ScrollToTop'
import { GatePage } from '@/pages/GatePage'
import { MatchesPage } from '@/pages/MatchesPage'
import {
  MatchPage,
  MatchIndexRedirect,
  MatchInsightsSection,
} from '@/pages/MatchPage'
import { TagSetScreen } from '@/features/tagging/TagSetScreen'
import { MatchDetails } from '@/features/match/MatchDetails'
import { MatchTagChecklist } from '@/features/match/MatchTagChecklist'
import { ArchiveRunner } from '@/features/match/archiveJobs'
import { DiscardUntouched } from '@/layout/DiscardUntouched'
import { InsightsPage, InsightsSectionPage } from '@/pages/InsightsPage'
import { AccountPage } from '@/pages/AccountPage'

/** Old mark addresses land on the Tag page, with that video in view and the set picked. */
function MarkRedirect() {
  const { matchId = '', videoId = '' } = useParams()
  const [search] = useSearchParams()
  const q = new URLSearchParams()
  if (videoId) q.set('video', videoId)
  const set = search.get('set')
  if (set) q.set('set', set)
  const query = q.toString()
  return <Navigate to={`/matches/${matchId}/tag${query ? `?${query}` : ''}`} replace />
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <DiscardUntouched />
      <ArchiveRunner />
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route element={<AppShell />}>
          <Route path="/home" element={<Navigate to="/matches" replace />} />
          <Route path="/find" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:matchId" element={<MatchPage />}>
            <Route index element={<MatchIndexRedirect />} />
            <Route path="insights" element={<Navigate to="summary" replace />} />
            <Route path="insights/:section" element={<MatchInsightsSection />} />
            <Route path="details" element={<MatchDetails />} />
            <Route path="tag" element={<MatchTagChecklist />} />
            <Route path="tag/:setId" element={<TagSetScreen />} />
            <Route path="mark/:videoId" element={<MarkRedirect />} />
          </Route>
          <Route path="/insights" element={<InsightsPage />}>
            <Route index element={<Navigate to="summary" replace />} />
            <Route path="story" element={<Navigate to="/insights/summary" replace />} />
            <Route path="reels" element={<Navigate to="/insights/summary" replace />} />
            <Route path="scope" element={<Navigate to="/insights/improve" replace />} />
            <Route path=":section" element={<InsightsSectionPage />} />
          </Route>
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
