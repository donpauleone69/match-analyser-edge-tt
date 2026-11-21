import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { ScrollToTop } from '@/layout/ScrollToTop'
import { GatePage } from '@/pages/GatePage'
import { MatchesPage } from '@/pages/MatchesPage'
import { MatchPage } from '@/pages/MatchPage'
import { MatchIndexPage } from '@/pages/MatchIndexPage'
import { MatchInsights } from '@/features/insights/MatchInsights'
import { TagSetPage } from '@/pages/TagSetPage'
import { MatchDetailsPage } from '@/pages/MatchDetailsPage'
import { MatchTagPage } from '@/pages/MatchTagPage'
import { DiscardUntouched } from '@/layout/DiscardUntouched'
import { InsightsPage } from '@/pages/InsightsPage'
import { AccountPage } from '@/pages/AccountPage'

/** Old section addresses (summary, serve, receive) land on the match Insights page. */
function MatchInsightsRedirect() {
  const { matchId = '' } = useParams()
  return <Navigate to={`/matches/${matchId}/insights`} replace />
}

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
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route element={<AppShell />}>
          <Route path="/home" element={<Navigate to="/matches" replace />} />
          <Route path="/find" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:matchId" element={<MatchPage />}>
            <Route index element={<MatchIndexPage />} />
            <Route path="insights" element={<MatchInsights />} />
            <Route path="insights/:section" element={<MatchInsightsRedirect />} />
            <Route path="details" element={<MatchDetailsPage />} />
            <Route path="tag" element={<MatchTagPage />} />
            <Route path="tag/:setId" element={<TagSetPage />} />
            <Route path="mark/:videoId" element={<MarkRedirect />} />
          </Route>
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/insights/story" element={<Navigate to="/insights" replace />} />
          <Route path="/insights/reels" element={<Navigate to="/insights" replace />} />
          <Route path="/insights/scope" element={<Navigate to="/insights" replace />} />
          <Route path="/insights/:section" element={<Navigate to="/insights" replace />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
