import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { ScrollToTop } from '@/layout/ScrollToTop'
import { GatePage } from '@/pages/GatePage'
import { MatchesPage } from '@/pages/MatchesPage'
import { MatchPage } from '@/pages/MatchPage'
import { MatchIndexPage } from '@/pages/MatchIndexPage'
import { MatchInsightsPage } from '@/pages/MatchInsightsPage'
import { TagSetPage } from '@/pages/TagSetPage'
import { MatchDetailsPage } from '@/pages/MatchDetailsPage'
import { MatchTagPage } from '@/pages/MatchTagPage'
import { DiscardUntouched } from '@/layout/DiscardUntouched'
import { SaveNotice } from '@/layout/SaveNotice'
import { InsightsPage } from '@/pages/InsightsPage'
import { AccountPage } from '@/pages/AccountPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <DiscardUntouched />
      <SaveNotice />
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route element={<AppShell />}>
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:matchId" element={<MatchPage />}>
            <Route index element={<MatchIndexPage />} />
            <Route path="insights" element={<MatchInsightsPage />} />
            <Route path="details" element={<MatchDetailsPage />} />
            <Route path="tag" element={<MatchTagPage />} />
            <Route path="tag/:setId" element={<TagSetPage />} />
          </Route>
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
